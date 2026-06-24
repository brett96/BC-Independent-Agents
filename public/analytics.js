(function () {
  const VISITOR_KEY = 'bc_visitor_id';
  const SESSION_KEY = 'bc_session_id';

  function randomId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function scriptMeta() {
    const script = document.currentScript;
    return {
      site: script?.dataset?.site || 'landing',
      product: script?.dataset?.product || 'independent-agents',
      trackUrl: script?.dataset?.trackUrl || '/api/track',
    };
  }

  async function trackEvent(eventType, extra) {
    const meta = scriptMeta();
    try {
      await fetch(meta.trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: meta.site,
          product: meta.product,
          eventType,
          path: extra?.path ?? window.location.pathname,
          referrer: document.referrer || null,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          properties: extra?.properties,
        }),
      });
    } catch {
      /* ignore tracking failures */
    }
  }

  window.bcTrack = trackEvent;

  trackEvent('page_view');

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-track-demo]');
    if (!link) return;
    trackEvent('demo_launch', {
      properties: { target: link.getAttribute('data-track-demo') || link.getAttribute('href') },
    });
  });
})();
