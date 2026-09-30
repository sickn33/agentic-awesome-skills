---
name: spreadsheet-manual-build
description: 'Spreadsheet Manual Build: an empty Excel workbook or CSV from a confirmed field list, formatted and validated. Use for an xlsx template or a manual register.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-28"
author: WHOISABHISHEKADHIKARI
tags: [spreadsheet, excel, xlsx, workbook, manual, operations, template, helper]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Spreadsheet Manual Build

**What it is:** a formatted, empty workbook from a field list someone has already
confirmed - no dashboards nobody asked for, no invented rows.

## Overview

Prepares a spreadsheet or Excel workbook from confirmed business requirements. Use it
when the user wants an Excel workbook, a spreadsheet template, an `.xlsx` file, a manually
editable register, an importable table, or a workbook built from another skill's field
list.

The workbook is built only from confirmed fields. This is a helper: it defines no table of
its own and renders whatever field list the active module already confirmed, so the
workbook and the module's CSV cannot disagree.

Layer: n/a. Fits: every stage. Table code: n/a - it renders the active module's table.

## When to Use This Skill

- I need an Excel workbook
- give me a spreadsheet template
- I want an `.xlsx` file
- build me a register I can edit by hand
- make this importable as a table
- build a workbook from the fields we agreed

Also use it when a module has confirmed a field list and the user wants that list as a
workbook rather than as DDL or a schema.

Do not use it to decide which fields the business needs. That is the module skill's job,
and this one starts from what it confirmed.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "a template", "an empty workbook" -> template only. Output: an empty workbook with
  headers and formatting.
- "with a couple of rows to see the shape" -> workbook with examples, and only when the
  user asked. The data is obviously fake.
- "the dates are showing as text", "the column is too narrow" -> fix existing workbook.
  Output: only the structure or formatting that was asked for.
- "how should these fields sit in the sheet" -> mapping only. Output: the column plan,
  no file.

Never produce more than the intent asked for. A fix does not become a rebuild, and a
mapping does not become a file.

### Step 2 - Ask only what is missing

Reuse everything already confirmed, including by the module that owns the field list: the
workbook purpose, the field names and types, the select options, the date and currency
fields, any formula the parent skill defines explicitly, the statuses, and the IDs. Never
ask again for information the user has already supplied.

Ask one short question per message, and only when the answer changes the output:

> **Q:** Do you want `.xlsx` or CSV?

> **Q:** Should this be an empty template or include example rows?

If the answer does not materially change the result, do not ask, and default to:

```yaml
format: xlsx
example_rows: false
```

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: spreadsheet-manual-build
intent: null            # set in Step 1, one of: template, examples, fix, mapping
source_module: null     # the module whose field list this renders
requested_outputs: []   # xlsx | csv | mapping
example_rows: false
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

`source_module` is the one field this skill needs that a module skill does not have. If it
is unknown, ask which database to prepare, because a workbook built from a guess is a
rebuild of the guess later.

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One sheet, one header row, one column per confirmed field,
frozen and filtered. That is a working register on day one.

**Why this one:** workbooks fail from decoration, not from missing columns. A single
filtered sheet gets maintained; a dashboard nobody opens does not, and every extra tab is
a second thing to keep in step with the first.

**Workflow:** Field list confirmed -> Columns and formats set -> Header frozen and
filtered -> (rows entered by the user) -> Reviewed

Default to one sheet unless the confirmed workflow requires more. Do not create
dashboards, charts, lookup sheets or instruction tabs unless the user asks for them or the
confirmed workflow clearly requires them. The default sheet name is `Register`.

### Step 5 - Build only on request

Once the user asks, emit the workbook or the CSV as data only. No preamble, no summary, no
closing line. Every column comes from the canonical field list, with the exact field
names, in the same order, every time.

A `.xlsx` is a real file. A CSV is not a workbook: a CSV is UTF-8 with a byte order mark
so Excel opens the text correctly, plus a note of which columns need a number, date or
currency format applied. Create `.xlsx` only when the user asks for a workbook.

#### Column rules

| Canonical type | Spreadsheet format |
|---|---|
| id | Text |
| title | Text |
| text | Text |
| long_text | Text, wrapped |
| number | Number |
| currency | Currency or Accounting, and only when the currency is known |
| percentage | Number on a 0–100 scale; convert to fraction before Percentage formatting |
| date | Date |
| datetime | Date + Time |
| checkbox | TRUE/FALSE |
| select | Data validation list |
| multi_select | Text, unless another structure is explicitly requested |
| url | Hyperlink or Text |
| email | Text |
| phone | Text |
| relation | Text reference key, unless the workbook design explicitly supports lookups |

