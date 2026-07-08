# OpenAI Agent Patterns Reference

Research-backed patterns from OpenAI's Agents SDK, Deep Research, and autonomous agent frameworks.

---

## Overview

OpenAI's agent ecosystem provides four key architectural innovations for Loki Mode:

1. **Tracing Spans** - Hierarchical event tracking with span types
2. **Guardrails & Tripwires** - Input/output validation with early termination
3. **Handoff Callbacks** - Data preparation during agent transfers
4. **Multi-Tiered Fallbacks** - Model and workflow-level failure recovery

---

## Tracing Spans Architecture

### Span Types (Agents SDK Pattern)

Every operation is wrapped in a typed span for observability:

```yaml
span_types:
  agent_span:
    - Wraps entire agent execution
    - Contains: agent_name, instructions_hash, model

  generation_span:
    - Wraps LLM API calls
    - Contains: model, tokens_in, tokens_out, latency_ms

  function_span:
    - Wraps tool/function calls
    - Contains: function_name, arguments, result, success

  guardrail_span:
    - Wraps validation checks
    - Contains: guardrail_name, triggered, blocking

  handoff_span:
    - Wraps agent-to-agent transfers
    - Contains: from_agent, to_agent, context_passed

  custom_span:
    - User-defined operations
    - Contains: operation_name, metadata
```

### Hierarchical Trace Structure

```json
{
  "trace_id": "trace_abc123def456",
  "workflow_name": "implement_feature",
  "group_id": "session_xyz789",
  "spans": [
    {
      "span_id": "span_001",
      "parent_id": null,
      "type": "agent_span",
      "agent_name": "orchestrator",
      "started_at": "2026-01-07T10:00:00Z",
      "ended_at": "2026-01-07T10:05:00Z",
      "children": ["span_002", "span_003"]
    },
    {
      "span_id": "span_002",
      "parent_id": "span_001",
      "type": "guardrail_span",
      "guardrail_name": "input_validation",
      "triggered": false,
      "blocking": true
    },
    {
      "span_id": "span_003",
      "parent_id": "span_001",
      "type": "handoff_span",
      "from_agent": "orchestrator",
      "to_agent": "backend-dev",
      "context_passed": ["task_spec", "related_files"]
    }
  ]
}
```

### Storage Location

```
.loki/traces/
├── active/
│   └── {trace_id}.json     # Currently running traces
└── completed/
    └── {date}/
        └── {trace_id}.json # Archived traces by date
```

---

## Guardrails & Tripwires System

### Input Guardrails

Run **before** agent execution to validate user input:

```python
@input_guardrail(blocking=True)
async def validate_task_scope(input, context):
    """
    Blocks tasks outside project scope.
    Based on OpenAI Agents SDK pattern.
    """
    # Check if task references files outside project
    if references_external_paths(input):
        return GuardrailResult(
            tripwire_triggered=True,
            reason="Task references paths outside project root"
        )

    # Check for disallowed operations
    if contains_destructive_operation(input):
        return GuardrailResult(
            tripwire_triggered=True,
            reason="Destructive operation requires human approval"
        )

    return GuardrailResult(tripwire_triggered=False)
```

### Output Guardrails

Run **after** agent execution to validate results:

```python
@output_guardrail
async def validate_code_quality(output, context):
    """
    Blocks low-quality code output.
    """
    if output.type == "code":
        issues = run_static_analysis(output.content)
        critical = [i for i in issues if i.severity == "critical"]

        if critical:
            return GuardrailResult(
                tripwire_triggered=True,
                reason=f"Critical issues found: {critical}"
            )

    return GuardrailResult(tripwire_triggered=False)
```

### Execution Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| **Blocking** | Guardrail completes before agent starts | Sensitive operations, expensive models |
| **Parallel** | Guardrail runs concurrently with agent | Fast checks, acceptable token loss |

