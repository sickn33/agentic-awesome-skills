# Credit Cycle Analysis: How It Works


Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> the user wants artifacts; go to Step 2.
- "our process is ..." or "we have a sheet" -> `import` or `fix`; capture what is there, then Step 2.
- "is this right" or "review this" or "audit this" -> `review`; answer from what they share and do
  not rebuild anything.
- "show me the cycle" or "analyse this" -> `report`; answer from what they share.
- "how do I ..." -> advice question; answer directly and offer the build only if it helps.

If the intent is already clear from the request, do not ask the user to repeat it.

On a `review`, check the design against nine things and report concrete issues with concrete
fixes: the data model, the calculation logic, the reconciliation, the aging, debtor/creditor
comparability, the benchmark logic, the working-capital methodology, the data quality, and whether
the four artifacts agree. Do not rebuild the system because a review was asked for.

On a `fix`, preserve every valid fact the user has already supplied, identify the contradictions,
correct the model, avoid fields that were not asked for, and explain the material changes briefly.
Rebuild the artifacts only when the fix request asks for them.

One message, one question, no batching. Open with the question that decides the design:

> **Q:** How long do your customers take to pay you?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a time, and
stop as soon as the remaining answers would not change the recommendation or the requested
artifact. Never batch two questions into one message.

- **Parties** - Are customers included? Are suppliers included? How many of each? Are parties
  tracked individually? Is a customer credit limit maintained for anyone?
- **Cycle, customers** - What are the contractual payment terms in days? What does the customer
  cycle actually measure? Which dates does the business already hold? Do part-payments happen?
- **Cycle, suppliers** - Same four questions, asked separately. Do not assume the customer answer
  carries over to the supplier side.
- **Measurement basis** - Is the cycle measured from invoice/bill date to settlement date, to
  first settlement date, from due date to settlement date, or on a weighted settlement date?
  Select a basis only from evidence in the user's process, never by default.
- **Aging** - Do invoice or bill dates exist? Do due dates exist? Are outstanding amounts
  available? Can aging be done at invoice or bill level? Which buckets are already in use?
- **Current process** - Spreadsheet, accounting software, manual, or an existing report? How is it
  reconciled today? What data-quality problem is known?
- **Outcome** - Cycle measurement, aging, the debtor-vs-creditor comparison, working-capital
  analysis, or all of them?

**An ambiguous answer is not an answer.** `yes`, `no`, `maybe`, `same`, `okay` and `fine` do not
answer a multiple-choice question. Re-ask as an explicit choice:

> **Q:** Which do you mean: **the days you agreed in writing** or **the days you actually wait**?

A partial answer keeps only the part that was answered. "Customers take somewhere between thirty
and fifty days" records a range for the actual cycle and leaves the contractual terms `Unknown`.

**Never invent a business fact.** Not a party name, a balance, an invoice number, a payment date,
a due date, a payment term, a credit limit, a benchmark, a currency, a collection day, a payment
day, an aging figure, a working-capital amount or a trend. If a value was not supplied by the user
or derived by a documented formula from supplied data, it is `Unknown` or blank.
Never turn Unknown into zero - a blank is an answer about what is missing, a zero is an answer
about the business. Record `Unknown`, move on, and never re-ask an unknown the user has already
said they do not have.

When the answer to a question is genuinely `Unknown`, the calculated values that depend on it stay
`Unknown` too, and the row's `Data Quality Status` records why. `Actual Collection/Payment Days`
is never filled with the contractual terms, and `Estimated Working-Capital Funding` is never
filled with a number when the monetary basis is missing.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless they ask,
and it never carries a value the user did not give.

