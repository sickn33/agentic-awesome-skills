---
name: wordpress-woocommerce-development
description: "WooCommerce store development workflow covering store setup, payment integration, shipping configuration, customization, and WordPress 7.0 features: AI connectors, DataViews, and collaboration tools."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# WordPress WooCommerce Development Workflow

## Overview

Specialized workflow for building WooCommerce stores including setup, payment gateway integration, shipping configuration, custom product types, store optimization, and WordPress 7.0 enhancements.

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

## When to Use This Workflow

Use this workflow when:
- Setting up WooCommerce stores
- Integrating payment gateways
- Configuring shipping methods
- Creating custom product types
- Building subscription products
- Implementing AI-powered features (WP 7.0)

## Workflow Phases

### Phase 1: Store Setup

#### Skills to Invoke
- `app-builder` - Project scaffolding
- `wordpress-penetration-testing` - WordPress patterns

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
define('WP_COLLABORATION_MAX_USERS', 10);

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
- `wordpress-penetration-testing` - WooCommerce patterns

#### Actions
1. Create product categories
2. Add product attributes
3. Configure product types
4. Set up variable products
5. Add product images

#### AI-Powered Product Descriptions (WP 7.0)
```php
// Auto-generate product descriptions with AI
add_action('woocommerce_new_product', 'generate_ai_description', 10, 2);

function generate_ai_product_description($product_id, $product) {
    if ($product->get_description()) {
        return; // Skip if description exists
    }
    
    // Check if AI client is available
    if (!function_exists('wp_ai_client_prompt')) {
        return;
    }
    
    $title = $product->get_name();
    $short_description = $product->get_short_description();
    
    $prompt = sprintf(
        'Write a compelling WooCommerce product description for "%s" that highlights key features and benefits. Make it SEO-friendly and persuasive.',
        $title
    );
    
    if ($short_description) {
        $prompt .= "\n\nShort description: " . $short_description;
    }
    
    $result = wp_ai_client_prompt($prompt);
    
    if (is_wp_error($result)) {
        return;
    }
    
    // Use temperature for consistent output
    $result->using_temperature(0.3);
    $description = $result->generate_text();
    
    if ($description && !is_wp_error($description)) {
        $product->set_description($description);
        $product->save();
    }
}
```

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to configure WooCommerce products
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
```php
// AI-powered fraud detection
// Note: This is a demonstration - implement proper fraud detection with multiple signals

// Use AI to analyze order for fraud indicators
function ai_check_order_fraud($order_id) {
    // Check if AI client is available
    if (!function_exists('wp_ai_client_prompt')) {
        return false; // Default to no suspicion if AI unavailable
    }
    
    $order = wc_get_order($order_id);
    if (!$order) {
        return false;
    }
    
    $prompt = sprintf(
        'Analyze this order for potential fraud. Order total: $%s. Shipping address: %s, %s. Billing: %s. Is this suspicious? Return only "suspicious" or "clean" without explanation.',
        $order->get_total(),
        $order->get_shipping_address_1(),
        $order->get_shipping_city(),
        $order->get_billing_email()
    );
    
    $result = wp_ai_client_prompt($prompt);
    
    if (is_wp_error($result)) {
        return false;
    }
    
    $result->using_temperature(0.1); // Low temp for consistent classification
    $analysis = $result->generate_text();
    
    return (strpos($analysis, 'suspicious') !== false);
}
```

#### Copy-Paste Prompts
```
Use @stripe-integration to integrate Stripe payments
```

```
Use @paypal-integration to integrate PayPal
```

### Phase 4: Shipping Configuration

#### Skills to Invoke
- `wordpress-penetration-testing` - WooCommerce shipping

#### Actions
1. Set up shipping zones
2. Configure shipping methods
3. Add flat rate shipping
4. Set up free shipping
5. Integrate carriers

#### AI Shipping Recommendations (WP 7.0)
```php
// AI-powered shipping recommendations
add_action('woocommerce_after_checkout_form', 'ai_shipping_recommendations');

function ai_shipping_recommendations($checkout) {
    // Check if AI client is available
    if (!function_exists('wp_ai_client_prompt')) {
        return;
    }
    
    $cart = WC()->cart;
    if ($cart->is_empty() || !$cart->get_cart_contents_weight()) {
        return;
    }
    
    $prompt = sprintf(
        'Based on this cart (total weight: %d kg, destination: %s), recommend the best shipping method from: free shipping (orders over $100), flat rate ($9.99), or express ($24.99). Consider delivery time and cost efficiency. Respond with just the recommended method name.',
        $cart->get_cart_contents_weight(),
        WC()->customer->get_shipping_country()
    );
    
    $result = wp_ai_client_prompt($prompt);
    
    if (is_wp_error($result)) {
        return;
    }
    
    $result->using_temperature(0.1); // Low temp for consistent recommendation
    $recommendation = $result->generate_text();
    
    if (strpos($recommendation, 'express') !== false) {
        wc_add_notice(esc_html__('AI Recommendation: Consider Express shipping for faster delivery!', 'woocommerce'), 'info');
    }
}
```

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to configure shipping
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

