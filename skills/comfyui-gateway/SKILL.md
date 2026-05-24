---
id: 'comfyui-gateway'
name: comfyui-gateway
description: REST API gateway for ComfyUI servers. Workflow management, job queuing, webhooks, caching, auth, rate limiting, and image delivery (URL + base64).
risk: safe
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
category: security-offensive
---

# ComfyUI Gateway

## Overview

REST API gateway for ComfyUI servers. Workflow management, job queuing, webhooks, caching, auth, rate limiting, and image delivery (URL + base64).

## When to Use This Skill

- When the user mentions "comfyui" or related topics
- When the user mentions "comfy ui" or related topics
- When the user mentions "stable diffusion api gateway" or related topics
- When the user mentions "gateway comfyui" or related topics
- When the user mentions "api gateway imagens" or related topics
- When the user mentions "queue imagens" or related topics

## Do Not Use This Skill When

- The task is unrelated to comfyui gateway
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

A production-grade REST API gateway that transforms any ComfyUI server into a universal,
secure, and scalable service. Supports workflow templates with placeholders, job queuing
with priorities, webhook callbacks, result caching, and multiple storage backends.

## Architecture Overview

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌──────────┐
│   Clients    │────▶│        ComfyUI Gateway           │────▶│ ComfyUI  │
│ (curl, n8n,  │     │                                  │     │ Server   │
│  Claude,     │     │  ┌─────────┐  ┌──────────────┐  │     │ (local/  │
│  Lovable,    │     │  │ Fastify │  │ BullMQ Queue │  │     │  remote) │
│  Supabase)   │     │  │ API     │──│ (or in-mem)  │  │     └──────────┘
│              │◀────│  └─────────┘  └──────────────┘  │
│              │     │  ┌─────────┐  ┌──────────────┐  │     ┌──────────┐
│              │     │  │ Auth +  │  │ Storage      │  │────▶│ S3/MinIO │
│              │     │  │ RateL.  │  │ (local/S3)   │  │     │(optional)│
│              │     │  └─────────┘  └──────────────┘  │     └──────────┘
└─────────────┘     └──────────────────────────────────┘
```

## Components

| Component | Purpose | File(s) |
|-----------|---------|---------|
| **API Gateway** | REST endpoints, validation, CORS | `src/api/` |
| **Worker** | Processes jobs, talks to ComfyUI | `src/worker/` |
| **ComfyUI Client** | HTTP + WebSocket to ComfyUI | `src/comfyui/` |
| **Workflow Manager** | Template storage, placeholder rendering | `src/workflows/` |
| **Storage Provider** | Local disk + S3-compatible | `src/storage/` |
| **Cache** | Hash-based deduplication | `src/cache/` |
| **Notifier** | Webhook with HMAC signing | `src/notifications/` |
| **Auth** | API key + JWT + rate limiting | `src/auth/` |
| **DB** | SQLite (better-sqlite3) or Postgres | `src/db/` |
| **CLI** | Init, add-workflow, run, worker | `src/cli/` |

## Quick Start

```bash

## 1. Install

cd comfyui-gateway
npm install

## 2. Configure

cp .env.example .env

## 3. Initialize

npx tsx src/cli/index.ts init

## 4. Add A Workflow

npx tsx src/cli/index.ts add-workflow ./workflows/sdxl_realism_v1.json \
  --id sdxl_realism_v1 --schema ./workflows/sdxl_realism_v1.schema.json

## 5. Start (Api + Worker In One Process)

npm run dev

## Or Separately:

npm run start:api   # API only
npm run start:worker # Worker only
```

## Environment Variables

All configuration is via `.env` — nothing is hardcoded:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `HOST` | `0.0.0.0` | API bind address |
| `COMFYUI_URL` | `http://127.0.0.1:8188` | ComfyUI server URL |
| `COMFYUI_TIMEOUT_MS` | `300000` | Max wait for ComfyUI (5min) |
| `API_KEYS` | `""` | Comma-separated API keys (`key:role`) |
| `JWT_SECRET` | `""` | JWT signing secret (empty = JWT disabled) |
| `REDIS_URL` | `""` | Redis URL (empty = in-memory queue) |
| `DATABASE_URL` | `./data/gateway.db` | SQLite path or Postgres URL |
| `STORAGE_PROVIDER` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_PATH` | `./data/outputs` | Local output directory |
| `S3_ENDPOINT` | `""` | S3/MinIO endpoint |
| `S3_BUCKET` | `""` | S3 bucket name |
| `S3_ACCESS_KEY` | `""` | S3 access key |
| `S3_SECRET_KEY` | `""` | S3 secret key |
| `S3_REGION` | `us-east-1` | S3 region |
| `WEBHOOK_SECRET` | `""` | HMAC signing secret for webhooks |
| `WEBHOOK_ALLOWED_DOMAINS` | `*` | Comma-separated allowed callback domains |
| `MAX_CONCURRENCY` | `1` | Parallel jobs per GPU |
| `MAX_IMAGE_SIZE` | `2048` | Maximum dimension (width or height) |
| `MAX_BATCH_SIZE` | `4` | Maximum batch size |
| `CACHE_ENABLED` | `true` | Enable result caching |
| `CACHE_TTL_SECONDS` | `86400` | Cache TTL (24h) |
| `RATE_LIMIT_MAX` | `100` | Requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1min) |
| `LOG_LEVEL` | `info` | Pino log level |
| `PRIVACY_MODE` | `false` | Redact prompts from logs |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `NODE_ENV` | `development` | Environment |

## Health & Capabilities

```
GET /health
→ { ok: true, version, comfyui: { reachable, url, models? }, uptime }

