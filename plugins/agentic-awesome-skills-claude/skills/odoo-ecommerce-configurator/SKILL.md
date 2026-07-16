---
name: odoo-ecommerce-configurator
description: "Expert guide for Odoo eCommerce and Website: product catalog, payment providers, shipping methods, SEO, and order-to-fulfillment workflow."
risk: safe
source: "self"
---

# Odoo eCommerce Configurator

## Overview

This skill helps you set up and optimize an Odoo-powered online store. It covers product publishing, payment gateway integration, shipping carrier configuration, cart and checkout customization, and the workflow from online order to warehouse fulfillment.

## When to Use This Skill

- Launching an Odoo eCommerce store for the first time.
- Integrating a payment provider (Stripe, PayPal, Adyen).
- Configuring shipping rates with carrier integration (UPS, FedEx, DHL).
- Optimizing product pages for SEO with Odoo Website tools.

## How It Works

1. **Activate**: Mention `@odoo-ecommerce-configurator` and describe your store scenario.
2. **Configure**: Receive step-by-step Odoo eCommerce setup with menu paths.
3. **Optimize**: Get SEO, conversion, and catalog best practices.

## Examples

### Example 1: Publish a Product to the Website

```text
Menu: Website → eCommerce → Products → Select Product

Fields to complete for a great product listing:
  Name:               Ergonomic Mesh Office Chair  (keyword-rich)
  Internal Reference: CHAIR-MESH-001               (required for inventory)
  Sales Price:        $299.00
  Website Description (website tab): 150–300 words of unique content

Publishing:
  Toggle "Published" in the top-right corner of the product form
  or via: Website → Go to Website → Toggle "Published" button

SEO (website tab → SEO section):
  Page Title:       Ergonomic Mesh Chair | Office Chairs | YourStore
  Meta Description: Discover the most comfortable ergonomic mesh office
                    chair, designed for all-day support...  (≤160 chars)

Website tab:
  Can be Sold: YES
  Website:     yourstore.com  (if running multiple websites)
```

### Example 2: Configure Stripe Payment Provider

```text
Menu: Website → Configuration → Payment Providers → Stripe → Configure
(or: Accounting → Configuration → Payment Providers → Stripe)

State: Test  (use Test mode until fully validated, then switch to Enabled)

Credentials (from your Stripe Dashboard → Developers → API Keys):
  Publishable Key: pk_live_XXXXXXXX
  Secret Key:      sk_live_XXXXXXXX  (store securely; never expose client-side)

Payment Journal: Bank (USD)
Capture Mode:    Automatic  (charge card immediately on order confirmation)
                 or Manual  (authorize only; charge later on fulfillment)

Webhook:
  Add Odoo's webhook URL in Stripe Dashboard → Webhooks
  URL: https://yourstore.com/payment/stripe/webhook
  Events: payment_intent.succeeded, payment_intent.payment_failed
```

### Example 3: Set Up Flat Rate Shipping with Free Threshold

```text
Menu: Inventory → Configuration → Delivery Methods → New

Name: Standard Shipping (3–5 business days)
Provider: Fixed Price
Delivery Product: [Shipping] Standard  (used for invoicing)

Pricing:
  Price: $9.99
  ☑ Free if order amount is above: $75.00

Availability:
  Countries: United States
  States: All states

Publish to website:
  ☑ Published  (visible to customers at checkout)
```

### Example 4: Set Up Abandoned Cart Recovery

```text
Menu: Email Marketing → Mailing Lists → (create a list if needed)

For automated abandoned cart emails in Odoo 16/17:
Menu: Marketing → Marketing Automation → New Campaign

Trigger: Odoo record updated
Model: eCommerce Cart (sale.order with state = 'draft')
Filter: Cart not updated in 1 hour AND not confirmed

Actions:
  1. Wait 1 hour
  2. Send Email: "You left something behind!"  (use a recovery email template)
  3. Wait 24 hours
  4. Send Email: "Last chance — items selling fast"

Note: Some Odoo hosting plans may require "Email Marketing" app enabled.
```

## Best Practices

- ✅ **Do:** Use **Product Variants** (color, size) instead of duplicate products — cleaner catalog and shared inventory tracking.
- ✅ **Do:** Enable **HTTPS** (SSL certificate) via your hosting provider and set HSTS in Website → Settings → Security.
- ✅ **Do:** Set up **Abandoned Cart Recovery** using Marketing Automation or a scheduled email sequence.
- ✅ **Do:** Add a **Stripe webhook** so Odoo is notified of payment events in real time — without it, failed payments may not update correctly.
- ❌ **Don't:** Leave the payment provider in **Test mode** in production — no real charges will be processed.
- ❌ **Don't:** Publish products without an **Internal Reference (SKU)** — it breaks inventory tracking and order fulfillment.
- ❌ **Don't:** Use the same Stripe key for Test and Production environments — always rotate to live keys before going live.

## Limitations

- **Carrier integration** (live UPS/FedEx rate calculation) requires the specific carrier connector module (e.g., `delivery_ups`) and a carrier account API key.
- Does not cover **multi-website** configuration — running separate storefronts with different pricelists and languages requires Enterprise.
- **B2B eCommerce** (customer login required, custom catalog and prices per customer) has additional configuration steps not fully covered here.
- Odoo eCommerce does not support **subscription billing** natively — that requires the Enterprise **Subscriptions** module.
