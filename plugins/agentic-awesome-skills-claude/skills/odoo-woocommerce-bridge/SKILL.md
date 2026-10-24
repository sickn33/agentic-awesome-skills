---
name: odoo-woocommerce-bridge
description: "Sync Odoo with WooCommerce: products, inventory, orders, and customers via WooCommerce REST API and Odoo external API."
risk: critical
source: community
date_added: "2026-03-04"
---

# Odoo ↔ WooCommerce Bridge

## Overview

This skill guides you through building a reliable sync bridge between Odoo (the back-office ERP) and WooCommerce (the WordPress online store). It covers product catalog sync, real-time inventory updates, order import, and customer record management.

## When to Use This Skill

- Running a WooCommerce store with Odoo for inventory and fulfillment.
- Automatically pulling WooCommerce orders into Odoo as sale orders.
- Keeping WooCommerce product stock in sync with Odoo's warehouse.
- Mapping WooCommerce order statuses to Odoo delivery states.

## How It Works

1. **Activate**: Mention `@odoo-woocommerce-bridge` and describe your sync requirements.
2. **Design**: Get the field mapping table between WooCommerce and Odoo objects.
3. **Build**: Receive Python integration scripts using the WooCommerce REST API.

## Field Mapping: WooCommerce → Odoo

| WooCommerce | Odoo |
|---|---|
| `products` | `product.template` + `product.product` |
| `orders` | `sale.order` + `sale.order.line` |
| `customers` | `res.partner` |
| `stock_quantity` | `stock.quant` |
| `sku` | `product.product.default_code` |
| `order status: processing` | Sale Order: `sale` (confirmed) |
| `order status: completed` | Delivery: `done` |

The status/stock mapping is conceptual, not a direct state write: completing WooCommerce payment does not prove Odoo delivery, and stock changes must use authorized inventory workflows. Define warehouse/company, variant/SKU uniqueness, tax/currency/shipping/discount/refund mappings and available-to-sell stock first. Both API examples need authenticated account identity, pagination, HTTP error/timeout handling, and dry-run review; never silently select the first ambiguous customer/SKU. Atomic idempotency requires a server-side unique external shop+order ID and reconciliation after timeouts, not a display order number or client reference alone. Inventory pushes need a confirmed warehouse/reservation policy and fractional-unit handling.

## Examples

### Example 1: Pull WooCommerce Orders into Odoo (Python)

```python
from woocommerce import API
import xmlrpc.client
import os

# WooCommerce client
wcapi = API(
    url=os.getenv("WC_URL", "https://mystore.com"),
    consumer_key=os.getenv("WC_KEY"),
    consumer_secret=os.getenv("WC_SECRET"),
    version="wc/v3"
)

# Odoo client
odoo_url = os.getenv("ODOO_URL", "https://myodoo.example.com")
db = os.getenv("ODOO_DB", "my_db")
uid = int(os.getenv("ODOO_UID", "2"))
pwd = os.getenv("ODOO_PASSWORD")
models = xmlrpc.client.ServerProxy(f"{odoo_url}/xmlrpc/2/object")


def sync_orders():
    raise NotImplementedError("Add atomic shop+order-ID idempotency and reviewed mappings before enabling writes")
    # Processing status is not an import marker; orders may already exist in Odoo
    orders = wcapi.get("orders", params={"status": "processing", "per_page": 50}).json()

    for wc_order in orders:
        # Find or create Odoo partner
        email = wc_order['billing']['email']
        partner = models.execute_kw(db, uid, pwd, 'res.partner', 'search',
            [[['email', '=', email]]])
        if not partner:
            partner_id = models.execute_kw(db, uid, pwd, 'res.partner', 'create', [{
                'name': f"{wc_order['billing']['first_name']} {wc_order['billing']['last_name']}",
                'email': email,
                'phone': wc_order['billing']['phone'],
                'street': wc_order['billing']['address_1'],
                'city': wc_order['billing']['city'],
            }])
        else:
            partner_id = partner[0]

        # Create Sale Order in Odoo
        order_lines = []
        for item in wc_order['line_items']:
            product = models.execute_kw(db, uid, pwd, 'product.product', 'search',
                [[['default_code', '=', item['sku']]]])
            if len(product) != 1:
                raise ValueError("Missing or ambiguous SKU; quarantine whole order rather than drop a line")
            if product:
                order_lines.append((0, 0, {
                    'product_id': product[0],
                    'product_uom_qty': item['quantity'],
                    'price_unit': float(item['price']),
                }))

        models.execute_kw(db, uid, pwd, 'sale.order', 'create', [{
            'partner_id': partner_id,
            'client_order_ref': f"WC-{wc_order['number']}",
            'order_line': order_lines,
        }])

        # Do not change customer-facing payment/fulfillment status as an import marker.
        # Persist shop+order-ID mapping atomically with the Odoo order in the integration.
```

### Example 2: Push Odoo Stock to WooCommerce

```python
def sync_inventory_to_woocommerce():
    # Get all products with a SKU from Odoo
    products = models.execute_kw(db, uid, pwd, 'product.product', 'search_read',
        [[['default_code', '!=', False], ['type', '=', 'product']]],
        {'fields': ['default_code', 'qty_available']}
    )

    for product in products:
        sku = product['default_code']
        qty = int(product['qty_available'])

        # Update WooCommerce by SKU
        wc_products = wcapi.get("products", params={"sku": sku}).json()
        if wc_products:
            wcapi.put(f"products/{wc_products[0]['id']}", {
                "stock_quantity": qty,
                "manage_stock": True,
            })
```

## Best Practices

- ✅ **Do:** Use **SKU** as the unique identifier linking WooCommerce products to Odoo products.
- ✅ **Do:** Run inventory sync on a **schedule** (every 15-30 min) rather than real-time to avoid rate limits.
- ✅ **Do:** Log redacted operation IDs/status/errors; exclude customer addresses, credentials and full request/response bodies.
- ❌ **Don't:** Process the same WooCommerce order twice — flag it as processed immediately after import.
- ❌ **Don't:** Sync draft or cancelled WooCommerce orders to Odoo — filter by `status = processing` or `completed`.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
