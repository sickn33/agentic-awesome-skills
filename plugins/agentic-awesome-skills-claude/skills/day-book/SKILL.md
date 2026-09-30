---
name: day-book
description: 'Daily cash, bank and digital day book: opening and closing balances per book, in/out movements, debit/credit presentation and reconciliation status. Use for daily bookkeeping.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, day-book, cash-book, bank-book, reconciliation]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Day Book

**What it is:** The daily cash, bank and digital receipt-and-payment record, with a day-end control row that reconciles the day before it is closed.

## Overview

Works out the smallest useful **Day Book** setup for the business in front of it, then builds it
only when asked. The default output is a short recommendation, not a spreadsheet. Artifacts - CSV,
SQL DDL, JSON Schema, Notion mapping - are produced on request, from one field list so they
cannot drift apart.

Layer: Layer 4: Cash. Fits: Starter stage. Table code: n/a.

**Before anything is generated, the design is checked against itself.** A day book is the easiest
table in the pack to write badly, because the same column can mean two different things on two
different rows and neither reading looks wrong on its own. So before emitting any artifact:

- Look for conflicts in the rules, the examples, the field definitions, the row meanings and the
  output formats. Where the design, the examples or the business's existing sheet disagree with
  each other, do not reproduce them as they stand.
- Name the conflict out loud, then resolve it with the simplest accounting-safe interpretation.
  The simplest safe reading of a disputed field is the one that keeps cash equal to the bank
  position and never invents a movement to make a total look right.
- Derive CSV, SQL DDL, JSON Schema and the Notion mapping from **one** field model afterwards, so
  that no field exists in one artifact and is missing or differently defined in another.

**The rule this table exists to enforce: the debit/credit presentation of a day book depends on
the software's day-book format.** It is not a universal rule that all receipts are debit and all
payments are credit - some books present receipts on the payment side, some carry both columns,
some carry neither. So this table does not hardcode a Debit/Credit pair. `Debit/Credit
Presentation` is a text field that records the presentation **as configured in the business's own
software**, and the six in/out amount columns plus the six balance columns are the part that is
universal. Where a book labels its columns `Dr` and `Cr`, that label is what goes into
`Debit/Credit Presentation`; nothing in this table decides which side a receipt sits on.

**Two row types, and they are not the same kind of thing.** `Row Type` says which one a row is, and
the two are read differently.

| | `Movement` row | `Day Summary` row |
|---|---|---|
| What it is | one receipt or one payment | one per day, written after the day is closed |
| What it books | money, into exactly one book | no money at all - it totals and proves |
| `Book Section` | the one book it was booked to | `All Books` |
| `Mode` | the instrument used | `Mixed` when the day's instruments differ |
| The six In/Out columns | the amount in its own book, and the other two are not applicable | the day's totals for all three books |
| The six balance columns | brought forward, and the running balance **after** this entry | the day's opening and closing balances |
| `Transaction Reference`, `Voucher Number`, `Party` | the entry itself | the day's detail set, not a single voucher |
| `Duplicate Check` | this entry checked against the day's other entries | the whole day's set checked |
| `Balance Difference`, `Reconciliation Status` | not applicable - a single movement is not reconciled on its own | the day's break, and the status of it |

**What each balance field means.** Every one of the six balance fields is a balance, never a
movement. `Opening Cash Balance`, `Opening Bank Balance` and `Opening Digital Balance` are what
was brought into the day. `Cash Closing Balance`, `Bank Closing Balance` and `Digital Closing
Balance` are what was left at the end of it. The identity that connects them, per book, is:

```
opening balance + money in - money out = closing balance
```

On a `Day Summary` row that identity must hold separately for cash, for bank and for digital. On
a `Movement` row, the opening balance is what was brought forward into that entry and the closing
balance is the running balance **after** it, in that entry's own book only.

**The identity that carries the day forward.** A day's opening balance is not a fresh number. It
is the **previous day's closing balance** for the same book. So the check that closes a day is:

```
previous day's closing balance + today's movement = today's closing balance
```

Where it does not hold, the difference goes in `Balance Difference` - signed, and not spread
across the books - and `Reconciliation Status` is set to `Needs Review` or `Unreconciled`. The
component is never edited to make the row tie. A day book whose balances are adjusted until they
agree records nothing about the business.

