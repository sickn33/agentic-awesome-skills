# Tool Orchestration Patterns Reference

Research-backed patterns inspired by NVIDIA ToolOrchestra, OpenAI Agents SDK, and multi-agent coordination research.

---

## Overview

Effective tool orchestration requires four key innovations:
1. **Tracing Spans** - Hierarchical event tracking (OpenAI SDK pattern)
2. **Efficiency Metrics** - Track computational cost per task
3. **Reward Signals** - Outcome, efficiency, and preference rewards for learning
4. **Dynamic Selection** - Adapt agent count and types based on task complexity

---

## Tracing Spans Architecture (OpenAI SDK Pattern)

### Span Types

Every operation is wrapped in a typed span for observability:

```yaml
span_types:
  agent_span:     # Wraps entire agent execution
  generation_span: # Wraps LLM API calls
  function_span:  # Wraps tool/function calls
  guardrail_span: # Wraps validation checks
  handoff_span:   # Wraps agent-to-agent transfers
  custom_span:    # User-defined operations
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
      "to_agent": "backend-dev"
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
        └── {trace_id}.json # Archived traces
```

See `references/openai-patterns.md` for full tracing implementation.

---

## Efficiency Metrics System

### Why Track Efficiency?

ToolOrchestra achieves 70% cost reduction vs GPT-5 by explicitly optimizing for efficiency. Loki Mode should track:

- **Token usage** per task (input + output)
- **Wall clock time** per task
- **Agent spawns** per task
- **Retry count** before success

### Efficiency Tracking Schema

```json
{
  "task_id": "task-2026-01-06-001",
  "correlation_id": "session-abc123",
  "started_at": "2026-01-06T10:00:00Z",
  "completed_at": "2026-01-06T10:05:32Z",
  "metrics": {
    "wall_time_seconds": 332,
    "agents_spawned": 3,
    "total_agent_calls": 7,
    "retry_count": 1,
    "retry_reasons": ["test_failure"],
    "recovery_rate": 1.0,
    "model_usage": {
      "haiku": {"calls": 4, "est_tokens": 12000},
      "sonnet": {"calls": 2, "est_tokens": 8000},
      "opus": {"calls": 1, "est_tokens": 6000}
    }
  },
  "outcome": "success",
  "outcome_reason": "tests_passed_after_fix",
  "efficiency_score": 0.85,
  "efficiency_factors": ["used_haiku_for_tests", "parallel_review"],
  "quality_pillars": {
    "tool_selection_correct": true,
    "tool_reliability_rate": 0.95,
    "memory_retrieval_relevant": true,
    "goal_adherence": 1.0
  }
}
```

**Why capture these metrics?** (Based on multi-agent research)

