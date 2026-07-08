---
name: wordpress
description: "Complete WordPress development workflow covering theme development, plugin creation, WooCommerce integration, performance optimization, and security hardening. Includes WordPress 7.0 features: Real-Time Collaboration, AI Connectors, Abilities API, DataViews, and PHP-only blocks."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# WordPress Development Workflow Bundle

## Overview

Comprehensive WordPress development workflow covering theme development, plugin creation, WooCommerce integration, performance optimization, and security. This bundle orchestrates skills for building production-ready WordPress sites and applications.

## WordPress 7.0 Features (Backward Compatible)

WordPress 7.0 (April 9, 2026) introduces significant features while maintaining backward compatibility:

### Real-Time Collaboration (RTC)
- Multiple users can edit simultaneously using Yjs CRDT
- HTTP polling provider (configurable via `WP_COLLABORATION_MAX_USERS`)
- Custom transport via `sync.providers` filter
- **Backward Compatibility**: Falls back to post locking when legacy meta boxes detected

### AI Connectors API
- Provider-agnostic AI interface in core (`wp_ai_client_prompt()`)
- Settings > Connectors for centralized API credential management
- Official providers: OpenAI, Anthropic Claude, Google Gemini
- **Backward Compatibility**: Works with WordPress 6.9+ via plugin

### Abilities API (Stable in 7.0)
- Standardized capability declaration system
- REST API endpoints: `/wp-json/abilities/v1/manifest`
- MCP adapter for AI agent integration
- **Backward Compatibility**: Can be used as Composer package in 6.x

### DataViews & DataForm
- Replaces WP_List_Table on Posts, Pages, Media screens
- New layouts: table, grid, list, activity
- Client-side validation (pattern, minLength, maxLength, min, max)
- **Backward Compatibility**: Plugins using old hooks still work

### PHP-Only Block Registration
- Register blocks entirely via PHP without JavaScript
- Auto-generated Inspector controls
- **Backward Compatibility**: Existing JS blocks continue to work

### Interactivity API Updates
- `watch()` replaces `effect` from @preact/signals
- State navigation changes
- **Backward Compatibility**: Old syntax deprecated but functional

### Admin Refresh
- New default color scheme
- View transitions between admin screens
- **Backward Compatibility**: CSS-level changes, no breaking changes

### Pattern Editing
- ContentOnly mode defaults for unsynced patterns
- `disableContentOnlyForUnsyncedPatterns` setting
- **Backward Compatibility**: Existing patterns work

## When to Use This Workflow

Use this workflow when:
- Building new WordPress websites
- Creating custom themes
- Developing WordPress plugins
- Setting up WooCommerce stores
- Optimizing WordPress performance
- Hardening WordPress security
- Implementing WordPress 7.0 features (RTC, AI, DataViews)

## Workflow Phases

### Phase 1: WordPress Setup

#### Skills to Invoke
- `app-builder` - Project scaffolding
- `environment-setup-guide` - Development environment

#### Actions
1. Set up local development environment (LocalWP, Docker, or Valet)
2. Install WordPress (recommend 7.0+ for new projects)
3. Configure development database
4. Set up version control
5. Configure wp-config.php for development

#### WordPress 7.0 Configuration
```php
// wp-config.php - Collaboration settings
define('WP_COLLABORATION_MAX_USERS', 5);

// AI Connector is enabled by installing a provider plugin
// (e.g., OpenAI, Anthropic Claude, or Google Gemini connector)
// No constant needed - configure via Settings > Connectors in admin
```

#### Copy-Paste Prompts
```
Use @app-builder to scaffold a new WordPress project with modern tooling
```

### Phase 2: Theme Development

#### Skills to Invoke
- `frontend-developer` - Component development
- `frontend-design` - UI implementation
- `tailwind-patterns` - Styling
- `web-performance-optimization` - Performance

#### Actions
1. Design theme architecture
2. Create theme files (style.css, functions.php, index.php)
3. Implement template hierarchy
4. Create custom page templates
5. Add custom post types and taxonomies
6. Implement theme customization options
7. Add responsive design
8. Test with WordPress 7.0 admin refresh

