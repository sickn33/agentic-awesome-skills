# Test Guard — Python / pytest Patterns

Concrete applications of the nine rules for pytest projects. Read this when reviewing or writing Python tests.

## Rule 2: Mock boundaries in Python

Justified mock targets:

- HTTP clients: `httpx`, `requests`, `aiohttp` (or use `respx` / `responses` instead of raw mocks)
- LLM SDK calls: `openai`, `anthropic`, `litellm.completion` and friends
- Database sessions, when the database is not the subject (see Rule 9)
- Filesystem I/O on external paths (`tmp_path` fixture is often better than mocking)
- Clock and randomness: `time.time`, `datetime.now`, `random` (prefer `freezegun` or injected clocks)

Unjustified mocks (common agent-generated violations):

- `MagicMock()` standing in for a Pydantic model or dataclass — construct the real thing
- Mocking internal utility functions to isolate a "unit"
- Mocking `json.loads` / `json.dumps` or other stdlib pure functions

## Rule 3: Parametrize

```python
# Violation: three copy-pasted tests differing by one value
def test_slug_lowercase(): ...
def test_slug_strips_spaces(): ...
def test_slug_handles_unicode(): ...

# Fix
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Hello World", "hello-world"),
        ("  padded  ", "padded"),
        ("Café Menu", "cafe-menu"),
    ],
)
def test_slugify_normalizes_input(raw, expected):
    assert slugify(raw) == expected
```

## Rule 8: Real Pydantic/dataclass instances

```python
# Wrong — hides field typos and validation errors
state = MagicMock()
state.user_id = "123"
state.status = "ACTIVE"

# Right — Pydantic validates the construction itself
state = UserState(user_id="123", status="ACTIVE")
```

If a model needs many fields, add a factory fixture or use `factory_boy` — don't fall back to `MagicMock`.

## Rule 9: Real database via fixtures

Use a fixture that applies real migrations (e.g., a session-scoped test database with `alembic upgrade head`), and function-scoped transactions rolled back per test. `pytest-postgresql`, `testcontainers`, or an SQLite-compatible fallback all work; the point is real schema, not a mocked session, whenever query or persistence logic is the subject.

## pytest-specific smells

- `assert mock.call_count == N` on anything internal — Rule 1 violation
- `@patch` stacks three or more deep — the test is coupled to implementation; restructure
- Asserting log output via `caplog` for messages no caller parses — Rule 4 violation
- Fixtures that build mocks of project classes — Rule 8 violation, make the fixture build real objects
