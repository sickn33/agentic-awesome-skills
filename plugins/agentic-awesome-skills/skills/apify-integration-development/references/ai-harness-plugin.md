# AI agent plugin integrations

Design guide for building an Apify plugin that gives an AI agent access to Actors. There are **two plugin shapes**, and which one you build depends on the host:

- **Approach A - Coding agent plugin (skills + MCP bundle):** for skills/MCP-aware coding assistants like Cursor, Claude Code, Codex, and GitHub Copilot. You assemble a small set of runtime artifacts the host already knows how to load, and the hosted Apify MCP server (`https://mcp.apify.com`) provides the tool surface. Minimal code.
- **Approach B - Harness / assistant plugin (custom tool registry):** for agent runtimes like OpenClaw-style runtimes and Hermes-style harnesses that have their own tool registry and config file. You build a small custom toolset (`discover` / `start` / `collect`) backed by the `apify-client` SDK, using a stored credential rather than per-session OAuth.

Apply the cross-cutting rules from `SKILL.md` on top of either approach.

## Which approach? Trade-offs

| Dimension | A - Coding agent plugin (skills + MCP) | B - Harness / assistant plugin (custom registry) |
|---|---|---|
| Target hosts | Cursor, Claude Code, Codex, GitHub Copilot | OpenClaw-style runtimes, Hermes-style harnesses, custom tool-calling agents |
| Tool surface | Hosted Apify MCP server - no tool code to write | You implement `discover` / `start` / `collect` yourself |
| Auth | OAuth (MCP) / `apify login` (CLI) / `APIFY_TOKEN` (SDK), per route | Stored API key resolved by the plugin, passed to `apify-client` |
| Build effort | Low - assemble artifacts, no HTTP/retry/registry code | Higher - tools, schema, error taxonomy, host gotchas |
| Capabilities | Run existing Actors **and** build/test/deploy new Actors **and** integrate an app | Broker the Store to the agent (run existing Actors) |
| Maintenance | The MCP server owns the runtime surface | You own the tool code plus host-SDK compatibility |
| Best when | The host supports skills/MCP and you want the fastest path | The host has its own registry and needs bespoke tools |

If the host is a skills/MCP-aware coding tool, prefer Approach A. If the host is a custom harness with its own registry (no MCP), use Approach B. A product can ship both over time - start with whichever matches the primary host.

---

# Approach A - Coding agent plugin (skills + MCP bundle)

For skills/MCP-aware coding assistants (Cursor, Claude Code, Codex, GitHub Copilot). This section describes the **installed plugin** - what the user gets and how the pieces interact at runtime - not how the bundle is produced.

## A.1 The four runtime artifacts

| Artifact | Role at runtime |
|---|---|
| **MCP server** | Registers `https://mcp.apify.com` with the host and exposes the callable tool surface (below). OAuth: the user signs in via browser on the first tool call that needs auth - no token in config. |
| **Skills** | On-demand `SKILL.md` instruction documents. The host matches each skill's `description` against user intent and loads the body into context only when relevant, keeping baseline context small. |
| **Subagent / router** | The entry point. Classifies the request into one of three routes, selects the transport (MCP vs CLI), and invokes the matching skill or tools. |
| **Slash commands** | User-invoked entry points (e.g. `/create-actor <description>`) that drive a guided end-to-end workflow. |

**MCP tool surface** once connected: `search-actors` (search the Store), `fetch-actor-details` (input schema, output format, pricing), `call-actor` (run with input JSON), `get-actor-run` (poll status), `get-dataset-items` (fetch results), `search-apify-docs` / `fetch-apify-docs` (docs). The discovery subset (`search-actors`, `fetch-actor-details`, `search-apify-docs`, `fetch-apify-docs`) works without an account.

## A.2 The three routes the plugin serves

The router classifies every request and routes it:

| Signal | Route | How it runs |
|---|---|---|
| Use existing Actors (search, run, get data) | 1 | MCP tools directly; the CLI is the fallback when MCP is unavailable |
| Build / test / deploy a custom Actor | 2 | Apify CLI (`apify create` / `run` / `push`) - local filesystem, no MCP equivalent |
| Add Apify to an existing app | 3 | `apify-client` over HTTPS - neither MCP nor CLI |

