---
name: odoo-qweb-templates
description: "Expert in Odoo QWeb templating for PDF reports, email templates, and website pages. Covers t-if, t-foreach, t-field, and report actions."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo QWeb Templates

## Overview

QWeb is Odoo's primary templating engine, used for PDF reports, website pages, and email templates. This skill generates correct, well-structured QWeb XML with proper directives, translation support, and report action bindings.

## When to Use This Skill

- Creating a custom PDF report (invoice, delivery slip, certificate).
- Building a QWeb email template triggered by workflow actions.
- Designing Odoo website pages with dynamic content.
- Debugging QWeb rendering errors (`t-if`, `t-foreach` issues).

## How It Works

1. **Activate**: Mention `@odoo-qweb-templates` and describe the report or template needed.
2. **Generate**: Receive a complete `ir.actions.report` record and QWeb template.
3. **Debug**: Paste a broken template to identify and fix rendering issues.

## Examples

### Example 1: Custom PDF Report

```xml
<!-- Report Action -->
<record id="action_report_patient_card" model="ir.actions.report">
    <field name="name">Patient Card</field>
    <field name="model">hospital.patient</field>
    <field name="report_type">qweb-pdf</field>
    <field name="report_name">hospital_management.report_patient_card</field>
    <field name="binding_model_id" ref="model_hospital_patient"/>
</record>

<!-- QWeb Template -->
<template id="report_patient_card">
    <t t-call="web.html_container">
        <t t-foreach="docs" t-as="doc">
            <t t-call="web.external_layout">
                <div class="page">
                    <h2>Patient Card</h2>
                    <table class="table table-bordered">
                        <tr>
                            <td><strong>Name:</strong></td>
                            <td><t t-field="doc.name"/></td>
                        </tr>
                        <tr>
                            <td><strong>Doctor:</strong></td>
                            <td><t t-field="doc.doctor_id.name"/></td>
                        </tr>
                        <tr>
                            <td><strong>Status:</strong></td>
                            <td><t t-field="doc.state"/></td>
                        </tr>
                    </table>
                </div>
            </t>
        </t>
    </t>
</template>
```

### Example 2: Conditional Rendering

```xml
<!-- Show a warning block only if the patient is not confirmed -->
<t t-if="doc.state == 'draft'">
    <div class="alert alert-warning">
        <strong>Warning:</strong> This patient has not been confirmed yet.
    </div>
</t>
```

## Best Practices

- ✅ **Do:** Use `t-field` for model fields — Odoo auto-formats dates, monetary values, and booleans correctly.
- ✅ **Do:** Use `t-out` for escaped output of ordinary strings; `t-esc` remains an alias in Odoo 17. Values already marked safe require separate trust review.
- ✅ **Do:** Call `web.external_layout` for PDF reports to automatically include the company header, footer, and logo.
- ✅ **Do:** Use `_lt()` (lazy translation) for translatable string literals inside Python report helpers, not inline `t-esc`.
- ❌ **Don't:** Put complex business logic or side effects in QWeb — simple expressions are supported; compute complex values in a model or report `_get_report_values()` helper.
- ❌ **Don't:** Forget `t-as` when using `t-foreach`; without it, you can't access the current record in the loop body.
- ❌ **Don't:** Bypass escaping to render untrusted HTML. Sanitize rich content using the target Odoo version's supported mechanisms; marking content safe is a security assertion.

Reference: [Odoo 17 QWeb](https://www.odoo.com/documentation/17.0/developer/reference/frontend/qweb.html). The sample requires the custom model, fields, access rules and module XML wrapper; test rendering with an authorized user and avoid exposing patient data.

## Limitations

- Does not cover **website controller routing** for dynamic QWeb pages — that requires Python `http.route` knowledge.
- **Email template** QWeb has different variable scope than report QWeb (`object` vs `docs`) — this skill primarily focuses on PDF reports.
- QWeb JavaScript (used in Kanban/Form widgets) is a different engine; this skill covers **server-side QWeb only**.
- Does not cover **wkhtmltopdf configuration** for PDF rendering issues (page size, margins, header/footer overlap).
