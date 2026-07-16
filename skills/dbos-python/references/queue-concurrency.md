---
title: Control Queue Concurrency
impact: HIGH
impactDescription: Prevents resource exhaustion with concurrent limits
tags: queue, concurrency, worker_concurrency, limits
---

## Control Queue Concurrency

Queues support worker-level and global concurrency limits to prevent resource exhaustion.

**Incorrect (no concurrency control):**

```python
queue = Queue("heavy_tasks")  # No limits - could exhaust memory

@DBOS.workflow()
def memory_intensive_task(data):
    # Uses lots of memory
    pass
```

**Correct (worker concurrency):**

```python
# Each process runs at most 5 tasks from this queue
queue = Queue("heavy_tasks", worker_concurrency=5)

@DBOS.workflow()
def memory_intensive_task(data):
    pass
```

**Correct (global concurrency):**

```python
# At most 10 tasks run across ALL processes
queue = Queue("limited_tasks", concurrency=10)
```

**In-order processing (sequential):**

```python
# Only one task at a time - guarantees order
queue = Queue("sequential_queue", concurrency=1)

@DBOS.step()
def process_event(event):
    pass

def handle_event(event):
    queue.enqueue(process_event, event)
```

Worker concurrency is recommended for most use cases. Global concurrency should be used carefully as pending workflows count toward the limit.

Reference: [Managing Concurrency](https://docs.dbos.dev/python/tutorials/queue-tutorial#managing-concurrency)