**`Balance Difference` and `Reconciliation Status`.** `Balance Difference` is the total
unexplained difference across the three books on that row: negative where the book is above the
counted or agreed figure, positive where it is below. Where a difference is confined to one book,
write which one in `Notes` with both figures, because one column cannot hold three breaks.
`Reconciliation Status` is the **worst** of the three books, never the best. A bank balance that
agrees does not make a cash count that does not agree reconciled.

**A day is not `Done` while the cash count or the bank position is unreconciled.** Neither is it
`Done` while `Duplicate Check` is `Not Checked`, or `Reconciliation Status` is anything other than
`Reconciled`, or while an entry is `Blocked`. `Entry Verified` is the workflow status
(`Not started | In progress | Blocked | Done | Cancelled`) and it moves to `Done` only when the
control row for that day is clean, or when a human has reviewed and accepted a recorded difference.

**Money, dates and rounding.** Amounts are the gross amounts that actually moved, exactly as
recorded in the business's books, tax-inclusive where the entry was tax-inclusive. This module
does not split tax out of a movement. Money is a bare number with no currency symbol in the cell,
and the currency itself is `Unknown` until the user states it. Dates are ISO `YYYY-MM-DD` in real
date fields. Round once, at the end, to two decimal places, so the day's components re-derive the
day's totals.

## When to Use This Skill

- day book
- daily cash and bank book
- cash book and bank book
- daily receipts and payments register
- end-of-day balance check
- petty cash day sheet

Also use it when the user says "the daily cash, bank and digital receipt-and-payment record, with a
day-end control row that reconciles the day before it is closed", or describes the same process
happening in a spreadsheet, a document or someone inboxes.

Do not use it for: making payments, recording receipts in detail, tax filing, or legal advice. This
skill produces empty templates only - it never holds or processes real transaction data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> the user wants artifacts; go to Step 2.
- "our process is ..." or "it is in a sheet" -> `import` or `fix`; capture what is there, then Step 2.
- "is this right" or "review this" or "audit this" -> `review`; answer from what they share and do
  not rebuild anything.
- "show me the movement" or "where did the cash go" -> `report`; answer from what they share.
- "how do I ..." -> advice question; answer directly and offer the build only if it helps.

If the intent is already clear from the request, do not ask the user to repeat it.

On a `review`, check the design against itself before checking the numbers: the rules against the
examples, the field definitions against the row meanings, and the four artifacts against each
other. Report the conflicts and the simplest accounting-safe reading of each, then report the
control gaps - an unreconciled balance with no difference field, a `Done` day with an open cash
count, a hardcoded Debit/Credit rule. Do not rebuild the book because a review was asked for.

On a `fix`, preserve every valid fact already in the book, name each contradiction, correct the
model, and keep the change to the minimum that makes it consistent. Rebuild the artifacts only
when the fix request asks for them.

One message, one question, no batching. Open with the question that decides which columns exist:

> **Q:** Which books do you keep separate in the day book - cash, bank, or a digital wallet?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a time, and
stop as soon as the remaining answers would not change the recommendation or the requested
artifact. Never batch two questions into one message.

- **Books** - Cash, bank and digital all separate? Which software or format is the book kept in?
  Entries made daily or weekly?
- **Entries** - Who writes them? From vouchers, or from the bank feed? Same day or the next?
- **Day-end control** - What is actually checked at day end? Is the cash counted? Is the bank
  position agreed, and to what? Who signs it off?
- **Open items** - Digital wallets that settle late? Known duplicate patterns? How is a difference
  handled when it appears?
- **Outcome** - What do you need? The daily book, the day-end reconciliation record, or both?

**An ambiguous answer is not an answer.** `yes`, `no`, `maybe`, `same`, `okay` and `fine` do not
answer a multiple-choice question. Re-ask as an explicit choice:

> **Q:** Which do you mean: **a count of the cash drawer** or **the balance your bank statement
> shows at close**?

A partial answer keeps only the part that was answered. "We check it monthly, and the cash on
Fridays" records the frequency and leaves the digital-wallet position `Unknown`.

**Never invent a business fact.** Not an amount, a balance, a date, a voucher number, a bank
reference, an account number, a mode, a book section, a reviewer name, a status or a difference.
If a value was not supplied by the user or derived by a documented formula from supplied data, it
is `Unknown` or blank. Never turn Unknown into zero - a blank says the count has not been done,
a zero says the drawer is empty. Record `Unknown`, move on, and never re-ask an unknown the user
has already said they do not have.

