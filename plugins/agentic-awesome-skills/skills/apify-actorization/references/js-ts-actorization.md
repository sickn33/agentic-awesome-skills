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
console.log('Input:', input);

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
const items = input.items || [];

for (const item of items) {
    const result = processItem(item);
    await Actor.pushData(result);
}

await Actor.exit();
```
