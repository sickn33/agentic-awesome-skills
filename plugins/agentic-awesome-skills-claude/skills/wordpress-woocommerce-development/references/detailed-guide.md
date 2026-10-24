# WordPress WooCommerce Development Workflow - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Overview

Specialized workflow for building WooCommerce stores including setup, payment gateway integration, shipping configuration, custom product types, store optimization, and WordPress 7.0 enhancements.


## Compatibility boundary

The following feature list is a proposal/checklist, not evidence that WordPress
core enables WooCommerce DataViews, collaborative order editing or AI fulfillment.
Verify exact WordPress/WooCommerce/plugin releases and their documented APIs.
Use backups and staging, sandbox gateway credentials and synthetic personal data.
Production inventory/order changes, provider costs and publication require approved
scope. Cache public catalog data only; exclude carts, checkout and account pages.

## WordPress 7.0 + WooCommerce Features

1. **AI Integration**
   - Auto-generate product descriptions
   - AI-powered customer service responses
   - Product summary generation
   - Marketing copy assistance

2. **DataViews for Orders**
   - Modern order management interfaces
   - Enhanced filtering and sorting
   - Activity layout for order history

3. **Real-Time Collaboration**
   - Collaborative order editing
   - Team notes and communication
   - Live inventory updates

4. **Admin Refresh**
   - Consistent WooCommerce admin styling
   - View transitions between screens

5. **Abilities API**
   - AI-powered order processing
   - Automated inventory management
   - Smart shipping recommendations


## Workflow Phases

### Phase 1: Store Setup

#### Skills to Invoke
- `app-builder` - Project scaffolding
- `wordpress` - WordPress development patterns

#### Actions
1. Install WooCommerce
2. Run setup wizard
3. Configure store settings
4. Set up tax rules
5. Configure currency
6. Test with WordPress 7.0 admin

#### WordPress 7.0 + WooCommerce Setup
```php
// Minimum requirements for WP 7.0 + WooCommerce
// Add to wp-config.php for collaboration settings
// No generic WP_COLLABORATION_MAX_USERS setting is established here.
// Verify the chosen collaboration plugin's documented configuration.

// AI features are enabled by installing a provider plugin
// Install OpenAI, Anthropic, or Gemini connector from WordPress.org
// Then configure via Settings > Connectors in admin panel
```

#### Copy-Paste Prompts
```
Use @app-builder to set up WooCommerce store
```

### Phase 2: Product Configuration

#### Skills to Invoke
- `wordpress` - WooCommerce patterns

#### Actions
1. Create product categories
2. Add product attributes
3. Configure product types
4. Set up variable products
5. Add product images

#### AI-Powered Product Descriptions (WP 7.0)
AI description generation should be an explicit editor action, not an automatic
product-save hook. Verify product-edit capability and nonce, bound input and paid
provider requests, send only approved public attributes, and save the result as a
reviewable draft. Preserve human text and treat product input as untrusted data.
Verify the installed AI-client API; temperature does not guarantee determinism.

#### Copy-Paste Prompts
```
Use @wordpress to configure WooCommerce products
```

### Phase 3: Payment Integration

#### Skills to Invoke
- `payment-integration` - Payment processing
- `stripe-integration` - Stripe
- `paypal-integration` - PayPal

#### Actions
1. Choose payment gateways
2. Configure Stripe
3. Set up PayPal
4. Add offline payments
5. Test payment flows

#### WordPress 7.0 AI for Payments
Use the payment gateway's documented risk signals and signed, idempotently handled
webhooks. An LLM string classifier must not approve/decline payments or infer fraud
from addresses/email. Provider absence is `unknown`, never evidence of a clean order.
Do not send billing/shipping personal data to an AI provider without a defined
legal basis, approved processor and minimization/retention controls.

#### Copy-Paste Prompts
```
Use @stripe-integration to integrate Stripe payments
```

```
Use @paypal-integration to integrate PayPal
```

### Phase 4: Shipping Configuration

#### Skills to Invoke
- `wordpress` - WooCommerce shipping

#### Actions
1. Set up shipping zones
2. Configure shipping methods
3. Add flat rate shipping
4. Set up free shipping
5. Integrate carriers

