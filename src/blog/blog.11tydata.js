// Directory data for blog posts.
//
// The permalink is COMPUTED rather than fixed, so that a post awaiting review
// gets no page at all. Filtering collections.blog only keeps a draft off the
// blogs listing — on its own, Eleventy still writes the post to its own URL,
// and anyone sent or guessing that address could read it before William had
// approved it. Returning false stops the file being written.
module.exports = {
  layout: "layouts/post.njk",
  section: "news",
  cta: true,
  eleventyComputed: {
    permalink: (data) =>
      data.published === false ? false : `/blog-${data.page.fileSlug}.html`,
  },
};
