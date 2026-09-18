---
name: llm-app-patterns
description: Architecture and integration sketches for LLM applications, with explicit retrieval, tool, privacy and verification boundaries.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# 🤖 LLM Application Patterns

> Architecture and integration sketches for LLM applications, with explicit retrieval, tool, privacy and verification boundaries.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use this skill when:

- Designing LLM-powered applications
- Implementing RAG (Retrieval-Augmented Generation)
- Building AI agents with tools
- Setting up LLMOps monitoring
- Choosing between agent architectures

---

## Inputs, worked example and verification

Record provider/SDK versions, authorized data and tools, request/response schemas, latency/cost budgets and the expected task outcome. All code above is an integration sketch: `llm`, database, parser and provider-response adapters are project-owned and must be implemented explicitly. Never execute model-provided Python, expressions or fuzzy tool names; dispatch only exact registered tools after schema and authorization checks. Enforce per-call deadlines as well as loop limits.

Example: a planner first queues steps A and B, then after A replaces the remaining work with C. The executor must run A then C, never stale B. A parser step must apply the parser to the actual prior output. Two tenants with the same prompt must produce different cache keys, and cache reads/writes require an explicit reuse policy. These are concrete regression assertions; successful mocks still do not prove live provider behavior.

The limiter sketch is single-threaded and process-local. A distributed deployment needs a shared atomic limit and deadlines. Retry only retry-safe operations, honoring provider retry guidance; a timeout after a side effect is not evidence that nothing happened. See [Tenacity retry predicates](https://tenacity.readthedocs.io/en/latest/).

## Limitations

- A retrieved source list does not prove each answer claim is supported; verify claim-to-source evidence and abstention behavior.
- Prompt text and JSON-shaped output are not authorization boundaries. Enforce permissions in the application.
- Provider failover can change output quality, tool schemas, cost and data residency; only use pre-approved compatible fallbacks.
- Caching must respect tenant access, data/prompt revisions and deletion policy; temperature zero does not make output deterministic.
- Model/SDK examples are not a complete service, benchmark or production-readiness certificate.