```python
# Blocking mode: prevents token consumption
@input_guardrail(blocking=True, run_in_parallel=False)
async def expensive_validation(input):
    # Agent won't start until this completes
    pass

# Parallel mode: faster but may waste tokens if fails
@input_guardrail(blocking=True, run_in_parallel=True)
async def fast_validation(input):
    # Runs alongside agent start
    pass
```

### Tripwire Exceptions

When tripwire triggers, execution halts immediately:

```python
class InputGuardrailTripwireTriggered(Exception):
    """Raised when input validation fails."""
    pass

class OutputGuardrailTripwireTriggered(Exception):
    """Raised when output validation fails."""
    pass

# In agent loop:
try:
    result = await run_agent(task)
except InputGuardrailTripwireTriggered as e:
    log_blocked_attempt(e)
    return early_exit(reason=str(e))
except OutputGuardrailTripwireTriggered as e:
    rollback_changes()
    return retry_with_constraints(e.constraints)
```

### Layered Defense Strategy

> "Think of guardrails as a layered defense mechanism. While a single one is unlikely to provide sufficient protection, using multiple, specialized guardrails together creates more resilient agents." - OpenAI Agents SDK

```yaml
guardrail_layers:
  layer_1_input:
    - scope_validation      # Is task within bounds?
    - pii_detection         # Contains sensitive data?
    - injection_detection   # Prompt injection attempt?

  layer_2_pre_execution:
    - cost_estimation       # Will this exceed budget?
    - dependency_check      # Are dependencies available?
    - conflict_detection    # Will this conflict with in-progress work?

  layer_3_output:
    - static_analysis       # Code quality issues?
    - secret_detection      # Secrets in output?
    - spec_compliance       # Matches OpenAPI spec?

  layer_4_post_action:
    - test_validation       # Tests pass?
    - review_approval       # Review passed?
    - deployment_safety     # Safe to deploy?
```

---

## Handoff Callbacks

### on_handoff Pattern

Prepare data when transferring between agents:

```python
async def on_handoff_to_backend_dev(handoff_context):
    """
    Called when orchestrator hands off to backend-dev agent.
    Fetches context the receiving agent will need.
    """
    # Pre-fetch relevant files
    relevant_files = await find_related_files(handoff_context.task)

    # Load architectural context
    architecture = await read_file(".loki/specs/architecture.md")

    # Get recent changes to affected areas
    recent_commits = await git_log(paths=relevant_files, limit=10)

    return HandoffData(
        files=relevant_files,
        architecture=architecture,
        recent_changes=recent_commits,
        constraints=handoff_context.constraints
    )

# Register callback
handoff(
    to_agent=backend_dev,
    on_handoff=on_handoff_to_backend_dev
)
```

### Handoff Context Transfer

```json
{
  "handoff_id": "ho_abc123",
  "from_agent": "orchestrator",
  "to_agent": "backend-dev",
  "timestamp": "2026-01-07T10:05:00Z",
  "context": {
    "task_id": "task-001",
    "goal": "Implement user authentication endpoint",
    "constraints": [
      "Use existing auth patterns from src/auth/",
      "Maintain backwards compatibility",
      "Add rate limiting"
    ],
    "pre_fetched": {
      "files": ["src/auth/middleware.ts", "src/routes/index.ts"],
      "architecture": "...",
      "recent_changes": [...]
    }
  },
  "return_expected": true,
  "timeout_seconds": 600
}
```

---

## Multi-Tiered Fallback System

### Model-Level Fallbacks

```python
async def execute_with_model_fallback(task, preferred_model):
    """
    Try preferred model, fall back to alternatives on failure.
    Based on OpenAI safety patterns.
    """
    fallback_chain = {
        "opus": ["sonnet", "haiku"],
        "sonnet": ["haiku", "opus"],
        "haiku": ["sonnet"]
    }

    models_to_try = [preferred_model] + fallback_chain.get(preferred_model, [])

    for model in models_to_try:
        try:
            result = await run_agent(task, model=model)
            if result.success:
                return result
        except RateLimitError:
            log_warning(f"Rate limit on {model}, trying fallback")
            continue
        except ModelUnavailableError:
            log_warning(f"{model} unavailable, trying fallback")
            continue

    # All models failed
    return escalate_to_human(task, reason="All model fallbacks exhausted")
```

