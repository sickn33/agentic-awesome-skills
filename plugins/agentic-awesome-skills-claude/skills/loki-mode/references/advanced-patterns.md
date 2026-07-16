# Advanced Agentic Patterns Reference

Research-backed patterns from 2025-2026 literature for enhanced multi-agent orchestration.

---

## Memory Architecture (MIRIX/A-Mem/MemGPT Research)

### Three-Layer Memory System

```
+------------------------------------------------------------------+
| EPISODIC MEMORY (Specific Events)                                 |
| - What happened, when, where                                      |
| - Full interaction traces with timestamps                         |
| - Stored in: .loki/memory/episodic/                              |
+------------------------------------------------------------------+
| SEMANTIC MEMORY (Generalized Knowledge)                           |
| - Abstracted patterns and facts                                   |
| - Context-independent knowledge                                   |
| - Stored in: .loki/memory/semantic/                              |
+------------------------------------------------------------------+
| PROCEDURAL MEMORY (Learned Skills)                                |
| - How to do things                                                |
| - Successful action sequences                                     |
| - Stored in: .loki/memory/skills/                                |
+------------------------------------------------------------------+
```

### Episodic-to-Semantic Consolidation

**Protocol:** After completing tasks, consolidate specific experiences into general knowledge.

```python
def consolidate_memory(task_result):
    """
    Transform episodic (what happened) to semantic (how things work).
    Based on MemGPT and Voyager patterns.
    """
    # 1. Store raw episodic trace
    episodic_entry = {
        "timestamp": now(),
        "task_id": task_result.id,
        "context": task_result.context,
        "actions": task_result.action_log,
        "outcome": task_result.outcome,
        "errors": task_result.errors
    }
    save_to_episodic(episodic_entry)

    # 2. Extract generalizable patterns
    if task_result.success:
        pattern = extract_pattern(task_result)
        if pattern.is_generalizable():
            semantic_entry = {
                "pattern": pattern.description,
                "conditions": pattern.when_to_apply,
                "actions": pattern.steps,
                "confidence": pattern.success_rate,
                "source_episodes": [task_result.id]
            }
            save_to_semantic(semantic_entry)

    # 3. If error, create anti-pattern
    if task_result.errors:
        anti_pattern = {
            "what_failed": task_result.errors[0].message,
            "why_failed": analyze_root_cause(task_result),
            "prevention": generate_prevention_rule(task_result),
            "severity": classify_severity(task_result.errors)
        }
        save_to_learnings(anti_pattern)
```

### Zettelkasten-Inspired Note Linking (A-Mem Pattern)

Each memory note is atomic and linked to related notes:

```json
{
  "id": "note-2026-01-06-001",
  "content": "Express route handlers need explicit return types in strict mode",
  "type": "semantic",
  "links": [
    {"to": "note-2026-01-05-042", "relation": "derived_from"},
    {"to": "note-2026-01-06-003", "relation": "related_to"}
  ],
  "tags": ["typescript", "express", "strict-mode"],
  "confidence": 0.95,
  "usage_count": 12
}
```

---

## Multi-Agent Reflexion (MAR Pattern)

### Problem: Degeneration-of-Thought

Single-agent self-critique leads to repeating the same flawed reasoning across iterations.

### Solution: Structured Debate Among Persona-Based Critics

```
+------------------+     +------------------+     +------------------+
| IMPLEMENTER      |     | SKEPTIC          |     | ADVOCATE         |
| (Creates work)   | --> | (Challenges it)  | --> | (Defends merits) |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------------------------------------------------------+
| SYNTHESIZER                                                       |
| - Weighs all perspectives                                         |
| - Identifies valid concerns vs. false negatives                   |
| - Produces final verdict with evidence                            |
+------------------------------------------------------------------+
```

### Anti-Sycophancy Protocol (CONSENSAGENT)

**Problem:** Agents reinforce each other's responses instead of critically engaging.

**Solution:**

