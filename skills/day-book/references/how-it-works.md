# How It Works (continued)

If any answer is no, fix the model first and then re-derive the artifacts. Do not ship a set of
four artifacts that disagree with each other.


See the [Field Reference](field-reference.md) reference for the full guidance.

## Artifact examples

These are illustrative data only; emit empty templates unless examples were requested.

```csv
Entry Number,Entry Date,Row Type,Book Section,Transaction Reference,Voucher Number,Party,Narration,Mode,Cash In,Cash Out,Opening Cash Balance,Cash Closing Balance,Bank In,Bank Out,Opening Bank Balance,Bank Closing Balance,Digital In,Digital Out,Opening Digital Balance,Digital Closing Balance,Debit/Credit Presentation,Source Documents,Duplicate Check,Balance Difference,Reconciliation Status,Prepared By,Reviewed By,Entry Verified,Notes,Day Book ID
DB-EXAMPLE-001,2026-01-15,Day Summary,All Books,DAY-EXAMPLE-001,VCH-EXAMPLE-001 to VCH-EXAMPLE-014,Several parties,Day total across the three books; each movement line carries its own reference,Mixed,15000.00,11800.00,25000.00,28200.00,140000.00,95485.00,1250000.00,1294515.00,24600.00,4300.00,5000.00,25300.00,As per software day-book format,DOC-EXAMPLE-001,Checked - Clear,-150.00,Needs Review,Example Preparer,Example Reviewer,In progress,"Cash counted 28050.00 against a book closing of 28200.00, so 150.00 is unexplained and is recorded rather than adjusted. Bank agrees to the statement and the wallet balance agrees to the app.",
```

```sql
-- Engine assumption: PostgreSQL. If the target database is not PostgreSQL, replace
-- SERIAL PRIMARY KEY, numeric/date behavior and constraints with that engine's
-- supported equivalents. DDL is a template, not a migrated or tested database.
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
  opening_cash_balance NUMERIC(14,2),
  cash_closing_balance NUMERIC(14,2),
  bank_in NUMERIC(14,2),
  bank_out NUMERIC(14,2),
  opening_bank_balance NUMERIC(14,2),
  bank_closing_balance NUMERIC(14,2),
  digital_in NUMERIC(14,2),
  digital_out NUMERIC(14,2),
  opening_digital_balance NUMERIC(14,2),
  digital_closing_balance NUMERIC(14,2),
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
    "Entry Number": {
      "type": "string"
    },
    "Entry Date": {
      "type": "string",
      "format": "date"
    },
    "Row Type": {
      "type": "string",
      "enum": [
        "Movement",
        "Day Summary"
      ]
    },
    "Book Section": {
      "type": "string"
    },
    "Transaction Reference": {
      "type": "string"
    },
    "Voucher Number": {
      "type": "string"
    },
    "Party": {
      "type": "string"
    },
    "Narration": {
      "type": "string"
    },
    "Mode": {
      "type": "string"
    },
    "Cash In": {
      "type": "number",
      "minimum": 0
    },
    "Cash Out": {
      "type": "number",
      "minimum": 0
    },
    "Opening Cash Balance": {
      "type": [
        "number",
        "null"
      ]
    },
    "Cash Closing Balance": {
      "type": [
        "number",
        "null"
      ]
    },
    "Bank In": {
      "type": "number",
      "minimum": 0
    },
    "Bank Out": {
      "type": "number",
      "minimum": 0
    },
    "Opening Bank Balance": {
      "type": [
        "number",
        "null"
      ]
    },
    "Bank Closing Balance": {
      "type": [
        "number",
        "null"
      ]
    },
    "Digital In": {
      "type": "number",
      "minimum": 0
    },
    "Digital Out": {
      "type": "number",
      "minimum": 0
    },
    "Opening Digital Balance": {
      "type": [
        "number",
        "null"
      ]
    },
    "Digital Closing Balance": {
      "type": [
        "number",
        "null"
      ]
    },
    "Debit/Credit Presentation": {
      "type": "string"
    },
    "Source Documents": {
      "type": "string"
    },
    "Duplicate Check": {
      "type": "string",
      "enum": [
        "Checked - Clear",
        "Checked - Duplicate Found",
        "Not Checked"
      ]
    },
    "Balance Difference": {
      "type": "number"
    },
    "Reconciliation Status": {
      "type": "string",
      "enum": [
        "Reconciled",
        "Needs Review",
        "Unreconciled",
        "Unknown"
      ]
    },
    "Prepared By": {
      "type": "string"
    },
    "Reviewed By": {
      "type": "string"
    },
    "Entry Verified": {
      "type": "string",
      "enum": [
        "Not started",
        "In progress",
        "Blocked",
        "Done",
        "Cancelled"
      ]
    },
    "Notes": {
      "type": "string"
    },
    "Day Book ID": {
      "type": "integer"
    }
  },
  "required": [
    "Entry Date",
    "Row Type",
    "Book Section",
    "Duplicate Check",
    "Reconciliation Status",
    "Entry Verified"
  ]
}
```

`required` is a business-necessity list, not an availability list. `Entry Date`, `Row Type` and
`Book Section` are required because without them the row cannot be read at all - a row with no
`Row Type` cannot be told apart from a summary, and a row with no `Book Section` touches all three
books by accident. Balance cells are nullable/optional while unknown or not applicable. On a Movement row only its selected book's amounts and balances apply; on a fully checked Day Summary all applicable books need known values. Empty-template SQL/JSON validity does not establish business readiness or reconciliation. The six In/Out columns are not globally required. `Duplicate Check`, `Reconciliation Status` and
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

