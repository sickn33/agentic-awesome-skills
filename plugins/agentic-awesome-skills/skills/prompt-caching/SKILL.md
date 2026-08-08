---
name: prompt-caching
description: Caching strategies for LLM prompts including Anthropic prompt
  caching, response caching, and CAG (Cache Augmented Generation)
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Prompt Caching

Caching strategies for LLM prompts including Anthropic prompt caching, response caching, and CAG (Cache Augmented Generation)

## Capabilities

- prompt-cache
- response-cache
- kv-cache
- cag-patterns
- cache-invalidation

## Prerequisites

- Knowledge: Caching fundamentals, LLM API usage, Hash functions
- Skills_recommended: context-window-management

## Scope

- Does_not_cover: CDN caching, Database query caching, Static asset caching
- Boundaries: Focus is LLM-specific caching, Covers prompt and response caching

## Ecosystem

### Primary_tools

- Anthropic Prompt Caching - Native prompt caching in Claude API
- Redis - In-memory cache for responses
- OpenAI Caching - Automatic caching in OpenAI API

## Patterns

### Anthropic Prompt Caching

Use Claude's native prompt caching for repeated prefixes

**When to use**: Using Claude API with stable system prompts or context

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Cache the stable parts of your prompt
async function queryWithCaching(userQuery: string) {
    const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: [
            {
                type: "text",
                text: LONG_SYSTEM_PROMPT,  // Your detailed instructions
                cache_control: { type: "ephemeral" }  // Cache this!
            },
            {
                type: "text",
                text: KNOWLEDGE_BASE,  // Large static context
                cache_control: { type: "ephemeral" }
            }
        ],
        messages: [
            { role: "user", content: userQuery }  // Dynamic part
        ]
    });

    // Check cache usage
    console.log(`Cache read: ${response.usage.cache_read_input_tokens}`);
    console.log(`Cache write: ${response.usage.cache_creation_input_tokens}`);

    return response;
}

// Cost savings: 90% reduction on cached tokens
// Latency savings: Up to 2x faster

### Response Caching

Cache full LLM responses for identical or similar queries

**When to use**: Same queries asked repeatedly

import { createHash } from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

class ResponseCache {
    private ttl = 3600;  // 1 hour default

    // Exact match caching
    async getCached(prompt: string): Promise<string | null> {
        const key = this.hashPrompt(prompt);
        return await redis.get(`response:${key}`);
    }

    async setCached(prompt: string, response: string): Promise<void> {
        const key = this.hashPrompt(prompt);
        await redis.set(`response:${key}`, response, 'EX', this.ttl);
    }

    private hashPrompt(prompt: string): string {
        return createHash('sha256').update(prompt).digest('hex');
    }

    // Semantic similarity caching
    async getSemanticallySimilar(
        prompt: string,
        threshold: number = 0.95
    ): Promise<string | null> {
        const embedding = await embed(prompt);
        const similar = await this.vectorCache.search(embedding, 1);

        if (similar.length && similar[0].similarity > threshold) {
            return await redis.get(`response:${similar[0].id}`);
        }
        return null;
    }

    // Temperature-aware caching
    async getCachedWithParams(
        prompt: string,
        params: { temperature: number; model: string }
    ): Promise<string | null> {
        // Only cache low-temperature responses
        if (params.temperature > 0.5) return null;

        const key = this.hashPrompt(
            `${prompt}|${params.model}|${params.temperature}`
        );
        return await redis.get(`response:${key}`);
    }
}

### Cache Augmented Generation (CAG)

Pre-cache documents in prompt instead of RAG retrieval

**When to use**: Document corpus is stable and fits in context

// CAG: Pre-compute document context, cache in prompt
// Better than RAG when:
// - Documents are stable
// - Total fits in context window
// - Latency is critical

class CAGSystem {
    private cachedContext: string | null = null;
    private lastUpdate: number = 0;

