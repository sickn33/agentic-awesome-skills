---
name: odoo-l10n-compliance
description: "Country-specific Odoo localization: tax configuration, e-invoicing (CFDI, FatturaPA, SAF-T), fiscal reporting, and country chart of accounts setup."
risk: critical
source: community
date_added: "2026-03-04"
---

# Odoo Localization & Compliance (l10n)

## Overview

Odoo provides country localization modules (`l10n_*`) for charts of accounts, taxes, and fiscal reporting. This skill helps you install and configure the right localization, set up country-specific e-invoicing (Mexico CFDI, Italy FatturaPA, Poland SAF-T), and prepare fiscal configuration for qualified local review. Module coverage depends on the exact Odoo version, edition, and installed add-ons; a module name is not evidence that every listed report or integration is available.

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

Use this table as a discovery starting point, not a feature or legal-support guarantee. Confirm the version-specific module dependencies and reporting coverage before installation.

| Country | Starting module | Coverage to verify for the deployed version |
|---|---|---|
| 🇺🇸 USA | `l10n_us` | Chart of accounts, applicable US reports and separate payroll integrations |
| 🇲🇽 Mexico | `l10n_mx_edi` | CFDI 4.0 e-invoicing, SAT integration, IEPS tax |
| 🇪🇸 Spain | `l10n_es` | SII real-time VAT, Modelo 303/390, AEAT |
| 🇮🇹 Italy | `l10n_it_edi` | FatturaPA XML, SDI submission, reverse charge |
| 🇵🇱 Poland | `l10n_pl` | Applicable JPK exports and current VAT reporting |
| 🇧🇷 Brazil | `l10n_br` | Required Brazilian e-invoicing, tax and report add-ons; verify provider/publisher |
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
  Use the certificate/key menus documented for your Odoo version
  CSD Certificate (.cer file from SAT)
  Matching CSD Private Key (.key file from SAT)
  Password: the password for that CSD private key (not a FIEL/e.firma password)
  Configure the selected supported PAC and its separate credentials
  Use test certificates and the PAC test environment before production

Step 4: Issue a CFDI Invoice
  Create a test invoice with complete fiscal/product data
  Submit for signing through the configured PAC using the version-specific flow
  Inspect acceptance/rejection and the returned UUID (folio fiscal)
  PDF includes QR code + UUID for buyer verification
```

### Example 2: Review an EU B2B Fiscal Position

Do not apply one zero-rate rule to all EU goods and services. Confirm the supply,
customer VAT status, place-of-supply rules and required evidence with the local
accountant first. Prefer the localization's supplied taxes and fiscal positions.

```text
1. Identify the applicable localized tax and invoice wording for this supply.
2. Review its computation, account mappings and report tags in a test database.
   A percentage tax uses Percentage of Price; Fixed means a currency amount.
3. Configure a fiscal position mapping the domestic tax to the reviewed tax.
4. Restrict automatic detection to the relevant EU member countries and VAT
   conditions; "Europe" includes countries outside the EU.
5. Test domestic B2B/B2C, eligible EU B2B, invalid/missing VAT and export cases.
6. Have the accountant verify invoice totals, wording and fiscal reports.
```

### Example 3: Install and Validate a Localization

```bash
# In an authorized disposable/test database with a backup; installation mutates data
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

Reference: [Odoo 19 Mexican localization](https://www.odoo.com/documentation/19.0/applications/finance/fiscal_localizations/mexico.html). Use the documentation for the deployed version and current local tax-authority guidance before production. Never put private keys or passwords in chat, logs, or source control.
