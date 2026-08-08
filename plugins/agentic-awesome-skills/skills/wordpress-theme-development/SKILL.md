---
name: wordpress-theme-development
description: "WordPress theme development workflow covering theme architecture, template hierarchy, custom post types, block editor support, responsive design, and WordPress 7.0 features: DataViews, Pattern Editing, Navigation Overlays, and admin refresh."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# WordPress Theme Development Workflow

## Overview

Specialized workflow for creating custom WordPress themes from scratch, including modern block editor (Gutenberg) support, template hierarchy, responsive design, and WordPress 7.0 enhancements.

## WordPress 7.0 Theme Features

1. **Admin Refresh**
   - New default color scheme
   - View transitions between admin screens
   - Modern typography and spacing

2. **Pattern Editing**
   - ContentOnly mode defaults for unsynced patterns
   - `disableContentOnlyForUnsyncedPatterns` setting
   - Per-block instance custom CSS

3. **Navigation Overlays**
   - Customizable navigation overlays
   - Improved mobile navigation

4. **New Blocks**
   - Icon block
   - Breadcrumbs block with filters
   - Responsive grid block

5. **Theme.json Enhancements**
   - Pseudo-element support
   - Block-defined feature selectors honored
   - Enhanced custom CSS

6. **Iframed Editor**
   - Block API v3+ enables iframed post editor
   - Full enforcement in 7.1, opt-in in 7.0

## When to Use This Workflow

Use this workflow when:
- Creating custom WordPress themes
- Converting designs to WordPress themes
- Adding block editor support
- Implementing custom post types
- Building child themes
- Implementing WordPress 7.0 design features

## Workflow Phases

### Phase 1: Theme Setup

#### Skills to Invoke
- `app-builder` - Project scaffolding
- `frontend-developer` - Frontend development

#### Actions
1. Create theme directory structure
2. Set up style.css with theme header
3. Create functions.php
4. Configure theme support
5. Set up enqueue scripts/styles

#### WordPress 7.0 Theme Header
```css
/*
Theme Name: My Custom Theme
Theme URI: https://example.com
Author: Developer Name
Author URI: https://example.com
Description: A WordPress 7.0 compatible theme with modern design
Version: 1.0.0
Requires at least: 6.0
Requires PHP: 7.4
License: GNU General Public License v2
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: my-custom-theme
Tags: block-patterns, block-styles, editor-style, wide-blocks
*/
```

#### Copy-Paste Prompts
```
Use @app-builder to scaffold a new WordPress theme project
```

### Phase 2: Template Hierarchy

#### Skills to Invoke
- `frontend-developer` - Template development

#### Actions
1. Create index.php (fallback template)
2. Implement header.php and footer.php
3. Create single.php for posts
4. Create page.php for pages
5. Add archive.php for archives
6. Implement search.php and 404.php

#### WordPress 7.0 Template Considerations
- Test with iframed editor
- Verify view transitions work
- Check new admin color scheme compatibility

#### Copy-Paste Prompts
```
Use @frontend-developer to create WordPress template files
```

### Phase 3: Theme Functions

#### Skills to Invoke
- `backend-dev-guidelines` - Backend patterns

#### Actions
1. Register navigation menus
2. Add theme support (thumbnails, RSS, etc.)
3. Register widget areas
4. Create custom template tags
5. Implement helper functions

#### WordPress 7.0 theme.json Configuration
```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "appearanceTools": true,
    "layout": {
      "contentSize": "1200px",
      "wideSize": "1400px"
    },
    "background": {
      "backgroundImage": true
    },
    "typography": {
      "fontFamilies": true,
      "fontSizes": true
    },
    "spacing": {
      "margin": true,
      "padding": true
    },
    "blocks": {
      "core/heading": {
        "typography": {
          "fontSizes": ["24px", "32px", "48px"]
        }
      }
    }
  },
  "styles": {
    "color": {
      "background": "#ffffff",
      "text": "#1a1a1a"
    },
    "elements": {
      "link": {
        "color": {
          "text": "#0066cc"
        }
      }
    }
  },
  "customTemplates": [
    {
      "name": "page-home",
      "title": "Homepage",
      "postTypes": ["page"]
    }
  ],
  "templateParts": [
    {
      "name": "header",
      "title": "Header",
      "area": "header"
    }
  ]
}
```

