---
description: Curated upstream guidance for Apify Integration Development; use when the workflow matches the user goal.
name: apify-integration-development
source_repo: apify/agent-skills
source_type: official
source: apify
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Apify Integration Development

Design and build an **official Apify integration** for a company's product, with minimal help from Apify. This skill covers every integration shape Apify supports - workflow-automation apps, AI agent plugins (coding agents and harnesses), AI framework packages, and direct application clients - so a partner team can ship a first-class Apify integration end to end. The cross-cutting rules below apply to all of them, and one category-specific reference file carries the rest.

> **Building an official integration?** Once you publish it, contact **integrations@apify.com** so the Apify team can review, test, and validate your integration before it reaches users. We'll check the capability surface, cost controls, error handling, and attribution headers, and help you close any gaps.

## Step 0 - Learn the Apify model first (required)

Before designing anything, fetch and read `https://apify.com/agents.md`. It is the canonical quickstart for AI agents and the single source of truth for vocabulary, the run flow, and the cost rule. If the fetch fails, the mini-glossary below keeps the skill usable.

Apify vocabulary (always written with a capital A on the platform):

- **Actor** - a serverless cloud program that takes JSON input, performs a task, and produces structured output. Not an AI agent.
- **Actor Run** - one execution of an Actor. Each run has its own dataset, key-value store, and request queue, and ends in a terminal status (`SUCCEEDED`, `FAILED`, `TIMED-OUT`, `ABORTED`).
- **Dataset** - append-only structured storage for a run's results. An Actor call returns the dataset ID, not its contents.
- **Key-Value Store** - unstructured/file storage (screenshots, HTML, OUTPUT).
- **Actor Task** - a saved, parameterized configuration for running an Actor.
- **Apify Store** - the marketplace of Actors at `https://apify.com/store.md`.
- **Apify Console** - the web UI at `https://console.apify.com`.
- **Compute Unit (CU)** - billing unit: memory (MB) x duration (hours).

Further terms (build, standby, request queue, proxy, pricing models): `https://docs.apify.com/llms.txt`.

## Use Apify MCP for live context while planning

The Apify MCP server is the fastest way to research Actors, schemas, pricing, and docs during integration design. See `https://docs.apify.com/integrations/mcp` (append `.md` for a markdown version).

If Apify MCP tools are already available in this environment, use them:

- `search-actors` - find Actors by platform/product keyword (search by product name, not end goal).
- `fetch-actor-details` - read an Actor's input schema, output format, README, and pricing before you encode its shape into the integration.
- `search-apify-docs` / `fetch-apify-docs` - pull contextual documentation pages.

The anonymous discovery subset (`search-actors`, `fetch-actor-details`, `search-apify-docs`, `fetch-apify-docs`) works without an account, so you can research even before the developer has connected their token.

## Pick your integration shape

Read exactly one reference file based on the product you are integrating into. Each reference carries the category-specific UX design, a canonical capability matrix, and a definition-of-done checklist.

| Product shape | Examples | Read |
|---|---|---|
| Workflow automation platform | Zapier, n8n, Make, Pipedream, Activepieces | `references/workflow-automation.md` |
| AI agent plugin (coding agent or harness) | Cursor, Claude Code, Codex, GitHub Copilot (coding agents); OpenClaw-style runtimes, Hermes-style harnesses (harnesses) | `references/ai-harness-plugin.md` |
| AI framework package (PyPI/npm for LLM frameworks) | LangChain, LlamaIndex, Haystack, Vercel AI SDK | `references/ai-framework-package.md` |
| Application integration (direct client) | A backend service, scheduled job, product feature calling Actors via `apify-client` or REST | `references/sdk-integration.md` |

Paths are relative to this skill folder. If your product spans two shapes (e.g. an AI harness built on top of a framework package), read both - the rules compose. The AI agent plugin reference covers **two approaches with different trade-offs**: a lightweight skills + MCP bundle for skills/MCP-aware coding agents, and a custom tool-registry plugin for OpenClaw/Hermes-style harnesses.

## Cross-cutting design rules (true for every integration type)

These invariants were extracted from every existing Apify integration. Apply them regardless of shape.

### Vocabulary mirroring
Model the integration's resources on Apify's domain (Actor / Run / Dataset / KV Store / Task). Users coming from Apify Console should find the same concepts under the same names.

### Asynchronous run flow with bounded polling
Actors can run for seconds to hours. Use the asynchronous flow, never the 300-second synchronous endpoint for anything but short jobs:

```
POST /v2/actors/{actorId}/runs            -> start, return runId
GET  /v2/actor-runs/{runId}               -> poll until terminal status
GET  /v2/datasets/{datasetId}/items       -> fetch results on SUCCEEDED
```

Polling must be **bounded**: use the run's own `timeoutSecs` plus a grace buffer, with an absolute ceiling fallback. Never `while (true)`. On a non-terminal status, surface the run ID so the user/agent can poll again or inspect the failure.

