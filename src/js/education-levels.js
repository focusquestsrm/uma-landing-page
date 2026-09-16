(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.UMA_EDUCATION_LEVELS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // UMA campaign 11856 posting specifications, confirmed by the campaign owner.
  // Multiple displayed qualifications intentionally share a vendor ID.
  const options = Object.freeze([
    ['2330', 'No High School Diploma'],
    ['2331', 'GED'],
    ['2332', 'High School Diploma'],
    ['2333', 'Some College (1–29 credits)'],
    ['2333', 'Some College (30–59 credits)'],
    ['2333', 'Some College (60+ credits)'],
    ['2334', 'Associates Degree'],
    ['2334', 'Bachelors Degree'],
    ['2334', 'Masters Degree'],
    ['2334', 'Doctorates/PhD']
  ].map(function (option) { return Object.freeze(option); }));
  const acceptedIds = Object.freeze(['2331', '2332', '2333', '2334']);
  function isAccepted(value) {
    return typeof value === 'string' && acceptedIds.includes(value);
  }
  function message(value) {
    return value === '2330' ?
      'A high school diploma or GED is required for these UMA programs. We cannot submit your request with your current education level.' :
      'Please select a valid education level.';
  }
  return Object.freeze({ options, acceptedIds, isAccepted, message });
});
