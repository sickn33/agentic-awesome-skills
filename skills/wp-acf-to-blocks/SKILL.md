---
name: wp-acf-to-blocks
description: Migrate WordPress legacy themes from ACF / ACF Pro (fields, repeaters, Flexible Content) to native Gutenberg blocks, Block Bindings, block.json v3, and theme.json v3 while preserving existing post meta.
risk: safe
source: https://github.com/Guerrier-florian/wp-acf-to-blocks
source_repo: Guerrier-florian/wp-acf-to-blocks
source_type: community
author: Florian Guerrier
license: MIT
license_source: https://github.com/Guerrier-florian/wp-acf-to-blocks/blob/main/LICENSE
date_added: '2026-11-24'
category: development
tags:
  - wordpress
  - gutenberg
  - acf
  - migration
  - block-theme
  - php
---

# Migrate an ACF theme to native blocks

## Operational boundaries

Keep the scope, sandbox, credentials, and approval settings supplied by the user or host. This skill operates strictly on local theme templates and configuration files; the bundled AST scanner is read-only, has zero external dependencies, makes no network requests, and performs no filesystem writes. Maintain existing WordPress database integrity by never modifying production database records during scanning or on front-end requests.

## When to Use

Use this skill when migrating legacy WordPress themes built with Advanced Custom Fields (ACF / ACF Pro) to native Gutenberg blocks:
- Replacing classic PHP template tags (`get_field()`, `the_field()`, `have_rows()`) with native Block Bindings (`core/post-meta`) and custom blocks (`block.json` v3).
- Converting ACF Repeaters and Flexible Content layouts to native nested blocks (`InnerBlocks`).
- Scanning legacy theme templates to inventory ACF field usages using `scan-acf.mjs`.
- Preserving historical `post_meta` storage and underscore-prefixed field-key references with zero data loss.

Work one component at a time. For each component, record its template, field group, post type, storage location, target block, editing surface and rollback path.

## 1. Inventory the theme

From the repository root or skill directory, run:

```sh
node skills/wp-acf-to-blocks/scripts/scan-acf.mjs <theme-dir>
```

Append `--json` for call sites and field counts. In an installed skill, resolve `scripts/scan-acf.mjs` relative to this file. Match selectors and line numbers to ACF field definitions in PHP, Local JSON or an export. Inspect dynamic selectors, wrappers, included template parts and explicit post IDs. Confirm the raw values and hidden field-key references on representative posts. Options, terms, users and existing ACF blocks can store data outside post meta.

## 2. Choose a strategy per component

Use [the field mapping and complete block example](references/acf-to-block-mapping.md).

- Bind public scalar post meta to a supported core block attribute using `core/post-meta`. Match the stored type and formatting.
- Render compound fields and repeaters with a dynamic block reading the existing record. For editable rows, give each row an InnerBlocks template with a locked internal structure.
- Map each Flexible Content layout to a native child block. Preserve row order and nesting. If any layout is unknown, keep the entire component on its legacy renderer until mapped.
- Identify one authoritative editor for each value. Record whether clearing a field or deleting the last child should produce empty output. Never use emptiness to decide whether a migration occurred.

## 3. Generate and register the block

For a custom block, generate namespaced `block.json` with `apiVersion: 3`, `edit.js` and a secure `render.php`. Register the directory on `init`. Declare editor dependencies, post context and supported attributes. Use `useBlockProps` in the editor and `get_block_wrapper_attributes()` on the front end. Save `InnerBlocks.Content` when the parent owns children. For a core binding, generate the serialized core block and meta registration directly.

Escape at output with `esc_html()`, `esc_attr()`, `esc_url()` or `wp_kses_post()` according to context. Prefix functions, handles and namespaces. Guard every ACF function used by a fallback with `function_exists()`, including `function_exists( 'get_field' )`. Never use `query_posts()`. Scope secondary queries to the intended posts and visibility.

For FSE, place shared markup in the appropriate template or part, preserve `core/post-content`, and merge design tokens into the theme's `theme.json` v3. Test on the minimum supported WordPress version (6.6+ for this combination). Check for Site Editor template overrides stored in the database.

## 4. Deliver the fallback and verify the cutover

Generate a read-through fallback or an explicit dry-run/apply WP-CLI script using [the safe migration guide](references/safe-data-migration.md). Preserve original values, indexed rows and underscore-prefixed references. Keep old templates available until the replacement is deployed and checked. Never write migration data on a front-end request.

On staging, compare legacy and block output on a published page, an empty field, a zero value and nested data. Check the editor after save/reload, the Query Loop post context, permissions and protected pages. Test the declared ACF-off behavior. Compare the original meta rows before and after, repeat any batch migration, and rehearse rollback before switching the production template.

## Prohibited anti-patterns

- Deleting or overwriting existing ACF `post_meta` keys or hidden underscore-prefixed field-key references (`_field_name`) during migration.
- Running database migrations or writing converted block content during front-end page requests.
- Shipping unescaped PHP output or calling `get_field()` / `the_field()` / `have_rows()` without `function_exists()` guards.
- Using `query_posts()` or unoptimized secondary queries without `no_found_rows => true` when pagination is not needed.
