---
name: odoo-hr-payroll-setup
description: "Expert guide for Odoo HR and Payroll: salary structures, payslip rules, leave policies, employee contracts, and payroll journal entries."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo HR & Payroll Setup

## Overview

This skill guides HR managers and payroll accountants through setting up Odoo HR and Payroll correctly. It covers salary structure creation with Python-computed rules, time-off policies, employee contract types, and the payroll → accounting journal posting flow.

## When to Use This Skill

- Creating a salary structure with gross pay, deductions, and net pay.
- Configuring annual leave, sick leave, and public holiday policies.
- Troubleshooting incorrect payslip amounts or missing rule contributions.
- Setting up the payroll journal to correctly post to accounting.

## How It Works

1. **Activate**: Mention `@odoo-hr-payroll-setup` and describe your payroll scenario.
2. **Configure**: Receive step-by-step setup for salary rules and leave allocation.
3. **Debug**: Paste a salary rule or payslip issue and receive a root cause analysis.

## Examples

### Example 1: Review a salary structure

Use the installed country localization and effective payroll year as the starting point. Record pay frequency, contract dates, taxable wage bases, approved earnings/deductions, statutory caps and employee withholding elections. Verify rule sequence and available variables against that Odoo version in a synthetic test payslip. Do not approximate US federal withholding as gross wages times a single employee rate: use the applicable [IRS Publication 15-T](https://www.irs.gov/publications/p15t) method and localization documentation, with payroll-professional review. A similarly named community module is not proof of W-4 compliance.

### Example 2: Configure a Time Off Type

```text
Menu: Time Off → Configuration → Time Off Types → New

Name: Annual Leave / PTO
Approval: Time Off Officer
Leave Validation: Time Off Officer  (single approver)
  or: "Both" for HR + Manager double approval

Allocation:
  ☑ Employees can allocate time off themselves
  Requires approval: No

Negative Balance: Not allowed (employees cannot go negative)

Then create initial allocations:
Menu: Time Off → Managers → Allocations → New
  Employee: [Each employee]
  Time Off Type: Annual Leave / PTO
  Allocation: 15 days
  Validity: Jan 1 – Dec 31 [current year]
```

### Example 3: Payroll Journal Entry Result

```text
Illustrative accounting reconciliation, not a tax calculation:
Gross expense: $5,000.00
Approved deductions/withholding: $600.00
Net salary payable: $4,400.00
Debit expense $5,000 = credits deductions payable $600 + net payable $4,400.
Payment clears the same $4,400 payable against bank.
Reconcile actual localization, employer liabilities and posted entries separately.
```

## Best Practices

- ✅ **Do:** Install your country's **payroll localization** (`l10n_us_hr_payroll`, `l10n_mx_hr_payroll`, etc.) before building custom rules — it provides pre-configured tax structures.
- ✅ **Do:** Use **salary rule inputs** (`inputs.ALLOWANCE.amount`) to pass variable values (bonuses, allowances, withholding rates) rather than hardcoding them in the rule formula.
- ✅ **Do:** Archive old salary structures rather than deleting them — active payslips reference their structure and will break if the structure is deleted.
- ✅ **Do:** Always set an active **Employee Contract** with correct dates and salary before generating payslips.
- ❌ **Don't:** Rewrite posted payroll/accounting history. Follow the installed localization’s approved reversal/correction process and preserve the audit trail.
- ❌ **Don't:** Use `contract.wage` in deduction rules without verifying whether the structure is monthly or annual — always check the contract wage period.

## Limitations

- **Odoo Payroll is Enterprise-only** — the Community Edition does not include the Payroll module (`hr_payroll`).
- US filing capabilities vary by localization/version/provider; verify current supported forms and jurisdiction requirements rather than assuming this guide supplies legal compliance.
- Does not cover **multi-country payroll** (employees in different countries require separate structures and localizations).
- **Expense reimbursements** via payslip (e.g., mileage, home office) require a custom salary rule input and are not covered in standard HR Payroll documentation.
