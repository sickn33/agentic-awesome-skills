<!-- Modified by AAS: clarified authorization, evidence and runtime boundaries. -->

# Remediation Patterns

Common data quality issue patterns with example remediation workflows. These are illustrative examples for reasoning — not rigid step-by-step procedures. Real incidents often combine multiple patterns or present unique variations. Use these as a starting point, then adapt based on the specific TSA findings and available tools.

---

External comments/status updates require authorization under the parent safety boundary. Validate proposed SQL and diagnose independently of TSA; reruns/backfills require idempotency, exact range and recovery evidence.

## Pattern 1: Stale data (freshness alert)

### Root cause signals (from TSA)

- "Pipeline has not run since..."
- "DAG/job failed at [timestamp]"
- "No new rows since [timestamp]"
- "Upstream table also stale" (cascading staleness)

### Reasoning

Stale data usually means the pipeline that feeds this table has either failed or not run. The first step is identifying which pipeline is responsible, then determining why it stopped.

### Investigation steps

1. Check upstream lineage — is the source table also stale?
   ```
   getAssetLineage(mcons=["<table_mcon>"], direction="UPSTREAM")
   getTable(mcon="<upstream_mcon>")  # check freshness
   ```

2. Check recent write queries — what pipeline usually updates this table?
   ```
   getQueriesForTable(mcon="<table_mcon>", query_type="destination", limit=5)
   ```

3. If upstream is also stale, trace further upstream to find the true root cause.

### Remediation by available tools

**If pipeline orchestrator is available (Airflow, Dagster, Prefect):**
- Identify the DAG/pipeline responsible for updating the table
- Check if the last run failed or was delayed
- Trigger a new run or retry the failed task
- Example: "The DAG `etl_orders_daily` last ran 26 hours ago and failed on task `load_orders`. I'll retry that specific task."

**If dbt Cloud is available:**
- Identify the dbt job that builds this model
- Check the last run status
- Trigger a new run
- Example: "The dbt job 'Daily Transform' failed 18 hours ago with a compilation error. After reviewing the error, I'll trigger a rerun."

**If no execution tool is available:**
- Document which pipeline is responsible (from query analysis)
- Provide the manual commands: `airflow dags trigger <dag_id>` or `dbt run --select <model>`
- Present the diagnosis and recommended fix to the user and ask for next steps
- Comment on the alert with the diagnosis and recommended fix

### Verification

After triggering the pipeline:
- Wait for the job to complete (check status via the orchestrator MCP)
- Re-check table freshness: `getTable(mcon="<table_mcon>")` — has `last_updated_on` moved forward?
- Re-check the alert: `getAlerts(alert_ids=["<alert_id>"])` — has it resolved?

---

## Pattern 2: dbt model failure

### Root cause signals (from TSA)

- "dbt run failed with error..."
- "Compilation error in model..."
- "Database error during model execution"
- "Dependency failed — upstream model did not complete"

### Reasoning

dbt failures can be compilation errors (code issues), database errors (permissions, resource limits), or dependency failures (upstream model failed first). The fix depends on the error type.

### Investigation steps

1. Read the TSA `full_response` carefully — it often contains the actual dbt error message.

2. Check if the issue is the table itself or an upstream dependency:
   ```
   getAssetLineage(mcons=["<table_mcon>"], direction="UPSTREAM")
   ```

3. If upstream models also have alerts, the root cause is likely further upstream — remediate that first.

### Remediation by available tools

**If dbt Cloud is available:**
- For compilation errors: the error likely needs a code fix → create a GitHub PR if GitHub MCP is available, otherwise describe the fix for the user
- For transient database errors: rerun the job
- For dependency failures: find and fix the upstream failure first, then rerun

**If GitHub is available (for code fixes):**
- Create a branch with the fix
- Open a PR with clear description of what failed and why
- Example: "The model `stg_orders` fails because column `order_status` was renamed to `status` upstream. Creating a PR to update the column reference."

**If no execution tool is available:**
- Describe the error and the fix needed
- Provide the `dbt run --select <model>` command for manual execution
- If it's a code issue, describe exactly what file and line needs changing

### Verification

- Check dbt job status via dbt Cloud MCP (if available)
- Re-check table: `getTable(mcon="<table_mcon>")` — has the model been rebuilt?
- Verify downstream tables are also refreshing

---

## Pattern 3: Schema change

### Root cause signals (from TSA)

- "Column added/removed/renamed"
- "Column type changed"
- "Schema differs from expected"

### Reasoning

Schema changes can be intentional (upstream team made a planned change) or accidental (a deployment error). The remediation depends on whether the change is expected and whether downstream consumers can handle it.

### Investigation steps

1. Identify what changed:
   ```
   getTable(mcon="<table_mcon>", include_fields=true)
   ```

2. Check blast radius — who consumes this table?
   ```
   getAssetLineage(mcons=["<table_mcon>"], direction="DOWNSTREAM")
   ```

3. Check if downstream tables are also alerting:
   ```
   getAlerts(
     table_mcons=["<downstream_mcon_1>", "<downstream_mcon_2>"],
     created_after="<24 hours ago>"
   )
   ```

