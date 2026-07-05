# Local Security Scan Goal

## Outcome

Eliminate the current repo-wide local security scanner error backlog so `npm run security:scan` exits successfully.

## Baseline

As of 2026-07-05, the broad local scanner reports 38 error findings after the CSV-backed Codex security remediation was completed. The failures are mostly `SEC009` hardcoded credential examples, plus `SEC002`, `SEC004`, and `SEC011` documentation patterns.

## Scope

- Fix canonical skill sources under `skills/`.
- Regenerate mirrored plugin distributions after canonical edits.
- Keep existing warning findings out of scope unless they are cheap collateral cleanup.
- Do not weaken scanner patterns, suppress findings with broad allowlists, or narrow the scanner target to make the check pass.
- Do not commit, push, publish, or release without a separate user request.

## Verification

Primary verifier:

```bash
npm run security:scan
```

Supporting checks:

```bash
npm run validate
npm run security:docs
npm run bundles:check
```

Completion proof requires the primary verifier to report zero errors and exit successfully.
