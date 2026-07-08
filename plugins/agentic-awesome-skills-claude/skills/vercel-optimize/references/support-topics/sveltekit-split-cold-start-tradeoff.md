---
id: sveltekit-split-cold-start-tradeoff
title: SvelteKit split function cold-start tradeoff
status: active
candidateKinds: ["cold_start", "slow_route"]
frameworks: ["sveltekit@*"]
priority: 82
citations: ["https://vercel.com/docs/frameworks/full-stack/sveltekit", "https://svelte.dev/docs/kit/adapter-vercel"]
maxBriefChars: 800
---

## Investigation Brief
SvelteKit bundles routes together by default to avoid excessive cold starts. Treat `split: true` as a targeted tradeoff, not a blanket optimization.

## Evidence To Check
Use cold-start share, cold-vs-warm latency, deployment concentration, and source bundle pressure. Check adapter options and whether a large dependency belongs to one route or the whole app.

## Do Not Recommend When
Do not split every route without evidence of function size pressure or route-local initialization cost. Do not split if cold starts are already the dominant problem.

## Verification
Name the cold-start signal, route or dependency that motivates the split, and the exact adapter config line.
