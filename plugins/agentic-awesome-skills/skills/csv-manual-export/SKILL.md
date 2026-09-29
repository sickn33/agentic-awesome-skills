---
name: csv-manual-export
description: 'CSV Manual Export: a UTF-8 CSV template from a confirmed field list, empty by default, with no invented columns or values. Use for an import, staging or handoff file.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-28"
author: WHOISABHISHEKADHIKARI
tags: [csv, export, import, template, operations, data, helper]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# CSV Manual Export

**What it is:** a clean, empty CSV of a field list someone already confirmed - the
transport format, with nothing invented and nothing hidden.

## Overview

Produces a CSV representation of a confirmed business schema. Use it for CSV templates,
import files, Excel-compatible CSV, a Notion import CSV, a database staging CSV, or a
handoff file between systems.

CSV is data transport, not a database. This is a helper: it defines no table of its own
and renders whatever field list the active module already confirmed, so the header here
is the same header the module emits.

Layer: n/a. Fits: every stage. Table code: n/a - it renders the active module's table.

## When to Use This Skill

- give me a CSV template
- export this as a CSV
- I need a file to import into another system
- stage this data for a load
- hand this over to another team as a CSV
- make it Notion-importable

Also use it when a module has confirmed a field list and the user wants that list as a
file for a system that is not this repository's.

Do not use it when the user asked only for a mapping, an explanation, or a different
format. Then output only what was asked for.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "a template" -> an empty CSV template: header row, no data rows.
- "with a couple of rows to see the shape" -> a CSV with example rows, only when asked,
  and obviously fake.
- "this import rejected my file", "the columns are wrong" -> CSV correction: only the
  columns or escaping that was asked for.
- "what goes in which column" -> CSV column mapping: the mapping, no file.
- "for Notion", "to load into the accounting package" -> CSV for import into that system,
  which may need an encoding or a delimiter the user names.

Default to no example rows and to UTF-8:

```yaml
example_rows: false
encoding: UTF-8
```

Use UTF-8 with a byte order mark when Excel compatibility matters. Ask for a delimiter
only when the target system is one the user has named and its delimiter is not a comma.

### Step 2 - Ask only what is missing

Reuse everything already confirmed, including by the module that owns the field list: the
field names and types, the select options, the date and currency fields, the statuses and
the IDs. Never ask again for information the user has already supplied.

Ask one short question per message, and only when the answer changes the file:

> **Q:** Do you want the header only, or a couple of example rows?

> **Q:** Which system is importing this file?

If the answer does not materially change the result, do not ask.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: csv-manual-export
intent: null            # set in Step 1, one of: template, examples, import, correction, mapping
source_module: null     # the module whose field list this renders
target_system: null     # named only when the user names one
delimiter: ","
encoding: UTF-8
bom: true               # false only when the target system rejects a byte order mark
example_rows: false
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

`source_module` is the one field this skill needs that a module skill does not have. If it
is unknown, ask which list to export, because a header invented from a guess is a header
the user has to fix by hand.

### Step 4 - Recommend the smallest workflow

Produce an already requested output without asking again. For advice-only requests, give a short recommendation and offer the relevant output.

**Recommended approach:** one UTF-8 file, a header of the exact field names in the
canonical order, and no rows. Add a one-line type note beside it if the importing system
needs one.

**Why this one:** a CSV carries no types, formulas, relations or validation. The file is
the easy half; the columns that come in as Text on the far side are the half that decides
whether the import was worth doing.

**Workflow:** Field list confirmed -> Header written -> Encoding and delimiter set ->
(imported) -> Column types set on the far side

### Step 5 - Build only on request

Once the user asks, emit the CSV as data only. Keep prose outside machine-readable data; provide file links and material limitations separately.
Do not add SQL, JSON or a Notion mapping unless it was asked for - a file plus a paragraph
of explanation is not what "just the CSV" means.

#### The header

Every header comes from the confirmed field list, in the canonical order. Never rename a
column silently, reorder columns without reason, invent a column, or drop a field.

#### Empty by default

```csv
Field 1,Field 2,Field 3
```

No data rows. Leave a generated ID column blank in an empty template unless the target
system requires a value, and never invent production IDs.

#### Example rows

