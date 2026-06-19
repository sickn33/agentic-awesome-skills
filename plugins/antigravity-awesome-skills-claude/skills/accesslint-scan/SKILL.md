---
name: accesslint-scan
description: "Audit a live page for accessibility issues, locate each WCAG violation precisely, and return a selector-grounded fix worklist without editing."
risk: safe
source: "https://github.com/AccessLint/skills"
date_added: "2026-06-02"
---

Audit a live page and report what's broken and where. Locate; don't fix. If no URL in `$ARGUMENTS`, ask for one.

## When to Use
- Use this skill when the task matches this description: Audit a live page for accessibility issues, locate each WCAG violation precisely, and return a selector-grounded fix worklist without editing.

## 1. Audit

```bash
PORT=$(npx -y @accesslint/chrome@latest ensure | node -e 'process.stdin.on("data",d=>process.stdout.write(""+JSON.parse(d).port))')
npx -y @accesslint/cli@latest "<url>" --port "$PORT" --format json
```

Flags as needed: `--selector`, `--wait-for "<selector>"`, `--include-aaa`, `--disable <rules>`.

## 2. Report

Counts by impact, then one entry per violation:

- **where** — selector verbatim + `file:line (symbol)` if `source` is present — never fabricate. If no violation has `source`, note "source mapping unavailable — located by selector only".
- **evidence** — contrast ratio, missing attribute, empty name
- **fix** — mechanical change or `NEEDS HUMAN`

Don't edit. For fixes: apply mechanical ones then re-run to verify; for bulk work hand off to `accesslint:audit`.

## 3. Tear down

```bash
npx -y @accesslint/chrome@latest stop --all  # skip if ensure reported "managed":false
```

## Gotchas

- `ensure` always determines the port — never hardcode 9222.
- CLI exit 2 = bad URL or page never loaded; check the dev server.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