4. Check recent queries to identify who/what made the schema change:
   ```
   getQueriesForTable(mcon="<table_mcon>", query_type="destination", limit=10)
   ```

### Remediation by available tools

**If the change is intentional and downstream needs updating:**
- If GitHub is available: create a PR that updates downstream models to handle the new schema
- If dbt Cloud is available: after fixing the code, trigger a full rebuild of affected models
- Example: "Column `user_id` was renamed to `customer_id` in `raw_orders`. 4 downstream models reference this column. Creating a PR to update all references."

**If the change is accidental and should be reverted:**
- If GitHub is available: create a PR reverting the upstream change
- If the change was a direct DDL (not code-managed): provide the ALTER statement to revert
- Present findings to the user and recommend they contact the upstream table owner

**If no execution tool is available:**
- Document all affected downstream tables and the specific column changes
- List the files/models that need updating
- Escalate with a complete impact report

### Verification

- Re-check table schema: `getTable(mcon="<table_mcon>", include_fields=true)`
- Verify downstream models are rebuilding successfully
- Check that schema change alerts resolve

---

## Pattern 4: Volume anomaly

### Root cause signals (from TSA)

- "Row count dropped by X%"
- "Row count significantly higher than expected"
- "No new rows in expected time window"
- "Duplicate rows detected"

### Reasoning

Volume anomalies can indicate: data loss (rows missing), data duplication (rows doubled), source system issues (upstream stopped sending data), or filter/logic changes (a WHERE clause changed). The investigation must determine which case applies.

### Investigation steps

1. Quantify the anomaly:
   ```
   getTable(mcon="<table_mcon>")  # current row count
   ```

2. Check if the issue is in this table or upstream:
   ```
   getAssetLineage(mcons=["<table_mcon>"], direction="UPSTREAM")
   getTable(mcon="<upstream_mcon>")  # check upstream row counts
   ```

3. Analyze recent write queries for clues:
   ```
   getQueriesForTable(mcon="<table_mcon>", query_type="destination", limit=10)
   ```
   Look for: unusual DELETE statements, changed WHERE clauses, failed INSERT operations.

4. Check monitoring for more context:
   ```
   getMonitors(mcons=["<table_mcon>"])
   ```

### Remediation by available tools

**For missing data (row count drop):**
- If pipeline orchestrator is available: trigger a backfill for the affected time range
- If the drop is from a bad deployment: revert via GitHub, then rerun the pipeline
- If upstream source stopped: present findings to the user and recommend they contact the source system owner

**For duplicate data:**
- If warehouse access is available: run a deduplication query (with user confirmation!)
- Create a PR to fix the pipeline logic that caused duplication
- Trigger a rebuild after the fix

**For unexpected volume increase:**
- Investigate whether this is a genuine increase or a data quality issue
- Check if upstream sources are sending more data than expected
- If it's a filter/logic change: review recent code changes

**If no execution tool is available:**
- Quantify the anomaly (expected vs actual row counts, affected time range)
- Identify the likely cause from query analysis
- Provide specific remediation steps for the user to execute manually

### Verification

- Re-check row counts: `getTable(mcon="<table_mcon>")`
- Compare against expected values
- Monitor over the next few pipeline runs to confirm stability

---

## Pattern 5: Unknown or complex root cause

### Root cause signals (from TSA)

- TSA returned `failed` status
- TSA `tldr` is unclear or generic ("multiple issues detected")
- Root cause spans multiple systems or teams
- The issue is intermittent and hard to reproduce

### Reasoning

Not every issue has a clear, automatable fix. When the root cause is unclear or complex, the best approach is to present full context to the user and ask for direction — not guess at a fix.

### Context package

Compile a complete summary for the user:

1. **Alert details:** type, severity, when it fired, affected tables
2. **TSA findings:** whatever root cause analysis was available (even if partial)
3. **Blast radius:** downstream consumers, key assets affected
4. **Table state:** current freshness, row counts, schema
5. **Recent queries:** pipeline activity, any anomalous patterns
6. **Monitoring coverage:** what monitors exist, any gaps
7. **Your assessment:** what you think might be wrong and why, with confidence level

### What to do

Present the context package to the user and ask how they'd like to proceed. They may want to:
- Notify their team via Slack or PagerDuty
- Investigate further with specific queries
- Assign the alert to a specific person
- Take a manual remediation action you can help with

**Draft the following; write only when authorized for this alert:**
```
createOrUpdateAlertComment(
  alert_id="<alert_uuid>",
  comment="## Investigation Summary\n\n[full context package]\n\n**Why automated remediation was not attempted:** [reason]\n**Recommended next steps:** [specific actions]"
)

updateAlert(
  alert_id="<alert_uuid>",
  status="WORK_IN_PROGRESS"
)
```

### When to use this pattern

- TSA failed or returned unclear results
- Root cause spans multiple systems (e.g., infrastructure + pipeline + data)
- The fix requires access or permissions you don't have
- You're not confident the proposed fix won't cause additional problems
- The issue is intermittent and the current state looks normal
- Multiple alerts are firing simultaneously on related tables (likely a systemic issue)