#### Copy-Paste Prompts
```
Use @backend-dev-guidelines to create theme functions
```

### Phase 4: Custom Post Types

#### Skills to Invoke
- `wordpress-penetration-testing` - WordPress patterns

#### Actions
1. Register custom post types
2. Create custom taxonomies
3. Add custom meta boxes
4. Implement custom fields
5. Create archive templates

#### RTC-Compatible CPT Registration
```php
register_post_type('portfolio', [
    'labels' => [
        'name' => __('Portfolio', 'my-theme'),
        'singular_name' => __('Portfolio Item', 'my-theme')
    ],
    'public' => true,
    'has_archive' => true,
    'show_in_rest' => true,  // Enable for RTC
    'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
    'menu_icon' => 'dashicons-portfolio',
]);

// Register meta for collaboration
register_post_meta('portfolio', 'client_name', [
    'type' => 'string',
    'single' => true,
    'show_in_rest' => true,
    'sanitize_callback' => 'sanitize_text_field',
]);
```

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to understand WordPress CPT patterns
```

### Phase 5: Block Editor Support

#### Skills to Invoke
- `frontend-developer` - Block development

#### Actions
1. Enable block editor support
2. Register custom blocks
3. Create block styles
4. Add block patterns
5. Configure block templates

#### WordPress 7.0 Block Features
- Block API v3 is reference model
- PHP-only block registration
- Per-instance custom CSS
- Block visibility controls (viewport-based)

#### Block Pattern with ContentOnly (WP 7.0)
```json
{
    "name": "my-theme/hero-section",
    "title": "Hero Section",
    "contentOnly": true,
    "content": [
        {
            "name": "core/cover",
            "attributes": {
                "url": "{{hero_image}}",
                "overlay": "black",
                "dimRatio": 50
            },
            "innerBlocks": [
                {
                    "name": "core/heading",
                    "attributes": {
                        "level": 1,
                        "textAlign": "center",
                        "content": "{{hero_title}}"
                    }
                },
                {
                    "name": "core/paragraph",
                    "attributes": {
                        "align": "center",
                        "content": "{{hero_description}}"
                    }
                }
            ]
        }
    ]
}
```

#### Navigation Overlay Template Part
```php
// template-parts/header-overlay.php
?>
<nav class="header-navigation-overlay" aria-label="<?php esc_attr_e('Overlay Menu', 'my-theme'); ?>">
    <button class="overlay-close" aria-label="<?php esc_attr_e('Close menu', 'my-theme'); ?>">
        <span class="close-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </span>
    </button>
    <?php
    wp_nav_menu([
        'theme_location' => 'primary',
        'container' => false,
        'menu_class' => 'overlay-menu',
        'fallback_cb' => false,
    ]);
    ?>
</nav>
```

#### Copy-Paste Prompts
```
Use @frontend-developer to create custom Gutenberg blocks
```

### Phase 6: Styling and Design

#### Skills to Invoke
- `frontend-design` - UI design
- `tailwind-patterns` - Tailwind CSS

#### Actions
1. Implement responsive design
2. Add CSS framework or custom styles
3. Create design system
4. Implement theme customizer
5. Add accessibility features

#### WordPress 7.0 Admin Refresh Considerations
```css
/* Support new admin color scheme */
@media (prefers-color-scheme: dark) {
    :root {
        --admin-color: modern;
    }
}

/* View transitions */
.wp-admin {
    view-transition-name: none;
}

