'use strict';

const fs = require('fs');
const path = require('path');
const levels = require('../src/js/education-levels');
const pages = ['src/index.html', 'src/programs/connect/form-update-health.html'];
for (const page of pages) {
  const file = path.join(__dirname, '..', page);
  const source = fs.readFileSync(file, 'utf8');
  const pattern = /(<select id="lead_education_education_level_id"[^>]*>)[\s\S]*?(<\/select>)/;
  if (!pattern.test(source)) throw new Error('Missing education select: ' + page);
  const options = [['', 'Please Select']].concat(levels.options).map(function (option) {
    return '                        <option' + (option[0] ? '' : ' selected disabled') + ' value="' + option[0] + '">' + option[1] + '</option>';
  }).join('\n');
  fs.writeFileSync(file, source.replace(pattern, '$1\n' + options + '\n                      $2'));
}
console.log('Generated both UMA forms from the approved education mapping.');
