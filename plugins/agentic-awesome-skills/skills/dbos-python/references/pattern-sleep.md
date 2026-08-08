---
title: Use Durable Sleep for Delayed Execution
impact: MEDIUM
impactDescription: Survives restarts and can span days or weeks
tags: sleep, delay, schedule, durable
---

## Use Durable Sleep for Delayed Execution

Use `DBOS.sleep()` for durable delays that survive restarts. The wakeup time is persisted in the database.

**Incorrect (regular sleep):**

```python
import time

@DBOS.workflow()
def delayed_task(delay_seconds, task):
    # Regular sleep is lost on restart!
    time.sleep(delay_seconds)
    run_task(task)
```

**Correct (durable sleep):**

```python
@DBOS.workflow()
def delayed_task(delay_seconds, task):
    # Durable sleep - survives restarts
    DBOS.sleep(delay_seconds)
    run_task(task)
```

Use cases for durable sleep:
- Schedule a task for the future
- Wait between retries
- Implement delays spanning hours, days, or weeks

Example: Schedule a reminder:

```python
@DBOS.workflow()
def send_reminder(user_id: str, message: str, delay_days: int):
    # Sleep for days - survives any restart
    DBOS.sleep(delay_days * 24 * 60 * 60)
    send_notification(user_id, message)
```

For async workflows, use `DBOS.sleep_async()`:

```python
@DBOS.workflow()
async def async_delayed_task():
    await DBOS.sleep_async(60)
    await run_async_task()
```

Reference: [Durable Sleep](https://docs.dbos.dev/python/tutorials/workflow-tutorial#durable-sleep)
