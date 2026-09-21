# AI framework package integrations

Design guide for building a PyPI/npm package that exposes Apify to an AI/LLM framework - LangChain, LlamaIndex, Haystack, Vercel AI SDK, or similar. These are *client-side* integrations: code that calls Apify Actors from outside the Apify runtime, for applications, agents, and RAG pipelines. Apply the cross-cutting rules from `SKILL.md` on top.

## 1. Scope: client-side only, wrap apify-client, never the Actor SDK

This package is for applications that call Apify Actors from outside the Apify runtime. It is **not** for code running *inside* an Actor. Apify Actors should run with limited permissions and use scoped tokens via the Actor SDK's `Actor.open_dataset()`; importing a framework client that reconstructs its own `ApifyClient` from an env-var token would bypass that scoping and pull an unnecessary dependency into Actor images.

Dependency philosophy: wrap the official `apify-client` library, never the `apify` SDK. `apify` is for *building* Actors; `apify-client` is for *calling* them. Keep the runtime dependency surface minimal (`langchain-core`, `apify-client`, and a backport if needed) to minimize version conflicts and keep install time short in agent environments.

Stamp a custom `user-agent` suffix (e.g. `; Origin/langchain`) or the attribution header on the client so Apify can attribute traffic.

## 2. Layered architecture: client -> framework adapters -> public API

```
Public API       curated exports
                        |
   +--------------------+--------------------+
   |                    |                    |
Tools             Document loaders        Retriever
(agents)          (RAG ingestion)         (RAG retrieval)
   |                    |                    |
              ApifyToolsClient  (sync)
                        |
              apify-client (sync + async)
                        |
              Apify REST API
```

| Layer | Role |
|---|---|
| **Client** | Thin, synchronous wrapper over `apify-client`. One method per Actor operation. No framework types here. |
| **Tools** | Framework `BaseTool` subclasses for agent tool-calling. |
| **Document loaders** | `BaseLoader` implementations for RAG ingestion. |
| **Retriever** | `BaseRetriever` for RAG query-time retrieval. |

Framework types live only above the client layer. The client layer speaks pure Python/JS dicts and `apify-client` objects. This lets the client be unit-tested with no framework dependency, and lets the framework-facing layers focus exclusively on schema, tool semantics, and envelope formatting.

## 3. ApifyToolsClient: one sync gateway, typed method per Actor

All Actor interaction goes through a single synchronous client class with one convenience method per supported Actor (e.g. `google_search`, `instagram_scrape`, `crawl_website`). Each method:

- Builds the Actor-specific `run_input` dict, translating from the integration's normalized parameter names to the Actor's raw input schema. (Actor schemas are idiosyncratic - `searchStringsArray`, `directUrls`, `detailsUrls` vs `listingUrls`; the client absorbs that so the tool exposes clean names like `query`, `url`, `url_type`.)
- Calls `client.actor(id).call(...)` which blocks until the run finishes.
- Checks run status and raises if the run did not reach `SUCCEEDED` (a failed run must never silently return empty results).
- Returns a `(run_details, items)` tuple (or just one where appropriate).

**Why blocking?** Callers don't manage polling loops; the API stays simple. The async surface is handled at the framework layer (`asyncio.to_thread` / `Promise.resolve`) rather than duplicating every method in async form.

Adding a new Actor tool means adding one client method (input translation + status check) and one tool class (schema + `_run`), not wiring up polling, retries, or async variants.

## 4. Uniform JSON output envelope

All tools return a JSON string of one shape:

```json
{"run": {"run_id": "...", "status": "...", "dataset_id": "...",
         "started_at": "...", "finished_at": "..."},
 "items": [...]}
```

`run` is `null` for dataset-only tools. An optional `notice` key surfaces out-of-band hints (e.g. an Actor returned demo placeholder data on the free plan). Serialize with `default=str` so non-JSON-native types (datetimes from a `clean=True` deserialiser) never throw mid-tool-call.