### Workflow-Level Fallbacks

```python
async def execute_with_workflow_fallback(task):
    """
    If complex workflow fails, fall back to simpler operations.
    """
    # Try full workflow first
    try:
        return await full_implementation_workflow(task)
    except WorkflowError as e:
        log_warning(f"Full workflow failed: {e}")

    # Fall back to simpler approach
    try:
        return await simplified_workflow(task)
    except WorkflowError as e:
        log_warning(f"Simplified workflow failed: {e}")

    # Last resort: decompose and try piece by piece
    try:
        subtasks = decompose_task(task)
        results = []
        for subtask in subtasks:
            result = await execute_single_step(subtask)
            results.append(result)
        return combine_results(results)
    except Exception as e:
        return escalate_to_human(task, reason=f"All workflows failed: {e}")
```

### Fallback Decision Tree

```
Task Execution
    |
    +-- Try preferred approach
    |   |
    |   +-- Success? --> Done
    |   |
    |   +-- Rate limit? --> Try next model in chain
    |   |
    |   +-- Error? --> Try simpler workflow
    |
    +-- All workflows failed?
    |   |
    |   +-- Decompose into subtasks
    |   |
    |   +-- Execute piece by piece
    |
    +-- Still failing?
        |
        +-- Escalate to human
        +-- Log detailed failure context
        +-- Save state for resume
```

---

## Confidence-Based Human Escalation

### Confidence Scoring

```python
def calculate_confidence(task_result):
    """
    Score confidence 0-1 based on multiple signals.
    Low confidence triggers human review.
    """
    signals = []

    # Test coverage signal
    if task_result.test_coverage >= 0.9:
        signals.append(1.0)
    elif task_result.test_coverage >= 0.7:
        signals.append(0.7)
    else:
        signals.append(0.3)

    # Review consensus signal
    if task_result.review_unanimous:
        signals.append(1.0)
    elif task_result.review_majority:
        signals.append(0.7)
    else:
        signals.append(0.3)

    # Retry count signal
    retry_penalty = min(task_result.retry_count * 0.2, 0.8)
    signals.append(1.0 - retry_penalty)

    return sum(signals) / len(signals)

# Escalation threshold
CONFIDENCE_THRESHOLD = 0.6

if calculate_confidence(result) < CONFIDENCE_THRESHOLD:
    escalate_to_human(
        task,
        reason="Low confidence score",
        context=result
    )
```

### Automatic Escalation Triggers

```yaml
human_escalation_triggers:
  # Retry-based
  - condition: retry_count > 3
    action: pause_and_escalate
    reason: "Multiple failures indicate unclear requirements"

  # Domain-based
  - condition: domain in ["payments", "auth", "pii"]
    action: require_approval
    reason: "Sensitive domain requires human review"

  # Confidence-based
  - condition: confidence_score < 0.6
    action: pause_and_escalate
    reason: "Low confidence in solution quality"

  # Time-based
  - condition: wall_time > expected_time * 3
    action: pause_and_escalate
    reason: "Task taking much longer than expected"

  # Cost-based
  - condition: tokens_used > budget * 0.8
    action: pause_and_escalate
    reason: "Approaching token budget limit"
```

---

## AGENTS.md Integration

### Reading Target Project's AGENTS.md

```python
async def load_project_context():
    """
    Read AGENTS.md from target project if exists.
    Based on OpenAI/AAIF standard.
    """
    agents_md_locations = [
        "AGENTS.md",
        ".github/AGENTS.md",
        "docs/AGENTS.md"
    ]

    for location in agents_md_locations:
        if await file_exists(location):
            content = await read_file(location)
            return parse_agents_md(content)

    # No AGENTS.md found - use defaults
    return default_project_context()

def parse_agents_md(content):
    """
    Extract structured guidance from AGENTS.md.
    """
    sections = parse_markdown_sections(content)

    return ProjectContext(
        build_commands=sections.get("build", []),
        test_commands=sections.get("test", []),
        code_style=sections.get("code style", {}),
        architecture_notes=sections.get("architecture", ""),
        deployment_notes=sections.get("deployment", ""),
        security_notes=sections.get("security", "")
    )
```