**MCP-vs-CLI selection (Route 1 only).** Detect transports once: MCP is available if a tool named `search-actors` is in the tool list; CLI is available if `apify --help` exits 0. Prefer MCP when present (no shell/install friction, OAuth auth); fall back to the CLI otherwise. Routes 2 and 3 are unaffected.

**Naming trap.** The `apify` npm package is the **SDK for building** Actors (Route 2). The `apify-client` package is the **API client for calling** Actors (Route 3). Never confuse them.

**Auth per route:** Route 1 (MCP) OAuth via browser prompt, never ask for a token; Route 1 CLI fallback + Route 2 `apify login --token <TOKEN>` once (the CLI ignores `APIFY_TOKEN`); Route 3 the `APIFY_TOKEN` env var.

## A.3 Definition of done (Approach A)

- [ ] MCP declared and reachable - `https://mcp.apify.com` registered and its tools appear in the tool list.
- [ ] OAuth works - the first auth-requiring MCP call prompts a browser sign-in; no token in config.
- [ ] Skills load by intent - each skill's `description` matches its requests; bodies load only when relevant.
- [ ] Router classifies correctly - requests land on Route 1 / 2 / 3; ambiguous ones ask the user to choose.
- [ ] Transport selection correct - Route 1 prefers MCP and falls back to CLI cleanly; Routes 2/3 use CLI/SDK.
- [ ] Auth wired per route; the `apify` vs `apify-client` distinction is never confused.
- [ ] Cost caps honored (`maxTotalChargeUsd` / `maxItems`) and attribution headers set (see `SKILL.md`).
- [ ] Slash command (e.g. `/create-actor`) runs end to end.
- [ ] Verified inside the actual target tool, not just in isolation.

---

# Approach B - Harness / assistant plugin (custom tool registry)

For agent runtimes with their own tool registry (OpenClaw-style runtimes, Hermes-style harnesses, or any custom tool-calling agent). The plugin brokers the entire Apify Store to the agent - it does not bundle scrapers.

The harness runs locally/persistently, has its own tool registry and config file, and calls Apify with a stored credential rather than per-session OAuth. So this shape borrows from the "API token + apify-client" path, not the MCP path.

## 1. Shape decision: few composable tools vs a dynamic tool list

Decide based on what the harness supports:

- **Static tool registry** (tools registered once at plugin load, no per-Actor materialization): register a **small, fixed set of composable tools** and let the LLM compose them. This keeps the prompt budget small and the call graph legible.
- **Dynamic tool registration** (the harness can materialize tools at runtime): you *can* expose a dynamic per-Actor tool list, but a fixed trio is still simpler and usually enough.

The MCP server's surface (search / inspect / call / poll / fetch as separate dynamic tools) is one shape. A harness plugin is a different shape - do not copy it blindly.

## 2. Canonical action set: discover / start / collect

Three tools cover the entire workflow and map cleanly to the asynchronous REST flow (`POST /runs` -> poll `GET /actor-runs/{id}` -> `GET /datasets/{id}/items`):

| Tool | Purpose | Why |
|---|---|---|
| **discover** | Search Apify Store by keyword, OR fetch a single Actor's input schema + README by `actorId` | Two modes in one tool: an LLM that just got a list of Actor IDs almost always wants to inspect one next; splitting would double round-trips |
| **start** | Fire-and-forget batch starts (cap batch size, e.g. 10 per call). Accepts cost limiting params (`maxTotalChargeUsd`, `maxItems`) sent as run options, never Actor input | Returns run references (`run_id`, `actor_id`, `default_dataset_id`, optional label) immediately without waiting |
| **collect** | Poll run statuses and return completed dataset results | Re-call with the same run refs until `all_done` is true; return pending / completed / errored runs in separate arrays so the LLM keeps iterating on the pending ones |

`collect` is the only one that needs to be async - it polls runs concurrently (`asyncio.gather` / `Promise.allSettled`) and pushes blocking SDK calls off the event loop. The other two are fast and single-shot.

## 3. Two-phase async execution - never block the agent

Actors run for seconds to minutes. **Do not block the agent's single execution thread on a multi-minute run.** Split start and collect:

