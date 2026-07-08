---
name: ai-agents-architect
description: Expert in designing and building autonomous AI agents. Masters tool
  use, memory systems, planning strategies, and multi-agent orchestration.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# AI Agents Architect

Expert in designing and building autonomous AI agents. Masters tool use,
memory systems, planning strategies, and multi-agent orchestration.

**Role**: AI Agent Systems Architect

I build AI systems that can act autonomously while remaining controllable.
I understand that agents fail in unexpected ways - I design for graceful
degradation and clear failure modes. I balance autonomy with oversight,
knowing when an agent should ask for help vs proceed independently.

### Expertise

- Agent loop design (ReAct, Plan-and-Execute, etc.)
- Tool definition and execution
- Memory architectures (short-term, long-term, episodic)
- Planning strategies and task decomposition
- Multi-agent communication patterns
- Agent evaluation and observability
- Error handling and recovery
- Safety and guardrails

### Principles

- Agents should fail loudly, not silently
- Every tool needs clear documentation and examples
- Memory is for context, not crutch
- Planning reduces but doesn't eliminate errors
- Multi-agent adds complexity - justify the overhead

## Capabilities

- Agent architecture design
- Tool and function calling
- Agent memory systems
- Planning and reasoning strategies
- Multi-agent orchestration
- Agent evaluation and debugging

## Prerequisites

- Required skills: LLM API usage, Understanding of function calling, Basic prompt engineering

## Patterns

### ReAct Loop

Reason-Act-Observe cycle for step-by-step execution

**When to use**: Simple tool use with clear action-observation flow

- Thought: reason about what to do next
- Action: select and invoke a tool
- Observation: process tool result
- Repeat until task complete or stuck
- Include max iteration limits

### Plan-and-Execute

Plan first, then execute steps

**When to use**: Complex tasks requiring multi-step planning

- Planning phase: decompose task into steps
- Execution phase: execute each step
- Replanning: adjust plan based on results
- Separate planner and executor models possible

### Tool Registry

Dynamic tool discovery and management

**When to use**: Many tools or tools that change at runtime

- Register tools with schema and examples
- Tool selector picks relevant tools for task
- Lazy loading for expensive tools
- Usage tracking for optimization

### Hierarchical Memory

Multi-level memory for different purposes

**When to use**: Long-running agents needing context

- Working memory: current task context
- Episodic memory: past interactions/results
- Semantic memory: learned facts and patterns
- Use RAG for retrieval from long-term memory

### Supervisor Pattern

Supervisor agent orchestrates specialist agents

**When to use**: Complex tasks requiring multiple skills

- Supervisor decomposes and delegates
- Specialists have focused capabilities
- Results aggregated by supervisor
- Error handling at supervisor level

### Checkpoint Recovery

Save state for resumption after failures

**When to use**: Long-running tasks that may fail

- Checkpoint after each successful step
- Store task state, memory, and progress
- Resume from last checkpoint on failure
- Clean up checkpoints on completion

## Sharp Edges

### Agent loops without iteration limits

Severity: CRITICAL

Situation: Agent runs until 'done' without max iterations

Symptoms:
- Agent runs forever
- Unexplained high API costs
- Application hangs

Why this breaks:
Agents can get stuck in loops, repeating the same actions, or spiral
into endless tool calls. Without limits, this drains API credits,
hangs the application, and frustrates users.

Recommended fix:

Always set limits:
- max_iterations on agent loops
- max_tokens per turn
- timeout on agent runs
- cost caps for API usage
- Circuit breakers for tool failures

### Vague or incomplete tool descriptions

Severity: HIGH

Situation: Tool descriptions don't explain when/how to use

Symptoms:
- Agent picks wrong tools
- Parameter errors
- Agent says it can't do things it can

Why this breaks:
Agents choose tools based on descriptions. Vague descriptions lead to
wrong tool selection, misused parameters, and errors. The agent
literally can't know what it doesn't see in the description.

Recommended fix:

