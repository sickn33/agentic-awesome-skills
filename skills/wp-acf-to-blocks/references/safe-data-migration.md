# Preserve ACF data during a template migration

## Establish the source of truth

On a staging copy, export the database to a private path and test restoring it. Inventory field definitions, post IDs/types, active templates (including saved Site Editor overrides), publication status, passwords, translations and the component's placement. Include posts with missing values, intentionally empty fields, zero, duplicate meta rows, nested layouts and deleted attachments.

A typical ACF page has a value row such as `hero_title` and a reference row such as `_hero_title` containing `field_…`. Keep both. Repeater storage can include a parent count and keys such as `faq_0_question`. Flexible Content can include an ordered list of layout slugs with indexed subfields. Confirm the site's actual schema. An ACF return value may already contain formatting, objects or attachment URLs absent from storage. Record raw source rows and compare them after migration.

## Bind a public scalar without rewriting posts

This example assumes one public, plain-text `hero_title` per page. Put registration in a site plugin that loads for front-end, editor, REST and CLI requests. Check for previous registration and reconcile conflicting schemas. For a custom post type, enable REST on the type and include `custom-fields` support in its registration.

```php
<?php
add_action( 'init', static function () {
    register_post_meta( 'page', 'hero_title', array(
        'type'              => 'string',
        'single'            => true,
        'show_in_rest'      => true,
        'sanitize_callback' => 'sanitize_text_field',
        'auth_callback'     => static function ( $allowed, $key, $post_id, $user_id ) {
            return user_can( $user_id, 'edit_post', $post_id );
        },
    ) );
} );
```

Registration describes the existing key. It writes no values. The sanitizer applies to future writes; choose one that matches the field contract (for multiline plain text, consider `sanitize_textarea_field`). Authorization here governs meta edits. A registered public key can appear in readable REST responses. Never expose confidential values, protected keys, ACF field references or an entire field group by default.

Place the following in the relevant FSE template, template part or reviewed post body:

```html
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"hero_title"}}}}} -->
<p></p>
<!-- /wp:paragraph -->
```

An existing page now gets its paragraph from its own `hero_title`. Binding registration alone does not place a block on previously published pages. Check the template hierarchy and database overrides before rollout. Choose one active editing surface during transition. If ACF formatting or validation is essential, keep its editor until the block editor implements equivalent behavior.

Verify on staging with a real page ID:

```sh
wp post meta get 42 hero_title
wp post meta get 42 _hero_title
curl -fsS 'https://staging.example.org/wp-json/wp/v2/pages/42?_fields=id,meta'
```

Compare the public response and rendered page. Verify that an unauthorized REST write fails, that an authorized update round-trips, and that the ACF reference is intact. Test anonymous access to private and password-protected records. Keep sensitive fields server-side where access can be checked explicitly.

## Fallback for complex rows

During transition, dispatch using the component's explicit conversion marker. Before conversion, read the original rows on the correct post. Check all functions used, for example `function_exists( 'have_rows' )`, `function_exists( 'the_row' )` and `function_exists( 'get_sub_field' )`, before entering an ACF loop. Where ACF must be removable, implement and verify a raw-meta reader for that exact schema before deactivation. After conversion, render saved children even when empty. Preserve old rows and disable competing editors. A rollback to legacy reads will show the values at cutover; reconcile any later block edits first.

## Optional WP-CLI batch: insert a bound paragraph

Use this only when the paragraph must live in individual page bodies. Scope this example to published, unprotected pages with an **exactly empty body** and one string value for `hero_title`. Use a template that renders Post Content and has no second copy of the bound paragraph. Existing bodies require a separate reviewed merge. The example changes page content only. Meta remains authoritative.

Create a private manifest with one reviewed page ID per line and save the following as `bind-pages.php` outside the web root. Freeze edits, imports and other migration workers for the apply window. Capture the database backup and manifest together. The manifest may be processed in bounded batches.

```php
<?php
if ( 2 !== count( $args ) || ! in_array( $args[0], array( 'plan', 'apply' ), true ) ) {
    WP_CLI::error( 'Expected: plan|apply /absolute/path/to/page-ids.txt' );
}
list( $mode, $manifest ) = $args;
$ids = file( $manifest, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
if ( false === $ids || ! $ids ) {
    WP_CLI::error( 'Manifest is empty or unreadable.' );
}
$ids = array_unique( array_map( 'trim', $ids ) );
foreach ( $ids as $id ) {
    if ( ! preg_match( '/^[1-9][0-9]*$/D', $id ) ) {
        WP_CLI::error( 'Manifest contains an invalid post ID.' );
    }
}
$markup = '<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"hero_title"}}}}} -->'
    . "\n<p></p>\n<!-- /wp:paragraph -->";
foreach ( $ids as $id ) {
    $page = get_post( (int) $id );
    if ( ! $page || 'page' !== $page->post_type || 'publish' !== $page->post_status || '' !== $page->post_password ) {
        WP_CLI::log( "SKIP outside scope: $id" );
        continue;
    }
    if ( $markup === $page->post_content ) {
        WP_CLI::log( "ALREADY BOUND: $id" );
        continue;
    }
    $values = get_post_meta( $page->ID, 'hero_title', false );
    if ( '' !== $page->post_content || 1 !== count( $values ) || ! is_string( $values[0] ) ) {
        WP_CLI::log( "SKIP review content or meta: $id" );
        continue;
    }
    if ( 'plan' === $mode ) {
        WP_CLI::log( "WOULD BIND: $id" );
        continue;
    }
    if ( ! current_user_can( 'edit_post', $page->ID ) ) {
        WP_CLI::error( "Cannot edit page $id with the selected user." );
    }
    $result = wp_update_post( wp_slash( array( 'ID' => $page->ID, 'post_content' => $markup ) ), true );
    if ( is_wp_error( $result ) ) {
        WP_CLI::error( "Page $id: " . $result->get_error_message() );
    }
    if ( $markup !== get_post_field( 'post_content', $page->ID, 'raw' ) ) {
        WP_CLI::error( "Unexpected saved content on page $id; inspect before retrying." );
    }
    WP_CLI::log( "BOUND: $id" );
}
```

Run from the WordPress installation, substituting a real editor login and private paths:

```sh
wp db export /private/backup/before-bind.sql
wp --user=EDITOR_LOGIN eval-file /private/migration/bind-pages.php plan /private/migration/page-ids.txt
wp --user=EDITOR_LOGIN eval-file /private/migration/bind-pages.php apply /private/migration/page-ids.txt > /private/migration/applied.log
wp --user=EDITOR_LOGIN eval-file /private/migration/bind-pages.php plan /private/migration/page-ids.txt
```

Review `WOULD BIND` and every skip before apply. The second plan should report already-bound pages and the same skips. After an interrupted run, compare the initial plan with current content and the apply log, then resume with the same manifest. For rollback, revert the template switch. For pages this run changed, restore the captured original body only if the current body still equals the generated markup. Preserve newer edits for manual reconciliation. Use the tested database restore only in an isolated or write-frozen environment.

[REST meta registration](https://developer.wordpress.org/rest-api/extending-the-rest-api/modifying-responses/) · [ACF field references](https://www.advancedcustomfields.com/resources/update_field/) · [WP-CLI eval-file](https://developer.wordpress.org/cli/commands/eval-file/)
