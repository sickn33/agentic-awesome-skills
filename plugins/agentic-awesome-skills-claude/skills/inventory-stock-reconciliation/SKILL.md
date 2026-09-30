---
name: inventory-stock-reconciliation
description: 'Stock reconciliation register: count date, item, warehouse, book vs physical quantity, variance quantity and value, variance reason, damage and expiry, adjustment and approval. Use for stock counts.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, reconciliation]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Inventory / Stock Reconciliation

**What it is:** Physical stock counts against book quantities, differences investigated, and authorised adjustments recorded.

## Overview

Works out the smallest useful **Inventory / Stock Reconciliation** setup for the business in
front of it, then builds it only when asked. The default output is a short recommendation,
not a spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Three guardrails shape the whole table.

**The artifact stage is template-only.** What the user receives is a structure: a CSV that is
a header row and no data row, DDL with no `INSERT`s, a schema with no example values, and a
property mapping table. Add one clearly labelled illustrative row only when the user
explicitly asks for one. The failure this prevents is an unknown quietly turning into fake
data inside a generated artifact.

**Counting, verifying and approving are three separate roles.** `Counted By`, `Verified By`
and `Approved By` answer three different questions and are never inferred from one another.
The manager who approves an adjustment is not automatically the verifier, and the verifier
is not automatically the counter. If the business genuinely runs two of these as one job,
that has to be said, not assumed.

**A variance without an investigated reason stays unresolved.** No adjustment is booked
without a named approver, and a record does not reach `Done` while a difference has no
recorded cause. A missing answer stays blank or `Unknown` - never a plausible-looking
number, and never 0.

Never manufacture a name, a date, a quantity, a price, a location, an approval, a variance
reason or a transaction reference to fill a gap. `Unknown` and blank are correct answers.

The count is periodic by design. Book quantity is a number the system believes; it is
only ever as good as the last entry. Until someone walks the shelves and writes down what
is actually there, the books are an opinion, and the frequency of the count is a business
decision driven by volume, value and risk rather than a setting anyone can skip. Two
things follow from that. First, every adjustment needs a named approver before it is
booked - a correction passed without authorisation is just a quiet write-off. Second,
investigating a shrinkage is a human judgement, not a calculation: no formula tells you
whether a missing stack of cartons was theft, a mis-pick, or two dispatches that never got
a stock entry.

Layer: Layer 7: Reconcile. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- physical stock count
- stock variance investigation
- stock adjustment register
- inventory shrinkage tracker
- cycle count sheet

Also use it when the user describes the same process happening in a spreadsheet, on paper,
or in someone's inbox.

Do not use it for: purchase or sales booking, inventory valuation method design, reorder-point
design, or legal or tax advice. This skill produces empty templates only - it never holds or
processes real employee, customer or stock-movement data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> a new structure; go to Step 2.
- "our process is ..." or "it is in a sheet" -> capture the existing process first, then Step 2.
- "is this right" or "review" or "audit" -> a check, not a build; answer from what they share
  and do not rebuild.
- "how do I ..." -> advice; answer directly and offer a build only if it helps.

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

One message, one question, no batching. Skip anything the user already answered, in any
earlier message. Ask only questions whose answer would change the recommendation or the
requested artifact. Stop as soon as the remaining unknowns would not change the output.
Record `Unknown` and move on when the user does not know, and never ask the same unknown
twice.

The opening question targets the biggest missing fact that changes the output, not a generic
opener. For a new setup the usual first question is:

> **Q:** How many items do you hold, and when did you last count them physically?

Treat the two halves independently. If the user answers only one, record only that one and
ask the other separately if it would change the recommendation. `20 to 50` records the item
count range and leaves the last physical count date `Unknown`.

Then, only as needed:

- **Stock** - How many items do you hold? / What do you hold? / How many locations or
  warehouses?
- **Count** - When did you last count physically? / Full count or cycle count? / How often?
  / **Who counts?** / **Who verifies?** - ask these as two separate questions, never as one.
- **Differences** - What gets investigated when the physical count differs from the books? /
  Who approves an adjustment? / Is there a threshold that requires escalation?
