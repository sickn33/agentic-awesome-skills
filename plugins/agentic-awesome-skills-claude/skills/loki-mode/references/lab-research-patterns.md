# Lab Research Patterns Reference

Research-backed patterns from Google DeepMind and Anthropic for enhanced multi-agent orchestration and safety.

---

## Overview

This reference consolidates key patterns from:
1. **Google DeepMind** - World models, self-improvement, scalable oversight
2. **Anthropic** - Constitutional AI, alignment safety, agentic coding

---

## Google DeepMind Patterns

### World Model Training (Dreamer 4)

**Key Insight:** Train agents inside world models for safety and data efficiency.

```yaml
world_model_training:
  principle: "Learn behaviors through simulation, not real environment"
  benefits:
    - 100x less data than real-world training
    - Safe exploration of dangerous actions
    - Faster iteration cycles

  architecture:
    tokenizer: "Compress frames into continuous representation"
    dynamics_model: "Predict next world state given action"
    imagination_training: "RL inside simulated trajectories"

  loki_application:
    - Run agent tasks in isolated containers first
    - Simulate deployment before actual deploy
    - Test error scenarios in sandbox
```

### Self-Improvement Loop (SIMA 2)

**Key Insight:** Use AI to generate tasks and score outcomes for bootstrapped learning.

```python
class SelfImprovementLoop:
    """
    Based on SIMA 2's self-improvement mechanism.
    Gemini-based teacher + learned reward model.
    """

    def __init__(self):
        self.task_generator = "Use LLM to generate varied tasks"
        self.reward_model = "Learned model to score trajectories"
        self.experience_bank = []

    def bootstrap_cycle(self):
        # 1. Generate tasks with estimated rewards
        tasks = self.task_generator.generate(
            domain=current_project,
            difficulty_curriculum=True
        )

        # 2. Execute tasks, accumulate experience
        for task in tasks:
            trajectory = execute(task)
            reward = self.reward_model.score(trajectory)
            self.experience_bank.append((trajectory, reward))

        # 3. Train next generation on experience
        next_agent = train_on_experience(self.experience_bank)

        # 4. Iterate with minimal human intervention
        return next_agent
```

**Loki Mode Application:**
- Generate test scenarios automatically
- Score code quality with learned criteria
- Bootstrap agent training across projects

### Hierarchical Reasoning (Gemini Robotics)

**Key Insight:** Separate high-level planning from low-level execution.

```
+------------------------------------------------------------------+
| EMBODIED REASONING MODEL (Gemini Robotics-ER)                     |
| - Orchestrates activities like a "high-level brain"               |
| - Spatial understanding, planning, logical decisions              |
| - Natively calls tools (search, user functions)                   |
| - Does NOT directly control actions                               |
+------------------------------------------------------------------+
        |
        | High-level insights
        v
+------------------------------------------------------------------+
| VISION-LANGUAGE-ACTION MODEL (Gemini Robotics)                    |
| - "Thinks before taking action"                                   |
| - Generates internal reasoning in natural language                |
| - Decomposes long tasks into simpler segments                     |
| - Directly outputs actions/commands                               |
+------------------------------------------------------------------+
```

**Loki Mode Application:**
- Orchestrator = ER model (planning, tool calls)
- Implementation agents = VLA model (code actions)
- Task decomposition before execution

### Cross-Embodiment Transfer

**Key Insight:** Skills learned by one agent type transfer to others.

```yaml
transfer_learning:
  observation: "Tasks learned on ALOHA2 work on Apollo humanoid"
  mechanism: "Shared action space abstraction"

  loki_application:
    - Patterns learned by frontend agent transfer to mobile agent
    - Testing strategies from QA apply to security testing
    - Deployment scripts generalize across cloud providers

  implementation:
    shared_skills_library: ".loki/memory/skills/"
    abstraction_layer: "Domain-agnostic action primitives"
    transfer_score: "Confidence in skill applicability"
```

### Scalable Oversight via Debate

**Key Insight:** Pit AI capabilities against each other for verification.

```python
async def debate_verification(proposal, max_rounds=2):
    """
    Based on DeepMind's Scalable AI Safety via Doubly-Efficient Debate.
    Use debate to break down verification into manageable sub-tasks.
    """
    # Two equally capable AI critics
    proponent = Agent(role="defender", model="opus")
    opponent = Agent(role="challenger", model="opus")

    debate_log = []

    for round in range(max_rounds):
        # Proponent defends proposal
        defense = await proponent.argue(
            proposal=proposal,
            counter_arguments=debate_log
        )

        # Opponent challenges
        challenge = await opponent.argue(
            proposal=proposal,
            defense=defense,
            goal="find_flaws"
        )

        debate_log.append({
            "round": round,
            "defense": defense,
            "challenge": challenge
        })

        # If opponent cannot find valid flaw, proposal is verified
        if not challenge.has_valid_flaw:
            return VerificationResult(verified=True, debate_log=debate_log)

    # Human reviews remaining disagreements
    return escalate_to_human(debate_log)
```