```python
def anti_sycophancy_review(implementation, reviewers):
    """
    Prevent reviewers from just agreeing with each other.
    Based on CONSENSAGENT research.
    """
    # 1. Independent review phase (no visibility of other reviews)
    independent_reviews = []
    for reviewer in reviewers:
        review = reviewer.review(
            implementation,
            visibility="blind",  # Cannot see other reviews
            prompt_suffix="Be skeptical. List specific concerns."
        )
        independent_reviews.append(review)

    # 2. Debate phase (now reveal reviews)
    if has_disagreement(independent_reviews):
        debate_result = structured_debate(
            reviews=independent_reviews,
            max_rounds=2,
            require_evidence=True  # Must cite specific code/lines
        )
    else:
        # All agreed - run devil's advocate check
        devil_review = devil_advocate_agent.review(
            implementation,
            prompt="Find problems the other reviewers missed. Be contrarian."
        )
        independent_reviews.append(devil_review)

    # 3. Synthesize with validity check
    return synthesize_with_validity_alignment(independent_reviews)

def synthesize_with_validity_alignment(reviews):
    """
    Research shows validity-aligned reasoning most strongly predicts improvement.
    """
    findings = []
    for review in reviews:
        for concern in review.concerns:
            findings.append({
                "concern": concern.description,
                "evidence": concern.code_reference,  # Must have evidence
                "severity": concern.severity,
                "is_valid": verify_concern_is_actionable(concern)
            })

    # Filter to only valid, evidenced concerns
    return [f for f in findings if f["is_valid"] and f["evidence"]]
```

### Heterogeneous Team Composition

**Research finding:** Diverse teams outperform homogeneous ones by 4-6%.

```yaml
review_team:
  - role: "security_analyst"
    model: opus
    expertise: ["OWASP", "auth", "injection"]
    personality: "paranoid"

  - role: "performance_engineer"
    model: sonnet
    expertise: ["complexity", "caching", "async"]
    personality: "pragmatic"

  - role: "maintainability_advocate"
    model: opus
    expertise: ["SOLID", "patterns", "readability"]
    personality: "perfectionist"
```

---

## Hierarchical Planning (GoalAct/TMS Patterns)

### Global Planning with Hierarchical Execution

**Research:** GoalAct achieved 12.22% improvement in success rate using this pattern.

```
+------------------------------------------------------------------+
| GLOBAL PLANNER                                                    |
| - Maintains overall goal and strategy                             |
| - Continuously updates plan based on progress                     |
| - Decomposes into high-level skills                               |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
| HIGH-LEVEL SKILLS                                                 |
| - searching, coding, testing, writing, deploying                  |
| - Each skill has defined entry/exit conditions                    |
| - Reduces planning complexity at execution level                  |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
| LOCAL EXECUTORS                                                   |
| - Execute specific actions within skill context                   |
| - Report progress back to global planner                          |
| - Can request skill escalation if blocked                         |
+------------------------------------------------------------------+
```

### Thought Management System (TMS)

**For long-horizon tasks:**

```python
class ThoughtManagementSystem:
    """
    Based on TMS research for long-horizon autonomous tasks.
    Enables dynamic prioritization and adaptive strategy.
    """

    def __init__(self, completion_promise):
        self.goal_hierarchy = self.decompose_goal(completion_promise)
        self.active_thoughts = PriorityQueue()
        self.completed_thoughts = []
        self.blocked_thoughts = []

    def decompose_goal(self, goal):
        """
        Hierarchical goal decomposition with self-critique.
        """
        # Level 0: Ultimate goal
        hierarchy = {"goal": goal, "subgoals": []}

        # Level 1: Phase-level subgoals
        phases = self.identify_phases(goal)
        for phase in phases:
            phase_node = {"goal": phase, "subgoals": []}

            # Level 2: Task-level subgoals
            tasks = self.identify_tasks(phase)
            for task in tasks:
                phase_node["subgoals"].append({"goal": task, "subgoals": []})

            hierarchy["subgoals"].append(phase_node)

        return hierarchy

    def iterate(self):
        """
        Single iteration with self-critique.
        """
        # 1. Select highest priority thought
        thought = self.active_thoughts.pop()

        # 2. Execute thought
        result = self.execute(thought)

        # 3. Self-critique: Did this make progress?
        critique = self.self_critique(thought, result)

        # 4. Adapt strategy based on critique
        if critique.made_progress:
            self.completed_thoughts.append(thought)
            self.generate_next_thoughts(thought, result)
        elif critique.is_blocked:
            self.blocked_thoughts.append(thought)
            self.escalate_or_decompose(thought)
        else:
            # No progress, not blocked - need different approach
            thought.attempts += 1
            thought.alternative_strategy = critique.suggested_alternative
            self.active_thoughts.push(thought)
```

---

## Iter-VF: Iterative Verification-First

**Key insight:** Verify the extracted answer only, not the whole thinking process.

