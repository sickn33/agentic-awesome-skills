---
name: azure-ai-contentsafety-ts
description: "Analyze text and images for harmful content with customizable blocklists."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure AI Content Safety REST SDK for TypeScript

Analyze text and images for harmful content with customizable blocklists.

## Installation

```bash
npm install @azure-rest/ai-content-safety @azure/identity @azure/core-auth
```

## Environment Variables

```bash
CONTENT_SAFETY_ENDPOINT=https://<resource>.cognitiveservices.azure.com
CONTENT_SAFETY_KEY=<api-key>
```

## Authentication

**Important**: This is a REST client. `ContentSafetyClient` is a **function**, not a class.

### API Key

```typescript
import ContentSafetyClient from "@azure-rest/ai-content-safety";
import { AzureKeyCredential } from "@azure/core-auth";

const client = ContentSafetyClient(
  process.env.CONTENT_SAFETY_ENDPOINT!,
  new AzureKeyCredential(process.env.CONTENT_SAFETY_KEY!)
);
```

### DefaultAzureCredential

```typescript
import ContentSafetyClient from "@azure-rest/ai-content-safety";
import { DefaultAzureCredential } from "@azure/identity";

const client = ContentSafetyClient(
  process.env.CONTENT_SAFETY_ENDPOINT!,
  new DefaultAzureCredential()
);
```

## Analyze Text

```typescript
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";

const result = await client.path("/text:analyze").post({
  body: {
    text: "Text content to analyze",
    categories: ["Hate", "Sexual", "Violence", "SelfHarm"],
    outputType: "FourSeverityLevels"  // or "EightSeverityLevels"
  }
});

if (isUnexpected(result)) {
  throw result.body;
}

for (const analysis of result.body.categoriesAnalysis) {
  console.log(`${analysis.category}: severity ${analysis.severity}`);
}
```

## Analyze Image

### Base64 Content

```typescript
import { readFileSync } from "node:fs";

const imageBuffer = readFileSync("./image.png");
const base64Image = imageBuffer.toString("base64");

const result = await client.path("/image:analyze").post({
  body: {
    image: { content: base64Image }
  }
});

if (isUnexpected(result)) {
  throw result.body;
}

for (const analysis of result.body.categoriesAnalysis) {
  console.log(`${analysis.category}: severity ${analysis.severity}`);
}
```

### Blob URL

```typescript
const result = await client.path("/image:analyze").post({
  body: {
    image: { blobUrl: "https://storage.blob.core.windows.net/container/image.png" }
  }
});
```

## Blocklist Management

### Create Blocklist

```typescript
const result = await client
  .path("/text/blocklists/{blocklistName}", "my-blocklist")
  .patch({
    contentType: "application/merge-patch+json",
    body: {
      description: "Custom blocklist for prohibited terms"
    }
  });

if (isUnexpected(result)) {
  throw result.body;
}

console.log(`Created: ${result.body.blocklistName}`);
```

### Add Items to Blocklist

```typescript
const result = await client
  .path("/text/blocklists/{blocklistName}:addOrUpdateBlocklistItems", "my-blocklist")
  .post({
    body: {
      blocklistItems: [
        { text: "prohibited-term-1", description: "First blocked term" },
        { text: "prohibited-term-2", description: "Second blocked term" }
      ]
    }
  });

if (isUnexpected(result)) {
  throw result.body;
}

for (const item of result.body.blocklistItems ?? []) {
  console.log(`Added: ${item.blocklistItemId}`);
}
```

### Analyze with Blocklist

```typescript
const result = await client.path("/text:analyze").post({
  body: {
    text: "Text that might contain blocked terms",
    blocklistNames: ["my-blocklist"],
    haltOnBlocklistHit: false
  }
});

if (isUnexpected(result)) {
  throw result.body;
}

// Check blocklist matches
if (result.body.blocklistsMatch) {
  for (const match of result.body.blocklistsMatch) {
    console.log(`Blocked: "${match.blocklistItemText}" from ${match.blocklistName}`);
  }
}
```

