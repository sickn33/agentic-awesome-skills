# Security Findings Triage Addendum (2026-03-18)

This addendum supersedes the previous Jetski loader assessment in
`security-findings-triage-2026-03-15.md`.

## Correction

- Finding: `Example loader trusts manifest paths, enabling file read`
- Path: `docs/integrations/jetski-gemini-loader/loader.mjs`
- Previous triage status on 2026-03-15: `obsolete/not reproducible on current HEAD`
- Corrected assessment: the loader was still reproducible via a symlinked
  `SKILL.md` that resolved outside `skillsRoot`. A local proof read the linked
  file contents successfully.

## Current Status

- The loader now rejects symlinked skill directories and symlinked `SKILL.md`
  files.
- The loader now resolves the real path for `SKILL.md` and rejects any target
  outside the configured `skillsRoot`.
- Regression coverage lives in
  `tools/scripts/tests/jetski_gemini_loader.test.js`.
