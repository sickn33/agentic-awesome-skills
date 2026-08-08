---
name: odoo-security-rules
description: "Expert in Odoo access control: ir.model.access.csv, record rules (ir.rule), groups, and multi-company security patterns."
risk: safe
source: "self"
---

# Odoo Security Rules

## Overview

Security in Odoo is managed at two levels: **model-level access** (who can read/write which models) and **record-level rules** (which records a user can see). This skill helps you write correct `ir.model.access.csv` entries and `ir.rule` domain-based record rules.

## When to Use This Skill

- Setting up access rights for a new custom module.
- Restricting records so users only see their own data or their company's data.
- Debugging "Access Denied" or "You are not allowed to access" errors.
- Implementing multi-company record visibility rules.

## How It Works

1. **Activate**: Mention `@odoo-security-rules` and describe the access scenario.
2. **Generate**: Get correct CSV access lines and XML record rules.
3. **Debug**: Paste an access error and get a diagnosis with the fix.

## Examples

### Example 1: ir.model.access.csv

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_hospital_patient_user,hospital.patient.user,model_hospital_patient,base.group_user,1,0,0,0
access_hospital_patient_manager,hospital.patient.manager,model_hospital_patient,base.group_erp_manager,1,1,1,1
```

> **Note:** Use `base.group_erp_manager` for ERP managers, not `base.group_system` — that group is reserved for Odoo's technical superusers. Always create a custom group for module-specific manager roles:
>
> ```xml
> <record id="group_hospital_manager" model="res.groups">
>     <field name="name">Hospital Manager</field>
>     <field name="category_id" ref="base.module_category_hidden"/>
> </record>
> ```

### Example 2: Record Rule — Users See Only Their Own Records

```xml
<record id="rule_hospital_patient_own" model="ir.rule">
    <field name="name">Hospital Patient: Own Records Only</field>
    <field name="model_id" ref="model_hospital_patient"/>
    <field name="domain_force">[('create_uid', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
    <field name="perm_read" eval="True"/>
    <field name="perm_write" eval="True"/>
    <field name="perm_create" eval="True"/>
    <field name="perm_unlink" eval="False"/>
</record>
```

> **Important:** If you omit `<field name="groups">`, the rule becomes **global** and applies to ALL users, including admins. Always assign a group unless you explicitly intend a global restriction.

### Example 3: Multi-Company Record Rule

```xml
<record id="rule_hospital_patient_company" model="ir.rule">
    <field name="name">Hospital Patient: Multi-Company</field>
    <field name="model_id" ref="model_hospital_patient"/>
    <field name="domain_force">
        ['|', ('company_id', '=', False),
               ('company_id', 'in', company_ids)]
    </field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>
```

## Best Practices

- ✅ **Do:** Start with the most restrictive access and open up as needed.
- ✅ **Do:** Use `company_ids` (plural) in multi-company rules — it includes all companies the user belongs to.
- ✅ **Do:** Test rules using a non-admin user in debug mode — `sudo()` bypasses all record rules entirely.
- ✅ **Do:** Create dedicated security groups per module rather than reusing core Odoo groups.
- ❌ **Don't:** Give `perm_unlink = 1` to regular users unless deletion is explicitly required by the business process.
- ❌ **Don't:** Leave `group_id` blank in `ir.model.access.csv` unless you intend to grant public (unauthenticated) access.
- ❌ **Don't:** Use `base.group_system` for module managers — that grants full technical access including server configurations.

## Limitations

- Does not cover **field-level access control** (`ir.model.fields` read/write restrictions) — those require custom OWL or Python overrides.
- **Portal and public user** access rules have additional nuances not fully covered here; test carefully with `base.group_portal`.
- Record rules are **bypassed by `sudo()`** — any code running in superuser context ignores all `ir.rule` entries.
- Does not cover **row-level security via PostgreSQL** (RLS) — Odoo manages all security at the ORM layer.
