---
title: Debounce Workflows to Prevent Wasted Work
impact: MEDIUM
impactDescription: Reduces redundant executions during rapid input
tags: debounce, throttle, input, optimization
---

## Debounce Workflows to Prevent Wasted Work

Debouncing delays workflow execution until some time has passed since the last trigger. Useful for user input processing.

**Incorrect (processing every input):**

```python
@DBOS.workflow()
def process_input(user_input):
    # Expensive processing
    analyze(user_input)

@app.post("/input")
def on_input(user_id: str, input: str):
    # Every keystroke triggers processing!
    DBOS.start_workflow(process_input, input)
```

**Correct (debounced processing):**

```python
from dbos import Debouncer

@DBOS.workflow()
def process_input(user_input):
    analyze(user_input)

# Create a debouncer for the workflow
debouncer = Debouncer.create(process_input)

@app.post("/input")
def on_input(user_id: str, input: str):
    # Wait 5 seconds after last input before processing
    debounce_key = user_id  # Debounce per user
    debounce_period = 5.0   # Seconds
    handle = debouncer.debounce(debounce_key, debounce_period, input)
    return {"workflow_id": handle.get_workflow_id()}
```

Debouncer with timeout (max wait time):

```python
# Process after 5s idle OR 60s max wait
debouncer = Debouncer.create(process_input, debounce_timeout_sec=60)

def on_input(user_id: str, input: str):
    debouncer.debounce(user_id, 5.0, input)
```

When workflow executes, it uses the **last** inputs passed to `debounce`.

Reference: [Debouncing Workflows](https://docs.dbos.dev/python/tutorials/workflow-tutorial#debouncing-workflows)
