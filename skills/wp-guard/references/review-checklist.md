# WP Guard — Review Checklist

Structured walk for review mode. Lead with findings, not summary. Cite file:line. Prioritize: security → silent breakage → i18n → performance.

## Contents

- Pass 1: Security sweep
- Pass 2: API and hook correctness
- Pass 3: i18n
- Pass 4: Performance
- Pass 5: Packaging hygiene
- Reporting

## Pass 1: Security sweep (must fix)

Grep-driven; check every hit:

- `echo`, `print`, `<?=`, `printf` — every variable escaped with the context-correct `esc_*`/`wp_kses`? (Rule 1)
- `$_POST`, `$_GET`, `$_REQUEST`, `$_SERVER`, `$_COOKIE` — `wp_unslash()` then sanitized? (Rule 2)
- `add_action( 'wp_ajax_`, `admin_post_`, `rest_api_init` — every state-changing handler has BOTH `current_user_can()` and a nonce check / real `permission_callback`? (Rule 3)
- `$wpdb->` — every variable behind `prepare()` placeholders? `esc_like()` for LIKE? (Rule 4)
- `$_FILES` — handled via `wp_handle_upload()` with type allowlist?
- Secrets: API keys hardcoded? Logged? In autoloaded options when they belong in constants/env?

## Pass 2: API and hook correctness (should fix)

- Every hooked hook and called function exists in supported WP/plugin versions? (Rule 6 — hallucinated hooks fail silently)
- Hook timing right? (No front-end work on admin hooks, no early queries, no `init`-heavy work per request)
- Core API replacements: curl, raw `<script>` echoes, manual cron loops, direct file ops? (Rule 5)
- Prefixes on every public name: functions, options, transients, meta keys, handles, AJAX actions? (Rule 7)
- `ABSPATH` guard present in working files? (Rule 8)
- `wp_safe_redirect()` + `exit` after state changes?

## Pass 3: i18n (should fix; blocking on multilingual projects)

- User-facing strings without wrappers? Wrong/non-literal text domain? (Rule 9)
- Placeholders without translator comments? Plural logic without `_n()`?
- Concatenated sentence fragments?
- Stored user-facing strings (options/meta) that multilingual plugins can't see? (see [i18n.md](i18n.md))
- Raw `date()`/`number_format()` for display?

## Pass 4: Performance (worth noting; blocking on every-request paths)

- `posts_per_page => -1`, `query_posts()`, unbounded `get_users()`/`get_terms()`? (Rule 10)
- Queries or `get_post_meta()` inside loops without cache priming?
- Remote calls without transient/object caching? (Rule 11)
- Large options autoloading? Unconditional asset enqueues?

## Pass 5: Packaging hygiene

- WooCommerce code in scope → hand off to woo-guard when it is installed; otherwise apply WooCommerce's HPOS, CRUD, checkout, and money rules from its developer documentation.
- Activation/deactivation/uninstall: scheduled events cleared, transients cleaned, uninstall removes its data?
- Direct entry files, readme version mismatches, debug code (`error_log`, `var_dump`) left in?

## Reporting

Use the SKILL.md reporting format. Lead with the security findings and an overall verdict (merge / fix first / do not merge). End with at most three positives worth keeping — reviewers who only list faults get ignored.
