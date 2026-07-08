---
name: context-window-management
description: Strategies for managing LLM context windows including
  summarization, trimming, routing, and avoiding context rot
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Context Window Management

Strategies for managing LLM context windows including summarization, trimming, routing, and avoiding context rot

## Capabilities

- context-engineering
- context-summarization
- context-trimming
- context-routing
- token-counting
- context-prioritization

## Prerequisites

- Knowledge: LLM fundamentals, Tokenization basics, Prompt engineering
- Skills_recommended: prompt-engineering

## Scope

- Does_not_cover: RAG implementation details, Model fine-tuning, Embedding models
- Boundaries: Focus is context optimization, Covers strategies not specific implementations

## Ecosystem

### Primary_tools

- tiktoken - OpenAI's tokenizer for counting tokens
- LangChain - Framework with context management utilities
- Claude API - 200K+ context with caching support

## Patterns

### Tiered Context Strategy

Different strategies based on context size

**When to use**: Building any multi-turn conversation system

interface ContextTier {
    maxTokens: number;
    strategy: 'full' | 'summarize' | 'rag';
    model: string;
}

const TIERS: ContextTier[] = [
    { maxTokens: 8000, strategy: 'full', model: 'claude-3-haiku' },
    { maxTokens: 32000, strategy: 'full', model: 'claude-3-5-sonnet' },
    { maxTokens: 100000, strategy: 'summarize', model: 'claude-3-5-sonnet' },
    { maxTokens: Infinity, strategy: 'rag', model: 'claude-3-5-sonnet' }
];

async function selectStrategy(messages: Message[]): ContextTier {
    const tokens = await countTokens(messages);

    for (const tier of TIERS) {
        if (tokens <= tier.maxTokens) {
            return tier;
        }
    }
    return TIERS[TIERS.length - 1];
}

async function prepareContext(messages: Message[]): PreparedContext {
    const tier = await selectStrategy(messages);

    switch (tier.strategy) {
        case 'full':
            return { messages, model: tier.model };

        case 'summarize':
            const summary = await summarizeOldMessages(messages);
            return { messages: [summary, ...recentMessages(messages)], model: tier.model };

        case 'rag':
            const relevant = await retrieveRelevant(messages);
            return { messages: [...relevant, ...recentMessages(messages)], model: tier.model };
    }
}

### Serial Position Optimization

Place important content at start and end

**When to use**: Constructing prompts with significant context

// LLMs weight beginning and end more heavily
// Structure prompts to leverage this

function buildOptimalPrompt(components: {
    systemPrompt: string;
    criticalContext: string;
    conversationHistory: Message[];
    currentQuery: string;
}): string {
    // START: System instructions (always first)
    const parts = [components.systemPrompt];

    // CRITICAL CONTEXT: Right after system (high primacy)
    if (components.criticalContext) {
        parts.push(`## Key Context\n${components.criticalContext}`);
    }

    // MIDDLE: Conversation history (lower weight)
    // Summarize if long, keep recent messages full
    const history = components.conversationHistory;
    if (history.length > 10) {
        const oldSummary = summarize(history.slice(0, -5));
        const recent = history.slice(-5);
        parts.push(`## Earlier Conversation (Summary)\n${oldSummary}`);
        parts.push(`## Recent Messages\n${formatMessages(recent)}`);
    } else {
        parts.push(`## Conversation\n${formatMessages(history)}`);
    }

    // END: Current query (high recency)
    // Restate critical requirements here
    parts.push(`## Current Request\n${components.currentQuery}`);

    // FINAL: Reminder of key constraints
    parts.push(`Remember: ${extractKeyConstraints(components.systemPrompt)}`);

    return parts.join('\n\n');
}

### Intelligent Summarization

Summarize by importance, not just recency

**When to use**: Context exceeds optimal size

interface MessageWithMetadata extends Message {
    importance: number;  // 0-1 score
    hasCriticalInfo: boolean;  // User preferences, decisions
    referenced: boolean;  // Was this referenced later?
}