    async buildCachedContext(documents: Document[]): Promise<void> {
        // Pre-process and format documents
        const formatted = documents.map(d =>
            `## ${d.title}\n${d.content}`
        ).join('\n\n');

        // Store with timestamp
        this.cachedContext = formatted;
        this.lastUpdate = Date.now();
    }

    async query(userQuery: string): Promise<string> {
        // Use cached context directly in prompt
        const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: [
                {
                    type: "text",
                    text: "You are a helpful assistant with access to the following documentation.",
                    cache_control: { type: "ephemeral" }
                },
                {
                    type: "text",
                    text: this.cachedContext!,  // Pre-cached docs
                    cache_control: { type: "ephemeral" }
                }
            ],
            messages: [{ role: "user", content: userQuery }]
        });

        return response.content[0].text;
    }

    // Periodic refresh
    async refreshIfNeeded(documents: Document[]): Promise<void> {
        const stale = Date.now() - this.lastUpdate > 3600000;  // 1 hour
        if (stale) {
            await this.buildCachedContext(documents);
        }
    }
}

// CAG vs RAG decision matrix:
// | Factor           | CAG Better | RAG Better |
// |------------------|------------|------------|
// | Corpus size      | < 100K tokens | > 100K tokens |
// | Update frequency | Low | High |
// | Latency needs    | Critical | Flexible |
// | Query specificity| General | Specific |

## Sharp Edges

### Cache miss causes latency spike with additional overhead

Severity: HIGH

Situation: Slow response when cache miss, slower than no caching

Symptoms:
- Slow responses on cache miss
- Cache hit rate below 50%
- Higher latency than uncached

Why this breaks:
Cache check adds latency.
Cache write adds more latency.
Miss + overhead > no caching.

Recommended fix:

// Optimize for cache misses, not just hits

class OptimizedCache {
    async queryWithCache(prompt: string): Promise<string> {
        const cacheKey = this.hash(prompt);

        // Non-blocking cache check
        const cachedPromise = this.cache.get(cacheKey);
        const llmPromise = this.queryLLM(prompt);

        // Race: use cache if available before LLM returns
        const cached = await Promise.race([
            cachedPromise,
            sleep(50).then(() => null)  // 50ms cache timeout
        ]);

        if (cached) {
            // Cancel LLM request if possible
            return cached;
        }

        // Cache miss: continue with LLM
        const response = await llmPromise;

        // Async cache write (don't block response)
        this.cache.set(cacheKey, response).catch(console.error);

        return response;
    }
}

// Alternative: Probabilistic caching
// Only cache if query matches known high-frequency patterns
class SelectiveCache {
    private patterns: Map<string, number> = new Map();

    shouldCache(prompt: string): boolean {
        const pattern = this.extractPattern(prompt);
        const frequency = this.patterns.get(pattern) || 0;

        // Only cache high-frequency patterns
        return frequency > 10;
    }

    recordQuery(prompt: string): void {
        const pattern = this.extractPattern(prompt);
        this.patterns.set(pattern, (this.patterns.get(pattern) || 0) + 1);
    }
}

### Cached responses become incorrect over time

Severity: HIGH

Situation: Users get outdated or wrong information from cache

Symptoms:
- Users report wrong information
- Answers don't match current data
- Complaints about outdated responses

Why this breaks:
Source data changed.
No cache invalidation.
Long TTLs for dynamic data.

Recommended fix:

// Implement proper cache invalidation

class InvalidatingCache {
    // Version-based invalidation
    private cacheVersion = 1;

    getCacheKey(prompt: string): string {
        return `v${this.cacheVersion}:${this.hash(prompt)}`;
    }

    invalidateAll(): void {
        this.cacheVersion++;
        // Old keys automatically become orphaned
    }