```python
def iterative_verify_first(task, max_iterations=3):
    """
    Based on Iter-VF research: verify answer, maintain Markovian process.
    Avoids context overflow and error accumulation.
    """
    for iteration in range(max_iterations):
        # 1. Generate solution
        solution = generate_solution(task)

        # 2. Extract concrete answer/output
        answer = extract_answer(solution)

        # 3. Verify ONLY the answer (not reasoning chain)
        verification = verify_answer(
            answer=answer,
            spec=task.spec,
            tests=task.tests
        )

        if verification.passes:
            return solution

        # 4. Markovian retry: fresh context with just error info
        task = create_fresh_task(
            original=task,
            error=verification.error,
            attempt=iteration + 1
            # NOTE: Do NOT include previous reasoning chain
        )

    return FailedResult(task, "Max iterations reached")
```

---

## Collaboration Structures

### When to Use Each Structure

| Structure | Use When | Loki Mode Application |
|-----------|----------|----------------------|
| **Centralized** | Need consistency, single source of truth | Orchestrator for phase management |
| **Decentralized** | Need fault tolerance, parallel execution | Agent swarms for implementation |
| **Hierarchical** | Complex tasks with clear decomposition | Global planner -> Skill -> Executor |

### Coopetition Pattern

**Agents compete on alternatives, cooperate on consensus:**

```python
def coopetition_decision(agents, decision_point):
    """
    Competition phase: Generate diverse alternatives
    Cooperation phase: Reach consensus on best option
    """
    # COMPETITION: Each agent proposes solution independently
    proposals = []
    for agent in agents:
        proposal = agent.propose(
            decision_point,
            visibility="blind"  # No peeking at other proposals
        )
        proposals.append(proposal)

    # COOPERATION: Collaborative evaluation
    if len(set(p.approach for p in proposals)) == 1:
        # Unanimous - likely good solution
        return proposals[0]

    # Multiple approaches - structured debate
    for proposal in proposals:
        proposal.pros = evaluate_pros(proposal)
        proposal.cons = evaluate_cons(proposal)
        proposal.evidence = gather_evidence(proposal)

    # Vote with reasoning requirement
    winner = ranked_choice_vote(
        proposals,
        require_justification=True
    )

    return winner
```

---

## Progressive Complexity Escalation

**Start simple, escalate only when needed:**

```
Level 1: Single Agent, Direct Execution
   |
   +-- Success? --> Done
   |
   +-- Failure? --> Escalate
           |
           v
Level 2: Single Agent + Self-Verification Loop
   |
   +-- Success? --> Done
   |
   +-- Failure after 3 attempts? --> Escalate
           |
           v
Level 3: Multi-Agent Review
   |
   +-- Success? --> Done
   |
   +-- Persistent issues? --> Escalate
           |
           v
Level 4: Hierarchical Planning + Decomposition
   |
   +-- Success? --> Done
   |
   +-- Fundamental blocker? --> Human escalation
```

---

## Key Research Findings Summary

### What Works

1. **Heterogeneous teams** outperform homogeneous by 4-6%
2. **Iter-VF** (verify answer only) prevents context overflow
3. **Episodic-to-semantic consolidation** enables genuine learning
4. **Anti-sycophancy measures** (blind review, devil's advocate) improve accuracy 30%+
5. **Global planning** with local execution improves success rate 12%+

### What Doesn't Work

1. **Deep debate chains** - diminishing returns after 1-2 rounds
2. **Confidence visibility** - causes over-confidence cascades
3. **Full reasoning chain review** - leads to error accumulation
4. **Homogeneous reviewer teams** - miss diverse failure modes
5. **Over-engineered orchestration** - model upgrades outpace gains

---

## Sources

- [Multi-Agent Collaboration Mechanisms Survey](https://arxiv.org/abs/2501.06322)
- [CONSENSAGENT: Anti-Sycophancy Framework](https://aclanthology.org/2025.findings-acl.1141/)
- [GoalAct: Global Planning + Hierarchical Execution](https://arxiv.org/abs/2504.16563)
- [A-Mem: Agentic Memory System](https://arxiv.org/html/2502.12110v11)
- [Multi-Agent Reflexion (MAR)](https://arxiv.org/html/2512.20845)
- [Iter-VF: Iterative Verification-First](https://arxiv.org/html/2511.21734v1)
- [Awesome Agentic Patterns](https://github.com/nibzard/awesome-agentic-patterns)
