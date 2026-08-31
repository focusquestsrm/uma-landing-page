'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src/js/google-places.js'), 'utf8');

function classList() {
  const values = new Set();
  return {
    add: function (value) { values.add(value); },
    remove: function (value) { values.delete(value); },
    contains: function (value) { return values.has(value); }
  };
}

function field(value) {
  const listeners = {};
  return {
    value: value || '',
    disabled: false,
    events: [],
    focused: false,
    blurred: false,
    addEventListener: function (name, callback) { (listeners[name] || (listeners[name] = [])).push(callback); },
    dispatchEvent: function (event) {
      this.events.push(event.type);
      (listeners[event.type] || []).forEach(function (callback) { callback(event); });
      return !event.defaultPrevented;
    },
    focus: function () { this.focused = true; },
    blur: function () { this.blurred = true; },
    fire: function (name, event) { (listeners[name] || []).forEach(function (callback) { callback(event); }); }
  };
}

function place(streetNumber, route, city, state, zip, cityType) {
  return { address_components: [
    streetNumber && { long_name: streetNumber, short_name: streetNumber, types: ['street_number'] },
    route && { long_name: route, short_name: route, types: ['route'] },
    city && { long_name: city, short_name: city, types: [cityType || 'locality'] },
    state && { long_name: state, short_name: state, types: ['administrative_area_level_1'] },
    zip && { long_name: zip, short_name: zip, types: ['postal_code'] }
  ].filter(Boolean) };
}

function setup(options) {
  options = options || {};
  const fields = {
    lead_address_address_visible: field(options.street || ''),
    lead_address_address: field(options.street || ''),
    lead_address_city: field(options.city || ''),
    lead_address_state: field(options.state || ''),
    lead_address_zip: field(options.zip || '')
  };
  const documentEvents = [];
  const appended = [];
  const document = {
    body: { classList: classList() },
    head: { appendChild: function (node) { appended.push(node); } },
    createElement: function () { return { dataset: {}, addEventListener: function (name, callback) { this['on' + name] = callback; } }; },
    getElementById: function (id) { return fields[id] || null; },
    dispatchEvent: function (event) { documentEvents.push(event); }
  };
  let selectedPlace = null;
  let placeChanged = null;
  let constructorCount = 0;
  let listenerCount = 0;
  const Autocomplete = options.throwOnInitialize ? function () { throw new Error('blocked'); } : function (placesInput, suppliedOptions) {
    constructorCount += 1;
    this.input = placesInput;
    this.options = suppliedOptions;
    this.addListener = function (name, callback) {
      assert.strictEqual(name, 'place_changed');
      listenerCount += 1;
      placeChanged = callback;
      return { remove: function () { listenerCount -= 1; } };
    };
    this.getPlace = function () { return selectedPlace; };
  };
  const context = vm.createContext({
    document,
    Event: function (type) { this.type = type; this.defaultPrevented = false; },
    CustomEvent: function (type, init) { this.type = type; this.detail = init.detail; },
    console,
    encodeURIComponent
  });
  context.window = context;
  context.UMA_RUNTIME_CONFIG = { googleMapsBrowserKey: options.key === undefined ? 'unit-test-key-value-1234567890' : options.key };
  context.google = { maps: { places: { Autocomplete } } };
  vm.runInContext(source, context);
  return {
    context,
    fields,
    document,
    documentEvents,
    appended,
    select: function (value) { selectedPlace = value; placeChanged(); },
    counts: function () { return { constructorCount, listenerCount }; }
  };
}

['mouse', 'keyboard', 'touch'].forEach(function (mode, index) {
  const test = setup();
  const values = index === 1 ?
    place('350', '5th Avenue', 'New York', 'NY', '10118') :
    place('1600', 'Amphitheatre Parkway', 'Mountain View', 'CA', '94043');
  test.select(values);
  assert.strictEqual(test.fields.lead_address_address_visible.value, index === 1 ? '350 5th Avenue' : '1600 Amphitheatre Parkway', `${mode} street selection failed`);
  assert.strictEqual(test.fields.lead_address_address.value, test.fields.lead_address_address_visible.value, `${mode} LeadHoop street mapping failed`);
  assert.strictEqual(test.fields.lead_address_city.value, index === 1 ? 'New York' : 'Mountain View', `${mode} city population failed`);
  assert.strictEqual(test.fields.lead_address_state.value, index === 1 ? 'NY' : 'CA', `${mode} state population failed`);
  assert.strictEqual(test.fields.lead_address_zip.value, index === 1 ? '10118' : '94043', `${mode} ZIP population failed`);
  ['lead_address_address_visible', 'lead_address_address', 'lead_address_city', 'lead_address_state', 'lead_address_zip'].forEach(function (id) {
    assert.deepStrictEqual(test.fields[id].events.slice(-2), ['input', 'change'], `${mode} did not refresh ${id} validation`);
    assert.strictEqual(test.fields[id].disabled, false, `${mode} locked ${id}`);
  });
  assert(test.document.body.classList.contains('uma-places-selection-complete'), `${mode} did not close suggestions`);
});

const manual = setup({ key: '', street: '12 Manual Road', city: 'Austin', state: 'TX', zip: '78701' });
assert.strictEqual(manual.appended.length, 0, 'Missing Google configuration must remain manual-only');
assert.deepStrictEqual([
  manual.fields.lead_address_address_visible.value,
  manual.fields.lead_address_city.value,
  manual.fields.lead_address_state.value,
  manual.fields.lead_address_zip.value
], ['12 Manual Road', 'Austin', 'TX', '78701'], 'Manual address entry was changed');

const failed = setup({ throwOnInitialize: true, street: '44 Manual Street' });
assert.strictEqual(failed.context.UMA_GOOGLE_PLACES.initializePlaces(), null, 'Google failure must return to manual mode');
assert.strictEqual(failed.fields.lead_address_address_visible.value, '44 Manual Street', 'Google failure erased manual entry');
assert.strictEqual(failed.fields.lead_address_address_visible.disabled, false, 'Google failure locked manual entry');

const incomplete = setup({ street: '500 Example Avenue' });
incomplete.select(place('500', 'Example Avenue', '', 'FL', '33602'));
assert.strictEqual(incomplete.fields.lead_address_city.value, '', 'Incomplete result invented a city');
assert(incomplete.fields.lead_address_city.focused, 'Incomplete result did not focus the missing city');
assert(incomplete.documentEvents.some(function (event) { return event.type === 'uma:address-populated' && event.detail.missing.includes('lead_address_city'); }), 'Incomplete result was not reported');

const postalTown = setup();
postalTown.select(place('1', 'Main Street', 'Doylestown', 'PA', '18901', 'postal_town'));
assert.strictEqual(postalTown.fields.lead_address_city.value, 'Doylestown', 'postal_town city fallback failed');

const repeated = setup();
repeated.context.UMA_GOOGLE_PLACES.initializePlaces();
repeated.context.UMA_GOOGLE_PLACES.initializePlaces();
assert.deepStrictEqual(repeated.counts(), { constructorCount: 1, listenerCount: 1 }, 'Repeated address-step navigation created duplicate Places listeners');

assert.strictEqual(incomplete.fields.lead_address_address.value, '500 Example Avenue', 'Address must retain the approved LeadHoop field name/value');
console.log('Google address mouse, keyboard, touch, fallback, persistence, and listener regressions passed.');
