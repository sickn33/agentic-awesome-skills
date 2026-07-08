---
title: Use Messages for Workflow Notifications
impact: MEDIUM
impactDescription: Enables external signals to control workflow execution
tags: messages, send, recv, notifications
---

## Use Messages for Workflow Notifications

Send messages to workflows to signal or notify them while running. Messages are persisted and queued per topic.

**Incorrect (polling external state):**

```python
@DBOS.workflow()
def payment_workflow():
    # Polling is inefficient and not durable
    while True:
        status = check_payment_status()
        if status == "paid":
            break
        time.sleep(1)
```

**Correct (using messages):**

```python
PAYMENT_STATUS = "payment_status"

@DBOS.workflow()
def payment_workflow():
    # Process order...
    DBOS.set_event("payment_id", payment_id)

    # Wait for payment notification (60 second timeout)
    payment_status = DBOS.recv(PAYMENT_STATUS, timeout_seconds=60)

    if payment_status == "paid":
        fulfill_order()
    else:
        cancel_order()

# Webhook endpoint to receive payment notification
@app.post("/payment_webhook/{workflow_id}/{status}")
def payment_webhook(workflow_id: str, status: str):
    DBOS.send(workflow_id, status, PAYMENT_STATUS)
    return {"ok": True}
```

Key points:
- `DBOS.recv()` can only be called from workflows
- Messages are queued per topic
- `recv()` returns `None` on timeout
- Messages are persisted for exactly-once delivery

Reference: [Workflow Messaging](https://docs.dbos.dev/python/tutorials/workflow-communication#workflow-messaging-and-notifications)
