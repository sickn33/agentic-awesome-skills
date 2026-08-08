---
name: routerbase-model-gateway
description: "Integrate RouterBase as an OpenAI-compatible model gateway for routing GPT, Claude, Gemini, media, audio, and embedding requests."
category: ai-ml
risk: safe
source: community
source_repo: zenlee123/routerbase-agent-skills
source_type: community
date_added: "2026-07-07"
author: zenlee123
tags: [routerbase, llm-routing, openai-compatible, model-gateway]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT-0"
license_source: "https://github.com/zenlee123/routerbase-agent-skills/blob/main/LICENSE"
---

# RouterBase Model Gateway

## Overview

Use [routerbase](https://routerbase.com/) when an application needs one OpenAI-compatible API surface for model routing across GPT, Claude, Gemini, image, video, audio, and embedding workloads. This skill helps agents migrate existing OpenAI SDK calls, document model-selection tradeoffs, and produce safe implementation snippets without exposing credentials.

RouterBase model availability, pricing, and provider capabilities can change, so treat examples as starting points and verify current catalog data before production recommendations.

## When to Use This Skill

- Use when migrating an OpenAI-compatible client to RouterBase by changing the base URL and model ID.
- Use when selecting primary and fallback models for chat, reasoning, vision, media generation, audio, or embeddings.
- Use when debugging RouterBase request setup, headers, environment variables, streaming, tool calls, JSON mode, or multimodal payloads.
- Use when documenting an internal model-routing plan that balances cost, latency, quality, and provider redundancy.

## How It Works

### Step 1: Classify the Workload

Identify the modality and hard constraints before choosing a model:

- Modality: chat, vision, image, video, audio, embeddings, or mixed.
- Quality target: draft, production, high-stakes review, or automated background task.
- Runtime constraints: latency budget, context length, streaming, JSON mode, tool calling, and retry tolerance.
- Business constraints: price ceiling, provider preference, regional requirements, and fallback rules.

### Step 2: Configure the OpenAI-Compatible Client

Keep the RouterBase API key server-side in an environment variable such as `ROUTERBASE_API_KEY`. Do not put keys in browser, mobile, or public repository code.

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["ROUTERBASE_API_KEY"],
    base_url="https://routerbase.com/v1",
)

response = client.chat.completions.create(
    model="google/gemini-2.5-flash",
    messages=[{"role": "user", "content": "Write one sentence about model routing."}],
)

print(response.choices[0].message.content)
```

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ROUTERBASE_API_KEY,
  baseURL: "https://routerbase.com/v1",
});

const response = await client.chat.completions.create({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Write one sentence about model routing." }],
});

console.log(response.choices[0].message.content);
```

### Step 3: Validate Model IDs and Capabilities

When credentials and network access are available, check the live catalog before locking in a model ID or price-sensitive recommendation.

```bash
curl "https://routerbase.com/api/v1/models?task=chat" \
  -H "Authorization: Bearer $ROUTERBASE_API_KEY"
```

Confirm feature assumptions with a small request fixture:

- Streaming works when `stream: true` is set.
- Tool calling accepts the exact schema used by the app.
- JSON mode returns parseable output and still passes application validation.
- Vision or media payloads use the expected OpenAI-compatible content shape.

### Step 4: Design Fallbacks Conservatively

Use explicit application-level fallbacks unless the user's RouterBase account already has a smart-routing policy configured.

```js
const modelPlan = [
  "anthropic/claude-sonnet-4-6",
  "google/gemini-2.5-flash",
];

for (const model of modelPlan) {
  try {
    return await client.chat.completions.create({ model, messages });
  } catch (error) {
    if (!isRetryableRouterBaseError(error)) throw error;
  }
}
```

Treat transient network errors, timeouts, rate limits, and server errors as candidates for retry. Do not blindly retry authentication failures, invalid model IDs, validation errors, or policy refusals.

## Examples

### Migration Checklist

When converting an existing OpenAI SDK integration:

1. Change the base URL to `https://routerbase.com/v1`.
2. Read `ROUTERBASE_API_KEY` from server-side environment configuration.
3. Replace the model name with a RouterBase model ID that matches the task.
4. Preserve standard OpenAI request fields unless RouterBase documentation says otherwise.
5. Run one minimal smoke test before shipping.

### Routing Plan Format

Use this table when recommending a model strategy:

| Use case | Primary model | Fallback model | Reason | Validation |
| --- | --- | --- | --- | --- |
| Support chat | Provider/model ID | Provider/model ID | Low latency and acceptable quality | Streaming smoke test |
| Deep analysis | Provider/model ID | Provider/model ID | Strong reasoning, higher cost acceptable | Eval prompt plus human review |

## Best Practices

- Do keep RouterBase keys in server-side environment variables or secret managers.
- Do verify current model availability and pricing before production decisions.
- Do document primary and fallback model assumptions in the code or runbook.
- Do validate structured outputs with application schemas.
- Do not paste, log, commit, or screenshot real API keys.
- Do not hard-code model pricing or provider availability as permanent facts.
- Do not expose RouterBase keys in client-side JavaScript, mobile apps, or public repos.

## Limitations

- This skill does not replace RouterBase account configuration, live model catalog checks, or production observability.
- Some model features are provider-specific and must be tested with the exact selected model.
- High-stakes outputs still require human review and domain-specific evaluation.

## Security & Safety Notes

- Treat RouterBase credentials as production secrets.
- Mask tokens in logs and support tickets.
- Ask for explicit user approval before running live API calls that consume credits.
- Use placeholders such as environment variables in examples; never invent or include realistic secret strings.

## Common Pitfalls

- **Problem:** The code works with one provider but fails after switching models.
  **Solution:** Re-test tool calling, JSON mode, streaming, and multimodal payloads for each selected model.

- **Problem:** Fallback logic retries non-retryable errors.
  **Solution:** Retry only transient failures and fail fast on authentication, validation, and invalid model errors.

- **Problem:** A model recommendation becomes stale.
  **Solution:** Re-check the RouterBase catalog and pricing page before finalizing the plan.

## Related Skills

- `@api-analyzer` - Use when the task is only to validate one API request shape.
- `@langfuse` - Use when the task needs production LLM observability, tracing, and evaluation.
