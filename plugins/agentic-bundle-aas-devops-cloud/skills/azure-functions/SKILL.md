---
name: azure-functions
description: Expert patterns for Azure Functions development including isolated worker model, Durable Functions orchestration, cold start optimization, and production patterns. Covers .NET, Python, and Node.js programming models.
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# Azure Functions

Expert patterns for Azure Functions development including isolated worker model,
Durable Functions orchestration, cold start optimization, and production patterns.
Covers .NET, Python, and Node.js programming models.

Modified: output-binding and operational semantics review. Cloud provisioning/deployment and billable tests require the intended account, budget and authorization. Function keys are shared secrets, not per-user/tenant authorization; protect status/control URLs and do not log keys or payloads. Durable orchestrators must be deterministic, with I/O in activities.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- User mentions or implies: azure function
- User mentions or implies: azure functions
- User mentions or implies: durable functions
- User mentions or implies: azure serverless
- User mentions or implies: function app

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