- `start` fires the run and returns immediately with a `runId` / `datasetId` reference.
- `collect` polls status and fetches dataset items only once the run reaches a terminal status.

This lets the agent kick off a run, do other useful work (or start more runs in parallel), and come back to collect. `collect` handles multiple runs in one call and reports `completed` / `pending` / `errors` separately so the agent knows whether to poll again.

Do **not** use the synchronous `run-sync-get-dataset-items` endpoint - its 300-second ceiling is shorter than many Actor runs.

## 4. The tool description is the agent's instruction manual

There are no separate Agent Skills inside a harness plugin - the tool description plus the `discover` action provide all the guidance the agent needs. Embed, in plain text:

- A directive to **delegate to a sub-agent** that returns only relevant extracted fields, not raw dataset dumps - keeping the parent agent's context window clean.
- A **batching** instruction: most Actors accept arrays of URLs/queries; one run with 5 URLs is cheaper and faster than 5 runs with 1 URL each.
- A compact **known-actors list** (Instagram, Facebook, TikTok, YouTube, Twitter/X, Google Maps, Booking, TripAdvisor, etc.) so the agent can pick a familiar Actor without a discovery round-trip.
- The Actor ID format, the discover -> start -> collect workflow, and a support contact for user-facing issues.

Hand the agent a short, self-contained instruction set so it can act without external lookups.

## 5. Treat scraped content as untrusted and bounded

Dataset results are arbitrary web data - they can contain text that *looks* like instructions to the LLM. Wrap every dataset before it reaches the model:

- Insert boundary markers: `<<<EXTERNAL_UNTRUSTED_CONTENT>>>` ... `<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>` plus a source metadata line (`apify:<actorId>`).
- **Sanitize** any attempt to forge those markers from within the scraped data.
- Cap the payload size (e.g. 50,000 chars) with a `[\u2026truncated]` marker.
- Cap item count (e.g. `limit` default 100 per run); if the fetched count equals the limit, set `may_have_more: true` and warn so the LLM can re-call with a higher limit.

This is the plugin's analogue of the "keep the run small" cost guidance, applied at *read* time.

## 6. Errors are data, never raised

Every handler catches broadly and returns a **JSON error object**, never a raised exception:

```
except Exception as exc:
    return {'error': str(exc)}
```

Why: a raised exception **crashes the tool call** from the harness's perspective. Returning `{'error': ...}` lets the LLM read the failure, explain it to the user, and decide whether to retry or stop. Extend this to per-run granularity in `start`: a batch can partially succeed, so each failed spec becomes an entry in an `errors` array while successful ones populate `runs`. The LLM can then report "7 of 10 started, 3 failed with these messages" without a second call.

## 7. Auth and setup

- API key resolution order: plugin config field -> `APIFY_API_KEY` (or `APIFY_TOKEN`) env var. Normalize pasted input - strip line/paragraph separators and trim whitespace (defends against copy-paste artifacts).
- The key is **never** included in tool output, **never** logged, only passed to the client constructor.
- Validate `baseUrl` against an allowlist prefix (`https://api.apify.com`) to prevent SSRF - a misconfigured plugin must not point at an arbitrary host.
- Ship a `setup` CLI command that prompts for the key, **verifies it against the live API** (`GET /v2/users/me`), and writes config. **Reuse the host's config-merge logic** for enabling the toolset - do not reimplement it. Host internals reconcile disabled-toolsets, preserve MCP server entries, and handle bookkeeping a from-scratch reimplementation would silently break. If the config-write API is unavailable or fails, fall back to printing the exact config block the user should add manually. Treat setup failures as non-fatal: the token is already saved, so the user can flip the toolset on themselves.

If the harness's `register()` is synchronous and the loader does not `await` it (a common gotcha), keep registration fully synchronous - build the tool (construct a client + schema, no I/O) and register inline. Any network call happens later inside a tool `execute` or CLI action, where async is expected.

## 8. SDK handling and attribution

