/**
 * POST /api/submit-casebook — the Casebook holding bay (Netlify build).
 *
 * Identical behaviour to functions/api/submit-casebook.js (the Cloudflare
 * version): takes a case study from submit-casebook.html and writes it into the
 * repository as an UNPUBLISHED entry. Nothing here can put anything on the live
 * site — every file it writes carries `published: false`, and both the
 * collection filter and the computed permalink keep it out of the build.
 *
 * Keep the two in step if you change either. Only the wrapper differs:
 * Netlify Functions v2 exports a default handler and reads process.env;
 * Cloudflare Pages Functions export onRequestPost and receive env as an argument.
 *
 * Like the Cloudflare version, this writes ONE file and touches neither
 * team.json nor organisations.json — see that file for why.
 *
 * Required environment variables (Netlify → Site configuration → Environment variables):
 *   GITHUB_TOKEN     fine-grained PAT or GitHub App token, Contents: read & write
 *   GITHUB_REPO      e.g. "theonlybird/healthier-uk"
 *   GITHUB_BRANCH    e.g. "main"
 * Optional:
 *   TURNSTILE_SECRET enables spam protection (pair with the site key on the form)
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * The field caps, in one place so the form, this function and the CMS hints
 * cannot drift apart.
 *
 * `advertised` fields tell the writer their limit on the form and are REJECTED
 * when they go over it — they were told, so silently cutting their last
 * paragraph off would be worse than asking them to trim it.
 *
 * Silent fields are capped by maxlength in the browser and simply TRUNCATED
 * here. Nobody was told about the limit, so an error message quoting one would
 * come out of nowhere; and the only way to exceed it is to bypass the form.
 */
const LIMITS = {
  title:           { chars: 50 },
  organisations:   { chars: 100 },
  furtherReading:  { chars: 100 },
  contact:         { chars: 50 },
  town:            { chars: 60 },
  population:      { words: 100, label: 'Population' },
  healthChallenge: { words: 100, label: 'Health challenge' },
  actions:         { words: 250, label: 'Actions taken' },
  outcomes:        { words: 250, label: 'Outcome/s' },
  lessons:         { words: 250, label: 'Lessons learned' },
};

const REGIONS = new Set([
  'north-east', 'north-west', 'yorkshire-humber', 'east-midlands', 'west-midlands',
  'east-of-england', 'london', 'south-east', 'south-west',
  'scotland', 'wales', 'northern-ireland', 'uk-wide',
]);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const countWords = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** YAML-safe double-quoted scalar, for single-line values. */
const yaml = (v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';

/**
 * YAML block scalar, for the long fields. `|-` keeps the writer's paragraph
 * breaks and strips the trailing newline; every line is indented two spaces, so
 * nothing in the text can be read as YAML structure however it is punctuated.
 */
const yamlBlock = (key, value) => {
  const lines = String(value).replace(/\r\n/g, '\n').replace(/\t/g, '  ').split('\n');
  return `${key}: |-\n` + lines.map((l) => '  ' + l.replace(/\s+$/, '')).join('\n');
};

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

/**
 * Find a filename nobody is using. Two communities can easily call their project
 * "Walking for Health", and with hundreds of entries expected, writing over the
 * first one would lose it silently.
 */
async function freeSlug(gh, base) {
  for (let n = 1; n <= 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await gh.get(`src/casebook/${slug}.md`))) return slug;
  }
  throw new Error('could not find a free filename for this project');
}

export default async function handler(request) {
  const env = process.env;
  try {
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return json({ error: 'the submission service is not configured yet' }, 503);
    }

    const form = await request.formData();
    const field = (n) => (form.get(n) || '').toString().trim();

    const ok = await verifyTurnstile(
      env, field('cf-turnstile-response'), request.headers.get('x-nf-client-connection-ip')
    );
    if (!ok) return json({ error: 'spam check failed, please reload and try again' }, 400);

    // ---- collect and cap ---------------------------------------------------
    const values = {};
    for (const [name, rule] of Object.entries(LIMITS)) {
      const raw = field(name);
      if (rule.chars) {
        values[name] = raw.slice(0, rule.chars);            // silent
      } else {
        if (countWords(raw) > rule.words) {                 // advertised
          return json({ error: `${rule.label} is over ${rule.words} words` }, 400);
        }
        values[name] = raw;
      }
    }

    const region = field('region');
    const submitterEmail = field('submitterEmail');

    const required = {
      'the project name': values.title,
      'the town or city': values.town,
      'the region': region,
      'Population': values.population,
      'the health challenge': values.healthChallenge,
      'the actions taken': values.actions,
      'the outcomes': values.outcomes,
      'the lessons learned': values.lessons,
      'your email address': submitterEmail,
    };
    for (const [label, value] of Object.entries(required)) {
      if (!value) return json({ error: `${label} is required` }, 400);
    }
    if (!REGIONS.has(region)) return json({ error: 'please choose a region from the list' }, 400);
    if (form.get('consent') === null) return json({ error: 'consent is required' }, 400);

    const gh = new GitHub(env);
    const slug = await freeSlug(gh, slugify(values.title) || 'case-study');
    const stamp = new Date().toISOString().slice(0, 10);

    // ---- image -------------------------------------------------------------
    let image = '';
    const file = form.get('image');
    if (file && typeof file !== 'string' && file.size > 0) {
      if (!ALLOWED_TYPES[file.type]) throw new Error(`${file.name} is not a JPG, PNG or WebP`);
      if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 5MB`);
      image = `casebook-${slug}.${ALLOWED_TYPES[file.type]}`;
      const existing = await gh.get(`assets/images/${image}`);
      await gh.put(
        `assets/images/${image}`,
        toBase64(new Uint8Array(await file.arrayBuffer())),
        `Casebook: image for ${values.title}`,
        existing ? existing.sha : undefined
      );
    }

    // ---- the entry ---------------------------------------------------------
    // Every section is front matter. The body is empty on purpose: the layout
    // renders the nine headings in a fixed order, so there is no free-form
    // remainder for anything to hide in.
    const frontMatter = [
      '---',
      'published: false',
      `title: ${yaml(values.title)}`,
      `date: ${stamp}`,
      `town: ${yaml(values.town)}`,
      `region: ${yaml(region)}`,
      image ? `image: ${yaml(image)}` : '',
      image ? `imageAlt: ${yaml(values.title)}` : '',
      yamlBlock('population', values.population),
      yamlBlock('healthChallenge', values.healthChallenge),
      values.organisations ? `organisations: ${yaml(values.organisations)}` : '',
      yamlBlock('actions', values.actions),
      yamlBlock('outcomes', values.outcomes),
      yamlBlock('lessons', values.lessons),
      values.furtherReading ? `furtherReading: ${yaml(values.furtherReading)}` : '',
      values.contact ? `contact: ${yaml(values.contact)}` : '',
      `description: ${yaml(values.healthChallenge.replace(/\s+/g, ' ').slice(0, 155))}`,
      `submittedBy: ${yaml(submitterEmail)}`,
      `submittedAt: ${yaml(new Date().toISOString())}`,
      '---',
    ].filter(Boolean).join('\n') + '\n';

    await gh.put(
      `src/casebook/${slug}.md`,
      encodeText(frontMatter),
      `Casebook: "${values.title}" (awaiting review)`
    );

    return json({ ok: true, slug });
  } catch (err) {
    return json({ error: err.message || 'something went wrong' }, 500);
  }
}

export const config = { path: '/api/submit-casebook' };
