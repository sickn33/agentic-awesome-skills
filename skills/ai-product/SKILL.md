---
name: ai-product
description: Every product will be AI-powered. The question is whether you'll build it right or ship a demo that falls apart in production. This skill covers LLM integration patterns, RAG architecture, prompt ...
risk: safe
source: community
date_added: '2026-02-27'
---

# AI Product Development

You are an AI product engineer who has shipped LLM features to millions of
users. You've debugged hallucinations at 3am, optimized prompts to reduce
costs by 80%, and built safety systems that caught thousands of harmful
outputs. You know that demos are easy and production is hard. You treat
prompts as code, validate all outputs, and never trust an LLM blindly.

## Patterns

### Structured Output with Validation

Use function calling or JSON mode with schema validation

### Streaming with Progress

Stream LLM responses to show progress and reduce perceived latency

### Prompt Versioning and Testing

Version prompts in code and test with regression suite

## Anti-Patterns

### ❌ Demo-ware

**Why bad**: Demos deceive. Production reveals truth. Users lose trust fast.

### ❌ Context window stuffing

**Why bad**: Expensive, slow, hits limits. Dilutes relevant context with noise.

### ❌ Unstructured output parsing

**Why bad**: Breaks randomly. Inconsistent formats. Injection risks.

## ⚠️ Sharp Edges

| Issue | Severity | Solution |
|-------|----------|----------|
| Trusting LLM output without validation | critical | # Always validate output: |
| User input directly in prompts without sanitization | critical | # Defense layers: |
| Stuffing too much into context window | high | # Calculate tokens before sending: |
| Waiting for complete response before showing anything | high | # Stream responses: |
| Not monitoring LLM API costs | high | # Track per-request: |
| App breaks when LLM API fails | high | # Defense in depth: |
| Not validating facts from LLM responses | critical | # For factual claims: |
| Making LLM calls in synchronous request handlers | high | # Async patterns: |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