A single predictable envelope lets agents parse results with one code path. The `run` metadata gives the agent enough to chain calls - run an Actor with one tool, then fetch the dataset with another using the returned `dataset_id`. End every tool description with "Use only the data returned; do not hallucinate missing fields."

## 5. Safety clamps - defense against LLM-requested extremes

An LLM invoking a tool can request absurd values: 10,000 results, 32 GB of memory, a 1-hour timeout. Clamp every request to **developer-controlled ceilings**:

| Clamp | Default ceiling | Developer max |
|---|---|
| `timeout_secs` | 600 s |
| `memory_mbytes` | 4,096 MB (snapped to nearest valid power-of-2) | 8,192 MB |
| `items` / `limit` | 1,000 |
| `max_crawl_depth` | 5 |

Memory is notable: Apify accepts memory only as a power-of-2 (128, 256, 512, ..., 32768). Snap an arbitrary LLM value to the nearest valid step at or below the developer's cap. The default ceiling of 4,096 MB (4 GB) is generous for most Actors but well below the platform max, so LLM-requested extremes are clamped. The developer can raise the ceiling up to 8,192 MB, but an LLM cannot widen it beyond the developer-set value.

Some Actors have runtime limits not declared in their input schema (e.g. a RAG web browser rejects `maxResults > 100` at runtime). These can't be derived by schema introspection - track them by hand as overrides on the specific tool so the clamp enforces the Actor's real ceiling.

The ceilings are *developer-controlled fields* on the tool instance - an application can tighten them further, but the LLM cannot widen them. This makes the integration safe to hand to an autonomous agent without risking runaway compute costs.

## 6. Curated tool subsets, not one monolithic list

Tools are grouped into convenience lists:

| List | Tools | Use case |
|---|---|---|
| Core | Run Actor, get dataset, run+get, scrape URL, run task, run task+get | Generic platform primitives |
| Search | Google search, web crawler, RAG web browser, Google Maps, YouTube, e-commerce | Web search & content crawling |
| Social | Instagram, LinkedIn, Twitter/X, TikTok, Facebook | Social media scraping |

Warn explicitly: **don't bind all tools at once.** Most LLMs lose routing accuracy past ~8 tools, so pick the family the agent actually needs. Curated subsets let an agent built for social-media analysis avoid distinguishing among 19 tool descriptions.

## 7. Hand-written tools + dynamic schema for the long tail

Alongside hand-written tools (which get clean schemas and descriptions), ship one dynamic tool that takes an `actor_id` at construction, fetches the Actor's latest default build, and **generates an input model dynamically** from the build's input schema. Prune descriptions to a fixed length; limit properties to `type`, `default`, `prefill`, `enum`.

This covers the long tail of Actors without a dedicated wrapper - you don't need a hand-written tool for every one of Apify's thousands of Actors. The trade-off is a looser schema (the LLM sees the raw Actor input shape) and a network call at construction time.

## 8. Map to the framework's idiomatic surfaces

Implement the framework's actual extension points, all backed by the same client:

| Surface | Base class | Use case |
|---|---|---|
| **Tools** | `BaseTool` | Agent tool-calling (ReAct, LangGraph) |
| **Document loaders** | `BaseLoader` | Batch RAG ingestion (load -> split -> embed -> vector store) |
| **Retriever** | `BaseRetriever` | Query-time web retrieval for RAG chains |

