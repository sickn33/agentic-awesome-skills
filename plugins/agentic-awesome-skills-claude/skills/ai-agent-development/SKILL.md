---
name: ai-agent-development
description: "AI agent development workflow for building autonomous agents, multi-agent systems, and agent orchestration with CrewAI, LangGraph, and custom agents."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# AI Agent Development Workflow

## Overview

Specialized workflow for building AI agents including single autonomous agents, multi-agent systems, agent orchestration, tool integration, and human-in-the-loop patterns.

## When to Use This Workflow

Use this workflow when:
- Building autonomous AI agents
- Creating multi-agent systems
- Implementing agent orchestration
- Adding tool integration to agents
- Setting up agent memory

## Workflow Phases

### Phase 1: Agent Design

#### Skills to Invoke
- `ai-agents-architect` - Agent architecture
- `autonomous-agents` - Autonomous patterns

#### Actions
1. Define agent purpose
2. Design agent capabilities
3. Plan tool integration
4. Design memory system
5. Define success metrics

#### Copy-Paste Prompts
```
Use @ai-agents-architect to design AI agent architecture
```

### Phase 2: Single Agent Implementation

#### Skills to Invoke
- `autonomous-agent-patterns` - Agent patterns
- `autonomous-agents` - Autonomous agents

#### Actions
1. Choose agent framework
2. Implement agent logic
3. Add tool integration
4. Configure memory
5. Test agent behavior

#### Copy-Paste Prompts
```
Use @autonomous-agent-patterns to implement single agent
```

### Phase 3: Multi-Agent System

#### Skills to Invoke
- `crewai` - CrewAI framework
- `multi-agent-patterns` - Multi-agent patterns

#### Actions
1. Define agent roles
2. Set up agent communication
3. Configure orchestration
4. Implement task delegation
5. Test coordination

#### Copy-Paste Prompts
```
Use @crewai to build multi-agent system with roles
```

### Phase 4: Agent Orchestration

#### Skills to Invoke
- `langgraph` - LangGraph orchestration
- `workflow-orchestration-patterns` - Orchestration

#### Actions
1. Design workflow graph
2. Implement state management
3. Add conditional branches
4. Configure persistence
5. Test workflows

#### Copy-Paste Prompts
```
Use @langgraph to create stateful agent workflows
```

### Phase 5: Tool Integration

#### Skills to Invoke
- `agent-tool-builder` - Tool building
- `tool-design` - Tool design

#### Actions
1. Identify tool needs
2. Design tool interfaces
3. Implement tools
4. Add error handling
5. Test tool usage

#### Copy-Paste Prompts
```
Use @agent-tool-builder to create agent tools
```

### Phase 6: Memory Systems

#### Skills to Invoke
- `agent-memory-systems` - Memory architecture
- `conversation-memory` - Conversation memory

#### Actions
1. Design memory structure
2. Implement short-term memory
3. Set up long-term memory
4. Add entity memory
5. Test memory retrieval

#### Copy-Paste Prompts
```
Use @agent-memory-systems to implement agent memory
```

### Phase 7: Evaluation

#### Skills to Invoke
- `agent-evaluation` - Agent evaluation
- `evaluation` - AI evaluation

#### Actions
1. Define evaluation criteria
2. Create test scenarios
3. Measure agent performance
4. Test edge cases
5. Iterate improvements

#### Copy-Paste Prompts
```
Use @agent-evaluation to evaluate agent performance
```

## Agent Architecture

```
User Input -> Planner -> Agent -> Tools -> Memory -> Response
              |          |        |        |
         Decompose   LLM Core  Actions  Short/Long-term
```

## Quality Gates

- [ ] Agent logic working
- [ ] Tools integrated
- [ ] Memory functional
- [ ] Orchestration tested
- [ ] Evaluation passing

## Related Workflow Bundles

- `ai-ml` - AI/ML development
- `rag-implementation` - RAG systems
- `workflow-automation` - Workflow patterns

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