GET /capabilities
→ { workflows: [...], maxSize, maxBatch, formats, storageProvider }
```

## Workflows (Crud)

```
GET    /workflows            → list all workflows
POST   /workflows            → register new workflow
GET    /workflows/:id        → workflow details + input schema
PUT    /workflows/:id        → update workflow
DELETE /workflows/:id        → remove workflow
```

## Jobs

```
POST   /jobs                 → create job (returns jobId immediately)
GET    /jobs/:jobId          → status + progress + outputs
GET    /jobs/:jobId/logs     → sanitized execution logs
POST   /jobs/:jobId/cancel   → request cancellation
GET    /jobs                 → list jobs (filters: status, workflowId, after, before, limit)
```

## Outputs

```
GET    /outputs/:jobId       → list output files + metadata
GET    /outputs/:jobId/:file → download/stream file
```

## Job Lifecycle

```
queued → running → succeeded
                 → failed
                 → canceled
```

1. Client POSTs to `/jobs` with workflowId + inputs
2. Gateway validates, checks cache, checks idempotency
3. If cache hit → returns existing outputs immediately (status: `cache_hit`)
4. Otherwise → enqueues job, returns `jobId` + `pollUrl`
5. Worker picks up job, renders workflow template, submits to ComfyUI
6. Worker polls ComfyUI for progress (or listens via WebSocket)
7. On completion → downloads outputs, stores them, updates DB
8. If callbackUrl → sends signed webhook POST
9. Client polls `/jobs/:jobId` or receives webhook

## Workflow Templates

Workflows are ComfyUI JSON with `{{placeholder}}` tokens. The gateway resolves
these at runtime using the job's `inputs` and `params`:

```json
{
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "seed": "{{seed}}",
      "steps": "{{steps}}",
      "cfg": "{{cfg}}",
      "sampler_name": "{{sampler}}",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "{{prompt}}",
      "clip": ["4", 1]
    }
  }
}
```

Each workflow has an `inputSchema` (Zod) that validates what the client sends.

## Security Model

- **API Keys**: `X-API-Key` header; keys configured via `API_KEYS` env var as `key1:admin,key2:user`
- **JWT**: Optional; when `JWT_SECRET` is set, accepts `Authorization: Bearer <token>`
- **Roles**: `admin` (full CRUD on workflows + jobs), `user` (create jobs, read own jobs)
- **Rate Limiting**: Per key + per IP, configurable window and max
- **Webhook Security**: HMAC-SHA256 signature in `X-Signature` header
- **Callback Allowlist**: Only approved domains receive webhooks
- **Privacy Mode**: When enabled, prompts are redacted from logs and DB
- **Idempotency**: `metadata.requestId` prevents duplicate processing
- **CORS**: Configurable allowed origins
- **Input Validation**: Zod schemas on every endpoint; max size/batch enforced

## Comfyui Integration

The gateway communicates with ComfyUI via its native HTTP API:

| ComfyUI Endpoint | Gateway Usage |
|------------------|---------------|
| `POST /prompt` | Submit rendered workflow |
| `GET /history/{id}` | Poll job completion |
| `GET /view?filename=...` | Download generated images |
| `GET /object_info` | Discover available nodes/models |
| `WS /ws?clientId=...` | Real-time progress (optional) |

The client auto-detects ComfyUI version and adapts:
- Tries WebSocket first for progress, falls back to polling
- Handles both `/history` response formats
- Detects OOM errors and classifies them with recommendations

## Cache Strategy

Cache key = SHA-256 of `workflowId + sorted(inputs) + sorted(params) + checkpoint`.
On cache hit, the gateway returns a "virtual" job with pre-existing outputs — no GPU
computation needed. Cache is stored alongside job data in the DB with configurable TTL.

## Error Classification

| Error Code | Meaning | Retry? |
|------------|---------|--------|
| `COMFYUI_UNREACHABLE` | Cannot connect to ComfyUI | Yes (with backoff) |
| `COMFYUI_OOM` | Out of memory on GPU | No (reduce dimensions) |
| `COMFYUI_TIMEOUT` | Execution exceeded timeout | Maybe (increase timeout) |
| `COMFYUI_NODE_ERROR` | Node execution failed | No (check workflow) |
| `VALIDATION_ERROR` | Invalid inputs | No (fix request) |
| `WORKFLOW_NOT_FOUND` | Unknown workflowId | No (register workflow) |
| `RATE_LIMITED` | Too many requests | Yes (wait) |
| `AUTH_FAILED` | Invalid/missing credentials | No (fix auth) |
| `CACHE_HIT` | (Not an error) Served from cache | N/A |

## Bundled Workflows

Three production-ready workflow templates are included:

## 1. `Sdxl_Realism_V1` — Photorealistic Generation

- Checkpoint: SDXL base
- Optimized for: Portraits, landscapes, product shots
- Default: 1024x1024, 30 steps, cfg 7.0

## 2. `Sprite_Transparent_Bg` — Game Sprites With Alpha

- Checkpoint: SD 1.5 or SDXL
- Optimized for: 2D game assets, transparent backgrounds
- Default: 512x512, 25 steps, cfg 7.5

## 3. `Icon_512` — App Icons With Optional Upscale

- Checkpoint: SDXL base
- Optimized for: Square icons, clean edges
- Default: 512x512, 20 steps, cfg 6.0, optional 2x upscale

## Observability

- **Structured Logs**: Pino JSON logs with `correlationId` on every request
- **Metrics**: Jobs queued/running/succeeded/failed, avg processing time, cache hit rate
- **Audit Log**: Admin actions (workflow CRUD, key management) logged with timestamp + actor

## Cli Reference

```bash
npx tsx src/cli/index.ts init                    # Create dirs, .env.example
npx tsx src/cli/index.ts add-workflow <file>      # Register workflow template
  --id <id> --name <name> --schema <schema.json>
