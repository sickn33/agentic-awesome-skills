# Credit Cycle Analysis: Field Reference


| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Analysis Number | `text` | `VARCHAR(255)` | `string` | Text | `CCA-EXAMPLE-001` |
| 2 | Period Start | `date` | `DATE` | `string, format: date` | Date | `2026-01-01` |
| 3 | Period End | `date` | `DATE` | `string, format: date` | Date | `2026-01-31` |
| 4 | Party Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Customer/Debtor` |
| 5 | Party Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Customer` |
| 6 | Opening Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `420000.00` |
| 7 | Credit Movement | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `114000.00` |
| 8 | Settlement | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `47800.00` |
| 9 | Adjustments | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `150.00` |
| 10 | Closing Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `486500.00` |
| 11 | Average Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `453175.00` |
| 12 | Measurement Basis | `text` | `VARCHAR(255)` | `string` | Text | `Invoice date to settlement date` |
| 13 | Contractual Terms Days | `number` | `NUMERIC` | `number` | Number | `30` |
| 14 | Actual Collection/Payment Days | `number` | `NUMERIC` | `number` | Number | `42` |
| 15 | Weighted Days | `number` | `NUMERIC` | `number` | Number | `38` |
| 16 | Overdue Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `254869.60` |
| 17 | Current Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `231630.40` |
| 18 | Aging 0-30 Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `92340.00` |
| 19 | Aging 31-60 Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `61100.00` |
| 20 | Aging 61-90 Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `30000.00` |
| 21 | Aging 91-180 Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `41429.60` |
| 22 | Aging Over 180 Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `30000.00` |
| 23 | Customer Credit Limit | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `500000.00` |
| 24 | Customer Credit Utilisation % | `number` | `NUMERIC` | `number` | Number | `97.27` |
| 25 | Benchmark Days | `number` | `NUMERIC` | `number` | Number | `35` |
| 26 | Gap vs Benchmark | `number` | `NUMERIC` | `number` | Number | `7` |
| 27 | Cycle Trend | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Deteriorating` |
| 28 | Reconciliation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Needs Review` |
| 29 | Data Quality Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Incomplete` |
| 30 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Example Reviewer` |
| 31 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 32 | Notes | `long_text` | `TEXT` | `string` | Text | `The 150.00 difference against the balance identity is left open, not adjusted. Benchmark of 35 days is a proposed default, not an agreed target. Two invoices carry no due date, so their bucket and the utilisation figure stay Unknown.` |
| 33 | Cycle Analysis ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

`Measurement Basis` is in this list because the day counts above it cannot be interpreted without
it, and because the reviewer's first question - actual behaviour or agreed terms - only has an
answer if the basis is written on the row. `Customer Credit Limit` and `Customer Credit
Utilisation %` are **customer-only**: they are filled only where `Party Type` is
`Customer/Debtor` and a credit limit actually exists. On a `Supplier/Creditor` row both stay
blank. A supplier has no customer credit limit, and writing one there is a category error, not a
default. Where no limit exists, `Customer Credit Utilisation %` is `Unknown`, never `0`.

