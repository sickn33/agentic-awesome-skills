# WP Guard — Internationalization Reference

## Contents

- Wrapper selection
- Text domain rules
- Placeholders and translator comments
- Plurals
- Sentence assembly
- JavaScript i18n
- Dates, numbers, RTL
- Multilingual-plugin gotchas

## Wrapper selection

| Situation | Use |
|---|---|
| Return a translated string | `__( 'Text', 'my-plugin' )` |
| Echo a translated string | `_e( 'Text', 'my-plugin' )` — or better, `esc_html_e()` |
| Translate + escape for HTML | `esc_html__()` / `esc_html_e()` |
| Translate + escape for attribute | `esc_attr__()` / `esc_attr_e()` |
| Ambiguous word needing context | `_x( 'Post', 'verb', 'my-plugin' )` |
| Plural | `_n( '%s item', '%s items', $count, 'my-plugin' )` |
| Plural + context | `_nx()` |

When a string is both translated and output, the combined wrappers (`esc_html__`) are required — translations are untrusted input like any other (a compromised translation file is an XSS vector).

## Text domain rules

- Literal string, always: `__( 'Text', 'my-plugin' )`. Never `__( 'Text', PLUGIN_DOMAIN )`, never a variable — static analysis tools and translate.wordpress.org both fail on non-literal domains.
- Must match the plugin slug exactly (the WordPress.org directory enforces this).
- One domain per plugin/theme. AI agents copying snippets from other projects routinely import foreign text domains — grep for domains that don't match the project's.

## Placeholders and translator comments

```php
/* translators: 1: customer name, 2: order number. */
$message = sprintf(
	__( 'Hi %1$s, your order #%2$d is on its way.', 'my-plugin' ),
	$customer_name,
	$order_id
);
```

- Numbered placeholders (`%1$s`) whenever there is more than one — translators reorder words.
- A `/* translators: … */` comment on every string with placeholders, immediately above the line.
- Never put variables or HTML soup inside the translatable string when it can sit outside.

## Plurals

`_n()` exists because languages have between one and six plural forms. Never:

```php
// Wrong — English-only logic.
$label = $count === 1 ? __( 'item', 'my-plugin' ) : __( 'items', 'my-plugin' );
```

Always `_n( '%s item', '%s items', $count, 'my-plugin' )`, then `sprintf()` with `number_format_i18n( $count )`.

## Sentence assembly

Never build sentences by concatenation — word order differs across languages:

```php
// Wrong: translators get fragments they cannot reorder.
echo __( 'Imported', 'my-plugin' ) . ' ' . $count . ' ' . __( 'products', 'my-plugin' );

// Right: one string, one placeholder, full context.
/* translators: %s: number of imported products. */
printf( esc_html__( 'Imported %s products.', 'my-plugin' ), number_format_i18n( $count ) );
```

## JavaScript i18n

- `wp_set_script_translations( 'my-handle', 'my-plugin' )` after enqueueing; use `__()` from `@wordpress/i18n` in the JS.
- Legacy pattern (`wp_localize_script` with pre-translated strings) is acceptable in legacy codebases — match the project.

## Dates, numbers, RTL

- Dates: `wp_date()` / `date_i18n()` with the site's format options — never raw `date()` for display.
- Numbers: `number_format_i18n()`.
- CSS: logical properties (`margin-inline-start`, not `margin-left`) for new styles; don't hand-write directional CSS — build `-rtl.css` files with RTLCSS. Auto-loading them applies only to core styles and block.json-registered styles; classic plugin/theme handles must opt in with `wp_style_add_data( $handle, 'rtl', 'replace' )`.

## Multilingual-plugin gotchas (WPML / Polylang)

- Strings stored in options/meta are NOT translated by `__()` — they need string registration (WPML String Translation / `pll_register_string`). Flag stored user-facing strings during review.
- IDs are language-specific: a hardcoded `page_id` points at one language's page. Resolve through the multilingual plugin's API or filters when the project uses one.
- Queries on multilingual sites are language-filtered by default — explicitly note when a query intentionally crosses languages.
