# Woo Guard — Review Checklist

Structured walk for review mode. First sweep the security floor on the same files — output escaping, unslash-then-sanitize on request data, capability plus nonce on state changes, prepared queries — money code gets zero security slack (wp-guard covers the full WordPress layer when installed). Cite file:line.

## Contents

- Pass 1: HPOS and CRUD greps
- Pass 2: Checkout and money
- Pass 3: Runtime context
- Pass 4: Compatibility and packaging
- Reporting

## Pass 1: HPOS and CRUD greps (must fix)

Run the violation table in [hpos-and-crud.md](hpos-and-crud.md):

- `get_post_meta` / `update_post_meta` / `wp_update_post` touching order or product IDs
- `post_type => 'shop_order'` in any query; `$wpdb` joins on postmeta for order data
- Meta changes without a following `save()`
- Stock or order status set by meta/post-field writes instead of `wc_update_product_stock()` / `$order->update_status()`
- Unbounded `wc_get_orders()` / product queries (no `limit`)

## Pass 2: Checkout and money (must fix)

- Checkout rules enforced server-side (`woocommerce_checkout_process` or Store API schema)? JS-only validation is a finding.
- Which checkout does the code target — and does that match what it claims to support?
- Money: `wc_format_decimal()` on inputs, `wc_price()` on display, store rounding on totals; flag float arithmetic, `number_format()`, hardcoded symbols, float `==`.
- Webhook/gateway callbacks: signature verified before order access? Idempotent on retries?

## Pass 3: Runtime context (should fix)

- `WC()->cart` / `WC()->session` / `WC()->customer` reachable from REST, cron, CLI, or webhooks without guards?
- `woocommerce_*` hooks and `wc_*` functions verified to exist in the supported version range?
- WooCommerce-active checks before hooking (`class_exists` / feature checks)?

## Pass 4: Compatibility and packaging (should fix)

- `FeaturesUtil` declarations present and truthful (`custom_order_tables`, `cart_checkout_blocks`)?
- Template overrides shipped inside the plugin? (Always a finding — hooks or `woocommerce_locate_template`.)
- Background/batch work on Action Scheduler, idempotent handlers?

## Reporting

Use the SKILL.md format (What / Risk / Fix). Lead with Pass 1–2 findings and an overall verdict (merge / fix first / do not merge). Note explicitly when security-floor findings exist on the same files so the user sees the full bill at once.
