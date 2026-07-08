# Unit Testing Temporal Workflows and Activities

Focused guide for testing individual workflows and activities in isolation using WorkflowEnvironment and ActivityEnvironment.

## WorkflowEnvironment with Time-Skipping

**Purpose**: Test workflows in isolation with instant time progression (month-long workflows → seconds)

### Basic Setup Pattern

```python
import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

@pytest.fixture
async def workflow_env():
    """Reusable time-skipping test environment"""
    env = await WorkflowEnvironment.start_time_skipping()
    yield env
    await env.shutdown()

@pytest.mark.asyncio
async def test_workflow_execution(workflow_env):
    """Test workflow with time-skipping"""
    async with Worker(
        workflow_env.client,
        task_queue="test-queue",
        workflows=[YourWorkflow],
        activities=[your_activity],
    ):
        result = await workflow_env.client.execute_workflow(
            YourWorkflow.run,
            "test-input",
            id="test-wf-id",
            task_queue="test-queue",
        )
        assert result == "expected-output"
```

**Key Benefits**:

- `workflow.sleep(timedelta(days=30))` completes instantly
- Fast feedback loop (milliseconds vs hours)
- Deterministic test execution

### Time-Skipping Examples

**Sleep Advancement**:

```python
@pytest.mark.asyncio
async def test_workflow_with_delays(workflow_env):
    """Workflow sleeps are instant in time-skipping mode"""

    @workflow.defn
    class DelayedWorkflow:
        @workflow.run
        async def run(self) -> str:
            await workflow.sleep(timedelta(hours=24))  # Instant in tests
            return "completed"

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[DelayedWorkflow],
    ):
        result = await workflow_env.client.execute_workflow(
            DelayedWorkflow.run,
            id="delayed-wf",
            task_queue="test",
        )
        assert result == "completed"
```

**Manual Time Control**:

```python
@pytest.mark.asyncio
async def test_workflow_manual_time(workflow_env):
    """Manually advance time for precise control"""

    handle = await workflow_env.client.start_workflow(
        TimeBasedWorkflow.run,
        id="time-wf",
        task_queue="test",
    )

    # Advance time by specific amount
    await workflow_env.sleep(timedelta(hours=1))

    # Verify intermediate state via query
    state = await handle.query(TimeBasedWorkflow.get_state)
    assert state == "processing"

    # Advance to completion
    await workflow_env.sleep(timedelta(hours=23))
    result = await handle.result()
    assert result == "completed"
```

### Testing Workflow Logic

**Decision Testing**:

```python
@pytest.mark.asyncio
async def test_workflow_branching(workflow_env):
    """Test different execution paths"""

    @workflow.defn
    class ConditionalWorkflow:
        @workflow.run
        async def run(self, condition: bool) -> str:
            if condition:
                return "path-a"
            return "path-b"

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[ConditionalWorkflow],
    ):
        # Test true path
        result_a = await workflow_env.client.execute_workflow(
            ConditionalWorkflow.run,
            True,
            id="cond-wf-true",
            task_queue="test",
        )
        assert result_a == "path-a"

        # Test false path
        result_b = await workflow_env.client.execute_workflow(
            ConditionalWorkflow.run,
            False,
            id="cond-wf-false",
            task_queue="test",
        )
        assert result_b == "path-b"
```

## ActivityEnvironment Testing

**Purpose**: Test activities in isolation without workflows or Temporal server

### Basic Activity Test

```python
from temporalio.testing import ActivityEnvironment

async def test_activity_basic():
    """Test activity without workflow context"""

    @activity.defn
    async def process_data(input: str) -> str:
        return input.upper()

    env = ActivityEnvironment()
    result = await env.run(process_data, "test")
    assert result == "TEST"
```

### Testing Activity Context

**Heartbeat Testing**:

```python
async def test_activity_heartbeat():
    """Verify heartbeat calls"""

    @activity.defn
    async def long_running_activity(total_items: int) -> int:
        for i in range(total_items):
            activity.heartbeat(i)  # Report progress
            await asyncio.sleep(0.1)
        return total_items

    env = ActivityEnvironment()
    result = await env.run(long_running_activity, 10)
    assert result == 10
```

**Cancellation Testing**:

```python
async def test_activity_cancellation():
    """Test activity cancellation handling"""

    @activity.defn
    async def cancellable_activity() -> str:
        try:
            while True:
                if activity.is_cancelled():
                    return "cancelled"
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            return "cancelled"

    env = ActivityEnvironment(cancellation_reason="test-cancel")
    result = await env.run(cancellable_activity)
    assert result == "cancelled"
```

### Testing Error Handling

**Exception Propagation**:

```python
async def test_activity_error():
    """Test activity error handling"""

    @activity.defn
    async def failing_activity(should_fail: bool) -> str:
        if should_fail:
            raise ApplicationError("Validation failed", non_retryable=True)
        return "success"

    env = ActivityEnvironment()

    # Test success path
    result = await env.run(failing_activity, False)
    assert result == "success"

    # Test error path
    with pytest.raises(ApplicationError) as exc_info:
        await env.run(failing_activity, True)
    assert "Validation failed" in str(exc_info.value)
```

## Pytest Integration Patterns

### Shared Fixtures

```python
# conftest.py
import pytest
from temporalio.testing import WorkflowEnvironment

@pytest.fixture(scope="module")
async def workflow_env():
    """Module-scoped environment (reused across tests)"""
    env = await WorkflowEnvironment.start_time_skipping()
    yield env
    await env.shutdown()

@pytest.fixture
def activity_env():
    """Function-scoped environment (fresh per test)"""
    return ActivityEnvironment()
```

### Parameterized Tests

```python
@pytest.mark.parametrize("input,expected", [
    ("test", "TEST"),
    ("hello", "HELLO"),
    ("123", "123"),
])
async def test_activity_parameterized(activity_env, input, expected):
    """Test multiple input scenarios"""
    result = await activity_env.run(process_data, input)
    assert result == expected
```

## Best Practices

1. **Fast Execution**: Use time-skipping for all workflow tests
2. **Isolation**: Test workflows and activities separately
3. **Shared Fixtures**: Reuse WorkflowEnvironment across related tests
4. **Coverage Target**: ≥80% for workflow logic
5. **Mock Activities**: Use ActivityEnvironment for activity-specific logic
6. **Determinism**: Ensure test results are consistent across runs
7. **Error Cases**: Test both success and failure scenarios

## Common Patterns

**Testing Retry Logic**:

```python
@pytest.mark.asyncio
async def test_workflow_with_retries(workflow_env):
    """Test activity retry behavior"""

    call_count = 0

    @activity.defn
    async def flaky_activity() -> str:
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("Transient error")
        return "success"

    @workflow.defn
    class RetryWorkflow:
        @workflow.run
        async def run(self) -> str:
            return await workflow.execute_activity(
                flaky_activity,
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(
                    initial_interval=timedelta(milliseconds=1),
                    maximum_attempts=5,
                ),
            )

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[RetryWorkflow],
        activities=[flaky_activity],
    ):
        result = await workflow_env.client.execute_workflow(
            RetryWorkflow.run,
            id="retry-wf",
            task_queue="test",
        )
        assert result == "success"
        assert call_count == 3  # Verify retry attempts
```

## Additional Resources

- Python SDK Testing: docs.temporal.io/develop/python/testing-suite
- pytest Documentation: docs.pytest.org
- Temporal Samples: github.com/temporalio/samples-python
