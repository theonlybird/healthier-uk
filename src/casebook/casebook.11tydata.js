// Directory data for casebook entries.
//
// Same reasoning as blog.11tydata.js: the permalink is COMPUTED so that an
// entry awaiting review gets no page at all. Filtering the collection only
// keeps it off the listing — Eleventy would still write the file to its own
// URL, and anyone guessing that address could read an unreviewed submission.
module.exports = {
  layout: "layouts/casebook.njk",
  section: "casebook",
  cta: true,
  eleventyComputed: {
    permalink: (data) =>
      data.published === false ? false : `/casebook-${data.page.fileSlug}.html`,
  },
};