### List Blocklists

```typescript
const result = await client.path("/text/blocklists").get();

if (isUnexpected(result)) {
  throw result.body;
}

for (const blocklist of result.body.value ?? []) {
  console.log(`${blocklist.blocklistName}: ${blocklist.description}`);
}
```

### Delete Blocklist

```typescript
await client.path("/text/blocklists/{blocklistName}", "my-blocklist").delete();
```

## Harm Categories

| Category | API Term | Description |
|----------|----------|-------------|
| Hate and Fairness | `Hate` | Discriminatory language targeting identity groups |
| Sexual | `Sexual` | Sexual content, nudity, pornography |
| Violence | `Violence` | Physical harm, weapons, terrorism |
| Self-Harm | `SelfHarm` | Self-injury, suicide, eating disorders |

## Severity Levels

| Level | Risk | Recommended Action |
|-------|------|-------------------|
| 0 | Safe | Allow |
| 2 | Low | Review or allow with warning |
| 4 | Medium | Block or require human review |
| 6 | High | Block immediately |

**Output Types**:
- `FourSeverityLevels` (default): Returns 0, 2, 4, 6
- `EightSeverityLevels`: Returns 0-7

## Content Moderation Helper

```typescript
import ContentSafetyClient, { 
  isUnexpected, 
  TextCategoriesAnalysisOutput 
} from "@azure-rest/ai-content-safety";

interface ModerationResult {
  isAllowed: boolean;
  flaggedCategories: string[];
  maxSeverity: number;
  blocklistMatches: string[];
}

async function moderateContent(
  client: ReturnType<typeof ContentSafetyClient>,
  text: string,
  maxAllowedSeverity = 2,
  blocklistNames: string[] = []
): Promise<ModerationResult> {
  const result = await client.path("/text:analyze").post({
    body: { text, blocklistNames, haltOnBlocklistHit: false }
  });

  if (isUnexpected(result)) {
    throw result.body;
  }

  const flaggedCategories = result.body.categoriesAnalysis
    .filter(c => (c.severity ?? 0) > maxAllowedSeverity)
    .map(c => c.category!);

  const maxSeverity = Math.max(
    ...result.body.categoriesAnalysis.map(c => c.severity ?? 0)
  );

  const blocklistMatches = (result.body.blocklistsMatch ?? [])
    .map(m => m.blocklistItemText!);

  return {
    isAllowed: flaggedCategories.length === 0 && blocklistMatches.length === 0,
    flaggedCategories,
    maxSeverity,
    blocklistMatches
  };
}
```

## API Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| Analyze Text | POST | `/text:analyze` |
| Analyze Image | POST | `/image:analyze` |
| Create/Update Blocklist | PATCH | `/text/blocklists/{blocklistName}` |
| List Blocklists | GET | `/text/blocklists` |
| Delete Blocklist | DELETE | `/text/blocklists/{blocklistName}` |
| Add Blocklist Items | POST | `/text/blocklists/{blocklistName}:addOrUpdateBlocklistItems` |
| List Blocklist Items | GET | `/text/blocklists/{blocklistName}/blocklistItems` |
| Remove Blocklist Items | POST | `/text/blocklists/{blocklistName}:removeBlocklistItems` |

## Key Types

```typescript
import ContentSafetyClient, {
  isUnexpected,
  AnalyzeTextParameters,
  AnalyzeImageParameters,
  TextCategoriesAnalysisOutput,
  ImageCategoriesAnalysisOutput,
  TextBlocklist,
  TextBlocklistItem
} from "@azure-rest/ai-content-safety";
```

## Best Practices

1. **Always use isUnexpected()** - Type guard for error handling
2. **Set appropriate thresholds** - Different categories may need different severity thresholds
3. **Use blocklists for domain-specific terms** - Supplement AI detection with custom rules
4. **Log moderation decisions** - Keep audit trail for compliance
5. **Handle edge cases** - Empty text, very long text, unsupported image formats

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
