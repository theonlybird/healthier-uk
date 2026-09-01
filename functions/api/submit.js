/**
 * POST /api/submit — the contributor holding bay.
 *
 * Takes a blog submission from contribute.html and writes it into the repository
 * as an UNPUBLISHED draft. Nothing here can put anything on the live site:
 * every file it writes carries `published: false`, and Eleventy filters those out
 * at build time. An editor turns a draft into a live post in the CMS at /admin.
 *
 * Required environment variables (Cloudflare Pages → Settings → Variables):
 *   GITHUB_TOKEN     fine-grained PAT or GitHub App token, Contents: read & write
 *   GITHUB_REPO      e.g. "theonlybird/healthier-uk"
 *   GITHUB_BRANCH    e.g. "main"
 * Optional:
 *   TURNSTILE_SECRET enables spam protection (pair with the site key on the form)
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** YAML-safe double-quoted scalar. */
const yaml = (v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';

class GitHub {
  constructor(env) {
    this.repo = env.GITHUB_REPO;
    this.branch = env.GITHUB_BRANCH || 'main';
    this.headers = {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'healthier-uk-submissions',
      'content-type': 'application/json',
    };
  }

  async get(path) {
    const r = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${encodeURI(path)}?ref=${this.branch}`,
      { headers: this.headers }
    );
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub read failed (${r.status})`);
    return r.json();
  }

  async put(path, base64, message, sha) {
    const r = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${encodeURI(path)}`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({ message, content: base64, branch: this.branch, ...(sha ? { sha } : {}) }),
      }
    );
    if (r.status === 409 || r.status === 422) return { conflict: true };
    if (!r.ok) throw new Error(`GitHub write failed (${r.status}): ${await r.text()}`);
    return r.json();
  }
}

const toBase64 = (bytes) => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const encodeText = (text) => toBase64(new TextEncoder().encode(text));

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not configured yet
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token || '');
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body,
  });
  const d = await r.json();
  return d.success === true;
}

/** Add or update the contributor in team.json, retrying once on a concurrent write. */
async function upsertMember(gh, member) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const file = await gh.get('src/_data/team.json');
    if (!file) throw new Error('team.json not found in the repository');
    const team = JSON.parse(atob(file.content.replace(/\n/g, '')));

    const existing = team.find((m) => m.slug === member.slug);
    if (existing) {
      // Never overwrite a curated member's details from a public form; only fill blanks.
      // The organisation is deliberately not set here — an editor picks it from the
      // Organisations list, so two people at one organisation cannot end up with two
      // spellings or two different descriptions.
      for (const key of ['photo', 'orgSuggested', 'orgDescriptionSuggested']) {
        if (!existing[key] && member[key]) existing[key] = member[key];
      }
    } else {
      team.push({ ...member, order: team.length + 1, published: false });
    }

    const result = await gh.put(
      'src/_data/team.json',
      encodeText(JSON.stringify(team, null, 2) + '\n'),
      `Submission: ${existing ? 'update' : 'add'} ${member.name}`,
      file.sha
    );
    if (!result.conflict) return existing ? 'updated' : 'created';
  }
  throw new Error('Could not update the team file — please try again');
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return json({ error: 'the submission service is not configured yet' }, 503);
    }

    const form = await request.formData();
    const field = (n) => (form.get(n) || '').toString().trim();

    const ok = await verifyTurnstile(
      env, field('cf-turnstile-response'), request.headers.get('cf-connecting-ip')
    );
    if (!ok) return json({ error: 'spam check failed, please reload and try again' }, 400);

    const authorName = field('authorName');
    const title = field('title');
    const body = field('body');
    const required = { authorName, authorEmail: field('authorEmail'), role: field('role'),
                       org: field('org'), title, summary: field('summary'),
                       lead: field('lead'), body };
    for (const [key, value] of Object.entries(required)) {
      if (!value) return json({ error: `${key} is required` }, 400);
    }
    if (form.get('consent') === null) return json({ error: 'consent is required' }, 400);

    const orgDescription = field('orgDescription');
    if (countWords(orgDescription) > 250) {
      return json({ error: 'the organisation description is over 250 words' }, 400);
    }

    const gh = new GitHub(env);
    const authorSlug = slugify(authorName);
    const postSlug = `${authorSlug}-${slugify(title)}`.slice(0, 80);
    const stamp = new Date().toISOString().slice(0, 10);

    // ---- images -----------------------------------------------------------
    const saveImage = async (fieldName, targetBase) => {
      const file = form.get(fieldName);
      if (!file || typeof file === 'string' || file.size === 0) return '';
      if (!ALLOWED_TYPES[file.type]) throw new Error(`${file.name} is not a JPG, PNG or WebP`);
      if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 5MB`);
      const name = `${targetBase}.${ALLOWED_TYPES[file.type]}`;
      const existing = await gh.get(`assets/images/${name}`);
      await gh.put(
        `assets/images/${name}`,
        toBase64(new Uint8Array(await file.arrayBuffer())),
        `Submission: image for ${authorName}`,
        existing ? existing.sha : undefined
      );
      return name;
    };

    const photo = await saveImage('photo', `team-${authorSlug}`);
    const image = await saveImage('image', `blog-${postSlug}`);

    // ---- the draft post ---------------------------------------------------
    const frontMatter = [
      '---',
      `title: ${yaml(title)}`,
      `date: ${stamp}`,
      `author: ${yaml(authorSlug)}`,
      image ? `image: ${yaml(image)}` : '',
      image ? `imageAlt: ${yaml(title)}` : '',
      `summary: ${yaml(field('summary'))}`,
      `description: ${yaml(field('summary'))}`,
      `lead: ${yaml(field('lead'))}`,
      'published: false',
      `submittedBy: ${yaml(field('authorEmail'))}`,
      `submittedAt: ${yaml(new Date().toISOString())}`,
      '---',
      '',
    ].filter(Boolean).join('\n');

    const existingPost = await gh.get(`src/blog/${postSlug}.md`);
    await gh.put(
      `src/blog/${postSlug}.md`,
      encodeText(frontMatter + body.replace(/\r\n/g, '\n') + '\n'),
      `Submission: "${title}" from ${authorName} (awaiting review)`,
      existingPost ? existingPost.sha : undefined
    );

    const memberResult = await upsertMember(gh, {
      slug: authorSlug,
      name: authorName,
      role: field('role'),
      photo: photo || '',
      description: `Blog posts written by ${authorName} for Healthier UK.`,
      // what they typed, for an editor to match against the Organisations list
      orgSuggested: field('org'),
      orgDescriptionSuggested: orgDescription,
    });

    return json({ ok: true, slug: postSlug, member: memberResult });
  } catch (err) {
    return json({ error: err.message || 'something went wrong' }, 500);
  }
}