```yaml
module: credit-cycle-analysis
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Parties": null
  "Cycle": null
  "Aging": null
  "Current process": null
  "Outcome": null
debtor_terms_days: null
debtor_actual_days: null
debtor_measurement_basis: null
creditor_terms_days: null
creditor_actual_days: null
creditor_measurement_basis: null
partial_payments: null
credit_limits_maintained: null
due_dates_available: null
invoice_level_aging: null
aging_buckets: null
annualised_basis_appropriate: null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
unknowns: []            # asked and not answered
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Three logical datasets, kept apart. A party-period credit-cycle summary in
the same shape for debtors and for creditors; an invoice/bill aging detail carrying the evidence
and the buckets; and a per-period debtor-versus-creditor comparison where the gap and, if a
monetary basis exists, the funding effect are recorded.

**Why this one:** The three layers do three different jobs and conflating any two of them is what
produces a wrong number. The summary is the management view. The detail is the evidence behind
every aging bucket and behind every day count, and it is the only place a single `Aging Bucket`
can honestly sit. The comparison is the only place the two sides can be subtracted at all, and it
is the only place a monetary basis is recorded. Forcing all of it into one row is what makes a
party's aging position unrepresentable.

**Workflow:** Party selected → Period movement recorded as credit movement and settlement →
Cycle days measured on the documented basis → Overdue and bucket amounts reviewed → Compared
against the other side → Gap priced only if a monetary basis exists → Trend recorded → Reconciled,
marked and reviewed

### Step 5 - Build only on request

Once the user asks for it, derive the fields from one canonical field dictionary and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately. A field present in one artifact
is present in all four, in the same order. Build only what was asked for: CSV, SQL, JSON Schema and
Notion mapping on request, and one of them if that is all that was asked for.

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
Analysis Number,Period Start,Period End,Party Type,Party Name,Opening Balance,Credit Movement,Settlement,Adjustments,Closing Balance,Average Balance,Measurement Basis,Contractual Terms Days,Actual Collection/Payment Days,Weighted Days,Overdue Amount,Current Amount,Aging 0-30 Amount,Aging 31-60 Amount,Aging 61-90 Amount,Aging 91-180 Amount,Aging Over 180 Amount,Customer Credit Limit,Customer Credit Utilisation %,Benchmark Days,Gap vs Benchmark,Cycle Trend,Reconciliation Status,Data Quality Status,Reviewed By,Status,Notes,Cycle Analysis ID
CCA-EXAMPLE-001,2026-01-01,2026-01-31,Customer/Debtor,Example Customer,420000.00,114000.00,47800.00,150.00,486500.00,453175.00,Invoice date to settlement date,30,42,38,254869.60,231630.40,92340.00,61100.00,30000.00,41429.60,30000.00,500000.00,97.27,35,7,Deteriorating,Needs Review,Incomplete,Example Reviewer,In progress,"The 150.00 difference against the balance identity is left open, not adjusted. Benchmark of 35 days is a proposed default, not an agreed target. Two invoices carry no due date, so their bucket and the utilisation figure stay Unknown.",
```