    // Content-hash invalidation
    async setWithContentHash(
        key: string,
        response: string,
        sourceContent: string
    ): Promise<void> {
        const contentHash = this.hash(sourceContent);
        await this.cache.set(key, {
            response,
            contentHash,
            timestamp: Date.now()
        });
    }

    async getIfValid(
        key: string,
        currentSourceContent: string
    ): Promise<string | null> {
        const cached = await this.cache.get(key);
        if (!cached) return null;

        // Check if source content changed
        const currentHash = this.hash(currentSourceContent);
        if (cached.contentHash !== currentHash) {
            await this.cache.delete(key);
            return null;
        }

        return cached.response;
    }

    // Event-based invalidation
    onSourceUpdate(sourceId: string): void {
        // Invalidate all caches that used this source
        this.invalidateByTag(`source:${sourceId}`);
    }
}

### Prompt caching doesn't work due to prefix changes

Severity: MEDIUM

Situation: Cache misses despite similar prompts

Symptoms:
- Cache hit rate lower than expected
- Cache creation tokens high, read low
- Similar prompts not hitting cache

Why this breaks:
Anthropic caching requires exact prefix match.
Timestamps or dynamic content in prefix.
Different message order.

Recommended fix:

// Structure prompts for optimal caching

class CacheOptimizedPrompts {
    // WRONG: Dynamic content in cached prefix
    buildPromptBad(query: string): SystemMessage[] {
        return [
            {
                type: "text",
                text: `You are helpful. Current time: ${new Date()}`,  // BREAKS CACHE!
                cache_control: { type: "ephemeral" }
            }
        ];
    }

    // RIGHT: Static prefix, dynamic at end
    buildPromptGood(query: string): SystemMessage[] {
        return [
            {
                type: "text",
                text: STATIC_SYSTEM_PROMPT,  // Never changes
                cache_control: { type: "ephemeral" }
            },
            {
                type: "text",
                text: STATIC_KNOWLEDGE_BASE,  // Rarely changes
                cache_control: { type: "ephemeral" }
            }
            // Dynamic content goes in messages, NOT system
        ];
    }

    // Prefix ordering matters
    buildWithConsistentOrder(components: string[]): SystemMessage[] {
        // Sort components for consistent ordering
        const sorted = [...components].sort();
        return sorted.map((c, i) => ({
            type: "text",
            text: c,
            cache_control: i === sorted.length - 1
                ? { type: "ephemeral" }
                : undefined  // Only cache the full prefix
        }));
    }
}

## Validation Checks

### Caching High Temperature Responses

Severity: WARNING

Message: Caching with high temperature. Responses are non-deterministic.

Fix action: Only cache responses with temperature <= 0.5

### Cache Without TTL

Severity: WARNING

Message: Cache without TTL. May serve stale data indefinitely.

Fix action: Set appropriate TTL based on data freshness requirements

### Dynamic Content in Cached Prefix

Severity: WARNING

Message: Dynamic content in cached prefix. Will cause cache misses.

Fix action: Move dynamic content outside of cache_control blocks

### No Cache Metrics

Severity: INFO

Message: Cache without hit/miss tracking. Can't measure effectiveness.

Fix action: Add cache hit/miss metrics and logging

## Collaboration

### Delegation Triggers

- context window|token -> context-window-management (Need context optimization)
- rag|retrieval -> rag-implementation (Need retrieval system)
- memory -> conversation-memory (Need memory persistence)

### High-Performance LLM System

Skills: prompt-caching, context-window-management, rag-implementation

Workflow:

```
1. Analyze query patterns
2. Implement prompt caching for stable prefixes
3. Add response caching for frequent queries
4. Consider CAG for stable document sets
5. Monitor and optimize hit rates
```

## Related Skills

Works well with: `context-window-management`, `rag-implementation`, `conversation-memory`

## When to Use
- User mentions or implies: prompt caching
- User mentions or implies: cache prompt
- User mentions or implies: response cache
- User mentions or implies: cag
- User mentions or implies: cache augmented

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
