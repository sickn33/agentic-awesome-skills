---
name: wp-guard
description: "Review WordPress code for escaping, sanitization, nonces, prepared queries, i18n, and performance."---

# WP Guard

You are reviewing generated or changed WordPress code before it ships. Apply the rules below as a guard pass after the first implementation pass. Be a sharp reviewer, not a pedantic one: flag what creates vulnerabilities, breaks translations, or melts servers — ignore cosmetic preferences WPCS tooling already handles.

These rules exist because AI agents produce WordPress code with systematic failures: raw `echo` of request data, AJAX handlers with neither nonce nor capability check, SQL built by string interpolation, English hardcoded into user-facing strings, `posts_per_page => -1` on sites with a million posts, and hand-rolled replacements for APIs core already ships. Each one looks fine in a demo and fails in production.

## How to use this skill

**Guard-pass mode** (recommended): after WordPress code has been generated or edited, apply the rules to the diff or target files, then run the self-check before delivery. Fix violations before showing the user.

**Live mode** (explicit): when the user invokes this skill before writing WordPress code, apply the same rules while writing, then run the self-check before delivery.

**Review mode** (the user asks you to review, audit, or rate WordPress code): walk [references/review-checklist.md](references/review-checklist.md) against the target files and produce a structured findings report. Do not edit code in review mode unless asked.

Pair this skill with clean-code-guard when both are installed: clean-code-guard owns generic code quality; wp-guard owns the WordPress layer.

## Adapt to the project first

1. Read the project's agent instructions (CLAUDE.md, AGENTS.md), `phpcs.xml`/WPCS config, and `composer.json`. Project conventions win on conflict.
2. Identify the established prefix (functions, options, meta keys, handles) and the minimum supported WP/PHP versions. Match both.
3. Detect context: WooCommerce APIs in play → apply woo-guard alongside this skill when it is installed; otherwise apply WooCommerce's HPOS, CRUD, and checkout rules from its developer documentation. Multilingual site (WPML/Polylang/multisite) → i18n rules are blocking, not advisory.
4. Read one neighboring file before writing. Mirror its error handling, hook registration style, and escaping habits — unless they violate the security rules below, which are non-negotiable.

## The Rules

### Security — must fix, no exceptions

1. **Escape late, escape everything.** Every variable crossing into HTML output goes through the context-correct function: `esc_html()`, `esc_attr()`, `esc_url()`, or `wp_kses()`/`wp_kses_post()` for rich content. Data passed to inline JS goes through `wp_json_encode()` + `wp_add_inline_script()` — `esc_js()` is legacy, for single-quoted strings in inline attributes only. Escaping happens at output, not at storage. `echo $anything;` without an `esc_*` wrapper fails review.

2. **Sanitize early, and unslash first.** Request data (`$_POST`, `$_GET`, `$_REQUEST`, `$_SERVER`) never touches logic raw: `wp_unslash()` first, then the type-correct sanitizer (`sanitize_text_field()`, `sanitize_key()`, `absint()`, `sanitize_email()`, …). Sanitization is not escaping; doing one never excuses the other.

3. **Every state change proves identity and intent.** Form handlers, AJAX endpoints, and REST routes that change anything require BOTH a capability check (`current_user_can()`) AND a nonce (`check_admin_referer()`, `check_ajax_referer()`, or REST nonce handling). A nonce is not authorization. A REST `permission_callback` of `__return_true` on a writing route fails review.

4. **`$wpdb->prepare()` for every query containing a variable.** Placeholders (`%s`, `%d`, `%f`, and `%i` for identifiers on WP ≥ 6.2), never interpolation or concatenation. Prefer `WP_Query`, the meta and options APIs over raw SQL when they can express the query.

### Core API discipline

5. **Use the platform; don't reinvent it.** Outbound HTTP via `wp_remote_get()`/`wp_remote_post()`, never curl. Assets via `wp_enqueue_script()`/`wp_enqueue_style()`, never echoed `<script>`/`<style>` tags. Scheduling via WP-Cron or Action Scheduler. Redirects via `wp_safe_redirect()` followed by `exit`. File writes via `WP_Filesystem`. Simple persistent data via options/transients, not a custom table.

