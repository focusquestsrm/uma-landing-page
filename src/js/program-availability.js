(function () {
  'use strict';
  const availablePrograms = ['227753', '227754', '227755', '227756'];
  window.UMA_PROGRAM_AVAILABILITY = {
    getAvailablePrograms: function () { return availablePrograms.slice(); },
    isAvailable: function (programId) { return availablePrograms.indexOf(String(programId)) !== -1; }
  };
})();
