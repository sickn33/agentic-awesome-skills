# Maintenance review for 16.8.0

Review date: 2026-09-05. Initial protected base: `d32373400fef5fd3d00bf7dad2a04d87b6f22bfb`.

## Scope and decisions

All four open pull requests were inspected before mutation, including complete changed skill subtrees. The user checkout was preserved; work used a clean current-main clone.

- [#1360](https://github.com/sickn33/agentic-awesome-skills/pull/1360) was closed: its only change was an unrelated index of 40 game and sound links, not an agent-skill contribution.
- [#1339](https://github.com/sickn33/agentic-awesome-skills/pull/1339), reviewed head `bac6bc17c53b33c5a2bfffcb4e14a21f050b0ce1`: the one-file public-web research skill preserves provider choice, requires an existing connection, documents data transfer and anonymous rate limits, and does not activate MCP automatically. The current Parallel primary documentation confirms the endpoint, tool names, required arguments, and fetch bounds. Original authorship and employer affiliation are disclosed.
- [#1353](https://github.com/sickn33/agentic-awesome-skills/pull/1353), reviewed head `c975c6ca49905fbfa1ce1b50eaadc599991ba785`: the one-file adaptation and README credit match the CC0 upstream. Static review remains read-only and distinguishes confirmed findings, unknowns and runtime limitations. Tessl did not run: `manual-review-required` is not an automated review pass.
- [#1337](https://github.com/sickn33/agentic-awesome-skills/pull/1337), inspected head `4b2fbb80812717f553419c37d3c7e89817a9fdda`: all four skill files were read, including the ledger and both Python files; the pinned upstream MIT license resolves. The guarded dry run rejects `scripts/fingerprint.py` and `scripts/test_fingerprint.py` as `new_unapproved_path,new_unknown_extension`. This PR remains deliberately open and excluded from 16.8.0. No fork approval, script execution or policy exception was substituted for the blocked gate.

## Protected merge results

Strict main protection required refreshing the contributor branches before merging. The complete skill subtree bytes remained identical to the initial reviewed heads. The final exact-head attestations were `4d994736e56ce8789eba737ff04b5bfd172f9c96` for #1339 and `bdb82e92eb8264d1b6e502b84bafd24332c745f5` for #1353. Both merged through `npm run merge:batch` after the required checks passed; their protected squash commits are `7896e0bf7180558ee1832c544e2f986cb332beb0` and `3ecbc2377` respectively. Both used the manual-review fallback, not a claimed Tessl pass.

## Security and public-state observations

The live GitHub API returned no open issues, Dependabot alerts, CodeQL alerts or secret-scanning alerts at intake. Both source and legacy repositories retain protected main branches, administrator enforcement, disabled force-push/deletion, required checks and default read-only workflow permissions. The legacy repository had no open PR.

Recent discussion [#1333](https://github.com/sickn33/agentic-awesome-skills/discussions/1333) describes sandboxed skill execution and runtime guarantees beyond the supported Core preview. Those are third-party claims, not release claims. No public reply or endorsement was posted during this maintenance run.

## Validation

For #1339 and #1353, validation, reference checks, documentation security, warning budget and README source-credit checks passed. The full test runner reached the Workbench/installer count check with the source-only catalog still at 2,111; after `npm run chain`, that check passed with 2,112 skills in each isolated preview, and both remaining workflow regression files passed. Generated previews were not committed to either contributor PR.

On the protected maintenance base, `npm run validate`, `npm run validate:references`, `npm run security:docs` and the full `npm run test` suite passed. Web coverage passed with 87.17% statements, 76.96% branches, 90.21% functions and 91.8% lines. Root and web dependency installation audits reported no vulnerabilities.

## Evidence boundaries

The review covers exact submitted bytes and observed checks. It does not certify arbitrary execution, hosted-service behavior, or the entire corpus. Generated registries, plugin mirrors and contributor credits belong to protected canonical synchronization. Release publication and full public/runtime alignment are separate subsequent gates, not established by this intake record.
