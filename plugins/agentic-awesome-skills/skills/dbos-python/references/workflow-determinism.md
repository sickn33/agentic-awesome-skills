---
title: Keep Workflows Deterministic
impact: CRITICAL
impactDescription: Non-deterministic workflows cannot recover correctly
tags: workflow, determinism, recovery, reliability
---

## Keep Workflows Deterministic

Workflow functions must be deterministic: given the same inputs and step return values, they must invoke the same steps in the same order. Non-deterministic operations must be moved to steps.

**Incorrect (non-deterministic workflow):**

```python
import random

@DBOS.workflow()
def example_workflow():
    # Random number in workflow breaks recovery!
    choice = random.randint(0, 1)
    if choice == 0:
        step_one()
    else:
        step_two()
```

**Correct (non-determinism in step):**

```python
import random

@DBOS.step()
def generate_choice():
    return random.randint(0, 1)

@DBOS.workflow()
def example_workflow():
    # Random number generated in step - result is saved
    choice = generate_choice()
    if choice == 0:
        step_one()
    else:
        step_two()
```

Non-deterministic operations that must be in steps:
- Random number generation
- Getting current time
- Accessing external APIs
- Reading files
- Database queries (use transactions or steps)

Reference: [Workflow Determinism](https://docs.dbos.dev/python/tutorials/workflow-tutorial#determinism)