### Cost is first-class
Every path that starts a run must expose a cost control. The canonical control is `maxTotalChargeUsd` (caps the run's total charge on most pricing models) and `maxItems` (caps billed items on pay-per-result Actors). Send them as **options / query parameters**, never as Actor input - inside input they are either an Actor-declared field or simply invalid. `0` / empty / null means *no limit*. For LLM-facing integrations, the ceilings are **developer-controlled**; an LLM cannot widen them.

### Attribution headers
Stamp an integration header on every outbound request so Apify can attribute traffic: `x-apify-integration-platform: <your-platform>`. When a request is driven by an AI tool (not a human in a UI), also send `x-apify-integration-ai-tool: true`. If the integration was built using this skill, add `x-apify-integration-origin: apify-integration-development-skill` so Apify can distinguish skill-generated integrations from custom ones. One line, big telemetry payoff.

### Authentication
- Browser / consumer-facing (a human completes a sign-in): OAuth2 with PKCE. Do not ask for raw tokens.
- Headless / server / CI (no human present): API token as `Authorization: Bearer <APIFY_TOKEN>`, stored in an env var or secret manager, never hardcoded or logged.

Both paths are real - pick by who is present at auth time, not by which is easier.

### Centralized HTTP layer
One base-URL constant, shared between credentials and the HTTP layer. Retries with exponential backoff on 429 and 5xx. **Never retry non-idempotent `POST /runs` on network errors** - a duplicate Actor run is a real, billed, side-effecting operation. This is the single most important correctness invariant in the HTTP layer.

### Error taxonomy
Map Apify errors to the host platform's error categories (retryable vs auth vs permanent). Surface the API's actual error text, not a generic HTTP message. For permission-approval failures (a full-permission Actor needs explicit approval), include the approval URL after validating it is an absolute `http(s)` URL. For LLM consumers, return errors **as data** (JSON error objects), never as raised exceptions - the model needs something to read and reason about.

### Webhooks over polling for run-finished events
When the host supports inbound webhooks, register an Apify webhook scoped to `actorId` or `actorTaskId` with the terminal statuses the user picked. Make registration **idempotent** (a re-activated workflow should not create duplicate webhooks), persist the webhook ID so deactivation can clean it up, and always provide sample/fallback data so users can test the trigger without waiting for a real run.

### Generate from OpenAPI where the host allows it
If the host platform can generate UI fields from an OpenAPI spec, use Apify's spec (`https://apify.com/openapi.json`) and a tag allowlist. Hand-write only what the spec cannot express: convenience wrappers, bill-cap fields, lean AI-tool output contracts.

### High-level convenience operations alongside generic runs
Generic "run Actor" serves power users. Add a few opinionated, high-level actions for the common case (e.g. "Scrape single URL" wrapping a content scraper with `maxCrawlDepth: 0`, `maxResults: 1`) so non-power users get a 2-field form instead of a full Actor configuration. Validate the URL *before* starting a paid run.

### Testing and release
Keep two test modes: mocked (hermetic, no credentials) and live E2E (real API, CI-gated). Automate releases through the host platform's CI on Git tags / GitHub Releases. Never hand-edit versions or changelogs if a release workflow manages them.

## Top anti-patterns to refuse on review

1. Retrying `POST /runs` on a network error - duplicates a billed run.
2. Unbounded `while (true)` polling - ties up the host with no ceiling.
3. Putting `maxTotalChargeUsd` / `maxItems` inside Actor input instead of options - silently not a cap.
4. Dumping a full dataset into an LLM context without size caps or untrusted-content fencing - prompt-injection and context blowout.
5. One monolithic tool list for an LLM agent - routing accuracy degrades past ~8 tools; curate subsets.
6. Surfacing a raw HTTP status/message instead of Apify's actual error text - users can't act on "400".

## Minimal API surface every integration needs

| Purpose | Method + path |
|---|---|
| Start an Actor run | `POST /v2/actors/{actorId}/runs` |
| Start a Task run | `POST /v2/actor-tasks/{taskId}/runs` |
| Poll a run | `GET /v2/actor-runs/{runId}` |
| List runs | `GET /v2/actor-runs` |
| Dataset items | `GET /v2/datasets/{datasetId}/items` |
| KV record | `GET /v2/key-value-stores/{storeId}/records/{key}` |
| Set KV record | `PUT /v2/key-value-stores/{storeId}/records/{key}` |
| Store search | `GET /v2/store` |
| Webhook CRUD | `POST/GET/DELETE /v2/webhooks` |
| Validate token / current user | `GET /v2/users/me` |

REST reference: `https://docs.apify.com/api/v2`. OpenAPI spec: `https://apify.com/openapi.json`.

## Working workflow

1. Fetch `https://apify.com/agents.md` and internalize the model.
2. Pick the integration shape above and read the matching reference file.
3. Use Apify MCP (if available) to research the concrete Actors, schemas, and pricing the integration will expose.
4. Draft the **capability matrix** for the chosen category (each reference has one) and the UX spec (resource -> operation -> fields -> errors).
5. Scaffold the integration following the category-specific rules in the reference.
6. Verify against the **definition-of-done checklist** at the end of that reference.

## Reference implementations to study

Real, public integrations per category - read their source when in doubt:

- Workflow automation: `@apify/n8n-nodes-apify` (npm), the Apify Zapier app.
- AI agent plugins (coding agents): the Apify plugin bundle (MCP server + skills + router + slash commands) shipped for Cursor, Claude Code, Copilot, and similar tools.
- AI agent plugins (harnesses): `apify-hermes-agent-plugin` (PyPI), `@apify/apify-openclaw-plugin`.
- AI framework packages: `langchain-apify` (PyPI).
- Application integration: see `references/sdk-integration.md` for the canonical `apify-client` usage in JS/TS, Python, and over REST.

Support for integration questions: `integrations@apify.com`. Contact us both for design guidance while you build and for review/testing once you publish - we validate the capability surface, cost controls, error handling, and attribution before the integration reaches users.


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
