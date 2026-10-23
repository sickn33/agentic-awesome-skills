---
id: cache-components-suspense-dedupe-pitfall
title: Cache Components Suspense dedupe pitfall
status: active
candidateKinds: ["cache_components_suspense_dedupe"]
frameworks: ["next@>=16.0.0"]
scannerPatterns: ["cache-components-suspense-dedupe"]
priority: 87
citations: ["https://nextjs.org/docs/app/api-reference/directives/use-cache", "https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents", "https://nextjs.org/docs/app/guides/migrating-to-cache-components"]
maxBriefChars: 900
---

## Investigation Brief
Separate `<Suspense>` boundaries can expose cache-scope differences. Repeated source calls alone do not prove duplicate origin work or ISR writes.

## Evidence To Check
Confirm the scanner finding's repeated fetch URL or helper name. Verify the call sites are within the same route segment and inside distinct `<Suspense>` boundaries, then confirm duplicate origin execution with traces. Cross-reference `fnDurationP95ByRoute` and `isrWritesByRoute` for the owning route.

## Do Not Recommend When
Skip if the repeated call is intentional (different parameters, different intent). Skip if the duplicate is in a single component body where in-request memoization already applies.

## Verification
Name the duplicated call, count, and either: (a) the page-level promise to hoist or (b) the function to move to `'use cache: remote'`.
