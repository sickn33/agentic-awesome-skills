# Replay Testing for Determinism and Compatibility

Comprehensive guide for validating workflow determinism and ensuring safe code changes using replay testing.

## What is Replay Testing?

**Purpose**: Verify that workflow code changes are backward-compatible with existing workflow executions

**How it works**:

1. Temporal records every workflow decision as Event History
2. Replay testing re-executes workflow code against recorded history
3. If recorded commands match → compatible for these histories (not proof of complete deployment safety)
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
async def test_replay_multiple_workflows(client): # configured authorized client fixture
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

Histories can contain confidential inputs/results. Export only authorized namespaces/runs via the configured TLS/auth client, use private storage and limited retention, and never fetch production secrets in untrusted pull-request CI. Prefer approved sanitized fixtures prepared separately; redaction must preserve converter/event semantics for meaningful replay. The hardcoded hostname below is a placeholder, not a public production service. Single-history JSON and bulk envelope formats below differ: the suite expects the bulk envelope. Add imports `json`, `tempfile` and `Path` where used. Replayer must use compatible data/payload converters and all referenced workflow types.

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
    with open(output_file, "x", encoding="utf-8") as f:
        f.write(history.to_json())

    print(f"Exported history to {output_file}")
```

### Replaying from File

```python
from temporalio.worker import Replayer
from temporalio.client import WorkflowHistory

async def test_replay_from_file():
    """Replay workflow from exported history file"""

    # Load history from file
    with open("workflow_histories/order-123.json", encoding="utf-8") as f:
        history = WorkflowHistory.from_json("order-123", f.read())

    # Replay with current workflow code
    replayer = Replayer(workflows=[OrderWorkflow])
    await replayer.replay_workflow(history)
    # Success = these histories replay; other behavior remains untested
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
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio

      - name: Download production histories
        run: |
          # Use approved histories prepared outside untrusted PR execution.
          test -d workflow_histories

      - name: Run replay tests
        run: |
          pytest tests/replay/ --verbose

      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: replay-failures
          path: replay-failures/
```

### Automated History Export

```python
# scripts/export_histories.py
import asyncio
from temporalio.client import Client
from datetime import datetime, timedelta, timezone

async def export_recent_histories():
    """Export recent production workflow histories"""

    client = await Client.connect("production.temporal.io:7233")

    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    workflows = client.list_workflows(
        query=f"WorkflowType='OrderWorkflow' AND CloseTime > '{cutoff}'"
    )

    output = Path(tempfile.mkdtemp(prefix="temporal-history-")) # private fresh directory
    count = 0
    async for execution in workflows:
        # Export history
        history = await client.get_workflow_handle(execution.id, run_id=execution.run_id).fetch_history()

        # Save to file
        filename = output / f"history-{count}.json"
        with filename.open("x", encoding="utf-8") as f:
            json.dump({"workflow_id": execution.id, "history": history.to_json_dict()}, f)

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
from temporalio.client import WorkflowHistory
from workflows import OrderWorkflow, PaymentWorkflow

@pytest.mark.asyncio
async def test_replay_all_histories():
    """Replay all production histories"""

    replayer = Replayer(
        workflows=[OrderWorkflow, PaymentWorkflow]
    )

    # Load all history files
    history_files = glob.glob("workflow_histories/*.json")
    assert history_files, "No histories supplied; replay coverage is empty"

    failures = []
    for history_file in history_files:
        try:
            with open(history_file, encoding="utf-8") as f:
                envelope = json.load(f)
                history = WorkflowHistory.from_json(envelope["workflow_id"], envelope["history"])

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

### Python patching protocol

Python uses `workflow.patched("new-logic")`, not the `get_version` API shown in other SDKs:

```python
@workflow.defn
class MigratingWorkflow:
    @workflow.run
    async def run(self) -> dict:
        if workflow.patched("new-logic"):
            return await self._new_implementation()
        return await self._old_implementation()
```

Both implementations are application prerequisites. Preserve the workflow type name across versions. New executions use the patched branch; replay histories from the pre-patch version test the old branch. Two new executions with different IDs do not simulate old/new histories. After the appropriate old workers/executions are drained, follow `workflow.deprecate_patch` and marker-removal stages in the [official Python sample](https://github.com/temporalio/samples-python/tree/main/patching), retaining representative old, patched and deprecated histories for each deployment stage. Do not simply delete the old branch after an arbitrary delay.

## Best Practices

1. **Replay Before Deploy**: Always run replay tests before deploying workflow changes
2. **Export Regularly**: Continuously export production histories for testing
3. **CI/CD Integration**: Automated replay testing in pull request checks
4. **Version Tracking**: Use the Python patched/deprecate_patch protocol and representative histories
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

Error names/messages depend on SDK version; inspect actual replay exceptions rather than expecting a fabricated `WorkflowVersionError`. A replay exception may also reflect missing workflow registration, imports or payload converter configuration, not only nondeterminism.

## Additional Resources

- Replay Testing: docs.temporal.io/develop/python/testing-suite#replay-testing
- Workflow Versioning: docs.temporal.io/workflows#versioning
- Determinism Guide: docs.temporal.io/workflows#deterministic-constraints
- CI/CD Integration: github.com/temporalio/samples-python/tree/main/.github/workflows
