---
name: odoo-l10n-compliance
description: "Country-specific Odoo localization: tax configuration, e-invoicing (CFDI, FatturaPA, SAF-T), fiscal reporting, and country chart of accounts setup."
risk: unknown
source: community
---

# Odoo Localization & Compliance (l10n)

## Overview

Odoo provides localization modules (`l10n_*`) for 80+ countries that configure the correct chart of accounts, tax types, and fiscal reporting. This skill helps you install and configure the right localization, set up country-specific e-invoicing (Mexico CFDI, Italy FatturaPA, Poland SAF-T), and ensure fiscal compliance.

## When to Use This Skill

- Setting up Odoo for a company in a specific country (Mexico, Italy, Spain, US, etc.).
- Configuring country-required e-invoicing (electronic invoice submission to tax authorities).
- Setting up VAT/GST/IVA tax rules with correct fiscal positions.
- Generating required fiscal reports (VAT return, SAF-T, DIAN report).

## How It Works

1. **Activate**: Mention `@odoo-l10n-compliance` and specify your country and Odoo version.
2. **Install**: Get the exact localization module and configuration steps.
3. **Configure**: Receive tax code setup, fiscal position rules, and reporting guidance.

## Country Localization Modules

| Country | Module | Key Features |
|---|---|---|
| 🇺🇸 USA | `l10n_us` | GAAP CoA, Payroll (ADP bridge), 1099 reporting |
| 🇲🇽 Mexico | `l10n_mx_edi` | CFDI 4.0 e-invoicing, SAT integration, IEPS tax |
| 🇪🇸 Spain | `l10n_es` | SII real-time VAT, Modelo 303/390, AEAT |
| 🇮🇹 Italy | `l10n_it_edi` | FatturaPA XML, SDI submission, reverse charge |
| 🇵🇱 Poland | `l10n_pl` | SAF-T JPK_FA, VAT-7 return |
| 🇧🇷 Brazil | `l10n_br` | NF-e, NFS-e, SPED, ICMS/PIS/COFINS |
| 🇩🇪 Germany | `l10n_de` | SKR03/SKR04 CoA, DATEV export, UStVA |
| 🇨🇴 Colombia | `l10n_co_edi` | DIAN e-invoicing, UBL 2.1 |

## Examples

### Example 1: Configure Mexico CFDI 4.0

```
Step 1: Install module
  Apps → Search "Mexico" → Install "Mexico - Accounting"
  Also install: "Mexico - Electronic Invoicing" (l10n_mx_edi)

Step 2: Configure Company
  Settings → Company → [Your Company]
  Country: Mexico
  RFC: Your RFC number (tax ID)
  Company Type: Moral Person or Physical Person

Step 3: Upload SAT Certificates
  Accounting → Configuration → Certificates → New
  CSD Certificate (.cer file from SAT)
  Private Key (.key file from SAT)
  Password: Your FIEL password

Step 4: Issue a CFDI Invoice
  Create invoice → Confirm → CFDI XML generated automatically
  Sent to SAT → Receive UUID (folio fiscal)
  PDF includes QR code + UUID for buyer verification
```

### Example 2: EU Intra-Community VAT Setup (Any EU Country)

```
Menu: Accounting → Configuration → Taxes → New

Tax Name: EU Intra-Community Sales (0%)
Tax Type: Sales
Tax Scope: Services or Goods
Tax Computation: Fixed
Amount: 0%
Tax Group: Intra-Community

Label on Invoice: "Intra-Community Supply - VAT Exempt per Art. 138 VAT Directive"

Fiscal Position (created separately):
  Name: EU B2B Intra-Community
  Auto-detect: Country Group = Europe + VAT Required = YES
  Tax Mapping: Standard VAT Rate → 0% Intra-Community
```

### Example 3: Install and Validate a Localization

```bash
# Install via CLI (if module not in Apps)
./odoo-bin -d mydb --stop-after-init -i l10n_mx_edi

# Verify in Odoo:
# Apps → Installed → Search "l10n_mx" → Should show as Installed
```

## Best Practices

- ✅ **Do:** Install the localization module **before** creating any accounting entries — it sets up the correct accounts.
- ✅ **Do:** Use **Fiscal Positions** to automate tax switching for international customers (B2B vs B2C, domestic vs export).
- ✅ **Do:** Test e-invoicing in the **SAT/tax authority test environment** before going live.
- ❌ **Don't:** Manually create a chart of accounts if a localization module exists for your country.
- ❌ **Don't:** Mix localization tax accounts with custom accounts — it breaks fiscal reports.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
