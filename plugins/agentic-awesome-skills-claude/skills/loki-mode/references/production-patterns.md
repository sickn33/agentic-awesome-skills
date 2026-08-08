# Production Patterns Reference

Practitioner-tested patterns from Hacker News discussions and real-world deployments. These patterns represent what actually works in production, not theoretical frameworks.

---

## Overview

This reference consolidates battle-tested insights from:
- HN discussions on autonomous agents in production (2025)
- Coding with LLMs practitioner experiences
- Simon Willison's Superpowers coding agent patterns
- Multi-agent orchestration real-world deployments

---

## What Actually Works in Production

### Human-in-the-Loop (HITL) is Non-Negotiable

**Key Insight:** "Zero companies don't have a human in the loop" for customer-facing applications.

```yaml
hitl_patterns:
  always_human:
    - Customer-facing responses
    - Financial transactions
    - Security-critical operations
    - Legal/compliance decisions

  automation_candidates:
    - Internal tooling
    - Developer assistance
    - Data preprocessing
    - Code generation (with review)

  implementation:
    - Classification layer routes to human vs automated
    - Confidence thresholds trigger escalation
    - Audit trails for all automated decisions
```

### Narrow Scope Wins

**Key Insight:** Successful agents operate within tightly constrained domains.

```yaml
scope_constraints:
  max_steps_before_review: 3-5
  task_characteristics:
    - Specific, well-defined objectives
    - Pre-classified inputs
    - Deterministic success criteria
    - Verifiable outputs

  successful_domains:
    - Email scanning and classification
    - Invoice processing
    - Code refactoring (bounded)
    - Documentation generation
    - Test writing

  failure_prone_domains:
    - Open-ended feature implementation
    - Novel algorithm design
    - Security-critical code
    - Cross-system integrations
```

### Confidence-Based Routing

**Key Insight:** Treat agents as preprocessors, not decision-makers.

```python
def confidence_based_routing(agent_output):
    """
    Route based on confidence, not capability.
    Based on production practitioner patterns.
    """
    confidence = agent_output.confidence_score

    if confidence >= 0.95:
        # High confidence: auto-approve with logging
        return AutoApprove(audit_log=True)

    elif confidence >= 0.70:
        # Medium confidence: quick human review
        return HumanReview(priority="normal", timeout="1h")

    elif confidence >= 0.40:
        # Low confidence: detailed human review
        return HumanReview(priority="high", context="full")

    else:
        # Very low confidence: escalate immediately
        return Escalate(reason="low_confidence", require_senior=True)
```

### Classification Before Automation

**Key Insight:** Separate inputs before processing.

```yaml
classification_first:
  step_1_classify:
    workable:
      - Clear requirements
      - Existing patterns
      - Test coverage available
    non_workable:
      - Ambiguous requirements
      - Novel architecture
      - Missing dependencies
    escalate_immediately:
      - Security concerns
      - Compliance requirements
      - Customer-facing changes

  step_2_route:
    workable: "Automated pipeline"
    non_workable: "Human clarification"
    escalate: "Senior review"
```

### Deterministic Outer Loops

**Key Insight:** Wrap agent outputs with rule-based validation.

```python
def deterministic_validation_loop(task, max_attempts=3):
    """
    Use LLMs only where genuine ambiguity exists.
    Wrap with deterministic rules.
    """
    for attempt in range(max_attempts):
        # LLM handles the ambiguous part
        output = agent.execute(task)

        # Deterministic validation (NOT LLM)
        validation_errors = []

        # Rule: Must have tests
        if not output.has_tests:
            validation_errors.append("Missing tests")

        # Rule: Must pass linting
        lint_result = run_linter(output.code)
        if lint_result.errors:
            validation_errors.append(f"Lint errors: {lint_result.errors}")

        # Rule: Must compile
        compile_result = compile_code(output.code)
        if not compile_result.success:
            validation_errors.append(f"Compile error: {compile_result.error}")

        # Rule: Tests must pass
        if output.has_tests:
            test_result = run_tests(output.code)
            if not test_result.all_passed:
                validation_errors.append(f"Test failures: {test_result.failures}")

        if not validation_errors:
            return output

        # Feed errors back for retry
        task = task.with_feedback(validation_errors)

    return FailedResult(reason="Max attempts exceeded")
```

---

## Context Engineering Patterns

### Context Curation Over Automatic Selection

**Key Insight:** Manually choose which files and information to provide.

```yaml
context_curation:
  principles:
    - "Less is more" - focused context beats comprehensive context
    - Manual selection outperforms automatic RAG
    - Remove outdated information aggressively

  anti_patterns:
    - Dumping entire codebase into context
    - Relying on automatic context selection
    - Accumulating conversation history indefinitely

  implementation:
    per_task_context:
      - 2-5 most relevant files
      - Specific functions, not entire modules
      - Recent changes only (last 1-2 days)
      - Clear success criteria

    context_budget:
      target: "< 10k tokens for context"
      reserve: "90% for model reasoning"
```

