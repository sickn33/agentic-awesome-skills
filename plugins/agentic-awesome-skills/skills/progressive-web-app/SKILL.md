---
name: progressive-web-app
description: "Build Progressive Web Apps (PWAs) with offline support, installability, and caching strategies. Trigger whenever the user mentions PWA, service workers, web app manifests, Workbox, 'add to home screen', or wants their web app to work offline, feel native, or be installable."
risk: safe
source: community
date_added: "2026-03-17"
tags: [pwa, web-dev, service-worker, frontend, offline, caching]
tools: [gemini, cursor, claude]
---

# Progressive Web Apps (PWAs)

## Overview

A Progressive Web App is a web application that uses modern browser capabilities to deliver a fast, reliable, and installable experience — even on unreliable networks. The three required pillars are:

1. **HTTPS** — Required in production for service workers to register (localhost is exempt for development).
2. **Web App Manifest** (`manifest.json`) — Makes the app installable and defines its appearance on device home screens.
3. **Service Worker** (`sw.js`) — A background script that intercepts network requests, manages caches, and enables offline functionality.

## When to Use This Skill

- Use when the user wants their web app to work offline or on unreliable networks.
- Use when building a mobile-first web project where users should be able to install the app to their home screen.
- Use when the user asks about caching strategies, service workers, or improving web app performance and resilience.
- Use when the user mentions Workbox, web app manifests, background sync, or push notifications for the web.
- Use when the user asks "can my website be installed like an app?" or "how do I make my site work offline?" — even if they don't use the word PWA.

## Deliverables Checklist

Every PWA implementation must include these files at minimum:

- [ ] `index.html` — Links manifest, registers service worker
- [ ] `manifest.json` — Full app metadata and icon set
- [ ] `sw.js` — Service worker with install, activate, and fetch handlers
- [ ] `app.js` — Main app logic with SW registration and install prompt handling
- [ ] `offline.html` — Fallback page shown when navigation fails offline (required — missing file will cause install to fail)

---

## Step 1: Web App Manifest (`manifest.json`)

Defines how the app appears when installed. Must be linked from `<head>` via `<link rel="manifest">`.

```json
{
  "name": "My Awesome PWA",
  "short_name": "MyPWA",
  "description": "A fast, offline-capable Progressive Web App.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#0055ff",
  "icons": [
    {
      "src": "/assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/assets/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

**Key fields:**
- `display`: `standalone` hides browser UI; `minimal-ui` shows minimal controls; `browser` is standard tab.
- `purpose: "maskable"` on icons enables adaptive icons on Android (safe zone matters — keep content in center 80%).
- `screenshots` is optional but required for Chrome's enhanced install dialog on desktop.

---

## Step 2: HTML Shell (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Awesome PWA</title>

  <!-- PWA manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- Theme color for browser chrome -->
  <meta name="theme-color" content="#0055ff">

  <!-- iOS-specific (Safari doesn't fully use manifest) -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="MyPWA">
  <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">

  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="app">
    <header><h1>My PWA</h1></header>
    <main id="content">Loading...</main>
    <!-- Optional: install button, hidden by default -->
    <button id="install-btn" hidden>Install App</button>
  </div>
  <script src="/app.js"></script>
</body>
</html>
```

---

## Step 3: Service Worker Registration & Install Prompt (`app.js`)

```javascript
// ─── Service Worker Registration ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[App] SW registered, scope:', registration.scope);
    } catch (err) {
      console.error('[App] SW registration failed:', err);
    }
  });
}

// ─── Install Prompt (Add to Home Screen) ───────────────────────────────────
let deferredPrompt;
const installBtn = document.getElementById('install-btn'); // may be null if omitted

// Capture the browser's install prompt — it fires before the browser's own UI
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Stop automatic mini-infobar on mobile
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false; // Show your custom install button
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[App] Install outcome:', outcome);
    deferredPrompt = null;
    installBtn.hidden = true;
  });
}
// Fires when the app is installed (via browser or your button)
window.addEventListener('appinstalled', () => {
  console.log('[App] PWA installed successfully');
  installBtn.hidden = true;
});
```

---

## Step 4: Service Worker (`sw.js`)

### Cache Versioning (critical — always increment on deploy)

```javascript
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Files to pre-cache during install (the "App Shell")
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/assets/icons/icon-192x192.png',
  '/offline.html', // Fallback page shown when network is unavailable
];
```

### Install — Pre-cache the App Shell

```javascript
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});
```

### Activate — Clean Up Old Caches

```javascript
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});
```

### Fetch — Caching Strategies

Choose the right strategy per resource type:

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our own origin
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Strategy A: Cache-First (for static assets — fast, tolerates stale)
  if (url.pathname.match(/\.(css|js|png|jpg|svg|woff2)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy B: Network-First (for HTML pages — fresh, falls back to cache)
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy C: Stale-While-Revalidate (for API data — fast and eventually fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ─── Strategy Implementations ──────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    // Nothing useful to fall back to for assets
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}
```

---

## Edge Cases & Platform Notes

### iOS / Safari Quirks
- Safari supports manifests and service workers but **does not support `beforeinstallprompt`** — users must install via the Share → "Add to Home Screen" menu manually.
- Use the `apple-mobile-web-app-*` meta tags (shown in `index.html` above) for proper iOS integration.
- Safari may clear service worker caches after ~7 days of inactivity (Intelligent Tracking Prevention).

### HTTPS Requirement
- Service workers only register on `https://` origins. `http://localhost` is the only exception for development.
- Use a tool like `mkcert` or `ngrok` if you need HTTPS locally with a custom hostname.

### Cache-Busting on Deploy
- Always increment `CACHE_VERSION` in `sw.js` when deploying new assets. This ensures activate clears old caches and users get fresh files.
- A common pattern is to inject the version automatically via your build tool (e.g., Vite, Webpack).

### Opaque Responses (cross-origin requests)
- Requests to external origins (e.g., CDN fonts, third-party APIs) return "opaque" responses that cannot be inspected. Cache them with caution — a failed opaque response still gets a `200` status.
- Prefer `staleWhileRevalidate` for cross-origin resources, or use a library like Workbox which handles this safely.

---

## Workbox (Optional: Production Shortcut)

For production apps, consider [Workbox](https://developer.chrome.com/docs/workbox) (Google's PWA library) instead of hand-rolling strategies. It handles edge cases, cache expiry, and versioning automatically.

```javascript
// With Workbox (via CDN for simplicity — use npm + bundler in production)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { precacheAndRoute } = workbox.precaching;

precacheAndRoute(self.__WB_MANIFEST || []); // Injected by build plugin

registerRoute(({ request }) => request.destination === 'image', new CacheFirst());
registerRoute(({ request }) => request.mode === 'navigate', new NetworkFirst());
registerRoute(({ request }) => request.destination === 'script', new StaleWhileRevalidate());
```

---

## Checklist Before Shipping

- [ ] Site is served over HTTPS
- [ ] `manifest.json` has `name`, `short_name`, `start_url`, `display`, `icons` (192 + 512)
- [ ] Icons have `purpose: "any maskable"`
- [ ] `sw.js` registers without errors in DevTools → Application → Service Workers
- [ ] App shell loads from cache when network is throttled to "Offline" in DevTools
- [ ] `offline.html` fallback is cached and served when navigation fails offline
- [ ] Lighthouse PWA audit passes (Chrome DevTools → Lighthouse tab)
- [ ] Tested on iOS Safari (manual install flow) and Android Chrome (install prompt)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