Only when the user explicitly asks, and then the rows are obviously fake, internally
consistent, non-sensitive, and presented as documentation. Never present a sample row as
a real record.

#### Escaping

Valid CSV, always. Quote a value that contains a comma, a quote or a line break, and
double any embedded quote. A file that parses is the whole product.

#### Types, stated separately if needed

CSV does not enforce types. If the target needs them, give the mapping beside the file:

| Column | Intended type |
|---|---|
| Amount | Currency |
| Due Date | Date |
| Status | Select |

Never claim the CSV itself enforces these types. Money stays numeric with no currency
symbol in the cell, because the currency is a separate fact the user confirms; when the
source schema embeds a currency, follow the source.

#### Dates

ISO `YYYY-MM-DD` when a machine-readable date is needed, or the format the user names.
Never invent a missing date, and never write today's date into a blank cell to fill it.

#### Before you hand it over

```
Headers match the canonical schema?
Correct order?
No invented values?
No accidental example row?
Valid CSV escaping?
Encoding appropriate for the target system?
```

## Field Reference

This skill has no Field Reference of its own, and it must not grow one. The active
module's Field Reference is the single source: the header written here is the header that
module emits, in the same order, so the two cannot drift.

If the field list is not in front of you, read `skills/<slug>/SKILL.md` for the module in
play. If it is missing or ambiguous, ask which list to export and stop.

## Input Modules

A helper has no field list of its own, so its input is a module: the Field Reference
that module already confirmed. Read that section - field names, types, order,
requiredness, options and calculations - and render exactly that. The list below is
every module that owns a field list, grouped by the layer its catalog gives it, and it
is generated from those catalogs and the module files, so it cannot name a module that
does not exist. `references/catalog.md` is the index to show a user; the module's own
`SKILL.md` holds the field list.

**Layer 1: Foundation** - 6 modules

- `skills/access-matrix/SKILL.md` - Access Matrix (16 fields)
- `skills/organization-design/SKILL.md` - Organization Design (13 fields)
- `skills/policy-acknowledgement/SKILL.md` - Policy Acknowledgement (12 fields)
- `skills/policy-library/SKILL.md` - Policy Library (14 fields)
- `skills/sop-company-wiki/SKILL.md` - SOP & Company Wiki (12 fields)
- `skills/accounting-software-selection/SKILL.md` - Accounting Software Selection (57 fields)

**Layer 2: Acquire** - 3 modules

- `skills/candidate-talent-pool/SKILL.md` - Candidate Talent Pool (17 fields)
- `skills/recruitment-pipeline/SKILL.md` - Recruitment Pipeline (21 fields)
- `skills/salary-benchmarking/SKILL.md` - Salary Benchmarking (13 fields)

**Layer 3: Onboard** - 9 modules

- `skills/asset-it-management/SKILL.md` - Asset & IT Management (19 fields)
- `skills/buddy-program-manager/SKILL.md` - Buddy Program Manager (12 fields)
- `skills/company-email-accounts/SKILL.md` - Company Email & Accounts (23 fields)
- `skills/intern-program/SKILL.md` - Intern Program (20 fields)
- `skills/offer-appointment/SKILL.md` - Offer & Appointment (18 fields)
- `skills/onboarding-playbook/SKILL.md` - Onboarding Playbook (9 fields)
- `skills/people-directory/SKILL.md` - People Directory (28 fields)
- `skills/pre-boarding/SKILL.md` - Pre-boarding (14 fields)
- `skills/probation-tracker/SKILL.md` - Probation Tracker (19 fields)

**Layer 4: Manage** - 15 modules

- `skills/360-feedback-system/SKILL.md` - 360° Feedback System (11 fields)
- `skills/attendance/SKILL.md` - Attendance (15 fields)
- `skills/capacity-workload-planner/SKILL.md` - Capacity & Workload Planner (12 fields)
- `skills/disciplinary-pip-tracker/SKILL.md` - Disciplinary & PIP Tracker (17 fields)
- `skills/expense-management/SKILL.md` - Expense Management (18 fields)
- `skills/issue-grievance-tracker/SKILL.md` - Issue & Grievance Tracker (19 fields)
- `skills/kpi-tracker/SKILL.md` - KPI Tracker (18 fields)
- `skills/leave-management/SKILL.md` - Leave Management (17 fields)
- `skills/okr-system/SKILL.md` - OKR System (20 fields)
- `skills/payroll-finance/SKILL.md` - Payroll & Finance (19 fields)
- `skills/performance-management/SKILL.md` - Performance Management (22 fields)
- `skills/team-calendar/SKILL.md` - Team Calendar (13 fields)
- `skills/time-tracking/SKILL.md` - Time Tracking (20 fields)
- `skills/expense-accounting/SKILL.md` - Expense Accounting (22 fields)
- `skills/salary-wage-accounting/SKILL.md` - Salary & Wage Accounting (27 fields)

