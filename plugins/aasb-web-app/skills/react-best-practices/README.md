# React Best Practices — catalog adaptation

Adapted from guidance originally created by @shuding at Vercel; this catalog copy has local corrections and is not a claim of ongoing upstream maintenance.

## Contents

- `SKILL.md`: entry point and scope.
- `rules/`: 45 individual rule documents plus section metadata and a template.
- `AGENTS.md`: combined reading copy of the rule documents.
- `metadata.json`: historical upstream document metadata.

Upstream build scripts, package manifest, and evaluation test cases are not bundled. Do not run the former pnpm build/validate instructions in this directory. When maintaining the copy, keep the individual rules and combined document synchronized and run this repository’s content checks.

## Using a rule

Read its conditions and limitations, confirm API availability in the installed framework, and measure the relevant user interaction. Snippets omit application helpers and must be adapted to real module boundaries, error handling, authorization and accessibility. Performance labels are qualitative; no generic speedup is promised.
