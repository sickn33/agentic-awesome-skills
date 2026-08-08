---
name: codex-profiles
description: "Use codex-profiles to run Codex CLI or Codex Desktop with isolated CODEX_HOME profiles for separate accounts, projects, and local state."
category: productivity
risk: critical
source: community
source_repo: Ducksss/codex-profiles
source_type: community
date_added: "2026-07-08"
author: Ducksss
tags: [codex, codex-cli, profiles, code-home, account-isolation, desktop]
tools: [codex]
license: "MIT"
license_source: "https://github.com/Ducksss/codex-profiles/blob/main/LICENSE"
---

# Codex Profiles

## Overview

Use `codex-profiles` when a user wants separate Codex CLI or Codex Desktop contexts for work, personal, school, client, or project-specific activity. The tool wraps Codex's `CODEX_HOME` support so each profile has its own Codex home directory for auth, config, sessions, connectors, plugins, caches, logs, and local state.

This skill is for profile selection and operational safety around that boundary. It is not an official OpenAI project, and it does not provide full OS-level isolation.

## When to Use This Skill

- Use when the user wants to keep multiple Codex accounts or project contexts separate on one machine.
- Use when a workflow needs a different `CODEX_HOME` without manually exporting environment variables.
- Use when diagnosing which Codex profile is active or whether profiles are logged in.
- Use when the user asks about Codex account switching without copying `auth.json`.
- Use when launching Codex Desktop from a profile, only after confirming the user accepts app/process disruption.

## How It Works

### Step 1: Confirm Scope and Installation

First check whether the user wants CLI-only profile switching or Codex Desktop profile launching. Desktop operations can quit, launch, clone, or rebuild app instances, so get explicit approval before running them.

If the tool is already installed, inspect the live command surface:

```bash
codex-profile --help
codex-profile doctor
codex-profile list
codex-profile status
```

If it is not installed, prefer package-manager installs the user can inspect and control:

```bash
npm install -g codex-profile
brew install Ducksss/tap/codex-profile
```

Do not run remote install scripts automatically. If the user asks for a source install, clone the repository and inspect its install instructions first.

### Step 2: Create or Select a Profile

Create a new isolated Codex home only when the user names the intended profile:

```bash
codex-profile init work
codex-profile path work
```

Ask the user to log in once per profile when needed:

```bash
codex-profile login work
```

Do not copy, parse, print, or migrate `auth.json` tokens between profiles.

### Step 3: Run Codex CLI With a Profile

Use the CLI profile wrapper for ordinary agent work:

```bash
codex-profile cli work
codex-profile cli work exec "run tests and summarize failures"
```

For one-off shell sessions, prefer the tool's environment or shell activation commands after checking `--help`:

```bash
codex-profile env work
codex-profile shell-init --help
```

### Step 4: Use Desktop Profile Commands Carefully

Codex Desktop launch flows can affect running app state. Before running them, state which profile, app mode, and workspace will be used, then wait for approval.

```bash
codex-profile app work ~/Dev/project
codex-profile app work --instance ~/Dev/project
```

Use `--instance` only when the user wants side-by-side Desktop profiles and accepts the additional local app clone and separate Electron user-data boundary.

## Examples

### Example 1: Read-Only Profile Audit

```bash
codex-profile list
codex-profile status
codex-profile doctor
```

Use this before changing profile state. It should not expose token contents.

### Example 2: CLI Task in a Work Profile

```bash
codex-profile cli work exec "inspect this repository and run its test suite"
```

Confirm the profile name is intentional before running long tasks.

### Example 3: Manual CODEX_HOME Equivalent

If the wrapper is unavailable, explain the underlying boundary instead of improvising token movement:

```bash
CODEX_HOME="$HOME/.codex-work" codex
CODEX_HOME="$HOME/.codex-work" codex exec "review this change"
```

## Best Practices

- Keep profile names explicit and boring, such as `work`, `personal`, `client-a`, or `school`.
- Use `status`, `list`, and `doctor` before destructive or Desktop actions.
- Treat each profile as a separate local Codex home, not as a full sandbox.
- Keep secrets inside the account/profile that owns them; do not copy auth files between profiles.
- Prefer CLI profile commands for routine work and reserve Desktop app commands for user-approved context switches.
- Verify behavior against the installed `codex-profile --help`, because command flags can change.

## Limitations

- `codex-profiles` is community-maintained and is not an official OpenAI tool.
- It isolates Codex state through separate `CODEX_HOME` directories; it does not isolate the operating-system user, shell history, SSH keys, browser cookies, GitHub CLI auth, or unrelated application state.
- Desktop profile launch behavior is macOS-focused and can change with Codex Desktop releases.
- Existing Codex sessions may still contain project context from before a profile strategy was adopted.
- The tool does not replace backups for important Codex state.

## Security & Safety Notes

- Never copy, print, parse, or migrate `auth.json` tokens as a shortcut.
- Do not run Desktop launch, app clone, rebuild, remove, or profile deletion commands without explicit user approval.
- Use `codex-profile remove` only after confirming the exact profile path and whether the user needs a backup.
- Do not assume profile isolation protects credentials outside `CODEX_HOME`.
- Avoid remote install scripts in automated agent runs; prefer inspectable package-manager or source-install steps.

## Common Pitfalls

- **Problem:** A user expects profile switching to isolate GitHub CLI, SSH, or browser state.
  **Solution:** Explain that `codex-profiles` isolates Codex home state only; check and switch other tools separately.

- **Problem:** A Desktop command disrupts an active session.
  **Solution:** Ask before Desktop operations and prefer CLI commands when the user only needs isolated command-line work.

- **Problem:** A profile exists but is logged out or missing connectors.
  **Solution:** Run `codex-profile status` and have the user log in or configure connectors inside that profile.

## Related Skills

- `@environment-setup-guide` - Use when installing or documenting local development tools.
- `@codex-maintenance` - Use when maintaining local Codex Desktop, MCP, plugin, or cache surfaces.
- `@filesystem-context` - Use when reasoning about local files, config paths, and workspace boundaries.
