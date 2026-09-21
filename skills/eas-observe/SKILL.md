---
description: Curated upstream guidance for Eas Observe; use when the workflow matches the user goal.
name: eas-observe
version: 1.1.0
license: MIT
source_repo: expo/skills
source_type: official
source: expo
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# EAS Observe

> **EAS service - costs apply.** EAS Observe is an Expo Application Services product. The free EAS plan allows up to 10,000 monthly active users, with a limited set of features; higher usage requires a paid subscription. For details, see https://expo.dev/pricing#plan-features.

EAS Observe tracks startup, navigation, and custom-event performance from production Expo apps. It needs a development or production build — the native library is not in Expo Go.

> **Source of truth:** https://docs.expo.dev/eas/observe/ — always consult the canonical docs when API details matter, especially get-started, configuration, integrations, and the metrics reference. EAS Observe is evolving; this skill's references are written to stay accurate but may lag the docs.

## Which reference to read

The four reference files in `./references/` cover what people typically need this skill for:

- **Adding EAS Observe to a project** → [`./references/setup.md`]. Install, wrap the root layout (`AppMetricsRoot` on SDK 55, `ObserveRoot` on SDK 56+), mark the app interactive (global `markInteractive()` on SDK 55, the `useObserve()` hook or `<ObserveInteractiveMarker />` on SDK 56+), optional per-route navigation metrics through the Expo Router / React Navigation integrations, user-defined events via `Observe.logEvent` (SDK 56+), error reporting, and runtime configuration (sampling, dispatch, environments, custom endpoint).
- **Querying metrics from the terminal** → [`./references/queries.md`]. The six `eas observe:*` commands — `metrics-summary`, `metrics`, `routes`, `events`, `session`, `versions` — with flags, metric aliases, table layouts, JSON shapes, and common workflows.
- **Reading a dashboard or CLI output** → [`./references/metrics.md`]. Target thresholds per metric, what the automatic TTI params mean (`frameRate.*`, `device.*`, `network.*`), and diagnostic patterns for telling slow-but-smooth startup apart from main-thread contention, hard blocks, or throttled devices.
- **Shipping an Observe integration in a library** → [`./references/third-party.md`]. For package authors only (SDK 57+): optional peer dependency, config declaration merging, `Observe.registerIntegration()`, and event naming.

## Quick links to the docs

- Get started: https://docs.expo.dev/eas/observe/get-started/
- Dashboard guide: https://docs.expo.dev/eas/observe/dashboard/
- Querying with EAS CLI: https://docs.expo.dev/eas/observe/eas-cli/
- Metrics reference: https://docs.expo.dev/eas/observe/reference/metrics/
- Expo Router integration: https://docs.expo.dev/eas/observe/integrations/expo-router/
- React Navigation integration: https://docs.expo.dev/eas/observe/integrations/react-navigation/
- User-defined events: https://docs.expo.dev/eas/observe/events/
- Configuration: https://docs.expo.dev/eas/observe/configuration/
- Third-party integrations: https://docs.expo.dev/eas/observe/integrations/third-party/
- EAS Update download performance: https://docs.expo.dev/eas/observe/eas-update/
- Troubleshooting: https://docs.expo.dev/eas/observe/reference/troubleshooting/

## Known gaps between the docs and the shipped code

Verified against `eas-cli` 21.8.0 and `expo-observe` 57.0.9. Trust this skill's references over the docs on these points, but re-check with `--help` and the installed package before relying on them:

- All six CLI commands are on the [Querying with EAS CLI](https://docs.expo.dev/eas/observe/eas-cli/) page. Older doc builds list only four and omit `observe:routes` and `observe:session`.
- Navigation metric aliases are `nav_cold_ttr`, `nav_warm_ttr`, and `nav_tti`. There are no bare `cold_ttr` / `warm_ttr` aliases in the CLI.
- Sorting uses `--sort <slowest|fastest|newest|oldest>`. There is no `--order` flag.
- `ObserveErrorBoundary`, `Observe.reportError`, and `configure({ errorHandlingEnabled })` are exported but undocumented. Observe still has no crash reporting; use Sentry or BugSnag for that.

## Submitting Feedback
If you encounter errors, misleading or outdated information in this skill, report it so Expo can improve:
```bash
npx --yes submit-expo-feedback@latest --category skills --subject "eas-observe" "<actionable feedback>"
```
Only submit when you have something specific and actionable to report. Include as much relevant context as possible.
If an AI agent repeatedly failed or the user had to take over an Expo task, load the expo-skill-feedback skill and follow its eval-candidate flow instead of reusing the command above.


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
