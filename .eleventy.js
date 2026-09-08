const MarkdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // images, CSS and JS stay where they are at the repo root
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");


  // --- collections -------------------------------------------------------
  // A post or member with published:false is awaiting review — it exists in the
  // repo (so it can be read in the CMS) but never reaches the built site.
  const live = (item) => item.data.published !== false;

  eleventyConfig.addCollection("blog", (c) =>
    c.getFilteredByGlob("src/blog/*.md").filter(live)
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date)));
  eleventyConfig.addCollection("news", (c) =>
    c.getFilteredByGlob("src/news/*.md").filter(live)
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date)));

  // Casebook entries arrive through a public form, so they are sorted on the
  // date they came in and, like blogs, never reach the site until reviewed.
  eleventyConfig.addCollection("casebook", (c) =>
    c.getFilteredByGlob("src/casebook/*.md").filter(live)
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date)));

  eleventyConfig.addCollection("team", (c) =>
    (c.getAll()[0]?.data?.team || []).filter((m) => m.published !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0)));

  // --- filters -----------------------------------------------------------
  /**
   * Renderer for prose written by editors in the CMS (currently the organisation
   * description). Three deliberate choices:
   *
   *  html: false     The public "write for us" form collects a suggested
   *                  organisation description, and an editor may paste that text
   *                  straight into this field. Nothing arriving from a stranger
   *                  should be able to inject markup into a published page.
   *  breaks: true    A single Return becomes a line break, which is what someone
   *                  typing into a box expects. Strict Markdown would silently
   *                  swallow it and merge the lines.
   *  linkify: true   A pasted bare URL becomes a working link.
   */
  const proseMarkdown = new MarkdownIt({ html: false, breaks: true, linkify: true });

  /**
   * markdown(text, demote)
   *
   * `demote` shifts every heading down by that many levels, so an author picking
   * "Heading 2" in the editor cannot outrank or tie the heading of the panel their
   * text sits inside. Every button in the editor stays available — only the
   * rendered level moves, which keeps the page outline valid for screen readers.
   */
  eleventyConfig.addFilter("markdown", (value, demote = 0) => {
    if (!value) return "";
    const html = proseMarkdown.render(String(value));
    if (!demote) return html;
    return html.replace(
      /<(\/?)h([1-6])\b/g,
      (_m, slash, level) => `<${slash}h${Math.min(6, Number(level) + Number(demote))}`
    );
  });

  /**
   * Resolve an image reference from either source to a usable URL.
   *
   * The CMS at /admin saves images as a path, because `public_folder` is set:
   * "/assets/images/Gillian Orrow.png". Entries written by hand (and by the
   * submission function) are bare filenames: "team-william-bird.png". Templates
   * used to prepend the folder themselves, which doubled the path on anything
   * saved through the CMS and produced a 404.
   *
   * Accept either shape, and percent-encode characters that are fine in a
   * filename but not in a URL — spaces above all.
   */
  eleventyConfig.addFilter("imageUrl", (value) => {
    if (!value) return "";
    const raw = String(value).trim();
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith("data:")) return raw;
    const name = raw.replace(/^\/+/, "").replace(/^assets\/images\//, "");
    if (!name) return "";
    return "assets/images/" + name.split("/").map(encodeURIComponent).join("/");
  });

  /**
   * regionName(regions, slug) — the readable name for a casebook region.
   * The entry stores the slug so a later map can group on a stable key even
   * if the label is reworded.
   */
  eleventyConfig.addFilter("regionName", (regions, slug) =>
    ((regions || []).find((r) => r.slug === slug) || {}).name || "");

  /**
   * place(entry) — "Guildford, South East England", skipping either half if
   * it is missing. Used on the card, the entry page and the search index.
   */
  eleventyConfig.addFilter("place", (regions, entry) => {
    const region = ((regions || []).find((r) => r.slug === entry.region) || {}).name || "";
    return [entry.town, region].filter(Boolean).join(", ");
  });

  /**
   * truncateWords(text, n) — a plain-text excerpt for a card. Casebook entries
   * have no separate summary field: the form asks for nine things already, and
   * a tenth would be one more thing to fill in. The card borrows the opening of
   * the health challenge instead, which is the sentence that says what the
   * project was for.
   */
  eleventyConfig.addFilter("truncateWords", (value, n = 30) => {
    const words = String(value || "").replace(/\s+/g, " ").trim().split(" ");
    if (words.length <= n) return words.join(" ");
    return words.slice(0, n).join(" ") + "\u2026";
  });

  eleventyConfig.addFilter("ukdate", (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(dt.getUTCDate())}/${p(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("member", (team, slug) =>
    (team || []).find((m) => m.slug === slug) || {});

  // Organisations are records in their own right, so two people at the same
  // organisation share one description and one spelling of its name.
  // Falls back to whatever a submission typed, until an editor assigns it.
  eleventyConfig.addFilter("orgOf", (organisations, m) => {
    if (!m) return {};
    const found = (organisations || []).find((o) => o.slug === m.orgSlug);
    return found || { name: m.orgSuggested || "", url: "", description: "" };
  });
  eleventyConfig.addFilter("byAuthor", (posts, slug) =>
    (posts || []).filter((p) => p.data.author === slug));
  eleventyConfig.addFilter("blogCount", (posts, slug) => {
    const n = (posts || []).filter((p) => p.data.author === slug).length;
    return n === 0 ? "No blogs yet" : n === 1 ? "1 blog" : `${n} blogs`;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
