# Security Findings Re-Triage (2026-03-29)

This document is the current-head refresh of the historical
[`security-findings-triage-2026-03-15.md`](security-findings-triage-2026-03-15.md)
baseline.

- Baseline snapshot: `origin/main@226f10c2a62fc182b4e93458bddea2e60f9b0cb9`
- Current verification target: `main@d63d99381b8f613f99c8cb7b758e7879b401f8a0`
- The 2026-03-15 markdown file and CSV remain useful as historical input, not
  as the current source of truth.
- A machine-readable companion export for this refresh lives at
  [`security-findings-triage-2026-03-29-refresh.csv`](security-findings-triage-2026-03-29-refresh.csv).
- Status meanings are unchanged:
  `still present and exploitable`, `still present but low practical risk`,
  `obsolete/not reproducible on current HEAD`, `duplicate of another finding`.

## Summary On Current HEAD

- still present and exploitable: 0
- still present but low practical risk: 0
- obsolete/not reproducible on current HEAD: 26
- duplicate of another finding: 7

## High-Level Outcome

The 2026-03-15 finding set no longer contains a currently reproduced open
security issue on `main`.

The biggest shifts since the original baseline are:

- filesystem/symlink hardening in `setup_web.js`, `install.js`,
  `sync_microsoft_skills.py`, `generate_index.py`, `fix_skills_metadata.py`,
  and `skill-utils.js`
- removal of shared frontend writes for skill saves/stars
- parser hardening for non-mapping YAML frontmatter
- secure extraction in the Office unpack helpers
- migration of predictable `/tmp` state files into user-owned state
  directories
- documentation hardening for risky command guidance

## Detailed Findings