1. **Capture intent, not just actions** ([Hashrocket](https://hashrocket.substack.com/p/the-hidden-cost-of-well-fix-it-later))
   - "UX debt turns into data debt" - recording actions without intent creates useless analytics

2. **Track recovery rate** ([Assessment Framework, arXiv 2512.12791](https://arxiv.org/html/2512.12791v1))
   - `recovery_rate = successful_retries / total_retries`
   - Paper found "perfect tool sequencing but only 33% policy adherence" - surface metrics mask failures

3. **Distributed tracing** ([Maxim AI](https://www.getmaxim.ai/articles/best-practices-for-building-production-ready-multi-agent-systems/))
   - `correlation_id`: Links all tasks in a session for end-to-end tracing
   - Essential for debugging multi-agent coordination failures

4. **Tool reliability separate from selection** ([Stanford/Harvard](https://www.marktechpost.com/2025/12/24/this-ai-paper-from-stanford-and-harvard-explains-why-most-agentic-ai-systems-feel-impressive-in-demos-and-then-completely-fall-apart-in-real-use/))
   - `tool_selection_correct`: Did we pick the right tool?
   - `tool_reliability_rate`: Did the tool work as expected? (tools can fail even when correctly selected)
   - Key insight: "Tool use reliability" is a primary demo-to-deployment gap

5. **Quality pillars beyond outcomes** ([Assessment Framework](https://arxiv.org/html/2512.12791v1))
   - `memory_retrieval_relevant`: Did episodic/semantic retrieval help?
   - `goal_adherence`: Did we stay on task? (0.0-1.0 score)

### Efficiency Score Calculation

```python
def calculate_efficiency_score(metrics, task_complexity):
    """
    Score from 0-1 where higher is more efficient.
    Based on ToolOrchestra's efficiency reward signal.
    """
    # Baseline expectations by complexity
    baselines = {
        "trivial": {"time": 60, "agents": 1, "retries": 0},
        "simple": {"time": 180, "agents": 2, "retries": 0},
        "moderate": {"time": 600, "agents": 4, "retries": 1},
        "complex": {"time": 1800, "agents": 8, "retries": 2},
        "critical": {"time": 3600, "agents": 12, "retries": 3}
    }

    baseline = baselines[task_complexity]

    # Calculate component scores (1.0 = at baseline, >1 = better, <1 = worse)
    time_score = min(1.0, baseline["time"] / max(metrics["wall_time_seconds"], 1))
    agent_score = min(1.0, baseline["agents"] / max(metrics["agents_spawned"], 1))
    retry_score = 1.0 - (metrics["retry_count"] / (baseline["retries"] + 3))

    # Weighted average (time matters most)
    return (time_score * 0.5) + (agent_score * 0.3) + (retry_score * 0.2)
```

### Standard Reason Codes

Use consistent codes to enable pattern analysis:

```yaml
outcome_reasons:
  success:
    - tests_passed_first_try
    - tests_passed_after_fix
    - review_approved
    - spec_validated
  partial:
    - tests_partial_pass
    - review_concerns_minor
    - timeout_partial_work
  failure:
    - tests_failed
    - review_blocked
    - dependency_missing
    - timeout_no_progress
    - error_unrecoverable

retry_reasons:
  - test_failure
  - lint_error
  - type_error
  - review_rejection
  - rate_limit
  - timeout
  - dependency_conflict

efficiency_factors:
  positive:
    - used_haiku_for_simple
    - parallel_execution
    - cached_result
    - first_try_success
    - spec_driven
  negative:
    - used_opus_for_simple
    - sequential_when_parallel_possible
    - multiple_retries
    - missing_context
    - unclear_requirements
```

### Storage Location

```
.loki/metrics/
├── efficiency/
│   ├── 2026-01-06.json      # Daily efficiency logs
│   └── aggregate.json        # Running averages by task type
└── rewards/
    ├── outcomes.json         # Task success/failure records
    └── preferences.json      # User preference signals
```

---

## Reward Signal Framework

### Three Reward Types (ToolOrchestra Pattern)

```
+------------------------------------------------------------------+
| 1. OUTCOME REWARD                                                 |
|    - Did the task succeed? Binary + quality grade                 |
|    - Signal: +1.0 (success), 0.0 (partial), -1.0 (failure)       |
+------------------------------------------------------------------+
| 2. EFFICIENCY REWARD                                              |
|    - Did we use resources wisely?                                 |
|    - Signal: 0.0 to 1.0 based on efficiency score                |
+------------------------------------------------------------------+
| 3. PREFERENCE REWARD                                              |
|    - Did the user like the approach/result?                       |
|    - Signal: Inferred from user actions (accept/reject/modify)   |
+------------------------------------------------------------------+
```

### Outcome Reward Implementation

```python
def calculate_outcome_reward(task_result):
    """
    Outcome reward based on task completion status.
    """
    if task_result.status == "completed":
        # Grade the quality of completion
        if task_result.tests_passed and task_result.review_passed:
            return 1.0  # Full success
        elif task_result.tests_passed:
            return 0.7  # Tests pass but review had concerns
        else:
            return 0.3  # Completed but with issues

    elif task_result.status == "partial":
        return 0.0  # Partial completion, no reward

    else:  # failed
        return -1.0  # Negative reward for failure
```

### Preference Reward Implementation

```python
def infer_preference_reward(task_result, user_actions):
    """
    Infer user preference from their actions after task completion.
    Based on implicit feedback patterns.
    """
    signals = []

    # Positive signals
    if "commit" in user_actions:
        signals.append(0.8)  # User committed our changes
    if "deploy" in user_actions:
        signals.append(1.0)  # User deployed our changes
    if "no_edits" in user_actions:
        signals.append(0.6)  # User didn't modify our output

    # Negative signals
    if "revert" in user_actions:
        signals.append(-1.0)  # User reverted our changes
    if "manual_fix" in user_actions:
        signals.append(-0.5)  # User had to fix our work
    if "retry_different" in user_actions:
        signals.append(-0.3)  # User asked for different approach

    # Neutral (no signal)
    if not signals:
        return None

    return sum(signals) / len(signals)
```

### Reward Aggregation for Learning

```python
def aggregate_rewards(outcome, efficiency, preference):
    """
    Combine rewards into single learning signal.
    Weights based on ToolOrchestra findings.
    """
    # Outcome is most important (must succeed)
    # Efficiency secondary (once successful, optimize)
    # Preference tertiary (align with user style)

    weights = {
        "outcome": 0.6,
        "efficiency": 0.25,
        "preference": 0.15
    }

    total = outcome * weights["outcome"]
    total += efficiency * weights["efficiency"]

    if preference is not None:
        total += preference * weights["preference"]
    else:
        # Redistribute weight if no preference signal
        total = total / (1 - weights["preference"])

    return total
```

---

## Dynamic Agent Selection

### Task Complexity Classification

```python
def classify_task_complexity(task):
    """
    Classify task to determine agent allocation.
    Based on ToolOrchestra's tool selection flexibility.
    """
    complexity_signals = {
        # File scope signals
        "single_file": -1,
        "few_files": 0,       # 2-5 files
        "many_files": +1,     # 6-20 files
        "system_wide": +2,    # 20+ files

        # Change type signals
        "typo_fix": -2,
        "bug_fix": 0,
        "feature": +1,
        "refactor": +1,
        "architecture": +2,

        # Domain signals
        "documentation": -1,
        "tests_only": 0,
        "frontend": 0,
        "backend": 0,
        "full_stack": +1,
        "infrastructure": +1,
        "security": +2,
    }

    score = 0
    for signal, weight in complexity_signals.items():
        if task.has_signal(signal):
            score += weight

    # Map score to complexity level
    if score <= -2:
        return "trivial"
    elif score <= 0:
        return "simple"
    elif score <= 2:
        return "moderate"
    elif score <= 4:
        return "complex"
    else:
        return "critical"
```

### Agent Allocation by Complexity

```yaml
# Agent allocation strategy
# Model selection: Opus=planning, Sonnet=development, Haiku=unit tests/monitoring
complexity_allocations:
  trivial:
    max_agents: 1
    planning: null         # No planning needed
    development: haiku
    testing: haiku
    review: skip           # No review needed for trivial
    parallel: false

  simple:
    max_agents: 2
    planning: null         # No planning needed
    development: haiku
    testing: haiku
    review: single         # One quick review
    parallel: false

  moderate:
    max_agents: 4
    planning: sonnet       # Sonnet for moderate planning
    development: sonnet
    testing: haiku         # Unit tests always haiku
    review: standard       # 3 parallel reviewers
    parallel: true

  complex:
    max_agents: 8
    planning: opus         # Opus ONLY for complex planning
    development: sonnet    # Sonnet for implementation
    testing: haiku         # Unit tests still haiku
    review: deep           # 3 reviewers + devil's advocate
    parallel: true

  critical:
    max_agents: 12
    planning: opus         # Opus for critical planning
    development: sonnet    # Sonnet for implementation
    testing: sonnet        # Functional/E2E tests with sonnet
    review: exhaustive     # Multiple review rounds
    parallel: true
    human_checkpoint: true # Pause for human review
```

### Dynamic Selection Algorithm

```python
def select_agents_for_task(task, available_agents):
    """
    Dynamically select agents based on task requirements.
    Inspired by ToolOrchestra's configurable tool selection.
    """
    complexity = classify_task_complexity(task)
    allocation = COMPLEXITY_ALLOCATIONS[complexity]

    # 1. Identify required agent types
    required_types = identify_required_agents(task)

    # 2. Filter to available agents of required types
    candidates = [a for a in available_agents if a.type in required_types]

    # 3. Score candidates by past performance
    for agent in candidates:
        agent.selection_score = get_agent_performance_score(
            agent,
            task_type=task.type,
            complexity=complexity
        )

    # 4. Select top N agents up to allocation limit
    candidates.sort(key=lambda a: a.selection_score, reverse=True)
    selected = candidates[:allocation["max_agents"]]

    # 5. Assign models based on complexity
    for agent in selected:
        if agent.role == "reviewer":
            agent.model = "opus"  # Always opus for reviews
        else:
            agent.model = allocation["model"]

    return selected

def get_agent_performance_score(agent, task_type, complexity):
    """
    Score agent based on historical performance on similar tasks.
    Uses reward signals from previous executions.
    """
    history = load_agent_history(agent.id)

    # Filter to similar tasks
    similar = [h for h in history
               if h.task_type == task_type
               and h.complexity == complexity]

    if not similar:
        return 0.5  # Neutral score if no history

    # Average past rewards
    return sum(h.aggregate_reward for h in similar) / len(similar)
```

---

## Tool Usage Analytics

### Track Tool Effectiveness

```json
{
  "tool_analytics": {
    "period": "2026-01-06",
    "by_tool": {
      "Grep": {
        "calls": 142,
        "success_rate": 0.89,
        "avg_result_quality": 0.82,
        "common_patterns": ["error handling", "function def"]
      },
      "Task": {
        "calls": 47,
        "success_rate": 0.94,
        "avg_efficiency": 0.76,
        "by_subagent_type": {
          "general-purpose": {"calls": 35, "success": 0.91},
          "Explore": {"calls": 12, "success": 1.0}
        }
      }
    },
    "insights": [
      "Explore agent 100% success - use more for codebase search",
      "Grep success drops to 0.65 for regex patterns - simplify searches"
    ]
  }
}
```

### Continuous Improvement Loop

```
+------------------------------------------------------------------+
| 1. COLLECT                                                        |
|    Record every task: agents used, tools called, outcome          |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
| 2. ANALYZE                                                        |
|    Weekly aggregation: What worked? What didn't?                  |
|    Identify patterns in high-reward vs low-reward tasks           |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
| 3. ADAPT                                                          |
|    Update selection algorithms based on analytics                 |
|    Store successful patterns in semantic memory                   |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
| 4. VALIDATE                                                       |
|    A/B test new selection strategies                              |
|    Measure efficiency improvement                                 |
+------------------------------------------------------------------+
          |
          +-----------> Loop back to COLLECT
```

---

## Integration with RARV Cycle

The orchestration patterns integrate with RARV at each phase:

```
REASON:
├── Check efficiency metrics for similar past tasks
├── Classify task complexity
└── Select appropriate agent allocation

ACT:
├── Dispatch agents according to allocation
├── Track start time and resource usage
└── Record tool calls and agent interactions

REFLECT:
├── Calculate outcome reward (did it work?)
├── Calculate efficiency reward (resource usage)
└── Log to metrics store

VERIFY:
├── Run verification checks
├── If failed: negative outcome reward, retry with learning
├── If passed: infer preference reward from user actions
└── Update agent performance scores
```

---

## Key Metrics Dashboard

Track these metrics in `.loki/metrics/dashboard.json`:

```json
{
  "dashboard": {
    "period": "rolling_7_days",
    "summary": {
      "tasks_completed": 127,
      "success_rate": 0.94,
      "avg_efficiency_score": 0.78,
      "avg_outcome_reward": 0.82,
      "avg_preference_reward": 0.71,
      "avg_recovery_rate": 0.87,
      "avg_goal_adherence": 0.93
    },
    "quality_pillars": {
      "tool_selection_accuracy": 0.91,
      "tool_reliability_rate": 0.93,
      "memory_retrieval_relevance": 0.84,
      "policy_adherence": 0.96
    },
    "trends": {
      "efficiency": "+12% vs previous week",
      "success_rate": "+3% vs previous week",
      "avg_agents_per_task": "-0.8 (improving)",
      "recovery_rate": "+5% vs previous week"
    },
    "top_performing_patterns": [
      "Haiku for unit tests (0.95 success, 0.92 efficiency)",
      "Explore agent for codebase search (1.0 success)",
      "Parallel review with opus (0.98 accuracy)"
    ],
    "areas_for_improvement": [
      "Complex refactors taking 2x expected time",
      "Security review efficiency below baseline",
      "Memory retrieval relevance below 0.85 target"
    ]
  }
}
```

---

## Multi-Dimensional Evaluation

Based on [Measurement Imbalance research (arXiv 2506.02064)](https://arxiv.org/abs/2506.02064):

> "Technical metrics dominate assessments (83%), while human-centered (30%), safety (53%), and economic (30%) remain peripheral"

**Loki Mode tracks four evaluation axes:**

| Axis | Metrics | Current Coverage |
|------|---------|------------------|
| **Technical** | success_rate, efficiency_score, recovery_rate | Full |
| **Human-Centered** | preference_reward, goal_adherence | Partial |
| **Safety** | policy_adherence, quality_gates_passed | Full (via review system) |
| **Economic** | model_usage, agents_spawned, wall_time | Full |

---

## Sources

**OpenAI Agents SDK:**
- [Agents SDK Documentation](https://openai.github.io/openai-agents-python/) - Core primitives: agents, handoffs, guardrails, tracing
- [Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) - Orchestration patterns
- [Building Agents Track](https://developers.openai.com/tracks/building-agents/) - Official developer guide
- [AGENTS.md Specification](https://agents.md/) - Standard for agent instructions
- [Tracing Documentation](https://openai.github.io/openai-agents-python/tracing/) - Span types and observability

**Efficiency & Orchestration:**
- [NVIDIA ToolOrchestra](https://github.com/NVlabs/ToolOrchestra) - Multi-turn tool orchestration with RL
- [ToolScale Dataset](https://huggingface.co/datasets/nvidia/ToolScale) - Training data synthesis

**Evaluation Frameworks:**
- [Assessment Framework for Agentic AI (arXiv 2512.12791)](https://arxiv.org/html/2512.12791v1) - Four-pillar evaluation model
- [Measurement Imbalance in Agentic AI (arXiv 2506.02064)](https://arxiv.org/abs/2506.02064) - Multi-dimensional evaluation
- [Adaptive Monitoring for Agentic AI (arXiv 2509.00115)](https://arxiv.org/abs/2509.00115) - AMDM algorithm

**Best Practices:**
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) - Simplicity, transparency, tool engineering
- [Maxim AI: Production Multi-Agent Systems](https://www.getmaxim.ai/articles/best-practices-for-building-production-ready-multi-agent-systems/) - Orchestration patterns, distributed tracing
- [UiPath: Agent Builder Best Practices](https://www.uipath.com/blog/ai/agent-builder-best-practices) - Single-responsibility, evaluations
- [Stanford/Harvard: Demo-to-Deployment Gap](https://www.marktechpost.com/2025/12/24/this-ai-paper-from-stanford-and-harvard-explains-why-most-agentic-ai-systems-feel-impressive-in-demos-and-then-completely-fall-apart-in-real-use/) - Tool reliability as key failure mode

**Safety & Reasoning:**
- [Chain of Thought Monitoring](https://openai.com/index/chain-of-thought-monitoring/) - CoT monitorability for safety
- [Agent Builder Safety](https://platform.openai.com/docs/guides/agent-builder-safety) - Human-in-loop patterns
- [Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/) - Industry standards (MCP, AGENTS.md, goose)
