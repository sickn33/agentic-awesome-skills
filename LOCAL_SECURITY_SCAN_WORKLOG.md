# Local Security Scan Worklog

## 2026-07-05

- Activated goal after CSV/Codex-security fixes left the broad local scanner at 38 errors.
- Scanner behavior confirmed from `tools/scripts/security_scanner.py`: non-strict mode fails on errors; warnings only fail with `--strict`.
- Replaced scanner-error examples in canonical skills with environment-variable reads, interactive prompts, generated/non-hardcoded values, or safer prose. Avoided broad scanner allowlists.
- Ran `npm run bundles:sync` with escalation because generated marketplace files under `.agents/` are outside the sandbox write boundary.
- Ran `npm run build` with escalation for the same `.agents/plugins/marketplace.json` generated output.
- Refreshed web app assets with `npm run app:setup`.

Verification:

- `npm run security:scan` passed: 1901 skills scanned, 0 errors, 36 warnings.
- `npm run security:docs` passed.
- `npm run bundles:check` passed.
- `npm run validate` passed with the existing 44 warnings and 216 advisories.
