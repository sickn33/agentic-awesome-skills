---
name: monte-carlo-monitor-creation
description: "Guides creation of Monte Carlo monitors via MCP tools, producing monitors-as-code YAML for CI/CD deployment."
category: data
risk: safe
source: community
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: "2026-04-08"
author: monte-carlo-data
tags: [data-observability, monitoring, monte-carlo, monitors-as-code]
tools: [claude, cursor, codex]
---

# Monte Carlo Monitor Creation Skill

This skill teaches you to create Monte Carlo monitors correctly via MCP. Every creation tool runs in **dry-run mode** and returns monitors-as-code (MaC) YAML. No monitors are created directly -- the user applies the YAML via the Monte Carlo CLI or CI/CD.

Reference files live next to this skill file. **Use the Read tool** (not MCP resources) to access them:

- Metric monitor details: `references/metric-monitor.md` (relative to this file)
- Validation monitor details: `references/validation-monitor.md` (relative to this file)
- Custom SQL monitor details: `references/custom-sql-monitor.md` (relative to this file)
- Comparison monitor details: `references/comparison-monitor.md` (relative to this file)
- Table monitor details: `references/table-monitor.md` (relative to this file)

## When to activate this skill

Activate when the user:

- Asks to create, add, or set up a monitor (e.g. "add a monitor for...", "create a freshness check on...", "set up validation for...")
- Mentions monitoring a specific table, field, or metric
- Wants to check data quality rules or enforce data contracts
- Asks about monitoring options for a table or dataset
- Requests monitors-as-code YAML generation
- Wants to add monitoring after new transformation logic (when the prevent skill is not active)

## When NOT to activate this skill

Do not activate when the user is:

