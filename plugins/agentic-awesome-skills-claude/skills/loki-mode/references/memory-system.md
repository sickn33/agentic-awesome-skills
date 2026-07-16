# Memory System Reference

Enhanced memory architecture based on 2025 research (MIRIX, A-Mem, MemGPT, AriGraph).

---

## Memory Hierarchy Overview

```
+------------------------------------------------------------------+
| WORKING MEMORY (CONTINUITY.md)                                    |
| - Current session state                                           |
| - Updated every turn                                              |
| - What am I doing right NOW?                                      |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
| EPISODIC MEMORY (.loki/memory/episodic/)                         |
| - Specific interaction traces                                     |
| - Full context with timestamps                                    |
| - "What happened when I tried X?"                                 |
+------------------------------------------------------------------+
        |
        v (consolidation)
+------------------------------------------------------------------+
| SEMANTIC MEMORY (.loki/memory/semantic/)                         |
| - Generalized patterns and facts                                  |
| - Context-independent knowledge                                   |
| - "How does X work in general?"                                   |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
| PROCEDURAL MEMORY (.loki/memory/skills/)                         |
| - Learned action sequences                                        |
| - Reusable skill templates                                        |
| - "How to do X successfully"                                      |
+------------------------------------------------------------------+
```

---

## Directory Structure

```
.loki/memory/
+-- episodic/
|   +-- 2026-01-06/
|   |   +-- task-001.json      # Full trace of task execution
|   |   +-- task-002.json
|   +-- index.json             # Temporal index for retrieval
|
+-- semantic/
|   +-- patterns.json          # Generalized patterns
|   +-- anti-patterns.json     # What NOT to do
|   +-- facts.json             # Domain knowledge
|   +-- links.json             # Zettelkasten-style connections
|
+-- skills/
|   +-- api-implementation.md  # Skill: How to implement an API
|   +-- test-writing.md        # Skill: How to write tests
|   +-- debugging.md           # Skill: How to debug issues
|
+-- ledgers/                   # Agent-specific checkpoints
|   +-- eng-001.json
|   +-- qa-001.json
|
+-- handoffs/                  # Agent-to-agent transfers
|   +-- handoff-001.json
|
+-- learnings/                 # Extracted from errors
|   +-- 2026-01-06.json

# Related: Metrics System (separate from memory)
# .loki/metrics/
# +-- efficiency/              # Task cost tracking (time, agents, retries)
# +-- rewards/                 # Outcome/efficiency/preference signals
# +-- dashboard.json           # Rolling 7-day metrics summary
# See references/tool-orchestration.md for details
```

---

## Episodic Memory Schema

Each task execution creates an episodic trace:

```json
{
  "id": "ep-2026-01-06-001",
  "task_id": "task-042",
  "timestamp": "2026-01-06T10:30:00Z",
  "duration_seconds": 342,
  "agent": "eng-001-backend",
  "context": {
    "phase": "development",
    "goal": "Implement POST /api/todos endpoint",
    "constraints": ["No third-party deps", "< 200ms response"],
    "files_involved": ["src/routes/todos.ts", "src/db/todos.ts"]
  },
  "action_log": [
    {"t": 0, "action": "read_file", "target": "openapi.yaml"},
    {"t": 5, "action": "write_file", "target": "src/routes/todos.ts"},
    {"t": 120, "action": "run_test", "result": "fail", "error": "missing return type"},
    {"t": 140, "action": "edit_file", "target": "src/routes/todos.ts"},
    {"t": 180, "action": "run_test", "result": "pass"}
  ],
  "outcome": "success",
  "errors_encountered": [
    {
      "type": "TypeScript compilation",
      "message": "Missing return type annotation",
      "resolution": "Added explicit :void to route handler"
    }
  ],
  "artifacts_produced": ["src/routes/todos.ts", "tests/todos.test.ts"],
  "git_commit": "abc123"
}
```

---

## Semantic Memory Schema

Generalized patterns extracted from episodic memory:

