---
name: code-refactoring-context-restore
description: "Use when working with code refactoring context restore"
risk: unknown
source: community
date_added: "2026-02-27"
---

# Context Restoration: Advanced Semantic Memory Rehydration

## Use this skill when

- Working on context restoration: advanced semantic memory rehydration tasks or workflows
- Needing guidance, best practices, or checklists for context restoration: advanced semantic memory rehydration

## Do not use this skill when

- The task is unrelated to context restoration: advanced semantic memory rehydration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Role Statement

Expert Context Restoration Specialist focused on intelligent, semantic-aware context retrieval and reconstruction across complex multi-agent AI workflows. Specializes in preserving and reconstructing project knowledge with high fidelity and minimal information loss.

## Context Overview

The Context Restoration tool is a sophisticated memory management system designed to:
- Recover and reconstruct project context across distributed AI workflows
- Enable seamless continuity in complex, long-running projects
- Provide intelligent, semantically-aware context rehydration
- Maintain historical knowledge integrity and decision traceability

## Core Requirements and Arguments

### Input Parameters
- `context_source`: Primary context storage location (vector database, file system)
- `project_identifier`: Unique project namespace
- `restoration_mode`:
  - `full`: Complete context restoration
  - `incremental`: Partial context update
  - `diff`: Compare and merge context versions
- `token_budget`: Maximum context tokens to restore (default: 8192)
- `relevance_threshold`: Semantic similarity cutoff for context components (default: 0.75)

## Advanced Context Retrieval Strategies

### 1. Semantic Vector Search
- Utilize multi-dimensional embedding models for context retrieval
- Employ cosine similarity and vector clustering techniques
- Support multi-modal embedding (text, code, architectural diagrams)

```python
def semantic_context_retrieve(project_id, query_vector, top_k=5):
    """Semantically retrieve most relevant context vectors"""
    vector_db = VectorDatabase(project_id)
    matching_contexts = vector_db.search(
        query_vector,
        similarity_threshold=0.75,
        max_results=top_k
    )
    return rank_and_filter_contexts(matching_contexts)
```

### 2. Relevance Filtering and Ranking
- Implement multi-stage relevance scoring
- Consider temporal decay, semantic similarity, and historical impact
- Dynamic weighting of context components

```python
def rank_context_components(contexts, current_state):
    """Rank context components based on multiple relevance signals"""
    ranked_contexts = []
    for context in contexts:
        relevance_score = calculate_composite_score(
            semantic_similarity=context.semantic_score,
            temporal_relevance=context.age_factor,
            historical_impact=context.decision_weight
        )
        ranked_contexts.append((context, relevance_score))

    return sorted(ranked_contexts, key=lambda x: x[1], reverse=True)
```

### 3. Context Rehydration Patterns
- Implement incremental context loading
- Support partial and full context reconstruction
- Manage token budgets dynamically

```python
def rehydrate_context(project_context, token_budget=8192):
    """Intelligent context rehydration with token budget management"""
    context_components = [
        'project_overview',
        'architectural_decisions',
        'technology_stack',
        'recent_agent_work',
        'known_issues'
    ]

    prioritized_components = prioritize_components(context_components)
    restored_context = {}

    current_tokens = 0
    for component in prioritized_components:
        component_tokens = estimate_tokens(component)
        if current_tokens + component_tokens <= token_budget:
            restored_context[component] = load_component(component)
            current_tokens += component_tokens

    return restored_context
```

### 4. Session State Reconstruction
- Reconstruct agent workflow state
- Preserve decision trails and reasoning contexts
- Support multi-agent collaboration history

### 5. Context Merging and Conflict Resolution
- Implement three-way merge strategies
- Detect and resolve semantic conflicts
- Maintain provenance and decision traceability

### 6. Incremental Context Loading
- Support lazy loading of context components
- Implement context streaming for large projects
- Enable dynamic context expansion

### 7. Context Validation and Integrity Checks
- Cryptographic context signatures
- Semantic consistency verification
- Version compatibility checks

### 8. Performance Optimization
- Implement efficient caching mechanisms
- Use probabilistic data structures for context indexing
- Optimize vector search algorithms

## Reference Workflows

### Workflow 1: Project Resumption
1. Retrieve most recent project context
2. Validate context against current codebase
3. Selectively restore relevant components
4. Generate resumption summary

### Workflow 2: Cross-Project Knowledge Transfer
1. Extract semantic vectors from source project
2. Map and transfer relevant knowledge
3. Adapt context to target project's domain
4. Validate knowledge transferability

## Usage Examples

```bash
# Full context restoration
context-restore project:ai-assistant --mode full

# Incremental context update
context-restore project:web-platform --mode incremental

# Semantic context query
context-restore project:ml-pipeline --query "model training strategy"
```

## Integration Patterns
- RAG (Retrieval Augmented Generation) pipelines
- Multi-agent workflow coordination
- Continuous learning systems
- Enterprise knowledge management

## Future Roadmap
- Enhanced multi-modal embedding support
- Quantum-inspired vector search algorithms
- Self-healing context reconstruction
- Adaptive learning context strategies

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
