---
name: comfyui-gateway
description: REST API gateway for ComfyUI servers. Workflow management, job queuing, webhooks, caching, auth, rate limiting, and image delivery (URL + base64).
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- comfyui
- api-gateway
- image-generation
- typescript
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# ComfyUI Gateway

## Overview

Design or review a REST gateway around an existing ComfyUI server. This skill
contains documentation only: no gateway application, package manifest, Dockerfile,
CLI, database migrations or runnable workflow templates are bundled. Obtain the
actual implementation and its version before proposing install or startup commands.
The proposed gateway routes below are not native ComfyUI endpoints.

## When to Use

Use when designing ComfyUI job submission, authenticated result delivery, worker
queues or webhook integrations. For direct ComfyUI calls, consult its native API.

## Architecture and contract

A gateway can validate requests, map reviewed workflow templates, submit work to
ComfyUI, persist job state and deliver authorized outputs. Fastify, BullMQ, Redis,
SQLite/Postgres and S3 are possible components, not installed capabilities.

| Proposed gateway operation | Required behavior |
|---|---|
| POST /jobs | Authenticate caller; validate bounded inputs; authorize workflow; return job ID |
| GET /jobs/:id | Return only jobs accessible to this principal |
| POST /jobs/:id/cancel | Authorize cancellation; distinguish requested from confirmed cancellation |
| GET /outputs/:id/:file | Enforce ownership and path containment; never trust caller file paths |
| Workflow CRUD | Require admin authorization and audit changes |
| Health/capabilities | Expose minimal operational information without secrets |

Specify one state vocabulary, for example queued, running, succeeded, failed and
canceled. Persist transitions atomically. A client timeout does not cancel server
work. Define restart recovery, idempotency-key scope/expiry and retry behavior;
Redis alone does not prove durability or exactly-once execution.

Native ComfyUI routes include POST /prompt, GET /history/{prompt_id}, GET /view,
GET /object_info and WS /ws. Validate the pinned server's request/response shapes.
Export a complete API-format workflow from ComfyUI; a two-node fragment with
references to absent nodes cannot execute. Preserve numeric input types when
rendering templates and reject unknown nodes/parameters.

## Security and operating boundaries

- Bind development listeners to loopback. Remote deployments require TLS,
  authentication, per-principal authorization and network controls. CORS is not
  access control. Fail startup when required credentials are missing.
- Keep API/JWT/storage secrets in a secret store; do not echo environment files,
  embed admin keys in browser clients or issue ad-hoc admin JWTs to fix access.
- Restrict callback origins and resolved IPs, block private/metadata networks as
  appropriate, and revalidate every redirect or disable redirects. A hostname
  allowlist alone does not prevent SSRF or DNS rebinding.
- Sign exact webhook bytes and validate before side effects. Add replay handling
  and durable deduplication; acknowledge only after durable acceptance.
- Keep outputs private by default. Restrict filesystem paths, tenant cache keys
  and signed URL lifetimes. Include workflow/model/version/seed in cache identity;
  random-seed jobs must not accidentally reuse another generation or tenant data.
- Bound job count, dimensions, batch, wall time, polling, download bytes and cost.
  More steps usually increase time; diagnose the actual memory-failing node before
  promising that fewer steps solve OOM. Model, hardware and custom nodes matter.
- Review model/custom-node licenses and code before activation. Show planned
  installation, deployment, data transmission and destructive actions for approval.

## Example

User: “Put our local ComfyUI behind a job API.”

Response: “First identify the reviewed server/gateway commit, complete workflow,
allowed callers and output retention. I will propose a job-state/auth contract,
then test invalid inputs, cross-user job access, callback SSRF, replay, restart
recovery and cancellation in an isolated deployment before exposing it.”

Read [integration guidance](references/integration.md) for webhook verification
and [troubleshooting](references/troubleshooting.md) for bounded diagnosis.

## Limitations

This is a design reference, not a deployable gateway or production-security
certification. No runtime/API compatibility, throughput, automatic fallback,
privacy mode, included model or deployment guarantee is established by this tree.
Require tests against the actual implementation before asserting those features.

## Sources

- [ComfyUI server routes](https://docs.comfy.org/development/comfyui-server/comms_routes)
- [Node constant-time comparison](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