Where the count or the statement has not been seen, the day's `Balance Difference` is blank and
`Reconciliation Status` is `Unknown`. It is not zero, because a zero difference is a claim that
the money was counted and agreed.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless they ask,
and it never carries a value the user did not give.

```yaml
module: day-book
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Books": null
  "Entries": null
  "Day-end control": null
  "Open items": null
  "Outcome": null
books: null             # which of cash | bank | digital are kept separately
book_format: null       # the day-book format of the software in use
debit_credit_presentation: null
cash_counted_daily: null
bank_agreed_to: null     # statement, feed, or neither
sign_off: null
late_settling_wallets: null
known_duplicate_pattern: null
difference_handling: null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
unknowns: []            # asked and not answered
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One day book carrying both row types in one field model. One `Movement`
row per receipt and per payment, with a `Book Section` naming cash, bank or digital; one
`Day Summary` row per day carrying that day's opening and closing balance and totals for all three
books; a `Balance Difference` and a `Reconciliation Status` on the day row; and a `Duplicate Check`
before the day is closed.

**Why this one:** The day book is where a missing or duplicated entry becomes visible, and
everything else in the cash cycle is downstream of the balance agreeing at day end. Keeping the
movement rows and the day-end control row in one model - separated by `Row Type` rather than by
guesswork - is what lets the day be proved from itself. Splitting them into two tables loses the
link, and merging them without a discriminator makes a summary row look like one more movement.

**Workflow:** Receipt or payment recorded from voucher → Booked to cash, bank or digital as a
`Movement` row → Running balance updated → Duplicate and missing entries checked → `Day Summary`
row proves previous closing plus movement equals closing, per book → Difference recorded and marked
→ Day-end balance verified and reviewed → Day closed

### Step 5 - Build only on request

Once the user asks for it, derive the fields from one canonical field list and emit the artifacts
as data only. Keep prose outside machine-readable data; provide file links and material limitations separately. A field present in one artifact is present
in all four, in the same order, with the same meaning. Build only what was asked for.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
Entry Number,Entry Date,Row Type,Book Section,Transaction Reference,Voucher Number,Party,Narration,Mode,Cash In,Cash Out,Opening Cash Balance,Cash Closing Balance,Bank In,Bank Out,Opening Bank Balance,Bank Closing Balance,Digital In,Digital Out,Opening Digital Balance,Digital Closing Balance,Debit/Credit Presentation,Source Documents,Duplicate Check,Balance Difference,Reconciliation Status,Prepared By,Reviewed By,Entry Verified,Notes,Day Book ID
DB-EXAMPLE-001,2026-01-15,Day Summary,All Books,DAY-EXAMPLE-001,VCH-EXAMPLE-001 to VCH-EXAMPLE-014,Several parties,Day total across the three books; each movement line carries its own reference,Mixed,15000.00,11800.00,25000.00,28050.00,140000.00,95485.00,1250000.00,1294515.00,24600.00,4300.00,5000.00,25300.00,As per software day-book format,DOC-EXAMPLE-001,Checked - Clear,-150.00,Needs Review,Example Preparer,Example Reviewer,In progress,"Cash counted 28050.00 against a book closing of 28200.00, so 150.00 is unexplained and is recorded rather than adjusted. Bank agrees to the statement and the wallet balance agrees to the app.",
```