| # | Current Status | Current HEAD Rationale | Evidence |
|---|---|---|---|
| 1 | obsolete/not reproducible on current HEAD | `sync_microsoft_skills.py` now sanitizes flat names and constrains delete/copy targets to safe in-repo paths. | `tools/scripts/sync_microsoft_skills.py`, `tools/scripts/tests/test_sync_microsoft_skills_security.py` |
| 2 | obsolete/not reproducible on current HEAD | `SkillDetail.tsx` still renders markdown without `rehype-raw`; the reported stored-XSS path does not reproduce. | `apps/web-app/src/pages/SkillDetail.tsx` |
| 3 | obsolete/not reproducible on current HEAD | `setup_web.js` now uses `lstatSync` plus `resolveSafeRealPath()` and skips out-of-root symlinks instead of dereferencing them into public assets. | `tools/scripts/setup_web.js`, `tools/scripts/tests/copy_security.test.js` |
| 4 | obsolete/not reproducible on current HEAD | The Apify skill no longer recommends pipe-to-shell installs or token-on-command-line login; the risky documentation pattern was removed. | `skills/apify-actorization/SKILL.md` |
| 5 | duplicate of another finding | Still the same root cause/fix area as finding `3`. | `tools/scripts/setup_web.js` |
| 6 | duplicate of another finding | Still the same root cause/fix area as finding `3`. | `tools/scripts/setup_web.js` |
| 7 | obsolete/not reproducible on current HEAD | Microsoft sync now rejects unsafe symlink targets and only accepts safe regular files that stay within the cloned source root. | `tools/scripts/sync_microsoft_skills.py`, `tools/scripts/tests/test_sync_microsoft_skills_security.py` |
| 8 | duplicate of another finding | Still the same root cause/fix area as finding `7`. | `tools/scripts/sync_microsoft_skills.py` |
| 9 | obsolete/not reproducible on current HEAD | The tracked `__pycache__` artifacts are absent on current `main`, and repo hygiene tests explicitly fail if they reappear. | `tools/scripts/tests/repo_hygiene_security.test.js` |
| 10 | obsolete/not reproducible on current HEAD | `generate_index.py` now ignores symlinked `SKILL.md` files instead of reading them during index generation. | `tools/scripts/generate_index.py`, `tools/scripts/tests/test_frontmatter_parsing_security.py` |
| 11 | obsolete/not reproducible on current HEAD | The Jetski loader rejects symlinked skill directories/files and refuses any resolved `SKILL.md` outside the configured skills root. | `docs/integrations/jetski-gemini-loader/loader.mjs`, `tools/scripts/tests/jetski_gemini_loader.test.cjs` |
| 12 | obsolete/not reproducible on current HEAD | TLS verification is enabled by default again; insecure behavior now requires an explicit opt-out environment flag. | `skills/junta-leiloeiros/scripts/scraper/base_scraper.py`, `skills/junta-leiloeiros/scripts/web_scraper_fallback.py` |
| 13 | obsolete/not reproducible on current HEAD | The old bundle-category omission path still does not drive shipped bundle output; current bundles come from `build-catalog.js`. | `tools/scripts/build-catalog.js`, `data/bundles.json` |
| 14 | obsolete/not reproducible on current HEAD | The malformed `--- Unknown` frontmatter regression is no longer present in `alpha-vantage`. | `skills/alpha-vantage/SKILL.md`, `tools/scripts/tests/repo_hygiene_security.test.js` |
| 15 | obsolete/not reproducible on current HEAD | `ws_listener.py` now defaults to a user-owned state directory and uses secure file creation instead of predictable shared `/tmp` output files. | `skills/videodb/scripts/ws_listener.py`, `tools/scripts/tests/local_temp_safety.test.js` |
| 16 | obsolete/not reproducible on current HEAD | `refresh-skills-plugin.js` now resolves real paths under the skills root before serving `/skills/*`; the public Pages app also no longer exposes the maintainer sync surface. | `apps/web-app/refresh-skills-plugin.js`, `README.md`, `apps/web-app/README.md` |
| 17 | duplicate of another finding | Still the same root cause/fix area as finding `16`. | `apps/web-app/refresh-skills-plugin.js` |
| 18 | obsolete/not reproducible on current HEAD | `validate_skills.py` now rejects non-mapping YAML frontmatter cleanly instead of crashing downstream validation. | `tools/scripts/validate_skills.py`, `tools/scripts/tests/test_frontmatter_parsing_security.py` |
| 19 | obsolete/not reproducible on current HEAD | `useSkillStars` now stores saves locally in the browser and no longer performs shared frontend writes through the public Supabase client. | `apps/web-app/src/hooks/useSkillStars.ts`, `apps/web-app/src/lib/supabase.ts` |
| 20 | obsolete/not reproducible on current HEAD | `fix_skills_metadata.py` now skips symlinked `SKILL.md` files and non-mapping frontmatter instead of rewriting arbitrary targets. | `tools/scripts/fix_skills_metadata.py` |
| 21 | obsolete/not reproducible on current HEAD | `install.js` now uses `lstatSync` plus `resolveSafeRealPath()` and skips symlinks that resolve outside the cloned repo root. | `tools/bin/install.js`, `tools/scripts/tests/copy_security.test.js` |
| 22 | duplicate of another finding | Still the same root cause/fix area as finding `21`. | `tools/bin/install.js` |
| 23 | duplicate of another finding | Still the same root cause/fix area as finding `1`. | `tools/scripts/sync_microsoft_skills.py` |
| 24 | obsolete/not reproducible on current HEAD | The audio transcription example now uses a quoted heredoc and passes values via environment variables instead of interpolating them into Python source. | `skills/audio-transcriber/examples/basic-transcription.sh` |
| 25 | obsolete/not reproducible on current HEAD | The claimed recursive symlink traversal in catalog discovery still does not reproduce on current code paths. | `tools/lib/skill-utils.js`, `tools/scripts/build-catalog.js` |
| 26 | obsolete/not reproducible on current HEAD | Root `skills_index.json` remains the canonical generated index, so the reported release-script path mismatch does not reproduce as a defect. | `tools/scripts/generate_index.py`, `tools/scripts/update_readme.py`, `tools/scripts/release_workflow.js` |
| 27 | obsolete/not reproducible on current HEAD | `skill-utils.js` now relies on `lstatSync`-based safe directory/file discovery, so normalization does not treat symlinked skill folders as writable local skills. | `tools/lib/skill-utils.js`, `tools/scripts/normalize-frontmatter.js` |
| 28 | obsolete/not reproducible on current HEAD | The `last30days` skill still passes `"$ARGUMENTS"` as a quoted value into a temp file, so the reported direct shell-injection sink does not reproduce from current text. | `skills/last30days/SKILL.md` |
| 29 | duplicate of another finding | Still the same root cause/fix area as finding `18`. | `tools/scripts/generate_index.py`, `tools/scripts/validate_skills.py` |
| 30 | obsolete/not reproducible on current HEAD | The strategic compact hook now stores state under `XDG_STATE_HOME` instead of predictable shared `/tmp` paths. | `skills/cc-skill-strategic-compact/suggest-compact.sh`, `tools/scripts/tests/local_temp_safety.test.js` |
| 31 | obsolete/not reproducible on current HEAD | `sync_recommended_skills.sh` now preserves symlinks with `cp -RP` and avoids the destructive glob-delete pattern called out in the original report. | `tools/scripts/sync_recommended_skills.sh`, `tools/scripts/tests/repo_hygiene_security.test.js` |
| 32 | obsolete/not reproducible on current HEAD | `skills_manager.py` now resolves candidate paths relative to the intended base directory and rejects traversal attempts. | `tools/scripts/skills_manager.py`, `tools/scripts/tests/test_skills_manager_security.py` |
| 33 | obsolete/not reproducible on current HEAD | The Office unpack helpers now validate archive members and reject traversal/symlink-style entries before extraction. | `skills/docx-official/ooxml/scripts/unpack.py`, `skills/pptx-official/ooxml/scripts/unpack.py`, `tools/scripts/tests/test_office_unpack_security.py` |

## Maintainer Notes

- Keep the 2026-03-15 markdown file and CSV as the historical baseline record.
- Keep the 2026-03-29 addendum as the intermediate transition note.
- Use this refresh when answering “what is still open right now?” for the
  original 2026-03-15 finding set.
- If new findings are discovered later, start a fresh triage cycle rather than
  mutating the historical baseline counts again.
