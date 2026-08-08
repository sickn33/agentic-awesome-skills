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

### Great Expectations Setup

```bash
# Install
pip install great_expectations

# Initialize project
great_expectations init

# Create datasource
great_expectations datasource new
```

```python
# great_expectations/checkpoints/daily_validation.yml
import great_expectations as gx

# Create context
context = gx.get_context()

# Create expectation suite
suite = context.add_expectation_suite("orders_suite")

# Add expectations
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
)

# Validate
results = context.run_checkpoint(checkpoint_name="daily_orders")
```

## Patterns

### Pattern 1: Great Expectations Suite

```python
# expectations/orders_suite.py
import great_expectations as gx
from great_expectations.core import ExpectationSuite
from great_expectations.core.expectation_configuration import ExpectationConfiguration

def build_orders_suite() -> ExpectationSuite:
    """Build comprehensive orders expectation suite"""

    suite = ExpectationSuite(expectation_suite_name="orders_suite")

    # Schema expectations
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_table_columns_to_match_set",
        kwargs={
            "column_set": ["order_id", "customer_id", "amount", "status", "created_at"],
            "exact_match": False  # Allow additional columns
        }
    ))

    # Primary key
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_values_to_not_be_null",
        kwargs={"column": "order_id"}
    ))
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_unique",
        kwargs={"column": "order_id"}
    ))

    # Foreign key
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_values_to_not_be_null",
        kwargs={"column": "customer_id"}
    ))

    # Categorical values
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_in_set",
        kwargs={
            "column": "status",
            "value_set": ["pending", "processing", "shipped", "delivered", "cancelled"]
        }
    ))

    # Numeric ranges
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_between",
        kwargs={
            "column": "amount",
            "min_value": 0,
            "max_value": 100000,
            "strict_min": True  # amount > 0
        }
    ))

    # Date validity
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_dateutil_parseable",
        kwargs={"column": "created_at"}
    ))

    # Freshness - data should be recent
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_max_to_be_between",
        kwargs={
            "column": "created_at",
            "min_value": {"$PARAMETER": "now - timedelta(days=1)"},
            "max_value": {"$PARAMETER": "now"}
        }
    ))

    # Row count sanity
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_table_row_count_to_be_between",
        kwargs={
            "min_value": 1000,  # Expect at least 1000 rows
            "max_value": 10000000
        }
    ))

    # Statistical expectations
    suite.add_expectation(ExpectationConfiguration(
        expectation_type="expect_column_mean_to_be_between",
        kwargs={
            "column": "amount",
            "min_value": 50,
            "max_value": 500
        }
    ))

    return suite
```

### Pattern 2: Great Expectations Checkpoint

```yaml
# great_expectations/checkpoints/orders_checkpoint.yml
name: orders_checkpoint
config_version: 1.0
class_name: Checkpoint
run_name_template: "%Y%m%d-%H%M%S-orders-validation"

validations:
  - batch_request:
      datasource_name: warehouse
      data_connector_name: default_inferred_data_connector_name
      data_asset_name: orders
      data_connector_query:
        index: -1  # Latest batch
    expectation_suite_name: orders_suite

action_list:
  - name: store_validation_result
    action:
      class_name: StoreValidationResultAction

  - name: store_evaluation_parameters
    action:
      class_name: StoreEvaluationParametersAction

  - name: update_data_docs
    action:
      class_name: UpdateDataDocsAction

  # Slack notification on failure
  - name: send_slack_notification
    action:
      class_name: SlackNotificationAction
      slack_webhook: ${SLACK_WEBHOOK}
      notify_on: failure
      renderer:
        module_name: great_expectations.render.renderer.slack_renderer
        class_name: SlackRenderer
```

```python
# Run checkpoint
import great_expectations as gx

context = gx.get_context()
result = context.run_checkpoint(checkpoint_name="orders_checkpoint")

if not result.success:
    failed_expectations = [
        r for r in result.run_results.values()
        if not r.success
    ]
    raise ValueError(f"Data quality check failed: {failed_expectations}")
```

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
              expression: "email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
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

### Pattern 5: Data Contracts

```yaml
# contracts/orders_contract.yaml
apiVersion: datacontract.com/v1.0.0
kind: DataContract
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
  billing: Charged per query TB scanned

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

```python
# quality_pipeline.py
from dataclasses import dataclass
from typing import List, Dict, Any
import great_expectations as gx
from datetime import datetime

@dataclass
class QualityResult:
    table: str
    passed: bool
    total_expectations: int
    failed_expectations: int
    details: List[Dict[str, Any]]
    timestamp: datetime

class DataQualityPipeline:
    """Orchestrate data quality checks across tables"""

    def __init__(self, context: gx.DataContext):
        self.context = context
        self.results: List[QualityResult] = []

    def validate_table(self, table: str, suite: str) -> QualityResult:
        """Validate a single table against expectation suite"""

        checkpoint_config = {
            "name": f"{table}_validation",
            "config_version": 1.0,
            "class_name": "Checkpoint",
            "validations": [{
                "batch_request": {
                    "datasource_name": "warehouse",
                    "data_asset_name": table,
                },
                "expectation_suite_name": suite,
            }],
        }

        result = self.context.run_checkpoint(**checkpoint_config)

        # Parse results
        validation_result = list(result.run_results.values())[0]
        results = validation_result.results

        failed = [r for r in results if not r.success]

        return QualityResult(
            table=table,
            passed=result.success,
            total_expectations=len(results),
            failed_expectations=len(failed),
            details=[{
                "expectation": r.expectation_config.expectation_type,
                "success": r.success,
                "observed_value": r.result.get("observed_value"),
            } for r in results],
            timestamp=datetime.now()
        )

    def run_all(self, tables: Dict[str, str]) -> Dict[str, QualityResult]:
        """Run validation for all tables"""
        results = {}

        for table, suite in tables.items():
            print(f"Validating {table}...")
            results[table] = self.validate_table(table, suite)

        return results

    def generate_report(self, results: Dict[str, QualityResult]) -> str:
        """Generate quality report"""
        report = ["# Data Quality Report", f"Generated: {datetime.now()}", ""]

        total_passed = sum(1 for r in results.values() if r.passed)
        total_tables = len(results)

        report.append(f"## Summary: {total_passed}/{total_tables} tables passed")
        report.append("")

        for table, result in results.items():
            status = "✅" if result.passed else "❌"
            report.append(f"### {status} {table}")
            report.append(f"- Expectations: {result.total_expectations}")
            report.append(f"- Failed: {result.failed_expectations}")

            if not result.passed:
                report.append("- Failed checks:")
                for detail in result.details:
                    if not detail["success"]:
                        report.append(f"  - {detail['expectation']}: {detail['observed_value']}")
            report.append("")

        return "\n".join(report)

# Usage
context = gx.get_context()
pipeline = DataQualityPipeline(context)

tables_to_validate = {
    "orders": "orders_suite",
    "customers": "customers_suite",
    "products": "products_suite",
}

results = pipeline.run_all(tables_to_validate)
report = pipeline.generate_report(results)

# Fail pipeline if any table failed
if not all(r.passed for r in results.values()):
    print(report)
    raise ValueError("Data quality checks failed!")
```

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
