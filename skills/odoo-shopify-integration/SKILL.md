---
name: odoo-shopify-integration
description: "Connect Odoo with Shopify: sync products, inventory, orders, and customers using the Shopify API and Odoo's external API or connector modules."
risk: critical
source: community
date_added: "2026-03-04"
---

# Odoo ↔ Shopify Integration

## Overview

This skill guides you through integrating Odoo with Shopify — syncing your product catalog, real-time inventory levels, incoming orders, and customer data. It covers evaluating a connector and designing a custom integration. Verify each connector's actual publisher, support, license and version compatibility; do not assume an official Enterprise connector. Select Shopify and Odoo API versions supported by the deployed systems before implementation.

## When to Use This Skill

- Selling on Shopify while managing inventory in Odoo.
- Automatically creating Odoo sales orders from Shopify purchases.
- Keeping Odoo stock levels in sync with Shopify product availability.
- Mapping Shopify product variants to Odoo product templates.

## How It Works

1. **Activate**: Mention `@odoo-shopify-integration` and describe your sync scenario.
2. **Design**: Receive the data flow architecture and field mapping.
3. **Build**: Get code snippets for the Shopify webhook receiver and Odoo API caller.

## Data Flow Architecture

```
SHOPIFY                          ODOO
--------                         ----
Product Catalog <──────sync──────  Product Templates + Variants
Inventory Level <──────sync──────  Stock Quants (real-time)
New Order       ───────push──────> Sale Order (draft; reviewed confirmation)
Customer        ───────push──────> res.partner (created if new)
Fulfillment     <──────push──────  Delivery Order validated
```

## Examples

### Example 1: Safe order-import procedure

Implement these steps in an authorized test database before writing production data:

1. Authenticate to Odoo with a dedicated least-privilege integration account;
   load secrets from approved secret storage, never inline them in source.
2. Validate the webhook as below before parsing or trusting order/customer fields.
3. Store a unique mapping of shop + Shopify order ID to Odoo order ID. Enforce it
   transactionally so retries and concurrent deliveries cannot create duplicates.
4. Resolve customers and variants from durable external-ID mappings. Email and
   SKU are optional, editable and potentially non-unique; missing or ambiguous
   mappings go to review rather than choosing the first match.
5. Validate quantities, currency, discounts, taxes, shipping, refunds and company
   context. Reconcile totals with Shopify; do not blindly convert prices to binary
   floats or rely on Odoo defaults for fiscal treatment.
6. Create a draft sale order. Confirm, invoice or fulfill only under the selected
   business policy and granted authority. Track failures and reconcile later events.

### Example 2: Authenticate an HTTPS webhook before processing (Python)

This helper illustrates raw-body authentication only; it is not a deployable
receiver or a complete idempotent queue. The receiver must enforce a body-size
limit, expected shop/topic and payload schema, then durably enqueue verified
messages with delivery/order deduplication before returning success.

```python
import base64
import hashlib
import hmac

def valid_shopify_hmac(raw_body: bytes, supplied_header: str, app_secret: bytes) -> bool:
    expected = base64.b64encode(
        hmac.new(app_secret, raw_body, hashlib.sha256).digest()
    )
    return bool(app_secret) and bool(supplied_header) and hmac.compare_digest(
        expected, supplied_header.encode("utf-8")
    )

# In the receiver: read the original request bytes before any JSON parsing.
# Reject invalid/missing X-Shopify-Hmac-SHA256 with HTTP 401.
# Only after verification: parse and validate JSON, then durably enqueue it.
# Store X-Shopify-Webhook-Id under a unique constraint to deduplicate delivery.
```

See [Shopify webhook verification and duplicate handling](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries). Use the same app secret that signed the delivery; do not log it or full customer payloads.

## Best Practices

- ✅ **Do:** Use Shopify's **webhook system** for real-time order sync instead of polling.
- ✅ **Do:** Reconcile shop-scoped variant mappings; enforce any SKU uniqueness assumption explicitly before using it as a secondary key.
- ✅ **Do:** Validate Shopify webhook HMAC signatures before processing any payload.
- ❌ **Don't:** Sync inventory from both systems simultaneously without a "master system" — pick one as the source of truth.
- Maintain explicit Shopify variant-to-Odoo variant mappings scoped to the shop. Use SKUs only after checking uniqueness and handling changes; neither a product ID nor a SKU alone identifies all cross-system variants.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
