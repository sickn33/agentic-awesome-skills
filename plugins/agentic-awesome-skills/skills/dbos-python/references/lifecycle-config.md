---
title: Configure and Launch DBOS Properly
impact: CRITICAL
impactDescription: Application won't function without proper setup
tags: configuration, launch, setup, initialization
---

## Configure and Launch DBOS Properly

Every DBOS application must configure and launch DBOS inside the main function.

**Incorrect (configuration at module level):**

```python
from dbos import DBOS, DBOSConfig

# Don't configure at module level!
config: DBOSConfig = {
    "name": "my-app",
}
DBOS(config=config)

@DBOS.workflow()
def my_workflow():
    pass

if __name__ == "__main__":
    DBOS.launch()
    my_workflow()
```

**Correct (configuration in main):**

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
    my_workflow()
```

For scheduled-only applications (no HTTP server), block the main thread:

```python
import os
import threading
from dbos import DBOS, DBOSConfig

@DBOS.scheduled("* * * * *")
@DBOS.workflow()
def scheduled_task(scheduled_time, actual_time):
    pass

if __name__ == "__main__":
    config: DBOSConfig = {
        "name": "my-app",
        "system_database_url": os.environ.get("DBOS_SYSTEM_DATABASE_URL"),
    }
    DBOS(config=config)
    DBOS.launch()
    threading.Event().wait()  # Block forever
```

Reference: [DBOS Configuration](https://docs.dbos.dev/python/reference/configuration)
