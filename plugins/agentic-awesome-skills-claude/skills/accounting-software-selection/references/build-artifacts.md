# Accounting Software Selection: Build Artifacts

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
artifacts as data only, in the order they were asked for. No preamble, no summary, no
closing line. All four come from the single field list in this file, so they cannot drift
apart, and a field never appears in one artifact and not the others.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

The SQL below is written in PostgreSQL-flavoured DDL. `SERIAL PRIMARY KEY` and
`TIMESTAMP DEFAULT NOW()` are PostgreSQL-specific; on another engine use that engine's
identity column and default-timestamp syntax. `created_at` and `updated_at` are
maintained by the database and are not business fields - they are the only permitted
artifact-only addition, and they stay out of the CSV, the JSON Schema and the Notion
mapping. The DDL carries no index so it runs unchanged anywhere; on a live database
index `Evaluation Status` and `Software`, which are the two columns the sheet is filtered
and reported on.

The example row is fictional and must stay that way: identifiers use the `-EXAMPLE-`
pattern and every name reads `Example ...`. It shows a fully evaluated candidate so the
shape is visible, and the compliance fields deliberately read `Untested` - that is what
they are until the business holds current evidence. For an Excel-compatible CSV, use UTF-8 with a byte order mark so Excel opens the text correctly. A CSV is not an `.xlsx` workbook; create `.xlsx` only when the user requests a workbook. A
CSV carries no types, so after it, name the columns that need a number, date or currency
format applied. Copy the shape, never the values.

```csv
Evaluation ID,Software,Vendor,Business Activities,Modules Needed,Deployment Type,Accounting Coverage,Sales Support,Purchase Support,Inventory Support,Manufacturing Support,BOM Support,Production/Work Order Support,Production Costing,Wastage/Scrap Tracking,Batch/Lot Tracking,Service Management,VAT Support,TDS Support,Payroll/SSF Support,IRD/Statutory Reporting,E-Billing/CBMS Support,Financial Reporting,Multi-Company Support,Branch Support,Warehouse Support,User Access Control,Approval Workflow,Data Backup & Security,Migration Support,Integration/API,Data Export,After-Sales Support,Implementation Support,Training,Customization,Reliability Rating,Ease of Use Rating,Support Quality Rating,Demo Date,Demo Test Result,Test Transactions Run,Licence Cost,Implementation Cost,Customization Cost,Training Cost,Annual Renewal,First-Year Cost,Three-Year TCO,Evaluation Status,Deal-breaker,Selection Decision,Rejection Reason,Evaluated By,Evidence/Source,Notes,Selection ID
EVAL-EXAMPLE-001,Example Product,Example Vendor,Trading and manufacturing,Must-have: general ledger; Must-have: inventory; Must-have: manufacturing; Should-have: multi-branch; Not required: service management,Cloud,5 Comprehensive,4 Strong,4 Strong,5 Comprehensive,4 Strong,4 Strong,3 Adequate,4 Strong,2 Major limitations,2 Major limitations,Not Required,Untested,Untested,Untested,Untested,Untested,4 Strong,Not Required,4 Strong,4 Strong,4 Strong,3 Adequate,4 Strong,4 Strong,2 Major limitations,4 Strong,2 Major limitations,3 Adequate,3 Adequate,2 Major limitations,4 Strong,4 Strong,2 Major limitations,2026-07-18,Partially Passed,25,480000.00,120000.00,65000.00,45000.00,240000.00,710000.00,1190000.00,Evaluated,No,Not Selected,Poor Support,Example Evaluator,ILLUSTRATIVE - vendor demo 2026-07-18; 25 test transactions; written quotation dated 2026-07-25; the three ratings are the evaluator's own view,VAT / TDS / payroll-SSF / IRD reporting / e-billing left Untested - no current evidence held. Service management and multi-company Not required by this business. Ratings are the evaluator's opinion not vendor claims.,(blank)
```

