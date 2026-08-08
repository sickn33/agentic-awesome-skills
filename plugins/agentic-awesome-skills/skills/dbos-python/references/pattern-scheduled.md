---
title: Create Scheduled Workflows
impact: MEDIUM
impactDescription: Run workflows exactly once per time interval
tags: scheduled, cron, recurring, timer
---

## Create Scheduled Workflows

Use `@DBOS.scheduled` to run workflows on a schedule. Workflows run exactly once per interval.

**Incorrect (manual scheduling):**

```python
# Don't use external cron or manual timers
import schedule
schedule.every(1).minute.do(my_task)
```

**Correct (DBOS scheduled workflow):**

```python
@DBOS.scheduled("* * * * *")  # Every minute
@DBOS.workflow()
def run_every_minute(scheduled_time, actual_time):
    print(f"Running at {scheduled_time}")
    do_maintenance_task()

@DBOS.scheduled("0 */6 * * *")  # Every 6 hours
@DBOS.workflow()
def periodic_cleanup(scheduled_time, actual_time):
    cleanup_old_records()
```

Scheduled workflow requirements:
- Must have `@DBOS.scheduled` decorator with crontab syntax
- Must accept two arguments: `scheduled_time` and `actual_time` (both `datetime`)
- Main thread must stay alive for scheduled workflows

For apps with only scheduled workflows (no HTTP server):

```python
import threading

if __name__ == "__main__":
    DBOS.launch()
    threading.Event().wait()  # Block forever
```

Crontab format: `minute hour day month weekday`
- `* * * * *` = every minute
- `0 * * * *` = every hour
- `0 0 * * *` = daily at midnight
- `0 0 * * 0` = weekly on Sunday

Reference: [Scheduled Workflows](https://docs.dbos.dev/python/tutorials/scheduled-workflows)
