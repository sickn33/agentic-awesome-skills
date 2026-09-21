# Workflow automation integrations

Design guide for integrating Apify into a workflow-automation platform (Zapier, n8n, Make, Pipedream, Activepieces, or a similar trigger/action/search host). This file is **UX-design focused and platform-agnostic**: it describes the capability surface, the resource model, and the user-facing behavior, not the host platform's internal build mechanics, release pipeline, or secrets. Apply the cross-cutting rules from `SKILL.md` on top.

The host platform's model is rigid: every Apify capability must be expressed as one of **trigger**, **action (create)**, or **search (read)**. Decide the mapping before writing any code.

## 1. Map Apify to the host's trigger / action / search model

| Host type | Apify capability | Purpose |
|---|---|---|
| **Trigger** (hook) | Actor / Task run finished | Event-driven: start a workflow when a run reaches a terminal status |
| **Trigger** (hidden, polling) | List Actors / Tasks | Back dynamic dropdowns - not user-facing steps |
| **Action (create)** | Run Actor; Run Task; Run Actor + get dataset; Run Task + get dataset; Scrape single URL; Set KV record | Synchronous operations that produce or store data |
| **Search (read)** | Get last run; Get run; List runs; Get dataset items; Get KV record | Find existing records, optionally branch on them |

Reads of the last run or stored data are **searches**, because that is the host's mechanism for "find an existing record." Run-finished is a **webhook trigger**. Actor/Task *selection* is a **hidden trigger** that feeds dropdowns - reusing one hidden trigger across multiple actions keeps the surface DRY.

## 2. Canonical capability matrix

The complete set of operations a workflow integration should surface. Treat this as the floor, not a menu to trim without reason.

**Triggers**
- Actor run finished (webhook; user picks terminal statuses: SUCCEEDED / FAILED / TIMED-OUT / ABORTED)
- Task run finished (same shape, scoped to a Task)

**Actions (creates)**
- Run Actor - fire an Actor run
- Run Actor and get dataset items - fire and return results inline
- Run Task - fire a saved Task configuration
- Run Task and get dataset items - fire and return results inline
- Scrape single URL - curated, 2-field wrapper over a content scraper (see section 10)
- Set key-value store record - write a file/string to a KV store

**Searches (reads)**
- Get last Actor/Task run - the most recent matching run
- Get run - by run ID
- List runs - filterable by status
- Get dataset items - by dataset ID, with offset/limit and optional fields/omit
- Get key-value store record - by store ID + record key

**Hidden selectors (back dropdowns, not user steps)**
- List Actors (recently used source + Store source)
- List Tasks

If the host platform cannot represent every operation, prioritize in this order: run-finished trigger, run Actor + get dataset, get dataset items, scrape single URL, run Task + get dataset, get KV record, set KV record.

## 3. Resource -> operation organization

Organize the action node's surface as **resource -> operation**, mirroring both the host platform's UX convention and Apify's domain model. A two-level router (resource, then operation) keeps adding an operation a copy-and-adapt task and co-locates each operation's parameters and I/O. Users navigate Actor -> "Run actor", Dataset -> "Get items", etc. Avoid a flat list of dozens of operations.

## 4. Actor / Task selection UX

IDs (Actor, Task, run, dataset, KV store, record key) should use the host's resource-locator property type with multiple modes: **From list**, **By URL**, **By ID**. Extract the ID from a pasted Console URL (e.g. `https://console.apify.com/actors/<id>/input` -> `<id>`).

Offer **two selection sources** in one selector:
- **Recently used** (default) - the user's own Actors/Tasks, sorted by last run started. This is what most users want.
- **Store** - browse the public marketplace by search term, sorted by popularity.

A toggle with "recompute fields when changed" lets users switch the dropdown source without leaving the node. Choose a pagination limit that balances completeness against load time (the host UI must support searching within dropdown results).

## 5. Dynamic input translation

