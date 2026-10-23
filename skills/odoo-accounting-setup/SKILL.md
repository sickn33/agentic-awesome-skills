---
name: odoo-accounting-setup
description: "Expert guide for configuring Odoo Accounting: chart of accounts, journals, fiscal positions, taxes, payment terms, and bank reconciliation."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo Accounting Setup

## Overview

This skill guides functional consultants and business owners through setting up Odoo Accounting correctly from scratch. It covers chart of accounts configuration, journal setup, tax rules, fiscal positions, payment terms, and the bank statement reconciliation workflow.

## When to Use This Skill

- Setting up a new Odoo instance for a company for the first time.
- Configuring multi-currency or multi-company accounting.
- Troubleshooting tax calculation or fiscal position mapping errors.
- Creating payment terms for installment billing (e.g., Net 30, 50% upfront).

## How It Works

1. **Activate**: Mention `@odoo-accounting-setup` and describe your accounting scenario.
2. **Configure**: Receive step-by-step Odoo menu navigation with exact field values.
3. **Validate**: Get a checklist to verify your setup is complete and correct.

## Examples

### Example 1: Create a Payment Term (Net 30 with 2% Early Pay Discount)

```text
Menu: Accounting → Configuration → Payment Terms → New

Name: Net 30 / 2% Early Pay Discount
Company: [Your Company]

Lines:
  Line 1:
    - Due Type: Percent
    - Value: 100%
    - Due: 30 days (full balance due in 30 days)

Early Payment Discount (Odoo 16+):
  Discount %: 2
  Discount Days: 10
  Tax reduction: Select the localization-approved treatment

Accounting → Configuration → Settings → Default Accounts:
  Cash Discount Gain account: [localization-approved account]
  Cash Discount Loss account: [localization-approved account]
```

> **Note (v16+):** Use the built-in **Early Payment Discount** field instead of the old split-line workaround. Configure the discount accounts and tax treatment, then test both early and late payments; automatic entries depend on the configuration and reconciliation workflow.

### Example 2: Fiscal Position for EU VAT (B2B Intra-Community)

```text
Menu: Accounting → Configuration → Fiscal Positions → New

Name: EU Intra-Community B2B
Auto-detection: ON
  - Country Group: [validated EU member-state group, not all of Europe]
  - VAT Required: YES (also validate registration and transaction eligibility)

Tax Mapping:
  Domestic tax → localization-approved intra-community tax
  Purchase tax → localization-approved reverse-charge tax with required reporting tags

Account Mapping:
  (Leave empty unless your localization requires account remapping)
```

### Example 3: Reconciliation Model for Bank Fees

```text
Menu: Accounting → Configuration → Reconciliation Models → New

Name: Bank Fee Auto-Match
Type: Write-off
Matching Order: 1

Conditions:
  - Label Contains: "BANK FEE" OR "SERVICE CHARGE"
  - Amount Type: Amount is lower than: $50.00

Action:
  - Account: 6200 Bank Charges
  - Tax: None
  - Analytic: Administrative
```

## Best Practices

- ✅ **Do:** Install your country's **localization module** first (`l10n_us`, `l10n_mx`, etc.) before manually creating accounts — it sets up the correct chart of accounts.
- ✅ **Do:** Use **Fiscal Positions** to automate B2B vs B2C tax switching — never change taxes manually on individual invoices.
- ✅ **Do:** Lock accounting periods (Accounting → Actions → Lock Dates) after month-end closing to prevent retroactive edits.
- ✅ **Do:** Use the **Early Payment Discount** feature (v16+) instead of splitting payment term lines for discount modelling.
- ❌ **Don't:** Delete journal entries — always reverse them with a credit note or the built-in reversal function.
- ❌ **Don't:** Mix personal and business transactions in the same journal.
- ❌ **Don't:** Create manual journal entries to fix bank reconciliation mismatches — use the reconciliation model workflow instead.

## Limitations

- Does not cover **multi-currency revaluation** or foreign exchange gain/loss accounting in depth.
- **Country-specific e-invoicing** (CFDI, FatturaPA, SAF-T) requires additional localization modules — use `@odoo-l10n-compliance` for those.
- Payroll accounting integration (salary journals, deduction accounts) is not covered here — use `@odoo-hr-payroll-setup`.
- Menu labels, lock-date controls and fields vary by version, edition and installed modules. Establish those inputs before providing exact navigation.
- These are configuration examples, not tax advice. A qualified accountant must approve accounts, tax eligibility and reporting treatment before live posting; zero VAT alone does not implement reverse-charge reporting.
- See [Odoo 17 cash discount configuration](https://www.odoo.com/documentation/17.0/applications/finance/accounting/customer_invoices/cash_discounts.html).
