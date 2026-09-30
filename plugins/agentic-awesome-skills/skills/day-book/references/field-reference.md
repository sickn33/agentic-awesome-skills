# Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Entry Number | `text` | `VARCHAR(255)` | `string` | Text | `DB-EXAMPLE-001` |
| 2 | Entry Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 3 | Row Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Day Summary` |
| 4 | Book Section | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `All Books` |
| 5 | Transaction Reference | `text` | `VARCHAR(255)` | `string` | Text | `DAY-EXAMPLE-001` |
| 6 | Voucher Number | `text` | `VARCHAR(255)` | `string` | Text | `VCH-EXAMPLE-001 to VCH-EXAMPLE-014` |
| 7 | Party | `text` | `VARCHAR(255)` | `string` | Text | `Several parties` |
| 8 | Narration | `text` | `VARCHAR(255)` | `string` | Text | `Day total across the three books; each movement line carries its own reference` |
| 9 | Mode | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Mixed` |
| 10 | Cash In | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `15000.00` |
| 11 | Cash Out | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `11800.00` |
| 12 | Opening Cash Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `25000.00` |
| 13 | Cash Closing Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `28050.00` |
| 14 | Bank In | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `140000.00` |
| 15 | Bank Out | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `95485.00` |
| 16 | Opening Bank Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1250000.00` |
| 17 | Bank Closing Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1294515.00` |
| 18 | Digital In | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `24600.00` |
| 19 | Digital Out | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `4300.00` |
| 20 | Opening Digital Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `5000.00` |
| 21 | Digital Closing Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `25300.00` |
| 22 | Debit/Credit Presentation | `text` | `VARCHAR(255)` | `string` | Text | `As per software day-book format` |
| 23 | Source Documents | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `DOC-EXAMPLE-001` |
| 24 | Duplicate Check | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Checked - Clear` |
| 25 | Balance Difference | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `-150.00` |
| 26 | Reconciliation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Needs Review` |
| 27 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Example Preparer` |
| 28 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Example Reviewer` |
| 29 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 30 | Notes | `long_text` | `TEXT` | `string` | Text | `Cash counted 28050.00 against a book closing of 28200.00, so 150.00 is unexplained and is recorded rather than adjusted. Bank agrees to the statement and the wallet balance agrees to the app.` |
| 31 | Day Book ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

`Balance Difference` and `Reconciliation Status` are in this list because the day-end control is
the whole point of the table, and a control with no field to record its result is a claim rather
than a check. They replace an earlier bare `Balance Verified` yes/no, which could say *that*
something was out but not *how much*, and which a day with a cash break and an agreed bank
position could have marked `Yes`. `Reconciliation Status` carries the value set
`Reconciled | Needs Review | Unreconciled | Unknown`, and it takes the worst of the three books.


See the [Select Options](references/select-options.md) reference for the full guidance.
