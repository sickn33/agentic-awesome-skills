# Validation Monitor Reference

Detailed reference for building `createValidationMonitorMac` tool calls.

## When to Use

Use a validation monitor when the user wants to:

- Check that specific fields are never null
- Validate that values are within an allowed set (e.g., status in 'active', 'pending', 'inactive')
- Enforce referential integrity (field values exist in another table)
- Apply row-level business rules (e.g., "amount must be positive")
- Combine multiple conditions with AND/OR logic

---

## Getting the Logic Right: Conditions Match INVALID Data

This is the single most confusing aspect of validation monitors and the number one source of mistakes. **Conditions describe what INVALID data looks like -- the data you want to be alerted about.** They do NOT describe what valid data looks like.

Think of it this way: the monitor scans rows and fires an alert when it finds rows matching the condition. So the condition must match the BAD rows.

| User wants | Condition should match | Common mistake |
|------------|----------------------|----------------|
| "id should never be null" | id IS NULL (alert when null found) | id IS NOT NULL (would alert on every valid row) |
| "status must be in [active, pending]" | status NOT IN [active, pending] (alert on unexpected values) | status IN [active, pending] (would alert on valid rows) |
| "amount must be positive" | amount IS NEGATIVE (alert on bad values) | amount > 0 (would alert on valid rows) |
| "email must not be empty" | email IS NULL **OR** email = '' (alert on missing) | email IS NOT NULL (would alert on valid rows) |

**Before building any condition, ask yourself: "If a row matches this condition, is the row INVALID?" If the answer is no, the logic is backwards.**

---

## Pre-Step: Verify Field Existence

Before constructing the `alert_condition`, verify that every field name you plan to reference exists in the table's column list. This is the number two source of validation monitor failures -- referencing columns that do not exist or are misspelled.

1. You should already have the column list from `getTable` with `include_fields: true` (done in Step 2 of the main skill).
2. For every field name in your planned conditions, confirm it appears in the column list exactly as spelled (field names are case-sensitive on most warehouses).
3. If a field does not exist, stop and ask the user to clarify the correct column name. Do not guess.

---

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Unique identifier for the monitor. Use a descriptive slug (e.g., `orders_not_null_check`). |
| `description` | string | Human-readable description of what the monitor checks. |
| `table` | string | Table MCON (preferred) or `database:schema.table` format. If not MCON, also pass `warehouse`. |
| `alert_condition` | object | Condition tree defining when to alert (see Alert Condition Structure below). |

## Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `warehouse` | string | Warehouse name or UUID. Required if `table` is not an MCON. |
| `domain_id` | string (uuid) | Domain UUID (use `getDomains` to list). |

---

## Alert Condition Structure

The top level of `alert_condition` must always be a GROUP node. This GROUP contains one or more conditions combined with AND or OR logic.

```json
{
  "type": "GROUP",
  "operator": "AND",
  "conditions": [...]
}
```

### Condition Types

There are four condition types: UNARY, BINARY, SQL, and GROUP.

#### UNARY (single-value checks)

Used for predicates that operate on a single field with no comparison value.

```json
{
  "type": "UNARY",
  "predicate": {"name": "null", "negated": false},
  "value": [{"type": "FIELD", "field": "column_name"}]
}
```

- `predicate.name` -- the predicate to apply (see Predicates Reference below).
- `predicate.negated` -- set to `true` to invert the predicate (e.g., `null` with `negated: true` means "is NOT null").
- `value` -- an array with a single value descriptor (usually a FIELD reference).

#### BINARY (comparison checks)

Used for predicates that compare a field against a value.

```json
{
  "type": "BINARY",
  "predicate": {"name": "greater_than", "negated": false},
  "left": [{"type": "FIELD", "field": "column_name"}],
  "right": [{"type": "LITERAL", "literal": "0"}]
}
```

- `left` -- the left-hand side of the comparison (typically a FIELD reference).
- `right` -- the right-hand side (typically a LITERAL value, SQL expression, or FIELD reference).
- Both `left` and `right` are arrays of value descriptors.

#### SQL (custom SQL expression)

Used for complex conditions that are difficult to express with UNARY/BINARY nodes. The SQL expression should evaluate to true for INVALID rows.

```json
{
  "type": "SQL",
  "sql": "amount > 0 AND amount < 1000000"
}
```

#### GROUP (nested conditions)

