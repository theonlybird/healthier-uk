/**
 * Same unwrapping as team.js: the CMS needs a named top-level key, Eleventy
 * templates need a plain array.
 *
 * Edit the data in src/_data/cms/casebookRegions.json — never here. The `slug`
 * of each region is written into every casebook entry, so renaming one is safe
 * but changing its slug orphans the entries already using it.
 */
const fs = require('fs');
const path = require('path');

module.exports = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'cms', 'casebookRegions.json'), 'utf8')).casebookRegions;