#### WordPress 7.0 Theme Considerations
- Block API v3 now reference model
- Pseudo-element support in theme.json
- Global Styles custom CSS honors block-defined selectors
- View transitions for admin navigation

#### Theme Structure
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
├── template-parts/
├── inc/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── languages/
```

#### Copy-Paste Prompts
```
Use @frontend-developer to create a custom WordPress theme with React components
```

```
Use @tailwind-patterns to style WordPress theme with modern CSS
```

### Phase 3: Plugin Development

#### Skills to Invoke
- `backend-dev-guidelines` - Backend standards
- `api-design-principles` - API design
- `auth-implementation-patterns` - Authentication

#### Actions
1. Design plugin architecture
2. Create plugin boilerplate
3. Implement hooks (actions and filters)
4. Create admin interfaces
5. Add custom database tables
6. Implement REST API endpoints
7. Add settings and options pages

#### WordPress 7.0 Plugin Considerations
- **RTC Compatibility**: Register post meta with `show_in_rest => true`
- **AI Integration**: Use `wp_ai_client_prompt()` for AI features
- **DataViews**: Consider new admin UI patterns
- **Meta Boxes**: Migrate to block-based UIs for collaboration support

#### RTC-Compatible Post Meta Registration
```php
register_post_meta('post', 'custom_field', [
    'type' => 'string',
    'single' => true,
    'show_in_rest' => true,  // Required for RTC
    'sanitize_callback' => 'sanitize_text_field',
]);
```

#### AI Connector Example
```php
// Using WordPress 7.0 AI Connector
// Note: Requires an AI provider plugin (OpenAI, Claude, or Gemini) to be installed and configured

// Basic text generation
$response = wp_ai_client_prompt('Summarize this content.')
    ->generate_text();

// With temperature for deterministic output
$response = wp_ai_client_prompt('Summarize this content.')
    ->using_temperature(0.2)
    ->generate_text();

// With model preference (tries first available in list)
$response = wp_ai_client_prompt('Summarize this content.')
    ->using_model_preference('gpt-4', 'claude-3-opus', 'gemini-2-pro')
    ->generate_text();

// For JSON structured output
$schema = [
    'type' => 'object',
    'properties' => [
        'summary' => ['type' => 'string'],
        'keywords' => ['type' => 'array', 'items' => ['type' => 'string']]
    ],
    'required' => ['summary']
];
$response = wp_ai_client_prompt('Analyze this content and return JSON.')
    ->using_system_instruction('You are a content analyzer.')
    ->as_json_response($schema)
    ->generate_text();
