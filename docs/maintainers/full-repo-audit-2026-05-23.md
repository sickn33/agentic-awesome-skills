# Full repository audit - 2026-05-23

Status: complete

This audit tracks the current deep pass over the repository for bugs, inconsistencies, drift, documentation issues, and release/process risks. The working tree was checked from `/Users/nicco/Projects/antigravity-awesome-skills` on `main`.

Patch follow-up:

- Resolved in follow-up patches: unsafe archive fallback extraction, Telegram Node vulnerable dependency stack, installer symlink target migration, stale web SEO counts/social card, stale web canonical URL docs, malformed WhatsApp HMAC signature handling, Telegram token-in-URL webhook guidance, `.disabled` web asset publishing, Junta TLS bypasses, legacy manifest verification drift, Telegram HTML escaping, Remotion chart typo, nested skill ID collision coverage, Chinese/localized docs staleness, path-aware internal markdown link repair, and deterministic link/glossary validation reports.
- Still open after these patches: none from this audit report. The legacy strict skill-quality warnings remain tracked as explicit backlog debt behind `tools/config/audit-skills-strict-budget.json`.

## Validation evidence

Passed:

- `npm run validate`
- `npm run validate:strict`
- `npm run validate:references`
- `npm run plugin-compat:check`
- `npm run check:warning-budget`
- `npm run audit:skills`
- `npm run audit:consistency`
- `npm run audit:maintainer` reported version/count/warning/consistency clean, then exited non-zero because this audit report itself is an untracked changed file
- `npm run check:stale-claims`
- `npm run bundles:check`
- `npm run check:readme-credits`
- `npm run security:docs`
- `npm test`
- `npm run test:local`
- `npm run pr:preflight`
- `npm run app:test`
- `npm run app:test:coverage`
- `npm run app:build`
- `cd apps/web-app && npm run lint`
- `cd apps/web-app && npm run verify:seo`
- `npm audit --audit-level=high --omit=dev`
- `npm audit --audit-level=moderate`
- `cd apps/web-app && npm audit --audit-level=moderate`
- `cd data && npm audit --audit-level=moderate`
- `cd skills/loki-mode/examples/todo-app-generated/backend && npm audit --audit-level=moderate`
- `cd skills/loki-mode/examples/todo-app-generated/frontend && npm audit --audit-level=moderate`
- `cd skills/loki-mode/examples/todo-app-generated/backend && npm run build`
- `cd skills/loki-mode/examples/todo-app-generated/frontend && npm run build`
- Temp-copy `npm run build` for `skills/telegram/assets/boilerplate/nodejs`
- Temp-copy `npm run build` for `skills/whatsapp-cloud-api/assets/boilerplate/nodejs`
- Temp-copy `npm audit --audit-level=moderate` for `skills/whatsapp-cloud-api/assets/boilerplate/nodejs`
- `npm pack --dry-run --json`
- `bash scripts/validate-links.sh`
- `python3 -m py_compile` equivalent pass over tracked Python sources, excluding generated mirrors/output
- `bash -n` pass over tracked shell scripts, excluding generated mirrors/output
- `node --check` over tracked JavaScript/CommonJS/ESM source files, excluding generated web output and plugin mirrors
- JSON/JSONL parse over tracked JSON-like files
- Ruby/Psych YAML parse over `.github/workflows/*.yml`, discussion templates, and issue templates
- Ruby/Psych YAML parse over all tracked `*.yml` and `*.yaml`
- Python XML parser over tracked XML/XSD/SVG files
- `actionlint v1.7.12` run from `/tmp` over `.github/workflows/*.yml`
- Global frontmatter parse over all tracked `*SKILL.md` files
- Full-plugin and bundle-plugin file drift checks against canonical `skills/` sources
- Plugin manifest parse/check over `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json`
- Canonical `skills_index.json` ID/path duplicate check
- Targeted typo/refuso scan for common English misspellings across active repo sources, excluding generated output and plugin mirrors
- Tracked temporary/bytecode artifact scan for `__pycache__`, `*.pyc`, `.DS_Store`, `*.tmp`, `*.bak`, and `*.orig`

Observed counts:

