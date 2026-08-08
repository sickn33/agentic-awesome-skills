---
title: Use Versioning for Blue-Green Deployments
impact: LOW
impactDescription: Safely deploy new code with version tagging
tags: versioning, blue-green, deployment, recovery
---

## Use Versioning for Blue-Green Deployments

DBOS versions workflows to prevent unsafe recovery. Use blue-green deployments to safely upgrade.

**Incorrect (deploying breaking changes without versioning):**

```python
# Deploying new code directly kills in-progress workflows
# because their checkpoints don't match the new code

# Old code
@DBOS.workflow()
def workflow():
    step_a()
    step_b()

# New code replaces old immediately - breaks recovery!
@DBOS.workflow()
def workflow():
    step_a()
    step_c()  # Changed step - old workflows can't recover
```

**Correct (using versioning with blue-green deployment):**

```python
# Set explicit version in config
config: DBOSConfig = {
    "name": "my-app",
    "application_version": "2.0.0",  # New version
}
DBOS(config=config)

# Deploy new version alongside old version
# New traffic goes to v2.0.0, old workflows drain on v1.0.0

# Check for remaining old workflows before retiring v1.0.0
old_workflows = DBOS.list_workflows(
    app_version="1.0.0",
    status=["PENDING", "ENQUEUED"]
)

if len(old_workflows) == 0:
    # Safe to retire old version
    pass
```

Fork a workflow to run on a new version:

```python
# Fork workflow from step 5 on version 2.0.0
new_handle = DBOS.fork_workflow(
    workflow_id="old-workflow-id",
    start_step=5,
    application_version="2.0.0"
)
```

Reference: [Versioning](https://docs.dbos.dev/python/tutorials/upgrading-workflows#versioning)
