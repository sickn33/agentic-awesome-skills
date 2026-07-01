---
name: frontend-observability
description: A portable, framework-agnostic field-side observability system for any React or React Native app. Establishes one typed event taxonomy (canonical event-name constants, never inline strings), a best-effort non-blocking provider fan-out so a failing or absent analytics provider can never...
risk: unknown
source: https://github.com/stareezy-1/frontend-architecture-skill/tree/main/skills/frontend-observability
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE
---

# Frontend Observability (the field side)
## When to Use

Use this skill when you need a portable, framework-agnostic field-side observability system for any React or React Native app. Establishes one typed event taxonomy (canonical event-name constants, never inline strings), a best-effort non-blocking provider fan-out so a failing or absent analytics provider can never...


> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes a **field-side observability system** — event taxonomy, provider fan-out,
> real-user vitals, error reporting, consent — not a dashboard or a specific vendor. It is the
> **field complement to the frontend-lighthouse skill**: Lighthouse is the _lab_ gate (synthetic,
> pre-merge); this is the _field_ (what real users actually experience). It lives in a
> `services/analytics/` module per the **frontend-architecture** skill.

The goal: you can answer "what are real users doing, and what are they experiencing?" — with a
**typed event vocabulary** (no stringly-typed `track("clicked_thing")` scattered everywhere), a
fan-out that is **best-effort** (a broken provider never breaks the app), real **Core Web Vitals
from the field**, and **consent** respected before anything fires.

---

## 0. The five core ideas

1. **Events are a typed vocabulary.** Event names are canonical constants with a union type — never inline string literals. The taxonomy is reviewable in one file and the compiler rejects typos.
2. **Fan-out is best-effort and non-blocking.** `track()` dispatches to every provider, each in its own try/catch. A missing global, a thrown provider, an unloaded script — none can throw into the caller or stop the other providers.
3. **One entry point, SSR-safe.** A single `track(event, props)` is the only way to record. It's reached through a context hook that no-ops outside a provider and on the server, so instrumented components render safely anywhere.
4. **Field vitals complement lab budgets.** Real-user LCP/INP/CLS are reported to the same fan-out. Lighthouse proves the build _can_ be fast; field vitals prove it _is_ — together they close the loop.
5. **Consent gates everything.** No telemetry (events, vitals, error reports with PII) fires before opt-in. Consent state is checked at the fan-out boundary, not sprinkled through call sites.

---

## 1. Directory layout

The system is one service module plus its constants (per frontend-architecture).

```
src/
├── constants/
│   └── analytics.ts           ← canonical event names + AnalyticsEvent union
├── services/analytics/
│   ├── index.ts               ← barrel: track, adapters, types
│   ├── track.ts               ← the best-effort fan-out (single entry point)
│   ├── adapters.ts            ← one (event, props) => void per provider, window-guarded
│   ├── web-vitals.ts          ← report real-user LCP/INP/CLS into track()
│   └── consent.ts             ← consent gate read by the fan-out
├── providers/
│   └── AnalyticsProvider.tsx  ← 'use client' context exposing useAnalytics().track
└── error/
    └── ErrorBoundary.tsx      ← reports caught render errors via the fan-out
```

---

## 2. The event taxonomy (typed, never inline)

One file owns every event name. Components reference constants; the union type makes typos a compile
error and the catalog a single source of truth.

```ts
// constants/analytics.ts
export const ANALYTICS_EVENTS = {
  PROJECT_CLICK: "project_click",
  GITHUB_CLICK: "github_click",
  RESUME_DOWNLOAD: "resume_download",
  CONTACT_SUBMISSION: "contact_submission",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
```

```ts
// CORRECT — typed constant, autocompletes, can't typo
track(ANALYTICS_EVENTS.GITHUB_CLICK, { url });

// WRONG — stringly-typed, drifts, no compile check
track("github-click"); // ❌ silently a different event from "github_click"
```

**Hard rules:**

- No inline event-name strings anywhere; only `ANALYTICS_EVENTS.*`.
- Event names are snake_case and stable — renaming one breaks historical dashboards, so treat the catalog as a contract.
- Keep `props` shapes small and PII-light (see §6); prefer ids over names, never raw emails.

---

## 3. Best-effort, non-blocking fan-out

`track()` is the single entry point. It iterates the adapter registry, guarding **each** call so one
provider can't affect the caller or the others.