```sql
-- Engine assumption: PostgreSQL. If the target database is not PostgreSQL, replace
-- SERIAL PRIMARY KEY with that engine's auto-increment form; nothing else here is
-- engine-specific.
CREATE TABLE day_book (
  entry_number VARCHAR(255),
  entry_date DATE NOT NULL,
  row_type VARCHAR(100) NOT NULL,
  book_section VARCHAR(100) NOT NULL,
  transaction_reference VARCHAR(255),
  voucher_number VARCHAR(255),
  party VARCHAR(255),
  narration VARCHAR(255),
  mode VARCHAR(100),
  cash_in NUMERIC(14,2),
  cash_out NUMERIC(14,2),
  opening_cash_balance NUMERIC(14,2) NOT NULL,
  cash_closing_balance NUMERIC(14,2) NOT NULL,
  bank_in NUMERIC(14,2),
  bank_out NUMERIC(14,2),
  opening_bank_balance NUMERIC(14,2) NOT NULL,
  bank_closing_balance NUMERIC(14,2) NOT NULL,
  digital_in NUMERIC(14,2),
  digital_out NUMERIC(14,2),
  opening_digital_balance NUMERIC(14,2) NOT NULL,
  digital_closing_balance NUMERIC(14,2) NOT NULL,
  debit_credit_presentation VARCHAR(255),
  source_documents VARCHAR(255),  -- relation -> target record
  duplicate_check VARCHAR(100) NOT NULL,
  balance_difference NUMERIC(14,2),
  reconciliation_status VARCHAR(100) NOT NULL,
  prepared_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  entry_verified VARCHAR(100) NOT NULL,
  notes TEXT,
  day_book_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT day_book_amounts_non_negative CHECK (
    cash_in >= 0
    AND cash_out >= 0
    AND bank_in >= 0
    AND bank_out >= 0
    AND digital_in >= 0
    AND digital_out >= 0),
  CONSTRAINT day_book_row_type_values CHECK (row_type IN ('Movement', 'Day Summary')),
  CONSTRAINT day_book_reconciliation_values CHECK (reconciliation_status IN (
    'Reconciled', 'Needs Review', 'Unreconciled', 'Unknown'))
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Day Book",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Entry Number": { "type": "string" },
      "Entry Date": { "type": "string", "format": "date" },
      "Row Type": { "type": "string" },
      "Book Section": { "type": "string" },
      "Transaction Reference": { "type": "string" },
      "Voucher Number": { "type": "string" },
      "Party": { "type": "string" },
      "Narration": { "type": "string" },
      "Mode": { "type": "string" },
      "Cash In": { "type": "number" },
      "Cash Out": { "type": "number" },
      "Opening Cash Balance": { "type": "number" },
      "Cash Closing Balance": { "type": "number" },
      "Bank In": { "type": "number" },
      "Bank Out": { "type": "number" },
      "Opening Bank Balance": { "type": "number" },
      "Bank Closing Balance": { "type": "number" },
      "Digital In": { "type": "number" },
      "Digital Out": { "type": "number" },
      "Opening Digital Balance": { "type": "number" },
      "Digital Closing Balance": { "type": "number" },
      "Debit/Credit Presentation": { "type": "string" },
      "Source Documents": { "type": "string" },
      "Duplicate Check": { "type": "string" },
      "Balance Difference": { "type": "number" },
      "Reconciliation Status": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Entry Verified": { "type": "string" },
      "Notes": { "type": "string" },
      "Day Book ID": { "type": "integer" }
  },
  "required": [
      "Entry Date",
      "Row Type",
      "Book Section",
      "Opening Cash Balance",
      "Cash Closing Balance",
      "Opening Bank Balance",
      "Bank Closing Balance",
      "Opening Digital Balance",
      "Digital Closing Balance",
      "Duplicate Check",
      "Reconciliation Status",
      "Entry Verified"
  ]
}
```

