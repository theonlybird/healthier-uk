# Going live, and turning on the editor

Three separate things, in this order. Nothing here touches the current
healthieruk.org until the very last step.

---

## 1. William's GitHub account

He needs one account. Contributors never see GitHub — only he does.

1. Go to **github.com/signup**. Use his work email. Choose the **free** plan.
2. Turn on two-factor authentication when prompted (Settings → Password and
   authentication). An authenticator app on his phone is easiest.
3. Send him an invite: on the repository, **Settings → Collaborators → Add people**,
   enter his username, role **Write**.
4. He accepts by email. That is all — he never needs to open GitHub again;
   it is only what the editor at `/admin` signs him in with.

---

## 2. Cloudflare Pages

1. Create a free account at **dash.cloudflare.com**.
2. **Workers & Pages → Create → Pages → Connect to Git**, authorise GitHub, pick
   the `healthier-uk` repository.
3. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `_site` |
   | Node version | 22 (add environment variable `NODE_VERSION` = `22`) |

4. Deploy. You get a `*.pages.dev` address — that is the preview link to show on
   Monday. The custom domain comes later.

### Environment variables

**Settings → Variables and secrets**, add as *encrypted* where noted:

| Name | Value | |
|---|---|---|
| `GITHUB_REPO` | `theonlybird/healthier-uk` | |
| `GITHUB_BRANCH` | `main` | |
| `GITHUB_TOKEN` | a fine-grained personal access token | encrypted |
| `TURNSTILE_SECRET` | from step 4 below | encrypted, optional |

The token: **github.com/settings/personal-access-tokens/new** → repository access
*Only select repositories* → `healthier-uk` → Repository permissions →
**Contents: Read and write**. Nothing else. Copy it once; GitHub will not show it again.

That token is what lets the submission form write drafts into the repository. It
cannot publish anything — every file it writes carries `published: false`.


---

## 2b. Netlify instead of Cloudflare Pages

Both are set up and either works. Pick one; do not run both against the same domain.

1. Create the account at **app.netlify.com** — sign up with the **Healthier UK email
   address**, not with GitHub. Signing up with GitHub ties the Netlify team to whichever
   personal GitHub account you used, which is the ownership problem again.
2. **Add new site → Import an existing project → GitHub**, authorise, pick `healthier-uk`.
3. Build settings come from `netlify.toml` in the repo — command `npm run build`, publish
   `_site`, functions `netlify/functions`. You should not need to type anything.
4. **Site configuration → Environment variables**, add the same three (plus Turnstile if
   you are using it):

   | Name | Value |
   |---|---|
   | `GITHUB_REPO` | `theonlybird/healthier-uk` |
   | `GITHUB_BRANCH` | `main` |
   | `GITHUB_TOKEN` | the fine-grained token from step 2 |
   | `TURNSTILE_SECRET` | optional |

5. `netlify/functions/submit.mjs` serves `/api/submit` — the same path the form posts to,
   so nothing on the front end changes.

**Gating `/admin`** is optional (see below). If you want it later, Netlify Identity is on
all plans: enable it, invite the editors, give them a role, and add to `netlify.toml`:

```toml
[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  status = 200
  force = true
  conditions = { Role = ["editor"] }

[[redirects]]
  from = "/admin/*"
  to = "/login"
  status = 401
  force = true
```

**One Netlify-specific limit worth knowing:** synchronous functions time out at 10 seconds.
A submission with two large photos means several sequential GitHub uploads and could get
close. If contributors start hitting it, drop `MAX_IMAGE_BYTES` in the function to 3MB, or
convert it to a background function.

---

## 2c. Do you need to gate /admin at all?

Not at first. `/admin` is static HTML and JavaScript; without a GitHub token it can do
nothing. Somebody who finds the URL sees a sign-in button and gets no further — the real
boundary is who has write access to the repository, which GitHub already enforces.

Gating it adds three things: it keeps the page out of search results, gives you an access
log, and lets people who have no GitHub account edit. Add it when the third one becomes
true. Until then it is defence in depth, not a missing lock.

---

## 3. Locking the editor (Cloudflare route)

`/admin` must not be open to the world.

1. **Zero Trust → Access → Applications → Add an application → Self-hosted**.
2. Domain: your Pages domain, path `admin`.
3. Policy: **Allow**, with rule *Emails* and the list of people who may edit —
   William's address, yours.
4. Under **Settings → Authentication**, make sure **One-time PIN** is on. That is
   the six-digit code by email. Add Google or Microsoft as well if the team is on
   either; that gives them single sign-on and their own two-factor.

Free for up to 50 users. Adding an editor later is adding an email to that list;
removing one is deleting it.

---

## 4. Spam protection on the public form (optional but do it before launch)

1. **Turnstile → Add site**, hostname = your domain, widget mode **Managed**.
2. Put the **site key** into the `data-sitekey` attribute of `<div id="turnstile-holder">`
   in `src/pages/contribute.njk`, and add this before `</body>` in
   `src/_includes/layouts/base.njk`:
   `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`
3. Put the **secret key** into the `TURNSTILE_SECRET` variable above.

Until this is configured the form still works — it just is not spam-protected, so
do not publicise the URL widely before it is on.

---

## 5. The domain, last of all

Only when everything above is confirmed working on the `pages.dev` address:

1. In Cloudflare Pages → **Custom domains**, add `www.healthieruk.org`.
2. At names.co.uk, point the DNS at the records Cloudflare gives you.
3. Allow up to a few hours for propagation.

Before this step, and only before this step, move the 47 old root HTML files out of
the repository (they are now generated from `src/`), so there is no ambiguity about
which copy is live.

---

## How the whole loop works once it is on

1. A contributor fills in `/contribute.html` — no account, no login.
2. `functions/api/submit.js` writes their post to `src/blog/<slug>.md` with
   `published: false`, saves their images, and adds them to `team.json`
   with `published: false`.
3. Nothing changes on the live site. Eleventy filters unpublished items out.
4. William opens `/admin`, signs in with a code sent to his email, and sees the
   post under **Awaiting review**.
5. He reads it, edits anything he wants, flips **Published** on, saves.
6. Cloudflare rebuilds. A minute later the post is live on the blogs page, on the
   author's own page, and their team card appears.