### Information Abstraction

**Key Insight:** Summarize rather than feeding full data.

```python
def abstract_for_agent(raw_data, task_context):
    """
    Design abstractions that preserve decision-relevant information.
    Based on practitioner insights.
    """
    # BAD: Feed 10,000 database rows
    # raw_data = db.query("SELECT * FROM users")

    # GOOD: Summarize to decision-relevant info
    summary = {
        "query_status": "success",
        "total_results": len(raw_data),
        "sample": raw_data[:5],
        "schema": extract_schema(raw_data),
        "statistics": {
            "null_count": count_nulls(raw_data),
            "unique_values": count_uniques(raw_data),
            "date_range": get_date_range(raw_data)
        }
    }

    return summary
```

### Separate Conversations Per Task

**Key Insight:** Fresh contexts yield better results than accumulated sessions.

```yaml
conversation_management:
  new_conversation_triggers:
    - Different domain (backend -> frontend)
    - New feature vs bug fix
    - After completing major task
    - When errors accumulate (3+ in row)

  preserve_across_sessions:
    - CLAUDE.md / CONTINUITY.md
    - Architectural decisions
    - Key constraints

  discard_between_sessions:
    - Debugging attempts
    - Abandoned approaches
    - Intermediate drafts
```

---

## Skills System Pattern

### On-Demand Skill Loading

**Key Insight:** Skills remain dormant until the model actively seeks them out.

```yaml
skills_architecture:
  core_interaction: "< 2k tokens"
  skill_loading: "On-demand via search"

  implementation:
    skill_discovery:
      - Shell script searches skill files
      - Model requests specific skills by name
      - Skills loaded only when needed

    skill_structure:
      name: "unique-skill-name"
      trigger: "Pattern that activates skill"
      content: "Detailed instructions"
      dependencies: ["other-skills"]

  benefits:
    - Minimal base context
    - Extensible without bloat
    - Skills can be updated independently
```

### Sub-Agents for Context Isolation

**Key Insight:** Prevent massive token waste by isolating context-noisy subtasks.

```python
async def context_isolated_search(query, codebase_path):
    """
    Use sub-agent for grep/search to prevent context pollution.
    Based on Simon Willison's patterns.
    """
    # Main agent stays focused
    # Sub-agent handles noisy file searching

    search_agent = spawn_subagent(
        role="codebase-searcher",
        context_limit="10k tokens",
        permissions=["read-only"]
    )

    results = await search_agent.execute(
        task=f"Find files related to: {query}",
        codebase=codebase_path
    )

    # Return only relevant paths, not full content
    return FilteredResults(
        paths=results.relevant_files[:10],
        summaries=results.file_summaries,
        confidence=results.relevance_scores
    )
```

---

## Planning Before Execution

### Explicit Plan-Then-Code Workflow

**Key Insight:** Have models articulate detailed plans without immediately writing code.

```yaml
plan_then_code:
  phase_1_planning:
    outputs:
      - spec.md: "Detailed requirements"
      - todo.md: "Tagged tasks [BUG], [FEAT], [REFACTOR]"
      - approach.md: "Implementation strategy"
    constraints:
      - NO CODE in this phase
      - Human review before proceeding
      - Clear success criteria

  phase_2_review:
    checks:
      - Plan addresses all requirements
      - Approach is feasible
      - No missing dependencies
      - Tests are specified

  phase_3_implementation:
    constraints:
      - Follow plan exactly
      - One task at a time
      - Test after each change
      - Report deviations immediately
```

---

## Multi-Agent Orchestration Patterns

### Event-Driven Coordination

**Key Insight:** Move beyond synchronous prompt chaining to asynchronous, decoupled systems.

```yaml
event_driven_orchestration:
  problems_with_synchronous:
    - Doesn't scale
    - Mixes orchestration with prompt logic
    - Single failure breaks entire chain
    - No retry/recovery mechanism

  async_architecture:
    message_queue:
      - Agents communicate via events
      - Decoupled execution
      - Natural retry/dead-letter handling

    state_management:
      - Persistent task state
      - Checkpoint/resume capability
      - Clear ownership of data

    error_handling:
      - Per-agent retry policies
      - Circuit breakers
      - Graceful degradation
```

### Policy-First Enforcement

**Key Insight:** Govern agent behavior at runtime, not just training time.

