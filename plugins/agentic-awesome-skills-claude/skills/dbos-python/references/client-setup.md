---
title: Initialize DBOSClient for External Access
impact: HIGH
impactDescription: Enables external applications to interact with DBOS
tags: client, setup, initialization, external
---

## Initialize DBOSClient for External Access

Use `DBOSClient` to interact with DBOS from external applications (API servers, CLI tools, etc.).

**Incorrect (no cleanup):**

```python
from dbos import DBOSClient

client = DBOSClient(system_database_url=db_url)
handle = client.enqueue(options, data)
# Connection leaked - no destroy()!
```

**Correct (with cleanup):**

```python
import os
from dbos import DBOSClient

client = DBOSClient(
    system_database_url=os.environ["DBOS_SYSTEM_DATABASE_URL"]
)

try:
    handle = client.enqueue(options, data)
    result = handle.get_result()
finally:
    client.destroy()
```

Constructor parameters:
- `system_database_url`: Connection string to DBOS system database
- `serializer`: Must match the DBOS application's serializer (default: pickle)

## API Reference

Beyond `enqueue`, DBOSClient mirrors the DBOS API. Use the same patterns from other reference files:

| DBOSClient method | Same as DBOS method |
|-------------------|---------------------|
| `client.send()` | `DBOS.send()` - add `idempotency_key` for exactly-once |
| `client.get_event()` | `DBOS.get_event()` |
| `client.read_stream()` | `DBOS.read_stream()` |
| `client.list_workflows()` | `DBOS.list_workflows()` |
| `client.cancel_workflow()` | `DBOS.cancel_workflow()` |
| `client.resume_workflow()` | `DBOS.resume_workflow()` |
| `client.retrieve_workflow()` | `DBOS.retrieve_workflow()` |

Reference: [DBOSClient](https://docs.dbos.dev/python/reference/client)
