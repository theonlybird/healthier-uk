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

  eleventyConfig.addCollection("team", (c) =>
    (c.getAll()[0]?.data?.team || []).filter((m) => m.published !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0)));

  // --- filters -----------------------------------------------------------
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
