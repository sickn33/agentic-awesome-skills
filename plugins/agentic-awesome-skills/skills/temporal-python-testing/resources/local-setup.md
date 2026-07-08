# Local Development Setup for Temporal Python Testing

Comprehensive guide for setting up local Temporal development environment with pytest integration and coverage tracking.

## Temporal Server Setup with Docker Compose

### Basic Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  temporal:
    image: temporalio/auto-setup:latest
    container_name: temporal-dev
    ports:
      - "7233:7233" # Temporal server
      - "8233:8233" # Web UI
    environment:
      - DB=postgresql
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
    depends_on:
      - postgresql

  postgresql:
    image: postgres:14-alpine
    container_name: temporal-postgres
    environment:
      - POSTGRES_USER=temporal
      - POSTGRES_PASSWORD=temporal
      - POSTGRES_DB=temporal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  temporal-ui:
    image: temporalio/ui:latest
    container_name: temporal-ui
    depends_on:
      - temporal
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:3000
    ports:
      - "8080:8080"

volumes:
  postgres_data:
```

### Starting Local Server

```bash
# Start Temporal server
docker-compose up -d

# Verify server is running
docker-compose ps

# View logs
docker-compose logs -f temporal

# Access Temporal Web UI
open http://localhost:8080

# Stop server
docker-compose down

# Reset data (clean slate)
docker-compose down -v
```

### Health Check Script

```python
# scripts/health_check.py
import asyncio
from temporalio.client import Client

async def check_temporal_health():
    """Verify Temporal server is accessible"""
    try:
        client = await Client.connect("localhost:7233")
        print("✓ Connected to Temporal server")

        # Test workflow execution
        from temporalio.worker import Worker

        @workflow.defn
        class HealthCheckWorkflow:
            @workflow.run
            async def run(self) -> str:
                return "healthy"

        async with Worker(
            client,
            task_queue="health-check",
            workflows=[HealthCheckWorkflow],
        ):
            result = await client.execute_workflow(
                HealthCheckWorkflow.run,
                id="health-check",
                task_queue="health-check",
            )
            print(f"✓ Workflow execution successful: {result}")

        return True

    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(check_temporal_health())
```

## pytest Configuration

### Project Structure

```
temporal-project/
├── docker-compose.yml
├── pyproject.toml
├── pytest.ini
├── requirements.txt
├── src/
│   ├── workflows/
│   │   ├── __init__.py
│   │   ├── order_workflow.py
│   │   └── payment_workflow.py
│   └── activities/
│       ├── __init__.py
│       ├── payment_activities.py
│       └── inventory_activities.py
├── tests/
│   ├── conftest.py
│   ├── unit/
│   │   ├── test_workflows.py
│   │   └── test_activities.py
│   ├── integration/
│   │   └── test_order_flow.py
│   └── replay/
│       └── test_workflow_replay.py
└── scripts/
    ├── health_check.py
    └── export_histories.py
```

### pytest Configuration

```ini
# pytest.ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*

# Markers for test categorization
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (require Temporal server)
    replay: Replay tests (require production histories)
    slow: Slow running tests

# Coverage settings
addopts =
    --verbose
    --strict-markers
    --cov=src
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80

# Async test timeout
asyncio_default_fixture_loop_scope = function
```

### Shared Test Fixtures

```python
# tests/conftest.py
import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.client import Client

@pytest.fixture(scope="session")
def event_loop():
    """Provide event loop for async fixtures"""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def temporal_client():
    """Provide Temporal client connected to local server"""
    client = await Client.connect("localhost:7233")
    yield client
    await client.close()

@pytest.fixture(scope="module")
async def workflow_env():
    """Module-scoped time-skipping environment"""
    env = await WorkflowEnvironment.start_time_skipping()
    yield env
    await env.shutdown()

@pytest.fixture
def activity_env():
    """Function-scoped activity environment"""
    from temporalio.testing import ActivityEnvironment
    return ActivityEnvironment()

@pytest.fixture
async def test_worker(temporal_client, workflow_env):
    """Pre-configured test worker"""
    from temporalio.worker import Worker
    from src.workflows import OrderWorkflow, PaymentWorkflow
    from src.activities import process_payment, update_inventory

    return Worker(
        workflow_env.client,
        task_queue="test-queue",
        workflows=[OrderWorkflow, PaymentWorkflow],
        activities=[process_payment, update_inventory],
    )
```

### Dependencies

```txt
# requirements.txt
temporalio>=1.5.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
pytest-xdist>=3.3.0  # Parallel test execution
```

```toml
# pyproject.toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_backend"

[project]
name = "temporal-project"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "temporalio>=1.5.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "pytest-xdist>=3.3.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

## Coverage Configuration

### Coverage Settings

```ini
# .coveragerc
[run]
source = src
omit =
    */tests/*
    */venv/*
    */__pycache__/*

[report]
exclude_lines =
    # Exclude type checking blocks
    if TYPE_CHECKING:
    # Exclude debug code
    def __repr__
    # Exclude abstract methods
    @abstractmethod
    # Exclude pass statements
    pass

[html]
directory = htmlcov
```

