# WP Guard — Security Reference

## Contents

- Escaping: context → function
- Sanitization: input type → function
- The unslash-then-sanitize order
- Nonce + capability lifecycle
- REST API permissions
- $wpdb->prepare details
- File uploads
- Common AI-generated violations

## Escaping: context → function

Escape at the moment of output, with the function matching the destination context:

| Output context | Function |
|---|---|
| HTML body text | `esc_html()` |
| HTML attribute | `esc_attr()` |
| URL (href/src/action) | `esc_url()` (display) / `esc_url_raw()` (storage/redirects) |
| Data for inline JS | `wp_json_encode()` + `wp_add_inline_script()`; `esc_js()` is legacy |
| Textarea content | `esc_textarea()` |
| Rich/user HTML | `wp_kses_post()` or `wp_kses()` with an explicit allowlist |
| Translation + output | `esc_html__()`, `esc_html_e()`, `esc_attr__()` — escape and translate in one call |

Trust nothing at output time — not even your own stored options; another plugin or a compromised import may have written them. "Escaped on save" is not a defense.

## Sanitization: input type → function

| Expected input | Function |
|---|---|
| Plain text line | `sanitize_text_field()` |
| Multiline text | `sanitize_textarea_field()` |
| Integer / ID | `absint()` or `intval()` |
| Slug/key | `sanitize_key()` / `sanitize_title()` |
| Email | `sanitize_email()` + `is_email()` check |
| URL | `esc_url_raw()` |
| HTML payload | `wp_kses_post()` / `wp_kses()` |
| File name | `sanitize_file_name()` |
| Anything enumerable | strict allowlist comparison (`in_array( $v, $allowed, true )`) |

## The unslash-then-sanitize order

WordPress adds slashes to superglobals. The correct pipeline is always:

```php
$status = sanitize_key( wp_unslash( $_POST['ncs_status'] ?? '' ) );
```

`wp_unslash()` first, sanitizer second. Sanitizing slashed data corrupts legitimate input and hides bugs.

## Nonce + capability lifecycle

Both checks, always, for any state change. They answer different questions:

- `current_user_can( 'manage_options' )` — is this user *allowed* to do this? (authorization)
- `check_admin_referer( 'ncs_save_settings' )` / `check_ajax_referer( 'ncs_action', 'nonce' )` — did this request *intend* this action? (CSRF protection)

A nonce without a capability check lets any logged-in subscriber fire admin actions. A capability check without a nonce leaves CSRF open. AI-generated handlers routinely have one, the other, or neither — verify both exist on every `admin_post_*`, `wp_ajax_*`, and form handler.

Generate nonces with `wp_nonce_field()` (forms) or `wp_create_nonce()` (AJAX/REST payloads). Nonces are per-user and time-limited; do not cache pages containing them.

## REST API permissions

- Every route registers a real `permission_callback`. `__return_true` is acceptable only for genuinely public read-only data — never for writes.
- Validate and sanitize via the route's `args` schema (`validate_callback`, `sanitize_callback`) instead of manual checks inside the handler.
- Cookie-authenticated REST requests require the `X-WP-Nonce` header (`wp_rest` nonce); custom auth schemes must fail closed.

## $wpdb->prepare details

```php
$row = $wpdb->get_row(
	$wpdb->prepare(
		"SELECT * FROM {$wpdb->prefix}ncs_log WHERE user_id = %d AND event = %s",
		$user_id,
		$event
	)
);
```

- Placeholders: `%s`, `%d`, `%f`; `%i` for table/column identifiers (WP ≥ 6.2).
- `IN ( … )` lists: build placeholders dynamically — `implode( ',', array_fill( 0, count( $ids ), '%d' ) )` — then prepare with the spread array.
- LIKE queries: `$wpdb->esc_like()` the term *before* passing it as a `%s` parameter.
- Never interpolate `$_REQUEST` data anywhere near SQL, even "validated" data.
- Prefer `WP_Query`, `get_posts()`, meta/term/option APIs when they can express the query — they bring caching for free.

## File uploads

Use `wp_handle_upload()` / media APIs — never move `$_FILES` manually. Validate type with `wp_check_filetype_and_ext()` against an allowlist; never trust the client MIME. Store outside executable paths; WordPress handles this when you use its APIs.

## Common AI-generated violations

1. `echo '<div>' . $title . '</div>';` — unescaped output (Rule 1). Published research: XSS appears in 86% of AI generations tested on XSS-prone tasks.
2. `wp_ajax_` handler with neither `check_ajax_referer()` nor `current_user_can()` (Rule 3).
3. `"SELECT * FROM {$wpdb->posts} WHERE post_title = '$title'"` — interpolated SQL (Rule 4).
4. `permission_callback => '__return_true'` on a POST route (Rule 3).
5. `curl_init()` inside a plugin (Rule 5) — breaks proxies, blocks, and filters that `wp_remote_*` honors.
6. Echoed `<script>` blocks with interpolated PHP — combines Rules 1 and 5; use `wp_enqueue_script()` + `wp_add_inline_script()`/`wp_localize_script()`.
