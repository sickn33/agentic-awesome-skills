---
name: llm-prompt-optimizer
description: "Use when improving prompts for any LLM. Applies proven prompt engineering techniques to boost output quality, reduce hallucinations, and cut token usage."
risk: safe
source: community
date_added: "2026-03-04"
---

# LLM Prompt Optimizer

## Overview

This skill transforms weak, vague, or inconsistent prompts into precision-engineered instructions that reliably produce high-quality outputs from any LLM (Claude, Gemini, GPT-4, Llama, etc.). It applies systematic prompt engineering frameworks — from zero-shot to few-shot, chain-of-thought, and structured output patterns.

## When to Use This Skill

- Use when a prompt returns inconsistent, vague, or hallucinated results
- Use when you need structured/JSON output from an LLM reliably
- Use when designing system prompts for AI agents or chatbots
- Use when you want to reduce token usage without sacrificing quality
- Use when implementing chain-of-thought reasoning for complex tasks
- Use when prompts work on one model but fail on another

## Step-by-Step Guide

### 1. Diagnose the Weak Prompt

Before optimizing, identify which problem pattern applies:

| Problem | Symptom | Fix |
|---------|---------|-----|
| Too vague | Generic, unhelpful answers | Add role + context + constraints |
| No structure | Unformatted, hard-to-parse output | Specify output format explicitly |
| Hallucination | Confident wrong answers | Add "say I don't know if unsure" |
| Inconsistent | Different answers each run | Add few-shot examples |
| Too long | Verbose, padded responses | Add length constraints |

### 2. Apply the RSCIT Framework

Every optimized prompt should have:

- **R** — **Role**: Who is the AI in this interaction?
- **S** — **Situation**: What context does it need?
- **C** — **Constraints**: What are the rules and limits?
- **I** — **Instructions**: What exactly should it do?
- **T** — **Template**: What should the output look like?

**Before (weak prompt):**
```
Explain machine learning.
```

**After (optimized prompt):**
```
You are a senior ML engineer explaining concepts to a junior developer.

Context: The developer has 1 year of Python experience but no ML background.

Task: Explain supervised machine learning in simple terms.

Constraints:
- Use an analogy from everyday life
- Maximum 200 words
- No mathematical formulas
- End with one actionable next step

Format: Plain prose, no bullet points.
```

### 3. Chain-of-Thought (CoT) Pattern

For reasoning tasks, instruct the model to think step-by-step:

```
Solve this problem step by step, showing your work at each stage.
Only provide the final answer after completing all reasoning steps.

Problem: [your problem here]

Thinking process:
Step 1: [identify what's given]
Step 2: [identify what's needed]
Step 3: [apply logic or formula]
Step 4: [verify the answer]

Final Answer:
```

### 4. Few-Shot Examples Pattern

Provide 2-3 examples to establish the pattern:

```
Classify the sentiment of customer reviews as POSITIVE, NEGATIVE, or NEUTRAL.

Examples:
Review: "This product exceeded my expectations!" -> POSITIVE
Review: "It arrived broken and support was useless." -> NEGATIVE  
Review: "Product works as described, nothing special." -> NEUTRAL

Now classify:
Review: "[your review here]" ->
```

### 5. Structured JSON Output Pattern

```
Extract the following information from the text below and return it as valid JSON only.
Do not include any explanation or markdown — just the raw JSON object.

Schema:
{
  "name": string,
  "email": string | null,
  "company": string | null,
  "role": string | null
}

Text: [input text here]
```

### 6. Reduce Hallucination Pattern

```
Answer the following question based ONLY on the provided context.
If the answer is not contained in the context, respond with exactly: "I don't have enough information to answer this."
Do not make up or infer information not present in the context.

Context:
[your context here]

Question: [your question here]
```

### 7. Prompt Compression Techniques

Reduce token count without losing effectiveness:

```
# Verbose (expensive)
"Please carefully analyze the following code and provide a detailed explanation of 
what it does, how it works, and any potential issues you might find."

# Compressed (efficient, same quality)
"Analyze this code: explain what it does, how it works, and flag any issues."
```

## Best Practices

- ✅ **Do:** Always specify the output format (JSON, markdown, plain text, bullet list)
- ✅ **Do:** Use delimiters (```, ---) to separate instructions from content
- ✅ **Do:** Test prompts with edge cases (empty input, unusual data)
- ✅ **Do:** Version your system prompts in source control
- ✅ **Do:** Add "think step by step" for math, logic, or multi-step tasks
- ❌ **Don't:** Use negative-only instructions ("don't be verbose") — add positive alternatives
- ❌ **Don't:** Assume the model knows your codebase context — always include it
- ❌ **Don't:** Use the same prompt across different models without testing — they behave differently

## Prompt Audit Checklist

Before using a prompt in production:

- [ ] Does it have a clear role/persona?
- [ ] Is the output format explicitly defined?
- [ ] Are edge cases handled (empty input, ambiguous data)?
- [ ] Is the length appropriate (not too long/short)?
- [ ] Has it been tested on 5+ varied inputs?
- [ ] Is hallucination risk addressed for factual tasks?

## Troubleshooting

**Problem:** Model ignores format instructions
**Solution:** Move format instructions to the END of the prompt, after examples. Use strong language: "You MUST return only valid JSON."

**Problem:** Inconsistent results between runs
**Solution:** Lower the temperature setting (0.0-0.3 for factual tasks). Add more few-shot examples.

**Problem:** Prompt works in playground but fails in production
**Solution:** Check if system prompt is being sent correctly. Verify token limits aren't being exceeded (use a token counter).

**Problem:** Output is too long
**Solution:** Add explicit word/sentence limits: "Respond in exactly 3 bullet points, each under 20 words."

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