- Root visible skills: 1465
- Tracked `*SKILL.md` files: 4559
- Canonical indexed skills: 1465 files, 0 duplicate index IDs, 0 duplicate index paths
- Canonical skill frontmatter: 0 duplicate names, 0 missing `risk`/`source`, 229 missing `date_added`
- Nested indexed skills: 20 entries under second-level category paths such as `skills/game-development/2d-games`, `skills/libreoffice/base`, and `skills/security/aws-iam-best-practices`
- Root `skills_index.json` and `data/skills_index.json`: equal
- `audit:skills`: 1465 scanned, 0 errors, 740 warning-only
- App coverage: 12 test files / 72 tests passed, 89.58% statements, 76.84% branches
- Web app lint: passed with `--max-warnings 0`
- Web app SEO verifier: passed, with the manifest coverage caveat noted below
- Python syntax pass: 1077 files checked, 0 errors
- Shell syntax pass: 61 scripts checked, 0 errors
- JavaScript syntax pass: 74 source files checked, 0 errors
- YAML parse pass: 81 files checked, 0 errors
- XML/XSD/SVG parse pass: 342 files checked, 0 errors
- Tracked symlinks: 7 checked, all targets exist
- Plugin mirror `SKILL.md` files: 3094 matched canonical sources byte-for-byte, 0 drift
- Global tracked skill frontmatter: 4559 `SKILL.md` files parsed, 0 frontmatter errors, 0 missing frontmatter, 0 missing `name`
- Disabled source skills: 34 `skills/.disabled/*/SKILL.md` files present and included in the global frontmatter parse
- Full plugin file drift: 11561 files checked in `plugins/antigravity-awesome-skills*`, 0 missing canonical files, 0 drift
- Bundle plugin file drift: 950 files checked in `plugins/antigravity-bundle-*`, 0 missing canonical files, 0 drift
- Plugin manifests: 76 manifests parsed, 0 missing name/version/reference errors
- Maintainer audit: repository `sickn33/antigravity-awesome-skills`, version `11.5.0`, skills `1,465+`, warning budget `0/135`, consistency clean; tracked working tree clean, but the untracked audit report makes the full gate fail until added/removed
- Stale-claims checker: no stale claims detected in active docs
- Editorial bundles: manifest and generated doc are in sync
- README credits check: no changed skill files detected
- Telegram and WhatsApp TypeScript boilerplates build successfully in temp copies after `npm install --ignore-scripts`
- WhatsApp TypeScript boilerplate temp-copy moderate audit: `0 vulnerabilities`

Failed / issue-producing checks:

- Temp-copy `npm audit --audit-level=moderate` for `skills/telegram/assets/boilerplate/nodejs`: 5 vulnerabilities, including 1 critical (`form-data <2.5.4`) through `node-telegram-bot-api -> @cypress/request-promise -> request`
- `npm run audit:skills:strict`: 1465 scanned, 0 errors, but 740 warning-only skills / 865 warnings made the strict audit exit non-zero
- Strict JSON parsing found 5 JSONC-style files with comments: `apps/web-app/tsconfig.json` plus the canonical and mirrored `typescript-expert/references/tsconfig-strict.json` files
- Targeted typo scan found one confirmed source typo: `skills/remotion-best-practices/rules/charts.md:20`

## Findings

### High - archive refresh fallback extracts untrusted archives without path validation

- File: `apps/web-app/refresh-skills-plugin.js`
- Lines: `220-261`
- Evidence: `syncWithArchive()` downloads GitHub tar/zip archives and extracts them with `tar -xzf`, `Expand-Archive`, or `unzip -o` directly into `update_temp`.
- Risk: an archive containing path traversal entries or malicious symlinks can write outside the intended extraction root before the code checks for `antigravity-awesome-skills-main/skills`.
- Current tests: `apps/web-app/src/__tests__/refresh-skills-plugin.security.test.js` covers loopback/auth and fast-forward behavior but does not cover archive extraction safety.
- Suggested fix: replace shell extraction with a safe extraction helper that rejects absolute paths, `..` segments, unsafe symlinks, and post-extraction realpaths outside `update_temp`; add tar/zip regression tests.

### High - Telegram Node boilerplate resolves a vulnerable request stack