async function smartSummarize(
    messages: MessageWithMetadata[],
    targetTokens: number
): Message[] {
    // Sort by importance, preserve order for tied scores
    const sorted = [...messages].sort((a, b) =>
        (b.importance + (b.hasCriticalInfo ? 0.5 : 0) + (b.referenced ? 0.3 : 0)) -
        (a.importance + (a.hasCriticalInfo ? 0.5 : 0) + (a.referenced ? 0.3 : 0))
    );

    const keep: Message[] = [];
    const summarizePool: Message[] = [];
    let currentTokens = 0;

    for (const msg of sorted) {
        const msgTokens = await countTokens([msg]);
        if (currentTokens + msgTokens < targetTokens * 0.7) {
            keep.push(msg);
            currentTokens += msgTokens;
        } else {
            summarizePool.push(msg);
        }
    }

    // Summarize the low-importance messages
    if (summarizePool.length > 0) {
        const summary = await llm.complete(`
            Summarize these messages, preserving:
            - Any user preferences or decisions
            - Key facts that might be referenced later
            - The overall flow of conversation

            Messages:
            ${formatMessages(summarizePool)}
        `);

        keep.unshift({ role: 'system', content: `[Earlier context: ${summary}]` });
    }

    // Restore original order
    return keep.sort((a, b) => a.timestamp - b.timestamp);
}

### Token Budget Allocation

Allocate token budget across context components

**When to use**: Need predictable context management

interface TokenBudget {
    system: number;      // System prompt
    criticalContext: number;  // User prefs, key info
    history: number;     // Conversation history
    query: number;       // Current query
    response: number;    // Reserved for response
}

function allocateBudget(totalTokens: number): TokenBudget {
    return {
        system: Math.floor(totalTokens * 0.10),      // 10%
        criticalContext: Math.floor(totalTokens * 0.15),  // 15%
        history: Math.floor(totalTokens * 0.40),     // 40%
        query: Math.floor(totalTokens * 0.10),       // 10%
        response: Math.floor(totalTokens * 0.25),    // 25%
    };
}

async function buildWithBudget(
    components: ContextComponents,
    modelMaxTokens: number
): PreparedContext {
    const budget = allocateBudget(modelMaxTokens);

    // Truncate/summarize each component to fit budget
    const prepared = {
        system: truncateToTokens(components.system, budget.system),
        criticalContext: truncateToTokens(
            components.criticalContext, budget.criticalContext
        ),
        history: await summarizeToTokens(components.history, budget.history),
        query: truncateToTokens(components.query, budget.query),
    };

    // Reallocate unused budget
    const used = await countTokens(Object.values(prepared).join('\n'));
    const remaining = modelMaxTokens - used - budget.response;

    if (remaining > 0) {
        // Give extra to history (most valuable for conversation)
        prepared.history = await summarizeToTokens(
            components.history,
            budget.history + remaining
        );
    }

    return prepared;
}

## Validation Checks

### No Token Counting

Severity: WARNING

Message: Building context without token counting. May exceed model limits.

Fix action: Count tokens before sending, implement budget allocation

### Naive Message Truncation

Severity: WARNING

Message: Truncating messages without summarization. Critical context may be lost.

Fix action: Summarize old messages instead of simply removing them

### Hardcoded Token Limit

Severity: INFO

Message: Hardcoded token limit. Consider making configurable per model.

Fix action: Use model-specific limits from configuration

### No Context Management Strategy

Severity: WARNING

Message: LLM calls without context management strategy.

Fix action: Implement context management: budgets, summarization, or RAG

## Collaboration

### Delegation Triggers

- retrieval|rag|search -> rag-implementation (Need retrieval system)
- memory|persistence|remember -> conversation-memory (Need memory storage)
- cache|caching -> prompt-caching (Need caching optimization)

### Complete Context System

Skills: context-window-management, rag-implementation, conversation-memory, prompt-caching

Workflow:

```
1. Design context strategy
2. Implement RAG for large corpuses
3. Set up memory persistence
4. Add caching for performance
```

## Related Skills

Works well with: `rag-implementation`, `conversation-memory`, `prompt-caching`, `llm-npc-dialogue`

## When to Use
- User mentions or implies: context window
- User mentions or implies: token limit
- User mentions or implies: context management
- User mentions or implies: context engineering
- User mentions or implies: long context
- User mentions or implies: context overflow

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
