---
name: temporal-python-testing
description: "Comprehensive testing approaches for Temporal workflows using pytest, progressive disclosure resources for specific testing scenarios."
risk: critical
source: community
date_added: "2026-02-27"
---

# Temporal Python Testing Strategies

Comprehensive testing approaches for Temporal workflows using pytest, progressive disclosure resources for specific testing scenarios.

## Do not use this skill when

- The task is unrelated to temporal python testing strategies
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

## Use this skill when

- **Unit testing workflows** - Fast tests with time-skipping
- **Integration testing** - Workflows with mocked activities
- **Replay testing** - Validate determinism against production histories
- **Local development** - Set up Temporal server and pytest
- **CI/CD integration** - Automated testing pipelines
- **Coverage strategies** - Achieve a project-defined threshold (80% here is illustrative) test coverage

## Testing Philosophy

**Recommended Approach** (Source: docs.temporal.io/develop/python/testing-suite):

- Write majority as integration tests
- Use pytest with async fixtures
- Time-skipping enables fast feedback (long timer waits can be accelerated; activities still consume real time)
- Mock activities to isolate workflow logic
- Validate determinism with replay testing

**Three Test Types**:

1. **Unit**: Workflows with time-skipping, activities with ActivityEnvironment
2. **Integration**: Workers with mocked activities
3. **End-to-end**: Full Temporal server with real activities (use sparingly)

## Available Resources

This skill provides detailed guidance through progressive disclosure. Load specific resources based on your testing needs:

### Unit Testing Resources

**File**: `resources/unit-testing.md`
**When to load**: Testing individual workflows or activities in isolation
**Contains**:

- WorkflowEnvironment with time-skipping
- ActivityEnvironment for activity testing
- Fast execution of long-running workflows
- Manual time advancement patterns
- pytest fixtures and patterns

### Integration Testing Resources

**File**: `resources/integration-testing.md`
**When to load**: Testing workflows with mocked external dependencies
**Contains**:

- Activity mocking strategies
- Error injection patterns
- Multi-activity workflow testing
- Signal and query testing
- Coverage strategies

### Replay Testing Resources

**File**: `resources/replay-testing.md`
**When to load**: Validating determinism or deploying workflow changes
**Contains**:

- Determinism validation
- Production history replay
- CI/CD integration patterns
- Version compatibility testing

### Local Development Resources

**File**: `resources/local-setup.md`
**When to load**: Setting up development environment
**Contains**:

- Docker Compose configuration
- pytest setup and configuration
- Coverage tool integration
- Development workflow

## Runtime prerequisites

Pin compatible `temporalio`, pytest and pytest-asyncio versions in the target project; configure `asyncio_mode = auto` or use `pytest_asyncio.fixture` explicitly. Snippets using `YourWorkflow`, activities, expected values and imports are adaptation sketches, not a bundled runnable test suite. Define sandboxed workflows/activities at module scope in importable modules; nested classes/functions in snippets illustrate logic but can fail sandbox re-import validation. Use unique workflow IDs/task queues and bound execution time. Time-skipping starts/downloads a test server where supported; isolate it from production.

## Quick Start Guide

### Basic Workflow Test

```python
import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

@pytest.fixture
async def workflow_env():
    env = await WorkflowEnvironment.start_time_skipping()
    try:
        yield env
    finally:
        await env.shutdown()

@pytest.mark.asyncio
async def test_workflow(workflow_env):
    async with Worker(
        workflow_env.client,
        task_queue="test-queue",
        workflows=[YourWorkflow],
        activities=[your_activity],
    ):
        result = await workflow_env.client.execute_workflow(
            YourWorkflow.run,
            "test-input", # or args=[arg1, arg2] for multiple arguments
            id="test-wf-id",
            task_queue="test-queue",
        )
        assert result == expected
```

### Basic Activity Test

```python
from temporalio.testing import ActivityEnvironment

async def test_activity():
    env = ActivityEnvironment()
    result = await env.run(your_activity, "test-input")
    assert result == expected_output
```

## Coverage Targets

**Illustrative project coverage target** (not an official Temporal threshold):

- **Workflows**: a project-defined threshold (80% here is illustrative) logic coverage
- **Activities**: a project-defined threshold (80% here is illustrative) logic coverage
- **Integration**: Critical paths with mocked activities
- **Replay**: All workflow versions before deployment

## Key Testing Principles

1. **Time-Skipping** - Timer skipping does not accelerate real activity I/O
2. **Mock Activities** - Isolate workflow logic from external dependencies
3. **Replay Testing** - Validate determinism before deployment
4. **High Coverage** - a project-defined threshold (80% here is illustrative) target for production workflows
5. **Fast Feedback** - Measure actual test duration; server startup and activities take real time

## How to Use Resources

**Load specific resource when needed**:

- "Show me unit testing patterns" → Load `resources/unit-testing.md`
- "How do I mock activities?" → Load `resources/integration-testing.md`
- "Setup local Temporal server" → Load `resources/local-setup.md`
- "Validate determinism" → Load `resources/replay-testing.md`

## Additional References

- Python SDK Testing: docs.temporal.io/develop/python/testing-suite
- Testing Patterns: github.com/temporalio/temporal/blob/main/docs/development/testing.md
- Python Samples: github.com/temporalio/samples-python

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