`required` is a business-necessity list, not an availability list. `Entry Date`, `Row Type` and
`Book Section` are required because without them the row cannot be read at all - a row with no
`Row Type` cannot be told apart from a summary, and a row with no `Book Section` touches all three
books by accident. The six balance columns are required because a balance that is not recorded is
not a balance; the six In/Out columns are deliberately **not** required, because on a
`Movement` row the two books it did not touch are not applicable rather than zero, and a required
column invites exactly that substitution. `Duplicate Check`, `Reconciliation Status` and
`Entry Verified` are required so that no day can be closed without the control having been given
an answer. `Balance Difference` is optional, because an uncounted day legitimately has none.

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Entry Number | Title | Use as the database title |
| Entry Date | Date | Convert to Date |
| Row Type | Select (add options after import) | Convert to Select, add options: "Movement", "Day Summary" |
| Book Section | Select (add options after import) | Convert to Select, add options: "Cash Book", "Bank Book", "Digital Payments Book", "All Books" |
| Transaction Reference | Text | Leave as Text |
| Voucher Number | Text | Leave as Text |
| Party | Text | Leave as Text |
| Narration | Text | Leave as Text |
| Mode | Select (add options after import) | Convert to Select, add options: "Cash", "Bank", "Cheque", "Fonepay/QR", "Other Digital Payment", "Mixed" |
| Cash In | Number (format: currency) | Convert to Number, set format to Currency |
| Cash Out | Number (format: currency) | Convert to Number, set format to Currency |
| Opening Cash Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Cash Closing Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Bank In | Number (format: currency) | Convert to Number, set format to Currency |
| Bank Out | Number (format: currency) | Convert to Number, set format to Currency |
| Opening Bank Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Bank Closing Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Digital In | Number (format: currency) | Convert to Number, set format to Currency |
| Digital Out | Number (format: currency) | Convert to Number, set format to Currency |
| Opening Digital Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Digital Closing Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Debit/Credit Presentation | Text | Leave as Text |
| Source Documents | Relation (link to the target database) | Convert to Relation, link to the target database |
| Duplicate Check | Select (add options after import) | Convert to Select, add options: "Checked - Clear", "Checked - Duplicate Found", "Not Checked" |
| Balance Difference | Number (format: currency) | Convert to Number, set format to Currency |
| Reconciliation Status | Select (add options after import) | Convert to Select, add options: "Reconciled", "Needs Review", "Unreconciled", "Unknown" |
| Prepared By | Text | Leave as Text |
| Reviewed By | Text | Leave as Text |
| Entry Verified | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Day Book ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`, and
anything pointing at another table stays `relation`. Every option list below is a starting set -
add options after import, and use the values the business already uses.

**The internal-consistency check, run before the artifacts go out.** On the design as proposed,
and again on the four artifacts as written:

- Does every rule have a matching example, and does every example obey every rule?
- Does every field mean the same thing in the CSV, the SQL, the JSON Schema and the Notion
  mapping - same type, same meaning, same position in the list?
- Is any field present in one artifact and missing, renamed or retyped in another?
- Does any single field carry two meanings, and is `Row Type` what separates them?
- Does a stated check have a field that records its result? A check with no field is a claim.
- Does the debit/credit statement match the `Debit/Credit Presentation` field, or has a universal
  rule crept into the model?

See the [How It Works](references/how-it-works.md) reference for the rest of this section.
## Examples

**Prompt**

```
We cannot tell at the end of the day whether the bank balance is right, and twice we found the
same payment entered twice.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which books do you keep separate in the day book?
> **A:** Bank and one Fonepay number. Cash is in the drawer.
>
> **Q:** Who writes the entries?
> **A:** My accounts person, from the vouchers, in the evening.
>
> **Q:** What do you check before the day is closed?
> **A:** Against the bank statement once a month. The cash just goes in the drawer.

**Recommended next step** - offered, not built:

> One day book carrying both row types: a `Movement` row per receipt and per payment with a
> `Book Section` naming cash, bank or digital, and a `Day Summary` row per day carrying that day's
> opening and closing balances and totals for all three books, plus a `Balance Difference` and a
> `Reconciliation Status` on the day row.
>
> Workflow: Receipt or payment recorded from voucher → Booked to cash, bank or digital as a
> `Movement` row → Running balance updated → Duplicate and missing entries checked → `Day Summary`
> row proves previous closing plus movement equals closing, per book → Difference recorded and
> marked → Day-end balance verified and reviewed → Day closed
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?


See the [Best Practices](references/best-practices.md) reference for the full guidance.

## Limitations

- Empty template only. It does not post entries, move money or connect to a bank feed.
- The debit/credit presentation cannot be settled by this skill. It follows whatever the
  business's software produces, so read the format out of the software and write it into
  `Debit/Credit Presentation` rather than assuming one.
- The six balance columns are entered, not computed. The identity on a `Day Summary` row is what
  tests them, and `Balance Difference` is what records the test failing - so a book that is never
  tested is a book that never finds its own errors.
- `Balance Difference` holds the total across the three books. A break in more than one book
  cannot be attributed from that column alone, so per-book figures go in `Notes`.
- A day book is a record of what was entered, not proof that it was correct. The proof comes from
  the supporting document, which is why the source link and the voucher number are on every row.
- Digital wallet balances settle late against some aggregators, so a same-day agreement is not
  always possible. `Reconciliation Status` = `Unknown` exists for that, and it is an honest answer.
- Reconciliation against the bank statement is a separate routine; this table records that it was
  done, not what it found.
- It records a duplicate; it does not delete one, and it does not decide which of two identical
  entries is the mistaken one.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Legal, tax and HR review is still required before this drives real decisions.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

