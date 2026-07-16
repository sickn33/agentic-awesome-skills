# Replay Testing for Determinism and Compatibility

Comprehensive guide for validating workflow determinism and ensuring safe code changes using replay testing.

## What is Replay Testing?

**Purpose**: Verify that workflow code changes are backward-compatible with existing workflow executions

**How it works**:

1. Temporal records every workflow decision as Event History
2. Replay testing re-executes workflow code against recorded history
3. If new code makes same decisions → deterministic (safe to deploy)
4. If decisions differ → non-deterministic (breaking change)

**Critical Use Cases**:

- Deploying workflow code changes to production
- Validating refactoring doesn't break running workflows
- CI/CD automated compatibility checks
- Version migration validation

## Basic Replay Testing

### Replayer Setup

```python
from temporalio.worker import Replayer
from temporalio.client import Client

async def test_workflow_replay():
    """Test workflow against production history"""

    # Connect to Temporal server
    client = await Client.connect("localhost:7233")

    # Create replayer with current workflow code
    replayer = Replayer(
        workflows=[OrderWorkflow, PaymentWorkflow]
    )

    # Fetch workflow history from production
    handle = client.get_workflow_handle("order-123")
    history = await handle.fetch_history()

    # Replay history with current code
    await replayer.replay_workflow(history)
    # Success = deterministic, Exception = breaking change
```

### Testing Against Multiple Histories

```python
import pytest
from temporalio.worker import Replayer

@pytest.mark.asyncio
async def test_replay_multiple_workflows():
    """Replay against multiple production histories"""

    replayer = Replayer(workflows=[OrderWorkflow])

    # Test against different workflow executions
    workflow_ids = [
        "order-success-123",
        "order-cancelled-456",
        "order-retry-789",
    ]

    for workflow_id in workflow_ids:
        handle = client.get_workflow_handle(workflow_id)
        history = await handle.fetch_history()

        # Replay should succeed for all variants
        await replayer.replay_workflow(history)
```

## Determinism Validation

### Common Non-Deterministic Patterns

**Problem: Random Number Generation**

```python
# ❌ Non-deterministic (breaks replay)
@workflow.defn
class BadWorkflow:
    @workflow.run
    async def run(self) -> int:
        return random.randint(1, 100)  # Different on replay!

# ✅ Deterministic (safe for replay)
@workflow.defn
class GoodWorkflow:
    @workflow.run
    async def run(self) -> int:
        return workflow.random().randint(1, 100)  # Deterministic random
```

**Problem: Current Time**

```python
# ❌ Non-deterministic
@workflow.defn
class BadWorkflow:
    @workflow.run
    async def run(self) -> str:
        now = datetime.now()  # Different on replay!
        return now.isoformat()

# ✅ Deterministic
@workflow.defn
class GoodWorkflow:
    @workflow.run
    async def run(self) -> str:
        now = workflow.now()  # Deterministic time
        return now.isoformat()
```

**Problem: Direct External Calls**

```python
# ❌ Non-deterministic
@workflow.defn
class BadWorkflow:
    @workflow.run
    async def run(self) -> dict:
        response = requests.get("https://api.example.com/data")  # External call!
        return response.json()

# ✅ Deterministic
@workflow.defn
class GoodWorkflow:
    @workflow.run
    async def run(self) -> dict:
        # Use activity for external calls
        return await workflow.execute_activity(
            fetch_external_data,
            start_to_close_timeout=timedelta(seconds=30),
        )
```

### Testing Determinism

```python
@pytest.mark.asyncio
async def test_workflow_determinism():
    """Verify workflow produces same output on multiple runs"""

    @workflow.defn
    class DeterministicWorkflow:
        @workflow.run
        async def run(self, seed: int) -> list[int]:
            # Use workflow.random() for determinism
            rng = workflow.random()
            rng.seed(seed)
            return [rng.randint(1, 100) for _ in range(10)]

    env = await WorkflowEnvironment.start_time_skipping()

    # Run workflow twice with same input
    results = []
    for i in range(2):
        async with Worker(
            env.client,
            task_queue="test",
            workflows=[DeterministicWorkflow],
        ):
            result = await env.client.execute_workflow(
                DeterministicWorkflow.run,
                42,  # Same seed
                id=f"determinism-test-{i}",
                task_queue="test",
            )
            results.append(result)

    await env.shutdown()

    # Verify identical outputs
    assert results[0] == results[1]
```

## Production History Replay

### Exporting Workflow History

```python
from temporalio.client import Client

async def export_workflow_history(workflow_id: str, output_file: str):
    """Export workflow history for replay testing"""

    client = await Client.connect("production.temporal.io:7233")

    # Fetch workflow history
    handle = client.get_workflow_handle(workflow_id)
    history = await handle.fetch_history()

    # Save to file for replay testing
    with open(output_file, "wb") as f:
        f.write(history.SerializeToString())

    print(f"Exported history to {output_file}")
```

### Replaying from File

```python
from temporalio.worker import Replayer
from temporalio.api.history.v1 import History

async def test_replay_from_file():
    """Replay workflow from exported history file"""

    # Load history from file
    with open("workflow_histories/order-123.pb", "rb") as f:
        history = History.FromString(f.read())

    # Replay with current workflow code
    replayer = Replayer(workflows=[OrderWorkflow])
    await replayer.replay_workflow(history)
    # Success = safe to deploy
```

## CI/CD Integration Patterns

