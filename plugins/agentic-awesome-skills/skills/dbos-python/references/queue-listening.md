---
title: Control Which Queues a Worker Listens To
impact: HIGH
impactDescription: Enables heterogeneous worker pools (CPU/GPU)
tags: queue, listen, worker, heterogeneous
---

## Control Which Queues a Worker Listens To

Use `DBOS.listen_queues()` to make a process only handle specific queues. Useful for CPU vs GPU workers.

**Incorrect (all workers handle all queues):**

```python
cpu_queue = Queue("cpu_tasks")
gpu_queue = Queue("gpu_tasks")

# Every worker processes both queues
# GPU tasks may run on CPU-only machines!
if __name__ == "__main__":
    DBOS(config=config)
    DBOS.launch()
```

**Correct (workers listen to specific queues):**

```python
from dbos import DBOS, DBOSConfig, Queue

cpu_queue = Queue("cpu_queue")
gpu_queue = Queue("gpu_queue")

@DBOS.workflow()
def cpu_task(data):
    pass

@DBOS.workflow()
def gpu_task(data):
    pass

if __name__ == "__main__":
    worker_type = os.environ.get("WORKER_TYPE")  # "cpu" or "gpu"
    config: DBOSConfig = {"name": "worker"}
    DBOS(config=config)

    if worker_type == "gpu":
        DBOS.listen_queues([gpu_queue])
    elif worker_type == "cpu":
        DBOS.listen_queues([cpu_queue])

    DBOS.launch()
```

Key points:
- Call `DBOS.listen_queues()` **before** `DBOS.launch()`
- Workers can still **enqueue** to any queue, just won't **dequeue** from others
- By default, workers listen to all declared queues

Use cases:
- CPU vs GPU workers
- Memory-intensive vs lightweight tasks
- Geographic task routing

Reference: [Explicit Queue Listening](https://docs.dbos.dev/python/tutorials/queue-tutorial#explicit-queue-listening)