#### AI Shipping Recommendations (WP 7.0)
Calculate eligible shipping methods from WooCommerce zones, current cart currency,
configured weight units and carrier rates. AI may explain approved options after
explicit opt-in; it must not invent prices, eligibility or shipping promises. Do
not make paid remote calls on every checkout render or expose destination data.

#### Copy-Paste Prompts
```
Use @wordpress to configure shipping
```

### Phase 5: Store Customization

#### Skills to Invoke
- `frontend-developer` - Store customization
- `frontend-design` - Store design

#### Actions
1. Customize product pages
2. Modify cart page
3. Style checkout flow
4. Create custom templates
5. Add custom fields

#### WordPress 7.0 Template Customization
```php
// Custom product template with WP 7.0 blocks
add_action('woocommerce_after_main_content', 'add_product_ai_chat');

function add_product_ai_chat() {
    if (!is_product()) return;

    global $product;
    ?>
    <div class="product-ai-assistant">
        <h3>AI Shopping Assistant</h3>
        <button id="ai-chat-toggle" type="button">Ask about this product</button>
        <div id="ai-chat-panel" style="display:none;">
            <div id="ai-chat-messages"></div>
            <input type="text" id="ai-chat-input" placeholder="Ask about sizing, materials, etc.">
        </div>
    </div>
    <script>
    document.getElementById('ai-chat-toggle').addEventListener('click', function() {
        const panel = document.getElementById('ai-chat-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    </script>
    <?php
}

// The UI above is a toggle only, not a working chat integration.
```

Implement any Q&A endpoint separately with authenticated identity, per-user and
global spending/rate limits, bounded body/output and an allowlist of published
products. A public nonce is not authentication or a paid-API abuse limit. Render
answers as text, redact provider errors, and ground factual answers in approved
product attributes. Do not enable an unrestricted `wp_ajax_nopriv` provider proxy.

#### Copy-Paste Prompts
```
Use @frontend-developer to customize WooCommerce templates
```

### Phase 6: Extensions

#### Skills to Invoke
- `wordpress` - WooCommerce extensions

#### Actions
1. Install required extensions
2. Configure subscriptions
3. Set up bookings
4. Add memberships
5. Integrate marketplace

#### Abilities API for WooCommerce (WP 7.0)
```php
// Register ability categories first
add_action('wp_abilities_api_categories_init', function() {
    wp_register_ability_category('ecommerce', [
        'label' => __('E-Commerce', 'woocommerce'),
        'description' => __('WooCommerce store management and operations', 'woocommerce'),
    ]);
});

// Register abilities
add_action('wp_abilities_api_init', function() {
    // Register ability to update inventory
    wp_register_ability('woocommerce/update-inventory', [
        'label' => __('Update Inventory', 'woocommerce'),
        'description' => __('Update product stock quantity', 'woocommerce'),
        'category' => 'ecommerce',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'product_id' => ['type' => 'integer', 'description' => 'Product ID to update'],
                'quantity' => ['type' => 'integer', 'minimum' => 0, 'description' => 'New stock quantity']
            ],
            'required' => ['product_id', 'quantity']
        ],
        'output_schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean'],
                'new_quantity' => ['type' => 'integer']
            ]
        ],
        'execute_callback' => 'woocommerce_update_inventory_handler',
        'permission_callback' => function($input) {
            return current_user_can('manage_woocommerce'); // Also enforce per-object scope in handler.
        }
    ]);

    // Register ability to process orders
    wp_register_ability('woocommerce/process-order', [
        'label' => __('Process Order', 'woocommerce'),
        'description' => __('Mark order as processing and trigger fulfillment', 'woocommerce'),
        'category' => 'ecommerce',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'order_id' => ['type' => 'integer', 'description' => 'Order ID to process']
            ],
            'required' => ['order_id']
        ],
        'output_schema' => [
            'type' => 'object',
            'properties' => [
                'success' => ['type' => 'boolean'],
                'status' => ['type' => 'string']
            ]
        ],
        'execute_callback' => 'woocommerce_process_order_handler',
        'permission_callback' => function($input) {
            return current_user_can('manage_woocommerce'); // Also enforce per-object scope in handler.
        }
    ]);
});

// Handler for inventory update
function woocommerce_update_inventory_handler($input) {
    $product_id = isset($input['product_id']) ? absint($input['product_id']) : 0;
    if (!isset($input['quantity']) || !is_int($input['quantity']) || $input['quantity'] < 0) {
        return new WP_Error('invalid_quantity', 'Non-negative integer quantity required');
    }
    $quantity = $input['quantity'];

    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_Error('invalid_product', 'Product not found');
    }

    if (!current_user_can('edit_post', $product_id)) {
        return new WP_Error('forbidden', 'Product edit permission required');
    }
    // Update stock
    $new_quantity = wc_update_product_stock($product, $quantity, 'set');
    if (is_wp_error($new_quantity) || $new_quantity === false) {
        return new WP_Error('stock_update_failed', 'Stock update failed');
    }

    return [
        'success' => true,
        'new_quantity' => $new_quantity
    ];
}

// Handler for order processing
function woocommerce_process_order_handler($input) {
    $order_id = isset($input['order_id']) ? absint($input['order_id']) : 0;

    $order = wc_get_order($order_id);
    if (!$order) {
        return new WP_Error('invalid_order', 'Order not found');
    }

    // Production must additionally validate gateway-paid state and transition policy.
    if (!$order->is_paid() || !$order->has_status('on-hold')) {
        return new WP_Error('invalid_transition', 'Paid on-hold order required');
    }
    $order->update_status('processing');

    return [
        'success' => true,
        'status' => 'processing'
    ];
}
```

