---
name: odoo-orm-expert
description: 'Master Odoo ORM patterns: search, browse, create, write, domain filters, computed fields, and performance-safe query techniques.'
metadata:
  aas-risk: safe
  aas-source: self
  aas-date-added: '2026-03-04'
---

# Odoo ORM Expert

## Overview

This skill teaches you Odoo's Object Relational Mapper (ORM) in depth. It covers reading/writing records, building domain filters, working with relational fields, and avoiding common performance pitfalls like N+1 queries.

## When to Use This Skill

- Writing `search()`, `browse()`, `create()`, `write()`, or `unlink()` calls.
- Building complex domain filters for views or server actions.
- Implementing computed, stored, and related fields.
- Debugging slow queries or optimizing bulk operations.

## How It Works

1. **Activate**: Mention `@odoo-orm-expert` and describe what data operation you need.
2. **Get Code**: Receive correct, idiomatic Odoo ORM code with explanations.
3. **Optimize**: Ask for performance review on existing ORM code.

## Examples

### Example 1: Search with Domain Filters

```python
# Find up to 50 confirmed sale orders for a specific customer dated this UTC year
import datetime

year = datetime.datetime.now(datetime.timezone.utc).year
start_of_year = datetime.datetime(year, 1, 1)  # Odoo stores naive UTC datetimes
start_of_next_year = datetime.datetime(year + 1, 1, 1)

orders = self.env['sale.order'].search([
    ('partner_id', '=', partner_id),
    ('state', '=', 'sale'),
    ('date_order', '>=', start_of_year),
    ('date_order', '<', start_of_next_year),
], order='date_order desc', limit=50)

# date_order is a Datetime field. For precise business-year boundaries,
# construct UTC datetime bounds from the intended business timezone;
# this example uses the UTC calendar year.
```

### Example 2: Computed Field

```python
total_order_count = fields.Integer(
    string='Total Orders',
    compute='_compute_total_order_count',
    store=True
)

@api.depends('sale_order_ids')
def _compute_total_order_count(self):
    for record in self:
        record.total_order_count = len(record.sale_order_ids)
```

### Example 3: Safe Bulk Write (avoid N+1)

```python
# Batch writes reduce repeated calls, but can trigger additional compute/tracking queries
partners = self.env['res.partner'].browse(approved_partner_ids).exists()  # Explicit scoped IDs
partners.write({'country_id': self.env.ref('base.us').id})

# ❌ BAD: Triggers a separate query per record
for partner in partners:
    partner.country_id = self.env.ref('base.us').id
```

## Best Practices

- ✅ **Do:** Use `mapped()`, `filtered()`, and `sorted()` on recordsets instead of Python loops.
- ✅ **Do:** Use `sudo()` sparingly and only when you understand the security implications.
- ✅ **Do:** Prefer `search_count()` over `len(search(...))` when you only need a count.
- ✅ **Do:** Use `with_context(...)` to pass context values cleanly rather than modifying `self.env.context` directly.
- ❌ **Don't:** Call `search()` inside a loop — this is the #1 Odoo performance killer.
- ❌ **Don't:** Use raw SQL unless absolutely necessary; use ORM for all standard operations.
- ✅ **Do:** Match values to the field type: Date uses dates or server date strings; Datetime uses datetimes or server datetime strings. Python date/datetime objects are supported; do not truncate a datetime to a date or mix the two types when comparing. See the [Odoo ORM date/time guidance](https://www.odoo.com/documentation/17.0/developer/reference/backend/orm.html).

## Limitations

- Does not cover **`cr.execute()` raw SQL** patterns in depth — use the Odoo performance tuner skill for SQL-level optimization.
- **Stored computed fields** can cause significant write overhead at scale; this skill does not cover partitioning strategies.
- Does not cover **transient models** (`models.TransientModel`) or wizard patterns.
- ORM behavior can differ slightly between Odoo SaaS and On-Premise due to config overrides.

Examples are model-method fragments requiring imports, record definitions and authorized scope. Do not infer missing country data means US; write only confirmed values to selected records. `sudo()` bypasses access rules and requires a justified boundary. Batch operations do not guarantee one SQL query, and mapped/filtered may load large recordsets; profile actual query counts and test record-rule/multi-company isolation.