body {
    view-transition-name: page;
}
```

#### CSS Custom Properties (WP 7.0)
```css
:root {
    /* New DataViews colors */
    --wp-dataviews-color-background: #ffffff;
    --wp-dataviews-color-border: #e0e0e0;
    
    /* Navigation overlay */
    --wp-overlay-menu-background: #1a1a1a;
    --wp-overlay-menu-text: #ffffff;
}
```

#### Copy-Paste Prompts
```
Use @frontend-design to create responsive theme design
```

### Phase 7: WordPress 7.0 Features Integration

#### Breadcrumbs Block Support
```php
// Add breadcrumb filters for custom post types
add_filter('wp_breadcrumb_args', function($args) {
    $args['separator'] = '<span class="breadcrumb-separator"> / </span>';
    $args['before'] = '<nav class="breadcrumb" aria-label="Breadcrumb">';
    $args['after'] = '</nav>';
    return $args;
});

// Add custom breadcrumb trail for CPT
add_action('breadcrumb_items', function($trail, $crumbs) {
    if (is_singular('portfolio')) {
        $portfolio_page = get_page_by_path('portfolio');
        if ($portfolio_page) {
            array_splice($trail->crumbs, 1, 0, [
                [
                    'title' => get_the_title($portfolio_page),
                    'url' => get_permalink($portfolio_page)
                ]
            ]);
        }
    }
}, 10, 2);
```

#### Icon Block Support
```php
// Add custom icons for Icon block via pattern category
add_action('init', function() {
    register_block_pattern_category('my-theme/icons', [
        'label' => __('Theme Icons', 'my-theme'),
        'description' => __('Custom icons for use in the Icon block', 'my-theme'),
    ]);
});

// For actual SVG icons in the Icon block, use block.json or PHP registration
add_action('init', function() {
    register_block_pattern('my-theme/custom-icons', [
        'title' => __('Custom Icon Set', 'my-theme'),
        'categories' => ['my-theme/icons'],
        'content' => '<!-- Pattern content with Icon blocks -->'
    ]);
});
```

### Phase 8: Testing

#### Skills to Invoke
- `playwright-skill` - Browser testing
- `webapp-testing` - Web app testing

#### Actions
1. Test across browsers
2. Verify responsive breakpoints
3. Test block editor
4. Check accessibility
5. Performance testing

#### WordPress 7.0 Testing Checklist
- [ ] Test with iframed editor
- [ ] Verify view transitions
- [ ] Check admin color scheme
- [ ] Test navigation overlays
- [ ] Verify contentOnly patterns
- [ ] Test breadcrumbs on CPT archives

#### Copy-Paste Prompts
```
Use @playwright-skill to test WordPress theme
```

## Theme Structure

```
theme-name/
├── style.css
├── functions.php
├── index.php
├── header.php
├── footer.php
├── sidebar.php
├── single.php
├── page.php
├── archive.php
├── search.php
├── 404.php
├── comments.php
├── template-parts/
│   ├── header/
│   ├── footer/
│   ├── navigation/
│   └── content/
├── patterns/           # Block patterns (WP 7.0)
├── templates/          # Site editor templates
├── inc/
│   ├── class-theme.php
│   └── supports.php
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── languages/
```

## WordPress 7.0 Theme Checklist

- [ ] PHP 7.4+ requirement documented
- [ ] theme.json v3 schema used
- [ ] Block patterns tested
- [ ] ContentOnly editing supported
- [ ] Navigation overlays implemented
- [ ] Breadcrumb filters added for CPT
- [ ] View transitions working
- [ ] Admin refresh compatible
- [ ] CPT meta shows_in_rest
- [ ] Iframe editor tested

## Quality Gates

- [ ] All templates working
- [ ] Block editor supported
- [ ] Responsive design verified
- [ ] Accessibility checked
- [ ] Performance optimized
- [ ] Cross-browser tested
- [ ] WordPress 7.0 compatibility verified

## Related Workflow Bundles

- `wordpress` - WordPress development
- `wordpress-plugin-development` - Plugin development
- `wordpress-woocommerce` - WooCommerce

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
