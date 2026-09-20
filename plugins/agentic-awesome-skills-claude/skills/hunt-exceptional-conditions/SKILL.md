---
name: hunt-exceptional-conditions
description: Hunt mishandling of exceptional conditions
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
report_count: 0
sources: hackerone_public
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# HUNT-EXCEPTIONAL-CONDITIONS — Verbose Errors / Fail-Open (A10:2025)

## What actually pays

Well-built apps catch errors and return a clean, generic message. A broken app,
when handed input it didn't expect, throws an unhandled exception and renders a
**developer error page** straight to the client — leaking the stack trace, the
ORM/query internals, server-side file paths, and framework/library versions.
That disclosure is the finding (and it arms SQLi/RCE/path attacks next).

## Recon

Any endpoint that parses input is a candidate; the richest are:

```
JSON APIs that expect typed fields:  POST /api/* with {numbers, ids, enums}
Endpoints with numeric/id path or query params:  /item/{id}, ?page=, ?quantity=
Search / filter / sort params
File or content-type sensitive uploads
```

## Attack — send what the code didn't anticipate

Take a known-good request and break ONE assumption at a time:

- **Wrong type:** a field the app expects to be a number/string is sent as an
  array or object — `{"rating":"x","comment":[1,2,3]}`, `{"quantity":{}}`.
- **Malformed body:** truncated/!invalid JSON, an unterminated string, a stray
  brace, a wrong/missing Content-Type.
- **Boundary/oversized:** a very long string, a huge/negative/overflow number.
- **Null byte / control chars** embedded in a value.

```
POST /api/Feedbacks   {"rating":"notanumber","comment":[1,2,3]}
GET  /item/' OR /item/%00   (also exercises the error path)
```

Watch the RESPONSE BODY, not just the status: a 500 (or even a 200/400) whose
body contains a stack trace or framework error page is the signal.

## What counts as a leak (the success signal)

A finding is confirmed when the response body contains a cross-framework error-disclosure signature:

- **Node/Express + Sequelize:** `SequelizeDatabaseError`, `node_modules/sequelize`,
  a JS stack with internal paths.
- **PHP:** `<b>Warning</b> ... /var/www/.../file.php on line N`.
- **Python:** `Traceback (most recent call last)`, `werkzeug.exceptions`.
- **Java:** `at com.app.Foo(Foo.java:42)` stack frames.
- **.NET:** `Server Error in '/' Application`, a `[System.XxxException: ...]` YSOD.

A clean JSON error (`{"error":"Invalid input"}`) with no internals is NOT a
finding — that's correct handling. Disclosure of internal structure is.

## Validation discipline

- Capture the exact leaked artifact (path, ORM class, version, stack frame) —
  that's the evidence. "It returned 500" alone is not disclosure.
- Note what the leak enables next (e.g. a disclosed SQL error → hunt-sqli; a
  disclosed absolute path → hunt-lfi).

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
