---
name: expo-observe
description: Use for anything related to EAS Observe — adding `expo-observe` to an Expo project (AppMetricsRoot/ObserveRoot HOC, markInteractive, the useObserve hook, and the Expo Router / React Navigation integrations for per-route metrics), querying via the EAS CLI (`eas observe:metrics-summary`,...
risk: unknown
source: https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-observe
source_repo: expo/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/expo/skills/blob/main/LICENSE
---

# EAS Observe
## When to Use

Use this skill when you need use for anything related to EAS Observe — adding `expo-observe` to an Expo project (AppMetricsRoot/ObserveRoot HOC, markInteractive, the useObserve hook, and the Expo Router / React Navigation integrations for per-route metrics), querying via the EAS CLI (`eas observe:metrics-summary`,...


EAS Observe tracks startup, navigation, and custom-event performance from production Expo apps.

> **Source of truth:** https://docs.expo.dev/eas/observe/ — always consult the canonical docs when API details matter, especially get-started, configuration, integrations, and the metrics reference. EAS Observe is evolving; this skill's references are written to stay accurate but may lag the docs.

## Which reference to read

The three reference files in `./references/` cover the three things people typically need this skill for:

- **Adding EAS Observe to a project** → [`./references/setup.md`](./references/setup.md). Install, wrap the root layout (`AppMetricsRoot` on SDK 55, `ObserveRoot` on SDK 56+), call `markInteractive()` (global on SDK 55, via the `useObserve()` hook on SDK 56+), and optional per-route navigation metrics through the Expo Router / React Navigation integrations.
- **Querying metrics from the terminal** → [`./references/queries.md`](./references/queries.md). The five `eas observe:*` commands — `metrics-summary`, `metrics`, `routes`, `events`, `versions` — with flags, table layouts, JSON shapes, and common workflows.
- **Reading a dashboard or CLI output** → [`./references/metrics.md`](./references/metrics.md). Target thresholds per metric, what the TTI `frameRate.*` params mean, and diagnostic patterns for telling slow-but-smooth startup apart from main-thread contention or hard blocks.

## Quick links to the docs

- Get started: https://docs.expo.dev/eas/observe/get-started/
- Dashboard guide: https://docs.expo.dev/eas/observe/dashboard/
- Metrics reference: https://docs.expo.dev/eas/observe/reference/metrics/
- Expo Router integration: https://docs.expo.dev/eas/observe/integrations/expo-router/
- React Navigation integration: https://docs.expo.dev/eas/observe/integrations/react-navigation/
- Configuration: https://docs.expo.dev/eas/observe/configuration/

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
