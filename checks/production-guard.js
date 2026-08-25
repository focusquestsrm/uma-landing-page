'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicFiles = [
  'src/index.html',
  'src/programs/connect/form-update-health.html',
  'src/css/styles.css',
  'src/js/function2.js',
  'src/js/program-availability.js'
];
const publicSource = publicFiles.map(function (file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}).join('\n');
const functionSource = fs.readFileSync(path.join(root, 'netlify/functions/submit-lead.js'), 'utf8');
const protectedNames = [
  ['LEAD', 'SUBMISSION', 'ENABLED'],
  ['LEAD', 'TEST', 'FLAG'],
  ['LEADHOOP', 'CAMPAIGN', 'ENABLED']
].map(function (parts) { return parts.join('_'); });

const checks = [
  ['visitor language', !/\b(?:testing|demo|staging|preview|sandbox|development|qa)\b/i.test(publicSource)],
  ['browser mode control', !/lead\[test\]|submissionEnabled|validationFlag/i.test(publicSource)],
  ['direct vendor submission', !/back2learn-post\.leadhoop\.com/i.test(publicSource)],
  ['same-site submission', /\/\.netlify\/functions\/submit-lead/.test(publicSource)],
  ['robots directive', (publicSource.match(/name="robots" content="noindex, nofollow"/g) || []).length === 2],
  ['TrustedForm session script', /api\.trustedform\.com\/trustedform\.js/.test(publicSource)],
  ['Jornaya campaign script', /create\.lidstatic\.com\/campaign\//.test(publicSource)],
  ['server classification', /outbound\.set\('lead\[test\]'/.test(functionSource)],
  ['protected environment names', protectedNames.every(function (name) { return !functionSource.includes(name); })],
  ['routing value absent from browser', !/campaign_code|lead_education\[campus_id\]|trkhoop\.com\/redirects\//.test(publicSource)]
];

const failed = checks.filter(function (entry) { return !entry[1]; });
if (failed.length) {
  failed.forEach(function (entry) { console.error('FAILED:', entry[0]); });
  process.exit(1);
}

console.log('Production guard passed.');
