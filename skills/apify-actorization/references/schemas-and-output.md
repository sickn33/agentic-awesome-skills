# Schemas and Output Configuration

## Input Schema

Map your application's inputs to `.actor/input_schema.json`. Validate against the JSON Schema from the `@apify/json_schemas` npm package (`input.schema.json`).

```json
{
    "title": "My Actor Input",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "startUrl": {
            "title": "Start URL",
            "type": "string",
            "description": "The URL to start processing from",
            "editor": "textfield",
            "prefill": "https://example.com"
        },
        "maxItems": {
            "title": "Max Items",
            "type": "integer",
            "description": "Maximum number of items to process",
            "default": 100,
            "minimum": 1
        }
    },
    "required": ["startUrl"]
}
```

### Mapping Guidelines

- Command-line arguments → input schema properties
- Environment variables → input schema or Actor env vars in actor.json
- Config files → input schema with object/array types
- Flatten deeply nested structures for better UX

## Output Schema

Define output structure in `.actor/output_schema.json`. Validate against the JSON Schema from the `@apify/json_schemas` npm package (`output.schema.json`).

### For Table-Like Data (Multiple Items)

- Use `Actor.pushData()` (JS) or `Actor.push_data()` (Python)
- Each item becomes a row in the dataset

### For Single Files or Blobs

- Use key-value store: `Actor.setValue()` / `Actor.set_value()`
- Generate/share a retrieval URL only after verifying actual store/record access policy and authorization; constructing a URL does not grant public access:

```javascript
// Store file; public accessibility depends on actual access policy.
await Actor.setValue('report.pdf', pdfBuffer, { contentType: 'application/pdf' });

// Construct a retrieval URL; test intended access without exposing credentials.
const storeInfo = await Actor.openKeyValueStore();
const publicUrl = `https://api.apify.com/v2/key-value-stores/${storeInfo.id}/records/report.pdf`;

// Include URL in dataset output
await Actor.pushData({ reportUrl: publicUrl });
```

### For Multiple Files with a Common Prefix (Collections)

```javascript
// Store multiple files with a prefix
for (const [name, data] of files) {
    await Actor.setValue(`screenshots-${name}`, data, { contentType: 'image/png' });
}
// Files are accessible at: .../records/screenshots-{name} (validate key characters/length; no slash)
```

## Actor Configuration (actor.json)

Configure `.actor/actor.json`. Validate against the JSON Schema from the `@apify/json_schemas` npm package (`actor.schema.json`).

```json
{
    "actorSpecification": 1,
    "name": "my-actor",
    "title": "My Actor",
    "description": "Brief description of what the actor does",
    "version": "0.1",
    "meta": {
        "templateId": "ts_empty",
        "generatedBy": "REPLACE_WITH_ACTUAL_TOOL_AND_MODEL"
    },
    "input": "./input_schema.json",
    "dockerfile": "../Dockerfile"
}
```

**Important:** Fill in the `generatedBy` property with the tool/model used.

## State Management

### Request Queue - For Pausable Task Processing

The request queue works for any task processing, not just web scraping. Use a dummy URL with custom `uniqueKey` and `userData` for non-URL tasks:

```javascript
const requestQueue = await Actor.openRequestQueue();

// Add tasks to the queue (works for any processing, not just URLs)
await requestQueue.addRequest({
    url: 'https://placeholder.local',  // Dummy URL for non-scraping tasks
    uniqueKey: `task-${taskId}`,       // Unique identifier for deduplication
    userData: { itemId: 123, action: 'process' },  // Your custom task data
});

// Process tasks from the queue (with Crawlee)
const crawler = new BasicCrawler({
    requestQueue,
    requestHandler: async ({ request }) => {
        const { itemId, action } = request.userData;
        // Process your task using userData
        await processTask(itemId, action);
    },
});
await crawler.run();

// Or manually consume without Crawlee:
let request;
while ((request = await requestQueue.fetchNextRequest())) {
    try {
        await processTask(request.userData); // implement idempotency for replay
        await requestQueue.markRequestHandled(request);
    } catch (error) {
        await requestQueue.reclaimRequest(request);
        throw error; // bounded retry policy belongs to the caller
    }
}
```

### Key-Value Store - For Checkpoint State

```javascript
// Save state
await Actor.setValue('STATE', { processedCount: 100 });

// Restore state on restart
const state = await Actor.getValue('STATE') || { processedCount: 0 };
```