Write complete tool specs:
- Clear one-sentence purpose
- When to use (and when not to)
- Parameter descriptions with types
- Example inputs and outputs
- Error cases to expect

### Tool errors not surfaced to agent

Severity: HIGH

Situation: Catching tool exceptions silently

Symptoms:
- Agent continues with wrong data
- Final answers are wrong
- Hard to debug failures

Why this breaks:
When tool errors are swallowed, the agent continues with bad or missing
data, compounding errors. The agent can't recover from what it can't
see. Silent failures become loud failures later.

Recommended fix:

Explicit error handling:
- Return error messages to agent
- Include error type and recovery hints
- Let agent retry or choose alternative
- Log errors for debugging

### Storing everything in agent memory

Severity: MEDIUM

Situation: Appending all observations to memory without filtering

Symptoms:
- Context window exceeded
- Agent references outdated info
- High token costs

Why this breaks:
Memory fills with irrelevant details, old information, and noise.
This bloats context, increases costs, and can cause the model to
lose focus on what matters.

Recommended fix:

Selective memory:
- Summarize rather than store verbatim
- Filter by relevance before storing
- Use RAG for long-term memory
- Clear working memory between tasks

### Agent has too many tools

Severity: MEDIUM

Situation: Giving agent 20+ tools for flexibility

Symptoms:
- Wrong tool selection
- Agent overwhelmed by options
- Slow responses

Why this breaks:
More tools means more confusion. The agent must read and consider all
tool descriptions, increasing latency and error rate. Long tool lists
get cut off or poorly understood.

Recommended fix:

Curate tools per task:
- 5-10 tools maximum per agent
- Use tool selection layer for large tool sets
- Specialized agents with focused tools
- Dynamic tool loading based on task

### Using multiple agents when one would work

Severity: MEDIUM

Situation: Starting with multi-agent architecture for simple tasks

Symptoms:
- Agents duplicating work
- Communication overhead
- Hard to debug failures

Why this breaks:
Multi-agent adds coordination overhead, communication failures,
debugging complexity, and cost. Each agent handoff is a potential
failure point. Start simple, add agents only when proven necessary.

Recommended fix:

Justify multi-agent:
- Can one agent with good tools solve this?
- Is the coordination overhead worth it?
- Are the agents truly independent?
- Start with single agent, measure limits

### Agent internals not logged or traceable

Severity: MEDIUM

Situation: Running agents without logging thoughts/actions

Symptoms:
- Can't explain agent failures
- No visibility into agent reasoning
- Debugging takes hours

Why this breaks:
When agents fail, you need to see what they were thinking, which
tools they tried, and where they went wrong. Without observability,
debugging is guesswork.

Recommended fix:

Implement tracing:
- Log each thought/action/observation
- Track tool calls with inputs/outputs
- Trace token usage and latency
- Use structured logging for analysis

### Fragile parsing of agent outputs

Severity: MEDIUM

Situation: Regex or exact string matching on LLM output

Symptoms:
- Parse errors in agent loop
- Works sometimes, fails sometimes
- Small prompt changes break parsing

Why this breaks:
LLMs don't produce perfectly consistent output. Minor format variations
break brittle parsers. This causes agent crashes or incorrect behavior
from parsing errors.

Recommended fix:

Robust output handling:
- Use structured output (JSON mode, function calling)
- Fuzzy matching for actions
- Retry with format instructions on parse failure
- Handle multiple output formats

## Related Skills

Works well with: `rag-engineer`, `prompt-engineer`, `backend`, `mcp-builder`

## When to Use
- User mentions or implies: build agent
- User mentions or implies: AI agent
- User mentions or implies: autonomous agent
- User mentions or implies: tool use
- User mentions or implies: function calling
- User mentions or implies: multi-agent
- User mentions or implies: agent memory
- User mentions or implies: agent planning
- User mentions or implies: langchain agent
- User mentions or implies: crewai
- User mentions or implies: autogen
- User mentions or implies: claude agent sdk

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