```ts
// services/analytics/track.ts
import type { AnalyticsEvent } from "@/constants/analytics";
import { analyticsAdapters } from "./adapters";
import { hasConsent } from "./consent";

export function track(
  event: AnalyticsEvent,
  props?: Record<string, unknown>,
): void {
  if (!hasConsent()) return; // §6 — nothing fires before opt-in
  for (const adapter of analyticsAdapters) {
    try {
      adapter(event, props);
    } catch {
      /* best-effort: a failing/absent provider must never throw into the
         caller or block dispatch to the remaining providers. */
    }
  }
}
```

Each adapter is a tiny `(event, props) => void` that **guards its provider global** — it no-ops on
the server (no `window`) and when the provider script is absent, so a missing or unloaded provider
never throws.

```ts
// services/analytics/adapters.ts
export type AnalyticsAdapter = (
  event: AnalyticsEvent,
  props?: Record<string, unknown>,
) => void;

export const googleAnalyticsAdapter: AnalyticsAdapter = (event, props) => {
  const w =
    typeof window !== "undefined" ? (window as AnalyticsGlobals) : undefined;
  if (!w || typeof w.gtag !== "function") return; // SSR-safe + absent-safe
  w.gtag("event", event, props ?? {});
};

export const clarityAdapter: AnalyticsAdapter = (event) => {
  const w =
    typeof window !== "undefined" ? (window as AnalyticsGlobals) : undefined;
  if (!w || typeof w.clarity !== "function") return;
  w.clarity("event", event);
};

// The registry track() fans out across. Exported + mutable so tests can swap
// in a recording sink to assert dispatch.
export const analyticsAdapters: AnalyticsAdapter[] = [
  googleAnalyticsAdapter,
  clarityAdapter,
  firebaseAdapter,
  // posthogAdapter, openPanelAdapter, …
];
```

### 3.1 Firebase Analytics — one adapter, two platforms

Firebase Analytics ships two SDKs that share the **same `logEvent(name, params)` contract**, so a
single conceptual adapter covers both web and React Native — only the import and the "is it
available?" guard differ. On web the adapter never imports the SDK at module top level (it's
browser-only and async), so it stays SSR-safe.

```ts
// services/analytics/adapters.firebase.web.ts — Firebase JS SDK (web)
import type { Analytics } from "firebase/analytics";
import type { AnalyticsAdapter } from "./adapters";

// Held after a lazy, browser-only init (below) so the adapter stays synchronous + SSR-safe.
let analytics: Analytics | undefined;
export function setFirebaseAnalytics(instance: Analytics): void {
  analytics = instance;
}

export const firebaseAdapter: AnalyticsAdapter = (event, props) => {
  if (typeof window === "undefined" || !analytics) return; // SSR-safe + not-yet-ready safe
  void import("firebase/analytics").then(({ logEvent }) =>
    logEvent(analytics!, event, props),
  );
};
```

```ts
// services/analytics/firebase.init.ts — lazy, browser-only init (web)
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { setFirebaseAnalytics } from "./adapters.firebase.web";
import { FIREBASE_CONFIG } from "@/constants/analytics";

export async function initFirebaseAnalytics(): Promise<void> {
  if (typeof window === "undefined") return; // never on the server
  if (!(await isSupported())) return; // unsupported browser → no-op
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  setFirebaseAnalytics(getAnalytics(app)); // adapter goes live after this
}
```

```ts
// services/analytics/adapters.firebase.native.ts — @react-native-firebase/analytics (RN / Expo)
import analytics from "@react-native-firebase/analytics";
import type { AnalyticsAdapter } from "./adapters";

export const firebaseAdapter: AnalyticsAdapter = (event, props) => {
  // RN: no window; the native module is present once the app boots.
  void analytics().logEvent(event, props);
};
```

