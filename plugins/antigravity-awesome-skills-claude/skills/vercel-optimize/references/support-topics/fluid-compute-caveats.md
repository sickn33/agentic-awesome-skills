---
id: fluid-compute-caveats
title: Fluid compute caveats
status: active
candidateKinds: ["platform_fluid_compute", "cold_start"]
frameworks: ["*"]
priority: 80
citations: ["https://vercel.com/docs/fluid-compute"]
maxBriefChars: 900
---

## Investigation Brief
Fluid compute is a project-level lever. Use it when the setting is off and metrics show cold-start or warm-instance reuse pressure. Fluid can handle multiple invocations in one function instance; avoid per-request state in module scope.

## Evidence To Check
Check project facts, `startTypeSplit`, cold-vs-warm latency, and routes carrying the cold-start share. When enabling Fluid, audit module-state hazards Fluid surfaces (not creates): module-scoped mutable state, lazy singletons holding per-user data, globals keyed on per-request inputs.

## Do Not Recommend When
Do not recommend enabling fluid compute when project facts say it is already on. Do not frame as a file-level code fix.

## Verification
State project setting, cold-start rate or fallback slow-route signal, affected route concentration. If enabling, call out module-state audit as follow-up.