- **Current process** - Is the count currently recorded anywhere? / Spreadsheet, accounting
  package, or another system? / What is currently being missed?
- **Outcome** - A reconciliation record, a count sheet, or both?

**Ambiguous answers are not answers.** `yes`, `no`, `maybe`, `same`, `okay` and `fine` are
not answers to a multiple-choice question - not even when the question was phrased as two
options in a sentence. A bare `yes` to "Do you want a full count or a cycle count?" resolves
nothing, because the question had no yes/no answer to give. Re-ask as an explicit choice and
wait:

> **Q:** Which do you mean: **full count of all items** or **cycle count of selected items**?

**Partial answers keep only the answered part.** If a question carries two pieces of
information and the user answers one, retain only that one and leave the rest `Unknown`.
Never turn Unknown into 0 - a quantity nobody has counted is not a quantity of zero.

Never invent an answer. If the user does not know, record it as `Unknown` and carry on.

### Step 3 - Hold the internal context

Keep the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: inventory-stock-reconciliation
intent: null            # set in Step 1: set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Stock": null
  "Count": null
  "Differences": null
  "Current process": null
  "Outcome": null
  # Sub-areas recorded with the same discipline, and only when the answer changes the build:
  #   Stock.item_count | Stock.stock_types | Stock.locations      - never assumed
  #   Count.count_type | Count.frequency                        - full vs cycle, and how often
  #   Count.counted_by | Count.verified_by                       - asked separately, never inferred
  #   Differences.adjustment_approver | Differences.escalation_threshold
  #   Outcome.requested_outputs                                  - csv | sql | json | notion, as asked
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
unknowns: []            # asked and not answered
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One reconciliation record per item counted, carrying the book quantity, the physical quantity, the variance, the variance reason, the investigation notes and the authorised adjustment, with the count sheet filed against the same reconciliation.

**Why this one:** The minimum defensible record connects the physical count to the book balance, documents why a difference exists, and records who authorised any adjustment. A count that is not reconciled back to the books proves nothing, and an adjustment passed without a named approver is a correction dressed up as control.

**Workflow:** Count planned → Items counted → Compared with books → Variance investigated → Adjustment authorised → Adjustment booked → Reconciliation filed

If no artifact was requested, offer the relevant format. Otherwise continue the build.

### Step 5 - Build only on request

Once the user asks, derive the fields from the confirmed context and emit **only the
artifacts that were requested**. No preamble, no summary, no recommendation repeated, no
unrequested artifact.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

**The output is an empty template.** The CSV is a header row with no example row unless the
user explicitly asks for one; if they do ask, label the row clearly as illustrative and never
make it look like a real count. The SQL is DDL with no sample records. The JSON Schema is a
schema with no example values. Add no invented sample transactions, names, dates,
quantities, prices, locations, approvals or variance reasons to any of them.

The blocks below are the documented *shape*, so the Field Reference and the four artifacts
can be read together. The row in the CSV block is an illustrative placeholder that shows how
the columns line up; it is not a record, and it is not what ships. Delete it before use.

Money basis: `Unit Rate` is the rate as the business records it, and `Variance Value` is the
variance valued at that rate on the same row. State whether the figures are as recorded or
rounded to a cost layer, and round once, at the end. The arithmetic ties out as
`Variance Quantity = Physical Quantity - Book Quantity` and
`Variance Value = Variance Quantity x Unit Rate`; a row that does not tie is left as it is
and marked for review, never silently corrected to force a tie-out. This module never states
a `Debit` or `Credit` side, because which side a movement lands on is software-dependent.

**Control rules**

1. Never book an adjustment without a named approver. An empty `Approved By` is a blocked
   record, not a formality.
2. Never invent an approver, a counter or a verifier. Never infer the verifier from the
   approver, and never infer the counter from the verifier.
3. Never invent a variance reason, a quantity, a value or a date. An unanswered field stays
   blank or `Unknown`.
4. A variance with no investigated reason remains unresolved, and the record stays below
   `Done` until both the reason and the approver are recorded.
