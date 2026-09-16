'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const levels = require('../src/js/education-levels');
// Independent campaign specification: do not derive expected labels from implementation.
const expected = [
  ['2330', 'No High School Diploma'], ['2331', 'GED'], ['2332', 'High School Diploma'],
  ['2333', 'Some College (1–29 credits)'], ['2333', 'Some College (30–59 credits)'],
  ['2333', 'Some College (60+ credits)'], ['2334', 'Associates Degree'],
  ['2334', 'Bachelors Degree'], ['2334', 'Masters Degree'], ['2334', 'Doctorates/PhD']
];
assert.deepStrictEqual(levels.options, expected);
assert.deepStrictEqual(levels.acceptedIds, ['2331', '2332', '2333', '2334']);
const pages = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.html')) {
      const source = fs.readFileSync(file, 'utf8');
      const selects = [...source.matchAll(/<select\b[^>]*name="lead_education\[education_level_id\]"[^>]*>([\s\S]*?)<\/select>/g)];
      for (const select of selects) {
        const options = [...select[1].matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)]
          .map(function (match) { return [match[1], match[2]]; }).filter(function (option) { return option[0]; });
        assert.deepStrictEqual(options, expected, 'Form mapping drifted: ' + file);
        assert.strictEqual(new Set(options.map(function (option) { return option[1]; })).size, expected.length);
        options.forEach(function (option) { assert.strictEqual(levels.isAccepted(option[0]), option[0] !== '2330'); });
        assert(source.indexOf('js/education-levels.js') < source.indexOf('js/function2.js'));
        assert(!/<input[^>]*name="lead_education\[education_level_id\]"/.test(source), 'Unexpected hidden education override');
        pages.push(file);
      }
    }
  }
}
walk(path.join(__dirname, '../src'));
assert.strictEqual(pages.length, 2);
for (const value of ['', '2330', '2335', '2336', '2337', '2332.0', ' 2332', '2332 ', '02332', 2332, null, {}, 'GED']) {
  assert.strictEqual(levels.isAccepted(value), false);
}
console.log('Education mapping: both active forms match all 10 campaign labels; only 2331–2334 accepted.');
