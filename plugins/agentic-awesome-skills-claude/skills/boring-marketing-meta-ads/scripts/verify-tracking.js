/**
 * Paste into the browser console ON THE DEPLOYED SITE, not localhost, which
 * usually sends no CSP and so passes while production has been broken for weeks.
 *
 * An agent driving a browser can run this via its JavaScript evaluation tool
 * and read the returned object.
 *
 * What this can and cannot see:
 *   CAN : whether fbevents.js actually loaded past the inline stub
 *   CAN : whether the pixel initialised and which id
 *   CAN : the first-party cookies your server needs forwarded
 *   CANNOT: whether an event was delivered. fbq uses navigator.sendBeacon when
 *            an eventID is present, and sendBeacon is invisible to both resource
 *            timing and the devtools Network panel. Use Meta's Test Events for
 *            delivery. See references/tracking.md.
 */
(() => {
  const cookie = (n) => document.cookie.match(new RegExp('(^|; )' + n + '=([^;]*)'))?.[2] || null;

  const present = typeof window.fbq === 'function';
  // fbq.loaded and fbq.version are set by the INLINE STUB and are true even when
  // fbevents.js was blocked. callMethod only exists on the real library.
  const real = present && typeof window.fbq.callMethod === 'function';
  const queued = present && Array.isArray(window.fbq.queue) ? window.fbq.queue.length : null;

  const out = {
    pixel_snippet_present: present,
    fbevents_js_loaded: real,
    queued_events: queued,
    pixel_ids: present && window.fbq.getState
      ? (window.fbq.getState().pixels || []).map((p) => p.id)
      : '(unknown: check fbq("init", ...) in source)',
    fbp: cookie('_fbp'),
    fbc: cookie('_fbc'),
    verdict: !present
      ? 'FAIL: no pixel snippet on this page'
      : !real
        ? 'FAIL: fbevents.js blocked (CSP, ad blocker, or network). fbq is the stub: '
          + 'it queues events and sends nothing, forever. Allow connect.facebook.net '
          + 'in script-src and www.facebook.com in connect-src.'
        : 'OK: real library loaded. Delivery must still be confirmed in Test Events.',
  };

  if (real && !out.fbp) {
    out.warning = '_fbp cookie missing: server-side CAPI events will match far fewer people. '
      + 'Read it in the browser and forward it to your server.';
  }

  console.table(out);
  return out;
})();
