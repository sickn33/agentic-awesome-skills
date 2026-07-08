# Integration Testing with Mocked Activities

Comprehensive patterns for testing workflows with mocked external dependencies, error injection, and complex scenarios.

## Activity Mocking Strategy

**Purpose**: Test workflow orchestration logic without calling real external services

### Basic Mock Pattern

```python
import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from unittest.mock import Mock

@pytest.mark.asyncio
async def test_workflow_with_mocked_activity(workflow_env):
    """Mock activity to test workflow logic"""

    # Create mock activity
    mock_activity = Mock(return_value="mocked-result")

    @workflow.defn
    class WorkflowWithActivity:
        @workflow.run
        async def run(self, input: str) -> str:
            result = await workflow.execute_activity(
                process_external_data,
                input,
                start_to_close_timeout=timedelta(seconds=10),
            )
            return f"processed: {result}"

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[WorkflowWithActivity],
        activities=[mock_activity],  # Use mock instead of real activity
    ):
        result = await workflow_env.client.execute_workflow(
            WorkflowWithActivity.run,
            "test-input",
            id="wf-mock",
            task_queue="test",
        )
        assert result == "processed: mocked-result"
        mock_activity.assert_called_once()
```

### Dynamic Mock Responses

**Scenario-Based Mocking**:

```python
@pytest.mark.asyncio
async def test_workflow_multiple_mock_scenarios(workflow_env):
    """Test different workflow paths with dynamic mocks"""

    # Mock returns different values based on input
    def dynamic_activity(input: str) -> str:
        if input == "error-case":
            raise ApplicationError("Validation failed", non_retryable=True)
        return f"processed-{input}"

    @workflow.defn
    class DynamicWorkflow:
        @workflow.run
        async def run(self, input: str) -> str:
            try:
                result = await workflow.execute_activity(
                    dynamic_activity,
                    input,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                return f"success: {result}"
            except ApplicationError as e:
                return f"error: {e.message}"

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[DynamicWorkflow],
        activities=[dynamic_activity],
    ):
        # Test success path
        result_success = await workflow_env.client.execute_workflow(
            DynamicWorkflow.run,
            "valid-input",
            id="wf-success",
            task_queue="test",
        )
        assert result_success == "success: processed-valid-input"

        # Test error path
        result_error = await workflow_env.client.execute_workflow(
            DynamicWorkflow.run,
            "error-case",
            id="wf-error",
            task_queue="test",
        )
        assert "Validation failed" in result_error
```

## Error Injection Patterns

### Testing Transient Failures

**Retry Behavior**:

```python
@pytest.mark.asyncio
async def test_workflow_transient_errors(workflow_env):
    """Test retry logic with controlled failures"""

    attempt_count = 0

    @activity.defn
    async def transient_activity() -> str:
        nonlocal attempt_count
        attempt_count += 1

        if attempt_count < 3:
            raise Exception(f"Transient error {attempt_count}")
        return "success-after-retries"

    @workflow.defn
    class RetryWorkflow:
        @workflow.run
        async def run(self) -> str:
            return await workflow.execute_activity(
                transient_activity,
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(
                    initial_interval=timedelta(milliseconds=10),
                    maximum_attempts=5,
                    backoff_coefficient=1.0,
                ),
            )

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[RetryWorkflow],
        activities=[transient_activity],
    ):
        result = await workflow_env.client.execute_workflow(
            RetryWorkflow.run,
            id="retry-wf",
            task_queue="test",
        )
        assert result == "success-after-retries"
        assert attempt_count == 3
```

### Testing Non-Retryable Errors

**Business Validation Failures**:

```python
@pytest.mark.asyncio
async def test_workflow_non_retryable_error(workflow_env):
    """Test handling of permanent failures"""

    @activity.defn
    async def validation_activity(input: dict) -> str:
        if not input.get("valid"):
            raise ApplicationError(
                "Invalid input",
                non_retryable=True,  # Don't retry validation errors
            )
        return "validated"

    @workflow.defn
    class ValidationWorkflow:
        @workflow.run
        async def run(self, input: dict) -> str:
            try:
                return await workflow.execute_activity(
                    validation_activity,
                    input,
                    start_to_close_timeout=timedelta(seconds=10),
                )
            except ApplicationError as e:
                return f"validation-failed: {e.message}"

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[ValidationWorkflow],
        activities=[validation_activity],
    ):
        result = await workflow_env.client.execute_workflow(
            ValidationWorkflow.run,
            {"valid": False},
            id="validation-wf",
            task_queue="test",
        )
        assert "validation-failed" in result
```

## Multi-Activity Workflow Testing

### Sequential Activity Pattern

