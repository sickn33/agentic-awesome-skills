# Consent that controls the network

1. [Define the purposes](#define-the-purposes)
2. [Share one consent module](#share-one-consent-module)
3. [Wire a vanilla page](#wire-a-vanilla-page)
4. [Wire a React or Next.js page](#wire-a-react-or-nextjs-page)
5. [Verify the network](#verify-the-network)

## Define the purposes

Inventory scripts, pixels, noscript fallbacks, embeds, remote thumbnails, CSS, preload/preconnect hints and server-side events. Serve essential assets locally. For each optional purpose, identify the recipient, explain the operation, link the privacy notice, and start with the switch off. Keep “Accept all” and “Reject all” together with equal styling. Keep settings available after refusal. A strictly necessary exemption needs a documented purpose. This skill uses a conservative default for third parties. [CNIL guidance](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite)

The examples share three independent grants. Each embed also needs a click. The analytics adapter illustrates one GA4 property. Replace its example property ID, inventory the vendor's cookies and implement deletion for the cookie paths/domains your deployment actually uses. Explain retention and transfers using the operator's actual configuration. Capture evidence of the notice version and choice under the operator's accountability process.

## Share one consent module

Save as `consent.js` in the application. The only data stored by the manager are the purpose flags, expiry and notice version (in the key). Change the version when the notice or vendors change. Six months is an example duration for both acceptance and refusal. Use the same duration and visibility rules for either decision. [CNIL guidance on keeping choices](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite)

```js
const key = 'privacy-choice-v1';
export const purposes = {
  analytics: 'Measure page visits with Google Analytics',
  video: 'Allow YouTube to receive data when playing videos',
  maps: 'Allow Google Maps to receive data when displaying maps',
};
export const flags = value => Object.fromEntries(
  Object.keys(purposes).map(purpose => [purpose, value === true])
);
const maxAge = 180 * 24 * 60 * 60 * 1000;
const property = 'G-EXAMPLE123';
let timer;
let active = false;
let memory;
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(key);
    return memory ?? JSON.parse(raw);
  } catch { return memory; }
}

export function choices() {
  const record = read();
  if (!record || !Number.isFinite(record.until) || record.until <= Date.now()) {
    return flags(false);
  }
  return Object.fromEntries(Object.keys(purposes).map(p => [p, record[p] === true]));
}

export function save(next) {
  const record = { ...flags(false), until: Date.now() + maxAge };
  for (const p of Object.keys(purposes)) record[p] = next[p] === true;
  try {
    localStorage.setItem(key, JSON.stringify(record));
    memory = undefined;
  } catch { memory = record; } // Keep the choice in this document if storage is unavailable.
  refresh();
}

function refresh() {
  const state = choices();
  // Disable this property synchronously on withdrawal, even if its script is in flight.
  window['ga-disable-' + property] = !state.analytics;
  if (state.analytics && !active) {
    const inert = document.querySelector('script[type="text/plain"][data-analytics-src]');
    if (inert) {
      active = true;
      window.dataLayer ??= [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', property);
      const live = document.createElement('script');
      live.async = true;
      live.src = inert.dataset.analyticsSrc; // Developer-owned constant, never user input.
      document.head.append(live);
    }
  }
  // Add vendor-specific opt-out and cookie cleanup here if the deployment requires it.
  for (const listener of listeners) listener(state);
  clearTimeout(timer);
  const remaining = (read()?.until ?? 0) - Date.now();
  if (remaining > 0) timer = setTimeout(refresh, Math.min(remaining, 2147483647));
}

export function subscribe(listener) {
  listeners.add(listener);
  refresh();
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { memory = undefined; refresh(); }
  });
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}

export const embeds = {
  video: { title: 'YouTube video', url: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE' },
  maps: { title: 'Google Maps location', url: 'https://www.google.com/maps?q=Paris&output=embed' },
};
```

Only initialize vendors for a granted purpose. Route application-generated analytics through the same gate, including server-bound events. Each additional vendor needs its own tested shutdown behavior. Removing a script element alone leaves executed code alive.

## Wire a vanilla page

Keep this settings section available from the shared footer. Both action buttons inherit the same style. The only analytics URL in initial markup is inert metadata. Even a browser that skips JavaScript can read the page without contacting the vendors.

```html
<script type="text/plain" data-analytics-src="https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE123"></script>
<section id="privacy" aria-labelledby="privacy-title">
  <h2 id="privacy-title">Privacy settings</h2>
  <p>Choose which services may receive data from this page. <a href="/privacy">Privacy policy</a></p>
  <form id="choices">
    <fieldset><legend>Optional services</legend><div id="purposes"></div></fieldset>
    <button type="button" id="reject">Reject all</button>
    <button type="button" id="accept">Accept all</button>
    <button>Save choices</button>
  </form>
  <p role="status" id="feedback"></p>
</section>
<div id="media"></div>
<footer><a href="#privacy">Privacy settings</a></footer>
<script type="module">
  import { choices, embeds, flags, purposes, save, subscribe } from './consent.js';
  const form = document.querySelector('#choices');
  for (const [key, text] of Object.entries(purposes)) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'allow-' + key;
    input.name = key;
    const label = document.createElement('label');
    label.append(input, ' ' + text);
    document.querySelector('#purposes').append(label);
  }
  function commit(next) {
    save(next);
    document.querySelector('#feedback').textContent = 'Privacy choices updated.';
  }
  document.querySelector('#accept').onclick = () => commit(flags(true));
  document.querySelector('#reject').onclick = () => commit(flags(false));
  form.onsubmit = event => {
    event.preventDefault();
    commit(Object.fromEntries(Object.keys(purposes).map(p => [p, form.elements[p].checked])));
  };
  subscribe(state => {
    for (const p of Object.keys(purposes)) form.elements[p].checked = state[p];
  });
  for (const [p, embed] of Object.entries(embeds)) {
    const slot = document.createElement('div');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Load ' + embed.title;
    button.onclick = () => {
      if (!choices()[p]) return;
      const frame = document.createElement('iframe');
      frame.title = embed.title;
      frame.src = embed.url;
      slot.replaceChildren(frame);
    };
    document.querySelector('#media').append(slot);
    slot.append(button);
    subscribe(state => {
      button.disabled = !state[p];
      if (!state[p]) slot.replaceChildren(button);
    });
  }
</script>
```

## Wire a React or Next.js page

Mount this client component once in the shared layout. Render denied defaults on the server and on the first client render. The effect restores stored choices after hydration. Both iframes are absent until the appropriate grant and a click. The shared adapter deduplicates analytics under Strict Mode.

```jsx
'use client';
import { useEffect, useState } from 'react';
import { choices, embeds, flags, purposes, save, subscribe } from './consent.js';

export default function PrivacySettings() {
  const [grants, setGrants] = useState(() => flags(false));
  const [draft, setDraft] = useState(() => flags(false));
  const [opened, setOpened] = useState({});
  const [feedback, setFeedback] = useState('');
  useEffect(() => subscribe(state => {
    setGrants(state);
    setDraft(state);
    setOpened(previous => ({
      video: previous.video && state.video,
      maps: previous.maps && state.maps,
    }));
  }), []);
  function commit(next) {
    save(next);
    setFeedback('Privacy choices updated.');
  }
  return <>
    <script type="text/plain" data-analytics-src="https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE123" />
    <section id="privacy" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy settings</h2>
      <p>Choose which services may receive data from this page. <a href="/privacy">Privacy policy</a></p>
      <fieldset>
        <legend>Optional services</legend>
        {Object.entries(purposes).map(([p, text]) =>
          <label key={p}><input id={'allow-' + p} type="checkbox" checked={draft[p]}
            onChange={e => setDraft({ ...draft, [p]: e.target.checked })} /> {text}</label>
        )}
      </fieldset>
      <button type="button" onClick={() => commit(flags(false))}>Reject all</button>
      <button type="button" onClick={() => commit(flags(true))}>Accept all</button>
      <button type="button" onClick={() => commit(draft)}>Save choices</button>
      <p role="status">{feedback}</p>
    </section>
    {Object.entries(embeds).map(([p, embed]) => grants[p] && opened[p]
      ? <iframe key={p} title={embed.title} src={embed.url} />
      : <button key={p} type="button" disabled={!grants[p]}
          onClick={() => { if (choices()[p]) setOpened(old => ({ ...old, [p]: true })); }}>
          Load {embed.title}
        </button>)}
  </>;
}
```

Add `<a href="#privacy">Privacy settings</a>` to the shared footer. If embeds live on other routes, subscribe there and place their controls next to the relevant content. Provide an accessible text alternative such as a transcript or street address.

## Verify the network

| Fresh-browser action | Expected observation |
| --- | --- |
| Load and scroll before any choice | No optional request, cookie, vendor connection, thumbnail or tracking pixel, including on hydration. |
| Reject all, navigate and reload | Refusal persists. Core tasks work. No optional request. |
| Grant only video | Analytics and Maps stay silent. YouTube loads only after “Load YouTube video”. |
| Enable analytics and navigate | Only the configured measurement vendor runs. Check its configuration and actual payloads. |
| Withdraw, then navigate, interact and reload | Active frames disappear and optional measurement stops. Verify cookie cleanup and repeat in another open tab. |
| Expire the record or change the notice version | The next use starts from denied defaults until a fresh explicit choice. |

Check the Network panel with “Preserve log” and inspect browser storage. Exercise a cold server response, SPA route changes, back/forward navigation, mobile layout and keyboard-only refusal. Record the observed hosts and grant state.