- File: `skills/telegram/assets/boilerplate/nodejs/package.json`
- Lines: `11-21`
- Evidence: a temp-copy install/audit of this package reported 5 vulnerabilities: critical `form-data <2.5.4`, moderate `request`, `qs`, `tough-cookie`, and `uuid`. `npm ls` traces the critical path through `node-telegram-bot-api@0.66.0 -> @cypress/request-promise@5.0.0 -> request@2.88.2 -> form-data@2.3.3`.
- Risk: users following this boilerplate get a vulnerable dependency graph even though the boilerplate TypeScript itself compiles.
- Current tests: the root dependency audits do not cover this package because it has no committed lockfile and is not part of the root workspace install.
- Suggested fix: replace `node-telegram-bot-api` with a maintained Telegram client that does not depend on deprecated `request`, or commit a tested lockfile/override strategy that removes the vulnerable transitive versions.

### Medium - full-repo install migration preserves target symlinks

- File: `tools/bin/install.js`
- Lines: `474-493`
- Evidence: when `target.path/.git` exists and `target.path` itself is a symlink, the migration renames the symlink to a backup and then recreates the same symlink at `target.path`.
- Risk: this diverges from the non-symlink migration path, where a fresh directory is created. Subsequent writes continue through the symlink target, which is surprising during a "skills-only layout" migration and weaker as a trust boundary.
- Suggested fix: either reject symlinked full-repo migration targets with a clear error, or materialize a real directory at `target.path` after backing up the symlink.

### Medium - prerendered web app SEO count is stale

- File: `apps/web-app/scripts/prerender-routes.js`
- Lines: `12`, `156-159`
- Evidence: `HOME_CATALOG_COUNT` is `1273` and the generated title is hardcoded to `1,273+`, while the current registry has 1465 skills. The checked `apps/web-app/dist/index.html` contains `1,273+ installable AI skills catalog`.
- Risk: search/social metadata undersells the catalog and drifts from README/CATALOG counts.
- Suggested fix: derive the title count from the actual `skills.json` count used by prerendering, or update the constant/title together with generated assets.

### Medium - source web metadata and social card are stale before prerendering

- Files: `apps/web-app/index.html`, `apps/web-app/public/social-card.svg`
- Evidence: `index.html` still contains `1,326+` in title, description, Open Graph, and Twitter metadata. `social-card.svg` also displays `1,326+ Agentic Skills` and describes a `1,326 plus` headline.
- Risk: the built homepage is partially corrected by prerendering, but source metadata, fallback HTML, and social preview assets remain stale and can leak into previews or static hosting paths.
- Suggested fix: derive counts from the same generated registry source used by the app, or update these assets during the web asset sync step.

### Medium - app environment docs name an unused canonical URL variable

- File: `apps/web-app/README.md`
- Line: `59`
- Evidence: the README documents `VITE_SITE_URL`, but `apps/web-app/scripts/generate-sitemap.js` reads `SEO_SITE_URL || WEBSITE_BASE_URL` and `apps/web-app/scripts/prerender-routes.js` reads `SEO_SITE_URL`.
- Risk: maintainers testing non-default hosts may set an environment variable that has no effect on sitemap/prerender canonical URLs.
- Suggested fix: document `SEO_SITE_URL` and optionally `WEBSITE_BASE_URL`; remove or implement `VITE_SITE_URL`.

### Medium - WhatsApp webhook HMAC validation throws on malformed signature length

- File: `skills/whatsapp-cloud-api/assets/boilerplate/nodejs/src/webhook-handler.ts`
- Lines: `38-41`
- Evidence: `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))` is called without first checking that the two buffers have the same byte length. A direct Node check with a short signature throws `RangeError: Input buffers must have the same byte length`.
- Risk: malformed `x-hub-signature-256` headers can turn an invalid webhook request into an exception/500 path instead of a clean `401`, creating avoidable error noise and a small DoS surface.
- Suggested fix: validate the `sha256=<64 hex chars>` shape before comparison, or compare only after checking equal buffer lengths; return `401` for malformed signatures.

### Medium - Telegram webhook URL embeds the bot token

- File: `skills/telegram/assets/boilerplate/nodejs/src/bot-client.ts`
- Lines: `24-45`
- Evidence: the Express route and registered webhook URL both use `/webhook/${this.token}` while Telegram already supports `secret_token`.
- Risk: bot tokens placed in URL paths are likely to appear in reverse-proxy logs, request logs, telemetry, browser history, and webhook provider dashboards. The optional secret header loses much of its value if the bearer token itself is the path secret.
- Suggested fix: use a random non-secret route ID or fixed `/webhook` route plus `x-telegram-bot-api-secret-token`; never include the bot token in URLs.