Used to combine multiple conditions with AND or OR logic. Groups can be nested.

```json
{
  "type": "GROUP",
  "operator": "OR",
  "conditions": [
    {"type": "UNARY", "...": "..."},
    {"type": "BINARY", "...": "..."}
  ]
}
```

---

## Value Types

Value descriptors appear in the `value`, `left`, and `right` arrays of UNARY and BINARY conditions.

| Type | Field | Description | Example |
|------|-------|-------------|---------|
| `FIELD` | `"field": "column_name"` | References a column in the table. | `{"type": "FIELD", "field": "user_id"}` |
| `LITERAL` | `"literal": "value"` | A static value (always a string, even for numbers). | `{"type": "LITERAL", "literal": "100"}` |
| `SQL` | `"sql": "SELECT ..."` | A SQL expression or subquery. | `{"type": "SQL", "sql": "SELECT MAX(id) FROM ref_table"}` |

---

## Predicates Reference

Before building conditions, call `getValidationPredicates` to get the full list of supported predicates for the connected warehouse. The list below covers common predicates but may not be exhaustive.

### Unary Predicates

These predicates take no comparison value -- they check a property of the field itself.

| Predicate | Description | Example use |
|-----------|-------------|-------------|
| `null` | Field value is null. | Alert on null ids. |
| `is_negative` | Field value is negative. | Alert on negative amounts. |
| `is_between_0_and_1` | Field value is between 0 and 1 (inclusive). | Alert on rates that should be percentages (0-100). |
| `is_future_date` | Field value is a date/timestamp in the future. | Alert on future-dated records. |
| `is_uuid` | Field value matches UUID format. | Alert on non-UUID values in a UUID field (use with `negated: true`). |

### Binary Predicates

These predicates compare a field against a value.

| Predicate | Right-hand side | Description | Example use |
|-----------|----------------|-------------|-------------|
| `equal` | Single LITERAL | Field equals the given value. | Alert when `status` equals `'deleted'`. |
| `greater_than` | Single LITERAL | Field is greater than the given value. | Alert when `discount_pct` exceeds 100. |
| `less_than` | Single LITERAL | Field is less than the given value. | Alert when `quantity` is below 0. |
| `in_set` | Multiple LITERALs | Field value is in the given set. | Alert when `status` is in an invalid set (see example below). |
| `contains` | Single LITERAL | Field value contains the given substring. | Alert when `email` contains `'test@'`. |
| `starts_with` | Single LITERAL | Field value starts with the given prefix. | Alert when `phone` starts with `'000'`. |
| `between` | Two LITERALs | Field value is between the two given values (inclusive). | Alert when `score` is between 0 and 10 (if that range is invalid). |

### Using `negated` to Invert Predicates

Any predicate can be inverted by setting `"negated": true` in the predicate object. This is essential for "must be in set" validations:

- **"status must be in [active, pending]"** becomes `in_set` with values `["active", "pending"]` and `negated: true` -- meaning "alert when status is NOT in [active, pending]".
- **"id must not be null"** becomes `null` with `negated: false` -- meaning "alert when id IS null" (no inversion needed since the condition already matches invalid data).

---

## Examples

### Alert when id is null

Verify that `id` exists in the table schema from `getTable` before proceeding.

```json
{
  "name": "orders_id_not_null",
  "description": "Alert when order id is null",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "alert_condition": {
    "type": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "type": "UNARY",
        "predicate": {"name": "null", "negated": false},
        "value": [{"type": "FIELD", "field": "id"}]
      }
    ]
  }
}
```

The condition matches rows where `id` IS NULL -- these are the invalid rows we want to be alerted about.

### Alert when status is not in allowed set

Verify that `status` exists in the table schema from `getTable` before proceeding.

```json
{
  "name": "orders_status_allowed_values",
  "description": "Alert when order status is outside the allowed set",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "alert_condition": {
    "type": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "type": "BINARY",
        "predicate": {"name": "in_set", "negated": true},
        "left": [{"type": "FIELD", "field": "status"}],
        "right": [
          {"type": "LITERAL", "literal": "active"},
          {"type": "LITERAL", "literal": "pending"},
          {"type": "LITERAL", "literal": "inactive"}
        ]
      }
    ]
  }
}
```

Note `negated: true` -- the predicate is `in_set`, but we want to alert when the value is NOT in the set. This catches any unexpected status values.

### Alert when amount is negative

