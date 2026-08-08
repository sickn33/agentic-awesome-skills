# Woo Guard — HPOS and CRUD Reference

## Contents

- Why HPOS breaks legacy code
- Order access patterns
- Order meta done right
- Products, stock, and lookup tables
- Status transitions
- Declaring compatibility
- Violation table for review

## Why HPOS breaks legacy code

High-Performance Order Storage moved orders out of `wp_posts`/`wp_postmeta` into dedicated tables, and it is the default on new stores. Code that treats orders as posts returns empty results or stale data on HPOS stores — silently, with no error. Code written "from memory" almost always targets the legacy storage, because that is what most training-era tutorials show.

## Order access patterns

```php
// Wrong — assumes orders are posts. Fails on HPOS.
$total  = get_post_meta( $order_id, '_order_total', true );
$orders = get_posts( array( 'post_type' => 'shop_order', 'numberposts' => 20 ) );

// Right — storage-agnostic CRUD API.
$order  = wc_get_order( $order_id );
$total  = $order ? $order->get_total() : 0;
$orders = wc_get_orders( array( 'status' => 'wc-processing', 'limit' => 20 ) );
```

`wc_get_orders()` takes its own argument schema (not `WP_Query` args): `limit`, `status`, `customer_id`, `date_created`, `meta_query` equivalents via `field_query`. Never run an unbounded order query — always set a `limit` (wp-guard covers query discipline in depth when installed).

## Order meta done right

```php
$order = wc_get_order( $order_id );
$order->update_meta_data( '_ncs_sync_status', 'queued' );
$order->save(); // persists to whichever storage backend is active

$value = $order->get_meta( '_ncs_sync_status' ); // single value, unserialized
```

`save()` is not optional — without it, meta changes exist only in memory. Batched changes: set everything, save once.

## Products, stock, and lookup tables

Product meta writes through `update_post_meta()` skip `wc_product_meta_lookup` sync, skip `woocommerce_update_product`-family hooks, and skip cache invalidation — three classes of bugs other plugins will blame on you.

```php
$product = wc_get_product( $product_id );
$product->set_stock_quantity( $new_qty );
$product->set_regular_price( wc_format_decimal( $price ) );
$product->save();
```

Stock specifically: `wc_update_product_stock()` and the CRUD setters handle backorders, stock status flips, and concurrency better than any hand-rolled meta math. Direct increments via meta are race-prone on busy stores.

## Status transitions

```php
$order->update_status( 'completed', 'Synced to fulfillment.' ); // fires emails + hooks
```

Never set status by writing meta or post fields — `update_status()` triggers the `woocommerce_order_status_*` hooks and customer emails the rest of the store depends on. If suppressing side effects is the goal, that is a design discussion to surface, not a meta write to sneak in.

## Declaring compatibility

```php
add_action( 'before_woocommerce_init', function () {
	if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
	}
} );
```

Declare only what is true — a false `custom_order_tables` declaration on postmeta-reading code converts a visible warning into an invisible data bug.

## Violation table for review

| Grep hit | Why it fails |
|---|---|
| `get_post_meta( $order_id` | HPOS: order meta is not postmeta |
| `post_type => 'shop_order'` (or `shop_order_refund`) | HPOS: orders are not posts |
| `update_post_meta( $product_id` | Skips lookup tables, hooks, caches |
| `wp_update_post` on order/product IDs | Same class of bypass |
| `$wpdb` joins on `postmeta` for order data | HPOS + fragile schema coupling |
| `posts_per_page => -1` over products/orders | Unbounded query, store-sized blast radius |