### Medium - strict skill audit is not clean even though standard gates pass

Resolved in follow-up patch: `npm run audit:skills:strict` now enforces a versioned warning budget in `tools/config/audit-skills-strict-budget.json`, with explicit limits for total warnings, warning-only skills, and the top strict finding codes. The current legacy baseline is documented and the command fails on errors or warning regressions above that budget.

- Command: `npm run audit:skills:strict`
- Evidence: strict mode scanned 1465 skills and found 0 errors, but still exited non-zero because 740 skills are warning-only with 865 total warnings. Top findings were `risk_suggestion` (1013), `missing_examples` (387), and `skill_too_long` (193).
- Risk: regular validation and warning-budget gates can look clean while the stricter skill-quality bar is materially unmet.
- Suggested fix: either wire a consciously scoped subset of strict findings into CI/release gating, or document strict mode as an advisory backlog with explicit thresholds and owners.

### Medium - web asset setup publishes disabled skills as static files

- File: `tools/scripts/setup_web.js`
- Lines: `70-80`
- Evidence: `app:setup` copies the entire `skills/` directory into `apps/web-app/public/skills` without excluding dot directories. Current generated assets contain `apps/web-app/public/skills/.disabled` and `apps/web-app/dist/skills/.disabled`, each around 17 MiB, with 1294 files copied from 34 disabled skill directories. `skills_index.json` correctly excludes `.disabled` and reports 0 disabled entries.
- Risk: disabled skills are not shown in the catalog but are still shipped as static web assets and can be fetched directly by path, which conflicts with the validator/indexer semantics that hidden/disabled directories are excluded.
- Suggested fix: make `copyFolderSync()` skip dot-prefixed directories, or explicitly skip `.disabled` when copying web assets; add a web setup test that asserts `public/skills/.disabled` is absent after `app:setup`.

### Low - Junta scrapers bypass the shared TLS verification switch

- Files: `skills/junta-leiloeiros/scripts/scraper/jucisrs.py`, `skills/junta-leiloeiros/scripts/scraper/jucesp.py`, `skills/junta-leiloeiros/scripts/scraper/jucema.py`
- Lines: `jucisrs.py:178-182`, `jucisrs.py:223-229`, `jucisrs.py:245-257`, `jucesp.py:115-121`, `jucema.py:161-169`
- Evidence: `base_scraper.py` provides `should_verify_tls()` and tests assert TLS verification is enabled by default, but these state-specific scrapers instantiate `httpx.AsyncClient(verify=False)` or Playwright with `ignore_https_errors=True` directly.
- Risk: the test suite proves the shared base helper default, but not the actual transport behavior of these scraper implementations; network interception can still tamper with scraper input by default.
- Suggested fix: replace direct `verify=False` / `ignore_https_errors=True` with `should_verify_tls()` in state-specific scrapers, and extend `test_junta_tls_security.py` to scan or monkeypatch concrete scraper clients.

### Low - nested skill IDs lose their category namespace in generated routes

- Files: `tools/scripts/generate_index.py`, `apps/web-app/src/pages/SkillDetail.tsx`, `apps/web-app/src/components/SkillCard.tsx`
- Lines: `generate_index.py:879-887`, `SkillDetail.tsx:61-79`, `SkillCard.tsx:16`
- Evidence: `generate_index.py` sets each skill `id` to `os.path.basename(root)` while keeping the full nested path separately. The current index has 20 nested skills, including `base => skills/libreoffice/base`, `templates => skills/app-builder/templates`, and `2d-games => skills/game-development/2d-games`. The web app routes to `/skill/${skill.id}` and resolves detail pages with `skills.find(s => s.id === id)`.
- Risk: there are currently 0 duplicate IDs, so this is not breaking today. A future top-level `base`, another nested `base`, or similarly generic nested name would create an ambiguous route/star/canonical-ID collision because the public ID omits the category namespace.
- Suggested fix: either generate route-safe IDs from the relative path for nested skills, or add a uniqueness test that fails when any future nested basename collides with another indexed skill.

### Low - SEO verifier checks a legacy manifest filename, not the linked manifest

