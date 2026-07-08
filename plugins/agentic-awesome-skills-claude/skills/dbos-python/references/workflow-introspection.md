---
title: List and Inspect Workflows
impact: MEDIUM
impactDescription: Enables monitoring and management of workflow state
tags: workflow, list, introspection, status, monitoring
---

## List and Inspect Workflows

Use `DBOS.list_workflows()` to query workflows by status, name, queue, or other criteria.

**Incorrect (loading unnecessary data):**

```python
# Loading inputs/outputs when not needed is slow
workflows = DBOS.list_workflows(status="PENDING")
for w in workflows:
    print(w.workflow_id)  # Only using ID
```

**Correct (optimize with load flags):**

```python
# Disable loading inputs/outputs for better performance
workflows = DBOS.list_workflows(
    status="PENDING",
    load_input=False,
    load_output=False
)
for w in workflows:
    print(f"{w.workflow_id}: {w.status}")
```

Common queries:

```python
# Find failed workflows
failed = DBOS.list_workflows(status="ERROR", limit=100)

# Find workflows by name
processing = DBOS.list_workflows(
    name="process_task",
    status=["PENDING", "ENQUEUED"]
)

# Find workflows on a specific queue
queued = DBOS.list_workflows(queue_name="high_priority")

# Only queued workflows (shortcut)
queued = DBOS.list_queued_workflows(queue_name="task_queue")

# Find old version workflows for blue-green deploys
old = DBOS.list_workflows(
    app_version="1.0.0",
    status=["PENDING", "ENQUEUED"]
)

# Get workflow steps
steps = DBOS.list_workflow_steps(workflow_id)
for step in steps:
    print(f"Step {step['function_id']}: {step['function_name']}")
```

WorkflowStatus fields: `workflow_id`, `status`, `name`, `queue_name`, `created_at`, `input`, `output`, `error`

Status values: `ENQUEUED`, `PENDING`, `SUCCESS`, `ERROR`, `CANCELLED`, `MAX_RECOVERY_ATTEMPTS_EXCEEDED`

Reference: [Workflow Management](https://docs.dbos.dev/python/tutorials/workflow-management)
