---
name: accesslint-scan
description: Audit a live page for accessibility issues, locate each WCAG violation precisely, and return a selector-grounded fix worklist without editing.
metadata:
  aas-risk: critical
  aas-source: https://github.com/AccessLint/skills
  aas-date-added: '2026-06-02'
---

Audit a live page and report what's broken and where. Locate; don't fix. If no URL in `$ARGUMENTS`, ask for one.

## When to Use
- A supplied page needs an automated contrast, accessible-name, or semantic-markup audit.
- You need selector-grounded findings after a UI change, without modifying the application.
- Manual assistive-technology checks or site-wide conformance assessment are separate work.

## 1. Audit

Use an already reviewed, project-pinned installation of `@accesslint/chrome` and
`@accesslint/cli`; confirm their local binaries and CLI help before execution.
Do not silently download and execute `@latest`. Confirm the URL and whether
browser access could expose authenticated or sensitive content.

For a project whose locked installation exposes these binary names:

```bash
session_file="$(mktemp)"
./node_modules/.bin/accesslint-chrome ensure > "$session_file"
```

Read the complete JSON result once, record `port` and `managed`, and substitute
the returned port in `./node_modules/.bin/accesslint scan "<target>" --port "<returned-port>" --format json`. Never parse arbitrary
stdout chunks as complete JSON. Confirm the actual binary names from the
installed packages; they may differ by version. The current upstream command
shape is `scan <target> --port <port> --format json`.


Flags as needed: `--selector`, `--wait-for "<selector>"`, `--include-aaa`, `--disable <rules>`.

## 2. Report

Counts by impact, then one entry per violation:

- **where** — selector verbatim + `file:line (symbol)` if `source` is present — never fabricate. If no violation has `source`, note "source mapping unavailable — located by selector only".
- **evidence** — contrast ratio, missing attribute, empty name
- **fix** — mechanical change or `NEEDS HUMAN`

Return the worklist without editing. Remediation requires a separate authorized task; current upstream names it `accesslint:accessibility-fix`, which may not be installed in this host.

## 3. Tear down

Stop only the managed browser session created for this audit, using the installed helper's supported session/port-specific stop operation. If it only supports `stop --all`, check for other managed sessions first and do not terminate unrelated audits. Skip teardown of an unmanaged browser.

## Gotchas

- `ensure` always determines the port — never hardcode 9222.
- CLI exit 2 = bad URL or page never loaded; check the dev server.

## Limitations
- Automated rules cannot certify full WCAG conformance; retain human-required findings and record scan failures separately from zero violations.
- Upstream CLI shape checked against [AccessLint scan source](https://github.com/AccessLint/skills/blob/main/plugins/accesslint/skills/accessibility-scan/SKILL.md); this AAS skill does not bundle the CLI or install it.
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
