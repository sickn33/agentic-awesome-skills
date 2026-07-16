---
title: Use Workflow IDs for Idempotency
impact: MEDIUM
impactDescription: Prevents duplicate executions of critical operations
tags: idempotency, workflow-id, deduplication, exactly-once
---

## Use Workflow IDs for Idempotency

Set workflow IDs to make operations idempotent. A workflow with the same ID executes only once.

**Incorrect (duplicate payments possible):**

```python
@app.post("/pay/{order_id}")
def process_payment(order_id: str):
    # Multiple clicks = multiple payments!
    handle = DBOS.start_workflow(payment_workflow, order_id)
    return handle.get_result()
```

**Correct (idempotent with workflow ID):**

```python
from dbos import SetWorkflowID

@app.post("/pay/{order_id}")
def process_payment(order_id: str):
    # Same order_id = same workflow ID = only one execution
    with SetWorkflowID(f"payment-{order_id}"):
        handle = DBOS.start_workflow(payment_workflow, order_id)
    return handle.get_result()

@DBOS.workflow()
def payment_workflow(order_id: str):
    charge_customer(order_id)
    send_confirmation(order_id)
    return "success"
```

Access the workflow ID inside workflows:

```python
@DBOS.workflow()
def my_workflow():
    current_id = DBOS.workflow_id
    DBOS.logger.info(f"Running workflow {current_id}")
```

Workflow IDs must be globally unique. Duplicate IDs return the existing workflow's result without re-executing.

Reference: [Workflow IDs and Idempotency](https://docs.dbos.dev/python/tutorials/workflow-tutorial#workflow-ids-and-idempotency)