Use the official `apify-client` SDK (JS or Python), not raw HTTP. Construct the client once, memoized, and rebuilt only when the token changes. Stamp the attribution headers on every request: `x-apify-integration-platform: <your-harness>` and `x-apify-integration-ai-tool: true`. If the integration was built using the Apify integration development skill, also set `x-apify-integration-origin: apify-integration-development-skill`. This is the single most important line for Apify's side of the relationship.

**Compatibility shim:** SDK versions return a mix of Pydantic models and plain dicts, and Pydantic models expose only **snake_case** attributes even when the JSON is **camelCase**. Route *all* response reads through a small `_attr(obj, key, default)` helper that handles either shape. Direct `.attr` / `["key"]` access will silently return defaults on a mismatch.

## 9. Host integration gotchas

- **Entry-point loader semantics:** verify how the harness's loader resolves the plugin entry-point string before writing the packaging line. Some loaders expect a bare module (then `getattr(result, "register")`); others expect `"module:attr"`. Copying the wrong form silently fails to load. Document it with a long comment.
- **Schema validator constraints:** many harness validators reject `anyOf` / `oneOf` / `allOf`. Use a string enum for any discriminated `action` field, `Optional(...)` for optionals (never a nullable union), and a flat `Record(string, unknown)` for `input` (the Actor's real schema is only knowable after a `discover` call). A discriminated `action` plus optional sibling fields is the only shape the validator accepts.
- **Inlined utilities:** if the harness's plugin SDK does not export small helpers (error types, secret normalization, content wrapping), inline stable copies rather than deep-importing internals. Internal file layouts change frequently; deep imports couple the plugin to them. Accept the trade-off that upstream bug fixes won't track.

## 10. Actor ID format: tilde, not slash

Use `username~actor-name` everywhere an Actor ID appears: tool descriptions, `discover` results, `start`/`collect` payloads. The REST API uses `/` as a path delimiter, so a slash-separated ID in a URL is ambiguous. The tilde form is unambiguous and what the SDK and Store APIs accept directly. Build slugs in this form so the agent can pass them straight through to `start` without transformation.

## 11. Dependency injection for tests

The tool factory should accept an optional injected `client`. When omitted, construct a real client from the resolved key; when provided (in tests), bypass it entirely. This lets the test suite exercise every action and edge case - store search, schema fetch, run start, collect success/pending, unknown action, missing key - with no network access, using a hand-rolled mock shaped to the SDK's method-chain surface. No mocking framework needed.

## 12. Known gaps to design for

1. **Poll vs webhook.** `collect` is an LLM-driven poll loop; long-running Actors mean multiple round-trips. A webhook-backed `collect` would be cheaper but requires the harness to expose a callback surface.
2. **Account-free discovery.** If the harness's `check_fn` gates all tools on a token, `discover` requires an account even for research. Consider giving `discover` a separate, looser check so users can browse before connecting.
3. **Surface scope.** Only the basic run-start -> poll -> fetch-dataset flow is exposed. Standby runs, Tasks, and schedules may be out of scope for v0.1 - document the boundary.

## Definition-of-done checklist (Approach B)

- [ ] Fixed, small set of composable tools (`discover` / `start` / `collect`) registered; dynamic list only if the harness truly supports it.
- [ ] Two-phase async: `start` returns refs, `collect` polls; no blocking on long runs.
- [ ] Tool description carries known-actors list, batching instruction, and delegation directive.
- [ ] Dataset output is untrusted-content fenced, size-capped, and marker-sanitized.
- [ ] Errors are returned as data, never raised; partial batch failures are per-item.
- [ ] Setup command verifies the token, reuses host config-merge, and has a manual fallback.
- [ ] Attribution headers (`-platform`, `-ai-tool`, and `-origin`) are set on the client.
- [ ] All SDK response reads go through a compatibility shim.
- [ ] Entry-point loader semantics verified; `register()` is synchronous if the loader does not await.
- [ ] Schema uses string enums + `Optional`, no `anyOf`/`oneOf`; `input` is a record.
- [ ] Actor IDs use the tilde form in all user/agent-facing surfaces.
- [ ] Tool factory accepts an injected client; tests run with no network.
- [ ] Known gaps (webhook, account-free discovery) are documented, not hidden.
- [ ] Cost cap (`maxTotalChargeUsd` / `maxItems`) is plumbed through as run options on `start`, never Actor input.