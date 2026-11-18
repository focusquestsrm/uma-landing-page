(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.UMA_GRADUATION_YEARS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MINIMUM_YEAR = 1996;
  const TRANSITION_MINIMUM_YEAR = 1998;
  const MAXIMUM_YEAR = 2025;
  const TRANSITION_YEAR = 2026;
  const TRANSITION_MONTH = 12;
  const TRANSITION_DAY = 1;
  const TIME_ZONE = 'America/New_York';

  function timezoneParts(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(date || new Date());
    const values = {};
    parts.forEach(function (part) {
      if (part.type !== 'literal') values[part.type] = part.value;
    });
    return values;
  }

  function isTransitionActive(date) {
    const values = timezoneParts(date);
    const year = Number(values.year || '0');
    const month = Number(values.month || '0');
    const day = Number(values.day || '0');
    if (year > TRANSITION_YEAR) return true;
    if (year < TRANSITION_YEAR) return false;
    if (month > TRANSITION_MONTH) return true;
    if (month < TRANSITION_MONTH) return false;
    return day >= TRANSITION_DAY;
  }

  function getMinimumYear(date) {
    return isTransitionActive(date) ? TRANSITION_MINIMUM_YEAR : MINIMUM_YEAR;
  }

  function getAllowedYears(date) {
    const minimumYear = getMinimumYear(date);
    const years = [];
    for (let year = MAXIMUM_YEAR; year >= minimumYear; year -= 1) {
      years.push(year);
    }
    return years;
  }

  function isValid(value, date) {
    const normalized = String(value || '').trim();
    if (!/^\d{4}$/.test(normalized)) return false;
    const year = Number(normalized);
    if (!Number.isInteger(year)) return false;
    return year >= getMinimumYear(date) && year <= MAXIMUM_YEAR;
  }

  function applyOptions(select, date) {
    if (!select || typeof select.options === 'undefined') return;
    const selectedValue = select.value || '';
    const allowedYears = getAllowedYears(date);
    const currentValue = allowedYears.includes(Number(selectedValue)) ? String(selectedValue) : '';
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Please Select';
    select.appendChild(placeholder);
    allowedYears.forEach(function (year) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      select.appendChild(option);
    });
    if (currentValue) {
      select.value = currentValue;
    } else {
      select.value = '';
    }
  }

  return Object.freeze({
    MINIMUM_YEAR,
    TRANSITION_MINIMUM_YEAR,
    MAXIMUM_YEAR,
    TIME_ZONE,
    getMinimumYear,
    getAllowedYears,
    isTransitionActive,
    isValid,
    applyOptions
  });
});
