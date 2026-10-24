# JavaScript/TypeScript Actorization

## Install the Apify SDK

```bash
npm install apify
```

## Wrap Main Code with Actor Lifecycle

```javascript
import { Actor } from 'apify';

// Initialize connection to Apify platform
await Actor.init();

// ============================================
// Your existing code goes here
// ============================================

// Example: Get input from Apify Console or API
const input = await Actor.getInput();
// Do not log full input; it may contain credentials or personal data.

// Example: Your crawler or processing logic
// const crawler = new PlaywrightCrawler({ ... });
// await crawler.run([input.startUrl]);

// Example: Push results to dataset
// await Actor.pushData({ result: 'data' });

// ============================================
// End of your code
// ============================================

// Graceful shutdown
await Actor.exit();
```

## Key Points

- `Actor.init()` configures storage to use Apify API when running on platform
- `Actor.exit()` handles graceful shutdown and cleanup
- Both calls must be awaited
- Local execution remains unchanged - the SDK automatically detects the environment

Validate input types and positive bounded maxItems before execution. Permit only approved HTTPS targets; reject private-network/credential-bearing URLs and enforce redirect/network egress policy. Counters below limit output within one process; use concurrency-safe reservations/distributed caps for concurrent workers and separately bound requests/time/cost.

## Crawlee Projects

Crawlee projects require minimal changes - just wrap with Actor lifecycle:

```javascript
import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

await Actor.init();

// Get and validate input
const input = await Actor.getInput();
const {
    startUrl = 'https://example.com',
    maxItems = 100,
} = input ?? {};

let itemCount = 0;

const crawler = new PlaywrightCrawler({
    maxConcurrency: 1, // serial counter example; not a global distributed cap
    requestHandler: async ({ page, request, pushData }) => {
        if (itemCount >= maxItems) return;

        const title = await page.title();
        await pushData({ url: request.url, title });
        itemCount++;
    },
});

await crawler.run([startUrl]);

await Actor.exit();
```

## Express/HTTP Servers

For web servers, use standby mode in actor.json:

```json
{
    "actorSpecification": 1,
    "name": "my-api",
    "usesStandbyMode": true
}
```

Then implement readiness probe. See [standby-mode.md](../../apify-actor-development/references/standby-mode.md).

## Batch Processing Scripts

```javascript
import { Actor } from 'apify';

await Actor.init();

const input = await Actor.getInput();
const items = input?.items ?? [];
if (!Array.isArray(items) || items.length > 1000) throw new Error("Invalid or oversized items");

for (const item of items) {
    const result = await processItem(item);
    await Actor.pushData(result);
}

await Actor.exit();
```