npx tsx src/cli/index.ts list-workflows           # Show registered workflows
npx tsx src/cli/index.ts run                      # Start API server
npx tsx src/cli/index.ts worker                   # Start job worker
npx tsx src/cli/index.ts health                   # Check ComfyUI connectivity
```

## Troubleshooting

Read `references/troubleshooting.md` for detailed guidance on:
- ComfyUI not reachable (firewall, wrong port, Docker networking)
- OOM errors (reduce resolution, batch, or steps)
- Slow generation (GPU utilization, queue depth, model loading)
- Webhook failures (DNS, SSL, timeout, domain allowlist)
- Redis connection issues (fallback to in-memory)
- Storage permission errors (local path, S3 credentials)

## Integration Examples

Read `references/integration.md` for ready-to-use examples with:
- curl commands for every endpoint
- n8n webhook workflow
- Supabase Edge Function caller
- Claude Code / Claude.ai integration
- Python requests client
- JavaScript fetch client

## File Structure

```
comfyui-gateway/
├── SKILL.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── api/
│   │   ├── server.ts          # Fastify setup + plugins
│   │   ├── routes/
│   │   │   ├── health.ts      # GET /health, /capabilities
│   │   │   ├── workflows.ts   # CRUD /workflows
│   │   │   ├── jobs.ts        # CRUD /jobs
│   │   │   └── outputs.ts     # GET /outputs
│   │   ├── middleware/
│   │   │   └── error-handler.ts
│   │   └── plugins/
│   │       ├── auth.ts        # API key + JWT
│   │       ├── rate-limit.ts
│   │       └── cors.ts
│   ├── worker/
│   │   └── processor.ts       # Job processor
│   ├── comfyui/
│   │   └── client.ts          # ComfyUI HTTP + WS client
│   ├── storage/
│   │   ├── index.ts           # Provider factory
│   │   ├── local.ts           # Local filesystem
│   │   └── s3.ts              # S3-compatible
│   ├── workflows/
│   │   └── manager.ts         # Template CRUD + rendering
│   ├── cache/
│   │   └── index.ts           # Hash-based cache
│   ├── notifications/
│   │   └── webhook.ts         # HMAC-signed callbacks
│   ├── auth/
│   │   └── index.ts           # Key/JWT validation + roles
│   ├── db/
│   │   ├── index.ts           # DB factory (SQLite/Postgres)
│   │   └── migrations.ts      # Schema creation
│   ├── cli/
│   │   └── index.ts           # CLI commands
│   ├── utils/
│   │   ├── config.ts          # Env loading + validation
│   │   ├── errors.ts          # Error classes
│   │   ├── logger.ts          # Pino setup
│   │   └── hash.ts            # SHA-256 hashing
│   └── index.ts               # Main entrypoint
├── config/
│   └── workflows/             # Bundled workflow templates
│       ├── sdxl_realism_v1.json
│       ├── sdxl_realism_v1.schema.json
│       ├── sprite_transparent_bg.json
│       ├── sprite_transparent_bg.schema.json
│       ├── icon_512.json
│       └── icon_512.schema.json
├── data/
│   ├── outputs/               # Generated images
│   ├── workflows/             # User-added wor

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `ai-studio-image` - Complementary skill for enhanced analysis
- `image-studio` - Complementary skill for enhanced analysis
- `stability-ai` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Audit a Node.js API for OWASP Top 10 vulnerabilities

Review the Express routes in `src/routes/` for injection, broken auth, and insecure deserialization issues.

### Example 2: Threat model a new microservice

Apply STRIDE to the payment service: identify spoofing risks on the JWT endpoint and tampering risks on the webhook handler.

