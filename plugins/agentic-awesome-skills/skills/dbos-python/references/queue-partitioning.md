---
title: Partition Queues for Per-Entity Limits
impact: HIGH
impactDescription: Enables per-user or per-entity flow control
tags: queue, partition, per-user, flow-control
---

## Partition Queues for Per-Entity Limits

Partitioned queues apply flow control limits per partition, not globally. Useful for per-user or per-entity concurrency limits.

**Incorrect (global limit affects all users):**

```python
queue = Queue("user_tasks", concurrency=1)  # Only 1 task total

def handle_user_task(user_id, task):
    # One user blocks all other users!
    queue.enqueue(process_task, task)
```

**Correct (per-user limits with partitioning):**

```python
from dbos import Queue, SetEnqueueOptions

# Partition queue with concurrency=1 per partition
queue = Queue("user_tasks", partition_queue=True, concurrency=1)

@DBOS.workflow()
def process_task(task):
    pass

def handle_user_task(user_id: str, task):
    # Each user gets their own "subqueue" with concurrency=1
    with SetEnqueueOptions(queue_partition_key=user_id):
        queue.enqueue(process_task, task)
```

For both per-partition AND global limits, use two-level queueing:

```python
# Global limit of 5 concurrent tasks
global_queue = Queue("global_queue", concurrency=5)
# Per-user limit of 1 concurrent task
user_queue = Queue("user_queue", partition_queue=True, concurrency=1)

def handle_task(user_id: str, task):
    with SetEnqueueOptions(queue_partition_key=user_id):
        user_queue.enqueue(concurrency_manager, task)

@DBOS.workflow()
def concurrency_manager(task):
    # Enforces global limit
    return global_queue.enqueue(process_task, task).get_result()

@DBOS.workflow()
def process_task(task):
    pass
```

Reference: [Partitioning Queues](https://docs.dbos.dev/python/tutorials/queue-tutorial#partitioning-queues)
