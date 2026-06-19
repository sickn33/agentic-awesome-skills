---
name: shopify-development
description: Build Shopify apps, extensions, themes using GraphQL Admin API, Shopify CLI, Polaris UI, and Liquid.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Shopify Development Skill

Use this skill when the user asks about:

- Building Shopify apps or extensions
- Creating checkout/admin/POS UI customizations
- Developing themes with Liquid templating
- Integrating with Shopify GraphQL or REST APIs
- Implementing webhooks or billing
- Working with metafields or Shopify Functions

---

## ROUTING: What to Build

**IF user wants to integrate external services OR build merchant tools OR charge for features:**
→ Build an **App** (see `references/app-development.md`)

**IF user wants to customize checkout OR add admin UI OR create POS actions OR implement discount rules:**
→ Build an **Extension** (see `references/extensions.md`)

**IF user wants to customize storefront design OR modify product/collection pages:**
→ Build a **Theme** (see `references/themes.md`)

**IF user needs both backend logic AND storefront UI:**
→ Build **App + Theme Extension** combination

---

## Shopify CLI Commands

Install CLI:

```bash
npm install -g @shopify/cli@latest
```

Create and run app:

```bash
shopify app init          # Create new app
shopify app dev           # Start dev server with tunnel
shopify app deploy        # Build and upload to Shopify
```

Generate extension:

```bash
shopify app generate extension --type checkout_ui_extension
shopify app generate extension --type admin_action
shopify app generate extension --type admin_block
shopify app generate extension --type pos_ui_extension
shopify app generate extension --type function
```

Theme development:

```bash
shopify theme init        # Create new theme
shopify theme dev         # Start local preview at localhost:9292
shopify theme pull --live # Pull live theme
shopify theme push --development  # Push to dev theme
```

---

## Access Scopes

Configure in `shopify.app.toml`:

```toml
[access_scopes]
scopes = "read_products,write_products,read_orders,write_orders,read_customers"
```

Common scopes:

- `read_products`, `write_products` - Product catalog access
- `read_orders`, `write_orders` - Order management
- `read_customers`, `write_customers` - Customer data
- `read_inventory`, `write_inventory` - Stock levels
- `read_fulfillments`, `write_fulfillments` - Order fulfillment

---

## GraphQL Patterns (Validated against API 2026-01)

### Query Products