```python
@pytest.mark.asyncio
async def test_workflow_sequential_activities(workflow_env):
    """Test workflow orchestrating multiple activities"""

    activity_calls = []

    @activity.defn
    async def step_1(input: str) -> str:
        activity_calls.append("step_1")
        return f"{input}-step1"

    @activity.defn
    async def step_2(input: str) -> str:
        activity_calls.append("step_2")
        return f"{input}-step2"

    @activity.defn
    async def step_3(input: str) -> str:
        activity_calls.append("step_3")
        return f"{input}-step3"

    @workflow.defn
    class SequentialWorkflow:
        @workflow.run
        async def run(self, input: str) -> str:
            result_1 = await workflow.execute_activity(
                step_1,
                input,
                start_to_close_timeout=timedelta(seconds=10),
            )
            result_2 = await workflow.execute_activity(
                step_2,
                result_1,
                start_to_close_timeout=timedelta(seconds=10),
            )
            result_3 = await workflow.execute_activity(
                step_3,
                result_2,
                start_to_close_timeout=timedelta(seconds=10),
            )
            return result_3

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[SequentialWorkflow],
        activities=[step_1, step_2, step_3],
    ):
        result = await workflow_env.client.execute_workflow(
            SequentialWorkflow.run,
            "start",
            id="seq-wf",
            task_queue="test",
        )
        assert result == "start-step1-step2-step3"
        assert activity_calls == ["step_1", "step_2", "step_3"]
```

### Parallel Activity Pattern

```python
@pytest.mark.asyncio
async def test_workflow_parallel_activities(workflow_env):
    """Test concurrent activity execution"""

    @activity.defn
    async def parallel_task(task_id: int) -> str:
        return f"task-{task_id}"

    @workflow.defn
    class ParallelWorkflow:
        @workflow.run
        async def run(self, task_count: int) -> list[str]:
            # Execute activities in parallel
            tasks = [
                workflow.execute_activity(
                    parallel_task,
                    i,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                for i in range(task_count)
            ]
            return await asyncio.gather(*tasks)

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[ParallelWorkflow],
        activities=[parallel_task],
    ):
        result = await workflow_env.client.execute_workflow(
            ParallelWorkflow.run,
            3,
            id="parallel-wf",
            task_queue="test",
        )
        assert result == ["task-0", "task-1", "task-2"]
```

## Signal and Query Testing

### Signal Handlers

```python
@pytest.mark.asyncio
async def test_workflow_signals(workflow_env):
    """Test workflow signal handling"""

    @workflow.defn
    class SignalWorkflow:
        def __init__(self) -> None:
            self._status = "initialized"

        @workflow.run
        async def run(self) -> str:
            # Wait for completion signal
            await workflow.wait_condition(lambda: self._status == "completed")
            return self._status

        @workflow.signal
        async def update_status(self, new_status: str) -> None:
            self._status = new_status

        @workflow.query
        def get_status(self) -> str:
            return self._status

    async with Worker(
        workflow_env.client,
        task_queue="test",
        workflows=[SignalWorkflow],
    ):
        # Start workflow
        handle = await workflow_env.client.start_workflow(
            SignalWorkflow.run,
            id="signal-wf",
            task_queue="test",
        )

        # Verify initial state via query
        initial_status = await handle.query(SignalWorkflow.get_status)
        assert initial_status == "initialized"

        # Send signal
        await handle.signal(SignalWorkflow.update_status, "processing")

        # Verify updated state
        updated_status = await handle.query(SignalWorkflow.get_status)
        assert updated_status == "processing"

        # Complete workflow
        await handle.signal(SignalWorkflow.update_status, "completed")
        result = await handle.result()
        assert result == "completed"
```

## Coverage Strategies

### Workflow Logic Coverage

**Target**: ≥80% coverage of workflow decision logic

```python
# Test all branches
@pytest.mark.parametrize("condition,expected", [
    (True, "branch-a"),
    (False, "branch-b"),
])
async def test_workflow_branches(workflow_env, condition, expected):
    """Ensure all code paths are tested"""
    # Test implementation
    pass
```

### Activity Coverage

**Target**: ≥80% coverage of activity logic

```python
# Test activity edge cases
@pytest.mark.parametrize("input,expected", [
    ("valid", "success"),
    ("", "empty-input-error"),
    (None, "null-input-error"),
])
async def test_activity_edge_cases(activity_env, input, expected):
    """Test activity error handling"""
    # Test implementation
    pass
```

## Integration Test Organization

### Test Structure

```
tests/
├── integration/
│   ├── conftest.py              # Shared fixtures
│   ├── test_order_workflow.py   # Order processing tests
│   ├── test_payment_workflow.py # Payment tests
│   └── test_fulfillment_workflow.py
├── unit/
│   ├── test_order_activities.py
│   └── test_payment_activities.py
└── fixtures/
    └── test_data.py             # Test data builders
```

### Shared Fixtures

```python
# conftest.py
import pytest
from temporalio.testing import WorkflowEnvironment

@pytest.fixture(scope="session")
async def workflow_env():
    """Session-scoped environment for integration tests"""
    env = await WorkflowEnvironment.start_time_skipping()
    yield env
    await env.shutdown()

@pytest.fixture
def mock_payment_service():
    """Mock external payment service"""
    return Mock()

@pytest.fixture
def mock_inventory_service():
    """Mock external inventory service"""
    return Mock()
```

## Best Practices

1. **Mock External Dependencies**: Never call real APIs in tests
2. **Test Error Scenarios**: Verify compensation and retry logic
3. **Parallel Testing**: Use pytest-xdist for faster test runs
4. **Isolated Tests**: Each test should be independent
5. **Clear Assertions**: Verify both results and side effects
6. **Coverage Target**: ≥80% for critical workflows
7. **Fast Execution**: Use time-skipping, avoid real delays

## Additional Resources

- Mocking Strategies: docs.temporal.io/develop/python/testing-suite
- pytest Best Practices: docs.pytest.org/en/stable/goodpractices.html
- Python SDK Samples: github.com/temporalio/samples-python