The highest-leverage UX piece. When a user selects an Actor, fetch the Actor's build and translate its `inputSchema` into the host platform's form fields dynamically. Hardcoding fields per Actor is unmaintainable across thousands of Actors; a translator supports *any* Actor's input as a host form.

Handle the type/editor mappings that have no direct host equivalent, and degrade gracefully rather than crashing:

| Apify type/editor | Host field |
|---|---|
| `string` + `javascript`/`python` editor | code field |
| `string` + `textarea` | multiline text |
| `string` + `datepicker` | datetime |
| `string` + `select` / `enum` / `enumSuggestedValues` | choices dropdown |
| `isSecret: true` | password |
| `array` + `json`/`keyValue` editor | multiline text with a JSON.stringify default |
| `array` + `requestListSources`/`pseudoUrls`/`globs`/`stringList` | flat string list (re-expand at run time) |
| `object` + `proxy` editor | info box telling users to set it in Apify Console (host has no proxy UI) |
| `object` + `schemaBased` | nested children fields |
| `sectionCaption` | helpText/info box (host has no stackable sections) |

Two gotchas:
- On list fields, a `default` would pre-populate a non-removable first item and duplicate entries - move prefill values to `placeholder`.
- Mark the build selector so a build-tag change **recomputes the generated fields**, since input schemas can differ across builds.

## 6. Run UX: sync vs async, cost caps, bounded polling

