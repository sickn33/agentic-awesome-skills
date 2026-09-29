# Accounting Software Selection: Field Reference


| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Evaluation ID | `text` | `VARCHAR(255)` | `string` | `Text` | `EVAL-EXAMPLE-001` |
| 2 | Software | `text` | `VARCHAR(255)` | `string` | `Text` | `Example Product` |
| 3 | Vendor | `text` | `VARCHAR(255)` | `string` | `Text` | `Example Vendor` |
| 4 | Business Activities | `long_text` | `TEXT` | `string` | `Text` | `Trading and manufacturing` |
| 5 | Modules Needed | `long_text` | `TEXT` | `string` | `Text` | `Must-have: general ledger; Must-have: inventory; Must-have: manufacturing; Should-have: multi-branch; Not required: service management` |
| 6 | Deployment Type | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Cloud` |
| 7 | Accounting Coverage | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `5 Comprehensive` |
| 8 | Sales Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 9 | Purchase Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 10 | Inventory Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `5 Comprehensive` |
| 11 | Manufacturing Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 12 | BOM Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 13 | Production/Work Order Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `3 Adequate` |
| 14 | Production Costing | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 15 | Wastage/Scrap Tracking | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `2 Major limitations` |
| 16 | Batch/Lot Tracking | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `2 Major limitations` |
| 17 | Service Management | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Not Required` |
| 18 | VAT Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Untested` |
| 19 | TDS Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Untested` |
| 20 | Payroll/SSF Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Untested` |
| 21 | IRD/Statutory Reporting | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Untested` |
| 22 | E-Billing/CBMS Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Untested` |
| 23 | Financial Reporting | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 24 | Multi-Company Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Not Required` |
| 25 | Branch Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 26 | Warehouse Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 27 | User Access Control | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 28 | Approval Workflow | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `3 Adequate` |
| 29 | Data Backup & Security | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 30 | Migration Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 31 | Integration/API | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `2 Major limitations` |
| 32 | Data Export | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 33 | After-Sales Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `2 Major limitations` |
| 34 | Implementation Support | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `3 Adequate` |
| 35 | Training | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `3 Adequate` |
| 36 | Customization | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `2 Major limitations` |
| 37 | Reliability Rating | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 38 | Ease of Use Rating | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `4 Strong` |
| 39 | Support Quality Rating | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `2 Major limitations` |
| 40 | Demo Date | `date` | `DATE` | `string, format: date` | `Date` | `2026-07-18` |
| 41 | Demo Test Result | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Partially Passed` |
| 42 | Test Transactions Run | `number` | `NUMERIC` | `number` | `Number` | `25` |
| 43 | Licence Cost | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `480000.00` |
| 44 | Implementation Cost | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `120000.00` |
| 45 | Customization Cost | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `65000.00` |
| 46 | Training Cost | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `45000.00` |
| 47 | Annual Renewal | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `240000.00` |
| 48 | First-Year Cost | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `710000.00` |
| 49 | Three-Year TCO | `currency` | `NUMERIC(14,2)` | `number` | `Number (format: currency)` | `1190000.00` |
| 50 | Evaluation Status | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Evaluated` |
| 51 | Deal-breaker | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `No` |
| 52 | Selection Decision | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Not Selected` |
| 53 | Rejection Reason | `select` | `VARCHAR(100)` | `string` | `Select (add options after import)` | `Poor Support` |
| 54 | Evaluated By | `text` | `VARCHAR(255)` | `string` | `Text` | `Example Evaluator` |
| 55 | Evidence/Source | `text` | `VARCHAR(255)` | `string` | `Text` | `ILLUSTRATIVE - vendor demo 2026-07-18; 25 test transactions; written quotation dated 2026-07-25; the three ratings are the evaluator's own view` |
| 56 | Notes | `long_text` | `TEXT` | `string` | `Text` | `VAT / TDS / payroll-SSF / IRD reporting / e-billing left Untested - no current evidence held. Service management and multi-company Not required by this business. Ratings are the evaluator's opinion not vendor claims.` |
| 57 | Selection ID | `id` | `SERIAL PRIMARY KEY` | `integer` | `Text (preserve source ID)` | `(blank)` |

The table above is the single source of truth. The CSV, SQL, JSON Schema and Notion
mapping are all derived from it - never edit one without the others. 57 fields:
`id` | 1, `text` | 5, `long_text` | 3, `select` | 39, `number` | 1, `currency` | 7, `date` | 1.

**Three groups, kept apart on purpose.** Rows 7 to 36 are the vendor's documented or
demonstrated capability; rows 37 to 39 are the named evaluator's own opinion; rows 40
onward are the evidence, the cost and the decision. Keep the first two apart - a brochure
claim is not a Rating, and an evaluator's impression is not a capability.

**What is required, and what is deliberately not.** The JSON Schema requires only
`Evaluation Status` and `Deal-breaker`, because a record has to say where the candidate
sits in the funnel and whether a Must-have has failed, and neither answer is optional
(`Unknown` is one of the values `Deal-breaker` takes). Everything else is deliberately
not required, because its source can legitimately be missing: `Evaluation ID`, `Software`
and `Vendor` are free text and are recorded as soon as the candidate exists;
`Deployment Type` and the capability fields are `Untested` or `Not Required` until someone
checks; `Demo Date`, `Demo Test Result` and `Test Transactions Run` are empty until a
demonstration happens; every cost field is empty until a quotation is in hand;
`First-Year Cost` and `Three-Year TCO` are calculated, and a calculated value is never
required when its parts may be missing; and `Selection Decision` and `Rejection Reason`
are empty until the business decides, which is the point of keeping them apart from
`Evaluation Status`.

**Percentages and dates.** There is no percentage field in this table. The 1-5 scale is
written with its meaning (`4 Strong`), never as a bare number, so a score can be read
without the legend. Dates are ISO `YYYY-MM-DD`.

**Technical fields.** `Selection ID` is a database identifier only. It exists so the
target database can address a row, it is left blank in the example, and it is not a
business reference - do not print it on a quotation or quote it to a vendor.
