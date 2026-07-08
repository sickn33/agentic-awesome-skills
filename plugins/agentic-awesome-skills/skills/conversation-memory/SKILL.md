---
name: conversation-memory
description: Persistent memory systems for LLM conversations including
  short-term, long-term, and entity-based memory
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Conversation Memory

Persistent memory systems for LLM conversations including short-term, long-term, and entity-based memory

## Capabilities

- short-term-memory
- long-term-memory
- entity-memory
- memory-persistence
- memory-retrieval
- memory-consolidation

## Prerequisites

- Knowledge: LLM conversation patterns, Database basics, Key-value stores
- Skills_recommended: context-window-management, rag-implementation

## Scope

- Does_not_cover: Knowledge graph construction, Semantic search implementation, Database administration
- Boundaries: Focus is memory patterns for LLMs, Covers storage and retrieval strategies

## Ecosystem

### Primary_tools

- Mem0 - Memory layer for AI applications
- LangChain Memory - Memory utilities in LangChain
- Redis - In-memory data store for session memory

## Patterns

### Tiered Memory System

Different memory tiers for different purposes

**When to use**: Building any conversational AI

interface MemorySystem {
    // Buffer: Current conversation (in context)
    buffer: ConversationBuffer;

    // Short-term: Recent interactions (session)
    shortTerm: ShortTermMemory;

    // Long-term: Persistent across sessions
    longTerm: LongTermMemory;

    // Entity: Facts about people, places, things
    entity: EntityMemory;
}

class TieredMemory implements MemorySystem {
    async addMessage(message: Message): Promise<void> {
        // Always add to buffer
        this.buffer.add(message);

        // Extract entities
        const entities = await extractEntities(message);
        for (const entity of entities) {
            await this.entity.upsert(entity);
        }

        // Check for memorable content
        if (await isMemoryWorthy(message)) {
            await this.shortTerm.add({
                content: message.content,
                timestamp: Date.now(),
                importance: await scoreImportance(message)
            });
        }
    }

    async consolidate(): Promise<void> {
        // Move important short-term to long-term
        const memories = await this.shortTerm.getOld(24 * 60 * 60 * 1000);
        for (const memory of memories) {
            if (memory.importance > 0.7 || memory.referenced > 2) {
                await this.longTerm.add(memory);
            }
            await this.shortTerm.remove(memory.id);
        }
    }

    async buildContext(query: string): Promise<string> {
        const parts: string[] = [];

        // Relevant long-term memories
        const longTermRelevant = await this.longTerm.search(query, 3);
        if (longTermRelevant.length) {
            parts.push('## Relevant Memories\n' +
                longTermRelevant.map(m => `- ${m.content}`).join('\n'));
        }

        // Relevant entities
        const entities = await this.entity.getRelevant(query);
        if (entities.length) {
            parts.push('## Known Entities\n' +
                entities.map(e => `- ${e.name}: ${e.facts.join(', ')}`).join('\n'));
        }

        // Recent conversation
        const recent = this.buffer.getRecent(10);
        parts.push('## Recent Conversation\n' + formatMessages(recent));

        return parts.join('\n\n');
    }
}

### Entity Memory

Store and update facts about entities

**When to use**: Need to remember details about people, places, things

interface Entity {
    id: string;
    name: string;
    type: 'person' | 'place' | 'thing' | 'concept';
    facts: Fact[];
    lastMentioned: number;
    mentionCount: number;
}

interface Fact {
    content: string;
    confidence: number;
    source: string;  // Which message this came from
    timestamp: number;
}

class EntityMemory {
    async extractAndStore(message: Message): Promise<void> {
        // Use LLM to extract entities and facts
        const extraction = await llm.complete(`
            Extract entities and facts from this message.
            Return JSON: { "entities": [
                { "name": "...", "type": "...", "facts": ["..."] }
            ]}

            Message: "${message.content}"
        `);

        const { entities } = JSON.parse(extraction);
        for (const entity of entities) {
            await this.upsert(entity, message.id);
        }
    }

