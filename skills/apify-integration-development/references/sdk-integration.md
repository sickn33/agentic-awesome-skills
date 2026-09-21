# SDK integrations

Design guide for integrating Apify into an existing application by calling Actors directly with `apify-client` (JS/TS or Python) or the REST API. This is the lightest integration shape: no host platform, no tool registry, no plugin lifecycle - just your code calling Apify as a backend service. Apply the cross-cutting rules from `SKILL.md` on top.

## 1. Wrap apify-client, never the Actor SDK

- **`apify-client`** is the API client for **calling** Actors from your app.
- **`apify`** is the SDK for **building** Actors (wrong package for this use case).

Always install `apify-client`. Never install `apify` for integration work. Keep the dependency footprint small to minimize version conflicts and keep install time short.

Stamp a custom `user-agent` suffix or the attribution header (`x-apify-integration-platform: <your-app>`) on the client so Apify can attribute traffic. If the integration was built using the Apify integration development skill, also set `x-apify-integration-origin: apify-integration-development-skill`.

## 2. Token handling

Get an `APIFY_TOKEN` from **Console > Settings > Integrations** at `https://console.apify.com/settings/integrations`. Account sign-up: `https://console.apify.com/sign-up` (free, no credit card). Store the token in an environment variable or a secrets manager - never hardcoded, never in chat logs or command output, never in URLs (query-string tokens leak through browser history and server logs).

The token is a normal Bearer credential:

```
Authorization: Bearer <APIFY_TOKEN>
```

Use scoped tokens where possible and rotate them periodically.

## 3. Find the right Actor before writing code

Before writing integration code, find the Actor that fits the need. Use the MCP tools if available in your environment:

- `search-actors` - search the Apify Store by keyword (search by platform/product name, not end goal).
- `fetch-actor-details` - get the Actor's input schema, output format, and pricing.

Alternatively, browse `https://apify.com/store`. Append `.md` to any Actor's Store URL to get its docs in markdown (e.g. `https://apify.com/apify/web-scraper.md`). Build input from the schema rather than guessing field names.

## 4. JavaScript / TypeScript

### Install

```bash
npm install apify-client
```

### Synchronous execution (wait for results)

```typescript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const run = await client.actor('apify/web-scraper').call({
    startUrls: [{ url: 'https://example.com' }],
    maxPagesPerCrawl: 10,
}, { maxTotalChargeUsd: 5 });

const { items } = await client.dataset(run.defaultDatasetId).listItems();
```

`.call()` blocks until the Actor finishes. Use for short-running Actors (under a few minutes). Pass `maxTotalChargeUsd` in the **options** argument - never in the input.

### Asynchronous execution (start and poll)

```typescript
const run = await client.actor('apify/web-scraper').start({
    startUrls: [{ url: 'https://example.com' }],
});

// Poll for completion
// Derive waitSecs from the run's timeoutSecs + a grace buffer, never unbounded.
const finishedRun = await client.run(run.id).waitForFinish({ waitSecs: 120 });

// Retrieve results
const { items } = await client.dataset(finishedRun.defaultDatasetId).listItems();
```

Use `.start()` + `.waitForFinish()` for long-running Actors or when you need the run ID immediately.

### Retrieving results

```typescript
// Dataset items (structured data from pushData)
const { items } = await client.dataset(run.defaultDatasetId).listItems({
    limit: 100,
    offset: 0,
});

// Key-value store (files, screenshots, etc.)
const record = await client.keyValueStore(run.defaultKeyValueStoreId).getRecord('OUTPUT');
```

### Error handling

```typescript
try {
    const run = await client.actor('apify/web-scraper').call(input);

    if (run.status !== 'SUCCEEDED') {
        const log = await client.log(run.id).get();
        throw new Error(`Actor failed with status ${run.status}: ${log}`);
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
} catch (error) {
    if (error.type === 'record-not-found') {
        // Actor ID is wrong or Actor was deleted
    } else if (error.statusCode === 401) {
        // Invalid or missing APIFY_TOKEN
    }
    throw error;
}
```

## 5. Python

### Install

```bash
pip install apify-client
```

### Synchronous execution