- A **dataset loader** loads an existing dataset by ID and maps each item to a `Document` via a user-supplied mapping function (every Actor's output schema is different, so give the user full control). Implement both eager `load()` and streaming `lazy_load()`.
- A **crawl loader** is an *active* loader: it runs a content crawler on construction, then yields `Document`s with `page_content` (markdown) and `metadata` (`source`, `title`, `crawl_depth`).
- A **search retriever** wraps a search-and-crawl Actor for low-latency interactive RAG; the async path runs the synchronous client off the event loop via `to_thread`.

## 9. Token hygiene

One canonical token parameter/env var (e.g. `apify_token` / `APIFY_TOKEN`). If a legacy name exists (`APIFY_API_TOKEN`), honor it with a `DeprecationWarning` but reject new code that declares it. Centralize the policy in two helpers: one for explicit `__init__` signatures, one for Pydantic `model_validator(mode='before')` hooks. Store the token as a `SecretStr` (excluded from repr and serialization) and never log it.

## 10. Content extraction: markdown-first with defensive fallbacks

When extracting page content from crawling Actors, prefer `markdown` over `text`, with a trailing `or ''` to guarantee a string even when a key is present but null. Follow a fixed fallback order for the source URL: nested `metadata.url` -> `crawledUrl` -> top-level `url`. Tolerate a `metadata` field that is missing or not a dict (some Actor responses surface `null`). Actor output shapes are inconsistent across versions and configurations; centralize one canonical fallback order so the retriever, loaders, and tools all agree on what "the content", "the source URL", and "the title" mean.

## 11. Error mapping

- **Client layer** raises `RuntimeError` for failed/empty runs and `ValueError` for invalid input. Wrap transport errors in `RuntimeError`.
- **Tool layer** catches both and re-raises as the framework's tool-error type (e.g. `ToolException`) with `handle_tool_error = True`, which surfaces to the agent as a recoverable error message.

An agent that gets a `ToolException` can read the message and retry with corrected input. An unhandled `RuntimeError` would crash the agent loop. The boundary is clean: the client raises domain errors; the tool adapts them to the framework's tool-error protocol.

## 12. Packaging, release, and quality bar

- Minimal runtime deps; an explicit sdist allowlist so local-only paths (`dist/`, `.venv/`, `docs/`, test fixtures) never reach the registry.
- Release via conventional-commits-driven automation that reads commit-message prefixes to auto-generate the changelog and compute the version bump; a `BREAKING CHANGE:` footer triggers a major bump. Never hand-edit `version =` or `CHANGELOG.md` if the workflow manages them.
- Strict linting (`select = ["ALL"]` with a curated ignore list), strict typing (`disallow_untyped_defs`), and **socket-disabled unit tests** so the unit suite is truly unit - no hidden integration dependencies. Integration tests need a real token (CI only).

## 13. Position vs the Apify MCP server

The README's top banner should direct users to Apify's MCP server (`https://mcp.apify.com`) as a richer, more featureful alternative for interactive agent workflows that need dynamic Actor discovery. The package is not deprecated, but the MCP path is recommended for new interactive agent sessions.

The positioning: the package is the **programmatic, typed, registry-installable** option for code that outlives a single agent session (servers, scheduled jobs, pipelines); the MCP server is the **interactive, dynamic** option. Rather than compete, position them for their respective audiences.

## Definition-of-done checklist

- [ ] Package is client-side only; depends on `apify-client`, never `apify`.
- [ ] Layered: thin client (no framework types) -> framework adapters -> curated public API.
- [ ] One synchronous client with a typed method per supported Actor; input normalization centralized.
- [ ] All tools return the uniform JSON envelope; serialization never throws on non-native types.
- [ ] Developer-controlled safety clamps (timeout, memory power-of-2, items, depth) are in place; hand-tracked runtime limits override specific tools.
- [ ] Tools grouped into curated subsets; documentation warns against binding all at once.
- [ ] A dynamic-schema tool covers the long tail of Actors.
- [ ] Framework surfaces (tools / loaders / retriever) all backed by the same client.
- [ ] One canonical token name; legacy alias emits a deprecation warning; token is `SecretStr`, never logged.
- [ ] Content extraction is markdown-first with documented fallback order.
- [ ] Client raises domain errors; tools adapt them to the framework's tool-error protocol.
- [ ] sdist allowlist excludes local paths; release automation drives versioning.
- [ ] Unit tests are socket-disabled; lint/typing are strict.
- [ ] README cross-references the MCP server for interactive/dynamic use.
- [ ] Attribution header / user-agent suffix is set on the client; skill-origin header included if built from this skill.