5. A record must not be `Done` while a required check fails.
6. Count on a stated frequency and write it into the record once the business has established
   one.
7. All four artifacts are derived from the same canonical field list, with identical names
   and identical order.

```csv
Reconciliation Number,Count Date,Item Code,Item Name,Category,UOM,Location/Warehouse,Book Quantity,Physical Quantity,Variance Quantity,Unit Rate,Variance Value,Variance Reason,Damaged Quantity,Expired Quantity,Slow Moving Flag,Unrecorded Purchases,Unrecorded Issues,Investigation Notes,Adjustment Entry,Adjustment Date,Approved By,Counted By,Verified By,Count Frequency,Status,Notes,Inventory Reconciliation ID
REC-EXAMPLE-001,2026-01-15,ITEM-EXAMPLE-001,Example Item A,Raw Material,Nos,Example Store,10,8,-2,1.00,-2.00,Damage,1,1,No,1,1,Illustrative row only - placeholder quantities that show the shape of the record and are not a real count or a real finding.,ADJ-EXAMPLE-001,2026-01-16,Example Approver,Example Counter,Example Verifier,Monthly,Done,Illustrative row only - delete this row before use.,
```

```sql
-- PostgreSQL example DDL; substitute an equivalent identity or
-- auto-increment column on MySQL, SQL Server or SQLite.
CREATE TABLE inventory_stock_reconciliation (
  reconciliation_number VARCHAR(255),
  count_date DATE NOT NULL,
  item_code VARCHAR(255),
  item_name VARCHAR(255),
  category VARCHAR(100),
  uom VARCHAR(100) NOT NULL,
  location_warehouse VARCHAR(255),
  book_quantity NUMERIC,
  physical_quantity NUMERIC,
  variance_quantity NUMERIC,
  unit_rate NUMERIC(14,2),
  variance_value NUMERIC(14,2),
  variance_reason VARCHAR(100),
  damaged_quantity NUMERIC,
  expired_quantity NUMERIC,
  slow_moving_flag VARCHAR(100),
  unrecorded_purchases NUMERIC,
  unrecorded_issues NUMERIC,
  investigation_notes TEXT,
  adjustment_entry VARCHAR(255),
  adjustment_date DATE,
  approved_by VARCHAR(255),
  counted_by VARCHAR(255),
  verified_by VARCHAR(255),
  count_frequency VARCHAR(100),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  inventory_reconciliation_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_variance_matches_count CHECK (variance_quantity IS NULL OR physical_quantity IS NULL OR book_quantity IS NULL OR variance_quantity = physical_quantity - book_quantity),
  CONSTRAINT chk_unit_rate_non_negative CHECK (unit_rate IS NULL OR unit_rate >= 0)
);

CREATE INDEX idx_inventory_stock_reconciliation_count_date ON inventory_stock_reconciliation (count_date);
CREATE INDEX idx_inventory_stock_reconciliation_status ON inventory_stock_reconciliation (status);
```

