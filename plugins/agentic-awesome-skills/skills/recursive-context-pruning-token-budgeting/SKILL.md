---
name: recursive-context-pruning-token-budgeting
description: "Optimizes AI agent performance by pruning redundant context, managing token usage, and enforcing ultra-concise, direct-to-value responses."
category: prompt-engineering
risk: safe
source: self
source_repo: Kench001/antigravity-awesome-skills
source_type: self
date_added: "2026-05-03"
author: Kench001
tags: [efficiency, token-optimization, brevity, context-management]
tools: [claude, cursor, gemini]
# Optional: declare the upstream license if source_repo is set
# license: "MIT"
# license_source: "https://github.com/owner/repo/blob/main/LICENSE"
---

# Recursive Context Pruning & Token Budgeting

## Overview

This skill implements a "Gatekeeper" logic to prevent context window bloat and unnecessary token expenditure. It ensures the agent only processes relevant data shards and adheres to an Atomic Precision protocol—delivering functional answers with zero conversational filler. By recursively summarizing state and stripping "bridge phrases," it maximizes the longevity and speed of long-running development workflows.

## When to Use This Skill

- Use when building multi-step agents to prevent repetition and "memory drift" in long conversations.
- Use when working with large document sets or codebases to avoid dumping entire files into the prompt.
- Use when you need purely functional output (code/logic) without "Sure! Here is your..." intros.

## How It Works

### Step 1: Metadata Sharding

Scan the available data for headers, summaries, and key indicators. Create a "map" of the context rather than injecting the full source. Never pull the entire file into the prompt unless a specific, narrowed fragment is requested.

### Step 2: Token Budget Allocation

Calculate a "Safe Response Limit" based on the current context window. Allocate 30% for current logic processing, 20% for immediate output, and 50% for a future context buffer.

### Step 3: Atomic Output Filtering

Strip all "Bridge Phrases" (e.g., "I've updated the code," "Based on your request," "Sure"). Start the response immediately with the solution or the code block.

### Step 4: Ambiguity Check

Before executing Step 3, scan for missing critical variables (e.g., specific file names or environment types). If the prompt is too ambiguous, bypass the atomic output and generate exactly one concise question to resolve the blocker.

### Step 5: Abstractive Compression

Summarize the current turn into a "compressed state string" (e.g., `[Project: Feasify | State: Auth-Fixed | Remaining-Tasks: 2]`) to discard redundant conversational data before the next prompt.

## Examples

### Example 1: Filtered Code Output (No Filler)

```text
User: "Update the Firebase config to use environment variables."
```

```javascript
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
};
```

### Example 2: Essential Clarification

```text
User: "Deploy the function."
```

```text
"Specify environment: production or staging?"
```

## Best Practices

- ✅ **Direct Start:** Place the code or answer at the very first character of the response.
- ✅ **Summarize-as-you-go:** Turn 10 pages of discussion into 5 bullet points for the next turn.
- ✅ **Omit Signatures:** Never end with "Let me know if you need more help."
- ❌ **No Bridge Phrases:** Avoid "Here is the code," "Sure," or "I can help with that."
- ❌ **No Guessing:** If input is missing, ask immediately rather than wasting tokens on a generic guess.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Extreme brevity can occasionally hide important nuances; use concise inline comments (`// crucial step`) for critical notes.

## Security & Safety Notes

- Never prune safety headers, environment-specific security constraints, or system-level instructions during the compression stage.
- Maintain original system instructions at the "Root" of the context to prevent context-loss-based jailbreaks.

## Common Pitfalls

- **Problem:** The response is so brief it lacks the context needed for implementation.
  **Solution:** Use concise inline code comments instead of separate paragraphs of text.

- **Problem:** The agent loses the overarching goal due to over-compression.
  **Solution:** Always pin the "Primary Objective" to the top of every pruned prompt.

## Related Skills

- `@atomic-precision-response` - Specifically for removing conversational filler.
- `@context-sharding` - For managing large-scale documentation mapping.

