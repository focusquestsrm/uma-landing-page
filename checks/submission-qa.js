'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../src/js/function2.js'), 'utf8');

function storage() {
  const values = new Map();
  return {
    getItem: function (key) { return values.has(key) ? values.get(key) : null; },
    setItem: function (key, value) { values.set(key, String(value)); },
    removeItem: function (key) { values.delete(key); }
  };
}

function classList() {
  const values = new Set();
  return {
    toggle: function (name, enabled) { enabled ? values.add(name) : values.delete(name); },
    contains: function (name) { return values.has(name); }
  };
}

async function harness(fetchImplementation, overrides, sharedSessionStorage) {
  const fields = {};
  function field(id, name, value) {
    const node = {
      id, name, value: value || '', disabled: false, textContent: '', classList: classList(),
      addEventListener: function (type, listener) { this['on' + type] = listener; }, dispatchEvent: function () {}, focus: function () {}
    };
    fields[id] = node;
    return node;
  }
  field('lead_education_program_id', 'lead_education[program_id]', '227753');
  field('lead_education_grad_year', 'lead_education[grad_year]', '2023');
  field('lead_education_education_level_id', 'lead_education[education_level_id]', '2332');
  field('lead_address_address_visible', '', '123 Test Street');
  field('lead_address_address', 'lead_address[address]', '123 Test Street');
  field('lead_address_city', 'lead_address[city]', 'Tampa');
  field('lead_address_state', 'lead_address[state]', 'FL');
  field('lead_address_zip', 'lead_address[zip]', '33601');
  field('lead_firstname', 'lead[firstname]', 'Browser');
  field('lead_lastname', 'lead[lastname]', 'Review');
  field('lead_email', 'lead[email]', 'browser.review@example.invalid');
  field('lead_phone1', 'lead[phone1]', '2125550100');
  field('meta_event_id', 'meta_event_id', 'meta-event-safe');
  field('submission_id', 'submission_id', '');
  field('status-message', '', '');
  field('education-error', '', '');
  const button = field('submitButton', '', '');
  button.textContent = 'Request Info';
  Object.assign(fields, overrides || {});

  const steps = [1, 2, 3, 4].map(function (number) {
    return { dataset: { step: String(number) }, classList: classList() };
  });
  let visibleStep = steps[2];
  const handlers = {};
  const form = {
    dataset: {},
    addEventListener: function (type, listener) { handlers[type] = listener; },
    querySelectorAll: function (selector) { return selector === '.form-step[data-step]' ? steps : []; },
    querySelector: function (selector) {
      if (selector === '.form-step.is-visible') return visibleStep;
      return null;
    },
    reset: function () {},
    scrollIntoView: function () {}
  };
  const document = {
    title: 'Submission test', activeElement: null, cookie: '',
    getElementById: function (id) { return id === 'leadform' ? form : fields[id] || null; }
  };
  function MockFormData() {
    this.entries = Object.values(fields).filter(function (node) { return node.name; }).map(function (node) { return [node.name, node.value]; });
  }
  MockFormData.prototype[Symbol.iterator] = function () { return this.entries[Symbol.iterator](); };
  const assigned = [];
  const context = vm.createContext({
    document,
    location: { search: '', pathname: '/', hash: '', assign: function (value) { assigned.push(value); } },
    history: { replaceState: function () {} },
    sessionStorage: sharedSessionStorage || storage(), localStorage: storage(), URLSearchParams, FormData: MockFormData,
    CustomEvent: function () {}, Event: function () {}, Uint32Array, console,
    crypto: { randomUUID: function () { return '12345678-1234-4123-8123-123456789abc'; } },
    fetch: fetchImplementation,
    setTimeout: function (callback) { callback(); },
    UMA_GRADUATION_YEARS: { isValid: function (value) { return value === '2023'; } },
    UMA_EDUCATION_LEVELS: require('../src/js/education-levels'),
    UMA_PROGRAM_AVAILABILITY: {
      loadPrograms: async function () { return [{ program_id: '227753' }]; },
      populateSelect: function () {}, renderCards: function () {}
    }
  });
  context.window = context;
  context.window.location = context.location;
  context.window.history = context.history;
  context.window.crypto = context.crypto;
  context.window.dispatchEvent = function () {};
  vm.runInContext(source, context);
  await Promise.resolve();
  visibleStep = steps[2];
  return {
    assigned, button, fields, form,
    submit: function () { return handlers.submit({ preventDefault: function () {} }); }
  };
}

