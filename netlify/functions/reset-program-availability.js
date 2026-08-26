'use strict';

const {
  getAvailabilityStore,
  restoreExpiredCaps
} = require('./_shared/program-availability');

exports.handler = async function () {
  try {
    const restored = await restoreExpiredCaps(getAvailabilityStore());
    console.info(JSON.stringify({ event: 'monthly_program_reset', restoredProgramIds: restored, completed: true }));
    return { statusCode: 200, body: JSON.stringify({ outcome: 'ok', restored: restored.length }) };
  } catch (error) {
    console.error(JSON.stringify({ event: 'monthly_program_reset', completed: false }));
    return { statusCode: 503, body: JSON.stringify({ outcome: 'unavailable' }) };
  }
};