// AI-powered product Q&A
add_action('wp_ajax_ai_product_question', 'handle_ai_product_question');
add_action('wp_ajax_nopriv_ai_product_question', 'handle_ai_product_question');

function handle_ai_product_question() {
    // Verify nonce for security
    if (!check_ajax_referer('ai_product_question_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => 'Security check failed']);
    }
    
    $question = isset($_POST['question']) ? sanitize_text_field($_POST['question']) : '';
    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    
    if (empty($question) || empty($product_id)) {
        wp_send_json_error(['message' => 'Missing required fields']);
    }
    
    $product = wc_get_product($product_id);
    if (!$product) {
        wp_send_json_error(['message' => 'Product not found']);
    }
    
    // Check if AI client is available
    if (!function_exists('wp_ai_client_prompt')) {
        wp_send_json_error(['message' => 'AI service unavailable']);
    }
    
    $prompt = sprintf(
        'Customer question about "%s": %s\n\nProduct details:
- Price: $%s
- SKU: %s
- Stock: %s

Answer helpfully, accurately, and concisely:',
        $product->get_name(),
        $question,
        $product->get_price(),
        $product->get_sku(),
        $product->get_stock_status()
    );
    
    $result = wp_ai_client_prompt($prompt);
    
    if (is_wp_error($result)) {
        wp_send_json_error(['message' => $result->get_error_message()]);
    }
    
    $result->using_temperature(0.4); // Slightly higher for more varied responses
    $answer = $result->generate_text();
    
    if (is_wp_error($answer)) {
        wp_send_json_error(['message' => 'Failed to generate response']);
    }
    
    wp_send_json_success(['answer' => $answer]);
}
```

#### Copy-Paste Prompts
```
Use @frontend-developer to customize WooCommerce templates
```

### Phase 6: Extensions

#### Skills to Invoke
- `wordpress-penetration-testing` - WooCommerce extensions

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
                'quantity' => ['type' => 'integer', 'description' => 'New stock quantity']
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
        'permission_callback' => function() {
            return current_user_can('manage_woocommerce');
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
        'permission_callback' => function() {
            return current_user_can('manage_woocommerce');
        }
    ]);
});

// Handler for inventory update
function woocommerce_update_inventory_handler($input) {
    $product_id = isset($input['product_id']) ? absint($input['product_id']) : 0;
    $quantity = isset($input['quantity']) ? absint($input['quantity']) : 0;
    
    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_Error('invalid_product', 'Product not found');
    }
    
    // Update stock
    wc_update_product_stock($product, $quantity);
    
    return [
        'success' => true,
        'new_quantity' => $product->get_stock_quantity()
    ];
}

// Handler for order processing
function woocommerce_process_order_handler($input) {
    $order_id = isset($input['order_id']) ? absint($input['order_id']) : 0;
    
    $order = wc_get_order($order_id);
    if (!$order) {
        return new WP_Error('invalid_order', 'Order not found');
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
Use @wordpress-penetration-testing to configure WooCommerce extensions
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
```php
// Automated AI testing for fraud detection during checkout
add_action('woocommerce_after_checkout_validation', 'ai_validate_order', 20);

function ai_validate_order($fields, $errors) {
    // Skip if AI is not available
    if (!function_exists('wp_ai_client_prompt')) {
        return;
    }
    
    // Skip for logged-in users (assumed trusted)
    if (is_user_logged_in()) {
        return;
    }
    
    $order_data = [
        'email' => isset($fields['billing_email']) ? $fields['billing_email'] : '',
        'phone' => isset($fields['billing_phone']) ? $fields['billing_phone'] : '',
        'address' => isset($fields['billing_address_1']) ? $fields['billing_address_1'] : '',
    ];
    
    // Skip if insufficient data
    if (empty($order_data['email'])) {
        return;
    }
    
    $prompt = sprintf(
        'This is a checkout validation. Check if these details seem legitimate: email=%s, phone=%s, address=%s. Return only "valid" or "suspicious" without additional text.',
        sanitize_email($order_data['email']),
        sanitize_text_field($order_data['phone']),
        sanitize_text_field($order_data['address'])
    );
    
    $result = wp_ai_client_prompt($prompt);
    
    if (is_wp_error($result)) {
        // Don't block checkout on AI errors
        return;
    }
    
    $result->using_temperature(0.1); // Low temp for consistent classification
    $response = $result->generate_text();
    
    if (is_wp_error($response)) {
        return;
    }
    
    if (strpos($response, 'suspicious') !== false) {
        $errors->add('validation', __('Additional verification may be needed for this order. We will contact you if needed.', 'woocommerce'));
    }
}
```

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

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
