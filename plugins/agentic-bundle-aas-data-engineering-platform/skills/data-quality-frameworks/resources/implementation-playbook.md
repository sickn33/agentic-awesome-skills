# Data Quality Frameworks Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Core Concepts

### 1. Data Quality Dimensions

| Dimension | Description | Example Check |
|-----------|-------------|---------------|
| **Completeness** | No missing values | `expect_column_values_to_not_be_null` |
| **Uniqueness** | No duplicates | `expect_column_values_to_be_unique` |
| **Validity** | Values in expected range | `expect_column_values_to_be_in_set` |
| **Accuracy** | Data matches reality | Cross-reference validation |
| **Consistency** | No contradictions | `expect_column_pair_values_A_to_be_greater_than_B` |
| **Timeliness** | Data is recent | `expect_column_max_to_be_between` |

### 2. Testing Pyramid for Data

```
          /\
         /  \     Integration Tests (cross-table)
        /────\
       /      \   Unit Tests (single column)
      /────────\
     /          \ Schema Tests (structure)
    /────────────\
```

## Quick Start

### Great Expectations version boundary

The original examples mixed legacy 0.18 checkpoints with GX 1.x expectation
classes. Do not install an unspecified latest version and execute legacy init,
add_expectation_suite or run_checkpoint APIs. For GX Core 1.x, use the current
[official workflow](https://docs.greatexpectations.io/docs/core/introduction/try_gx/).
The following isolated synthetic example illustrates one check without credentials:

```python
import great_expectations as gx
import pandas as pd
context = gx.get_context(mode="ephemeral")
source = context.data_sources.add_pandas("synthetic_orders")
asset = source.add_dataframe_asset(name="orders")
definition = asset.add_batch_definition_whole_dataframe("whole")
batch = definition.get_batch(batch_parameters={"dataframe": pd.DataFrame({"amount": [10, -1]})})
result = batch.validate(gx.expectations.ExpectColumnValuesToBeBetween(column="amount", min_value=0))
if result.success is not False:
    raise AssertionError("Expected the negative synthetic amount to fail")
```

Pin compatible GX/Pandas/Python versions. For persistent suites, connect a Batch
Definition to an Expectation Suite through a Validation Definition, then a
Checkpoint. Inspect that version's result objects; do not assume legacy dict
wrappers or list indexing matches modern run_results. Evaluate actual UTC
freshness bounds in application code rather than passing unevaluated strings
such as `now - timedelta(days=1)` as parameters. Non-null foreign keys are not
referential-integrity checks: add a relationship check.

## Patterns

### Pattern 3: dbt Data Tests

```yaml
# models/marts/core/_core__models.yml
version: 2

models:
  - name: fct_orders
    description: Order fact table
    tests:
      # Table-level tests
      - dbt_utils.recency:
          datepart: day
          field: created_at
          interval: 1
      - dbt_utils.at_least_one
      - dbt_utils.expression_is_true:
          expression: "total_amount >= 0"

    columns:
      - name: order_id
        description: Primary key
        tests:
          - unique
          - not_null

      - name: customer_id
        description: Foreign key to dim_customers
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id

      - name: order_status
        tests:
          - accepted_values:
              values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

      - name: total_amount
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"

      - name: created_at
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "<= current_timestamp"

  - name: dim_customers
    columns:
      - name: customer_id
        tests:
          - unique
          - not_null

      - name: email
        tests:
          - unique
          - not_null
          # Custom regex test
          - dbt_utils.expression_is_true:
              expression: "~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
```

### Pattern 4: Custom dbt Tests

```sql
-- tests/generic/test_row_count_in_range.sql
{% test row_count_in_range(model, min_count, max_count) %}

with row_count as (
    select count(*) as cnt from {{ model }}
)

select cnt
from row_count
where cnt < {{ min_count }} or cnt > {{ max_count }}

{% endtest %}

-- Usage in schema.yml:
-- tests:
--   - row_count_in_range:
--       min_count: 1000
--       max_count: 10000000
```

```sql
-- tests/generic/test_sequential_values.sql
{% test sequential_values(model, column_name, interval=1) %}

with lagged as (
    select
        {{ column_name }},
        lag({{ column_name }}) over (order by {{ column_name }}) as prev_value
    from {{ model }}
)

select *
from lagged
where {{ column_name }} - prev_value != {{ interval }}
  and prev_value is not null

{% endtest %}
```

```sql
-- tests/singular/assert_orders_customers_match.sql
-- Singular test: specific business rule

with orders_customers as (
    select distinct customer_id from {{ ref('fct_orders') }}
),

dim_customers as (
    select customer_id from {{ ref('dim_customers') }}
),

orphaned_orders as (
    select o.customer_id
    from orders_customers o
    left join dim_customers c using (customer_id)
    where c.customer_id is null
)

select * from orphaned_orders
-- Test passes if this returns 0 rows
```

### Pattern 5: Illustrative Data Contract (not a portable tool schema)

```yaml
# contracts/orders_contract.yaml
apiVersion: example.internal/v1 # Illustrative organization-specific schema, not a validated standard
kind: ExampleDataContract
metadata:
  name: orders
  version: 1.0.0
  owner: data-platform-team
  contact: data-team@company.com

info:
  title: Orders Data Contract
  description: Contract for order event data from the ecommerce platform
  purpose: Analytics, reporting, and ML features

servers:
  production:
    type: snowflake
    account: company.us-east-1
    database: ANALYTICS
    schema: CORE

terms:
  usage: Internal analytics only
  limitations: PII must not be exposed in downstream marts
  billing: Verify actual warehouse compute/storage billing; this example establishes no pricing

schema:
  type: object
  properties:
    order_id:
      type: string
      format: uuid
      description: Unique order identifier
      required: true
      unique: true
      pii: false

    customer_id:
      type: string
      format: uuid
      description: Customer identifier
      required: true
      pii: true
      piiClassification: indirect

    total_amount:
      type: number
      minimum: 0
      maximum: 100000
      description: Order total in USD

    created_at:
      type: string
      format: date-time
      description: Order creation timestamp
      required: true

    status:
      type: string
      enum: [pending, processing, shipped, delivered, cancelled]
      description: Current order status

quality:
  type: SodaCL
  specification:
    checks for orders:
      - row_count > 0
      - missing_count(order_id) = 0
      - duplicate_count(order_id) = 0
      - invalid_count(status) = 0:
          valid values: [pending, processing, shipped, delivered, cancelled]
      - freshness(created_at) < 24h

sla:
  availability: 99.9%
  freshness: 1 hour
  latency: 5 minutes
```

### Pattern 6: Automated Quality Pipeline

1. Resolve each approved table to its configured batch/validation definition.
2. Run checks with read-only credentials, bounded scan cost and timeouts. Record
   dataset revision, batch interval, rules version, execution error and result.
3. Fail closed for missing/skipped required validations; an empty result set is
   not a successful pipeline. Separate warning from blocking failures by policy.
4. Emit check names, aggregate counts and status only. Unexpected rows, observed
   values, Data Docs and exception text may contain personal data; restrict their
   storage and notification destinations.
5. Quarantine or stop according to the approved remediation policy. Do not silently
   let invalid financial/clinical output through to keep a pipeline running.
6. Retry only transient execution failures; deterministic rule failures require
   an owner decision and a documented exception, not an automatic threshold change.

## Best Practices

### Do's
- **Test early** - Validate source data before transformations
- **Test incrementally** - Add tests as you find issues
- **Document expectations** - Clear descriptions for each test
- **Alert on failures** - Integrate with monitoring
- **Version contracts** - Track schema changes

### Don'ts
- **Don't test everything** - Focus on critical columns
- **Don't ignore warnings** - They often precede failures
- **Don't skip freshness** - Stale data is bad data
- **Don't hardcode thresholds** - Use dynamic baselines
- **Don't test in isolation** - Test relationships too

## Resources

- [Great Expectations Documentation](https://docs.greatexpectations.io/)
- [dbt Testing Documentation](https://docs.getdbt.com/docs/build/tests)
- [Data Contract Specification](https://datacontract.com/)
- [Soda Core](https://docs.soda.io/soda-core/overview.html)

## Version and semantics limits

The contract sketch needs an explicitly selected contract specification and its schema validator; nested required/unique/pii annotations do not enforce SQL or JSON Schema constraints. SodaCL and dbt_utils examples need compatible installed packages and adapter syntax; pin them and compile locally before warehouse execution. Column-level expression tests already receive the column name, so the email expression should be a table-level expression or omit the duplicate column identifier. Sequential numeric checks are inappropriate for gapful identity/sequence keys. Accuracy against reality requires an authoritative reference; uniqueness/completeness alone do not prove it. Thresholds and freshness windows above are illustrative, not universal baselines.
