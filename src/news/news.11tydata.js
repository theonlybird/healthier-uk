// Directory data for news items. See the note in src/blog/blog.11tydata.js —
// an unpublished item must not get a page of its own, only be hidden from lists.
module.exports = {
  layout: "layouts/newsitem.njk",
  section: "news",
  cta: true,
  eleventyComputed: {
    permalink: (data) =>
      data.published === false ? false : `/news-${data.page.fileSlug}.html`,
  },
};