```python
from decimal import Decimal
from apify_client import ApifyClient
import os

client = ApifyClient(token=os.environ['APIFY_TOKEN'])

run = client.actor('apify/web-scraper').call(
    run_input={
        'startUrls': [{'url': 'https://example.com'}],
        'maxPagesPerCrawl': 10,
    },
    max_total_charge_usd=Decimal('5'),
)

items = client.dataset(run['defaultDatasetId']).list_items().items
```

### Asynchronous execution

```python
run = client.actor('apify/web-scraper').start(run_input={
    'startUrls': [{'url': 'https://example.com'}],
})

# Poll for completion
finished_run = client.run(run['id']).wait_for_finish()

items = client.dataset(finished_run['defaultDatasetId']).list_items().items
```

### Async client (asyncio)

```python
from apify_client import ApifyClientAsync

client = ApifyClientAsync(token=os.environ['APIFY_TOKEN'])

run = await client.actor('apify/web-scraper').call(run_input={
    'startUrls': [{'url': 'https://example.com'}],
})

items = (await client.dataset(run['defaultDatasetId']).list_items()).items
```

## 6. REST API (any language)

For languages without an official client, use the REST API directly.

### Start a run

```
POST https://api.apify.com/v2/actors/{actorId}/runs
Authorization: Bearer <APIFY_TOKEN>
Content-Type: application/json

{ "startUrls": [{ "url": "https://example.com" }] }
```

### Get run status

```
GET https://api.apify.com/v2/actor-runs/{runId}
Authorization: Bearer <APIFY_TOKEN>
```

### Get dataset items

```
GET https://api.apify.com/v2/datasets/{datasetId}/items?format=json
Authorization: Bearer <APIFY_TOKEN>
```

The cost rule applies on the HTTP paths too: `maxItems` (pay-per-result) and `maxTotalChargeUsd` (other pricing models) go as **query parameters**, never in the JSON body where they are read as Actor input.

For runs expected to finish within 300 seconds, the synchronous endpoint returns dataset items directly:

```
POST https://api.apify.com/v2/actors/{username}~{actor-name}/run-sync-get-dataset-items
```

Longer work must use the asynchronous flow: POST /runs -> poll GET /actor-runs/{id} -> GET /datasets/{id}/items.

REST reference: `https://docs.apify.com/api/v2`. OpenAPI spec: `https://apify.com/openapi.json`.

## 7. Best practices

- **Set timeouts:** pass `timeoutSecs` as a run option / query parameter on `.call()` or `.start()`, or use `waitSecs` on `.call()`. Never put `timeoutSecs` in Actor input — it is a run option and an Actor whose schema rejects unknown fields will fail on it.
- **Paginate large datasets:** use `limit` and `offset` when retrieving dataset items.
- **Reuse clients:** create one `ApifyClient` instance and reuse it across calls.
- **Handle Actor-specific input:** every Actor has its own input schema. Use `fetch-actor-details` MCP tool or append `.md` to the Actor's Store URL to get the schema before constructing input.
- **Bound polling:** never `while (true)` - use the run's own timeout + a grace buffer, with an absolute ceiling.

## 8. Documentation pointers

- API client for JS: `https://docs.apify.com/api/client/js`
- API client for Python: `https://docs.apify.com/api/client/python`
- REST API reference: `https://docs.apify.com/api/v2`
- Apify docs (LLM-friendly): `https://docs.apify.com/llms.txt`
- Apify docs (full): `https://docs.apify.com/llms-full.txt`

If the Apify MCP server is available, use `search-apify-docs` and `fetch-apify-docs` tools for contextual documentation lookups during development.

## Definition-of-done checklist

- [ ] Depends on `apify-client`, never `apify`.
- [ ] Token stored in env var / secret manager; never hardcoded or logged.
- [ ] Actor input built from the schema (MCP `fetch-actor-details` or `.md` URL), not guessed.
- [ ] Sync `.call()` used for short runs; async `.start()` + `.waitForFinish()` for long ones.
- [ ] Attribution header / user-agent suffix set on the client; skill-origin header included if built from this skill.
- [ ] Cost cap (`maxTotalChargeUsd` / `max_total_charge_usd`) passed in options, never input.
- [ ] Run status checked before consuming dataset; failed runs raise, not return empty.
- [ ] Dataset and KV store retrieval covered; pagination on large datasets.
- [ ] Errors mapped to actionable app-level messages.
- [ ] REST API fallback documented for languages without a client.