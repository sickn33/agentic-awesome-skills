---
name: pytest-skill
description: 'Generates production-grade pytest tests in Python with fixtures, parametrize, markers, mocking, and conftest patterns. Use when user mentions "pytest", "conftest", "@pytest.fixture", "@pytest.mark", "Python test". Triggers on: "pytest", "conftest", "Python test", "parametrize", "Python...'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/pytest-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Pytest Testing Skill
## When to Use

Use this skill when you need generates production-grade pytest tests in Python with fixtures, parametrize, markers, mocking, and conftest patterns. Use when user mentions "pytest", "conftest", "@pytest.fixture", "@pytest.mark", "Python test". Triggers on: "pytest", "conftest", "Python test", "parametrize", "Python...


## Core Patterns

### Basic Test

```python
import pytest

def test_addition():
    assert 2 + 3 == 5

def test_exception():
    with pytest.raises(ValueError, match="invalid"):
        int("not_a_number")

class TestCalculator:
    def test_add(self):
        calc = Calculator()
        assert calc.add(2, 3) == 5

    def test_divide_by_zero(self):
        with pytest.raises(ZeroDivisionError):
            Calculator().divide(10, 0)
```

### Fixtures

```python
@pytest.fixture
def calculator():
    return Calculator()

@pytest.fixture
def db_connection():
    conn = Database.connect("test_db")
    yield conn  # teardown after yield
    conn.rollback()
    conn.close()

@pytest.fixture(scope="module")
def api_client():
    client = APIClient(base_url="http://localhost:8000")
    yield client
    client.logout()

# conftest.py - shared fixtures
@pytest.fixture(autouse=True)
def reset_state():
    State.reset()
    yield
    State.cleanup()

# Usage
def test_add(calculator):
    assert calculator.add(2, 3) == 5
```

### Parametrize

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", 5), ("", 0), ("pytest", 6),
])
def test_string_length(input, expected):
    assert len(input) == expected

@pytest.mark.parametrize("a,b,expected", [
    (2, 3, 5), (-1, 1, 0), (0, 0, 0),
])
def test_add(calculator, a, b, expected):
    assert calculator.add(a, b) == expected
```

### Markers

```python
@pytest.mark.slow
def test_large_dataset(): ...

@pytest.mark.skip(reason="Not implemented")
def test_future_feature(): ...

@pytest.mark.skipif(sys.platform == "win32", reason="Unix only")
def test_unix_permissions(): ...

@pytest.mark.xfail(reason="Known bug #123")
def test_known_bug(): ...
```

### Mocking

```python
from unittest.mock import patch, MagicMock

def test_send_email(mocker):
    mock_smtp = mocker.patch("myapp.email.smtplib.SMTP")
    send_welcome_email("user@test.com")
    mock_smtp.return_value.sendmail.assert_called_once()

def test_api_call(mocker):
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"users": [{"name": "Alice"}]}
    mocker.patch("myapp.service.requests.get", return_value=mock_response)
    users = get_users()
    assert len(users) == 1

@patch("myapp.service.database")
def test_save_user(mock_db):
    mock_db.save.return_value = True
    assert save_user({"name": "Alice"}) is True
    mock_db.save.assert_called_once()
```

### Assertions

```python
assert x == y
assert x != y
assert x in collection
assert isinstance(obj, MyClass)
assert 0.1 + 0.2 == pytest.approx(0.3)

with pytest.raises(ValueError) as exc_info:
    raise ValueError("bad")
assert "bad" in str(exc_info.value)
```

### Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `self.assertEqual()` | `assert x == y` | pytest rewrites give better output |
| Setup in `__init__` | `@pytest.fixture` | Lifecycle management |
| Global state | Fixture with `yield` | Proper cleanup |
| Huge test functions | Small focused tests | Easier debugging |

## Quick Reference

| Task | Command |
|------|---------|
| Run all | `pytest` |
| Run file | `pytest tests/test_login.py` |
| Run specific | `pytest tests/test_login.py::test_login_success` |
| By marker | `pytest -m slow` |
| By keyword | `pytest -k "login and not invalid"` |
| Verbose | `pytest -v` |
| Stop first fail | `pytest -x` |
| Last failed | `pytest --lf` |
| Coverage | `pytest --cov=myapp --cov-report=html` |
| Parallel | `pytest -n auto` (pytest-xdist) |

## pyproject.toml

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
markers = ["slow: slow tests", "integration: integration tests"]
addopts = "-v --tb=short"
```

## Deep Patterns

For production-grade patterns, see `reference/playbook.md`:

| Section | What's Inside |
|---------|--------------|
| §1 Config | pytest.ini + pyproject.toml with markers, coverage |
| §2 Fixtures | Scoping, factories, teardown, autouse, tmp_path |
| §3 Parametrize | Basic, with IDs, cartesian, indirect |
| §4 Mocking | pytest-mock, monkeypatch, spies, env vars |
| §5 Async | pytest-asyncio, async fixtures, async client |
| §6 Exceptions | pytest.raises(match=), warnings |
| §7 Markers & Plugins | Custom markers, collection hooks |
| §8 Class-Based | Nested classes, autouse setup |
| §9 CI/CD | GitHub Actions matrix, coverage gates |
| §10 Debugging Table | 10 common problems with fixes |
| §11 Best Practices | 15-item production checklist |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
