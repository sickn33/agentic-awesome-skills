---
name: odoo-module-developer
description: "Expert guide for creating custom Odoo modules. Covers __manifest__.py, model inheritance, ORM patterns, and module structure best practices."
risk: safe
source: "self"
---

# Odoo Module Developer

## Overview

This skill transforms your AI into an expert Odoo custom module developer. It guides you through scaffolding new modules, defining models, setting up security, and following Odoo's coding conventions for both Community and Enterprise editions.

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
- **Odoo 13 and below** have a different module structure (no `__manifest__.py` auto-loading) — this skill targets v14+.
- Does not cover **multi-company** or **multi-website** configuration; those require additional model fields (`company_id`, `website_id`).
- Does not generate automated test files — use `@odoo-automated-tests` for that.