```

#### Plugin Structure
```
plugin-name/
├── plugin-name.php
├── includes/
│   ├── class-plugin-activator.php
│   ├── class-plugin-deactivator.php
│   ├── class-plugin-loader.php
│   └── class-plugin.php
├── admin/
│   ├── class-plugin-admin.php
│   ├── css/
│   └── js/
├── public/
│   ├── class-plugin-public.php
│   ├── css/
│   └── js/
└── languages/
```

#### Copy-Paste Prompts
```
Use @backend-dev-guidelines to create a WordPress plugin with proper architecture
```

### Phase 4: WooCommerce Integration

#### Skills to Invoke
- `payment-integration` - Payment processing
- `stripe-integration` - Stripe payments
- `billing-automation` - Billing workflows

#### Actions
1. Install and configure WooCommerce
2. Create custom product types
3. Customize checkout flow
4. Integrate payment gateways
5. Set up shipping methods
6. Create custom order statuses
7. Implement subscription products
8. Add custom email templates

#### WordPress 7.0 + WooCommerce Considerations
- Test checkout with new admin interfaces
- AI connectors for product descriptions
- DataViews for order management screens
- RTC for collaborative order editing

#### Copy-Paste Prompts
```
Use @payment-integration to set up WooCommerce with Stripe
```

```
Use @billing-automation to create subscription products in WooCommerce
```

### Phase 5: Performance Optimization

#### Skills to Invoke
- `web-performance-optimization` - Performance optimization
- `database-optimizer` - Database optimization

#### Actions
1. Implement caching (object, page, browser)
2. Optimize images (lazy loading, WebP)
3. Minify and combine assets
4. Enable CDN
5. Optimize database queries
6. Implement lazy loading
7. Configure OPcache
8. Set up Redis/Memcached

#### WordPress 7.0 Performance
- Client-side media processing
- Font Library enabled for all themes
- Responsive grid block optimizations
- View transitions reduce perceived load time

#### Performance Checklist
- [ ] Page load time < 3 seconds
- [ ] Time to First Byte < 200ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

#### Copy-Paste Prompts
```
Use @web-performance-optimization to audit and improve WordPress performance
```

### Phase 6: Security Hardening

#### Skills to Invoke
- `security-auditor` - Security audit
- `wordpress-penetration-testing` - WordPress security testing
- `sast-configuration` - Static analysis

#### Actions
1. Update WordPress core, themes, plugins
2. Implement security headers
3. Configure file permissions
4. Set up firewall rules
5. Enable two-factor authentication
6. Implement rate limiting
7. Configure security logging
8. Set up malware scanning

#### WordPress 7.0 Security Considerations
- PHP 7.4 minimum (drops 7.2/7.3 support)
- Test Abilities API permission boundaries
- Verify collaboration data isolation
- AI connector credential security

#### Security Checklist
- [ ] WordPress core updated (7.0+ recommended)
- [ ] All plugins/themes updated
- [ ] Strong passwords enforced
- [ ] Two-factor authentication enabled
- [ ] Security headers configured
- [ ] XML-RPC disabled or protected
- [ ] File editing disabled
- [ ] Database prefix changed
- [ ] Regular backups configured

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to audit WordPress security
```

```
Use @security-auditor to perform comprehensive security review
```

### Phase 7: Testing

#### Skills to Invoke
- `test-automator` - Test automation
- `playwright-skill` - E2E testing
- `webapp-testing` - Web app testing

#### Actions
1. Write unit tests for custom code
2. Create integration tests
3. Set up E2E tests
4. Test cross-browser compatibility
5. Test responsive design
6. Performance testing
7. Security testing

#### WordPress 7.0 Testing Priorities
- Test with iframed post editor
- Verify DataViews integration
- Test collaboration (RTC) workflows
- Validate AI connector functionality
- Test Interactivity API with watch()

#### Copy-Paste Prompts
```
Use @playwright-skill to create E2E tests for WordPress site
```

### Phase 8: Deployment

#### Skills to Invoke
- `deployment-engineer` - Deployment
- `cicd-automation-workflow-automate` - CI/CD
- `github-actions-templates` - GitHub Actions

#### Actions
1. Set up staging environment
2. Configure deployment pipeline
3. Set up database migrations
4. Configure environment variables
5. Enable maintenance mode during deployment
6. Deploy to production
7. Verify deployment
8. Monitor post-deployment

#### Copy-Paste Prompts
```
Use @deployment-engineer to set up WordPress deployment pipeline
```

## WordPress-Specific Workflows

### Custom Post Type Development (RTC-Compatible)
```php
register_post_type('book', [
    'labels' => [...],
    'public' => true,
    'has_archive' => true,
    'supports' => ['title', 'editor', 'thumbnail', 'excerpt'],
    'menu_icon' => 'dashicons-book',
    'show_in_rest' => true,  // Enable for RTC
]);

// Register meta with REST API for collaboration
register_post_meta('book', 'isbn', [
    'type' => 'string',
    'single' => true,
    'show_in_rest' => true,
    'sanitize_callback' => 'sanitize_text_field',
]);
```

### Custom REST API Endpoint
```php
add_action('rest_api_init', function() {
    register_rest_route('myplugin/v1', '/books', [
        'methods' => 'GET',
        'callback' => 'get_books',
        'permission_callback' => '__return_true',
    ]);
});
```

