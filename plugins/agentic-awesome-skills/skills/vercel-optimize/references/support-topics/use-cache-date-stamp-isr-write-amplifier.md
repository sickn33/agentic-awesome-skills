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
`'use cache'` keys include function/build identity and serialized inputs, not its returned output. A timestamp or random value can make regenerated output change; it does not itself prove a cache miss or excessive ISR writes. Verify the invalidation mechanism and measured writes.

## Evidence To Check
Check the scanner finding's `subtype`: `module-scope` (module-level date) or `in-cache-fn` (inside the cached body). Cross-reference `isrWritesByRoute` — a stable write rate against low reads is the symptom.

## Do Not Recommend When
Skip if the date is inside `useEffect`/`useCallback`/`useMemo`. Skip if `'use cache'` is only a comment. Skip if the date is the intended cache key.

## Verification
Name the file, primitive call, measured regeneration cause, and any replacement that preserves freshness, hydration and product semantics.
