# ACF field to block mapping

Use the field group, return format and a real post to choose a row. A call to `get_field()` alone cannot distinguish a string from an image, relationship or entire repeater.

| ACF component | Native representation | How existing records are read |
| --- | --- | --- |
| Text / Textarea | `core/paragraph`, binding `content` to `core/post-meta` | Register the original public string key on the correct post type. Verify textarea line breaks against ACF's newline setting. |
| Number / Boolean / Select | Dynamic text or conditional block | Read the raw scalar. Preserve zero, distinguish an absent key from false, and map stored choice values to their display labels. |
| WYSIWYG | Dynamic block, or reviewed conversion to native text blocks | Read the stored HTML and apply `wp_kses_post()` to permitted rich text. Audit legacy shortcodes and embeds separately. |
| URL / Link | `core/button` with bound URL for a public URL string, or dynamic link for an ACF Link array | For a compound value handle title, URL and allowlisted target independently. |
| Image | `core/image` for an attachment, or a custom integer `mediaId` attribute | ACF often returns an array or URL while storing an attachment ID. Resolve that ID with `wp_get_attachment_image()`. To stay synchronized, render from meta or verify ID binding support and image output on the target core version. |
| Gallery | `core/gallery` with image children, or dynamic gallery | Preserve attachment ID order and missing-image behavior. Native children become authoritative only after explicit conversion. |
| Group / nested fields | Dynamic block, or a group of bound child blocks | Inspect the actual prefixed keys and field references. Reconstruct the group using its field definition. |
| Repeater (`have_rows`) | Dynamic parent plus repeatable row blocks, each with a locked InnerBlocks template | Read legacy rows in order until the component is converted. Permit adding/removing row blocks at parent level. Lock the structure inside each row. |
| Flexible Content | Container with `InnerBlocks`, one allowed native child or pattern per layout | Map every layout slug and nested field, then serialize children in source order. Unknown layouts keep the component on its legacy path. |
| Relationship / Post Object | `core/query` for equivalent criteria, or dynamic block with `WP_Query` for a curated list | Normalize stored IDs, skip the query for an empty list, set `post__in`, `orderby => 'post__in'`, `ignore_sticky_posts => true`, explicit post types/statuses and `no_found_rows => true` for an unpaginated list. Set an intentional result limit. |
| Existing ACF block | Registered native replacement plus an explicit transform | Inspect parsed block attributes and ACF storage settings. Some values live in `post_content`; scan existing posts as well as PHP. |

## Example: migrate a resource card

This page component uses a plain-text title, a WYSIWYG body without shortcodes and a URL field. All three are public page metadata. Inspect their raw values before applying the example.

### Before: classic PHP template

```php
<?php
if ( ! function_exists( 'get_field' ) ) {
    return;
}
$title = get_field( 'resource_title' );
$body  = get_field( 'resource_body' );
$url   = get_field( 'resource_url' );
?>
<aside class="resource-card">
    <h2><?php echo esc_html( (string) $title ); ?></h2>
    <div><?php echo wp_kses_post( (string) $body ); ?></div>
    <?php if ( $url ) : ?>
        <a href="<?php echo esc_url( $url ); ?>">Read more</a>
    <?php endif; ?>
</aside>
```

### After: native dynamic block

In a site plugin, place the following three files under `blocks/resource-card/`. The editor identifies the component; the existing field group remains the editing surface for the card values.

**block.json**

```json
{
  "$schema": "https://schemas.wp.org/wp/6.6/block.json",
  "apiVersion": 3,
  "name": "fg-migration/resource-card",
  "title": "Resource card",
  "category": "widgets",
  "textdomain": "fg-migration",
  "usesContext": ["postId", "postType"],
  "supports": { "html": false },
  "editorScript": "fg-migration-resource-editor",
  "render": "file:./render.php"
}
```

**render.php**

```php
<?php
$post_id = absint( $block->context['postId'] ?? 0 );
$page    = $post_id ? get_post( $post_id ) : null;
if ( ! $page || 'page' !== $page->post_type || post_password_required( $page ) ) {
    return;
}
if ( ! is_post_publicly_viewable( $page ) && ! current_user_can( 'read_post', $post_id ) ) {
    return;
}

$title = get_post_meta( $post_id, 'resource_title', true );
$body  = get_post_meta( $post_id, 'resource_body', true );
$url   = get_post_meta( $post_id, 'resource_url', true );
?>
<aside <?php echo get_block_wrapper_attributes( array( 'class' => 'resource-card' ) ); ?>>
    <h2><?php echo esc_html( is_string( $title ) ? $title : '' ); ?></h2>
    <div><?php echo wp_kses_post( wpautop( is_string( $body ) ? $body : '' ) ); ?></div>
    <?php if ( is_string( $url ) && '' !== esc_url( $url ) ) : ?>
        <a href="<?php echo esc_url( $url ); ?>"><?php esc_html_e( 'Read more', 'fg-migration' ); ?></a>
    <?php endif; ?>
</aside>
```

**edit.js** (no build step)

```js
wp.blocks.registerBlockType('fg-migration/resource-card', {
  edit() {
    return wp.element.createElement(
      'aside',
      wp.blockEditor.useBlockProps(),
      wp.i18n.__('Resource card · Edit the title, body and URL in the page fields.', 'fg-migration')
    );
  },
  save: () => null
});
```

Register the script and block from the site's main plugin file:

```php
<?php
add_action( 'init', static function () {
    wp_register_script(
        'fg-migration-resource-editor',
        plugins_url( 'blocks/resource-card/edit.js', __FILE__ ),
        array( 'wp-blocks', 'wp-block-editor', 'wp-element', 'wp-i18n' ),
        '1.0.0',
        true
    );
    register_block_type( __DIR__ . '/blocks/resource-card' );
} );
```

Place `<!-- wp:fg-migration/resource-card /-->` where the classic template rendered the card, for example in the matching FSE page template. Keep the page's Post Content block. Compare the original WYSIWYG formatting, including paragraph breaks, with the new output. The renderer reads the same three rows with ACF disabled.

### Repeaters and Flexible Content

For a FAQ repeater, a dynamic parent can render the original rows while a page is in legacy mode. A converted parent saves `<InnerBlocks.Content />` and renders the resulting child markup from the server-provided `$content`. Use an explicit version or mode attribute on each converted block instance. This lets authors intentionally remove every row without bringing legacy rows back.

Allow only the row type as a direct child. Inside each FAQ row, use:

```jsx
<InnerBlocks
  template={ [ [ 'core/heading', { level: 3 } ], [ 'core/paragraph' ] ] }
  templateLock="all"
/>
```

For Flexible Content, preflight every layout before writing. For example, map `hero` to a group containing a heading and image, and `faq` to the FAQ parent. Materialize actual values into child blocks; an InnerBlocks template only supplies the initial structure. Serialize using WordPress block APIs and verify the resulting markup by opening, saving and reloading it in the editor.

[Block metadata](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/) · [Block Bindings](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/) · [Nested blocks](https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/nested-blocks-inner-blocks/)