**Same shape, two files.** Resolve the platform variant by file extension
(`adapters.firebase.native.ts` via Metro's `.native.ts` resolution, or a `Platform.OS` switch) so
the **registry, `track` fan-out, consent gate, taxonomy, and `useAnalytics` hook never change**
across platforms. Firebase's event-name rules (snake_case, lowercase, ≤ 40 chars) line up with the
taxonomy rules in §2, so the canonical `ANALYTICS_EVENTS` constants are valid Firebase event names
as-is. Gate `initFirebaseAnalytics()` on consent (§6) — Firebase also exposes
`setAnalyticsCollectionEnabled(false)` to harden the opt-out.

**Why this shape:** analytics is the _last_ thing that should crash an app. A vendor script that
fails to load, a global that isn't there yet, an adapter that throws on a malformed prop — all are
contained. The registry being exported and mutable makes dispatch unit-testable without mounting any
provider.

---

## 4. The provider + hook (SSR-safe entry)

A `'use client'` context exposes `track` through `useAnalytics()`. Outside a provider (tests,
server) it returns a **no-op**, so instrumented components never throw in isolation.

```tsx
// providers/AnalyticsProvider.tsx
"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { track as trackEvent } from "@/services/analytics";
import type { AnalyticsEvent } from "@/constants/analytics";

interface AnalyticsContextValue {
  track: (event: AnalyticsEvent, props?: Record<string, unknown>) => void;
}
const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  // track is module-level and stable → memoize once, never re-render consumers.
  const value = useMemo<AnalyticsContextValue>(
    () => ({ track: trackEvent }),
    [],
  );
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

const NOOP: AnalyticsContextValue = { track: () => undefined };
export function useAnalytics(): AnalyticsContextValue {
  return useContext(AnalyticsContext) ?? NOOP; // safe outside a provider / on server
}
```

```tsx
// a tracked leaf — Server Components can't use the hook, so wrap in a thin client component
"use client";
export function TrackedGithubLink({ href, children }: Props) {
  const { track } = useAnalytics();
  return (
    <a
      href={href}
      onClick={() => track(ANALYTICS_EVENTS.GITHUB_CLICK, { url: href })}
    >
      {children}
    </a>
  );
}
```

The provider does **no work during render** — `track` is stable and adapters guard their own
`window` access — so it's safe to mount at the root, including in SSR/RSC trees.

---

## 5. Real-user Core Web Vitals (the lab/field loop)

Report field vitals through the **same fan-out**. This is the complement to the lighthouse skill:
the lab gate sets the budget; the field tells you whether real users hit it.

```ts
// services/analytics/web-vitals.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";
import { track } from "./track";

export function reportWebVitals(): void {
  const send = (m: Metric) =>
    track("web_vital" as AnalyticsEvent, {
      name: m.name, // LCP | INP | CLS | FCP | TTFB
      value: Math.round(m.name === "CLS" ? m.value * 1000 : m.value),
      rating: m.rating, // good | needs-improvement | poor
      id: m.id,
    });
  onLCP(send);
  onINP(send);
  onCLS(send);
  onFCP(send);
  onTTFB(send);
}
```

- Call `reportWebVitals()` once on the client (e.g. in the analytics provider's effect, or Next.js `useReportWebVitals`).
- Use the **same metrics and thresholds** as the lighthouse skill (LCP ≤ 2500, INP ≤ 200, CLS ≤ 0.1) so lab and field speak the same language.
- Lab budget green + field "poor" = a gap between your test conditions and real devices/networks — exactly what field RUM exists to reveal.

---

## 6. Consent and privacy gating

Telemetry fires only after opt-in, checked **once at the fan-out boundary** (§3) — not duplicated at
every call site.

```ts
// services/analytics/consent.ts
let granted = false; // hydrate from a stored consent cookie/localStorage on init
export function setConsent(value: boolean): void {
  granted = value;
}
export function hasConsent(): boolean {
  return granted;
}
```

**Hard rules:**

- `track()` early-returns when consent is absent — no events, no vitals, no error PII before opt-in.
- Keep `props` PII-light: ids and enums, not emails/names/free text. Treat anything user-entered as sensitive.
- Respect "Do Not Track" / regional regimes (GDPR/CCPA) by defaulting consent to `false` where required.
- Error reports must scrub PII before leaving the device.

---

## 7. Error reporting at boundaries

Caught render errors and unhandled rejections go through the same fan-out (or a dedicated Sentry
adapter), at **deliberate boundaries** — not a global swallow.

```tsx
// error/ErrorBoundary.tsx (essence)
componentDidCatch(error: Error, info: ErrorInfo) {
  track("client_error" as AnalyticsEvent, {
    message: error.message, component: info.componentStack?.split("\n")[1]?.trim(),
  }); // or sentryAdapter(error, info)
}
```

- Place boundaries at route/segment level (per the frontend-architecture page-directory model), so a crash degrades one surface, not the app.
- Pair with the data layer's typed `ApiError` (frontend-data-contracts §6): report _unexpected_ errors; expected ones (validation, 404) are handled, not reported as crashes.

---

## 8. Provider & framework adapters

The taxonomy + fan-out are constant; each provider is one window-guarded adapter.

| Provider               | Adapter call                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Firebase (web)**     | `logEvent(analytics, name, props)` (`firebase/analytics`, lazy browser init) |
| **Firebase (RN/Expo)** | `analytics().logEvent(name, props)` (`@react-native-firebase/analytics`)     |
| **GA4**                | `window.gtag("event", name, props)`                                          |
| **Microsoft Clarity**  | `window.clarity("event", name)`                                              |
| **PostHog**            | `window.posthog?.capture(name, props)`                                       |
| **OpenPanel**          | `op("track", name, props)` or `op.track(name, props)`                        |
| **Sentry**             | `Sentry.captureException(error)` (error adapter)                             |

| Framework                | Wiring                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js**              | `AnalyticsProvider` in the root layout (client boundary); call `initFirebaseAnalytics()` in a client effect; vitals via `useReportWebVitals`.                                                                                                                                                                                                                 |
| **React + Vite / Remix** | provider at app root; `initFirebaseAnalytics()` + `reportWebVitals()` in a top-level effect.                                                                                                                                                                                                                                                                  |
| **Expo / React Native**  | swap the web-vitals source for RN performance APIs and the web provider scripts for native SDKs (**`@react-native-firebase/analytics`**, Amplitude, PostHog-RN); the **taxonomy, `track` fan-out, consent gate, and `useAnalytics` hook are unchanged**. The Firebase adapter is the same shape — it guards the native module instead of `window` (see §3.1). |

---

## 9. Conventions checklist (enforce in review)

- [ ] Event names are canonical constants with a union type — zero inline event strings.
- [ ] `track()` is the single entry point; reached via `useAnalytics()` (no-op outside a provider/SSR).
- [ ] Every adapter guards its provider global and no-ops when absent or on the server.
- [ ] Each adapter call is individually try/caught — one provider can't break the app or the others.
- [ ] Consent is checked once at the fan-out; nothing fires before opt-in.
- [ ] `props` are PII-light (ids/enums, not emails/names); error reports scrub PII.
- [ ] Real-user Web Vitals report through the same fan-out, using the lighthouse skill's metrics/thresholds.
- [ ] Error boundaries are placed per route/segment and report unexpected errors only.
- [ ] The provider does no render-time work; the context value is memoized/stable.
- [ ] Mutating the adapter registry (tests) is the dispatch-observation seam — no real provider mounted in tests.

---

## 10. How to apply this skill

**Adding analytics to a project:** create `constants/analytics.ts` (taxonomy), `services/analytics/`
(track + adapters + consent), and `AnalyticsProvider`. Mount the provider at the root; wrap tracked
leaves in thin client components.

**Adding an event:** add a constant to `ANALYTICS_EVENTS`, then `track(ANALYTICS_EVENTS.NEW_ONE, props)`
at the interaction. Never inline the string.

**Wiring Firebase Analytics (web + RN):** add a `firebaseAdapter` to the registry using the
platform-resolved files in §3.1 (`firebase/analytics` on web behind a lazy browser-only
`initFirebaseAnalytics()`; `@react-native-firebase/analytics` on native). Gate init on consent. The
taxonomy and fan-out are untouched — Firebase is just one more entry in `analyticsAdapters`.

**Closing the lab/field loop:** wire `reportWebVitals()` and compare field ratings against the
lighthouse skill's budgets; investigate any "lab green / field poor" gap.

**Reviewing observability:** run the checklist in §9. The highest-value catches are inline event
strings (taxonomy drift), an un-guarded adapter (a provider that can crash the app), and telemetry
firing before consent.

---

## Publishing / installing this skill

This skill follows the Anthropic `SKILL.md` format and is portable across agents.

1. Keep it under `skills/frontend-observability/SKILL.md` in a public GitHub repo.
2. Keep the frontmatter `name` and high-signal `description` — discovery indexes match against it.
3. Install with: `npx skills add <org>/<repo> --skill "frontend-observability"`.
4. Non-`SKILL.md` agents can be pointed here from `AGENTS.md` / `CLAUDE.md`; Kiro can mirror it as a steering file.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