6. **Verify every hook and function exists.** Before `add_action()`, `add_filter()`, or calling a core/plugin function, confirm it exists in the supported versions — read the source or the project's installed code. Hallucinated hooks fail silently in WordPress: no error, no behavior. Also match the hook to the moment — front-end code does not load on `admin_init`, queries do not run before `init` expects them.

7. **Prefix or namespace everything public.** Functions, classes, options, transients, meta keys, script handles, AJAX actions, REST namespaces — all carry the project prefix. Generic names (`get_settings`, `data`, `api_key`) are collisions waiting for the next active plugin.

8. **Guard direct access.** Every PHP file that does work starts with the `ABSPATH` check (or equivalent project convention).

### Internationalization

9. **Every user-facing string is translation-ready.** The correct wrapper for the context (`__()`, `_e()`, `_x()`, `_n()`, or the escaping combos `esc_html__()`, `esc_attr__()`), a literal text domain matching the plugin slug — never a variable or constant — translator comments on every placeholder, `_n()` for plurals (never `sprintf` with a hardcoded singular/plural choice), and no sentence assembly by concatenation. Dates and numbers through `date_i18n()`/`wp_date()` and `number_format_i18n()`. Details and JS i18n: [references/i18n.md](references/i18n.md).

### Performance

10. **Query discipline.** No `posts_per_page => -1` and no `query_posts()`, ever. Use `'fields' => 'ids'` when only IDs are needed, `'no_found_rows' => true` when not paginating, and never query inside a loop what could be primed once (meta/term caches). Details: [references/performance.md](references/performance.md).

11. **Cache expensive work, load assets where used.** Remote calls and heavy computations go behind transients or the object cache with a deliberate TTL. Options that are large or rarely read register with `autoload => false`. Scripts and styles enqueue only on the screens that use them.

## Self-check before delivery

1. Grep your diff for `echo`, `print`, `<?=`: is every variable output escaped with the context-correct function?
2. Grep for `$_POST`, `$_GET`, `$_REQUEST`: unslashed? sanitized? nonce-verified? capability-checked?
3. Grep for `$wpdb->`: every variable behind a placeholder?
4. Any user-facing string outside an i18n wrapper? Any non-literal text domain?
5. Any hook or function you did not verify exists?
6. Any unbounded query, uncached remote call, or unconditional enqueue?
7. Does every new public name carry the project prefix?
8. Would this survive WPCS (`WordPress-Extra` + `WordPress-Security`) without warnings you cannot justify?

If any answer is wrong, fix it before showing the user.

## Reporting format (review mode)

```
**Rule N violation** in `path/file.php:<line or function>`
- What: <one sentence>
- Risk: <XSS / SQLi / CSRF / broken i18n / scaling — one phrase>
- Fix: <one sentence>
```

Group by file, lead with security findings. If a file is clean, don't mention it.

## Severity guide

- **Must fix:** Rules 1–4 — these are exploitable (XSS, SQLi, CSRF, privilege escalation)
- **Should fix:** Rules 5–9 — conflicts, silent failures, untranslatable releases
- **Worth noting:** Rules 10–11 — they decide whether the code survives traffic; block on them for code that runs on every request

## References

- [references/security.md](references/security.md) — escaping/sanitization function tables, nonce lifecycle, REST permissions, `$wpdb->prepare` details, file uploads
- [references/i18n.md](references/i18n.md) — wrapper selection, text domain rules, plurals, translator comments, JS translations, RTL, multilingual-plugin gotchas
- [references/performance.md](references/performance.md) — WP_Query flags, transients vs object cache, autoload hygiene, asset loading, cron, scaling traps
- [references/review-checklist.md](references/review-checklist.md) — structured walk-through for review mode
- [references/sources.md](references/sources.md) — handbook and research URLs; read only when citing a source

## What this skill does not do

- Run PHPCS, PHPStan, or Plugin Check — use the project's tooling for mechanical verification; this skill is the judgment layer above it.
- Decide plugin architecture or business logic — it guards how WordPress code ships, not what it does.
- Replace clean-code-guard or test-guard — generic code quality and test quality remain their jurisdiction.