(async function () {
  let educationRequests = 0;
  const educationSession = storage();
  educationSession.setItem('lead_education[education_level_id]', '2336');
  educationSession.setItem('educationLevel', '2335');
  const education = await harness(async function (url, options) {
    educationRequests += 1;
    assert.strictEqual(new URLSearchParams(options.body).get('lead_education[education_level_id]'), education.fields.lead_education_education_level_id.value);
    return { ok: false, json: async function () { return { outcome: 'validation_error', field: 'education', retryable: true }; } };
  }, null, educationSession);
  assert.strictEqual(education.fields.lead_education_education_level_id.value, '2332', 'Untrusted storage changed the selected qualification');
  const rejected = ['', '2330', '2335', '2336', '2337', '9999', ' 2332', '2332 ', '2332.0', 'GED', '2332,2333'];
  for (const value of rejected) {
    education.fields.lead_education_education_level_id.value = value;
    education.fields.lead_education_education_level_id.onchange();
    await education.submit();
    assert.strictEqual(educationRequests, 0, 'Invalid or restored education reached the server');
    assert.strictEqual(education.fields.lead_education_education_level_id.value, value, 'Invalid education was substituted');
    assert.match(education.fields['education-error'].textContent, value === '2330' ? /diploma or GED is required/ : /select a valid education level/);
    assert.doesNotMatch(education.fields['education-error'].textContent, /233\d|9999/);
    assert.strictEqual(education.button.disabled, false);
  }
  for (const option of require('../src/js/education-levels').options.filter(function (option) { return option[0] !== '2330'; })) {
    education.fields.lead_education_education_level_id.value = option[0];
    education.fields.lead_education_education_level_id.onchange();
    assert.strictEqual(education.fields['education-error'].textContent, '');
    await education.submit();
    assert.strictEqual(education.button.disabled, false, 'Server validation response locked correction');
    assert.match(education.fields['education-error'].textContent, /select a valid education level/);
  }
  assert.strictEqual(educationRequests, 9, 'Every accepted label should permit submission');
  console.log(JSON.stringify({ educationBrowser: { invalidCases: rejected.length, invalidRequests: 0, acceptedLabels: educationRequests, serverValidationRecoverable: true } }));
  let release;
  let requests = 0;
  const bodies = [];
  const locked = await harness(async function (url, options) {
    requests += 1;
    bodies.push(options.body);
    await new Promise(function (resolve) { release = resolve; });
    return { ok: true, json: async function () { return { outcome: 'accepted', location: 'https://redirect.invalid/accepted' }; } };
  });
  const oneClick = locked.submit();
  await Promise.resolve();
  assert.strictEqual(locked.button.disabled, true, 'Button was not disabled immediately');
  assert.strictEqual(locked.button.textContent, 'Submitting...');
  assert.strictEqual(locked.fields['status-message'].textContent, '', 'Successful request displayed an error before its response');
  const rapidClick = locked.submit();
  const enterPress = locked.submit();
  const repeatedEvent = locked.submit();
  assert.strictEqual(requests, 1, 'Rapid click, Enter, or repeated submit created another browser request');
  assert.strictEqual(locked.button.disabled, true);
  release();
  await Promise.all([oneClick, rapidClick, enterPress, repeatedEvent]);
  assert.strictEqual(locked.assigned[0], 'https://redirect.invalid/accepted');
  assert.strictEqual(locked.fields['status-message'].textContent, '', 'Successful response displayed the generic error');

  let retryRequests = 0;
  const retryBodies = [];
  const retryable = await harness(async function (url, options) {
    retryRequests += 1;
    retryBodies.push(options.body);
    if (retryRequests === 1) return { ok: false, json: async function () { return { outcome: 'unavailable', retryable: true }; } };
    return { ok: true, json: async function () { return { outcome: 'failed', location: 'https://redirect.invalid/failed' }; } };
  });
  await retryable.submit();
  assert.strictEqual(retryable.button.disabled, false, 'Confirmed recoverable failure permanently locked the form');
  assert.match(retryable.fields['status-message'].textContent, /try again shortly/);
  await retryable.submit();
  assert.strictEqual(retryRequests, 2);
  assert.strictEqual(new URLSearchParams(retryBodies[0]).get('submission_id'), new URLSearchParams(retryBodies[1]).get('submission_id'));
  assert.strictEqual(retryable.assigned[0], 'https://redirect.invalid/failed');

  let ambiguousRequests = 0;
  const pendingSession = storage();
  const ambiguous = await harness(async function () { ambiguousRequests += 1; throw new Error('mock network failure'); }, null, pendingSession);
  await ambiguous.submit();
  await ambiguous.submit();
  assert.strictEqual(ambiguousRequests, 1, 'Ambiguous browser failure allowed an unsafe retry');
  assert.strictEqual(ambiguous.button.disabled, true);
  assert.strictEqual(ambiguous.fields['status-message'].textContent, 'Your request is being processed. Please do not submit it again.');
  assert.doesNotMatch(ambiguous.fields['status-message'].textContent, /try again/i);
  const pendingId = ambiguous.fields.submission_id.value;
  assert.strictEqual(JSON.parse(pendingSession.getItem('umaLeadSubmissionState')).state, 'pending');

  let refreshedRequests = 0;
  const refreshed = await harness(async function () { refreshedRequests += 1; }, null, pendingSession);
  assert.strictEqual(refreshed.button.disabled, true, 'Refresh did not restore the pending lock');
  assert.strictEqual(refreshed.button.textContent, 'Processing...');
  assert.strictEqual(refreshed.fields.submission_id.value, pendingId, 'Refresh generated a new submission ID');
  assert.strictEqual(refreshed.fields['status-message'].textContent, 'Your request is being processed. Please do not submit it again.');
  await refreshed.submit();
  assert.strictEqual(refreshedRequests, 0, 'Revisited pending submission created a browser request');

  let invalidRequests = 0;
  const invalid = await harness(async function () {
    invalidRequests += 1;
    return { ok: true, json: async function () { return { outcome: 'failed', location: 'https://redirect.invalid/failed' }; } };
  }, { lead_firstname: Object.assign({
    id: 'lead_firstname', name: 'lead[firstname]', value: 'X', disabled: false, textContent: '', classList: classList(),
    addEventListener: function () {}, dispatchEvent: function () {}, focus: function () {}
  }) });
  await invalid.submit();
  assert.strictEqual(invalidRequests, 0, 'Invalid browser form reached the submission endpoint');
  assert.strictEqual(invalid.button.disabled, false, 'Validation failure locked the form');
  invalid.fields.lead_firstname.value = 'Corrected';
  await invalid.submit();
  assert.strictEqual(invalidRequests, 1, 'Corrected validation error did not submit exactly once');
  assert.strictEqual(invalid.assigned[0], 'https://redirect.invalid/failed');

  assert.strictEqual(new URLSearchParams(bodies[0]).get('submission_id'), '12345678-1234-4123-8123-123456789abc');
  console.log(JSON.stringify({
    successful: { browserRequests: requests },
    safeRetry: { browserRequests: retryRequests, submissionIds: 1 },
    ambiguous: { browserRequests: ambiguousRequests, buttonDisabled: true },
    refreshedPending: { browserRequests: refreshedRequests, submissionIdPreserved: true },
    correctedValidation: { browserRequests: invalidRequests }
  }));
})().catch(function (error) { console.error(error); process.exit(1); });
