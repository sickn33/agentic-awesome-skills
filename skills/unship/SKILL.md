---
name: unship
description: "Compare AI agent-made UI variants locally in a real app, then keep one and clean up unused temporary code."
category: development
risk: critical
source: community
source_repo: mbenhard/unship
source_type: community
date_added: "2026-06-07"
author: Marcus Benhard
tags: [ui-variants, frontend, local-first, coding-agents]
tools: [claude-code, antigravity, cursor, gemini-cli, codex-cli, opencode]
license: "MIT"
license_source: "https://github.com/mbenhard/unship/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# Unship

## Overview

Unship is a local workflow for comparing AI-generated UI alternatives in the real application instead of accepting one generated version at a time. It adds temporary source-level variants, shows a local browser picker, and then cleans up the unused options after the user chooses.

This skill is for frontend iteration with coding agents. It is not production A/B testing, analytics, feature flagging, or a hosted experiment service.

## When to Use This Skill

- Use when the user wants to compare multiple UI, layout, copy, state, flow, or design-system alternatives.
- Use when a coding agent should create several temporary options in real source code and let the user judge them in the running local app.
- Use when the user chooses a visible option and wants the losing temporary code removed before shipping.

## Do Not Use This Skill When

- The user needs production experiments, traffic splitting, analytics, or feature flags.
- The app cannot safely render inactive hidden variants because of duplicate active IDs, global scripts, analytics triggers, focus traps, destructive actions, or autoplay side effects.
- The user has not authorized local source edits.

## How It Works

### 1. Install or reuse Unship

Prefer the project-local binary when it exists:

```bash
./node_modules/.bin/unship doctor --json --no-update-check
```

Otherwise install a reviewed, exact CLI version into the project and then run the local binary:

```bash
npm install --save-dev @unship/cli@<reviewed-version>
./node_modules/.bin/unship doctor --json --no-update-check
```

If setup is needed for the local picker, run:

```bash
./node_modules/.bin/unship setup --json
```

Patch only the smallest development-only mount point required to load the picker in the local preview.

### 2. Create temporary variants

Inspect the relevant page, component, route, or rendered artifact. Add the smallest source-level comparison that lets the user judge real options in context.

Use Unship markup:

```html
<section data-unship-pick="Hero">
  <div data-unship-option="Current">...</div>
  <div data-unship-option="Proof-led" hidden>...</div>
  <div data-unship-option="Visual" hidden>...</div>
</section>
```

Keep option labels short and visible. Prefer 2-4 meaningful alternatives unless the user asked for a specific count.

### 3. Verify comparison readiness

Before handing off to the user, check that:

- the expected `data-unship-pick` group exists;
- the expected option labels exist;
- options are direct children of the group;
- exactly one option is initially visible;
- hidden inactive options remain hidden.

### 4. Let the user choose

Tell the user the group label, option labels, setup status, and any detected local preview server hints. The user chooses by naming a visible option label in chat.

### 5. Clean up after selection

When the user picks a winner, keep that option's real source and remove losing options for that group. Remove temporary `data-unship-*` attributes from settled source.

For final cleanup before shipping, remove all Unship artifacts and run:

```bash
./node_modules/.bin/unship check --json
```

Do not claim cleanup is complete until the check reports clean.

## Best Practices

- Keep Unship work local and temporary.
- Preserve the existing app design language unless the user explicitly asks for a different direction.
- Avoid unrelated refactors while variants are temporary.
- Do not put custom tabs, app preferences, or permanent switchers into product UI for Unship comparisons.
- Keep inactive options safe: avoid duplicate active IDs, submit controls, global scripts, analytics triggers, focus traps, destructive side effects, and stateful providers.

## Limitations

- Unship does not decide which variant wins; the human chooses.
- Unship does not replace design review, browser QA, accessibility checks, or production release validation.
- Unship is not intended for production traffic, remote analytics, or persistent product experiments.

## Security & Safety Notes

- Run commands only in a local project the user has authorized you to modify.
- Do not run `npx @unship/cli@latest` or any unpinned remote CLI in automated agent workflows. Pin and review the package version first, then execute the project-local binary.
- Treat generated variants as temporary code that must be cleaned before release.
- Before destructive cleanup, confirm the selected option label when the user's choice is ambiguous.
- If a baseline build or typecheck already fails before Unship edits, report that baseline state and keep variant work isolated.

## Common Pitfalls

- **Problem:** Hidden variants override `hidden` with CSS.
  **Solution:** Preserve `[hidden] { display: none !important; }` near variant-specific CSS when needed.

- **Problem:** The user says "keep the second one" after more changes.
  **Solution:** Confirm the exact group and option label before editing source.

- **Problem:** The comparison grows into a broad redesign.
  **Solution:** Reduce scope to the smallest section, state, or flow that can be judged in the running app.

## Related Skills

- `@webapp-testing` - Use for browser-based functional checks after frontend changes.
- `@mobile-design` - Use when comparing mobile-specific UI patterns and platform constraints.
