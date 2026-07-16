# Security Findings Triage Addendum (2026-03-29)

This addendum updates the 2026-03-15 baseline after the follow-up hardening
work shipped on `main`.

For the full current-head re-triage, use
[`security-findings-triage-2026-03-29-refresh.md`](security-findings-triage-2026-03-29-refresh.md).

## Corrected / Updated Findings

- Finding `1` / `7` (`tools/scripts/sync_microsoft_skills.py`)
  The Microsoft sync path now constrains filesystem writes and copied inputs to
  safe in-repo targets. The plugin-skill discovery path also skips symlinked
  `SKILL.md` files instead of trusting them. Regression coverage lives in
  `tools/scripts/tests/test_sync_microsoft_skills_security.py`.

- Finding `18` / `29` (`tools/scripts/validate_skills.py`,
  `tools/scripts/generate_index.py`)
  Frontmatter parsing now rejects non-mapping YAML payloads cleanly and handles
  empty/frontmatter-edge cases without crashing downstream validation or index
  generation. Regression coverage lives in
  `tools/scripts/tests/test_frontmatter_parsing_security.py`.

- Finding `19`
  The web app no longer exposes shared frontend writes for skill saves/stars by
  default. The current behavior is browser-local save state with optional
  read-only remote counts, so the old "anonymous Supabase writes allow skill
  star tampering" assessment is no longer the active behavior on current HEAD.

- Findings `16` / `17`
  The `refresh-skills` plugin remains a local development surface, but the
  published GitHub Pages app now runs in static public-catalog mode and does not
  expose the maintainer sync CTA in production. Treat the residual plugin logic
  as local dev hardening scope, not a public production endpoint.

- Finding `33`
  The Office unpack helpers no longer call `extractall()` blindly. They now
  validate archive member paths and reject traversal/symlink-style entries
  before extraction. Regression coverage lives in
  `tools/scripts/tests/test_office_unpack_security.py`.

## Maintainer Guidance

- Keep the 2026-03-15 file as the historical baseline snapshot.
- Use this addendum plus the newer regression tests when deciding which
  findings are still actionable on current HEAD.
- If a future triage refresh is produced, fold these corrections into the next
  full summary instead of re-copying the original counts unchanged.