- Files: `apps/web-app/index.html`, `apps/web-app/scripts/verify-seo-assets.js`, `.github/workflows/pages.yml`
- Evidence: `index.html` links `%BASE_URL%site.webmanifest`, while `verify-seo-assets.js` and the Pages workflow check `dist/manifest.webmanifest`. Both files currently exist, so the gate passes, but it does not prove the linked manifest is present.
- Risk: a future build could break `site.webmanifest` while the verifier still passes because `manifest.webmanifest` remains.
- Suggested fix: make the verifier and Pages workflow check `site.webmanifest`, or explicitly verify every manifest referenced by `index.html`.

### Low - Telegram HTML messages interpolate display names without escaping

- File: `skills/telegram/assets/boilerplate/nodejs/src/handlers.ts`
- Lines: `8-14`, `31-37`
- Evidence: `/start` injects `msg.from?.first_name` into a message sent with `parse_mode: 'HTML'`; `/about` does the same with bot profile fields.
- Risk: Telegram display names containing `<`, `>`, or `&` can break formatting, cause send failures, or create unintended markup in generated bot replies.
- Suggested fix: HTML-escape interpolated values whenever `parse_mode: 'HTML'` is used, or switch these messages to plain text/Markdown with appropriate escaping.

### Low - Chinese documentation is release/count stale

- Files: `docs_zh-CN/README.md`, `docs_zh-CN/users/getting-started.md`, `docs_zh-CN/final-validation-report.md`
- Evidence: English docs and package metadata are at `11.5.0` / `1465`, while `docs_zh-CN/README.md` is synced to `10.7.0` / `1436`, contains an internal mention of version `8.10.0`, and `docs_zh-CN/users/getting-started.md` still says `V10.7.0`. `docs_zh-CN/final-validation-report.md` is also for `V8.10.0`.
- Risk: localized entry points give outdated release and catalog information.
- Suggested fix: either refresh translated docs after canonical English updates or mark old translation reports as historical snapshots so they are not read as current documentation.

### Low - internal markdown links are broken in integration and localized docs

- Files: `docs/integrations/jetski-gemini-loader/README.md`, `docs_zh-CN/README.md`, `docs/vietnamese/*.vi.md`, `docs_zh-CN/integrations/jetski-gemini-loader/README.md`
- Evidence: a relative-path-aware local scan over `README.md`, `docs/`, and `docs_zh-CN/` found 105 broken internal links. Confirmed examples:
  - `docs/integrations/jetski-gemini-loader/README.md` links to `../../docs/integrations/jetski-cortex.md`, which resolves to nonexistent `docs/docs/integrations/jetski-cortex.md`; the real target is `docs/integrations/jetski-cortex.md`.
  - `docs_zh-CN/README.md` links to paths such as `docs/users/bundles.md`, which resolve under `docs_zh-CN/docs/...` instead of the repo root.
- Risk: GitHub users following localized or integration docs hit dead links even though the current `validate:references` gate passes.
- Suggested fix: add a path-aware markdown link checker to CI, then repair localized relative paths and the Jetski integration link.

### Low - Remotion chart rule has a visible typo

- File: `skills/remotion-best-practices/rules/charts.md`
- Line: `20`
- Evidence: the sentence reads `See Bar Chart Example for a basic example implmentation.`
- Risk: low editorial quality issue in a user-facing skill rule.
- Suggested fix: change `implmentation` to `implementation`.

### Low - link validation script writes a stale, machine-specific translated report

- Files: `scripts/validate-links.sh`, `docs_zh-CN/link-validation-report.txt`
- Evidence: `scripts/validate-links.sh` writes `docs_zh-CN/link-validation-report.txt` with a timestamp and absolute local paths. The script labels this as a translated report but scans `docs/`, not `docs_zh-CN/`, and resolves internal links by basename only. The script itself notes that links such as `../../CATALOG.md` can be false positives.
- Risk: rerunning the script creates non-portable tracked drift and produces a report that can mix real broken links with known false positives.
- Suggested fix: either make the report deterministic and unambiguous, or stop tracking it. Resolve links relative to each source file and run separate checks for canonical docs and translated docs.

### Low - deliberate pipe-to-shell examples remain allowlisted

Resolved in follow-up patch: executable `curl|bash`, `curl|sh`, and `irm|iex` install examples in canonical skill sources were replaced with package-manager or download-inspect-execute flows, and obsolete pipe-to-shell allowlists were removed. The remaining `security-allowlist` comments cover non-pipe rule families or sandbox notes.

