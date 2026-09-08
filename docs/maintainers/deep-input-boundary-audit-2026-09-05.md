# Substantive input-boundary audit — 2026-09-05

Base: `8384acc66138ca3af86758d93edfac2d2a3570ee` (protected main).
Scope: direct installer destination handling, package archive ingestion, local Core/CLI/MCP boundaries, Workbench imports, catalog navigation and copy behavior, canonical bundled-script syntax, dependency alerts and existing regression suites. No release, npm publication, Pages deployment, telemetry, or real host configuration changes.

## Confirmed defects and corrections

| Defect | Reproduction / consequence | Correction |
| --- | --- | --- |
| Archive entry budget omitted directories and PAX/GNU metadata | Three directories passed a limit of two; metadata headers could also bypass the budget, including when no payload was selected. | Count every nonempty header before processing metadata. Keep `fileCount` as the regular-file statistic. |
| Archive ancestor checks compared raw spelling | Both orders of `package/Foo` and `package/foo/bar` passed, despite colliding on case-insensitive filesystems; Unicode-equivalent parents had the same problem. | Compare normalized ancestor keys, with indexed lookups instead of scanning every earlier entry. |
| Installer manifest overwrote a hardlink target | Writing the install manifest changed a separate file outside the install directory that shared its inode. | Reject nonregular, linked or oversized manifests; bound reads to 1 MiB and replace a staged private manifest by rename. Failed replacement preserves original bytes and removes staging. |
| Workbench silently accepted duplicate JSON keys | A duplicated catalog version or schema version was overwritten by `JSON.parse`; CLI strict scanning already rejected the same ambiguity. | Inspect validated JSON tokens before field projection, including escaped-equivalent keys and nested objects. No imported values appear in the error. |
| Late markdown responses overwrote the current skill | Navigate from a delayed skill to another, then resolve the old request: the new heading displayed old markdown and the copy action used that content. | Retire effect updates on navigation/unmount, including stale failures and fallback requests. Regression checks displayed and copied content. |
| Copy buttons claimed success before clipboard completion | Rejected clipboard writes were not caught and the buttons switched immediately to “Copied”. | Await completion, show success only after it succeeds, and provide a visible manual-copy message on failure. |

The archive, hardlink, duplicate-key and navigation regressions were observed failing before their fixes. Added failure-preservation checks also cover a refused manifest replacement and oversized manifests. These are concrete bounded regression cases, not fuzzing or an experimental transaction certification.

## Coverage and evidence

- Parse-only inspection of every tracked nonsymlink `.py`, `.sh` and `.js` file under canonical `skills/`: **773 Python, 75 shell, 29 JavaScript; 877 total; no syntax failures**. Python used `compile` without execution or bytecode output; shell used parsing only; JavaScript used syntax checking. No bundled scripts were executed.
- Structural/usability audit of all 2,113 skills: zero reported warnings, errors or informational findings; warning budget remains 0/0. This is structural evidence, not semantic certification.
- Dependency audit of root and web lockfiles: zero known vulnerabilities at audit time. GitHub Dependabot, code scanning and secret scanning open-alert counts were each zero.
- Reviewed the registry updater's pinned npm origin, transfer byte limit and integrity verification; cache resolver identity matching; inert skill-file read limits and containment; MCP strict JSON and CLI import behavior; installer destination staging and pruning; Workbench schema and digest checks; markdown link transformation and asynchronous navigation.
- Passed: 122 root test groups, 171 Core tests, 221 web tests, web typecheck/build/lint, skill validation, reference validation, docs security and offline catalog integrity. Edge desktop and 390 px mobile checks verified duplicate rejection, valid replacement, clipboard-denial messaging, no page errors and no horizontal overflow. Core coverage includes actual npm-packed runtime installation into a temporary cache and an isolated MCP process, plus real stdio artifact round trips. No user client configuration is changed.

## Limits and remaining work

This is not a semantic certification of all 2,113 skills. Syntax success does not prove API correctness, useful instructions, compatible dependencies, external-provider behavior, or safe execution of every bundled script. Windows filesystem behavior and a real user-host MCP invocation were not manually tested in this pass. Existing supported tests and small deterministic negative cases cover the changed boundaries; experimental apply/recovery remains outside scope.

PR #1337 remains excluded under its existing fork source-safety blocker (`new_unapproved_path`, `new_unknown_extension`); this audit does not bypass that decision. Source fixes require the protected merge gates and do not change the published 16.8.0 package or deployed catalog until a separately authorized release.
