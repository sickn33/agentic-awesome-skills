---
name: odoo-edi-connector
description: "Guide for implementing EDI (Electronic Data Interchange) with Odoo: X12, EDIFACT document mapping, partner onboarding, and automated order processing."
risk: critical
source: community
date_added: "2026-03-04"
---

# Odoo EDI Connector

## Overview

Electronic Data Interchange (EDI) is the standard for automated B2B document exchange — purchase orders, invoices, ASNs (Advance Shipping Notices). This skill guides you through mapping EDI transactions (ANSI X12 or EDIFACT) to Odoo business objects, setting up trading partner configurations, and automating inbound/outbound document flows.

## When to Use This Skill

- A retail partner requires EDI 850 (Purchase Orders) to do business with you.
- You need to send EDI 856 (ASN) when goods are shipped.
- Automating EDI 810 (Invoice) generation from Odoo confirmed deliveries.
- Mapping EDI fields to Odoo fields for a new trading partner.

## How It Works

1. **Activate**: Mention `@odoo-edi-connector` and specify the EDI transaction set and trading partner.
2. **Map**: Receive a complete field mapping table between EDI segments and Odoo fields.
3. **Automate**: Get Python code to parse incoming EDI files and create Odoo records.

## EDI ↔ Odoo Object Mapping

| EDI Transaction | Odoo Object |
|---|---|
| 850 Purchase Order | `sale.order` (inbound customer PO) |
| 855 PO Acknowledgment | Partner-specific business acknowledgment, mapped from order status |
| 856 ASN (Advance Ship Notice) | `stock.picking` (delivery order) |
| 810 Invoice | `account.move` (customer invoice) |
| 846 Inventory Inquiry | `product.product` stock levels |
| 997 Functional Acknowledgment | Syntax/functional acknowledgment, separate from business acceptance |

## Examples

### Example 1: Parse EDI 850 and Create Odoo Sale Order (Python)

```python
def process_850(edi_file_path):
    # Integration outline: implement against the pinned parser's documented API.
    raise NotImplementedError("Validate partner-specific X12 and atomic deduplication before creating orders")
```

Implement parsing against the selected library/version and the partner implementation guide. Do not assume dictionary access or transaction helpers exist in `pyx12`. Authenticate with an explicitly configured Odoo user and require HTTPS. Resolve the buyer by an agreed external identifier and each product by a unique partner SKU mapping; quarantine ambiguous/missing matches instead of selecting the first record or omitting lines. Validate currency, units, decimals, totals and dates before writing. Enforce atomic uniqueness on partner + interchange/transaction identity; a search followed by create is race-prone. Retain the original message with restricted access and a bounded retention policy.


### Example 2: Send EDI 997 Acknowledgment

A 997 reports syntax/functional acceptance according to the negotiated guide; it is not a business acceptance or an order confirmation. Use a tested EDI serializer/validator and the partner's required acknowledgment type/version (for example, 997 or 999), control numbers, envelope lengths and rejection details. Never emit an unconditional accepted acknowledgment before validation. The former hardcoded envelope is not a conformant production generator.


## Best Practices

- ✅ **Do:** Store every raw EDI transaction in an audit log table before processing.
- ✅ **Do:** Send the negotiated acknowledgment within the partner-agreed deadline; do not assume 997 or a universal 24-hour rule.
- ✅ **Do:** Negotiate a test cycle with trading partners before going live — use the partner-agreed test environment and ISA15 usage indicator `T`.
- ❌ **Don't:** Process EDI files synchronously in web requests — queue them for async processing.
- ❌ **Don't:** Hardcode trading partner qualifiers — store them in a configuration table per partner.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