- Just querying data or exploring table contents
- Triaging or responding to active alerts (use the prevent skill's Workflow 3)
- Running impact assessments before code changes (use the prevent skill's Workflow 4)
- Asking about existing monitor configuration (use `getMonitors` directly)
- Editing or deleting existing monitors

---

## Available MCP tools

All tools are available via the `monte-carlo` MCP server.

| Tool                         | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `testConnection`             | Verify auth and connectivity before starting               |
| `search`                     | Find tables/assets by name; use `include_fields` for columns |
| `getTable`                   | Schema, stats, metadata, domain membership, capabilities   |
| `getValidationPredicates`    | List available validation rule types for a warehouse       |
| `getDomains`                 | List MC domains (only needed if table has no domain info)  |
| `createMetricMonitorMac`     | Generate metric monitor YAML (dry-run)                     |
| `createValidationMonitorMac` | Generate validation monitor YAML (dry-run)                 |
| `createComparisonMonitorMac` | Generate comparison monitor YAML (dry-run)                 |
| `createCustomSqlMonitorMac`  | Generate custom SQL monitor YAML (dry-run)                 |
| `createTableMonitorMac`      | Generate table monitor YAML (dry-run)                      |

---

## Monitor types

| Type           | Tool                         | Use When                                                                                                                                |
| -------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Metric**     | `createMetricMonitorMac`     | Track statistical metrics on fields (null rates, unique counts, numeric stats) or row count changes over time. Requires a timestamp field for aggregation. |
| **Validation** | `createValidationMonitorMac` | Row-level data quality checks with conditions (e.g. "field X is never null", "status is in allowed set"). Alerts on INVALID data.       |
| **Custom SQL** | `createCustomSqlMonitorMac`  | Run arbitrary SQL returning a single number and alert on thresholds. Most flexible; use when other types don't fit.                     |
| **Comparison** | `createComparisonMonitorMac` | Compare metrics between two tables (e.g. dev vs prod, source vs target).                                                               |
| **Table**      | `createTableMonitorMac`      | Monitor groups of tables for freshness, schema changes, and volume. Uses asset selection at database/schema level.                      |

---

## Procedure

Follow these steps in order. Do NOT skip steps.

### Validation Phase (Steps 1-3) -- MUST complete before any creation tool is called

The number one error pattern is agents skipping validation and calling a creation tool with guessed or incomplete parameters. **Every field in the creation call must be grounded in data retrieved during this phase.** Do not proceed to Step 4 until Steps 1-3 are fully satisfied.

#### Step 1: Understand the request

Ask yourself:
- What does the user want to monitor? (a specific table, a metric, a data quality rule, cross-table consistency, freshness/volume at schema level)
- Which monitor type fits? Use the monitor types table above.
- Does the user have all the details, or do they need guidance?

If the user's intent is unclear, ask a focused question before proceeding.

#### Step 2: Identify the table(s) and columns

If you don't have the table MCON:
1. Use `search` with the table name and `include_fields: ["field_names"]` to find the MCON and get column names.
2. If the user provided a full table ID like `database:schema.table`, search for it.
3. Once you have the MCON, call `getTable` with `include_fields: true` and `include_table_capabilities: true` to verify capabilities and get domain info.

If you already have the MCON:
1. Call `getTable` with the MCON, `include_fields: true`, and `include_table_capabilities: true`.

**CRITICAL: You need the actual column names from `getTable` results. NEVER guess or hallucinate column names.** This is the most common source of monitor creation failures.

For monitor types that require a timestamp column (metric monitors), review the column names and identify likely timestamp candidates. Present them to the user if ambiguous.

#### Step 3: Handle domain assignment

Monitors must be assigned to a domain that contains the table being monitored. The `getTable` response includes a `domains` list with `uuid` and `name`.

1. If `domains` is empty: skip domain assignment.
2. If `domains` has exactly one entry: default `domain_id` to that domain's UUID.
3. If `domains` has multiple entries: present only those domains and ask the user to pick.

Do NOT present all account domains as options -- only domains that contain the table are valid.

**ALWAYS check the table's `domains` BEFORE calling any creation tool.**

---

### Creation Phase (Steps 4-8)

Only enter this phase after the validation phase is complete with real data from MCP tools.

#### Step 4: Load the sub-skill reference

Based on the monitor type, read the detailed reference for parameter guidance:

- **Metric** -- Read the detailed reference: `references/metric-monitor.md` (relative to this file)
- **Validation** -- Read the detailed reference: `references/validation-monitor.md` (relative to this file)
- **Custom SQL** -- Read the detailed reference: `references/custom-sql-monitor.md` (relative to this file)
- **Comparison** -- Read the detailed reference: `references/comparison-monitor.md` (relative to this file)
- **Table** -- Read the detailed reference: `references/table-monitor.md` (relative to this file)

#### Step 5: Ask about scheduling

**Skip this step for table monitors.** Table monitors do not support the `schedule` field in MaC YAML — adding it will cause a validation error on `montecarlo monitors apply`. Table monitor scheduling is managed automatically by Monte Carlo.

For all other monitor types, the creation tools default to a fixed schedule running every 60 minutes. Present these options:

1. **Fixed interval** -- any integer for `interval_minutes` (30, 60, 90, 120, 360, 720, 1440, etc.)
2. **Dynamic** -- MC auto-determines when to run based on table update patterns.
3. **Loose** -- runs once per day.

Schedule format in MaC YAML:
- Fixed: `schedule: { type: fixed, interval_minutes: <N> }`
- Dynamic: `schedule: { type: dynamic }`
- Loose: `schedule: { type: loose, start_time: "00:00" }`

#### Step 6: Confirm with the user

Before calling the creation tool, present the monitor configuration in plain language:
- Monitor type
- Target table (and columns if applicable)
- What it checks / what triggers an alert
- Domain assignment
- Schedule

Ask: "Does this look correct? I'll generate the monitor configuration."

**NEVER call the creation tool without user confirmation.**

#### Step 7: Create the monitor

Call the appropriate creation tool with the parameters built in previous steps. Always pass an MCON when possible. If only table name is available, also pass warehouse.

#### Step 8: Present results

**CRITICAL: Always include the YAML in your response.** The user needs copy-pasteable YAML.

1. If a non-default schedule was chosen, modify the schedule section in the YAML before presenting.
2. Wrap the YAML in the full MaC structure (see "MaC YAML format" section below).
3. ALWAYS present the full YAML in a ```yaml code block.
4. Explain where to put it and how to apply it (see below).
5. ALWAYS use ISO 8601 format for datetime values.
6. NEVER reformat YAML values returned by creation tools.

---

## MaC YAML format

The YAML returned by creation tools is the monitor definition. It must be wrapped in the standard MaC structure to be applied:

```yaml
montecarlo:
  <monitor_type>:
    - <returned yaml>
```

For example, a metric monitor would look like:

```yaml
montecarlo:
  metric:
    - <yaml returned by createMetricMonitorMac>
```

**Important:** `montecarlo.yml` (without a directory path) is a separate Monte Carlo project configuration file -- it is NOT the same as a monitor definition file. Monitor definitions go in their own `.yml` files, typically in a `monitors/` directory or alongside dbt model schema files.

Tell the user:
- Save the YAML to a `.yml` file (e.g. `monitors/<table_name>.yml` or in their dbt schema)
- Apply via the Monte Carlo CLI: `montecarlo monitors apply --namespace <namespace>`
- Or integrate into CI/CD for automatic deployment on merge

---

## Common mistakes to avoid

- **NEVER guess column names.** Always get them from `getTable`.
- **NEVER skip the confirmation step** (Step 6).
- For metric monitors, `aggregate_time_field` MUST be a real timestamp column from the table.
- For validation monitors, conditions match INVALID data, not valid data.
- Always pass an MCON when possible. If only table name is available, also pass warehouse.
- **ALWAYS check table's `domains` BEFORE calling any creation tool.**
- ALWAYS use ISO 8601 format for datetime values.
- NEVER reformat YAML values returned by creation tools.
- Do not call creation tools before the validation phase is complete.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
