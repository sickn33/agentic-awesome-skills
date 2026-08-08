---
name: odoo-migration-helper
description: "Step-by-step guide for migrating Odoo custom modules between versions (v14→v15→v16→v17). Covers API changes, deprecated methods, and view migration."
risk: safe
source: "self"
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

### Odoo 16 → 17

| Topic | Old (v16) | New (v17) |
|---|---|---|
| View visibility | `attrs="{'invisible': [...]}"` | `invisible="condition"` |
| Chatter | `<div class="oe_chatter">` | `<chatter/>` |
| Required/Readonly | `attrs="{'required': [...]}"` | `required="condition"` |
| Python minimum | 3.10 | 3.10+ |
| JS modules | Legacy `define(['web.core'])` | ES module `import` syntax |

### Odoo 15 → 16

| Topic | Old (v15) | New (v16) |
|---|---|---|
| Website published flag | `website_published = True` | `is_published = True` |
| Mail aliases | `alias_domain` on company | Moved to `mail.alias.domain` model |
| Report render | `_render_qweb_pdf()` | `_render_qweb_pdf()` (same, but signature changed) |
| Accounting move | `account.move.line` grouping | Line aggregation rules updated |
| Email threading | `mail_thread_id` | Deprecated; use `message_ids` |

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

### Example 2: Migrate Chatter block

```xml
<!-- v16 -->
<div class="oe_chatter">
    <field name="message_follower_ids"/>
    <field name="activity_ids"/>
    <field name="message_ids"/>
</div>

<!-- v17 -->
<chatter/>
```

### Example 3: Migrate website_published flag (v15 → v16)

```python
# v15
record.website_published = True

# v16+
record.is_published = True
```

## Best Practices

- ✅ **Do:** Test with `--update=your_module` on each version before pushing to production.
- ✅ **Do:** Use the official [Odoo Upgrade Guide](https://upgrade.odoo.com/) to get an automated pre-upgrade analysis report.
- ✅ **Do:** Check OCA migration notes and the module's `HISTORY.rst` for community modules.
- ✅ **Do:** Run `npm run validate` after migration to catch manifest or frontmatter issues early.
- ❌ **Don't:** Skip intermediate versions — go v14→v15→v16→v17 sequentially; never jump.
- ❌ **Don't:** Forget to update `version` in `__manifest__.py` (e.g., `17.0.1.0.0`).
- ❌ **Don't:** Assume OCA modules are migration-ready; check their GitHub branch for the target version.

## Limitations

- Covers **v14 through v17** only — does not address v13 or older (pre-manifest era has fundamentally different module structure).
- The **Odoo.sh automated upgrade** path has additional steps not covered here; refer to Odoo.sh documentation.
- **Enterprise-specific modules** (e.g., `account_accountant`, `sign`) may have undocumented breaking changes; test on a staging environment with Enterprise license.
- JavaScript OWL component migration (v15 Legacy → v16 OWL) is a complex topic not fully covered by this skill.