Verify that `amount` exists in the table schema from `getTable` before proceeding.

```json
{
  "name": "orders_positive_amount",
  "description": "Alert when order amount is negative",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "alert_condition": {
    "type": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "type": "UNARY",
        "predicate": {"name": "is_negative", "negated": false},
        "value": [{"type": "FIELD", "field": "amount"}]
      }
    ]
  }
}
```

The condition matches rows where `amount` is negative -- these are the invalid rows.

### Combined conditions: null OR negative

Verify that both `amount` and `quantity` exist in the table schema from `getTable` before proceeding.

```json
{
  "name": "orders_amount_quality",
  "description": "Alert when amount is null or quantity is negative",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "alert_condition": {
    "type": "GROUP",
    "operator": "OR",
    "conditions": [
      {
        "type": "UNARY",
        "predicate": {"name": "null", "negated": false},
        "value": [{"type": "FIELD", "field": "amount"}]
      },
      {
        "type": "UNARY",
        "predicate": {"name": "is_negative", "negated": false},
        "value": [{"type": "FIELD", "field": "quantity"}]
      }
    ]
  }
}
```

The OR operator means an alert fires if either condition matches -- the row has a null amount OR a negative quantity.

### Between check with nested AND/OR

Verify that `score` and `status` exist in the table schema from `getTable` before proceeding.

```json
{
  "name": "records_score_validation",
  "description": "Alert when score is outside 0-100 range for active records",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++warehouse:metrics.records",
  "alert_condition": {
    "type": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "type": "BINARY",
        "predicate": {"name": "equal", "negated": false},
        "left": [{"type": "FIELD", "field": "status"}],
        "right": [{"type": "LITERAL", "literal": "active"}]
      },
      {
        "type": "BINARY",
        "predicate": {"name": "between", "negated": true},
        "left": [{"type": "FIELD", "field": "score"}],
        "right": [
          {"type": "LITERAL", "literal": "0"},
          {"type": "LITERAL", "literal": "100"}
        ]
      }
    ]
  }
}
```

This uses `between` with `negated: true` to alert when score is outside the 0-100 range, but only for active records (the AND operator requires both conditions to match).

### Referential integrity with SQL subquery

Verify that `customer_id` exists in the table schema from `getTable` before proceeding.

```json
{
  "name": "orders_valid_customer",
  "description": "Alert when customer_id does not exist in customers table",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "alert_condition": {
    "type": "GROUP",
    "operator": "AND",
    "conditions": [
      {
        "type": "SQL",
        "sql": "customer_id IS NOT NULL AND customer_id NOT IN (SELECT id FROM analytics.core.customers)"
      }
    ]
  }
}
```

The SQL condition type is useful for referential integrity checks that require subqueries. The `customer_id IS NOT NULL` guard avoids alerting on null values (which should be caught by a separate null check if needed).

### Contains and starts_with checks

Verify that `email` and `phone` exist in the table schema from `getTable` before proceeding.

```json
{
  "name": "contacts_format_validation",
  "description": "Alert when email contains test data or phone has invalid prefix",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++warehouse:crm.contacts",
  "alert_condition": {
    "type": "GROUP",
    "operator": "OR",
    "conditions": [
      {
        "type": "BINARY",
        "predicate": {"name": "contains", "negated": false},
        "left": [{"type": "FIELD", "field": "email"}],
        "right": [{"type": "LITERAL", "literal": "@test.example.com"}]
      },
      {
        "type": "BINARY",
        "predicate": {"name": "starts_with", "negated": false},
        "left": [{"type": "FIELD", "field": "phone"}],
        "right": [{"type": "LITERAL", "literal": "000"}]
      }
    ]
  }
}
```

---

## Fallback: Custom SQL Monitor

If `createValidationMonitorMac` fails -- for example because a referenced column does not exist yet in the live table, or the warehouse does not support a particular predicate -- fall back to `createCustomSqlMonitorMac` with an explicit SQL query instead.

A custom SQL monitor lets you express any validation logic as a SQL query that returns rows or a count. This is always available as a backup when the structured validation condition tree cannot express what you need or encounters an API error.

When falling back:

1. Translate the intended validation logic into a SQL query.
2. The SQL should select rows that violate the rule (matching the same "conditions match INVALID data" principle).
3. Use `createCustomSqlMonitorMac` with the translated query.
4. Inform the user that you used a custom SQL monitor as a fallback and explain why.