```sql
-- Engine assumption: PostgreSQL. If the target database is not PostgreSQL, replace
-- SERIAL PRIMARY KEY with that engine's auto-increment form; nothing else here is
-- engine-specific.
CREATE TABLE credit_cycle_analysis (
  analysis_number VARCHAR(255),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  party_type VARCHAR(100) NOT NULL,
  party_name VARCHAR(255),
  opening_balance NUMERIC(14,2) NOT NULL,
  credit_movement NUMERIC(14,2) NOT NULL,
  settlement NUMERIC(14,2) NOT NULL,
  adjustments NUMERIC(14,2),
  closing_balance NUMERIC(14,2) NOT NULL,
  average_balance NUMERIC(14,2),
  measurement_basis VARCHAR(255),
  contractual_terms_days NUMERIC,
  actual_collection_payment_days NUMERIC,
  weighted_days NUMERIC,
  overdue_amount NUMERIC(14,2),
  current_amount NUMERIC(14,2),
  aging_0_30_amount NUMERIC(14,2),
  aging_31_60_amount NUMERIC(14,2),
  aging_61_90_amount NUMERIC(14,2),
  aging_91_180_amount NUMERIC(14,2),
  aging_over_180_amount NUMERIC(14,2),
  customer_credit_limit NUMERIC(14,2),
  customer_credit_utilisation_pct NUMERIC,
  benchmark_days NUMERIC,
  gap_vs_benchmark NUMERIC,
  cycle_trend VARCHAR(100) NOT NULL,
  reconciliation_status VARCHAR(100) NOT NULL,
  data_quality_status VARCHAR(100) NOT NULL,
  reviewed_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  cycle_analysis_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT credit_cycle_period_order CHECK (period_start <= period_end),
  CONSTRAINT credit_cycle_money_non_negative CHECK (
    opening_balance >= 0
    AND credit_movement >= 0
    AND settlement >= 0
    AND closing_balance >= 0)
);

CREATE INDEX idx_credit_cycle_analysis_status ON credit_cycle_analysis (status);
CREATE INDEX idx_credit_cycle_analysis_party ON credit_cycle_analysis (party_name);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Debtor & Creditor Credit-Cycle Analysis",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Analysis Number": { "type": "string" },
      "Period Start": { "type": "string", "format": "date" },
      "Period End": { "type": "string", "format": "date" },
      "Party Type": { "type": "string" },
      "Party Name": { "type": "string" },
      "Opening Balance": { "type": "number" },
      "Credit Movement": { "type": "number" },
      "Settlement": { "type": "number" },
      "Adjustments": { "type": "number" },
      "Closing Balance": { "type": "number" },
      "Average Balance": { "type": "number" },
      "Measurement Basis": { "type": "string" },
      "Contractual Terms Days": { "type": "number" },
      "Actual Collection/Payment Days": { "type": "number" },
      "Weighted Days": { "type": "number" },
      "Overdue Amount": { "type": "number" },
      "Current Amount": { "type": "number" },
      "Aging 0-30 Amount": { "type": "number" },
      "Aging 31-60 Amount": { "type": "number" },
      "Aging 61-90 Amount": { "type": "number" },
      "Aging 91-180 Amount": { "type": "number" },
      "Aging Over 180 Amount": { "type": "number" },
      "Customer Credit Limit": { "type": "number" },
      "Customer Credit Utilisation %": { "type": "number" },
      "Benchmark Days": { "type": "number" },
      "Gap vs Benchmark": { "type": "number" },
      "Cycle Trend": { "type": "string" },
      "Reconciliation Status": { "type": "string" },
      "Data Quality Status": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Cycle Analysis ID": { "type": "integer" }
  },
  "required": [
      "Period Start",
      "Period End",
      "Party Type",
      "Opening Balance",
      "Credit Movement",
      "Settlement",
      "Closing Balance",
      "Cycle Trend",
      "Reconciliation Status",
      "Data Quality Status",
      "Status"
  ]
}
```