### WordPress 7.0 AI Connector Usage
```php
// Auto-generate post excerpt with AI
add_action('save_post', function($post_id, $post) {
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
        return;
    }
    
    // Skip if excerpt already exists
    if (!empty($post->post_excerpt)) {
        return;
    }
    
    $content = strip_tags($post->post_content);
    if (empty($content)) {
        return;
    }
    
    // Check if AI client is available
    if (!function_exists('wp_ai_client_prompt')) {
        return;
    }
    
    // Build prompt with input
    $result = wp_ai_client_prompt(
        'Create a brief 2-sentence summary of this content: ' . substr($content, 0, 1000)
    );
    
    if (is_wp_error($result)) {
        return; // Silently fail - don't block post saving
    }
    
    // Use temperature for consistent output
    $result->using_temperature(0.3);
    $summary = $result->generate_text();
    
    if ($summary && !is_wp_error($summary)) {
        wp_update_post([
            'ID' => $post_id,
            'post_excerpt' => sanitize_textarea_field($summary)
        ]);
    }
}, 10, 2);
```

### PHP-Only Block Registration (WordPress 7.0)
```php
// Register block entirely in PHP
register_block_type('my-plugin/hello-world', [
    'render_callback' => function($attributes, $content) {
        return '<p class="hello-world">Hello, World!</p>';
    },
    'attributes' => [
        'message' => ['type' => 'string', 'default' => 'Hello!']
    ],
]);
```

### Abilities API Registration
```php
// Register ability category on correct hook
add_action('wp_abilities_api_categories_init', function() {
    wp_register_ability_category('content-creation', [
        'label' => __('Content Creation', 'my-plugin'),
        'description' => __('Abilities for generating and managing content', 'my-plugin'),
    ]);
});

// Register abilities on correct hook
add_action('wp_abilities_api_init', function() {
    wp_register_ability('my-plugin/generate-summary', [
        'label' => __('Generate Post Summary', 'my-plugin'),
        'description' => __('Creates an AI-powered summary of a post', 'my-plugin'),
        'category' => 'content-creation',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'post_id' => ['type' => 'integer', 'description' => 'The post ID to summarize']
            ],
            'required' => ['post_id']
        ],
        'output_schema' => [
            'type' => 'object',
            'properties' => [
                'summary' => ['type' => 'string', 'description' => 'The generated summary']
            ]
        ],
        'execute_callback' => 'my_plugin_generate_summary_handler',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);
});

// Handler function for the ability
function my_plugin_generate_summary_handler($input) {
    $post_id = isset($input['post_id']) ? absint($input['post_id']) : 0;
    $post = get_post($post_id);
    
    if (!$post) {
        return new WP_Error('invalid_post', 'Post not found');
    }
    
    $content = strip_tags($post->post_content);
    if (empty($content)) {
        return ['summary' => ''];
    }
    
    if (!function_exists('wp_ai_client_prompt')) {
        return new WP_Error('ai_unavailable', 'AI client not available');
    }
    
    $result = wp_ai_client_prompt('Summarize in 2 sentences: ' . substr($content, 0, 1000))
        ->using_temperature(0.3)
        ->generate_text();
    
    if (is_wp_error($result)) {
        return $result;
    }
    
    return ['summary' => sanitize_textarea_field($result)];
}
```

### WooCommerce Custom Product Type
```php
add_action('init', function() {
    class WC_Product_Custom extends WC_Product {
        // Custom product implementation
    }
});
```

## Quality Gates

Before moving to next phase, verify:
- [ ] All custom code tested
- [ ] Security scan passed
- [ ] Performance targets met
- [ ] Cross-browser tested
- [ ] Mobile responsive verified
- [ ] Accessibility checked (WCAG 2.1)
- [ ] WordPress 7.0 compatibility verified (for new projects)

## Related Workflow Bundles

- `development` - General web development
- `security-audit` - Security testing
- `testing-qa` - Testing workflow
- `ecommerce` - E-commerce development

(End of file - total 440 lines)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
