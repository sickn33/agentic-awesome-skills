---
name: dbos-python
description: "Guide for building reliable, fault-tolerant Python applications with DBOS durable workflows. Use when adding DBOS to existing Python code, creating workflows and steps, or using queues for concurrency control."
risk: safe
source: "https://docs.dbos.dev/"
date_added: "2026-02-27"
---

# DBOS Python Best Practices

Guide for building reliable, fault-tolerant Python applications with DBOS durable workflows.

## When to Use
Reference these guidelines when:
- Adding DBOS to existing Python code
- Creating workflows and steps
- Using queues for concurrency control
- Implementing workflow communication (events, messages, streams)
- Configuring and launching DBOS applications
- Using DBOSClient from external applications
- Testing DBOS applications

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Lifecycle | CRITICAL | `lifecycle-` |
| 2 | Workflow | CRITICAL | `workflow-` |
| 3 | Step | HIGH | `step-` |
| 4 | Queue | HIGH | `queue-` |
| 5 | Communication | MEDIUM | `comm-` |
| 6 | Pattern | MEDIUM | `pattern-` |
| 7 | Testing | LOW-MEDIUM | `test-` |
| 8 | Client | MEDIUM | `client-` |
| 9 | Advanced | LOW | `advanced-` |

## Critical Rules

### DBOS Configuration and Launch

A DBOS application MUST configure and launch DBOS inside its main function:

```python
import os
from dbos import DBOS, DBOSConfig

@DBOS.workflow()
def my_workflow():
    pass

if __name__ == "__main__":
    config: DBOSConfig = {
        "name": "my-app",
        "system_database_url": os.environ.get("DBOS_SYSTEM_DATABASE_URL"),
    }
    DBOS(config=config)
    DBOS.launch()
```

### Workflow and Step Structure

Workflows are comprised of steps. Any function performing complex operations or accessing external services must be a step:

```python
@DBOS.step()
def call_external_api():
    return requests.get("https://api.example.com").json()

@DBOS.workflow()
def my_workflow():
    result = call_external_api()
    return result
```

### Key Constraints

- Do NOT call `DBOS.start_workflow` or `DBOS.recv` from a step
- Do NOT use threads to start workflows - use `DBOS.start_workflow` or queues
- Workflows MUST be deterministic - non-deterministic operations go in steps
- Do NOT create/update global variables from workflows or steps

## How to Use

Read individual rule files for detailed explanations and examples:

```
references/lifecycle-config.md
references/workflow-determinism.md
references/queue-concurrency.md
```

## References

- https://docs.dbos.dev/
- https://github.com/dbos-inc/dbos-transact-py

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
