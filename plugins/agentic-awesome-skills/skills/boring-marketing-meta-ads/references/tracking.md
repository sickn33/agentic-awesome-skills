# Conversion tracking, and proving it works

Most "the pixel is broken" investigations are actually broken *measurement of*
the pixel. Set it up correctly, then verify with an instrument that can see the
thing you're asking about.

## Architecture: two paths, one event id

```
Browser  ──fbq('track','Lead',{...},{eventID: X})──►  Meta
Server   ──POST /[PIXEL_ID]/events  event_id: X   ──►  Meta
                                                        └─ deduped into ONE conversion
```

The server path exists because ad blockers and tracking prevention drop the
browser path for roughly a third of an audience. Sending both and deduplicating
recovers those conversions without double-counting.

**Deduplication requires the same `event_id` and the same `event_name` on both
sides, within 48 hours.** Meta keeps the first one it receives and discards the
duplicate. Generate the id once in the browser and pass it to your server.

## Browser side

```html
<script>
!function(f,b,e,v,n,t,s){/* standard Meta snippet */}(...);
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
```

Then at the conversion moment:

```js
const evId = crypto.randomUUID();

fbq('track', 'Lead', { content_name: 'contact-form' }, { eventID: evId });

await fetch('/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...formData,
    meta: {
      event_id: evId,
      event_source_url: window.location.href,
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc'),
    },
  }),
});
```

**`_fbp` and `_fbc` must be read in the browser and forwarded.** They are
first-party cookies on your domain. A server running anywhere else (a
serverless function on another host, a different subdomain, a third-party
backend) never receives them, and without them server events match far fewer
people. `_fbc` only exists when the visitor arrived with an `fbclid` parameter.

## Server side (Conversions API)

```js
const res = await fetch(`https://graph.facebook.com/v26.0/${PIXEL_ID}/events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    access_token: CAPI_TOKEN,
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: meta.event_id,             // the dedupe key
      event_source_url: meta.event_source_url,
      action_source: 'website',
      user_data: {
        em: [sha256(email.trim().toLowerCase())],
        ph: [sha256(phoneE164)],
        client_ip_address: ip,
        client_user_agent: userAgent,
        fbp: meta.fbp,
        fbc: meta.fbc,
      },
    }],
  }),
});
```

**Hash `em` and `ph` with SHA-256, lowercased and trimmed**, phone in E.164
without the `+`. `fbp`, `fbc`, `client_ip_address`, and `client_user_agent` are
sent raw. Hashing them breaks matching.

More `user_data` fields means better match quality. Meta scores this per event
source; below about 5.0 the server path contributes little.

## Make the server report its own result

A CAPI call must never fail the user's action. Losing an attribution event is
not worth failing a form submission. That correct design also means it can rot
silently for months. So return the outcome:

```js
const capi = await sendCapi(payload).catch(e => ({ ok: false, error: e.message }));

return json({
  success: true,
  id: record.id,
  meta_capi: capi.ok ? `sent:${capi.events_received}` : `failed:${capi.error}`,
});
```

One `curl` then proves the entire server path in isolation, with no browser and
no ad blocker in the picture. This is the check that settles arguments.

## Verifying: what each instrument can actually see

| Instrument | Sees | Blind to |
|---|---|---|
| Meta **Test Events** | browser events live; server events **only with `test_event_code`** | server events without that code |
| Events Manager **Overview** | volume and match quality, 20-min delay | anything just now |
| Browser devtools **Network** | XHR/fetch to facebook.com | **`sendBeacon`**, which fbevents uses whenever an `eventID` is present |
| `performance.getEntriesByType('resource')` | resource-timed requests | **`sendBeacon`**, same blind spot |
| Server response `meta_capi` field | exactly what the server sent and got back | anything browser-side |
| Meta **Pixel Helper** extension | pixel presence, event fires, param warnings | server events |

**Three false negatives came out of this table's right-hand column.** Before
concluding an event doesn't fire, check that your instrument could see it if it
did.

## Verifying the library actually loaded

```js
typeof window.fbq.callMethod === 'function'   // true = real fbevents.js loaded
window.fbq.queue.length                        // >0 and growing = still the stub
```

`fbq.loaded` and `fbq.version` are set by the **inline stub** and are true even
when `fbevents.js` was blocked. They prove nothing.

## CSP

A Content-Security-Policy that omits these kills the pixel with no visible error.
`fbq` stays the stub, queues events, and sends nothing forever:

```
script-src   https://connect.facebook.net
connect-src  https://www.facebook.com  https://connect.facebook.net
frame-src    https://www.facebook.com
```

**Verify on the deployed site.** Localhost typically sends no CSP at all, so a
localhost test passes while production has been silently broken for weeks.

## Choosing the event to optimize for

**Fire events on what you mean.** A `Schedule` fired when a booking calendar
*renders* means "someone saw a calendar". Optimizing toward it trains Meta to
find people who arrive and leave. Use the embed's success callback for the real
event and make the render a separate custom event.

**Optimize for volume, measure on truth.** Meta needs ~50 conversions per week
per ad set to exit the learning phase. Below that, delivery is erratic and CPA
readings are noise. If the true outcome is rarer than 50/week, bid on the
higher-volume upstream event (`Lead` rather than `Purchase`) and keep the real
one for reporting.

Consider passing a **modelled value** on the conversion (`value` and `currency`
on the event), so value-based bidding can distinguish a qualified lead from a
tire-kicker rather than treating every form fill as identical.

## Automatic event detection

Meta can detect button clicks and form activity on its own and turn them into events
(`Subscribe` and `Contact` are common). Those invented events then appear in reporting
and can be picked up for optimization. Turn it off: Events Manager → pixel → Settings →
the toggle for automatically detected events. The setting's name and place move between
Events Manager versions.

Automatic Advanced Matching is a different setting. It hashes form fields such as email
and phone to improve matching, so leave it on unless the site's privacy policy rules it
out.

## Cleanup

Test conversions land in your production dataset and in your database. Delete
the test records afterwards, and remember that Meta's copy of a test event
cannot be deleted. It just ages out of the attribution window.
