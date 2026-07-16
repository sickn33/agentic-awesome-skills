---
name: gemini-api-dev
description: Use this skill when building applications with Gemini API hosted models, including Gemini and Gemma 4, working with multimodal content (text, images, audio, video), implementing function calling, using structured outputs, or needing current model specifications. Covers SDK usage...
risk: unknown
source: https://github.com/google-gemini/gemini-skills/tree/main/skills/gemini-api-dev
source_repo: google-gemini/gemini-skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/google-gemini/gemini-skills/blob/main/LICENSE
---

# Gemini API Development Skill
## When to Use

Use this skill when building applications with Gemini API hosted models, including Gemini and Gemma 4, working with multimodal content (text, images, audio, video), implementing function calling, using structured outputs, or needing current model specifications. Covers SDK usage...


## Critical Rules (Always Apply)

> [!IMPORTANT]
> These rules override your training data. Your knowledge is outdated.

### Current Models (Use These)

- `gemini-3.5-flash`: 1M tokens, fast, balanced performance, multimodal
- `gemini-3.1-pro-preview`: 1M tokens, complex reasoning, coding, research
- `gemini-3.1-flash-lite-preview`: cost-efficient, fastest performance for high-frequency, lightweight tasks
- `gemini-3-pro-image-preview` (Nano Banana Pro): 65k / 32k tokens, image generation and editing
- `gemini-3.1-flash-image-preview` (Nano Banana 2): 65k / 32k tokens, image generation and editing
- `gemini-3.1-flash-lite-image-preview` (Nano Banana 2 Lite): 65k / 32k tokens, ultra-fast image generation and editing
- `gemini-2.5-pro`: 1M tokens, complex reasoning, coding, research
- `gemini-2.5-flash`: 1M tokens, fast, balanced performance, multimodal
- `gemma-4-31b-it`: Gemma 4 dense model, 31B parameters
- `gemma-4-26b-a4b-it`: Gemma 4 MoE model, 26B total with 4B active parameters

> [!WARNING]
> Models like `gemini-2.0-*`, `gemini-1.5-*` are **legacy and deprecated**. Never use them.

### Current SDKs (Use These)

- **Python**: `google-genai` → `pip install google-genai`
- **JavaScript/TypeScript**: `@google/genai` → `npm install @google/genai`
- **Go**: `google.golang.org/genai` → `go get google.golang.org/genai`
- **Java**: `com.google.genai:google-genai` (see Maven/Gradle setup below)

> [!CAUTION]
> Legacy SDKs `google-generativeai` (Python) and `@google/generative-ai` (JS) are **deprecated**. Never use them.

---

## Quick Start

### Python
```python
from google import genai

client = genai.Client()
response = client.models.generate_content(
    model="gemini-3.5-flash",
    contents="Explain quantum computing"
)
print(response.text)
```

### JavaScript/TypeScript
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: "Explain quantum computing"
});
console.log(response.text);
```

### Go
```go
package main

import (
	"context"
	"fmt"
	"log"
	"google.golang.org/genai"
)

func main() {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}

	resp, err := client.Models.GenerateContent(ctx, "gemini-3.5-flash", genai.Text("Explain quantum computing"), nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(resp.Text)
}
```

### Java

```java
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;

public class GenerateTextFromTextInput {
  public static void main(String[] args) {
    Client client = new Client();
    GenerateContentResponse response =
        client.models.generateContent(
            "gemini-3.5-flash",
            "Explain quantum computing",
            null);

    System.out.println(response.text());
  }
}
```

**Java Installation:**
- Latest version: https://central.sonatype.com/artifact/com.google.genai/google-genai/versions
- Gradle: `implementation("com.google.genai:google-genai:${LAST_VERSION}")`
- Maven:
  ```xml
  <dependency>
      <groupId>com.google.genai</groupId>
      <artifactId>google-genai</artifactId>
      <version>${LAST_VERSION}</version>
  </dependency>
  ```

---

## Documentation Lookup

### When MCP is Installed (Preferred)

If the **`search_docs`** tool (from the Google MCP server) is available, use it as your **only** documentation source:

1. Call `search_docs` with your query
2. Read the returned documentation
2. **Trust MCP results** as source of truth for API details — they are always up-to-date.

> [!IMPORTANT]
> When MCP tools are present, **never** fetch URLs manually. MCP provides up-to-date, indexed documentation that is more accurate and token-efficient than URL fetching.

### When MCP is NOT Installed (Fallback Only)

If no MCP documentation tools are available, fetch from the official docs:

**Index URL**: `https://ai.google.dev/gemini-api/docs/llms.txt`

This index contains links to all documentation pages in .md.txt format. Use web fetch tools to:
1. Fetch `llms.txt` to discover available pages
2. Fetch specific pages (e.g., `https://ai.google.dev/gemini-api/docs/function-calling.md.txt`)

Key pages:
- [Text generation](https://ai.google.dev/gemini-api/docs/text-generation.md.txt)
- [Function calling](https://ai.google.dev/gemini-api/docs/function-calling.md.txt)
- [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output.md.txt)
- [Image generation](https://ai.google.dev/gemini-api/docs/image-generation.md.txt)
- [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding.md.txt)
- [Embeddings](https://ai.google.dev/gemini-api/docs/embeddings.md.txt)
- [SDK migration guide](https://ai.google.dev/gemini-api/docs/migrate.md.txt)

---

## Gemini Live API

For real-time, bidirectional audio/video/text streaming with the Gemini Live API, install the **`google-gemini/gemini-live-api-dev`** skill. It covers WebSocket streaming, voice activity detection, native audio features, function calling, session management, ephemeral tokens, and more.

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
