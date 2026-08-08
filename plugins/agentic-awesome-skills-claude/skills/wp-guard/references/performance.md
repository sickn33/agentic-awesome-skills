# WP Guard — Performance Reference

## Contents

- WP_Query discipline
- Meta and term cache priming
- Transients vs object cache
- Options autoload hygiene
- Asset loading
- Cron and background work
- Scaling traps checklist

## WP_Query discipline

- `posts_per_page => -1` is forbidden. There is always a bound; if the caller "needs everything," page through with a loop or use a bounded cap the project agrees on.
- `query_posts()` is forbidden — it clobbers the main query. Use `WP_Query` or `pre_get_posts`.
- Only IDs needed → `'fields' => 'ids'` (skips row hydration and caches).
- Not paginating → `'no_found_rows' => true` (skips `SQL_CALC_FOUND_ROWS`).
- Not using meta/terms in the loop → `'update_post_meta_cache' => false`, `'update_post_term_cache' => false`.
- Avoid `'meta_query'` on unindexed scans for high-traffic paths — meta queries do not scale on large `postmeta` tables; consider a lookup table or taxonomy when the access pattern is hot.
- Never run queries inside `foreach` when one query (or cache priming) can fetch the set.

## Meta and term cache priming

The N+1 killer. When iterating IDs and reading meta per item:

```php
$ids = get_posts( array( 'fields' => 'ids', /* … */ ) );
update_meta_cache( 'post', $ids ); // one query primes the cache
foreach ( $ids as $id ) {
	$sku = get_post_meta( $id, '_sku', true ); // served from cache
}
```

`update_meta_cache()` and `update_object_term_cache()` exist for exactly this; on WP ≥ 6.1, `_prime_post_caches()` batches posts, meta, and terms in one call (public API since 6.1 despite the underscore). AI-generated loops skip them every time.

## Transients vs object cache

- `set_transient()` / `get_transient()` — persistent cache with TTL; backed by the object cache when a drop-in exists, by the options table otherwise.
- `wp_cache_get()` / `wp_cache_set()` — request-scope by default, persistent only with an object-cache drop-in (Redis/Memcached). Use cache groups and deliberate TTLs.
- Expensive remote calls (Rule 11) always go behind one of these. Choose TTL consciously; never cache user-specific data in a shared key — include the user/locale in the key when output varies by them.
- On failure paths, decide explicitly whether to cache the failure (short TTL) or retry every request — and say which in a comment.

## Options autoload hygiene

Every `autoload => true` option loads on EVERY request into `alloptions`. Rules:

- `add_option( 'ncs_big_report_cache', $data, '', false )` — large or rarely-read data never autoloads (pass `false` as the third arg of `update_option` too; the parameter exists since WP 4.2).
- Keep individual autoloaded options small; an `alloptions` blob over ~1 MB is a known site-killer on high-traffic sites.
- One serialized settings array per plugin beats twenty separate options.

## Asset loading

- Enqueue only where used: check `is_admin()`, screen IDs (`get_current_screen()`), shortcode presence, or block usage before enqueueing.
- Front-end assets registered on `wp_enqueue_scripts`, admin on `admin_enqueue_scripts` with the `$hook_suffix` check.
- Version assets with the plugin version (cache busting); load non-critical JS with `defer`/`async` strategies (`wp_register_script` args on WP ≥ 6.3).

## Cron and background work

- WP-Cron is traffic-driven and can stack: guard handlers against overlap (a lock transient), keep events idempotent.
- Long or high-volume jobs → Action Scheduler when WooCommerce (or the library) is present.
- Never `sleep()` in a request; never do batch work on `init` for every visitor.

## Scaling traps checklist

- Unbounded `get_users()` / `get_terms()` on large sites — same rules as posts.
- `switch_to_blog()` in loops without batching (multisite).
- Per-request remote HTTP without caching — one slow third party becomes your TTFB.
- Writing to options on front-end requests (cache invalidation storm under traffic).
- Counting rows with `found_posts` when an indexed count query or cached counter would do.
