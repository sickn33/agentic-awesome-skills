---
name: gemini-api-integration
description: "Use when integrating Google Gemini API into projects. Covers model selection, multimodal inputs, streaming, function calling, and production best practices."
risk: safe
source: community
date_added: "2026-03-04"
---

# Gemini API Integration

## Overview

This skill guides AI agents through integrating Google Gemini API into applications — from basic text generation to advanced multimodal, function calling, and streaming use cases. It covers the full Gemini SDK lifecycle with production-grade patterns.

## When to Use This Skill

- Use when setting up Gemini API for the first time in a Node.js, Python, or browser project
- Use when implementing multimodal inputs (text + image/audio/video)
- Use when adding streaming responses to improve perceived latency
- Use when implementing function calling / tool use with Gemini
- Use when optimizing model selection (Flash vs Pro vs Ultra) for cost and performance
- Use when debugging Gemini API errors, rate limits, or quota issues

## Step-by-Step Guide

### 1. Select the supported SDK and model

Use the Google GenAI SDK (`@google/genai` for JavaScript, `google-genai` for Python), pin a tested package version, and select an available model for the account. The older `@google/generative-ai` / `google-generativeai` APIs and historical 1.5/2.0 model table are not current setup guidance. Check model availability, deprecations, pricing and feature support in official documentation before choosing; do not assume a universal cheapest or most capable model.

### 2. Server-side generation

Set `GEMINI_API_KEY` through a secret manager or protected environment and `GEMINI_MODEL` to the verified model ID. Never ship a long-lived key in browser code.

```javascript
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL,
  contents: "Explain async/await in JavaScript"
});
console.log(response.text);
```

```python
import os
from google import genai
with genai.Client(api_key=os.environ["GEMINI_API_KEY"]) as client:
    response = client.models.generate_content(
        model=os.environ["GEMINI_MODEL"], contents="Explain async/await")
    print(response.text)
```

### 3. Streaming and multimodal inputs

Use the pinned SDK's `models.generateContentStream` / `models.generate_content_stream` interfaces and handle partial output, cancellation and empty/blocked responses. Verify MIME types, model limits and file retention before transmitting images/audio/video. Obtain permission for sensitive content; do not put private inputs or access URLs in logs. File uploads and generation may incur charges.

### 4. Function calling and chat

A model's function call is an untrusted proposal. Validate the name against a fixed allowlist and arguments against a schema, enforce user authorization, and limit calls/time/cost before dispatch. Return actual tool results through the pinned SDK's documented function-response format; never fabricate results. Preserve the required conversation turns and function-call identifiers. A chat history entry is not a privileged system instruction; use the supported configuration field for system instructions.

### 5. Failure handling

Inspect structured errors, block reasons and finish reasons without assuming every response has text. Retry only transient errors with bounded exponential backoff, jitter and any retry-after guidance; enforce deadlines and a retry budget. A failed network request may already have incurred usage. Do not retry invalid credentials or malformed requests indefinitely, and do not weaken safety settings merely to bypass a blocked response.

## Examples

For a production integration, first run a small non-sensitive prompt against a test project, record the SDK/model version and response status, then test streaming cancellation, blocked output, quota exhaustion and rejected tool arguments. Report what was actually exercised.

## Sources

- [Google GenAI migration guide](https://ai.google.dev/gemini-api/docs/migrate)
- [Content generation API](https://ai.google.dev/api/generate-content)

## Limitations

SDK syntax, model availability, quotas and pricing change. These examples are unexecuted integration templates and do not establish account access, model quality or production readiness.
