---
name: image-generator
description: Generate and edit images using Gemini's Nano Banana Pro model (gemini-3-pro-image-preview). Use this skill when the user asks you to generate images, create visuals, edit photos, create logos, generate product mockups, or perform any image generation/editing task.
allowed-tools: Read, Write, Bash, WebFetch
category: "media"
risk: "safe"
source: "official"
source_repo: "dair-ai/dair-academy-plugins"
source_type: "official"
date_added: "2026-06-19"
author: "DAIR.AI"
license: "MIT"
license_source: "https://github.com/dair-ai/dair-academy-plugins/blob/main/README.md#license"
tags:
  - dair-academy
  - ai
  - workflow
tools:
  - claude-code
  - codex-cli
  - cursor
---

# Image Generator

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use

Use when this workflow matches the user request: Generate and edit images using Gemini's Nano Banana Pro model (gemini-3-pro-image-preview). Use this skill when the user asks you to generate images, create visuals, edit photos, create logos, generate product mockups, or perform any image generation/editing task.


_Source: [dair-ai/dair-academy-plugins](https://github.com/dair-ai/dair-academy-plugins) (MIT)._

This skill generates and edits images using Google's Gemini Nano Banana Pro model (`gemini-3-pro-image-preview`).

## API Usage

### Basic Text-to-Image (Python)

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["Your prompt here"],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",  # Optional
            image_size="2K"       # Optional: "1K", "2K", "4K"
        )
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```

### Basic Text-to-Image (JavaScript)

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: "Your prompt here",
    config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K"
        }
    }
});

for (const part of response.candidates[0].content.parts) {
    if (part.text) {
        console.log(part.text);
    } else if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync("generated_image.png", buffer);
    }
}
```

### REST API (curl)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Your prompt here"}]
    }],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {
        "aspectRatio": "16:9",
        "imageSize": "2K"
      }
    }
  }' | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | base64 --decode > output.png
```

### Image Editing (with input image)

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

input_image = Image.open('input.png')
prompt = "Add a wizard hat to the cat in this image"

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt, input_image],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE']
    )
)

for part in response.parts:
    if part.inline_data is not None:
        image = part.as_image()
        image.save("edited_image.png")
```

### Multi-Image Composition

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

image1 = Image.open('dress.png')
image2 = Image.open('model.png')
prompt = "Put the dress from the first image on the model from the second image"

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[image1, image2, prompt],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="3:4",
            image_size="2K"
        )
    )
)
```

### With Google Search Grounding

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="Visualize the current weather forecast for San Francisco",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
        tools=[{"google_search": {}}]
    )
)
```

## Limitations

- Requires the upstream tool, account, API key, or local setup when the workflow names one.
- Does not authorize destructive, production, paid, or external-message actions without explicit user approval.
- Validate generated artifacts or recommendations against the user's real sources before treating them as final.