```sql
CREATE TABLE accounting_software_selection (
  evaluation_id VARCHAR(255),
  software VARCHAR(255),
  vendor VARCHAR(255),
  business_activities TEXT,
  modules_needed TEXT,
  deployment_type VARCHAR(100),
  accounting_coverage VARCHAR(100),
  sales_support VARCHAR(100),
  purchase_support VARCHAR(100),
  inventory_support VARCHAR(100),
  manufacturing_support VARCHAR(100),
  bom_support VARCHAR(100),
  production_work_order_support VARCHAR(100),
  production_costing VARCHAR(100),
  wastage_scrap_tracking VARCHAR(100),
  batch_lot_tracking VARCHAR(100),
  service_management VARCHAR(100),
  vat_support VARCHAR(100),
  tds_support VARCHAR(100),
  payroll_ssf_support VARCHAR(100),
  ird_statutory_reporting VARCHAR(100),
  e_billing_cbms_support VARCHAR(100),
  financial_reporting VARCHAR(100),
  multi_company_support VARCHAR(100),
  branch_support VARCHAR(100),
  warehouse_support VARCHAR(100),
  user_access_control VARCHAR(100),
  approval_workflow VARCHAR(100),
  data_backup_security VARCHAR(100),
  migration_support VARCHAR(100),
  integration_api VARCHAR(100),
  data_export VARCHAR(100),
  after_sales_support VARCHAR(100),
  implementation_support VARCHAR(100),
  training VARCHAR(100),
  customization VARCHAR(100),
  reliability_rating VARCHAR(100),
  ease_of_use_rating VARCHAR(100),
  support_quality_rating VARCHAR(100),
  demo_date DATE,
  demo_test_result VARCHAR(100),
  test_transactions_run NUMERIC,
  licence_cost NUMERIC(14,2),
  implementation_cost NUMERIC(14,2),
  customization_cost NUMERIC(14,2),
  training_cost NUMERIC(14,2),
  annual_renewal NUMERIC(14,2),
  first_year_cost NUMERIC(14,2),
  three_year_tco NUMERIC(14,2),
  evaluation_status VARCHAR(100) NOT NULL,
  deal_breaker VARCHAR(100) NOT NULL,
  selection_decision VARCHAR(100),
  rejection_reason VARCHAR(100),
  evaluated_by VARCHAR(255),
  evidence_source VARCHAR(255),
  notes TEXT,
  selection_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT cost_lines_non_negative CHECK (
    licence_cost >= 0 AND implementation_cost >= 0
    AND customization_cost >= 0 AND training_cost >= 0
    AND annual_renewal >= 0 AND first_year_cost >= 0
    AND three_year_tco >= 0
  ),
  CONSTRAINT evaluation_status_values CHECK (evaluation_status IN
    ('Not Evaluated', 'Demo Scheduled', 'Demo Completed', 'Testing', 'Evaluated')),
  CONSTRAINT deal_breaker_values CHECK (deal_breaker IN ('Yes', 'No', 'Unknown'))
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Accounting Software Selection",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Evaluation ID": {
      "type": "string"
    },
    "Software": {
      "type": "string"
    },
    "Vendor": {
      "type": "string"
    },
    "Business Activities": {
      "type": "string"
    },
    "Modules Needed": {
      "type": "string"
    },
    "Deployment Type": {
      "type": "string"
    },
    "Accounting Coverage": {
      "type": "string"
    },
    "Sales Support": {
      "type": "string"
    },
    "Purchase Support": {
      "type": "string"
    },
    "Inventory Support": {
      "type": "string"
    },
    "Manufacturing Support": {
      "type": "string"
    },
    "BOM Support": {
      "type": "string"
    },
    "Production/Work Order Support": {
      "type": "string"
    },
    "Production Costing": {
      "type": "string"
    },
    "Wastage/Scrap Tracking": {
      "type": "string"
    },
    "Batch/Lot Tracking": {
      "type": "string"
    },
    "Service Management": {
      "type": "string"
    },
    "VAT Support": {
      "type": "string"
    },
    "TDS Support": {
      "type": "string"
    },
    "Payroll/SSF Support": {
      "type": "string"
    },
    "IRD/Statutory Reporting": {
      "type": "string"
    },
    "E-Billing/CBMS Support": {
      "type": "string"
    },
    "Financial Reporting": {
      "type": "string"
    },
    "Multi-Company Support": {
      "type": "string"
    },
    "Branch Support": {
      "type": "string"
    },
    "Warehouse Support": {
      "type": "string"
    },
    "User Access Control": {
      "type": "string"
    },
    "Approval Workflow": {
      "type": "string"
    },
    "Data Backup & Security": {
      "type": "string"
    },
    "Migration Support": {
      "type": "string"
    },
    "Integration/API": {
      "type": "string"
    },
    "Data Export": {
      "type": "string"
    },
    "After-Sales Support": {
      "type": "string"
    },
    "Implementation Support": {
      "type": "string"
    },
    "Training": {
      "type": "string"
    },
    "Customization": {
      "type": "string"
    },
    "Reliability Rating": {
      "type": "string"
    },
    "Ease of Use Rating": {
      "type": "string"
    },
    "Support Quality Rating": {
      "type": "string"
    },
    "Demo Date": {
      "type": "string",
      "format": "date"
    },
    "Demo Test Result": {
      "type": "string"
    },
    "Test Transactions Run": {
      "type": "number"
    },
    "Licence Cost": {
      "type": "number"
    },
    "Implementation Cost": {
      "type": "number"
    },
    "Customization Cost": {
      "type": "number"
    },
    "Training Cost": {
      "type": "number"
    },
    "Annual Renewal": {
      "type": "number"
    },
    "First-Year Cost": {
      "type": "number"
    },
    "Three-Year TCO": {
      "type": "number"
    },
    "Evaluation Status": {
      "type": "string"
    },
    "Deal-breaker": {
      "type": "string"
    },
    "Selection Decision": {
      "type": "string"
    },
    "Rejection Reason": {
      "type": "string"
    },
    "Evaluated By": {
      "type": "string"
    },
    "Evidence/Source": {
      "type": "string"
    },
    "Notes": {
      "type": "string"
    },
    "Selection ID": {
      "type": "integer"
    }
  },
  "required": [
    "Evaluation Status",
    "Deal-breaker"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Evaluation ID | Title | Use as the database title |
| Software | Text | Leave as Text |
| Vendor | Text | Leave as Text |
| Business Activities | Text | Leave as Text |
| Modules Needed | Text | Leave as Text |
| Deployment Type | Select (add options after import) | Convert to Select, add options: "Cloud", "On-premise", "Hybrid" |
| Accounting Coverage | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Sales Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Purchase Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Inventory Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Manufacturing Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| BOM Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Production/Work Order Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Production Costing | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Wastage/Scrap Tracking | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Batch/Lot Tracking | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Service Management | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| VAT Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| TDS Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Payroll/SSF Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| IRD/Statutory Reporting | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| E-Billing/CBMS Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Financial Reporting | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Multi-Company Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Branch Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Warehouse Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| User Access Control | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Approval Workflow | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Data Backup & Security | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Migration Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Integration/API | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Data Export | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| After-Sales Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Implementation Support | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Training | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Customization | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Reliability Rating | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Ease of Use Rating | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Support Quality Rating | Select (add options after import) | Convert to Select, add options: "1 Missing", "2 Major limitations", "3 Adequate", "4 Strong", "5 Comprehensive", "Not Required", "Untested" |
| Demo Date | Date | Convert to Date |
| Demo Test Result | Select (add options after import) | Convert to Select, add options: "Not Tested", "Partially Passed", "Passed", "Failed" |
| Test Transactions Run | Number | Convert to Number |
| Licence Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Implementation Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Customization Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Training Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Annual Renewal | Number (format: currency) | Convert to Number, set format to Currency |
| First-Year Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Three-Year TCO | Number (format: currency) | Convert to Number, set format to Currency |
| Evaluation Status | Select (add options after import) | Convert to Select, add options: "Not Evaluated", "Demo Scheduled", "Demo Completed", "Testing", "Evaluated" |
| Deal-breaker | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Unknown" |
| Selection Decision | Select (add options after import) | Convert to Select, add options: "Selected", "Shortlisted", "Not Selected", "Rejected" |
| Rejection Reason | Select (add options after import) | Convert to Select, add options: "Cost", "Missing Capability", "Poor Fit", "Poor Support", "Implementation Risk", "Security Risk", "User Experience", "Other" |
| Evaluated By | Text | Leave as Text |
| Evidence/Source | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Selection ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