`created_at`, `updated_at` and the primary key are technical metadata, not business fields.
No `FOREIGN KEY` is declared because no target table is part of this artifact set. There are
no sample records and no invented default values in the DDL.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Inventory / Stock Reconciliation",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Reconciliation Number": { "type": "string" },
    "Count Date": { "type": "string", "format": "date" },
    "Item Code": { "type": "string" },
    "Item Name": { "type": "string" },
    "Category": { "type": "string" },
    "UOM": { "type": "string" },
    "Location/Warehouse": { "type": "string" },
    "Book Quantity": { "type": "number" },
    "Physical Quantity": { "type": "number" },
    "Variance Quantity": { "type": "number" },
    "Unit Rate": { "type": "number" },
    "Variance Value": { "type": "number" },
    "Variance Reason": { "type": "string" },
    "Damaged Quantity": { "type": "number" },
    "Expired Quantity": { "type": "number" },
    "Slow Moving Flag": { "type": "string" },
    "Unrecorded Purchases": { "type": "number" },
    "Unrecorded Issues": { "type": "number" },
    "Investigation Notes": { "type": "string" },
    "Adjustment Entry": { "type": "string" },
    "Adjustment Date": { "type": "string", "format": "date" },
    "Approved By": { "type": "string" },
    "Counted By": { "type": "string" },
    "Verified By": { "type": "string" },
    "Count Frequency": { "type": "string" },
    "Status": { "type": "string" },
    "Notes": { "type": "string" },
    "Inventory Reconciliation ID": { "type": "integer" }
  },
  "required": ["Count Date", "UOM", "Book Quantity", "Physical Quantity", "Status"]
}
```

`required` is justified field by field. `Count Date` is needed or the row is not a count.
`UOM` is needed or the quantities on the row are unreadable. `Book Quantity` and
`Physical Quantity` are the two halves of the comparison, so the record is meaningless
without both. `Status` is the state of the record, so it must always be explicit.
`Variance Quantity`, `Unit Rate` and `Variance Value` are calculated, and a calculated value
is never required while its source may legitimately be missing. `Variance Reason` is not
required because a row with no variance has no reason to give. `Count Frequency` is
conditional: record it once the business has established one. `Adjustment Date` and
`Adjustment Entry` are conditional on an adjustment actually being authorised.

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Reconciliation Number | Title | Use as the database title |
| Count Date | Date | Convert to Date |
| Item Code | Text | Leave as Text |
| Item Name | Text | Leave as Text |
| Category | Select | Convert to Select, add options after import: "Raw Material", "Work In Progress", "Finished Goods", "Consumable", "Packaging", "Spare", "Other" |
| UOM | Select | Convert to Select, add options after import: "Nos", "Kg", "Litre", "Metre", "Set", "Hour", "Box", "Packet" |
| Location/Warehouse | Text | Leave as Text |
| Book Quantity | Number | Convert to Number |
| Physical Quantity | Number | Convert to Number |
| Variance Quantity | Number | Convert to Number |
| Unit Rate | Number (format: currency) | Convert to Number, set format to Currency |
| Variance Value | Number (format: currency) | Convert to Number, set format to Currency |
| Variance Reason | Select | Convert to Select, add options after import: "Shortage", "Excess", "Damage", "Expiry", "Slow Moving", "Unrecorded Purchase", "Unrecorded Issue", "Data Entry Error", "Under Investigation" |
| Damaged Quantity | Number | Convert to Number |
| Expired Quantity | Number | Convert to Number |
| Slow Moving Flag | Select | Convert to Select, add options after import: "Yes", "No" |
| Unrecorded Purchases | Number | Convert to Number |
| Unrecorded Issues | Number | Convert to Number |
| Investigation Notes | Text | Leave as Text |
| Adjustment Entry | Text | Leave as Text |
| Adjustment Date | Date | Convert to Date |
| Approved By | Text | Leave as Text |
| Counted By | Text | Leave as Text |
| Verified By | Text | Leave as Text |
| Count Frequency | Select | Convert to Select, add options after import: "Monthly", "Quarterly", "Half-Yearly", "Annual" |
| Status | Select | Convert to Select, add options after import: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Inventory Reconciliation ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Reconciliation Number | `text` | `VARCHAR(255)` | `string` | Text | `REC-EXAMPLE-001` |
| 2 | Count Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 3 | Item Code | `text` | `VARCHAR(255)` | `string` | Text | `ITEM-EXAMPLE-001` |
| 4 | Item Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Item A` |
| 5 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Raw Material` |
| 6 | UOM | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Nos` |
| 7 | Location/Warehouse | `text` | `VARCHAR(255)` | `string` | Text | `Example Store` |
| 8 | Book Quantity | `number` | `NUMERIC` | `number` | Number | `10` |
| 9 | Physical Quantity | `number` | `NUMERIC` | `number` | Number | `8` |
| 10 | Variance Quantity | `number` | `NUMERIC` | `number` | Number | `-2` |
| 11 | Unit Rate | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1.00` |
| 12 | Variance Value | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `-2.00` |
| 13 | Variance Reason | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Damage` |
| 14 | Damaged Quantity | `number` | `NUMERIC` | `number` | Number | `1` |
| 15 | Expired Quantity | `number` | `NUMERIC` | `number` | Number | `1` |
| 16 | Slow Moving Flag | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `No` |
| 17 | Unrecorded Purchases | `number` | `NUMERIC` | `number` | Number | `1` |
| 18 | Unrecorded Issues | `number` | `NUMERIC` | `number` | Number | `1` |
| 19 | Investigation Notes | `long_text` | `TEXT` | `string` | Text | `Illustrative row only - placeholder quantities that show the shape of the record and are not a real count or a real finding.` |
| 20 | Adjustment Entry | `text` | `VARCHAR(255)` | `string` | Text | `ADJ-EXAMPLE-001` |
| 21 | Adjustment Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-16` |
| 22 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Example Approver` |
| 23 | Counted By | `text` | `VARCHAR(255)` | `string` | Text | `Example Counter` |
| 24 | Verified By | `text` | `VARCHAR(255)` | `string` | Text | `Example Verifier` |
| 25 | Count Frequency | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Monthly` |
| 26 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 27 | Notes | `long_text` | `TEXT` | `string` | Text | `Illustrative row only - delete this row before use.` |
| 28 | Inventory Reconciliation ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

Quantities are `number`, money is `currency` with no currency symbol in the cell, and dates
are ISO `YYYY-MM-DD` in real date fields. Round once, at the end, and say so.

`Status` carries the module's status set. A record must not be `Done` while a required check
fails: a variance with no investigated reason, an adjustment with no named approver, or a
missing unit all hold it at `In progress` or `Blocked`.


See the [Select Options](references/select-options.md) reference for the full guidance.

## Examples

**Prompt**

```
Our godown stock and the books never match and nobody can say why.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many items do you hold, and when did you last count them physically?
> **A:** 20 to 50.
>
> **Q:** What do you hold - raw materials, finished goods, consumables, or a mix?
> **A:** Mix.
>
> **Q:** How many stock locations or warehouses do you have?
> **A:** 1.
>
> **Q:** Do you want a full physical count of all items, or a cycle count of selected items?
> **A:** Yes.
>
> **Q:** Which do you mean: **full count of all items** or **cycle count of selected items**?
> **A:** Full count.
>
> **Q:** Who counts the stock?
> **A:** Storekeeper.
>
> **Q:** Who verifies the storekeeper's count?
> **A:** Manager.
>
> **Q:** Who approves a stock adjustment after a variance is investigated?
> **A:** Manager.