Offer a **sync/async toggle** on run-start actions:
- Sync: block until the run finishes (document the host's hard timeout so users know when to choose async).
- Async: return immediately with the run ID for long-running jobs.

Use the asynchronous REST flow under the hood (POST /runs with `waitForFinish=0`, then poll). Polling must be **bounded** - use the run's own `timeoutSecs` + a grace buffer, with an absolute ceiling fallback (e.g. 24h). Poll at a fixed interval (e.g. 1s). "Run actor and get dataset" must additionally require `status === 'SUCCEEDED'` before fetching dataset items.

Every run-start action exposes a **Maximum Cost per Run** field (`maxTotalChargeUsd`), `min: 0`, default `null`. Send it as a query parameter only when non-null and `> 0`; `0`/empty means *no limit*. Never let this be an Actor input field.

## 7. Output normalization into one enriched shape

Bare Actor run objects contain only storage IDs, not results - useless downstream. Enrich every run once, centrally, into a single shape returned by all run-producing and run-finding actions:

- The run's `OUTPUT` from the default key-value store (and any user-selected store keys).
- `datasetItems` - up to a sensible cap (e.g. 100 items) from the default dataset.
- `datasetItemsFileUrls` - pre-built download URLs for JSON/CSV/XML/XLSX/HTML/RSS exports.
- `detailsPageUrl` - a deep link to the run in Apify Console.
- Strip fields useless to host users (`meta`, `stats`, `options`, `userId`, raw `output`, `standby`).

Downstream steps map fields by name regardless of which action produced the run, because every action yields the same shape. Describe this shape to the host UI with sampled output fields (sample ~10 items, merge their keys).

## 8. Guard against large datasets

Estimate the full download size before inlining: fetch one item, multiply by the requested item count with a safety margin (e.g. 1.2x), compare to a payload cap (e.g. 10 MB). If it exceeds the cap, **do not attempt the inline download** - return a warning item plus the dataset file URLs. When a trigger fetches more items than the cap allows, push a warning pointing users to the "Get Dataset Items" action with `run.defaultDatasetId` for full results. The host platform has payload/time limits the Apify API does not; always offer a file-download fallback.

## 9. Files and binary records

Map the host's file-handling primitives (dehydration / stashing / signed URLs) to Apify's binary KV records. For "Get KV record":
- JSON/text under a size threshold (e.g. 20 MB) -> parsed and returned as fields the user can map directly.
- Binary or larger records -> a dehydrated pointer the host lazily fetches when a downstream step needs it.
- Records above a hard limit (e.g. 120 MB, with margin below the host's 150 MB ceiling) -> rejected outright with an actionable message.

## 10. Run-finished trigger UX

Use the host's hook type backed by Apify webhooks:
- **Subscribe**: create an Apify webhook scoped to an `actorId` or `actorTaskId`, with `eventTypes` from the user-selected terminal statuses. The webhook's `requestUrl` is the host's target URL. Make registration **idempotent** - derive a key from every field that distinguishes one registration from another (`resource:id:sortedEvents:requestUrl`) so re-activating a workflow does not create duplicate webhooks. Persist the created webhook ID so deactivation can delete it.
- **Unsubscribe**: delete the webhook by its stored ID.
- **Perform**: read the webhook payload and enrich it (section 7).
- **Fallback list**: fetch the 3 most recent matching runs so users see realistic test data when configuring the trigger without waiting for a real event.

Offer an event multi-select (SUCCEEDED / FAILED / TIMED-OUT / ABORTED) plus an "any" shortcut that expands to all four. Build the `condition: { actorId }` or `{ actorTaskId }` from the watched resource. Pass the webhook payload through as workflow data - it already carries the run metadata.

## 11. Error UX

Centralize API error mapping in one place, not per action. Match each Apify error to the host's error category:
- 5xx and 429 -> retryable (so backoff applies).
- `token-not-found` / auth errors -> an authentication error the user must fix.
- `full-permission-actor-not-approved` -> a non-retryable error with the **validated** approval URL in the message (approval is a manual Console action; retrying cannot help).
- 404 on KV record GET/HEAD -> return empty rather than throw (a missing key is a valid "no data" result).
- Other 4xx -> a plain error with the API's actual message, or a generic fallback.

Use retryable errors only when retrying can actually succeed. Keep error *codes* (like `EPERM`) out of any message field the host replaces, so the real text survives.

## 12. Auth UX

For consumer-facing automation platforms, prefer **OAuth2 with PKCE** over an API-token field. Users authorize through a browser; no raw token typing. Disable auto-refresh only if the host cannot surface a refresh failure gracefully - otherwise leave it on. Validate the token with a `GET /v2/users/me` test call and populate the connection label with the username/email.

If the host is headless-only, fall back to an API-token credential with the same verify call on a "Verify" button.

## 13. Convenience operations: "Scrape single URL"

Beyond generic "run Actor", ship a curated **Scrape single URL** action: a 2-field form (`url`, `outputFormat`) wrapping a content scraper with sensible defaults (`maxCrawlDepth: 0`, `maxResults: 1`). Validate the URL first (`new URL()` + protocol + hostname check) with an actionable error - bad input must never start a paid run. Return a **lean, single-object** output: `{ ...pageMetadata, [outputFormat]: content }` - strip all content variants and re-add only the chosen one. This is ideal for LLM flows (a single object beats a dataset array) and lowers the barrier for non-power users. Point power users to the underlying Actor for advanced options.

## Definition-of-done checklist

- [ ] Capability matrix from section 2 is fully surfaced (or trimmed with documented reason).
- [ ] Resource -> operation organization; no flat operation soup.
- [ ] Actor/Task selection offers recently-used + Store sources with URL/ID extraction.
- [ ] Actor input is translated dynamically from the build schema; degradation is graceful.
- [ ] Run actions expose sync/async toggle and a `maxTotalChargeUsd` field (null = unlimited).
- [ ] Polling is bounded; never `while (true)`.
- [ ] All run-producing and run-finding actions return the one enriched run shape.
- [ ] Large-dataset guard with file-URL fallback is in place.
- [ ] Run-finished trigger is webhook-backed, idempotent, and has fallback sample data.
- [ ] Error mapping is centralized; approval URLs are validated; codes don't clobber messages.
- [ ] OAuth2 PKCE is the default consumer auth path; token fallback has a verify call.
- [ ] A "Scrape single URL"-style convenience action exists with pre-run URL validation.
- [ ] `x-apify-integration-platform` header is sent on every outbound request; `x-apify-integration-origin: apify-integration-development-skill` included if built from this skill.
- [ ] Two test modes (mocked + live E2E) pass.