**Layer 5: Develop** - 9 modules

- `skills/competency-matrix/SKILL.md` - Competency Matrix (9 fields)
- `skills/course-upskilling-requests/SKILL.md` - Course & Upskilling Requests (22 fields)
- `skills/gamification-engine/SKILL.md` - Gamification Engine (11 fields)
- `skills/knowledge-base/SKILL.md` - Knowledge Base (12 fields)
- `skills/learning-career-development/SKILL.md` - Learning & Career Development (19 fields)
- `skills/mentorship-program/SKILL.md` - Mentorship Program (16 fields)
- `skills/promotion-upgrade-requests/SKILL.md` - Promotion & Upgrade Requests (25 fields)
- `skills/recognition-rewards/SKILL.md` - Recognition & Rewards (14 fields)
- `skills/skill-gap-analysis/SKILL.md` - Skill Gap Analysis (14 fields)

**Layer 6: Engage** - 7 modules

- `skills/announcement-board/SKILL.md` - Announcement Board (13 fields)
- `skills/culture-retention/SKILL.md` - Culture & Retention (18 fields)
- `skills/dei-dashboard/SKILL.md` - DEI Dashboard (11 fields)
- `skills/employee-suggestion-hub/SKILL.md` - Employee Suggestion Hub (13 fields)
- `skills/events-activities/SKILL.md` - Events & Activities (20 fields)
- `skills/health-wellness/SKILL.md` - Health & Wellness (13 fields)
- `skills/internal-communication/SKILL.md` - Internal Communication (12 fields)

**Layer 7: Protect** - 13 modules

- `skills/admin-access-register/SKILL.md` - Admin Access Register (22 fields)
- `skills/audit-log/SKILL.md` - Audit Log (11 fields)
- `skills/board-governance/SKILL.md` - Board & Governance (16 fields)
- `skills/contract-document-renewal/SKILL.md` - Contract & Document Renewal (16 fields)
- `skills/data-privacy-controls/SKILL.md` - Data Privacy Controls (12 fields)
- `skills/document-management-system/SKILL.md` - Document Management System (13 fields)
- `skills/esop-equity-tracker/SKILL.md` - ESOP & Equity Tracker (14 fields)
- `skills/legal-compliance-vault/SKILL.md` - Legal & Compliance Vault (12 fields)
- `skills/tax-register/SKILL.md` - Tax Register (21 fields)
- `skills/template-library/SKILL.md` - Template Library (9 fields)
- `skills/source-document-filing/SKILL.md` - Source Document & Filing (22 fields)
- `skills/tds-booking-payment/SKILL.md` - TDS Booking & Payment (25 fields)
- `skills/audit-preparation/SKILL.md` - Audit Preparation (19 fields)

**Layer 8: Operate** - 16 modules

- `skills/budget-cash-flow/SKILL.md` - Budget & Cash Flow (15 fields)
- `skills/clients-accounts/SKILL.md` - Clients & Accounts (21 fields)
- `skills/invoices-billing/SKILL.md` - Invoices & Billing (26 fields)
- `skills/payments-received/SKILL.md` - Payments Received (13 fields)
- `skills/project-based-performance/SKILL.md` - Project-Based Performance (14 fields)
- `skills/projects-work-management/SKILL.md` - Projects & Work Management (22 fields)
- `skills/remote-work-tracker/SKILL.md` - Remote Work Tracker (12 fields)
- `skills/vendor-contractor-management/SKILL.md` - Vendor & Contractor Management (14 fields)
- `skills/purchase-accounting/SKILL.md` - Purchase Accounting (29 fields)
- `skills/sales-accounting/SKILL.md` - Sales Accounting (33 fields)
- `skills/receipt-accounting/SKILL.md` - Receipt Accounting (23 fields)
- `skills/payment-accounting/SKILL.md` - Payment Accounting (24 fields)
- `skills/petty-cash-management/SKILL.md` - Petty Cash Management (24 fields)
- `skills/day-book/SKILL.md` - Day Book (31 fields)
- `skills/party-ledger-reconciliation/SKILL.md` - Party / Ledger Reconciliation (27 fields)
- `skills/inventory-stock-reconciliation/SKILL.md` - Inventory / Stock Reconciliation (28 fields)

