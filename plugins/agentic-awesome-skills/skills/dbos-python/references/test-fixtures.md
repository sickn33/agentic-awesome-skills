---
title: Use Proper Test Fixtures for DBOS
impact: LOW-MEDIUM
impactDescription: Ensures clean state between tests
tags: testing, pytest, fixtures, reset
---

## Use Proper Test Fixtures for DBOS

Use pytest fixtures to properly reset DBOS state between tests.

**Incorrect (no reset between tests):**

```python
def test_workflow_one():
    DBOS.launch()
    result = my_workflow()
    assert result == "expected"

def test_workflow_two():
    # DBOS state from previous test!
    result = another_workflow()
```

**Correct (reset fixture):**

```python
import pytest
import os
from dbos import DBOS, DBOSConfig

@pytest.fixture()
def reset_dbos():
    DBOS.destroy()
    config: DBOSConfig = {
        "name": "test-app",
        "database_url": os.environ.get("TESTING_DATABASE_URL"),
    }
    DBOS(config=config)
    DBOS.reset_system_database()
    DBOS.launch()
    yield
    DBOS.destroy()

def test_workflow_one(reset_dbos):
    result = my_workflow()
    assert result == "expected"

def test_workflow_two(reset_dbos):
    # Clean DBOS state
    result = another_workflow()
    assert result == "other_expected"
```

The fixture:
1. Destroys any existing DBOS instance
2. Creates fresh configuration
3. Resets the system database
4. Launches DBOS
5. Yields for test execution
6. Cleans up after test

Reference: [Testing DBOS](https://docs.dbos.dev/python/tutorials/testing)
