(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.UMA_GRADUATION_YEARS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const START_YEAR = 1996;
  const CAMPAIGN_TIME_ZONE = 'America/New_York';

  function currentYear(date) {
    const value = date instanceof Date ? date : new Date();
    return Number(new Intl.DateTimeFormat('en-US', {
      timeZone: CAMPAIGN_TIME_ZONE,
      year: 'numeric'
    }).format(value));
  }

  function maximumYear(date) {
    return currentYear(date) + 1;
  }

  function options(date) {
    const years = [];
    for (let year = maximumYear(date); year >= START_YEAR; year -= 1) years.push(year);
    return years;
  }

  function isValid(value, date) {
    const normalized = String(value || '').trim();
    if (!/^\d{4}$/.test(normalized)) return false;
    const year = Number(normalized);
    return year >= START_YEAR && year <= maximumYear(date);
  }

  return Object.freeze({
    START_YEAR,
    currentYear,
    maximumYear,
    options,
    isValid
  });
});
