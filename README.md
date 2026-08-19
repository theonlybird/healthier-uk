# Healthier UK — website (`www.healthieruk.org`)

A static site in plain HTML, CSS and vanilla JavaScript. No build step, no dependencies.

---

## What changed in the redesign

The site was rebuilt around one idea: **Healthier UK should look like a club anyone could
join** — a community leader, a local charity, a council team, or one curious person.

- **New design system** — warm cream backgrounds, the logo's own greens and teals, a coral
  accent, soft organic shapes and generous rounded corners. Typeface is **Nunito** /
  **Nunito Sans**: rounded and friendly rather than institutional.
- **The logo is now a real vector.** `assets/images/logo-tree.svg` is a hand-built SVG
  recreation of the tree, with every leaf, bird, note, heart, runner, fruit bowl and family
  group as its own path. It scales cleanly, has a transparent background and can be animated.
  `logo-tree-light.svg` is the same mark with a white trunk, for dark backgrounds.
- **Splash / enter screen** on the home page. The tree assembles leaf by leaf; clicking
  *Come on in* scatters the leaves outward across the screen to reveal the home page beneath.
  Shown once per browser session, always skippable, and disabled entirely for visitors who
  have "reduce motion" turned on.
- **Layered scrolling sections** — panels with rounded tops that overlap the section above.
- **Scrolling marquee** of the everyday conditions that create health.
- **Simplified navigation** — Home / About / Four nations / News & blogs / Research /
  Contact, plus a *Join us* button. Every page from the old site is still reachable.
- **Friendlier copy** — sentence-case headings, UK spelling, and a "who's it for" section
  aimed squarely at people who don't think of themselves as health experts.

---

## Project structure

```
healthier-uk/
├── index.html                        # Home (splash, hero, join, pillars, policy, gallery)
├── about-us.html                     # About us & mission
├── team.html                         # Leadership & coalition members
├── news.html                         # News & events
│   ├── news-launch-westminster.html
│   ├── news-parliamentary-launch.html
│   ├── news-meeting-rcgp.html
│   └── news-meeting-richmond.html
├── blogs.html                        # Blog index
│   └── blog-welcome.html
├── england.html                      # England hub
│   ├── arms-length-bodies.html
│   ├── parliamentary-launch.html
│   ├── combined-authorities.html
│   ├── west-midlands.html
│   └── neighbourhood-health.html
├── wales.html / scotland.html / northern-ireland.html
├── research-portal.html
├── contact.html
└── assets/
    ├── css/style.css                 # Design tokens + every component
    ├── js/main.js                    # Nav, splash, reveal, marquee, lightbox, forms
    └── images/
        ├── logo-tree.svg             # Vector tree (dark trunk — light backgrounds)
        ├── logo-tree-light.svg       # Vector tree (white trunk — dark backgrounds)
        └── …                         # Photography, team portraits, favicon
```

The wordmark "Healthier UK" is set in live text next to the tree, not baked into an image,
so it always matches the site's typeface and stays crisp at any size.

---

## Running locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly by double-clicking also
works, though `sessionStorage` (used to remember the splash) behaves better over HTTP.

---

## Editing

**Colours and type** live at the top of `assets/css/style.css` under `:root`. Changing
`--hu-green`, `--hu-coral` or `--font-display` re-skins the whole site.

**The header and footer** are repeated in every page (there's no templating). If you change
one, change them all — search for `<header class="site-header">`.

**The splash animation** is in `initSplash()` in `assets/js/main.js`. Useful dials:

| What | Where |
|---|---|
| How far the leaves fly | `dist` — multiplier on `reach` |
| How much they tumble | `rot` |
| Wave/stagger between leaves | `delay` |
| Overall duration | `transform` timing in `.splash.is-scattering .hu-petal` (CSS) |

To show the splash on every visit rather than once per session, remove the
`sessionStorage.setItem('huSplashSeen', …)` line.

**Forms** currently show a confirmation message without sending anything. To make them
live, point them at a form service — e.g. `action="https://formspree.io/f/YOUR_FORM_ID"`
and `method="POST"` — and remove the `data-ajax="true"` attribute.

---

## Things worth doing next

- **Photography is the weakest link.** Several stock images are generic or off-message.
  Real photographs of coalition members, meetings and community projects would do more for
  the "club you can join" feeling than any amount of CSS.
- **Give members somewhere to appear** — a wall of member organisations' logos would suit
  the scrolling marquee, and would make the coalition feel populated.
- Consider a proper join form (name, organisation, nation, interest) rather than a general
  contact form.

---

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages. For GitHub Pages: push to
`main`, then Settings → Pages → Deploy from a branch → `main` / root.

---

© 2026 Healthier UK. Initiated by the College of Medicine & the British Society of
Lifestyle Medicine.