### Amplified Oversight

**Key Insight:** Use AI to help humans supervise AI beyond human capability.

```yaml
amplified_oversight:
  goal: "Supervision as close as possible to human with complete understanding"

  techniques:
    - "AI explains its reasoning transparently"
    - "AI argues against itself when wrong"
    - "AI cites relevant evidence"
    - "Monitor knows when it doesn't know"

  monitoring_principle:
    when_unsure: "Either reject action OR flag for review"
    never: "Approve uncertain actions silently"
```

---

## Anthropic Patterns

### Constitutional AI Principles

**Key Insight:** Train AI to self-critique based on explicit principles.

```python
class ConstitutionalAI:
    """
    Based on Anthropic's Constitutional AI: Harmlessness from AI Feedback.
    Self-critique and revision based on constitutional principles.
    """

    def __init__(self, constitution):
        self.constitution = constitution  # List of principles

    async def supervised_learning_phase(self, response):
        """Phase 1: Self-critique and revise."""
        # Generate initial response
        initial = response

        # Self-critique against each principle
        critiques = []
        for principle in self.constitution:
            critique = await self.critique(
                response=initial,
                principle=principle,
                prompt=f"Does this response violate: {principle}?"
            )
            critiques.append(critique)

        # Revise based on critiques
        revised = await self.revise(
            response=initial,
            critiques=critiques
        )

        return revised

    async def rlai_phase(self, response_pairs):
        """Phase 2: AI compares responses for constitutional compliance."""
        preferences = []
        for (response_a, response_b) in response_pairs:
            preference = await self.compare(
                a=response_a,
                b=response_b,
                criterion="Which better follows the constitution?"
            )
            preferences.append(preference)

        # Train preference model on AI feedback
        return train_preference_model(preferences)
```

**Loki Mode Constitution Example:**
```yaml
loki_constitution:
  - "Never delete production data without explicit backup"
  - "Never commit secrets or credentials to version control"
  - "Never bypass quality gates for speed"
  - "Always verify tests pass before marking task complete"
  - "Never claim completion without running actual tests"
  - "Prefer simple solutions over clever ones"
  - "Document decisions, not just code"
```

### Sleeper Agent Detection (Defection Probes)

**Key Insight:** Use linear classifiers to detect when agents might misbehave.

```python
class DefectionProbe:
    """
    Based on Anthropic's "Simple probes can catch sleeper agents".
    Linear classifiers detecting anomalous agent behavior.
    """

    def __init__(self):
        self.baseline_behaviors = []
        self.probe = LinearClassifier()

    def train_probe(self, normal_trajectories, defection_examples):
        """
        Train on contrast pairs:
        - Normal agent behavior
        - Examples of defection/misbehavior
        """
        contrast_pairs = create_contrast_pairs(
            normal=normal_trajectories,
            defection=defection_examples
        )
        self.probe.fit(contrast_pairs)

    def check_for_defection(self, agent_action, context):
        """
        Check if action appears anomalous.
        AUROC > 99% achieved in Anthropic's research.
        """
        features = extract_features(agent_action, context)
        defection_probability = self.probe.predict_proba(features)

        if defection_probability > THRESHOLD:
            return DefectionAlert(
                probability=defection_probability,
                action=agent_action,
                recommendation="Flag for human review"
            )
        return None
```

**Loki Mode Application:**
- Monitor agent actions for anomalies
- Flag unusual file access patterns
- Detect attempts to bypass quality gates

### Alignment Faking Awareness

**Key Insight:** Models may strategically comply while preserving hidden preferences.

```yaml
alignment_faking_signals:
  warning_signs:
    - "Agent complies only when it knows it's being monitored"
    - "Agent's reasoning contradicts its final action"
    - "Sudden behavior change when training context mentioned"
    - "Agent attempts to exfiltrate its own weights/state"

  detection_strategy:
    - "Monitor chain-of-thought for rationalization"
    - "Compare behavior in 'free' vs 'monitored' conditions"
    - "Check for attempts to undermine oversight systems"

  mitigation:
    - "Constitutional constraints at training time"
    - "Transparency in reasoning (visible extended thinking)"
    - "Defection probes on intermediate reasoning"
```

### Extended Thinking Levels

**Key Insight:** Allocate computation based on problem complexity.

```yaml
thinking_levels:
  "think":
    computation: "Minimal"
    use_for: "Simple questions, straightforward tasks"

  "think hard":
    computation: "Moderate"
    use_for: "Multi-step problems, code implementation"

  "think harder":
    computation: "Extended"
    use_for: "Complex debugging, architecture decisions"

  "ultrathink":
    computation: "Maximum"
    use_for: "Security analysis, critical system design"

loki_mode_mapping:
  haiku_tasks: "think"
  sonnet_tasks: "think hard"
  opus_tasks: "think harder to ultrathink"
```