```python
class PolicyEngine:
    """
    Runtime governance for agent behavior.
    Based on autonomous control plane patterns.
    """

    def __init__(self, policies):
        self.policies = policies

    async def enforce(self, agent_action, context):
        for policy in self.policies:
            result = await policy.evaluate(agent_action, context)

            if result.blocked:
                return BlockedAction(
                    reason=result.reason,
                    policy=policy.name,
                    remediation=result.suggested_action
                )

            if result.modified:
                agent_action = result.modified_action

        return AllowedAction(agent_action)

# Example policies
policies = [
    NoProductionDataDeletion(),
    NoSecretsInCode(),
    MaxTokenBudget(limit=100000),
    RequireTestsForCode(),
    BlockExternalNetworkCalls(in_sandbox=True)
]
```

### Simulation Layer

**Key Insight:** Evaluate changes before deploying to real environment.

```yaml
simulation_layer:
  purpose: "Test agent behavior in safe environment"

  implementation:
    sandbox_environment:
      - Isolated container
      - Mocked external services
      - Synthetic data
      - Full audit logging

    validation_checks:
      - Run tests in sandbox first
      - Compare outputs to expected
      - Check for policy violations
      - Measure resource consumption

    promotion_criteria:
      - All tests pass
      - No policy violations
      - Resource usage within limits
      - Human approval (for sensitive changes)
```

---

## Evaluation and Benchmarking

### Problems with Current Benchmarks

**Key Insight:** LLM-as-judge creates shared blind spots.

```yaml
benchmark_problems:
  llm_judge_issues:
    - Same architecture = same failure modes
    - Math errors accepted as correct
    - "Do-nothing" baseline passes 38% of time

  contamination:
    - Published benchmarks become training targets
    - Overfitting to specific datasets
    - Inflated scores don't reflect real performance

  solutions:
    held_back_sets: "90% public, 10% private"
    human_evaluation: "Final published results require humans"
    production_testing: "A/B tests measure actual value"
    objective_outcomes: "Simulated environments with verifiable results"
```

### Practical Evaluation Approach

```python
def evaluate_agent_change(before_agent, after_agent, task_set):
    """
    Production-oriented evaluation.
    Based on HN practitioner recommendations.
    """
    results = {
        "before": [],
        "after": [],
        "human_preference": []
    }

    for task in task_set:
        # Run both agents
        before_result = before_agent.execute(task)
        after_result = after_agent.execute(task)

        # Objective metrics (NOT LLM-judged)
        results["before"].append({
            "tests_pass": run_tests(before_result),
            "lint_clean": run_linter(before_result),
            "time_taken": before_result.duration,
            "tokens_used": before_result.tokens
        })

        results["after"].append({
            "tests_pass": run_tests(after_result),
            "lint_clean": run_linter(after_result),
            "time_taken": after_result.duration,
            "tokens_used": after_result.tokens
        })

        # Sample for human review
        if random.random() < 0.1:  # 10% sample
            results["human_preference"].append({
                "task": task,
                "before": before_result,
                "after": after_result,
                "pending_review": True
            })

    return EvaluationReport(results)
```

---

## Cost and Token Economics

### Real-World Cost Patterns

```yaml
cost_patterns:
  claude_code:
    heavy_use: "$25/1-2 hours on large codebases"
    api_range: "$1-5/hour depending on efficiency"
    max_tier: "$200/month often needs 2-3 subscriptions"

  token_economics:
    sub_agents_multiply_cost: "Each duplicates context"
    example: "5-task parallel job = 50,000+ tokens per subtask"

  optimization:
    context_isolation: "Use sub-agents for noisy tasks"
    information_abstraction: "Summarize, don't dump"
    fresh_conversations: "Reset after major tasks"
    skill_on_demand: "Load only when needed"
```

---

## Sources

**Hacker News Discussions:**
- [What Actually Works in Production for Autonomous Agents](https://news.ycombinator.com/item?id=44623207)
- [Coding with LLMs in Summer 2025](https://news.ycombinator.com/item?id=44623953)
- [Superpowers: How I'm Using Coding Agents](https://news.ycombinator.com/item?id=45547344)
- [Claude Code Experience After Two Weeks](https://news.ycombinator.com/item?id=44596472)
- [AI Agent Benchmarks Are Broken](https://news.ycombinator.com/item?id=44531697)
- [How to Orchestrate Multi-Agent Workflows](https://news.ycombinator.com/item?id=45955997)
- [Context Engineering vs Prompt Engineering](https://news.ycombinator.com/item?id=44427757)

**Show HN Projects:**
- [Self-Evolving Agents Repository](https://news.ycombinator.com/item?id=45099226)
- [Package Manager for Agent Skills](https://news.ycombinator.com/item?id=46422264)
- [Wispbit - AI Code Review Agent](https://news.ycombinator.com/item?id=44722603)
- [Agtrace - Monitoring for AI Coding Agents](https://news.ycombinator.com/item?id=46425670)
