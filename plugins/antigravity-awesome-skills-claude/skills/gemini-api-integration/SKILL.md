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

### 1. Installation & Setup

**Node.js / TypeScript:**
```bash
npm install @google/generative-ai
```

**Python:**
```bash
pip install google-generativeai
```

Set your API key securely:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 2. Basic Text Generation

**Node.js:**
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const result = await model.generateContent("Explain async/await in JavaScript");
console.log(result.response.text());
```

**Python:**
```python
import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

response = model.generate_content("Explain async/await in JavaScript")
print(response.text)
```

### 3. Streaming Responses

```javascript
const result = await model.generateContentStream("Write a detailed blog post about AI");

for await (const chunk of result.stream) {
  process.stdout.write(chunk.text());
}
```

### 4. Multimodal Input (Text + Image)

```javascript
import fs from "fs";

const imageData = fs.readFileSync("screenshot.png");
const imagePart = {
  inlineData: {
    data: imageData.toString("base64"),
    mimeType: "image/png",
  },
};

const result = await model.generateContent(["Describe this image:", imagePart]);
console.log(result.response.text());
```

### 5. Function Calling / Tool Use

```javascript
const tools = [{
  functionDeclarations: [{
    name: "get_weather",
    description: "Get current weather for a city",
    parameters: {
      type: "OBJECT",
      properties: {
        city: { type: "STRING", description: "City name" },
      },
      required: ["city"],
    },
  }],
}];

const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", tools });
const result = await model.generateContent("What's the weather in Mumbai?");

const call = result.response.functionCalls()?.[0];
if (call) {
  // Execute the actual function
  const weatherData = await getWeather(call.args.city);
  // Send result back to model
}
```

### 6. Multi-turn Chat

```javascript
const chat = model.startChat({
  history: [
    { role: "user", parts: [{ text: "You are a helpful coding assistant." }] },
    { role: "model", parts: [{ text: "Sure! I'm ready to help with code." }] },
  ],
});

const response = await chat.sendMessage("How do I reverse a string in Python?");
console.log(response.response.text());
```

### 7. Model Selection Guide

| Model | Best For | Speed | Cost |
|-------|----------|-------|------|
| `gemini-1.5-flash` | High-throughput, cost-sensitive tasks | Fast | Low |
| `gemini-1.5-pro` | Complex reasoning, long context | Medium | Medium |
| `gemini-2.0-flash` | Latest fast model, multimodal | Very Fast | Low |
| `gemini-2.0-pro` | Most capable, advanced tasks | Slow | High |

## Best Practices

- ✅ **Do:** Use `gemini-1.5-flash` for most tasks — it's fast and cost-effective
- ✅ **Do:** Always stream responses for user-facing chat UIs to reduce perceived latency
- ✅ **Do:** Store API keys in environment variables, never hard-code them
- ✅ **Do:** Implement exponential backoff for rate limit (429) errors
- ✅ **Do:** Use `systemInstruction` to set persistent model behavior
- ❌ **Don't:** Use `gemini-pro` for simple tasks — Flash is cheaper and faster
- ❌ **Don't:** Send large base64 images inline for files > 20MB — use File API instead
- ❌ **Don't:** Ignore safety ratings in responses for production apps

## Error Handling

```javascript
try {
  const result = await model.generateContent(prompt);
  return result.response.text();
} catch (error) {
  if (error.status === 429) {
    // Rate limited — wait and retry with exponential backoff
    await new Promise(r => setTimeout(r, 2 ** retryCount * 1000));
  } else if (error.status === 400) {
    // Invalid request — check prompt or parameters
    console.error("Invalid request:", error.message);
  } else {
    throw error;
  }
}
```

## Troubleshooting

**Problem:** `API_KEY_INVALID` error
**Solution:** Ensure `GEMINI_API_KEY` environment variable is set and the key is active in Google AI Studio.

**Problem:** Response blocked by safety filters
**Solution:** Check `result.response.promptFeedback.blockReason` and adjust your prompt or safety settings.

**Problem:** Slow response times
**Solution:** Switch to `gemini-1.5-flash` and enable streaming. Consider caching repeated prompts.

**Problem:** `RESOURCE_EXHAUSTED` (quota exceeded)
**Solution:** Check your quota in Google Cloud Console. Implement request queuing and exponential backoff.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
