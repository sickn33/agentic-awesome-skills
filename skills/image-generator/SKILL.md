---
name: image-generator
description: Generate and edit images using Gemini's Nano Banana Pro model (gemini-3-pro-image-preview). Use this skill when the user asks you to generate images, create visuals, edit photos, create logos, generate product mockups, or perform any image generation/editing task.
allowed-tools: Read, Write, Bash, WebFetch
category: "media"
risk: "critical"
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

Paid external API workflow: confirm approved model/budget, exact prompt and input image set, rights/consent and provider data policy before requests. Model ID/options below are historical examples; check current availability and SDK version. Never promise exact text, masking or resolution; inspect returned MIME/dimensions and visible output. Preserve originals and use new unique output names, writing only within the authorized destination. A missing/blocked image is not success; do not retry billable calls blindly after uncertain outcomes.

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

### REST alternative

Prefer the SDK examples so credentials are not interpolated into command-line headers and JSON is serialized correctly. If implementing REST, use a protected header/request file, explicit timeouts and HTTP-status handling; validate candidate/part/MIME fields before writing bytes. Do not assume the first candidate or an image exists.

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
