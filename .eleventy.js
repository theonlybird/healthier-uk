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
  eleventyConfig.addFilter("ukdate", (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(dt.getUTCDate())}/${p(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("member", (team, slug) =>
    (team || []).find((m) => m.slug === slug) || {});
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
