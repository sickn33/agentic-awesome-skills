# Woo Guard — Checkout and Money Reference

## Contents

- Two checkouts, two hook surfaces
- Server-side validation
- Cart and session context guards
- Money handling
- Gateway and webhook callbacks

## Two checkouts, two hook surfaces

Modern stores run the Blocks checkout (Store API); legacy stores run the shortcode checkout (`woocommerce_checkout_*` hooks, `wp_ajax` fragments). Many field/render hooks differ, while some shared business hooks still run:

- Legacy-only: `woocommerce_checkout_fields`, `woocommerce_checkout_process`, `woocommerce_after_order_notes`.
- Blocks: Store API extensions (`ExtendSchema`), additional-fields API, server-side endpoint validation.

An extension claiming general compatibility wires both or declares which one it supports (see compatibility declaration in [hpos-and-crud.md](hpos-and-crud.md)). AI-generated checkout code overwhelmingly targets the legacy surface only — on a Blocks store it simply never runs: a hook on the wrong surface fails silently, no error, no behavior.

## Server-side validation

```php
/**
 * Reject checkout when the VAT number is malformed.
 *
 * JS validation on the field is UX; this hook is the actual gate.
 */
add_action( 'woocommerce_checkout_process', function () {
	$vat = isset( $_POST['ncs_vat'] ) ? sanitize_text_field( wp_unslash( $_POST['ncs_vat'] ) ) : '';

	if ( '' !== $vat && ! ncs_vat_is_valid( $vat ) ) {
		wc_add_notice( __( 'Please enter a valid VAT number.', 'ncs-checkout' ), 'error' );
	}
} );
```

For Blocks, the equivalent lives in the Store API additional-fields/extension schema callbacks. Either way: the server decides, form fields are unslashed then validated/sanitized; parsed JSON has its own schema and raw webhook bytes remain untouched for signature verification, and error messages go through `wc_add_notice()`/schema errors — never `die()`.

## Cart and session context guards

`WC()->cart`, `WC()->session`, and `WC()->customer` are initialized for front-end requests — they may be unavailable outside the ordinary storefront lifecycle:

```php
if ( function_exists( 'WC' ) && WC()->cart instanceof WC_Cart ) {
	$count = WC()->cart->get_cart_contents_count();
}
```

Code that touches the cart inside an API callback or scheduled job is a fatal error wearing a demo-store disguise. Flag it in review even when "it worked locally."

## Money handling

- Storage and arithmetic inputs: `wc_format_decimal( $value )` — normalizes locale decimals and precision.
- Display: `wc_price( $amount )` — currency symbol, position, separators, all from store settings. Hardcoded `'$' . $amount` fails on the other 150 currencies.
- Totals and tax: use order/cart getters (`get_total()`, `get_subtotal()`, `WC_Tax` methods) — they apply the store's rounding mode. Re-deriving totals with raw float math produces penny drift that accountants will find.
- Comparisons: normalize scale/currency then use decimal arithmetic or safe minor units; display formatting is not validation or exact arithmetic.
- Refund/discount logic: negative amounts have meaning — test the zero and partial cases explicitly (test-guard says hi).

## Gateway and webhook callbacks

- Verify webhook signatures/secrets before touching any order; fail closed with the provider's expected status code.
- Look up orders from gateway references via `wc_get_orders( array( 'transaction_id' => … ) )` or stored CRUD meta — not custom SQL.
- Callbacks run unauthenticated by design: capability checks don't apply, signature verification is the authentication, verify signatures over raw unmodified bytes before parsing; then validate amount, currency, provider account, order binding and permitted state transitions. Never unslash the signature payload.
- Idempotency: providers retry. Processing the same payment event twice must not complete an order twice.
