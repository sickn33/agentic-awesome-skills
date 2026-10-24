---
name: odoo-project-timesheet
description: "Expert guide for Odoo Project and Timesheets: task stages, billable time tracking, timesheet approval, budget alerts, and invoicing from timesheets."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo Project & Timesheet

## Overview

This skill helps you configure Odoo Project and Timesheets for service businesses, agencies, and consulting firms. It covers project setup with budgets, task stage management, employee timesheet logging, approval workflows, and converting approved timesheet hours to customer invoices.

## When to Use This Skill

- Setting up a new project with tasks, deadlines, and team assignments.
- Configuring billable vs. non-billable time tracking per project.
- Creating a timesheet approval workflow for managers.
- Invoicing customers based on logged hours (Time & Materials billing).

## How It Works

1. **Activate**: Mention `@odoo-project-timesheet` and describe your project or billing scenario.
2. **Configure**: Receive step-by-step setup instructions.
3. **Automate**: Get guidance on automatically generating invoices from approved timesheets.

## Examples

### Example 1: Create a Billable Project

Confirm Odoo version, edition, installed Sales/Project/Timesheets apps and billing permissions first. For Odoo 19, configure a service product with **Invoicing Policy: Based on Timesheets** and **Create on Order: Project & Task** (or a task in an existing project). Add it to a quotation for Acme, check the hourly unit and agreed $150 rate, then confirm the order only within authorized scope. Check that its task is linked to the intended sales order item.

Treat 120 planned hours and a notification at 96 hours as business requirements. Verify whether the installed version supports the desired alert; do not assume an automatic 80% budget-alert field exists.

### Example 2: Log Time on a Task

```text
Method A — Directly inside the Task (recommended for accuracy):
  Open Task → Timesheets tab → Add a Line
  Employee:    John Doe
  Date:        Today
  Description: "Initial wireframes and site map" (recommended for clear invoices; not necessarily a required field)
  Duration:    3:30  (3 hours 30 minutes)

Method B — Timesheets app (for end-of-day bulk entry):
  Menu: Timesheets → My Timesheets → New
  Project:  Website Redesign
  Task:     Wireframe Design
  Duration: 3:30
```

### Example 3: Enable Timesheet Approval Before Invoicing

Validation and invoice eligibility are separate settings. Where supported, configure the invoicing policy to include **only validated timesheets**; enabling a review workflow alone does not prove this. In a test database, record two entries, validate one, and check that the draft invoice excludes the other. Review the installed version's fixes and access rights before relying on locking behavior.

### Example 4: Invoice from Timesheets

Return to the linked sales order and reconcile its Delivered hours with eligible entries. Choose **Create Invoice → Regular invoice → Create Draft Invoice**. Check quantity, hourly rate, taxes, customer and included entries. Posting or sending requires billing authorization.

See the [Odoo 19 time-and-materials guide](https://www.odoo.com/documentation/19.0/applications/sales/sales/invoicing/time_materials.html) and [Odoo's validated-timesheet correction](https://mergebot.odoo.com/odoo/odoo/pull/261524).

## Best Practices

- ✅ **Do:** Verify the **only validated timesheets** invoicing setting and test exclusion of unvalidated hours before billing.
- ✅ **Do:** Agree an overrun threshold and verify a supported notification mechanism in the installed version.
- ✅ **Do:** Require **timesheet descriptions** — vague entries like "Work done" on invoices destroy client trust.
- ✅ **Do:** Use **Subtasks** to break work into granular pieces while keeping the parent task on the Kanban board.
- ❌ **Don't:** Mix billable and internal projects without tagging — it corrupts profitability and utilization reports.
- ❌ **Don't:** Log time on the Project itself (without a Task) — it cannot be reported at the task level.

## Limitations

- **Timesheet Approval** is an Enterprise-only feature in some Odoo versions — verify your plan includes it.
- Does not cover **Project Forecast** (resource capacity planning) — that requires the Enterprise Forecast app.
- **Time & Materials** invoicing works well for hourly billing but is not suited for **fixed-price projects** — use milestones or manual invoice lines for those.
- Timesheet entries logged outside an active project-task pair (e.g., on internal projects) are not assignable to customer invoices without custom configuration.
