(function () {
  'use strict';

  const pixelId = '3178962768924361';
  if (!window.fbq) {
    const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window._fbq = fbq;
    window.fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (!window.__umaMetaPageViewFired) {
    window.__umaMetaPageViewFired = true;
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }

  window.UMA_META = {
    fireLead: function (eventId) {
      if (window.__umaMetaLeadFired) return false;
      window.__umaMetaLeadFired = true;
      window.fbq('track', 'Lead', {}, eventId ? { eventID: eventId } : undefined);
      return true;
    }
  };
})();
