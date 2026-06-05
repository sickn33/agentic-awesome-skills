---
name: accesslint-diff
description: "Diff a live page's accessibility violations against a baseline — by default compares uncommitted changes (stash-based), or pass --branch [<name>] to diff against a branch. Reports only new violations introduced, violations fixed, and pre-existing count. Use `scan` for a full audit with no diffing."
risk: safe
source: "https://github.com/AccessLint/skills"
date_added: "2026-06-02"
---

Default branch: !`git symbolic-ref refs/remotes/origin/HEAD --short 2>/dev/null | sed 's|.*/||' || echo main`

Report only what changed. Locate; don't fix. If no URL in `$ARGUMENTS`, ask for one.

Parse `$ARGUMENTS`: strip `--branch <name>` if present → branch mode. If `--branch` has no value, use the default branch above. Remainder is the URL.

## When to Use
- Use this skill when the task matches this description: Diff a live page's accessibility violations against a baseline — by default compares uncommitted changes (stash-based), or pass --branch [<name>] to diff against a branch. Reports only new violations introduced, violations fixed, and pre-existing count. Use `scan` for a full audit with no diffing.

## 1. Audit

```bash
PORT=$(npx -y @accesslint/chrome@latest ensure | node -e 'process.stdin.on("data",d=>process.stdout.write(""+JSON.parse(d).port))')
```

**Stash mode** (default — uncommitted changes). Tell the user first: _"Running in diff mode — stashing your changes to capture a baseline, then restoring. Your working tree will be fully restored."_ If `git stash push` fails, warn and exit.

```bash
git stash push -u -m "accesslint-diff-baseline"
npx -y @accesslint/cli@latest "<url>" --port "$PORT" --snapshot accesslint-diff --snapshot-dir /tmp --update-snapshot
git stash pop && sleep 2
npx -y @accesslint/cli@latest "<url>" --port "$PORT" --snapshot accesslint-diff --snapshot-dir /tmp --format json
```

**Branch mode** (`--branch <name>`). Tell the user first: _"Diffing against `<name>` — checking out that branch to capture a baseline, then restoring. Your working tree will be fully restored."_

Branch switching triggers a rebuild but not a browser reload — the CLI opens a fresh tab each time so it always reads the current build. Use `--wait-for "<selector>"` to gate the audit until the rebuild is ready; without it, warn the user that a slow build may yield a stale baseline.

```bash
git diff --quiet && git diff --cached --quiet || git stash push -u -m "accesslint-diff-branch"
git checkout <branch>
npx -y @accesslint/cli@latest "<url>" --port "$PORT" --snapshot accesslint-diff --snapshot-dir /tmp --update-snapshot [--wait-for "<selector>"]
git checkout - && git stash pop 2>/dev/null
npx -y @accesslint/cli@latest "<url>" --port "$PORT" --snapshot accesslint-diff --snapshot-dir /tmp --format json [--wait-for "<selector>"]
```

Pass `--selector`, `--include-aaa` to **both** runs.

## 2. Report

```
Accessibility diff — http://localhost:3000/ vs main (94 rules, live DOM)
2 new · 1 fixed · 4 pre-existing hidden

New — Critical
- color-contrast — 2.1:1 (needs 4.5:1), #bbb on #fff
    where: main > p.subtitle   fix: darken to #767676
Fixed
- img-alt — <img src="old.jpg"> (no longer present)
```

Each new violation: **where** (selector verbatim + `file:line (symbol)` if `source` present — never fabricate), **evidence**, **fix** (mechanical change or `NEEDS HUMAN`).

Don't edit. For fixes: apply mechanical ones then re-run `accesslint:diff` to verify; for bulk work hand off to `accesslint:audit`.

## 3. Tear down

```bash
npx -y @accesslint/chrome@latest stop --all  # skip if ensure reported "managed":false
```

## Gotchas

- `ensure` always determines the port — never hardcode 9222.
- CLI exit 2 = bad URL or page never loaded; check the dev server.
- Stash mode: `sleep 2` covers most HMR cases; if baseline looks identical to current, add `--wait-for "<selector>"`.
- Branch mode: no HMR — CLI opens a fresh tab each run. `--wait-for` is the rebuild gate.
- Heavy DOM changes between runs cause selector drift — re-run with `accesslint:scan` for the full picture.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