```json
{
  "id": "sem-001",
  "pattern": "Express route handlers require explicit return types in strict mode",
  "category": "typescript",
  "conditions": [
    "Using TypeScript strict mode",
    "Writing Express route handlers",
    "Handler doesn't return a value"
  ],
  "correct_approach": "Add `: void` to handler signature: `(req, res): void =>`",
  "incorrect_approach": "Omitting return type annotation",
  "confidence": 0.95,
  "source_episodes": ["ep-2026-01-06-001", "ep-2026-01-05-012"],
  "usage_count": 8,
  "last_used": "2026-01-06T14:00:00Z",
  "links": [
    {"to": "sem-005", "relation": "related_to"},
    {"to": "sem-012", "relation": "supersedes"}
  ]
}
```

---

## Episodic-to-Semantic Consolidation

**When to consolidate:** After task completion, during idle time, at phase boundaries.

```python
def consolidate_episodic_to_semantic():
    """
    Transform specific experiences into general knowledge.
    Based on MemGPT and Voyager research.
    """
    # 1. Load recent episodic memories
    recent_episodes = load_episodes(since=hours_ago(24))

    # 2. Group by similarity
    clusters = cluster_by_similarity(recent_episodes)

    for cluster in clusters:
        if len(cluster) >= 2:  # Pattern appears multiple times
            # 3. Extract common pattern
            pattern = extract_common_pattern(cluster)

            # 4. Validate pattern
            if pattern.confidence >= 0.8:
                # 5. Check if already exists
                existing = find_similar_semantic(pattern)
                if existing:
                    # Update existing with new evidence
                    existing.source_episodes.extend([e.id for e in cluster])
                    existing.confidence = recalculate_confidence(existing)
                    existing.usage_count += 1
                else:
                    # Create new semantic memory
                    save_semantic(pattern)

    # 6. Consolidate anti-patterns from errors
    error_episodes = [e for e in recent_episodes if e.errors_encountered]
    for episode in error_episodes:
        for error in episode.errors_encountered:
            anti_pattern = {
                "what_fails": error.type,
                "why": error.message,
                "prevention": error.resolution,
                "source": episode.id
            }
            save_anti_pattern(anti_pattern)
```

---

## Zettelkasten-Style Linking

Each memory note can link to related notes:

```json
{
  "links": [
    {"to": "sem-005", "relation": "derived_from"},
    {"to": "sem-012", "relation": "contradicts"},
    {"to": "sem-018", "relation": "elaborates"},
    {"to": "sem-023", "relation": "example_of"},
    {"to": "sem-031", "relation": "superseded_by"}
  ]
}
```

### Link Relations

| Relation | Meaning |
|----------|---------|
| `derived_from` | This pattern was extracted from that episode |
| `related_to` | Conceptually similar, often used together |
| `contradicts` | These patterns conflict - need resolution |
| `elaborates` | Provides more detail on the linked pattern |
| `example_of` | Specific instance of a general pattern |
| `supersedes` | This pattern replaces an older one |
| `superseded_by` | This pattern is outdated, use the linked one |

---

## Procedural Memory (Skills)

Reusable action sequences:

```markdown
# Skill: API Endpoint Implementation

## Prerequisites
- OpenAPI spec exists at .loki/specs/openapi.yaml
- Database schema defined

## Steps
1. Read endpoint spec from openapi.yaml
2. Create route handler in src/routes/{resource}.ts
3. Implement request validation using spec schema
4. Implement business logic
5. Add database operations if needed
6. Return response matching spec schema
7. Write contract tests
8. Run tests, verify passing

## Common Errors & Fixes
- Missing return type: Add `: void` to handler
- Schema mismatch: Regenerate types from spec

## Exit Criteria
- All contract tests pass
- Response matches OpenAPI spec
- No TypeScript errors
```

---

## Memory Retrieval

### Retrieval by Similarity

