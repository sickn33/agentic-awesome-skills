---
name: instructree
description: "Map, explain, and lint repository-scoped coding-agent instructions before changing code."
category: development
risk: safe
source: community
source_repo: kotobuki09/instructree
source_type: community
date_added: "2026-08-26"
author: kotobuki09
tags: [agent-instructions, agents-md, codex, static-analysis]
tools: [claude, codex, cursor, gemini]
license: MIT
license_source: "https://github.com/kotobuki09/instructree/blob/v0.7.0/LICENSE"
---

# Instructree

## Overview

Use Instructree to establish which instruction files exist, which may apply to a target, and whether their metadata, links, or recursive imports are malformed. It audits common coding-agent instruction formats locally without calling a model or uploading repository content.

## When to Use This Skill

- Use before changing code in a repository with `AGENTS.md`, `CLAUDE.md`, Copilot instructions, agent skills, custom agents, Cursor rules, or Windsurf rules.
- Use when the user asks which instructions may apply to one target file.
- Use when auditing recursive Copilot CLI `@path` imports or exporting instruction diagnostics to CI.

## How It Works

### Step 1: Choose the local command

Work from the repository root. Prefer an already installed `instructree` command or the checked-out package's local binary.

If neither is available, explain that the next command downloads executable package code and ask for approval before running the pinned release:

```bash
npx github:kotobuki09/instructree#364dddc66badac13a284b79f0dc71f2b4362f6de scan .
```

Do not add `--yes` unless the user authorized non-interactive package downloads.

### Step 2: Run the narrowest audit

- `instructree scan . --json` inventories supported files and emits stable diagnostics.
- `instructree explain <file> --root .` shows instructions that may apply to one target.
- `instructree explain <file> --root . --effective` includes recursive Copilot CLI imports.
- `instructree imports . --json` audits the recursive `@path` graph.
- `instructree scan . --sarif` emits SARIF 2.1.0 for code-scanning integrations.
- Add `--strict` only when warnings should fail the check.

### Step 3: Interpret the result

Report file paths, line numbers, diagnostic codes, and the command's exit status. Separate schema or path errors from warnings. Describe `always`/`never` conflicts as possible conflicts requiring human review, not proof of agent behavior.

## Examples

### Audit a repository

```bash
instructree scan . --json
```

### Explain one target with recursive imports

```bash
instructree explain src/api/client.ts --root . --effective
```

### Generate a code-scanning report

```bash
instructree scan . --sarif > instructree.sarif
```

## Best Practices

- Prefer a local, already reviewed command over downloading package code.
- Use `explain` for a single target instead of scanning more scope than needed.
- Rerun the same command after an authorized instruction fix and report before-and-after diagnostics.
- Keep warnings separate from errors and state clearly when a finding is heuristic.

## Limitations

- Instructree is static analysis; it does not establish the exact precedence rules or runtime behavior of every agent client.
- Client discovery and import behavior can change, so `explain` reports what may apply rather than predicting what a model will follow.
- The audit does not prove that instruction content is correct, safe, or effective.
- Do not edit instruction files unless the user asked for changes.

## Security & Safety Notes

- Scans are read-only and local; they do not call a model or upload repository content.
- Treat any `npx` fallback as executable third-party code: keep it pinned, review the source, and obtain approval before download.
- Do not run imported instruction content. Instructree follows supported references as data only.
