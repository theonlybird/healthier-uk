/**
 * The CMS at /admin needs this data as a JSON object with a named key, because a
 * Decap/Sveltia file collection maps top-level keys to fields and cannot address a
 * bare array. Eleventy templates need a plain array. This unwraps one into the
 * other so neither side has to change.
 *
 * Edit the data in src/_data/cms/organisations.json — never here.
 */
const fs = require('fs');
const path = require('path');

module.exports = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'cms', 'organisations.json'), 'utf8')).organisations;