`required` is a business-necessity list, not an availability list. `Opening Balance`,
`Credit Movement`, `Settlement` and `Closing Balance` are required because the balance identity
cannot be tested without all four. `Period Start` and `Period End` are required because every
other date on the row is measured against the period. `Party Type` is required because the
customer-only fields are only meaningful with it. Every calculated field - the days, the bucket
amounts, the credit limit, the utilisation, the benchmark and the gap - is deliberately optional,
because each of them has a legitimate `Unknown`.

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Analysis Number | Title | Use as the database title |
| Period Start | Date | Convert to Date |
| Period End | Date | Convert to Date |
| Party Type | Select (add options after import) | Convert to Select, add options: "Customer/Debtor", "Supplier/Creditor" |
| Party Name | Text | Leave as Text |
| Opening Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Credit Movement | Number (format: currency) | Convert to Number, set format to Currency |
| Settlement | Number (format: currency) | Convert to Number, set format to Currency |
| Adjustments | Number (format: currency) | Convert to Number, set format to Currency |
| Closing Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Average Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Measurement Basis | Text | Leave as Text |
| Contractual Terms Days | Number | Convert to Number |
| Actual Collection/Payment Days | Number | Convert to Number |
| Weighted Days | Number | Convert to Number |
| Overdue Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Current Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Aging 0-30 Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Aging 31-60 Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Aging 61-90 Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Aging 91-180 Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Aging Over 180 Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Customer Credit Limit | Number (format: currency) | Convert to Number, set format to Currency |
| Customer Credit Utilisation % | Number | Convert to Number |
| Benchmark Days | Number | Convert to Number |
| Gap vs Benchmark | Number | Convert to Number |
| Cycle Trend | Select (add options after import) | Convert to Select, add options: "Improving", "Stable", "Deteriorating", "Unknown" |
| Reconciliation Status | Select (add options after import) | Convert to Select, add options: "Reconciled", "Needs Review", "Unreconciled", "Unknown" |
| Data Quality Status | Select (add options after import) | Convert to Select, add options: "Complete", "Incomplete", "Needs Review", "Blocked" |
| Reviewed By | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Cycle Analysis ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`, and
anything pointing at another table stays `relation`.

### Dataset 2 - Invoice/Bill Aging Detail

One record per invoice or supplier bill, and the only place a single `Aging Bucket` belongs. Its
CSV header is the Field column below in order; its JSON Schema mirrors the SQL column; its Notion
mapping mirrors the Notion column. Where the business already uses its own buckets, keep the
business's buckets and rename the columns to match rather than forcing these.

| Field | Type | SQL | JSON Schema | Notion |
|---|---|---|---|---|
| Aging Detail ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) |
| Party Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) |
| Party Name | `text` | `VARCHAR(255)` | `string` | Text |
| Invoice/Bill Number | `text` | `VARCHAR(255)` | `string` | Text |
| Invoice/Bill Date | `date` | `DATE` | `string, format: date` | Date |
| Due Date | `date` | `DATE` | `string, format: date` | Date |
| Original Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) |
| Settled Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) |
| Outstanding Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) |
| Settlement Date | `date` | `DATE` | `string, format: date` | Date |
| Days Overdue | `number` | `NUMERIC` | `number` | Number |
| Aging Bucket | `select` | `VARCHAR(100)` | `string` | Select (add options after import) |
| Period End | `date` | `DATE` | `string, format: date` | Date |
| Notes | `long_text` | `TEXT` | `string` | Text |

`Party Type` options as above. `Aging Bucket` starting set: `Current`, `0-30 days`, `31-60 days`,
`61-90 days`, `91-180 days`, `180+ days`, `Unknown`.

`Days Overdue = Period End - Due Date`. Zero or negative is `Current`; 1-30 is `0-30 days`; 31-60
is `31-60 days`; 61-90 is `61-90 days`; 91-180 is `91-180 days`; 181 and above is `180+ days`. A
`Due Date` that is not recorded leaves `Days Overdue` and `Aging Bucket` as `Unknown`. Do not guess
a due date from payment terms - a term is the agreement, the due date is a fact about this
invoice, and reconstructing it produces an aging profile that looks measured and is not.

`Outstanding Amount = Original Amount - Settled Amount`. Where a part-payment has been received,
`Settlement Date` is the date of the **final** settlement and the day count is the weighted
settlement calculation below.

```sql
-- Engine assumption: PostgreSQL, as above.
CREATE TABLE credit_cycle_aging_detail (
  aging_detail_id SERIAL PRIMARY KEY,
  party_type VARCHAR(100) NOT NULL,
  party_name VARCHAR(255),
  invoice_bill_number VARCHAR(255),
  invoice_bill_date DATE,
  due_date DATE,
  original_amount NUMERIC(14,2),
  settled_amount NUMERIC(14,2),
  outstanding_amount NUMERIC(14,2),
  settlement_date DATE,
  days_overdue NUMERIC,
  aging_bucket VARCHAR(100),
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT credit_cycle_aging_money_non_negative CHECK (
    original_amount >= 0
    AND settled_amount >= 0
    AND outstanding_amount >= 0)
);