- Files include `skills/bun-development/SKILL.md`, `skills/linkerd-patterns/SKILL.md`, `skills/cloud-penetration-testing/SKILL.md`, `skills/varlock/SKILL.md`, `skills/evolution/SKILL.md`, and plugin mirrors.
- Evidence: `npm run security:docs` passes because these examples are allowlisted, but the repo still contains executable `curl|bash`, `curl|sh`, and `irm|iex` examples.
- Risk: this is accepted by current policy, but remains risky guidance for automated agents.
- Suggested fix: where practical, replace executable pipe-to-shell examples with package-manager or checksum-verified alternatives; keep allowlists only where no safe practical alternative exists.

### Low - documentation examples use realistic-looking secret placeholders

Resolved in follow-up patch: canonical examples now use `<AWS_ACCESS_KEY_ID>`, `<AWS_SECRET_ACCESS_KEY>`, and `<BASE64_PRIVATE_KEY>`, and `npm run security:docs` blocks those realistic placeholder patterns from returning.

- Files include `skills/comfyui-gateway/references/integration.md`, `skills/security/aws-iam-best-practices/SKILL.md`, `skills/k8s-manifest-generator/resources/implementation-playbook.md`, and plugin mirrors.
- Evidence: secret-pattern scanning found `AKIAIOSFODNN7EXAMPLE`, `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`, and `-----BEGIN PRIVATE KEY-----` examples. These are not confirmed live secrets: the AWS values are standard examples and the private key block is an ellipsis placeholder.
- Risk: realistic secret-looking examples can create noisy secret-scan alerts and make it harder to distinguish documentation placeholders from real leaks.
- Suggested fix: replace realistic credential examples with unmistakable placeholders such as `<AWS_ACCESS_KEY_ID>`, `<AWS_SECRET_ACCESS_KEY>`, and `<BASE64_PRIVATE_KEY>`.

## Non-findings / bounded checks

- The apparent `--- ` frontmatter prefix in eight skills is accepted by the repo parser (`^---\s*\n`) and those skills are indexed, so this is not currently a validator bug.
- Duplicate names under `skills/.disabled` are intentionally skipped by validator/index generation.
- Root npm production audit reported `0 vulnerabilities`.
- Root, web app, and data package moderate audits reported `0 vulnerabilities`.
- Loki todo-app frontend and backend moderate audits reported `0 vulnerabilities`.
- Loki todo-app frontend and backend builds completed successfully.
- Telegram and WhatsApp Node boilerplates compile successfully when installed in temp copies.
- WhatsApp Node boilerplate moderate audit reported `0 vulnerabilities` in a temp copy.
- Python syntax checking found 0 errors across 1077 source files.
- Shell syntax checking found 0 errors across 61 shell scripts.
- JavaScript syntax checking found 0 errors across 74 source files.
- YAML and XML-family parse checks found 0 syntax errors in tracked files.
- The 7 tracked symlinks all resolve to in-repo targets.
- The strict JSON parse failures are JSONC/commented config files rather than malformed runtime JSON; TypeScript accepts `tsconfig.json` comments, and the commented `tsconfig-strict.json` is a reference artifact mirrored byte-for-byte.
- Plugin mirror skill files are byte-for-byte synchronized with canonical `skills/` sources: 3094 matched, 0 drift.
- Full-library plugin skill counts differ from the root visible catalog intentionally: the Codex plugin advertises `1,429 plugin-safe skills`, and omitted root skills are compatibility-filtered rather than missing files.
- Duplicate `name` values across all tracked `SKILL.md` files are expected because canonical skills are copied into full plugins and bundle plugins; canonical-vs-plugin byte checks found no content drift.
- All 76 plugin manifests parsed with required identity/version fields present.
- `npm run audit:maintainer` did not reveal a repo health issue beyond the intentional untracked audit report; `git status --porcelain --untracked-files=no` was clean.
- `npm pack --dry-run --json` produced the expected installer-only package contents: `LICENSE`, `README.md`, `package.json`, `tools/bin/install.js`, and `tools/lib/*`.
- No tracked temporary/bytecode/macOS artifact files were found for `__pycache__`, `*.pyc`, `*.pyo`, `.DS_Store`, `*.tmp`, `*.bak`, or `*.orig`.
- The targeted common-typo scan produced two `Teh` matches that are a person's surname in the Geoffrey Hinton skill, not typos.
