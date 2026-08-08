# Test Guard — PHP / PHPUnit / Pest Patterns

Concrete applications of the nine rules for PHP projects, including WordPress and WooCommerce. Read this when reviewing or writing PHP tests.

## Rule 2: Mock boundaries in PHP

Justified mock targets:

- HTTP: Guzzle handlers/middleware, `pre_http_request` filter in WordPress
- External SDKs: payment gateways, mail providers, LLM API clients
- Clock: inject a clock (`psr/clock`) instead of calling `time()` directly
- Filesystem on external paths (prefer `vfsStream` or temp dirs over mocking)

Unjustified mocks:

- Mockery/Prophecy doubles for the project's own value objects, DTOs, or entities — construct real instances (Rule 8)
- Mocking internal services just to isolate a class — if wiring is painful, fix the constructor, don't fake the collaborator
- Partial mocks of the class under test — you are no longer testing the class

## Rule 3: Data providers

```php
/**
 * @see Rule 3 — variants of one scenario belong in a data provider.
 */
#[DataProvider('provideSlugCases')]
public function test_slugify_normalizes_input( string $raw, string $expected ): void {
    $this->assertSame( $expected, slugify( $raw ) );
}

public static function provideSlugCases(): array {
    return array(
        'lowercases'     => array( 'Hello World', 'hello-world' ),
        'strips padding' => array( '  padded  ', 'padded' ),
        'transliterates' => array( 'Café Menu', 'cafe-menu' ),
    );
}
```

Pest equivalent: `it('normalizes slug', ...)->with([...])`.

## WordPress-specific boundaries

- **Integration tests** (`WP_UnitTestCase` / `wp-env` / `wp-cli scaffold`): use the real WordPress test framework with factories — `self::factory()->post->create()`, `self::factory()->user->create()`. Don't mock `WP_Post` or `WP_User`; the factories exist precisely so you don't have to (Rule 8).
- **Unit tests without WordPress loaded** (Brain Monkey / WP_Mock): mocking WordPress functions like `get_option()` or `apply_filters()` is a boundary mock and justified. But assert what *your code does* with the values, not that `get_option` was called with specific args (Rule 1).
- Mock outbound HTTP with the `pre_http_request` filter rather than patching `wp_remote_get` internals.
- Don't test that WordPress sanitizes, escapes, or that hooks fire — that's core's guarantee (Rule 7). Test your callback's behavior given an input.

## WooCommerce notes

- Build real `WC_Product` / `WC_Order` objects via `WC_Helper_Product` and `WC_Helper_Order` in integration tests — never `MagicMock`-style doubles of them (Rule 8).
- Cart and checkout logic is stateful: prefer integration tests over heavily mocked unit tests; mocked carts hide hook-ordering bugs.

## Rule 9: Real database

`WP_UnitTestCase` already wraps each test in a transaction against a real schema — use it for query, meta, and persistence logic instead of mocking `$wpdb`. Mocking `$wpdb->prepare` or `$wpdb->get_results` to test a query builder tests nothing.