#### Copy-Paste Prompts
```
Use @wordpress to configure WooCommerce extensions
```

### Phase 7: Optimization

#### Skills to Invoke
- `web-performance-optimization` - Performance
- `database-optimizer` - Database optimization

#### Actions
1. Optimize product images
2. Enable caching
3. Optimize database
4. Configure CDN
5. Set up lazy loading

#### WordPress 7.0 Performance
- Client-side media processing
- Font Library enabled
- Responsive grid block
- View transitions for perceived performance

#### Copy-Paste Prompts
```
Use @web-performance-optimization to optimize WooCommerce store
```

### Phase 8: Testing

#### Skills to Invoke
- `playwright-skill` - E2E testing
- `test-automator` - Test automation

#### Actions
1. Test checkout flow
2. Verify payment processing
3. Test email notifications
4. Check mobile experience
5. Performance testing

#### WordPress 7.0 Testing
- Test with new admin interface
- Verify AI features work
- Test DataViews for orders
- Verify collaboration features

#### AI-Powered Store Testing
Run deterministic sandbox tests for successful, failed, delayed and duplicate
payment webhooks; verify stock, tax, shipping, refunds and emails once per event.
Authenticated accounts can also be fraudulent. AI guesses about customer identity
are not test assertions or checkout authorization and must not block purchases.

#### Copy-Paste Prompts
```
Use @playwright-skill to test WooCommerce checkout flow
```


## WooCommerce + WordPress 7.0 AI Use Cases

1. **Product Descriptions**
   - Auto-generate from product attributes
   - Translate descriptions
   - SEO optimization

2. **Customer Service**
   - AI chatbot for common questions
   - Order status lookup
   - Return processing

3. **Inventory Management**
   - Demand forecasting
   - Low stock alerts
   - Reorder recommendations

4. **Marketing**
   - Personalized emails
   - Product recommendations
   - Abandoned cart recovery

5. **Order Processing**
   - Fraud detection
   - Shipping optimization
   - Invoice generation


## Quality Gates

- [ ] Products displaying correctly
- [ ] Checkout flow working
- [ ] Payments processing
- [ ] Shipping calculating
- [ ] Emails sending
- [ ] Mobile responsive
- [ ] AI features tested (WP 7.0)
- [ ] DataViews working (WP 7.0)


## Related Workflow Bundles

- `wordpress` - WordPress development
- `wordpress-theme-development` - Theme development
- `wordpress-plugin-development` - Plugin development
- `payment-integration` - Payment processing