Recorded: `counted_by` is Storekeeper, `verified_by` is Manager, `approved_by` is Manager -
three separate answers to three separate questions, and the last one was not inferred from
the second. The bare `Yes` was not a choice, so it was re-asked. The last physical count date
is still `Unknown`, because nobody supplied it.

**Recommended next step** - offered, not built:

> One reconciliation record per item counted, carrying the book quantity, the physical quantity, the variance, the reason and the authorised adjustment, with the count sheet filed against the same record.
>
> Workflow: Count planned → Items counted → Compared with books → Variance investigated → Adjustment authorised → Adjustment booked → Reconciliation filed
>
> Want me to build the CSV, SQL DDL, JSON Schema and Notion mapping?


See the [Best Practices](references/best-practices.md) reference for the full guidance.

## Limitations

- Empty template only. It does not count stock, value inventory, change stock, or post
  journal entries.
- The variance arithmetic can be done by hand or by the accounting package. What this
  records is the count, the difference and the authorisation - not the conclusion about
  what caused the shrinkage.
- It cannot tell theft from a mis-pick from an unrecorded issue. That determination is
  made by a person who knows the operation, and this record only carries the reason they
  gave. It does not decide whether a discrepancy is theft, misconduct or error.
- It does not design the valuation method, the reorder point or the costing policy, and it
  states no tax treatment.
- It does not post entries, change inventory, or run commands or call external APIs.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Human review remains required for investigations, adjustments, legal, tax and disciplinary
  matters before this drives any real decision.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