### GitHub Actions Example

```yaml
# .github/workflows/replay-tests.yml
name: Replay Tests

on:
  pull_request:
    branches: [main]

jobs:
  replay-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio

      - name: Download production histories
        run: |
          # Fetch recent workflow histories from production
          python scripts/export_histories.py

      - name: Run replay tests
        run: |
          pytest tests/replay/ --verbose

      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: replay-failures
          path: replay-failures/
```

### Automated History Export

```python
# scripts/export_histories.py
import asyncio
from temporalio.client import Client
from datetime import datetime, timedelta

async def export_recent_histories():
    """Export recent production workflow histories"""

    client = await Client.connect("production.temporal.io:7233")

    # Query recent completed workflows
    workflows = client.list_workflows(
        query="WorkflowType='OrderWorkflow' AND CloseTime > '7 days ago'"
    )

    count = 0
    async for workflow in workflows:
        # Export history
        history = await workflow.fetch_history()

        # Save to file
        filename = f"workflow_histories/{workflow.id}.pb"
        with open(filename, "wb") as f:
            f.write(history.SerializeToString())

        count += 1
        if count >= 100:  # Limit to 100 most recent
            break

    print(f"Exported {count} workflow histories")

if __name__ == "__main__":
    asyncio.run(export_recent_histories())
```

### Replay Test Suite

```python
# tests/replay/test_workflow_replay.py
import pytest
import glob
from temporalio.worker import Replayer
from temporalio.api.history.v1 import History
from workflows import OrderWorkflow, PaymentWorkflow

@pytest.mark.asyncio
async def test_replay_all_histories():
    """Replay all production histories"""

    replayer = Replayer(
        workflows=[OrderWorkflow, PaymentWorkflow]
    )

    # Load all history files
    history_files = glob.glob("workflow_histories/*.pb")

    failures = []
    for history_file in history_files:
        try:
            with open(history_file, "rb") as f:
                history = History.FromString(f.read())

            await replayer.replay_workflow(history)
            print(f"✓ {history_file}")

        except Exception as e:
            failures.append((history_file, str(e)))
            print(f"✗ {history_file}: {e}")

    # Report failures
    if failures:
        pytest.fail(
            f"Replay failed for {len(failures)} workflows:\n"
            + "\n".join(f"  {file}: {error}" for file, error in failures)
        )
```

## Version Compatibility Testing

### Testing Code Evolution

```python
@pytest.mark.asyncio
async def test_workflow_version_compatibility():
    """Test workflow with version changes"""

    @workflow.defn
    class EvolvingWorkflow:
        @workflow.run
        async def run(self) -> str:
            # Use versioning for safe code evolution
            version = workflow.get_version("feature-flag", 1, 2)

            if version == 1:
                # Old behavior
                return "version-1"
            else:
                # New behavior
                return "version-2"

    env = await WorkflowEnvironment.start_time_skipping()

    # Test version 1 behavior
    async with Worker(
        env.client,
        task_queue="test",
        workflows=[EvolvingWorkflow],
    ):
        result_v1 = await env.client.execute_workflow(
            EvolvingWorkflow.run,
            id="evolving-v1",
            task_queue="test",
        )
        assert result_v1 == "version-1"

        # Simulate workflow executing again with version 2
        result_v2 = await env.client.execute_workflow(
            EvolvingWorkflow.run,
            id="evolving-v2",
            task_queue="test",
        )
        # New workflows use version 2
        assert result_v2 == "version-2"

    await env.shutdown()
```

### Migration Strategy

```python
# Phase 1: Add version check
@workflow.defn
class MigratingWorkflow:
    @workflow.run
    async def run(self) -> dict:
        version = workflow.get_version("new-logic", 1, 2)

        if version == 1:
            # Old logic (existing workflows)
            return await self._old_implementation()
        else:
            # New logic (new workflows)
            return await self._new_implementation()

# Phase 2: After all old workflows complete, remove old code
@workflow.defn
class MigratedWorkflow:
    @workflow.run
    async def run(self) -> dict:
        # Only new logic remains
        return await self._new_implementation()
```

## Best Practices

1. **Replay Before Deploy**: Always run replay tests before deploying workflow changes
2. **Export Regularly**: Continuously export production histories for testing
3. **CI/CD Integration**: Automated replay testing in pull request checks
4. **Version Tracking**: Use workflow.get_version() for safe code evolution
5. **History Retention**: Keep representative workflow histories for regression testing
6. **Determinism**: Never use random(), datetime.now(), or direct external calls
7. **Comprehensive Testing**: Test against various workflow execution paths

## Common Replay Errors

**Non-Deterministic Error**:

```
WorkflowNonDeterministicError: Workflow command mismatch at position 5
Expected: ScheduleActivityTask(activity_id='activity-1')
Got: ScheduleActivityTask(activity_id='activity-2')
```

**Solution**: Code change altered workflow decision sequence

**Version Mismatch Error**:

```
WorkflowVersionError: Workflow version changed from 1 to 2 without using get_version()
```

**Solution**: Use workflow.get_version() for backward-compatible changes

## Additional Resources

- Replay Testing: docs.temporal.io/develop/python/testing-suite#replay-testing
- Workflow Versioning: docs.temporal.io/workflows#versioning
- Determinism Guide: docs.temporal.io/workflows#deterministic-constraints
- CI/CD Integration: github.com/temporalio/samples-python/tree/main/.github/workflows