```graphql
query GetProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    edges {
      node {
        id
        title
        handle
        status
        variants(first: 5) {
          edges {
            node {
              id
              price
              inventoryQuantity
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Query Orders

```graphql
query GetOrders($first: Int!) {
  orders(first: $first) {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
    }
  }
}
```

### Set Metafields

```graphql
mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
    }
    userErrors {
      field
      message
    }
  }
}
```

Variables example:

```json
{
  "metafields": [
    {
      "ownerId": "gid://shopify/Product/123",
      "namespace": "custom",
      "key": "care_instructions",
      "value": "Handle with care",
      "type": "single_line_text_field"
    }
  ]
}
```

---

## Checkout Extension Example

```tsx
import {
  reactExtension,
  BlockStack,
  TextField,
  Checkbox,
  useApplyAttributeChange,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension("purchase.checkout.block.render", () => (
  <GiftMessage />
));

function GiftMessage() {
  const [isGift, setIsGift] = useState(false);
  const [message, setMessage] = useState("");
  const applyAttributeChange = useApplyAttributeChange();

  useEffect(() => {
    if (isGift && message) {
      applyAttributeChange({
        type: "updateAttribute",
        key: "gift_message",
        value: message,
      });
    }
  }, [isGift, message]);

  return (
    <BlockStack spacing="loose">
      <Checkbox checked={isGift} onChange={setIsGift}>
        This is a gift
      </Checkbox>
      {isGift && (
        <TextField
          label="Gift Message"
          value={message}
          onChange={setMessage}
          multiline={3}
        />
      )}
    </BlockStack>
  );
}
```

---

## Liquid Template Example

```liquid
{% comment %} Product Card Snippet {% endcomment %}
<div class="product-card">
  <a href="{{ product.url }}">
    {% if product.featured_image %}
      <img
        src="{{ product.featured_image | img_url: 'medium' }}"
        alt="{{ product.title | escape }}"
        loading="lazy"
      >
    {% endif %}
    <h3>{{ product.title }}</h3>
    <p class="price">{{ product.price | money }}</p>
    {% if product.compare_at_price > product.price %}
      <p class="sale-badge">Sale</p>
    {% endif %}
  </a>
</div>
```

---

## Webhook Configuration

In `shopify.app.toml`:

```toml
[webhooks]
api_version = "2026-01"

[[webhooks.subscriptions]]
topics = ["orders/create", "orders/updated"]
uri = "/webhooks/orders"

[[webhooks.subscriptions]]
topics = ["products/update"]
uri = "/webhooks/products"

# GDPR mandatory webhooks (required for app approval)
[webhooks.privacy_compliance]
customer_data_request_url = "/webhooks/gdpr/data-request"
customer_deletion_url = "/webhooks/gdpr/customer-deletion"
shop_deletion_url = "/webhooks/gdpr/shop-deletion"
```

---

## Best Practices

### API Usage

- Use GraphQL over REST for new development
- Request only fields you need (reduces query cost)
- Implement cursor-based pagination with `pageInfo.endCursor`
- Use bulk operations for processing more than 250 items
- Handle rate limits with exponential backoff

### Security

- Store API credentials in environment variables
- Always verify webhook HMAC signatures before processing
- Validate OAuth state parameter to prevent CSRF
- Request minimal access scopes
- Use session tokens for embedded apps

### Performance

- Cache API responses when data doesn't change frequently
- Use lazy loading in extensions
- Optimize images in themes using `img_url` filter
- Monitor GraphQL query costs via response headers

---

## Troubleshooting

**IF you see rate limit errors:**
→ Implement exponential backoff retry logic
→ Switch to bulk operations for large datasets
→ Monitor `X-Shopify-Shop-Api-Call-Limit` header

**IF authentication fails:**
→ Verify the access token is still valid
→ Check that all required scopes were granted
→ Ensure OAuth flow completed successfully

**IF extension is not appearing:**
→ Verify the extension target is correct
→ Check that extension is published via `shopify app deploy`
→ Confirm the app is installed on the test store

**IF webhook is not receiving events:**
→ Verify the webhook URL is publicly accessible
→ Check HMAC signature validation logic
→ Review webhook logs in Partner Dashboard

**IF GraphQL query fails:**
→ Validate query against schema (use GraphiQL explorer)
→ Check for deprecated fields in error message
→ Verify you have required access scopes

---

## Reference Files

For detailed implementation guides, read these files:

- `references/app-development.md` - OAuth authentication flow, GraphQL mutations for products/orders/billing, webhook handlers, billing API integration
- `references/extensions.md` - Checkout UI components, Admin UI extensions, POS extensions, Shopify Functions for discounts/payment/delivery
- `references/themes.md` - Liquid syntax reference, theme directory structure, sections and snippets, common patterns

---

## Scripts

- `scripts/shopify_init.py` - Interactive project scaffolding. Run: `python scripts/shopify_init.py`
- `scripts/shopify_graphql.py` - GraphQL utilities with query templates, pagination, rate limiting. Import: `from shopify_graphql import ShopifyGraphQL`

---

## Official Documentation Links

- Shopify Developer Docs: https://shopify.dev/docs
- GraphQL Admin API Reference: https://shopify.dev/docs/api/admin-graphql
- Shopify CLI Reference: https://shopify.dev/docs/api/shopify-cli
- Polaris Design System: https://polaris.shopify.com

API Version: 2026-01 (quarterly releases, 12-month deprecation window)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
