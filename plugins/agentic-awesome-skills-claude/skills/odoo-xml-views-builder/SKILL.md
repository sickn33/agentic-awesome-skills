---
name: odoo-xml-views-builder
description: "Expert at building Odoo XML views: Form, List, Kanban, Search, Calendar, and Graph. Generates correct XML for Odoo 14-17 with proper visibility syntax."
risk: safe
source: "self"
---

# Odoo XML Views Builder

## Overview

This skill generates and reviews Odoo XML view definitions for Kanban, Form, List, Search, Calendar, and Graph views. It understands visibility modifiers, `groups`, `domain`, `context`, and widget usage across Odoo versions 14–17, including the migration from `attrs` (v14–16) to inline expressions (v17+).

## When to Use This Skill

- Creating a new form or list view for a custom model.
- Adding fields, tabs, or smart buttons to an existing view.
- Building a Kanban view with color coding or progress bars.
- Creating a search view with filters and group-by options.

## How It Works

1. **Activate**: Mention `@odoo-xml-views-builder` and describe the view you want.
2. **Generate**: Get complete, ready-to-paste XML view definitions.
3. **Review**: Paste existing XML and get fixes for common mistakes.

## Examples

### Example 1: Form View with Tabs

```xml
<record id="view_hospital_patient_form" model="ir.ui.view">
    <field name="name">hospital.patient.form</field>
    <field name="model">hospital.patient</field>
    <field name="arch" type="xml">
        <form string="Patient">
            <header>
                <button name="action_confirm" string="Confirm"
                    type="object" class="btn-primary"
                    invisible="state != 'draft'"/>
                <field name="state" widget="statusbar"
                    statusbar_visible="draft,confirmed,done"/>
            </header>
            <sheet>
                <div class="oe_title">
                    <h1><field name="name" placeholder="Patient Name"/></h1>
                </div>
                <notebook>
                    <page string="General Info">
                        <group>
                            <field name="birth_date"/>
                            <field name="doctor_id"/>
                        </group>
                    </page>
                </notebook>
            </sheet>
            <chatter/>
        </form>
    </field>
</record>
```

### Example 2: Kanban View

```xml
<record id="view_hospital_patient_kanban" model="ir.ui.view">
    <field name="name">hospital.patient.kanban</field>
    <field name="model">hospital.patient</field>
    <field name="arch" type="xml">
        <kanban default_group_by="state" class="o_kanban_small_column">
            <field name="name"/>
            <field name="state"/>
            <field name="doctor_id"/>
            <templates>
                <t t-name="kanban-card">
                    <div class="oe_kanban_content">
                        <strong><field name="name"/></strong>
                        <div>Doctor: <field name="doctor_id"/></div>
                    </div>
                </t>
            </templates>
        </kanban>
    </field>
</record>
```

## Best Practices

- ✅ **Do:** Use inline `invisible="condition"` (Odoo 17+) instead of `attrs` for show/hide logic.
- ✅ **Do:** Use `attrs="{'invisible': [...]}"` only if you are targeting Odoo 14–16 — it is deprecated in v17.
- ✅ **Do:** Always set a `string` attribute on your view record for debugging clarity.
- ✅ **Do:** Use `<chatter/>` (v17) or `<div class="oe_chatter">` + field tags (v16 and below) for activity tracking.
- ❌ **Don't:** Use `attrs` in Odoo 17 — it is fully deprecated and raises warnings in logs.
- ❌ **Don't:** Put business logic in view XML — keep it in Python model methods.
- ❌ **Don't:** Use hardcoded `domain` strings in views when a `domain` field on the model can be used dynamically.

## Limitations

- Does not cover **OWL JavaScript widgets** or client-side component development.
- **Search panel views** (`<searchpanel>`) are not fully covered — those require frontend knowledge.
- Does not address **website QWeb views** — use `@odoo-qweb-templates` for those.
- **Cohort and Map views** (Enterprise-only) are not covered by this skill.