### Context Priority

```
1. AGENTS.md (closest to current file, monorepo-aware)
2. CLAUDE.md (Claude-specific instructions)
3. .loki/CONTINUITY.md (session state)
4. Package-level documentation
5. README.md (general project info)
```

---

## Reasoning Model Guidance

### When to Use Extended Thinking

Based on OpenAI's o3/o4-mini patterns:

```yaml
use_extended_reasoning:
  always:
    - System architecture design
    - Security vulnerability analysis
    - Complex debugging (multi-file, unclear root cause)
    - API design decisions
    - Performance optimization strategy

  sometimes:
    - Code review (only for critical/complex changes)
    - Refactoring planning (when multiple approaches exist)
    - Integration design (when crossing system boundaries)

  never:
    - Simple bug fixes
    - Documentation updates
    - Unit test writing
    - Formatting/linting
    - File operations
```

### Backtracking Pattern

```python
async def execute_with_backtracking(task, max_backtracks=3):
    """
    Allow agent to backtrack and try different approaches.
    Based on Deep Research's adaptive planning.
    """
    attempts = []

    for attempt in range(max_backtracks + 1):
        # Generate approach considering previous failures
        approach = await plan_approach(
            task,
            failed_approaches=attempts
        )

        result = await execute_approach(approach)

        if result.success:
            return result

        # Record failed approach for learning
        attempts.append({
            "approach": approach,
            "failure_reason": result.error,
            "partial_progress": result.partial_output
        })

        # Backtrack: reset to clean state
        await rollback_to_checkpoint(task.checkpoint_id)

    return FailedResult(
        reason="Max backtracks exceeded",
        attempts=attempts
    )
```

---

## Session State Management

### Automatic State Persistence

```python
class Session:
    """
    Automatic conversation history and state management.
    Inspired by OpenAI Agents SDK Sessions.
    """

    def __init__(self, session_id):
        self.session_id = session_id
        self.state_file = f".loki/state/sessions/{session_id}.json"
        self.history = []
        self.context = {}

    async def save_state(self):
        state = {
            "session_id": self.session_id,
            "history": self.history,
            "context": self.context,
            "last_updated": now()
        }
        await write_json(self.state_file, state)

    async def load_state(self):
        if await file_exists(self.state_file):
            state = await read_json(self.state_file)
            self.history = state["history"]
            self.context = state["context"]

    async def add_turn(self, role, content, metadata=None):
        self.history.append({
            "role": role,
            "content": content,
            "metadata": metadata,
            "timestamp": now()
        })
        await self.save_state()
```

---

## Sources

**OpenAI Official:**
- [Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- [Building Agents Track](https://developers.openai.com/tracks/building-agents/)
- [AGENTS.md Specification](https://agents.md/)

**Deep Research & Reasoning:**
- [Introducing Deep Research](https://openai.com/index/introducing-deep-research/)
- [Deep Research System Card](https://cdn.openai.com/deep-research-system-card.pdf)
- [Introducing o3 and o4-mini](https://openai.com/index/introducing-o3-and-o4-mini/)
- [Reasoning Best Practices](https://platform.openai.com/docs/guides/reasoning-best-practices)

**Safety & Monitoring:**
- [Chain of Thought Monitoring](https://openai.com/index/chain-of-thought-monitoring/)
- [Agent Builder Safety](https://platform.openai.com/docs/guides/agent-builder-safety)
- [Computer-Using Agent](https://openai.com/index/computer-using-agent/)

**Standards & Interoperability:**
- [Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/)
- [OpenAI for Developers 2025](https://developers.openai.com/blog/openai-for-developers-2025/)