    async upsert(entity: ExtractedEntity, sourceId: string): Promise<void> {
        const existing = await this.store.get(entity.name.toLowerCase());

        if (existing) {
            // Merge facts, avoiding duplicates
            for (const fact of entity.facts) {
                if (!this.hasSimilarFact(existing.facts, fact)) {
                    existing.facts.push({
                        content: fact,
                        confidence: 0.9,
                        source: sourceId,
                        timestamp: Date.now()
                    });
                }
            }
            existing.lastMentioned = Date.now();
            existing.mentionCount++;
            await this.store.set(existing.id, existing);
        } else {
            // Create new entity
            await this.store.set(entity.name.toLowerCase(), {
                id: generateId(),
                name: entity.name,
                type: entity.type,
                facts: entity.facts.map(f => ({
                    content: f,
                    confidence: 0.9,
                    source: sourceId,
                    timestamp: Date.now()
                })),
                lastMentioned: Date.now(),
                mentionCount: 1
            });
        }
    }
}

### Memory-Aware Prompting

Include relevant memories in prompts

**When to use**: Making LLM calls with memory context

async function promptWithMemory(
    query: string,
    memory: MemorySystem,
    systemPrompt: string
): Promise<string> {
    // Retrieve relevant memories
    const relevantMemories = await memory.longTerm.search(query, 5);
    const entities = await memory.entity.getRelevant(query);
    const recentContext = memory.buffer.getRecent(5);

    // Build memory-augmented prompt
    const prompt = `
${systemPrompt}

## User Context
${entities.length ? `Known about user:\n${entities.map(e =>
    `- ${e.name}: ${e.facts.map(f => f.content).join('; ')}`
).join('\n')}` : ''}

${relevantMemories.length ? `Relevant past interactions:\n${relevantMemories.map(m =>
    `- [${formatDate(m.timestamp)}] ${m.content}`
).join('\n')}` : ''}

## Recent Conversation
${formatMessages(recentContext)}

## Current Query
${query}
    `.trim();

    const response = await llm.complete(prompt);

    // Extract any new memories from response
    await memory.addMessage({ role: 'assistant', content: response });

    return response;
}

## Sharp Edges

### Memory store grows unbounded, system slows

Severity: HIGH

Situation: System slows over time, costs increase

Symptoms:
- Slow memory retrieval
- High storage costs
- Increasing latency over time

Why this breaks:
Every message stored as memory.
No cleanup or consolidation.
Retrieval over millions of items.

Recommended fix:

// Implement memory lifecycle management

class ManagedMemory {
    // Limits
    private readonly SHORT_TERM_MAX = 100;
    private readonly LONG_TERM_MAX = 10000;
    private readonly CONSOLIDATION_INTERVAL = 24 * 60 * 60 * 1000;

    async add(memory: Memory): Promise<void> {
        // Score importance before storing
        const score = await this.scoreImportance(memory);
        if (score < 0.3) return;  // Don't store low-importance

        memory.importance = score;
        await this.shortTerm.add(memory);

        // Check limits
        await this.enforceShortTermLimit();
    }

    async enforceShortTermLimit(): Promise<void> {
        const count = await this.shortTerm.count();
        if (count > this.SHORT_TERM_MAX) {
            // Consolidate: move important to long-term, delete rest
            const memories = await this.shortTerm.getAll();
            memories.sort((a, b) => b.importance - a.importance);

            const toKeep = memories.slice(0, this.SHORT_TERM_MAX * 0.7);
            const toConsolidate = memories.slice(this.SHORT_TERM_MAX * 0.7);

            for (const m of toConsolidate) {
                if (m.importance > 0.7) {
                    await this.longTerm.add(m);
                }
                await this.shortTerm.remove(m.id);
            }
        }
    }

    async scoreImportance(memory: Memory): Promise<number> {
        const factors = {
            hasUserPreference: /prefer|like|don't like|hate|love/i.test(memory.content) ? 0.3 : 0,
            hasDecision: /decided|chose|will do|won't do/i.test(memory.content) ? 0.3 : 0,
            hasFactAboutUser: /my|I am|I have|I work/i.test(memory.content) ? 0.2 : 0,
            length: memory.content.length > 100 ? 0.1 : 0,
            userMessage: memory.role === 'user' ? 0.1 : 0,
        };

        return Object.values(factors).reduce((a, b) => a + b, 0);
    }
}

### Retrieved memories not relevant to current query

Severity: HIGH

Situation: Memories included in context but don't help

