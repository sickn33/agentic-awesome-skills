---
id: build-minutes-monorepo-fanout
title: Build Minutes monorepo fanout
status: active
candidateKinds: ["build_minutes_fanout"]
frameworks: ["*"]
scannerPatterns: ["turbo-force-bypass"]
priority: 90
citations: ["https://vercel.com/docs/monorepos", "https://vercel.com/docs/builds", "https://turborepo.dev/docs/crafting-your-repository/caching"]
maxBriefChars: 900
---

## Investigation Brief
Build Minutes climbs when commits rebuild unchanged work. Common causes: `TURBO_FORCE`, `cache: false`, missing outputs, or disabled build-skip settings.

## Evidence To Check
Confirm Build Minutes share and scanner subtype. Inspect `package.json`, `turbo.json`, outputs, `.gitignore`, `vercel.json`, and project settings. If `build` runs migrations, split them into an uncached step before recommending Turbo build caching.

## Do Not Recommend When
Skip under 5% bill share with no scanner finding. Skip single-project repos and intentional CI-only force flags. Do not recommend `ignoreCommand` from repo grep alone; dashboard-only skip-unaffected may be better.

## Verification
Name the offending file and pattern. Recommend only the verified fix: cache a pure build task, add generated `outputs`, enable skip-unaffected builds, or add `ignoreCommand` only when needed.
