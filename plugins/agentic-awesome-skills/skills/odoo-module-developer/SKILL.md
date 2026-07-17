---
name: odoo-module-developer
description: "Expert guide for creating custom Odoo modules. Covers __manifest__.py, model inheritance, ORM patterns, and module structure best practices."
risk: safe
source: "self"
---

# Odoo Module Developer

## Overview

This skill guides Odoo custom module work: scaffolding modules, defining models, setting up security, and following Odoo coding conventions for Community and Enterprise editions. Select and verify the target Odoo major version before generating code; the example below targets Odoo 17.

## When to Use This Skill

- Starting a new custom Odoo module from scratch.
- Extending an existing Odoo model (e.g., adding fields to `sale.order`).
- Troubleshooting module loading errors or manifest issues.
- Implementing `onchange`, `compute`, and `constraint` methods correctly.

## How It Works

1. **Activate**: Mention `@odoo-module-developer` and describe the module you want to build.
2. **Scaffold**: Get the full folder structure with `__manifest__.py`, `__init__.py`, models, views, and security files.
3. **Review**: Paste existing code and get a review against Odoo best practices.

## Examples

### Example 1: Scaffold a New Module

**Prompt:** `Create a module called "hospital_management" with a model for patients`

**Generated structure:**

```text
hospital_management/
├── __manifest__.py
├── __init__.py
├── models/
│   ├── __init__.py
│   └── hospital_patient.py
├── views/
│   └── hospital_patient_views.xml
├── security/
│   ├── ir.model.access.csv
│   └── security.xml
└── data/
```

**`__manifest__.py`:**

```python
{
    'name': 'Hospital Management',
    'version': '17.0.1.0.0',
    'category': 'Healthcare',
    'depends': ['base', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'views/hospital_patient_views.xml',
    ],
    'installable': True,
    'license': 'LGPL-3',
}
```

**`models/hospital_patient.py`:**

```python
from odoo import models, fields, api

class HospitalPatient(models.Model):
    _name = 'hospital.patient'
    _description = 'Hospital Patient'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Patient Name', required=True, tracking=True)
    birth_date = fields.Date(string='Birth Date')
    doctor_id = fields.Many2one('res.users', string='Assigned Doctor')
    state = fields.Selection([
        ('draft', 'New'),
        ('confirmed', 'Confirmed'),
        ('done', 'Done'),
    ], default='draft', tracking=True)
```

**Required imports:**

```python
# hospital_management/__init__.py
from . import models

# hospital_management/models/__init__.py
from . import hospital_patient
```

**`security/ir.model.access.csv`:**

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_hospital_patient_user,hospital.patient user,model_hospital_patient,base.group_user,1,1,1,0
```

**`views/hospital_patient_views.xml`:**

```xml
<odoo>
  <record id="view_hospital_patient_list" model="ir.ui.view">
    <field name="name">hospital.patient.list</field>
    <field name="model">hospital.patient</field>
    <field name="arch" type="xml">
      <tree><field name="name"/><field name="birth_date"/><field name="doctor_id"/><field name="state"/></tree>
    </field>
  </record>
</odoo>
```

Before installation, add automated tests for model constraints and access behavior, then test with a disposable database on the selected Odoo version. Review the ACL against the real roles; the sample ACL is illustrative, not a production authorization policy.

## Best Practices

- ✅ **Do:** Always prefix your model `_name` with a namespace (e.g., `hospital.patient`).
- ✅ **Do:** Use `_inherit = ['mail.thread']` to add chatter/logging automatically.
- ✅ **Do:** Specify `version` in manifest as `{odoo_version}.{major}.{minor}.{patch}`.
- ✅ **Do:** Set `'author'` and `'website'` in `__manifest__.py` so your module is identifiable in the Apps list.
- ❌ **Don't:** Modify core Odoo model files directly — always use `_inherit`.
- ❌ **Don't:** Forget to add new models to `ir.model.access.csv` or users will get access errors.
- ❌ **Don't:** Use spaces or uppercase in folder names — Odoo requires snake_case module names.

## Limitations

- Does not cover **OWL JavaScript components** or frontend widget development — use `@odoo-xml-views-builder` for view XML.
- Odoo APIs and XML syntax vary by major release. This example is verified for Odoo 17; consult the official documentation for the selected version. Odoo 13 already uses `__manifest__.py`.
- Does not cover **multi-company** or **multi-website** configuration; those require additional model fields (`company_id`, `website_id`).
- The example does not include automated test files; tests and a disposable-database install check are required before deployment.
