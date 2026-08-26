'use strict';

const assert = require('assert');
const submit = require('../netlify/functions/submit-lead').handler;

function env(parts, value) {
  process.env[parts.join('_')] = value;
}

env(['LEAD', 'SUBMISSION', 'ENABLED'], 'true');
env(['LEAD', 'TEST', 'FLAG'], 'false');
env(['LEADHOOP', 'CAMPAIGN', 'ENABLED'], 'true');
env(['LEADHOOP', 'ENDPOINT'], 'https://vendor.invalid/incoming/leads');
env(['LEADHOOP', 'AUTHORIZATION'], 'protected');
env(['LEADHOOP', 'CAMPAIGN', 'CODE'], 'preserved');
env(['LEADHOOP', 'CAMPUS', 'ID'], 'preserved-campus');
env(['LEAD', 'SIGNUP', 'URL'], 'preserved-source');
env(['REJECTED', 'LEAD', 'REDIRECT'], 'https://redirect.invalid/ineligible');
env(['PROGRAM', 'CAP', 'ENDPOINT'], 'https://cap.invalid/program');
env(['PROGRAM', 'CAP', 'CAMPAIGN'], 'preserved-cap');
env(['LEADHOOP', 'FIXED', 'FIELDS'], '{}');
env(['ALLOWED', 'ORIGINS'], 'https://uma.back2learn.com,https://back2learn-uma.netlify.app');

const event = {
  httpMethod: 'POST',
  headers: { host: 'uma.back2learn.com', origin: 'https://uma.back2learn.com', 'x-forwarded-for': '192.0.2.10' },
  body: new URLSearchParams({
    'lead[firstname]': 'Fallon',
    'lead[lastname]': 'Example',
    'lead[email]': 'fallon@example.com',
    'lead[phone1]': '2125550100',
    'lead[test]': 'false',
    'lead[service_trusted_form]': 'certificate-value',
    'lead[service_leadid]': 'leadid-value',
    'lead_education[program_id]': '227754',
    'unexpected': 'must-not-pass'
  }).toString()
};

(async function () {
  let outboundUrl = '';
  global.fetch = async function (url) {
    outboundUrl = String(url);
    return { ok: true, json: async function () { return { status: 'success' }; } };
  };

  const accepted = await submit(event);
  assert.strictEqual(accepted.statusCode, 200);
  assert.strictEqual(JSON.parse(accepted.body).outcome, 'accepted');
  assert.match(outboundUrl, /lead%5Btest%5D=false/);
  assert.doesNotMatch(outboundUrl, /lead%5Btest%5D=true/);
  assert.doesNotMatch(outboundUrl, /unexpected=/);
  assert.match(outboundUrl, /campaign_code=preserved/);
  assert.match(outboundUrl, /lead_education%5Bprogram_id%5D=227754/);

  const duplicate = await submit(event);
  assert.strictEqual(duplicate.statusCode, 409);

  global.fetch = async function () {
    return { ok: true, json: async function () { return { status: 'failure', reason: { base: [] } }; } };
  };
  const deniedEvent = Object.assign({}, event, {
    body: new URLSearchParams(Object.assign({}, Object.fromEntries(new URLSearchParams(event.body)), {
      'lead[email]': 'different@example.com'
    })).toString()
  });
  const denied = await submit(deniedEvent);
  assert.strictEqual(JSON.parse(denied.body).outcome, 'redirect');

  env(['LEADHOOP', 'CAMPAIGN', 'ENABLED'], 'false');
  const locked = await submit(event);
  assert.strictEqual(locked.statusCode, 503);

  env(['LEADHOOP', 'CAMPAIGN', 'ENABLED'], 'true');
  delete process.env[['LEADHOOP', 'AUTHORIZATION'].join('_')];
  const missingConfiguration = await submit(event);
  assert.strictEqual(missingConfiguration.statusCode, 503);

  console.log('Function contract passed.');
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});
