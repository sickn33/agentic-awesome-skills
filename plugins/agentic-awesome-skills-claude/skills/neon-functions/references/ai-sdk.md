# AI SDK agents on Neon Functions

A Neon Function is a long-lived Node.js 24 process, which makes it a natural host for a [Vercel AI SDK](https://ai-sdk.dev) agent: the handler keeps streaming for the life of the request (15-minute budget, see [Timeouts](../SKILL.md#timeouts-and-runtime-limits)), so multi-step tool loops and image/video generation don't get cut off the way they do on lambda-style serverless. Point the model at the **Neon AI Gateway** (see the `neon-ai-gateway` skill) and there are no extra provider keys to manage — one Neon credential reaches the whole catalog.

The AI SDK is the **recommended** way to build agents on Functions from TypeScript: one set of primitives (`streamText`, `generateText`, tool calling, structured output) over every catalog model. For a memory- and workflow-heavy agent with built-in tracing, use Mastra instead (see [references/mastra-studio.md](mastra-studio.md)); both point at the same gateway.

The pattern below is a complete agent: it streams chat and, when asked, generates an image, uploads it to Object Storage, and indexes it in Postgres.

## 1. Declare the gateway and the function

The agent needs the AI Gateway (and, for the image example, an Object Storage bucket). Declare both in `neon.ts` alongside the function — `neon deploy` provisions them and injects the credentials at runtime (see the `neon-ai-gateway` and `neon-object-storage` skills):

```typescript
// neon.ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    aiGateway: true,
    buckets: { images: {} },
    functions: {
      agent: { name: "ai agent", source: "src/index.ts" },
    },
  },
});
```

## 2. The handler: stream a tool-calling agent

The function's default export is a web-standard `{ fetch }` handler. The `@neon/ai-sdk-provider` reads the injected gateway credentials automatically, so `neon("<model>")` is all the model config you need — it routes each model to the right dialect (Anthropic → Messages, OpenAI/Codex → Responses, everything else → MLflow). Return `result.toUIMessageStreamResponse()` so the AI SDK's `useChat` hooks can consume the stream:

```typescript
// src/index.ts
import { neon } from "@neon/ai-sdk-provider";
import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { todos } from "./db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const db = drizzle(pool);

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return new Response("POST chat messages here", { status: 405 });
    }
    const { messages } = (await request.json()) as { messages: ModelMessage[] };

    const result = streamText({
      model: neon("claude-sonnet-4-6"), // swap to gpt-5-mini, gemini-2-5-flash, …
      system: "You are a concise assistant with access to the user's todos.",
      messages,
      tools: {
        countOpenTodos: tool({
          description: "Count the user's open todos.",
          inputSchema: z.object({}),
          execute: async () => ({ open: await db.$count(todos) }),
        }),
      },
      // Let the model call tools and then summarize, instead of stopping after
      // the first tool call. The loop runs in-process — no host timeout.
      stopWhen: stepCountIs(5),
      onError({ error }) {
        console.error("[streamText] error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    });
  },
};
```

`tool({ inputSchema, execute })` is the AI SDK v5+ shape (the parameter is `inputSchema`, not the old `parameters`). The tool's `execute` runs **inside the function**, right next to Postgres — no extra network hop.

## 3. Generate images and persist them

The gateway exposes the OpenAI Responses **`image_generation`** built-in tool (GPT-5 models only; the image comes back inline as base64). Persist generated assets to Object Storage and index them in Postgres so they branch together — the **recommended** storage client is the Files SDK `neon` adapter (see the `neon-object-storage` skill):

```typescript
import { neon } from "@neon/ai-sdk-provider";
import { streamText } from "ai";
import { Files } from "files-sdk";
import { neon as neonFiles } from "files-sdk/neon";
import { randomUUID } from "node:crypto";

const files = new Files({ adapter: neonFiles({ bucket: "images" }) });

const result = streamText({
  model: neon("gpt-5-mini"),
  system: "Use image_generation when the user asks for a picture, then describe it.",
  messages,
  tools: {
    image_generation: neon.tools.imageGeneration({
      outputFormat: "jpeg",
      quality: "low", // the gateway caps a response near 640 KB — keep images small
      size: "1024x1024",
    }),
  },
  async onStepFinish({ toolResults }) {
    for (const tr of toolResults) {
      if (tr.toolName !== "image_generation") continue;
      const base64 = imageResultBase64(tr.output);
      if (!base64) continue;
      const key = `generated/${randomUUID()}.jpg`;
      await files.upload(key, Buffer.from(base64, "base64"), { contentType: "image/jpeg" });
      // …insert a row keyed by `key` into Postgres; serve later via files.url(key)
    }
  },
});
```

Keep generated images small: the gateway caps a single response near 640 KB and has an upstream timeout, so request a compressed JPEG rather than a full-size PNG.

## 4. Call it directly from the client (don't proxy the stream)

So the long stream isn't cut off by your web host's serverless limits, have the **browser call the function directly** and authenticate at the top of the handler — see [Functions as an agent backend](../SKILL.md#functions-as-an-agent-backend-nextjs-and-similar-frameworks) for the JWT-verify + CORS pattern and the AI SDK `DefaultChatTransport` wiring.

## 5. Run and deploy

```bash
neon dev      # injects DATABASE_URL + the gateway/storage creds; hot reload
neon deploy   # provisions the gateway + bucket and deploys the function
```

```bash
curl -N -X POST "$(neon functions get agent -o json | jq -r .invocation_url)" \
  -H "content-type: application/json" \
  -d '{"messages":[{"role":"user","content":"How many open todos do I have?"}]}'
```

## Further reading

- Neon AI Gateway dialects, models, and the `@neon/ai-sdk-provider`: the `neon-ai-gateway` skill
- Storing generated assets that branch with the database: the `neon-object-storage` skill
- AI SDK agents/tools: https://ai-sdk.dev/docs/foundations/agents
