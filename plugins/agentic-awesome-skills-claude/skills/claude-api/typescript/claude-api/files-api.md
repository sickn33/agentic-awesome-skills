# Files API — TypeScript

> AAS-reviewed adaptation of the upstream Anthropic skill; see the root SKILL.md for authorization and resource boundaries. SDK/model feature claims below are version-sensitive examples; verify the selected model and pinned SDK before running. No live API or agent execution was performed during this catalog review.

The Files API uploads files for use in Messages API requests. Reference files via `file_id` in content blocks, avoiding re-uploads across multiple API calls.

**Beta:** Pass `betas: ["files-api-2025-04-14"]` in your API calls (the SDK sets the required header automatically).

## Key Facts

- Maximum file size: 500 MB
- Total storage: 100 GB per organization
- Files persist until deleted
- File operations (upload, list, delete) are free; content used in messages is billed as input tokens
- Not available on Amazon Bedrock or Google Vertex AI

---

## Upload a File

```typescript
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();

const uploaded = await client.beta.files.upload({
  file: await toFile(fs.createReadStream("report.pdf"), undefined, {
    type: "application/pdf",
  }),
  betas: ["files-api-2025-04-14"],
});

console.log(`File ID: ${uploaded.id}`);
console.log(`Size: ${uploaded.size_bytes} bytes`);
```

---

## Use a File in Messages

### PDF / Text Document

```typescript
const response = await client.beta.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Summarize the key findings in this report." },
        {
          type: "document",
          source: { type: "file", file_id: uploaded.id },
          title: "Q4 Report",
          citations: { enabled: true },
        },
      ],
    },
  ],
  betas: ["files-api-2025-04-14"],
});

console.log(response.content.filter(b => b.type === "text").map(b => b.text).join(""));
```

---

## Manage Files

### List Files

```typescript
const files = await client.beta.files.list({
  betas: ["files-api-2025-04-14"],
});
for (const f of files.data) {
  console.log(`${f.id}: ${f.filename} (${f.size_bytes} bytes)`);
}
```

### Delete a File

```typescript
await client.beta.files.delete("file_011CNha8iCJcU1wXNR6q4V8w", {
  betas: ["files-api-2025-04-14"],
});
```

### Download a File

```typescript
const response = await client.beta.files.download(
  "file_011CNha8iCJcU1wXNR6q4V8w",
  { betas: ["files-api-2025-04-14"] },
);
const content = Buffer.from(await response.arrayBuffer());
if (content.length > 16 * 1024 * 1024) throw new Error("Download limit exceeded");
await fs.promises.writeFile("output.txt", content, { flag: "wx", mode: 0o600 });
```

Uploads/listing/deletion require authorized file scope. Close local handles with context managers, retain IDs privately, paginate listings when needed, and delete only files owned by this workflow under the agreed retention plan. Downloads must be bounded, type-checked, saved exclusively into a new private directory and never executed automatically. Limits/platform coverage above are historical examples requiring current verification.
