# Editing the Healthier UK site

The site is now generated. You no longer edit the 47 HTML pages by hand — you edit
**content files**, and `npx eleventy` rebuilds every page from them.

```
npm install      # once
npm start        # local preview at http://localhost:8080
npm run build    # writes the finished site to _site/
```

`_site/` is the folder that gets deployed. It is not committed to git.

---

## Where everything lives

| What | Where | Notes |
|---|---|---|
| Blog posts | `src/blog/*.md` | One file per post. Filename becomes the URL. |
| News items | `src/news/*.md` | Same idea. |
| Team members | `src/_data/team.json` | One entry per person. |
| Standard pages | `src/pages/*.njk` | About, regions, contact, research. Page body only. |
| Header, footer, nav | `src/_includes/partials/` | Edited **once**, applies to all 47 pages. |
| Page shells | `src/_includes/layouts/` | Article, author and home page structure. |
| Images, CSS, JS | `assets/` | Unchanged — still at the repo root. |

## Adding a blog post

Create `src/blog/jane-smith-topic.md`:

```yaml
---
title: "The headline of the post"
date: 2026-09-01
author: "william-bird"        # must match a slug in team.json
image: "feature-nature.jpeg"  # optional; lives in assets/images/
imageAlt: "Description of the photo"
summary: "One or two sentences. Used on the blog index card and as the SEO description."
lead: "The standfirst paragraph, shown large at the top of the article."
---

The body of the post, in markdown. **Bold**, *italic*, [links](https://example.com),
lists, `## subheadings` and > blockquotes all work.
```

That single file automatically produces:

- the article page at `blog-jane-smith-topic.html`
- a card on `blogs.html`
- a card on that author's `author-<slug>.html` page
- an updated blog count on their team card

## Adding a team member

Add an entry to `src/_data/team.json`:

```json
{
  "slug": "jane-smith",
  "name": "Dr Jane Smith",
  "role": "Director",
  "org": "Example Trust",
  "photo": "team-jane-smith.png",
  "order": 12,
  "lead": "Director, Example Trust",
  "description": "Blog posts written by Dr Jane Smith for Healthier UK."
}
```

Drop `team-jane-smith.png` into `assets/images/`. Their team card and their
`author-jane-smith.html` page are created automatically — with a
"No blogs yet" panel until they publish something.

## Optional fields on posts

| Field | Effect |
|---|---|
| `cardImage` | Different image on the index card from the one in the article |
| `cardImageAlt` | Alt text for the card image |
| `breadcrumb` | Shorter label in the breadcrumb trail than the full title |
| `imageStyle: narrow` | Portrait-width feature image instead of full width |
| `actionHref` / `actionLabel` | Override the second button at the foot of the article |
| `placeholder: true` | Shows the "Placeholder article" note (see below) |

## Draft and published

Every post, news item and team member carries a `published` flag.

- `published: false` — exists in the repository, visible in the editor at `/admin`,
  **never appears on the site**. This is what a contributor's submission arrives as.
- `published: true` — live.

That flag is the whole review mechanism. Nothing a contributor sends can reach the site
without someone turning it on.

## Organisation profiles

Each team member can carry `orgDescription` (up to 250 words) and `orgUrl`. When filled
in, an "About <organisation>" panel appears on their page. When blank, the panel is
hidden entirely — so people can be added before their copy arrives.

## Mayoral regions

`src/_data/englandRegions.json` drives the Mayoral regions list on the England page.
Add an entry and a card appears. West Midlands is the only one there now.

## Editing the standing pages

Seven pages are editable in the CMS under **Website pages**: About us, England,
Scotland, Northern Ireland, West Midlands, Combined authorities and Arms length bodies.

Each one is a markdown file in `src/pages/`. The heading, standfirst, body text,
highlighted boxes and card grids are all fields; the header, menu, footer and page
furniture live in `src/_includes/layouts/textpage.njk` and are not editable from the CMS,
so a bad edit can change the words but not break the page.

`src/pages/pages.json` supplies the layout and the URL for all of them, so those never
appear in the editor. The URL comes from the filename — `scotland.md` becomes
`/scotland.html` — which is why creating and deleting pages is turned off in the CMS.

**Still template files, not yet editable in the CMS:** the home page (too complex a
layout to hand to a text editor safely), Contact (contains the enquiry form), Wales
(contains the letter card), Research portal, Neighbourhood health and the Parliamentary
launch page.

## Search

The blogs page has a search box. It filters the cards already on the page — no index to
rebuild, and it degrades to showing everything if JavaScript is off. Anything in a post's
title, summary, author name or organisation is searchable.
