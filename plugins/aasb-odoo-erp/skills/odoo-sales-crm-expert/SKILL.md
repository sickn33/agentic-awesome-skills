---
name: odoo-sales-crm-expert
description: 'Expert guide for Odoo Sales and CRM: pipeline stages, quotation templates, pricelists, sales teams, lead scoring, and forecasting.'
metadata:
  aas-risk: safe
  aas-source: self
  aas-date-added: '2026-03-04'
---

# Odoo Sales & CRM Expert

## Overview

This skill helps you configure and optimize Odoo Sales and CRM. It covers opportunity pipeline setup, automated lead assignment, quotation templates, pricelist strategies, sales team management, and the sales-to-invoice workflow.

## When to Use This Skill

- Designing CRM pipeline stages for your sales process.
- Creating a quotation template with optional products and bundles.
- Setting up pricelists with customer-tier pricing.
- Configuring automated lead assignment by territory or salesperson.

## How It Works

1. **Activate**: Mention `@odoo-sales-crm-expert` and describe your sales scenario.
2. **Configure**: Receive step-by-step Odoo setup instructions.
3. **Optimize**: Get recommendations for improving pipeline velocity and deal closure rate.

## Version and write scope

Confirm the deployed Odoo version, edition, installed modules and target company. Menus and feature availability vary. Use a test database for pricing, assignment and quotation changes; do not send quotations, take payments or confirm orders without the corresponding authority. Percentages and prices below are business examples, not measured forecasts.

## Examples

### Example 1: Configure CRM Pipeline Stages

```text
Menu: CRM → Configuration → Stages → New

Typical B2B Pipeline:
  Stage 1: New Lead          (probability: 10%)
  Stage 2: Qualified         (probability: 25%)
  Stage 3: Proposal Sent     (probability: 50%)
  Stage 4: Negotiation       (probability: 75%)
  Stage 5: Won               (is_won: YES — marks opportunity as closed-won)
  Stage 6: Lost              (mark as lost via the "Mark as Lost" button)

Tips:
  - Review overdue activities/unattended leads using the reporting options
    available in your version; do not assume a "Rotting Days" setting exists.
  - In Odoo 19, predictive scoring is always active. Manually editing an
    opportunity probability overrides automatic updates for that opportunity;
    the AI icon restores automatic probability. Stage percentages above are
    illustrative, not a built-in stage-probability configuration.
```

### Example 2: Create a Quotation Template

```text
Menu: Sales → Configuration → Quotation Templates → New
(Requires the "Sales Management" module — enabled in Sales Settings)

Template Name: SaaS Annual Subscription
Valid for: 30 days

Lines:
  1. Platform License   | Qty: 1 | Price: $1,200/yr | (required)
  2. Onboarding Package | Qty: 1 | Price: $500       | Optional
  3. Premium Support    | Qty: 1 | Price: $300/yr    | Optional
  4. Extra User License | Qty: 0 | Price: $120/user  | Optional

Signature & Payment:
  ☑ Online Signature required before order confirmation
  ☑ Online Payment (deposit) — 50% upfront

Notes section:
  "Prices valid until expiration date. Subject to Schedule A terms."
```

### Example 3: Customer Tier Pricelist (VIP Discount)

```text
Menu: Sales → Configuration → Settings
  ☑ Enable Pricelists

Menu: Sales → Configuration → Pricelists → New

Name: VIP Customer — 15% Off
Currency: USD
Discount Policy: Show public price & discount on quotation

Rules:
  Apply To: All Products
  Compute Price: Discount
  Discount: 15%
  Min. Quantity: 1

Assign to a customer:
  Customer record → Sales & Purchase tab → Pricelist → VIP Customer
```

## Best Practices

- ✅ **Do:** Use **Lost Reasons** (CRM → Configuration → Lost Reasons) to build a dataset of why deals are lost — invaluable for sales coaching.
- ✅ **Do:** Enable **Sales Teams** with revenue targets so pipeline forecasting is meaningful per team.
- ✅ **Do:** Set **Expected Revenue** and **Closing Date** on every opportunity — these feed the revenue forecast dashboard.
- ✅ **Do:** Use **Quotation Templates** to standardize offers and reduce quoting time across the team.
- ❌ **Don't:** Skip the CRM opportunity when selling — going directly from lead to invoice breaks pipeline analytics.
- ❌ **Don't:** Manually edit prices on quotation lines as a workaround — set up proper pricelists instead.
- Review predictive scoring variables and historical data quality; compare forecasts with actual outcomes rather than assuming accuracy.

## Limitations

- Odoo 19 documents a **Commissions** feature in Sales; check the installed edition/modules before assuming custom development is required.
- The **Quotation Template** optional product feature requires the **Sale Management** module; it is not available in the base `sale` module.
- Rule-based assignment can use team/member domains; confirm available geographic fields and test overlapping rules before enabling repeated assignment.
- Odoo CRM does not have native **email sequence / cadence** automation — use the **Email Marketing** or **Marketing Automation** modules for drip campaigns.

References: [Odoo 19 predictive scoring and assignment](https://www.odoo.com/documentation/19.0/applications/sales/crm/track_leads/lead_scoring.html), [Odoo 19 Sales commissions](https://www.odoo.com/documentation/19.0/applications/sales/sales/commissions.html).
