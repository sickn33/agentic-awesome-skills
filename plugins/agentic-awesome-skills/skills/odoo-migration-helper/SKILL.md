---
name: odoo-migration-helper
description: "Step-by-step guide for migrating Odoo custom modules between versions (v14→v15→v16→v17). Covers API changes, deprecated methods, and view migration."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo Migration Helper

## Overview

Migrating Odoo modules between major versions requires careful handling of API changes, deprecated methods, renamed fields, and new view syntax. This skill guides you through the migration process systematically, covering the most common breaking changes between versions.

## When to Use This Skill

- Upgrading a custom module from Odoo 14/15/16 to a newer version.
- Getting a checklist of things to check before running `odoo-upgrade`.
- Fixing deprecation warnings after a version upgrade.
- Understanding what changed between two specific Odoo versions.

## How It Works

1. **Activate**: Mention `@odoo-migration-helper`, specify your source and target versions, and paste your module code.
2. **Analyze**: Receive a list of breaking changes with before/after code fixes.
3. **Validate**: Get a migration checklist specific to your module's features.

## Key Migration Changes by Version

### Odoo 16 → 17 view modifiers

Replace domain-based `attrs`/`states` modifiers with the target version's inline expressions. Ensure fields used in expressions are present in the view (invisible is sufficient). Test inherited views as well as base views.

### Other API and schema changes

Do not apply a blanket field rename or assume a report-method signature. Compare each used model, field and method in the exact source/target branches and installed addons. Record the old API, verified replacement, data transformation and test. JavaScript migration depends on the module and asset framework, not only the major version.

## Examples

### Example 1: Migrate `attrs` visibility to Odoo 17

```xml
<!-- v16 — domain-based attrs -->
<field name="discount" attrs="{'invisible': [('product_type', '!=', 'service')]}"/>
<field name="discount" attrs="{'required': [('state', '=', 'sale')]}"/>

<!-- v17 — inline Python expressions -->
<field name="discount" invisible="product_type != 'service'"/>
<field name="discount" required="state == 'sale'"/>
```

## Best Practices

- ✅ **Do:** Test with `--update=your_module` on each version before pushing to production.
- ✅ **Do:** Use the official [Odoo Upgrade Guide](https://www.odoo.com/documentation/17.0/administration/upgrade.html) to select the supported database upgrade path and request a test upgrade when applicable.
- ✅ **Do:** Check OCA migration notes and the module's `HISTORY.rst` for community modules.
- ✅ **Do:** Install/update the module on a disposable upgraded database and run its Odoo tests; inspect logs, access rules, accounting balances and attachments before production cutover.
- ❌ **Don't:** Assume every upgrade must run each intermediate database version. Follow the supported upgrade service/tool path; review all intervening custom-code changes even for a direct upgrade.
- ❌ **Don't:** Forget to update `version` in `__manifest__.py` (e.g., `17.0.1.0.0`).
- ❌ **Don't:** Assume OCA modules are migration-ready; check their GitHub branch for the target version.

## Limitations

- Covers **v14 through v17** only — does not address v13 or older.
- The **Odoo.sh automated upgrade** path has additional steps not covered here; refer to Odoo.sh documentation.
- **Enterprise-specific modules** (e.g., `account_accountant`, `sign`) may have undocumented breaking changes; test on a staging environment with Enterprise license.
- JavaScript OWL component migration (v15 Legacy → v16 OWL) is a complex topic not fully covered by this skill.

Before migration, take a consistent database/filestore backup and test recovery. Module source migration alone does not migrate production data; neutralize email, scheduled jobs and external integrations in the test copy.