#### Formatting

Practical business formatting only:

- a bold header row
- the top row frozen
- an autofilter over the header
- sensible column widths
- a date format on date fields
- a number format on numeric fields
- wrapped long-text fields

No decorative formatting that reduces usability. A currency format is applied only where
the user has named the currency; where they have not, the column stays numeric and the
currency is recorded separately, because a currency symbol in a cell is an assumption
nobody asked for.

#### Select fields

For a confirmed select field, use data validation where practical, listing only the
confirmed options:

```text
Status:
Draft
Filed
Paid
Overdue
Amended
```

Never invent a status. A starting set is a suggestion, and the user renames it to match
how the business talks.

#### Formulas

Never invent a formula. One may be added only when the parent skill defines it, or when
the user asks for it and gives the rule. A value computed elsewhere - `Net Tax Payable`,
`Days to Due`, `Balance`, `Variance` - stays an input or an output column. If the parent
skill says the calculation belongs in accounting or tax software, that rule stands and no
Excel formula is written for it.

#### IDs

Do not auto-generate production IDs unless the user requests it, and leave the ID column
blank in an empty template. If the user wants an automatic spreadsheet ID, confirm the
required pattern first rather than guessing one.

#### Before you hand it over

```
Workbook name confirmed?
Sheet names necessary, or is one enough?
Every column from the canonical schema, and nothing else?
No invented fields?
No invented formulas?
No fake rows unless requested?
Correct date formats?
Correct number formats?
Only the confirmed select options?
```

## Field Reference

This skill has no Field Reference of its own, and it must not grow one. The active
module's Field Reference is the single source: the same field list that produces its CSV,
SQL, JSON Schema and Notion mapping produces this workbook, so a column can never appear
here that is absent there.

If the field list is not in front of you, read `skills/<slug>/SKILL.md` for the module in
play. If it is missing or ambiguous, ask which workbook to prepare and stop.

## Input Modules

A helper has no field list of its own, so its input is a module: the Field Reference
that module already confirmed. Read that section - field names, types, order,
requiredness, options and calculations - and render exactly that. The list below is
every module that owns a field list, grouped by the layer its catalog gives it, and it
is generated from those catalogs and the module files, so it cannot name a module that
does not exist. `CATALOG.md` is the index to show a user; the module's own
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

Option lists belong to the source module. Emit them as a data validation list the user
confirms, never as a settled taxonomy, and never as a value the user has to guess.

## Relations

A relation is a reference key in a cell, not a live link. Do not build lookup sheets or
`VLOOKUP` chains to make a link work unless the user asks for that design explicitly, and
if they do, ask which sheet holds the target list first - a lookup with no confirmed
source returns blanks that look like real answers.

## Examples

**Prompt**

```
Give me an Excel register for the leave requests we already agreed on.
```

**Answered in one message, no intake needed** - the field list was already confirmed:

```
Read skills/leave-management/SKILL.md for the field list, then emit the .xlsx with one
sheet, a frozen filtered header, and Leave Type and Status as validation lists.
```

**Prompt**

```
The dates in my register are sorting alphabetically.
```

**Fix only** - formatting change, no rebuild:

> Select the leave date column and apply a date format, `YYYY-MM-DD` or the format your
> business writes. A column still stored as text sorts as text, whatever it looks like.

**Documented shape** - a leave register as a header row, no data. The column below is a
documentation example: emit empty templates unless the user explicitly requests examples.

```csv
Employee ID,Employee Name,Leave Type,Start Date,End Date,Days,Reason,Status,Approver
```


See the [Best Practices](references/best-practices.md) reference for the full guidance.

## Limitations

- It formats a field list someone else confirmed. It never decides the schema.
- It produces a file, not a system. There is no automation, no sync, no validation across
  rows, and no connection to any source system.
- Data validation lists are a convenience, not a rule: a pasted value can still get in.
- Multi-select and relation fields are text in a single cell. Anything richer needs a
  design the user asks for.
- Nothing here is verified until the user has entered rows and checked them.
- Legal, tax and payroll review is still required before a register drives real decisions.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