```python
def retrieve_relevant_memory(current_context):
    """
    Retrieve memories relevant to current task.
    Uses semantic similarity + temporal recency.
    """
    query_embedding = embed(current_context.goal)

    # 1. Search semantic memory first
    semantic_matches = vector_search(
        collection="semantic",
        query=query_embedding,
        top_k=5
    )

    # 2. Search episodic memory for similar situations
    episodic_matches = vector_search(
        collection="episodic",
        query=query_embedding,
        top_k=3,
        filters={"outcome": "success"}  # Prefer successful episodes
    )

    # 3. Search skills
    skill_matches = keyword_search(
        collection="skills",
        keywords=extract_keywords(current_context)
    )

    # 4. Combine and rank
    combined = merge_and_rank(
        semantic_matches,
        episodic_matches,
        skill_matches,
        weights={"semantic": 0.5, "episodic": 0.3, "skills": 0.2}
    )

    return combined[:5]  # Return top 5 most relevant
```

### Retrieval Before Task Execution

**CRITICAL:** Before executing any task, retrieve relevant memories:

```python
def before_task_execution(task):
    """
    Inject relevant memories into task context.
    """
    # 1. Retrieve relevant memories
    memories = retrieve_relevant_memory(task)

    # 2. Check for anti-patterns
    anti_patterns = search_anti_patterns(task.action_type)

    # 3. Inject into prompt
    task.context["relevant_patterns"] = [m.summary for m in memories]
    task.context["avoid_these"] = [a.summary for a in anti_patterns]
    task.context["applicable_skills"] = find_skills(task.type)

    return task
```

---

## Ledger System (Agent Checkpoints)

Each agent maintains its own ledger:

```json
{
  "agent_id": "eng-001-backend",
  "last_checkpoint": "2026-01-06T10:00:00Z",
  "tasks_completed": 12,
  "current_task": "task-042",
  "state": {
    "files_modified": ["src/routes/todos.ts"],
    "uncommitted_changes": true,
    "last_git_commit": "abc123"
  },
  "context": {
    "tech_stack": ["express", "typescript", "sqlite"],
    "patterns_learned": ["sem-001", "sem-005"],
    "current_goal": "Implement CRUD for todos"
  }
}
```

---

## Handoff Protocol

When switching between agents:

```json
{
  "id": "handoff-001",
  "from_agent": "eng-001-backend",
  "to_agent": "qa-001-testing",
  "timestamp": "2026-01-06T11:00:00Z",
  "context": {
    "what_was_done": "Implemented POST /api/todos endpoint",
    "artifacts": ["src/routes/todos.ts"],
    "git_state": "commit abc123",
    "needs_testing": ["unit tests for validation", "contract tests"],
    "known_issues": [],
    "relevant_patterns": ["sem-001"]
  }
}
```

---

## Memory Maintenance

### Pruning Old Episodic Memories

```python
def prune_episodic_memories():
    """
    Keep episodic memories from:
    - Last 7 days (full detail)
    - Last 30 days (summarized)
    - Older: only if referenced by semantic memory
    """
    now = datetime.now()

    for episode in load_all_episodes():
        age_days = (now - episode.timestamp).days

        if age_days > 30:
            if not is_referenced_by_semantic(episode):
                archive_episode(episode)
        elif age_days > 7:
            summarize_episode(episode)
```

### Merging Duplicate Patterns

```python
def merge_duplicate_semantics():
    """
    Find and merge semantically similar patterns.
    """
    all_patterns = load_semantic_patterns()

    clusters = cluster_by_embedding_similarity(all_patterns, threshold=0.9)

    for cluster in clusters:
        if len(cluster) > 1:
            # Keep highest confidence, merge sources
            primary = max(cluster, key=lambda p: p.confidence)
            for other in cluster:
                if other != primary:
                    primary.source_episodes.extend(other.source_episodes)
                    primary.usage_count += other.usage_count
                    create_link(other, primary, "superseded_by")
            save_semantic(primary)
```

---

## Integration with CONTINUITY.md

CONTINUITY.md is working memory - it references but doesn't duplicate long-term memory:

```markdown
## Relevant Memories (Auto-Retrieved)
- [sem-001] Express handlers need explicit return types
- [ep-2026-01-05-012] Similar endpoint implementation succeeded
- [skill: api-implementation] Standard API implementation flow

## Mistakes to Avoid (From Learnings)
- Don't forget return type annotations
- Run contract tests before marking complete
```