**Layer 9: Analyze** - 7 modules

- `skills/advanced-analytics-dashboard/SKILL.md` - Advanced Analytics Dashboard (11 fields)
- `skills/data-export-engine/SKILL.md` - Data Export Engine (11 fields)
- `skills/notification-reminder-hub/SKILL.md` - Notification & Reminder Hub (12 fields)
- `skills/reports-analytics/SKILL.md` - Reports & Analytics (11 fields)
- `skills/stakeholder-investor-reports/SKILL.md` - Stakeholder & Investor Reports (10 fields)
- `skills/monthly-closing-statements/SKILL.md` - Monthly Closing & Statements (32 fields)
- `skills/credit-cycle-analysis/SKILL.md` - Debtor & Creditor Credit-Cycle Analysis (33 fields)

**Layer 10: Exit** - 2 modules

- `skills/alumni-re-hire-tracker/SKILL.md` - Alumni & Re-hire Tracker (12 fields)
- `skills/offboarding-exit/SKILL.md` - Offboarding & Exit (18 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 1: Foundation** - 1 module

- `skills/accounting-software-selection/SKILL.md` - Accounting Software Selection (57 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 2: Document** - 1 module

- `skills/source-document-filing/SKILL.md` - Source Document & Filing (22 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 3: Record** - 4 modules

- `skills/purchase-accounting/SKILL.md` - Purchase Accounting (29 fields)
- `skills/sales-accounting/SKILL.md` - Sales Accounting (33 fields)
- `skills/receipt-accounting/SKILL.md` - Receipt Accounting (23 fields)
- `skills/payment-accounting/SKILL.md` - Payment Accounting (24 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 4: Cash** - 2 modules

- `skills/petty-cash-management/SKILL.md` - Petty Cash Management (24 fields)
- `skills/day-book/SKILL.md` - Day Book (31 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 5: Expense & Payroll** - 2 modules

- `skills/expense-accounting/SKILL.md` - Expense Accounting (22 fields)
- `skills/salary-wage-accounting/SKILL.md` - Salary & Wage Accounting (27 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 6: Statutory** - 1 module

- `skills/tds-booking-payment/SKILL.md` - TDS Booking & Payment (25 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 7: Reconcile** - 2 modules

- `skills/party-ledger-reconciliation/SKILL.md` - Party / Ledger Reconciliation (27 fields)
- `skills/inventory-stock-reconciliation/SKILL.md` - Inventory / Stock Reconciliation (28 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 8: Close & Analyse** - 2 modules

- `skills/monthly-closing-statements/SKILL.md` - Monthly Closing & Statements (32 fields)
- `skills/credit-cycle-analysis/SKILL.md` - Debtor & Creditor Credit-Cycle Analysis (33 fields)

**Sub-pack `accounting-audit-system-builder` - Layer 9: Audit** - 1 module

- `skills/audit-preparation/SKILL.md` - Audit Preparation (19 fields)

**Sub-pack `brand-growth-system-builder` - Layer 1: Foundation** - 1 module

- `skills/free-design-resources/SKILL.md` - Free Design Resources (18 fields)

**Sub-pack `brand-growth-system-builder` - Layer 2: Brand Design** - 3 modules

- `skills/design-theme-guide/SKILL.md` - Design Theme Guide (24 fields)
- `skills/logo-image-design/SKILL.md` - Logo & Image Design (20 fields)
- `skills/brand-kit-print-collateral/SKILL.md` - Brand Kit & Print Collateral (23 fields)

**Sub-pack `brand-growth-system-builder` - Layer 3: Acquire** - 4 modules

- `skills/business-website-setup/SKILL.md` - Business Website Setup (24 fields)
- `skills/gbp-local-seo-intent/SKILL.md` - GBP & Local SEO Intent (26 fields)
- `skills/seo-directory-backlinks/SKILL.md` - SEO Directories & Backlinks (22 fields)
- `skills/linktree-link-hub/SKILL.md` - Link-in-Bio Hub (16 fields)

**Sub-pack `brand-growth-system-builder` - Layer 6: Engage** - 3 modules

- `skills/business-email-template/SKILL.md` - Business Email Templates (22 fields)
- `skills/presentation-deck/SKILL.md` - Presentation Deck (18 fields)
- `skills/social-media-setup/SKILL.md` - Social Media Setup (22 fields)

**Sub-pack `brand-growth-system-builder` - Layer 7: Protect** - 1 module

- `skills/code-of-conduct/SKILL.md` - Professional Code of Conduct (17 fields)

**Sub-pack `brand-growth-system-builder` - Layer 8: Operate** - 1 module

- `skills/observability-cloud-planning/SKILL.md` - Cloud and Observability Planning (24 fields)

If the user has not named a module, ask which one before building: a file rendered from
a guess is the guess again, in a format the user did not choose.

## Select Options

A CSV cannot carry a select configuration. Options travel beside the file, as the
confirmed starting set the user adds on the far side - never as columns invented for the
file, and never as a value the user did not confirm.

## Relations

A relation is a reference key in a cell. The file carries the key and nothing else: a
working link is created on the far side, after the target database exists. Do not emit a
`VLOOKUP` column, a second sheet of lookups, or a promise that the link will resolve.

## Examples

**Prompt**

```
Export our expense claims as a CSV the finance team can load.
```

**Answered in one message, no intake needed** - the field list was already confirmed:

```
Read skills/expense-management/SKILL.md for the field list, then emit the header-only
UTF-8 CSV with a byte order mark, and one line naming the columns that need a date or
currency format on import.
```

**Prompt**

```
The import failed - the notes column had line breaks in it.
```

**Correction only**:

> A quoted field may contain a line break, but the line break has to be inside the quotes.
> Quote every value in `Reason` and `Notes`, and double any embedded quote, then export
> again.

**Documented shape** - a header row, no data. The row below is a documentation example:
emit empty templates unless the user explicitly requests examples.

```csv
Employee ID,Employee Name,Expense Type,Expense Date,Amount,Currency,Payment Method,Status,Claim ID
```

## Best Practices

- One question per message, and only one that changes the file.
- Reuse everything already confirmed, including by the module that owns the list.
- Exact headers, canonical order, and no silent renaming.
- Empty by default, and no example row nobody asked for.
- UTF-8, with a byte order mark when Excel is the reader.
- Quote anything containing a comma, a quote or a line break.
- No hidden transformations: the file is the field list, in order, with nothing added.

## Limitations

- It produces a file, not a database. Types, formulas, relations, validation rules, select
  configurations and constraints are all lost in the format and must be documented
  separately when required.
- There is no connection to any source system, no load, no scheduling, and no cleanup.
- Row limits and file size belong to the target system, not to this skill.
- A byte order mark helps Excel and can upset a strict importer, so it follows the target
  the user names.
- Nothing is verified until the user has imported the file and checked it.
- Legal, tax and payroll review is still required before the file drives real decisions.

## Security & Safety Notes

Do not export real passwords, banking details, health records, confidential employee
information or authentication credentials. If the user supplies data the parent workflow
safely requires, use it; otherwise the row stays out of the file.

When data is supplied for a requested review or conversion, use only the necessary
fields and avoid repeating sensitive identifiers. Template requests remain empty by default.
Do not claim that removing a message erases service storage.

Never claim the file was uploaded, loaded or accepted by another system. This skill
writes text, and the user does the import.

## Common Pitfalls

See the [bundled common-pitfalls reference](references/common-pitfalls.md) for review guidance.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @notion-manual-import - the same CSV, with the property mapping and the import steps.
- @spreadsheet-manual-build - the same field list as a formatted workbook.

## Reusable Prompt

```
I need [database] as a CSV, from the fields we already agreed.
Do not ask me for anything I have already told you.
Give me a UTF-8 file with a header of the exact field names in the same order, no data
rows unless I ask for examples, and correct quoting. Tell me which columns need a date,
number or currency format on the far side. Do not add SQL, JSON or a Notion mapping.
```
