---
name: ai-ml
description: "AI and machine learning workflow covering LLM application development, RAG implementation, agent architecture, ML pipelines, and AI-powered features."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# AI/ML Workflow Bundle

## Overview

Comprehensive AI/ML workflow for building LLM applications, implementing RAG systems, creating AI agents, and developing machine learning pipelines. This bundle orchestrates skills for production AI development.

## When to Use This Workflow

Use this workflow when:
- Building LLM-powered applications
- Implementing RAG (Retrieval-Augmented Generation)
- Creating AI agents
- Developing ML pipelines
- Adding AI features to applications
- Setting up AI observability

## Workflow Phases

### Phase 1: AI Application Design

#### Skills to Invoke
- `ai-product` - AI product development
- `ai-engineer` - AI engineering
- `ai-agents-architect` - Agent architecture
- `llm-app-patterns` - LLM patterns

#### Actions
1. Define AI use cases
2. Choose appropriate models
3. Design system architecture
4. Plan data flows
5. Define success metrics

#### Copy-Paste Prompts
```
Use @ai-product to design AI-powered features
```

```
Use @ai-agents-architect to design multi-agent system
```

### Phase 2: LLM Integration

#### Skills to Invoke
- `llm-application-dev-ai-assistant` - AI assistant development
- `llm-application-dev-langchain-agent` - LangChain agents
- `llm-application-dev-prompt-optimize` - Prompt engineering
- `gemini-api-dev` - Gemini API

#### Actions
1. Select LLM provider
2. Set up API access
3. Implement prompt templates
4. Configure model parameters
5. Add streaming support
6. Implement error handling

#### Copy-Paste Prompts
```
Use @llm-application-dev-ai-assistant to build conversational AI
```

```
Use @llm-application-dev-langchain-agent to create LangChain agents
```

```
Use @llm-application-dev-prompt-optimize to optimize prompts
```

### Phase 3: RAG Implementation

#### Skills to Invoke
- `rag-engineer` - RAG engineering
- `rag-implementation` - RAG implementation
- `embedding-strategies` - Embedding selection
- `vector-database-engineer` - Vector databases
- `similarity-search-patterns` - Similarity search
- `hybrid-search-implementation` - Hybrid search

#### Actions
1. Design data pipeline
2. Choose embedding model
3. Set up vector database
4. Implement chunking strategy
5. Configure retrieval
6. Add reranking
7. Implement caching

#### Copy-Paste Prompts
```
Use @rag-engineer to design RAG pipeline
```

```
Use @vector-database-engineer to set up vector search
```

```
Use @embedding-strategies to select optimal embeddings
```

### Phase 4: AI Agent Development

#### Skills to Invoke
- `autonomous-agents` - Autonomous agent patterns
- `autonomous-agent-patterns` - Agent patterns
- `crewai` - CrewAI framework
- `langgraph` - LangGraph
- `multi-agent-patterns` - Multi-agent systems
- `computer-use-agents` - Computer use agents

#### Actions
1. Design agent architecture
2. Define agent roles
3. Implement tool integration
4. Set up memory systems
5. Configure orchestration
6. Add human-in-the-loop

#### Copy-Paste Prompts
```
Use @crewai to build role-based multi-agent system
```

```
Use @langgraph to create stateful AI workflows
```

```
Use @autonomous-agents to design autonomous agent
```

### Phase 5: ML Pipeline Development

#### Skills to Invoke
- `ml-engineer` - ML engineering
- `mlops-engineer` - MLOps
- `machine-learning-ops-ml-pipeline` - ML pipelines
- `ml-pipeline-workflow` - ML workflows
- `data-engineer` - Data engineering

#### Actions
1. Design ML pipeline
2. Set up data processing
3. Implement model training
4. Configure evaluation
5. Set up model registry
6. Deploy models

#### Copy-Paste Prompts
```
Use @ml-engineer to build machine learning pipeline
```

```
Use @mlops-engineer to set up MLOps infrastructure
```

### Phase 6: AI Observability

#### Skills to Invoke
- `langfuse` - Langfuse observability
- `manifest` - Manifest telemetry
- `evaluation` - AI evaluation
- `llm-evaluation` - LLM evaluation

#### Actions
1. Set up tracing
2. Configure logging
3. Implement evaluation
4. Monitor performance
5. Track costs
6. Set up alerts

#### Copy-Paste Prompts
```
Use @langfuse to set up LLM observability
```

```
Use @evaluation to create evaluation framework
```

### Phase 7: AI Security

#### Skills to Invoke
- `prompt-engineering` - Prompt security
- `security-scanning-security-sast` - Security scanning

#### Actions
1. Implement input validation
2. Add output filtering
3. Configure rate limiting
4. Set up access controls
5. Monitor for abuse
6. Implement audit logging

## AI Development Checklist

### LLM Integration
- [ ] API keys secured
- [ ] Rate limiting configured
- [ ] Error handling implemented
- [ ] Streaming enabled
- [ ] Token usage tracked

### RAG System
- [ ] Data pipeline working
- [ ] Embeddings generated
- [ ] Vector search optimized
- [ ] Retrieval accuracy tested
- [ ] Caching implemented

### AI Agents
- [ ] Agent roles defined
- [ ] Tools integrated
- [ ] Memory working
- [ ] Orchestration tested
- [ ] Error handling robust

### Observability
- [ ] Tracing enabled
- [ ] Metrics collected
- [ ] Evaluation running
- [ ] Alerts configured
- [ ] Dashboards created

## Quality Gates

- [ ] All AI features tested
- [ ] Performance benchmarks met
- [ ] Security measures in place
- [ ] Observability configured
- [ ] Documentation complete

## Related Workflow Bundles

- `development` - Application development
- `database` - Data management
- `cloud-devops` - Infrastructure
- `testing-qa` - AI testing

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