CREATE INDEX idx_credit_cycle_aging_detail_bucket ON credit_cycle_aging_detail (aging_bucket);
```

### Dataset 3 - Working-Capital Comparison

One record per reporting period, and the only place the two sides are subtracted. Its CSV header
is the Field column below in order; its JSON Schema mirrors the SQL column; its Notion mapping
mirrors the Notion column.

| Field | Type | SQL | JSON Schema | Notion |
|---|---|---|---|---|
| Comparison ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) |
| Period Start | `date` | `DATE` | `string, format: date` | Date |
| Period End | `date` | `DATE` | `string, format: date` | Date |
| Debtor Collection Days | `number` | `NUMERIC` | `number` | Number |
| Creditor Payment Days | `number` | `NUMERIC` | `number` | Number |
| Cycle Gap Days | `number` | `NUMERIC` | `number` | Number |
| Relevant Daily Credit Movement | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) |
| Estimated Working-Capital Funding | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) |
| Calculation Basis | `text` | `VARCHAR(255)` | `string` | Text |
| Data Quality Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) |
| Cycle Trend | `select` | `VARCHAR(100)` | `string` | Select (add options after import) |
| Reviewed By | `text` | `VARCHAR(255)` | `string` | Text |
| Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) |
| Notes | `long_text` | `TEXT` | `string` | Text |

`Data Quality Status`, `Cycle Trend` and `Status` take the option lists above.

`Cycle Gap Days = Debtor Collection Days - Creditor Payment Days`, read descriptively only. A
positive gap is not automatically bad; the module does not call it bad, and it does not recommend
a change of terms, a change of supplier or a new facility. `Cycle Gap Days` and
`Estimated Working-Capital Funding` are both optional, because either side of the comparison can
legitimately be `Unknown`.

`Estimated Working-Capital Funding = Cycle Gap Days x Relevant Daily Credit Movement` **only** when
a monetary basis exists. `Calculation Basis` is never optional on a row that carries the estimate,
and it names the basis in words - for example "relevant annual credit movement divided by 365",
together with which annual figure was chosen and why. With no monetary basis, the estimate is
`Unknown` and `Calculation Basis` says why.

```sql
-- Engine assumption: PostgreSQL, as above.
CREATE TABLE credit_cycle_working_capital_comparison (
  comparison_id SERIAL PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  debtor_collection_days NUMERIC,
  creditor_payment_days NUMERIC,
  cycle_gap_days NUMERIC,
  relevant_daily_credit_movement NUMERIC(14,2),
  estimated_working_capital_funding NUMERIC(14,2),
  calculation_basis VARCHAR(255),
  data_quality_status VARCHAR(100) NOT NULL,
  cycle_trend VARCHAR(100) NOT NULL,
  reviewed_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT credit_cycle_comparison_period_order CHECK (
    period_start <= period_end)
);
```

### How the day counts are calculated

Every calculated cycle metric states its source dates, its formula, its settlement treatment, its
partial-payment treatment, and whether it is exact or estimated. `Measurement Basis` on the
summary row and `Notes` on the detail row are where that record lives.

**Actual cycle, preferred invoice-level basis:**

```
Actual Days = Settlement Date - Invoice/Bill Date
```

**Partial payments.** Where an invoice is settled in more than one payment, use the weighted
settlement calculation and record that this is what was used:

```
Weighted Settlement Date =
  SUM (Settled Amount_i x Settlement Date_i) / SUM (Settled Amount_i)

Weighted Days = Weighted Settlement Date - Invoice/Bill Date
```

`Weighted Days` on the party-period row is the average of the invoice-level weighted day counts
for that party in that period, and `Measurement Basis` says so. The plain
`Actual Collection/Payment Days` on the same row is the unweighted mean, and it is left `Unknown`
where the weighted figure is the one that was calculated. Both figures on one row, with the basis
named, is the honest answer; a single number that is quietly one or the other is not.

Where the business uses a different documented basis, that basis is used instead - and it is
written into `Measurement Basis`. The basis is never assumed.

**Where the required dates do not exist**, `Actual Collection/Payment Days` is `Unknown`. It is not
filled with the contractual terms, and it is not filled with zero.

**Trend.** `Cycle Trend` compares the current actual cycle with the previous comparable period.
Starting set: `Improving`, `Stable`, `Deteriorating`, `Unknown`. With no comparable prior period
the value is `Unknown`. A trend is never inferred from a single period, and a direction is never
assigned because the number looks uncomfortable.

**Reconciliation and data quality, before a record is complete.** Check the balance identity; check
`Period Start` is not after `Period End`; check that the dates each calculated cycle metric needs
actually exist; check that due dates exist for every line being aged; check that the monetary
values are valid; check that part-settlements are handled rather than ignored; check that the
debtor and creditor cycles were measured on comparable definitions; check that a customer
utilisation figure has a customer credit limit behind it; check that any working-capital funding
figure has a documented monetary basis. Record the outcome:

```
Reconciliation Status: Reconciled | Needs Review | Unreconciled | Unknown
Data Quality Status:    Complete | Incomplete | Needs Review | Blocked
Status:                 Not started | In progress | Blocked | Done | Cancelled
```

A record must not be `Done` while a required reconciliation or calculation check fails. A
difference is recorded and marked, never corrected to make the row tie out. Missing information is
never represented as zero.