### Running Tests with Coverage

```bash
# Run all tests with coverage
pytest --cov=src --cov-report=term-missing

# Generate HTML coverage report
pytest --cov=src --cov-report=html
open htmlcov/index.html

# Run specific test categories
pytest -m unit  # Unit tests only
pytest -m integration  # Integration tests only
pytest -m "not slow"  # Skip slow tests

# Parallel execution (faster)
pytest -n auto  # Use all CPU cores

# Fail if coverage below threshold
pytest --cov=src --cov-fail-under=80
```

### Coverage Report Example

```
---------- coverage: platform darwin, python 3.11.5 -----------
Name                                Stmts   Miss  Cover   Missing
-----------------------------------------------------------------
src/__init__.py                         0      0   100%
src/activities/__init__.py              2      0   100%
src/activities/inventory.py            45      3    93%   78-80
src/activities/payment.py              38      0   100%
src/workflows/__init__.py               2      0   100%
src/workflows/order_workflow.py        67      5    93%   45-49
src/workflows/payment_workflow.py      52      0   100%
-----------------------------------------------------------------
TOTAL                                 206      8    96%

10 files skipped due to complete coverage.
```

## Development Workflow

### Daily Development Flow

```bash
# 1. Start Temporal server
docker-compose up -d

# 2. Verify server health
python scripts/health_check.py

# 3. Run tests during development
pytest tests/unit/ --verbose

# 4. Run full test suite before commit
pytest --cov=src --cov-report=term-missing

# 5. Check coverage
open htmlcov/index.html

# 6. Stop server
docker-compose down
```

### Pre-Commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running tests..."
pytest --cov=src --cov-fail-under=80

if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi

echo "All tests passed!"
```

### Makefile for Common Tasks

```makefile
# Makefile
.PHONY: setup test test-unit test-integration coverage clean

setup:
	docker-compose up -d
	pip install -r requirements.txt
	python scripts/health_check.py

test:
	pytest --cov=src --cov-report=term-missing

test-unit:
	pytest -m unit --verbose

test-integration:
	pytest -m integration --verbose

test-replay:
	pytest -m replay --verbose

test-parallel:
	pytest -n auto --cov=src

coverage:
	pytest --cov=src --cov-report=html
	open htmlcov/index.html

clean:
	docker-compose down -v
	rm -rf .pytest_cache htmlcov .coverage

ci:
	docker-compose up -d
	sleep 10  # Wait for Temporal to start
	pytest --cov=src --cov-fail-under=80
	docker-compose down
```

### CI/CD Example

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Start Temporal server
        run: docker-compose up -d

      - name: Wait for Temporal
        run: sleep 10

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run tests with coverage
        run: |
          pytest --cov=src --cov-report=xml --cov-fail-under=80

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

      - name: Cleanup
        if: always()
        run: docker-compose down
```

## Debugging Tips

### Enable Temporal SDK Logging

```python
import logging

# Enable debug logging for Temporal SDK
logging.basicConfig(level=logging.DEBUG)
temporal_logger = logging.getLogger("temporalio")
temporal_logger.setLevel(logging.DEBUG)
```

### Interactive Debugging

```python
# Add breakpoint in test
@pytest.mark.asyncio
async def test_workflow_with_breakpoint(workflow_env):
    import pdb; pdb.set_trace()  # Debug here

    async with Worker(...):
        result = await workflow_env.client.execute_workflow(...)
```

### Temporal Web UI

```bash
# Access Web UI at http://localhost:8080
# - View workflow executions
# - Inspect event history
# - Replay workflows
# - Monitor workers
```

## Best Practices

1. **Isolated Environment**: Use Docker Compose for reproducible local setup
2. **Health Checks**: Always verify Temporal server before running tests
3. **Fast Feedback**: Use pytest markers to run unit tests quickly
4. **Coverage Targets**: Maintain ≥80% code coverage
5. **Parallel Testing**: Use pytest-xdist for faster test runs
6. **CI/CD Integration**: Automated testing on every commit
7. **Cleanup**: Clear Docker volumes between test runs if needed

## Troubleshooting

**Issue: Temporal server not starting**

```bash
# Check logs
docker-compose logs temporal

# Reset database
docker-compose down -v
docker-compose up -d
```

**Issue: Tests timing out**

```python
# Increase timeout in pytest.ini
asyncio_default_timeout = 30
```

**Issue: Port already in use**

```bash
# Find process using port 7233
lsof -i :7233

# Kill process or change port in docker-compose.yml
```

## Additional Resources

- Temporal Local Development: docs.temporal.io/develop/python/local-dev
- pytest Documentation: docs.pytest.org
- Docker Compose: docs.docker.com/compose
- pytest-asyncio: github.com/pytest-dev/pytest-asyncio
