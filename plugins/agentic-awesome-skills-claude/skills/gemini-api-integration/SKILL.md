---
name: gemini-api-integration
description: "Use when integrating the current Google Gemini API with the Google GenAI SDKs, including model discovery, multimodal input, streaming, function calling, and production safeguards."
risk: safe
source: community
date_added: "2026-03-04"
---

# Gemini API Integration

## Overview

Integrate Gemini through Google's current GenAI SDKs. Verify the SDK and model lifecycle in the official Gemini API documentation before implementation because model aliases, availability, quotas, and request fields change over time.

## When to Use

- Set up Gemini in Node.js/TypeScript or Python.
- Add text, multimodal, streaming, chat, or function-calling behavior.
- Select an available model for a latency, cost, modality, and quality requirement.
- Diagnose authentication, quota, safety, or request failures.

## 1. Verify the Current Surface

Before writing code:

1. Check the official [Gemini API libraries](https://ai.google.dev/gemini-api/docs/libraries), [models](https://ai.google.dev/gemini-api/docs/models), and [deprecations](https://ai.google.dev/gemini-api/docs/deprecations) pages.
2. Select a model that is available to the user's API key and supports the required modality and methods.
3. Put that exact ID in `GEMINI_MODEL`; do not silently substitute a retired or preview model.
4. Record the SDK version and model ID in tests or deployment metadata.

Do not use the legacy `@google/generative-ai` or `google-generativeai` packages for new work.

## 2. Install and Configure

```bash
npm install @google/genai
```

```bash
python -m pip install google-genai
```

Provide `GEMINI_API_KEY` and `GEMINI_MODEL` through the deployment's secret/configuration system. Never place keys in source, shell history, logs, URLs, or client-side bundles. Browser use requires a trusted server-side proxy unless the user has explicitly designed an ephemeral-token flow supported by Google.

## 3. Basic Generation

**Node.js:**

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL,
  contents: "Explain async/await in JavaScript.",
});
console.log(response.text);
```

**Python:**

```python
import os
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
response = client.models.generate_content(
    model=os.environ["GEMINI_MODEL"],
    contents="Explain async/await in JavaScript.",
)
print(response.text)
```

Fail clearly when either environment variable is missing. Add a small live integration test in a non-production project; do not rely only on mocked request shapes.

## 4. Streaming and Multimodal Input

```javascript
const stream = await ai.models.generateContentStream({
  model: process.env.GEMINI_MODEL,
  contents: "Draft a concise release note.",
});

for await (const chunk of stream) {
  if (chunk.text) process.stdout.write(chunk.text);
}
```

For images or other files, follow the current SDK's `inlineData` or Files API example for that modality. Validate MIME type and size, cap uploads, and avoid logging raw user files. Use inline data only within the documented request limit; use the Files API when the current documentation requires it.

## 5. Function Calling

Treat a model function call as an untrusted proposal, not authorization:

1. Declare a narrow JSON schema with required fields and constrained values.
2. Send the prompt and tool declaration through the current SDK request shape.
3. Parse the returned function call and validate every argument server-side.
4. Enforce authentication, authorization, rate limits, and user confirmation for consequential actions.
5. Execute only an allowlisted local handler. Never evaluate model-generated code or shell text.
6. Return the structured function result to the same conversation using the current SDK's function-response format.
7. Request the final natural-language response and test both success and denial paths.

Use the official [function-calling guide](https://ai.google.dev/gemini-api/docs/function-calling) for the installed SDK version; do not copy request fields from the legacy SDK.

## 6. Production Checks

- Set explicit timeouts, cancellation, request-size limits, and bounded retries with jitter.
- Retry only transient failures such as rate limits or service unavailability; honor server retry hints.
- Do not retry invalid requests, authentication failures, or blocked content indefinitely.
- Log request IDs, latency, model ID, token usage, and error class without prompts, keys, or sensitive payloads.
- Evaluate safety behavior and tool-call authorization with adversarial tests.
- Pin the SDK version, monitor deprecations, and retest before changing model aliases.
- Obtain approval before changing production quotas, credentials, billing, safety settings, or deployed model IDs.

## Troubleshooting

- **Authentication failure:** verify the secret source, project, key restrictions, and server environment without printing the key.
- **Model not found:** list models available to the credential and compare the live lifecycle documentation; do not guess a replacement.
- **Quota exhausted:** inspect the relevant project quota and billing state, then queue or back off. Do not create extra credentials to bypass limits.
- **Blocked response:** inspect structured safety feedback and application policy. Do not weaken safeguards automatically.
- **Request rejected:** compare the installed SDK version and current method schema, especially when migrating legacy examples.

## Limitations

- Availability and pricing depend on region, project, account, and model lifecycle.
- This skill does not authorize external tool execution, production changes, quota purchases, or handling of regulated data.
- Validate current official documentation and run environment-specific tests before deployment.