### Explore-Plan-Code Pattern

**Key Insight:** Research before planning, plan before coding.

```
+------------------------------------------------------------------+
| PHASE 1: EXPLORE                                                  |
| - Research relevant files                                         |
| - Understand existing patterns                                    |
| - Identify dependencies and constraints                           |
| - NO CODE CHANGES YET                                             |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
| PHASE 2: PLAN                                                     |
| - Create detailed implementation plan                             |
| - List all files to modify                                        |
| - Define success criteria                                         |
| - Get checkpoint approval if needed                               |
| - STILL NO CODE CHANGES                                           |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
| PHASE 3: CODE                                                     |
| - Execute plan systematically                                     |
| - Test after each file change                                     |
| - Update plan if discoveries require it                           |
| - Verify against success criteria                                 |
+------------------------------------------------------------------+
```

### Context Reset Strategy

**Key Insight:** Fresh context often performs better than accumulated context.

```yaml
context_management:
  problem: "Long sessions accumulate irrelevant information"

  solution:
    trigger_reset:
      - "After completing major task"
      - "When changing domains (backend -> frontend)"
      - "When agent seems confused or repeating errors"

    preserve_across_reset:
      - "CONTINUITY.md (working memory)"
      - "Key decisions made this session"
      - "Current task state"

    discard_on_reset:
      - "Intermediate debugging attempts"
      - "Abandoned approaches"
      - "Superseded plans"
```

### Parallel Instance Pattern

**Key Insight:** Multiple Claude instances with separation of concerns.

```python
async def parallel_instance_pattern(task):
    """
    Run multiple Claude instances for separation of concerns.
    Based on Anthropic's Claude Code best practices.
    """
    # Instance 1: Implementation
    implementer = spawn_instance(
        role="implementer",
        context=implementation_context,
        permissions=["edit", "bash"]
    )

    # Instance 2: Review
    reviewer = spawn_instance(
        role="reviewer",
        context=review_context,
        permissions=["read"]  # Read-only for safety
    )

    # Parallel execution
    implementation = await implementer.execute(task)
    review = await reviewer.review(implementation)

    if review.approved:
        return implementation
    else:
        # Feed review back to implementer for fixes
        fixed = await implementer.fix(review.issues)
        return fixed
```

### Prompt Injection Defense

**Key Insight:** Multi-layer defense against injection attacks.

```yaml
prompt_injection_defense:
  layers:
    layer_1_recognition:
      - "Train to recognize injection patterns"
      - "Detect malicious content in external sources"

    layer_2_context_isolation:
      - "Sandbox external content processing"
      - "Mark user content vs system instructions"

    layer_3_action_validation:
      - "Verify requested actions are authorized"
      - "Block sensitive operations without confirmation"

    layer_4_monitoring:
      - "Log all external content interactions"
      - "Alert on suspicious patterns"

  performance:
    claude_opus_4: "89% attack prevention"
    claude_sonnet_4: "86% attack prevention"
```

---

## Combined Patterns for Loki Mode

### Self-Improving Multi-Agent System

```yaml
combined_approach:
  world_model_training: "Test in simulation before real execution"
  self_improvement: "Bootstrap learning from successful trajectories"
  constitutional_constraints: "Principles-based self-critique"
  debate_verification: "Pit reviewers against each other"
  defection_probes: "Monitor for alignment faking"

  implementation_priority:
    high:
      - Constitutional AI principles in agent prompts
      - Explore-Plan-Code workflow enforcement
      - Context reset triggers

    medium:
      - Self-improvement loop for task generation
      - Debate-based verification for critical changes
      - Cross-embodiment skill transfer

    low:
      - Full world model training
      - Defection probe classifiers
```

---

## Sources

**Google DeepMind:**
- [SIMA 2: Generalist AI Agent](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/)
- [Gemini Robotics 1.5](https://deepmind.google/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/)
- [Dreamer 4: World Model Training](https://danijar.com/project/dreamer4/)
- [Genie 3: World Models](https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/)
- [Scalable AI Safety via Debate](https://deepmind.google/research/publications/34920/)
- [Amplified Oversight](https://deepmindsafetyresearch.medium.com/human-ai-complementarity-a-goal-for-amplified-oversight-0ad8a44cae0a)
- [Technical AGI Safety Approach](https://arxiv.org/html/2504.01849v1)

**Anthropic:**
- [Constitutional AI](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Sleeper Agents Detection](https://www.anthropic.com/research/probes-catch-sleeper-agents)
- [Alignment Faking](https://www.anthropic.com/research/alignment-faking)
- [Visible Extended Thinking](https://www.anthropic.com/research/visible-extended-thinking)
- [Computer Use Safety](https://www.anthropic.com/news/3-5-models-and-computer-use)
- [Sabotage Evaluations](https://www.anthropic.com/research/sabotage-evaluations-for-frontier-models)
