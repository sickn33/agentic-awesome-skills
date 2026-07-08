# Mastra agents with Mastra Studio observability

A Neon Function is a long-lived Node.js 24 process, which makes it a natural host for a [Mastra](https://mastra.ai) agent: the agent keeps running for the life of the request, and you point its model at the Neon AI Gateway so there are no extra provider keys. You can keep **running the agent on Neon Functions** while shipping its traces to a **Mastra Studio (Mastra Cloud) project** for observability — the agent runs on Neon, the traces are viewable in Mastra.

The shape mirrors any other Node integration (see `references/sentry.md`): instantiate at module load, gate on env vars so local dev and unconfigured branches stay a no-op, and pass secrets at deploy time via `neon.ts`. `@mastra/core` and `@mastra/observability` bundle cleanly through `neon deploy`'s esbuild with no extra config.

## 1. Define the agent against the Neon AI Gateway

Use the gateway's **MLflow (chat-completions) dialect**, which serves every provider (OpenAI, Anthropic, …) — derive it from the injected `aiGateway.baseUrl` (see the `neon-ai-gateway` skill). `parseEnv` reads the injected gateway credentials from your `neon.ts`.

```typescript
// src/mastra/agents/pricing.ts
import { Agent } from "@mastra/core/agent";
import { parseEnv } from "@neon/env";
import config from "../../../neon";

const env = parseEnv(config);
const gatewayUrl = env.aiGateway.baseUrl.replace("/openai/v1", "/mlflow/v1");

export const pricingAgent = new Agent({
  id: "pricing-analyst",
  name: "pricing-analyst",
  instructions: "You are a meticulous pricing analyst. …",
  model: { id: "neon/gpt-5-mini", url: gatewayUrl, apiKey: env.aiGateway.apiKey },
});
```

## 2. Wire observability to Mastra Studio

The `MastraPlatformExporter` (from `@mastra/observability`) sends traces to a Mastra Studio project. It reads `MASTRA_PLATFORM_ACCESS_TOKEN` and `MASTRA_PROJECT_ID` from the environment.

Gotcha: `Observability` requires **at least one exporter** — passing an empty `exporters` array throws `OBSERVABILITY_INVALID_INSTANCE_CONFIG`. So omit the `observability` option entirely until the platform creds are present, keeping the app runnable before the Mastra project exists (and in local dev).

```typescript
// src/mastra/index.ts
import { Mastra } from "@mastra/core/mastra";
import { Observability, MastraPlatformExporter } from "@mastra/observability";
import { pricingAgent } from "./agents/pricing";

const platformReady = Boolean(
  process.env.MASTRA_PLATFORM_ACCESS_TOKEN && process.env.MASTRA_PROJECT_ID,
);

const observability = platformReady
  ? new Observability({
      configs: {
        default: { serviceName: "my-app", exporters: [new MastraPlatformExporter()] },
      },
    })
  : undefined;

export const mastra = new Mastra({
  agents: { pricingAgent },
  ...(observability ? { observability } : {}),
});
```

Agents must be **registered on the `Mastra` instance** (the `agents` map) for their `.generate()` / `.stream()` calls to be traced. Call them via `mastra.getAgent("pricingAgent")`.

## 3. Structured output through the gateway

The gateway does not enforce **native** structured output, so a bare `structuredOutput: { schema }` can come back missing fields (e.g. a nested `meta` object), failing Zod validation. Set `jsonPromptInjection: true` so Mastra injects the schema into the prompt and the model returns the full shape:

```typescript
const agent = mastra.getAgent("pricingAgent");
const result = await agent.generate(prompt, {
  structuredOutput: { schema: myZodSchema, jsonPromptInjection: true },
  abortSignal: AbortSignal.timeout(70_000), // bound each attempt; the gateway has an upstream timeout
});
const data = result.object; // validated against myZodSchema
```

For resilience, register a second agent on a different model (e.g. `neon/claude-haiku-4-5`) and fall back to it if the primary attempt throws — the same provider-fallback pattern works because both are reachable on the MLflow dialect.

## 4. Create the Mastra project + token with the CLI

Install the Mastra CLI (`npm i -g mastra`) and authenticate. Project/token creation needs a **live login session**:

```bash
mastra auth login        # opens a browser; required before the steps below
mastra auth whoami       # shows your user + org id (org_…)
```

- **Access token (non-interactive):** `mastra auth tokens create <name>` prints a one-time secret (`sk_…`). This is your `MASTRA_PLATFORM_ACCESS_TOKEN`.
- **Project:** the interactive `mastra studio projects create` TUI is hard to script. Instead, register the project as part of a Studio deploy, which is non-interactive with `-y` and writes the project id to `.mastra-project.json`:

```bash
mastra studio deploy --org org_xxx --project my-app -y
# → .mastra-project.json: { "projectId": "…", "projectName": "my-app", "organizationId": "org_…" }
```

Use that `projectId` as `MASTRA_PROJECT_ID`.

Two gotchas:

- **Don't set `MASTRA_API_TOKEN` in the env for project/deploy commands** — it makes the CLI report `No organizations found`. Rely on the interactive login session instead.
- If you keep multiple env files (e.g. `.env.deploy` and `.env.local`), `studio deploy` errors with `Multiple env files found`; pass `--env-file <file>` to disambiguate.

## 5. Pass the creds via `neon.ts` (third-party env)

Neon-injected vars (`DATABASE_URL`, `OPENAI_*`, AI Gateway) are automatic. Declare only third-party vars under the function's `env`, resolved from `process.env` at deploy time:

```typescript
// neon.ts
functions: {
  myapp: {
    name: "my app",
    source: "src/index.ts",
    env: {
      MASTRA_PROJECT_ID: process.env.MASTRA_PROJECT_ID ?? "",
      MASTRA_PLATFORM_ACCESS_TOKEN: process.env.MASTRA_PLATFORM_ACCESS_TOKEN ?? "",
    },
  },
}
```

Load the values from a git-ignored file at deploy time:

```bash
neon deploy --env .env.deploy
```

## 6. Verify

Send a request that exercises the agent, then open the Mastra Studio project's **Observability / Traces** view — you'll see the agent run (model calls, latency, token usage) under the `serviceName` you configured. Only `SPAN_ENDED` events are exported, buffered and flushed periodically, so a trace appears a few seconds after the agent run completes.

## Further reading

- https://mastra.ai/docs/observability/tracing/exporters/cloud
- https://mastra.ai/reference/observability/tracing/exporters/mastra-platform-exporter
- https://mastra.ai/docs/agents/structured-output
- Neon AI Gateway dialects: the `neon-ai-gateway` skill