Symptoms:
- Memories in context seem random
- User asks about things already in memory
- Confusion from irrelevant context

Why this breaks:
Simple keyword matching.
No relevance scoring.
Including all retrieved memories.

Recommended fix:

// Intelligent memory retrieval

async function retrieveRelevant(
    query: string,
    memories: MemoryStore,
    maxResults: number = 5
): Promise<Memory[]> {
    // 1. Semantic search
    const candidates = await memories.semanticSearch(query, maxResults * 3);

    // 2. Score relevance with context
    const scored = await Promise.all(candidates.map(async (m) => {
        const relevanceScore = await llm.complete(`
            Rate 0-1 how relevant this memory is to the query.
            Query: "${query}"
            Memory: "${m.content}"
            Return just the number.
        `);
        return { ...m, relevance: parseFloat(relevanceScore) };
    }));

    // 3. Filter low relevance
    const relevant = scored.filter(m => m.relevance > 0.5);

    // 4. Sort and limit
    return relevant
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxResults);
}

### Memories from one user accessible to another

Severity: CRITICAL

Situation: User sees information from another user's sessions

Symptoms:
- User sees other user's information
- Privacy complaints
- Compliance violations

Why this breaks:
No user isolation in memory store.
Shared memory namespace.
Cross-user retrieval.

Recommended fix:

// Strict user isolation in memory

class IsolatedMemory {
    private getKey(userId: string, memoryId: string): string {
        // Namespace all keys by user
        return `user:${userId}:memory:${memoryId}`;
    }

    async add(userId: string, memory: Memory): Promise<void> {
        // Validate userId is authenticated
        if (!isValidUserId(userId)) {
            throw new Error('Invalid user ID');
        }

        const key = this.getKey(userId, memory.id);
        memory.userId = userId;  // Tag with user
        await this.store.set(key, memory);
    }

    async search(userId: string, query: string): Promise<Memory[]> {
        // CRITICAL: Filter by user in query
        return await this.store.search({
            query,
            filter: { userId: userId },  // Mandatory filter
            limit: 10
        });
    }

    async delete(userId: string, memoryId: string): Promise<void> {
        const memory = await this.get(userId, memoryId);
        // Verify ownership before delete
        if (memory.userId !== userId) {
            throw new Error('Access denied');
        }
        await this.store.delete(this.getKey(userId, memoryId));
    }

    // User data export (GDPR compliance)
    async exportUserData(userId: string): Promise<Memory[]> {
        return await this.store.getAll({ userId });
    }

    // User data deletion (GDPR compliance)
    async deleteUserData(userId: string): Promise<void> {
        const memories = await this.exportUserData(userId);
        for (const m of memories) {
            await this.store.delete(this.getKey(userId, m.id));
        }
    }
}

## Validation Checks

### No User Isolation in Memory

Severity: CRITICAL

Message: Memory operations without user isolation. Privacy vulnerability.

Fix action: Add userId to all memory operations, filter by user on retrieval

### No Importance Filtering

Severity: WARNING

Message: Storing memories without importance filtering. May cause memory explosion.

Fix action: Score importance before storing, filter low-importance content

### Memory Storage Without Retrieval

Severity: WARNING

Message: Storing memories but no retrieval logic. Memories won't be used.

Fix action: Implement memory retrieval and include in prompts

### No Memory Cleanup

Severity: INFO

Message: No memory cleanup mechanism. Storage will grow unbounded.

Fix action: Implement consolidation and cleanup based on age/importance

## Collaboration

### Delegation Triggers

- context window|token -> context-window-management (Need context optimization)
- rag|retrieval|vector -> rag-implementation (Need retrieval system)
- cache|caching -> prompt-caching (Need caching strategies)

### Complete Memory System

Skills: conversation-memory, context-window-management, rag-implementation

Workflow:

```
1. Design memory tiers
2. Implement storage and retrieval
3. Integrate with context management
4. Add consolidation and cleanup
```

## Related Skills

Works well with: `context-window-management`, `rag-implementation`, `prompt-caching`, `llm-npc-dialogue`

## When to Use
- User mentions or implies: conversation memory
- User mentions or implies: remember
- User mentions or implies: memory persistence
- User mentions or implies: long-term memory
- User mentions or implies: chat history

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
