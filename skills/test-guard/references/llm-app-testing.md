# Test Guard — LLM Application Rules

Three additional rules for projects that call LLM APIs, use agent/workflow frameworks (LangGraph, CrewAI, custom state machines), or wire up observability/telemetry (Langfuse, LangSmith, OpenTelemetry). Apply these on top of the nine core rules.

## Rule 10: Prompt tests — test the contract, not the content

Prompt text changes constantly; tests pinned to wording rot within a week. Don't assert specific phrasing.

Do test:

- The prompt template exists and loads without error (smoke test)
- Template variables are substituted correctly — no leftover `{placeholder}` markers
- The prompt contains required structural markers *if the caller parses them* (e.g., a JSON schema block, a delimiter the parser splits on)

## Rule 11: Observability is infrastructure

Don't unit-test telemetry wiring. The violation pattern is asserting a tracing/analytics mock's call arguments:

```python
# Violation — tests wiring, not behavior
mock_tracer.assert_called_once_with(session_id=..., tags=[...])
```

Mocking observability calls to *prevent side effects* during tests is fine and often necessary. Just don't assert on the mock's call args. If telemetry breaks, dashboards show it; a unit test asserting wiring only breaks refactors.

## Rule 12: Agent and flow tests test transitions

For agent frameworks and state machines: test that given a state plus an event, the flow reaches the correct next state with the correct fields set. Mock the LLM calls to return controlled responses.

Test: state in → state out.

Don't test: the exact prompt string passed to the LLM, the number of LLM calls made, or internal retry logic — those are implementation details (Rule 1) that change with every model upgrade.

A useful pattern is a table of transition cases (data-driven, Rule 3): starting state, mocked LLM response, expected resulting state.

## Severity

- **Must fix:** Rule 12 violations that assert prompt strings or call counts — they break on every model/prompt change
- **Should fix:** Rule 10 wording assertions
- **Worth noting:** Rule 11 — flag it, but don't block a small change on it
