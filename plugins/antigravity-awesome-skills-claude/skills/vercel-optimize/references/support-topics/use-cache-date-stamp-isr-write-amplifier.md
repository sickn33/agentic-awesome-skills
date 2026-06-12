---
id: use-cache-date-stamp-isr-write-amplifier
title: "'use cache' date-stamp ISR write amplifier"
status: active
candidateKinds: ["use_cache_date_stamp"]
frameworks: ["next@>=15.0.0"]
scannerPatterns: ["use-cache-date-stamp"]
priority: 88
citations: ["https://nextjs.org/docs/app/api-reference/directives/use-cache", "https://nextjs.org/docs/app/api-reference/functions/cacheLife"]
maxBriefChars: 900
---

## Investigation Brief
`'use cache'` keys on argument identity and prerender output. A `new Date()`, `Date.now()`, or `Math.random()` baked into the cached output forces a fresh ISR write on every regeneration even when the data is unchanged.

## Evidence To Check
Check the scanner finding's `subtype`: `module-scope` (module-level date) or `in-cache-fn` (inside the cached body). Cross-reference `isrWritesByRoute` — a stable write rate against low reads is the symptom.

## Do Not Recommend When
Skip if the date is inside `useEffect`/`useCallback`/`useMemo`. Skip if `'use cache'` is only a comment. Skip if the date is the intended cache key.

## Verification
Name the file, the specific primitive call, and the replacement: build-time constant or client-side `useEffect`.
