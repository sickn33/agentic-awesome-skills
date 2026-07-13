---
name: woo-guard
description: "Review WooCommerce code for HPOS safety, CRUD access, checkout validation, and money handling."
risk: safe
source: "https://github.com/amElnagdy/guard-skills"
---

## When to Use

Use when reviewing WooCommerce extension code for HPOS compatibility, CRUD data access patterns, checkout validation, and money-handling safety.

# Woo Guard

You are reviewing generated or changed WooCommerce code before it ships. Apply the rules below as a guard pass after the first implementation pass. WooCommerce is a moving platform — order storage changed engines, checkout changed frameworks — and code written from memory targets the WooCommerce of three years ago. With money on the line, "works on my demo store" is not a standard.

These rules exist because AI agents produce WooCommerce code with systematic failures: order meta read through `get_post_meta()` (broken on HPOS stores), products updated by direct meta writes that skip lookup tables and hooks, checkout validated only in JavaScript, prices computed in floats, and `woocommerce_*` hooks registered before confirming WooCommerce is active.

## How to use this skill

**Guard-pass mode** (recommended): after WooCommerce code has been generated or edited, apply the rules to the diff or target files, then run the self-check before delivery.

**Live mode** (explicit): when the user invokes this skill before writing WooCommerce code, apply the same rules while writing, then run the self-check before delivery.

**Review mode** (the user asks you to review or audit WooCommerce code): walk [references/review-checklist.md](references/review-checklist.md) and produce a structured findings report. Do not edit code in review mode unless asked.

**Security floor** — these hold in all WooCommerce code, at maximum severity, because money is on the line:

- Escape all output with the context-correct `esc_*` function.
- `wp_unslash()` then sanitize all request data before it touches logic.
- Capability check plus nonce on every state change.
- `$wpdb->prepare()` for every query containing a variable.

If wp-guard is installed, run it alongside for the full WordPress layer.

## Adapt to the project first

1. Read the project's agent instructions and the extension's declared WooCommerce version range. Project conventions win on conflict.
2. Determine the order storage mode this code must support: HPOS, legacy posts, or both (the default assumption is both).
3. Determine the checkout in play: Blocks/Store API, legacy shortcode checkout, or both. Hooks for one do not fire in the other.
4. Check whether WooCommerce activity is guarded: feature checks or `class_exists( 'WooCommerce' )` before any `wc_*` call or `woocommerce_*` hook.

## The Rules

### Order and product data — must fix

1. **Orders are not posts.** Access orders only through the CRUD API: `wc_get_order()`, `wc_get_orders()`, `$order->get_meta()`, `$order->update_meta_data()` + `$order->save()`. Forbidden on order data: `get_post_meta()`, `update_post_meta()`, `WP_Query`/`get_posts()` with `post_type => shop_order`, and direct `$wpdb` joins on postmeta. These work on legacy stores and silently break on HPOS stores. Details: [references/hpos-and-crud.md](references/hpos-and-crud.md).

2. **CRUD objects, getters/setters, then save.** Products, customers, and coupons go through their CRUD objects (`wc_get_product()`, setters, `->save()`). Direct meta writes skip lookup-table sync, skip the hooks other extensions rely on, and skip cache invalidation. Stock changes go through `wc_update_product_stock()` semantics; order state changes through `$order->update_status()` — which fire the emails and hooks the store expects.

3. **Declare feature compatibility.** Any extension touching orders declares HPOS compatibility (`FeaturesUtil::declare_compatibility( 'custom_order_tables', … )`); any extension touching checkout declares `cart_checkout_blocks` compatibility (or incompatibility, honestly). A missing declaration shows every store owner a warning banner with your plugin's name on it.

### Checkout and money — must fix

4. **Checkout validation is server-side.** Validate at `woocommerce_checkout_process` (legacy) or through Store API extension schemas (Blocks). JavaScript validation is UX, never security. Know which checkout the store runs and wire both when the extension claims general compatibility.

5. **Money is not a float.** Prices and totals go through `wc_format_decimal()` for storage-safe values, `wc_price()` for display, and WooCommerce's own tax/rounding settings for arithmetic. No hand-rolled currency symbols, no `number_format()` on prices, no float equality on totals.

### Runtime discipline — should fix

6. **Guard the runtime context.** `WC()->cart` and `WC()->session` are null in REST, cron, CLI, and admin contexts — check before touching them. Never assume a logged-in customer in webhook or gateway callbacks. Verify every `woocommerce_*` hook and `wc_*` function exists in the supported version range — WooCommerce renames and retires hooks across majors.

7. **Hooks over template overrides.** Prefer, in order: existing WooCommerce hooks/filters → the `woocommerce_locate_template` filter → a theme-level override. A template override shipped inside a plugin freezes a copied file at one WooCommerce version and breaks on template updates — flag it in review, always.

8. **Background work scales with order volume.** Batch jobs, syncs, and webhook fan-out go through Action Scheduler (bundled with WooCommerce), not raw WP-Cron loops. Handlers are idempotent — order events fire more than once in real stores.

## Self-check before delivery

1. Grep your diff for `get_post_meta`, `update_post_meta`, `post_type => 'shop_order'`: any of them touching orders? (Rule 1)
2. Any product/order/customer write that bypasses a CRUD object's `save()`? (Rule 2)
3. Does the extension declare HPOS (and checkout-blocks, if relevant) compatibility? (Rule 3)
4. Is every checkout rule enforced server-side, for the checkout(s) the store actually runs? (Rule 4)
5. Any float arithmetic, hardcoded currency symbol, or `number_format()` on money? (Rule 5)
6. Any `WC()->cart`/`WC()->session` access that can run in REST/cron/CLI? Any unverified hook name? (Rule 6)
7. Any template file shipped in the plugin? (Rule 7)
8. Security floor: every output escaped, every request input unslashed then sanitized, every state change capability-checked and nonce-verified, every variable query prepared?

If any answer is wrong, fix it before showing the user.

## Reporting format (review mode)

```
**Rule N violation** in `path/file.php:<line or function>`
- What: <one sentence>
- Risk: <HPOS breakage / skipped hooks / money error / checkout bypass — one phrase>
- Fix: <one sentence>
```

Group by file, lead with Rules 1–5 findings. If a file is clean, don't mention it.

## Severity guide

- **Must fix:** Rules 1–5 — broken stores, skipped business logic, wrong money
- **Should fix:** Rules 6–8 — context crashes, update fragility, jobs that die at scale

## References

- [references/hpos-and-crud.md](references/hpos-and-crud.md) — HPOS background, CRUD patterns, compatibility declaration, violation table
- [references/checkout-and-money.md](references/checkout-and-money.md) — legacy vs Blocks checkout, Store API validation, price and currency handling
- [references/review-checklist.md](references/review-checklist.md) — structured walk-through for review mode
- [references/sources.md](references/sources.md) — WooCommerce developer documentation URLs; read only when citing

## What this skill does not do

- Cover the full WordPress layer beyond the security floor — i18n and asset/query discipline are wp-guard's jurisdiction when it is installed.
- Review store configuration, theme styling, or payment provider account setup.
- Decide pricing or business logic — it guards how WooCommerce code ships, not what the store sells.
