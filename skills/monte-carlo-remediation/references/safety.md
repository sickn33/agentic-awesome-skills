<!-- Modified by AAS: clarified authorization, evidence and runtime boundaries. -->

# Safety Rails

Detailed safety protocols for the remediation skill. These rules are non-negotiable — they apply in every remediation scenario, regardless of severity or urgency.

## Core principles

1. **Investigate before acting.** Never propose a fix without completing the investigation workflow.
2. **Explain before executing.** Never run a remediation action without telling the user what you're about to do and why.
3. **Confirm before destroying.** Any action that modifies data, restarts a pipeline, or changes configuration requires explicit user confirmation.
4. **One step at a time.** Execute one remediation action, verify it, then decide on the next step.
5. **Document everything.** Record all findings and actions on the alert.
6. **Escalate when uncertain.** A clear "I don't know" is safer than a confident wrong fix.

## Confirmation protocol

### Actions that ALWAYS require confirmation

These actions must not be executed without the user explicitly saying "yes", "go ahead", "proceed", or similar:

- **Pipeline triggers:** Starting DAG runs, triggering dbt jobs, launching pipeline executions
- **Data modifications:** Any SQL that includes INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE
- **Configuration changes:** Modifying pipeline parameters, changing schedules, updating credentials
- **Code changes:** Creating PRs, committing code, merging branches
- **Incident escalation:** Paging on-call via PagerDuty, creating high-severity incidents
- **Alert status changes:** Marking alerts as FIXED, EXPECTED, or NO_ACTION_NEEDED

### Read-only investigation and external writes

Read-only investigation within the user's scope may proceed. Comments, acknowledgement, ownership and progress status are external writes and require applicable user authorization; tool availability is not permission. Sending Slack/email/other notifications requires explicit user instruction, regardless of urgency. Redact sensitive query text and data from any authorized update.

### How to ask for confirmation

Present the action clearly and wait for an explicit response:

> "I'd like to trigger a rerun of the Airflow DAG `etl_orders_daily`. This will:
> - Start a new run of all tasks in the DAG
> - Expected duration: ~45 minutes based on recent runs
> - Risk: minimal — this is a standard rerun, not a backfill
>
> Should I proceed?"

**Do NOT proceed on ambiguous responses.** "Maybe", "I guess", "hmm" are not confirmation. Ask again clearly: "Just to confirm — should I trigger the DAG rerun? (yes/no)"

## Destructive operation handling

### Definition

A "destructive operation" is any action that:
- Deletes or modifies existing data
- Cannot be easily undone
- Affects multiple systems or tables
- Changes infrastructure or configuration

### Required protocol for destructive operations

1. **State the action explicitly:** "I want to execute: `DELETE FROM orders WHERE created_at < '2024-01-01'`"
2. **Explain the impact:** "This will remove approximately 1.2M rows from the `orders` table"
3. **Describe the rollback plan:** "If this causes issues, the data can be restored from the daily backup at s3://backups/orders/2024-01-15/"
4. **Wait for explicit confirmation**
5. **Execute the action**
6. **Immediately verify the result**
7. **Document what was done**

### Actions that are NEVER automated

Even with user confirmation, suggest these be done manually rather than by the agent:

- Dropping tables or databases
- Modifying production credentials or secrets
- Changing IAM roles or permissions
- Directly modifying production infrastructure (scaling, networking)
- Running backfill operations that span more than 7 days of data

For these, provide the exact commands and let the user execute them.

## Escalation criteria

### When to stop and ask the user for direction

Present your findings and ask the user how to proceed when ANY of these conditions are true:

1. **No clear root cause:** TSA failed or returned ambiguous results, and your manual investigation didn't identify a clear cause.

2. **Multiple simultaneous alerts:** More than 3 alerts firing on related tables suggests a systemic issue that needs human judgment.

3. **High blast radius + uncertain fix:** The affected table has >10 downstream consumers AND you're not confident the fix will work.

4. **Data loss detected:** Any sign that data has been permanently deleted or corrupted. Do not attempt to fix data loss — stop and tell the user immediately.

5. **Permission or access issues:** The root cause involves permissions, credentials, or access controls. These require human intervention.

6. **Cross-system failure:** The issue spans multiple systems (e.g., ingestion + transformation + serving) and no single fix addresses it.

7. **Recurring incident:** The same alert has fired 3+ times in the past week. The underlying issue needs a permanent fix, not another band-aid.

8. **Production safety concern:** Any situation where the proposed fix could make things worse, even with a rollback plan.

### How to hand off to the user

1. **Present your findings clearly:** Summarize what you investigated, what you found, and why you're not confident in an automated fix.

2. **Document on the alert:**
   ```
   createOrUpdateAlertComment(
     alert_id="<alert_uuid>",
     comment="## Investigation Summary\n\n**Findings:** [full summary]\n**Why automated remediation was not attempted:** [reason]\n**Recommended next steps:**\n1. [specific step]\n2. [specific step]"
   )
   ```

3. **Set status to WORK_IN_PROGRESS:**
   ```
   updateAlert(alert_id="<alert_uuid>", status="WORK_IN_PROGRESS")
   ```

4. **Ask the user for next steps:** They may want to notify their team, page on-call, investigate further, or take a manual action you can assist with.

## What "uncertain" means in practice

You should consider yourself "uncertain" and ask the user for direction when:

- You can identify multiple plausible root causes and can't narrow it down
- The TSA summary says one thing but your manual investigation suggests something different
- The proposed fix addresses a symptom but not necessarily the root cause
- You've never seen this pattern before in the reference examples
- The fix requires making an assumption about the system that you can't verify
- The user seems uncertain or is asking "are you sure?" — respect their caution

**When in doubt, state your confidence level:**

**Example:**
> "I have provisional evidence that the root cause is [X], based on [evidence]. However, [alternative explanation] is also possible. I'd recommend [safer action] first. If that doesn't resolve it, the data platform team may need to investigate further. How would you like to proceed?"

## Rollback planning

Before executing any remediation action, have a rollback plan:

### For pipeline restarts
- **Rollback:** If the rerun produces bad data, verify whether a recoverable previous good state exists in the warehouse's time travel / versioning feature. Note the timestamp before triggering.

### For dbt reruns
- **Rollback:** dbt models can be rebuilt from source. If a rerun produces bad results, fix the model and rerun again. For incremental models, note the last successful run timestamp.

### For code changes (PRs)
- **Rollback:** Revert the PR. Always create changes as PRs (not direct commits) so they can be cleanly reverted.

### For data modifications
- **Rollback:** Before any data modification, recommend the user:
  1. Create a backup: `CREATE TABLE backup_<table>_<timestamp> AS SELECT * FROM <table>`
  2. Or verify that time travel / snapshots are available for recovery
  3. Document the rollback command alongside the modification

### For configuration changes
- **Rollback:** Document the previous configuration value before changing it. If available, use version-controlled configuration.
