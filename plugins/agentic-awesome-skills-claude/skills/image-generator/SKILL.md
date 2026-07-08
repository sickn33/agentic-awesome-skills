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

## When to Use

Use when this workflow matches the user request: Generate and edit images using Gemini's Nano Banana Pro model (gemini-3-pro-image-preview). Use this skill when the user asks you to generate images, create visuals, edit photos, create logos, generate product mockups, or perform any image generation/editing task.


_Source: [dair-ai/dair-academy-plugins](https://github.com/dair-ai/dair-academy-plugins) (MIT)._

This skill generates and edits images using Google's Gemini Nano Banana Pro model (`gemini-3-pro-image-preview`).

## IMPORTANT: Setup Required

Before using this skill, the user must set the `GEMINI_API_KEY` environment variable:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Export the key in your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
   ```bash
   read -rsp "Gemini API key: " GEMINI_API_KEY
   echo
   export GEMINI_API_KEY
   ```
3. Restart your terminal or run `source ~/.zshrc` (or `~/.bashrc`)

**The skill will not work without this configuration.**

## Pre-flight Check

Before making any API call, verify the key is set:

```bash
if [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: GEMINI_API_KEY is not set. Please export it in your shell profile."
  exit 1
fi
```

If the key is missing, stop and tell the user to set it using the instructions above.

## Configuration

**Model**: `gemini-3-pro-image-preview`

**API Key**: Read from the `GEMINI_API_KEY` environment variable

## Iterating on User-Provided Images

When the user provides a path to an image they want to edit or iterate on, use this workflow:

### Step 1: Read and encode the image to base64

```bash
# Get the image path from user
IMG_PATH="/path/to/user/image.png"

# Detect mime type
if [[ "$IMG_PATH" == *.png ]]; then
    MIME_TYPE="image/png"
elif [[ "$IMG_PATH" == *.jpg ]] || [[ "$IMG_PATH" == *.jpeg ]]; then
    MIME_TYPE="image/jpeg"
elif [[ "$IMG_PATH" == *.webp ]]; then
    MIME_TYPE="image/webp"
else
    MIME_TYPE="image/png"
fi

# Encode to base64 (works on both macOS and Linux)
if [[ "$(uname)" == "Darwin" ]]; then
    IMG_BASE64=$(base64 -i "$IMG_PATH")
else
    IMG_BASE64=$(base64 -w0 "$IMG_PATH")
fi
```

### Step 2: Send image with edit prompt (File-Based Approach)

**IMPORTANT:** Always use a file-based approach for the request body. Base64-encoded images are too large for command-line arguments and will cause "argument list too long" errors.

```bash
# User's edit request
EDIT_PROMPT="Add a santa hat to the person in this image"

# Write request to a JSON file (avoids command line length limits)
cat > /tmp/gemini_request.json << JSONEOF
{
  "contents": [{
    "parts": [
      {"text": "$EDIT_PROMPT"},
      {
        "inline_data": {
          "mime_type": "$MIME_TYPE",
          "data": "$IMG_BASE64"
        }
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
JSONEOF

# Call the API using the file
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/gemini_request.json > /tmp/gemini_response.json
```

### Step 3: Extract and save the edited image

```bash
# Extract image from response and save
python3 -c "
import json
import base64

with open('/tmp/gemini_response.json') as f:
    data = json.load(f)

for part in data['candidates'][0]['content']['parts']:
    if 'inlineData' in part:
        img_data = part['inlineData']['data']
        mime = part['inlineData']['mimeType']
        ext = 'png' if 'png' in mime else 'jpg'
        with open('edited_image.' + ext, 'wb') as out:
            out.write(base64.b64decode(img_data))
        print(f'Saved: edited_image.{ext}')
    elif 'text' in part:
        print(part['text'])
"
```

### Complete Example (File-Based)

For iterating on images, always use file-based requests:

```bash
# Variables
IMG_PATH="/path/to/image.png"
EDIT_PROMPT="Make the background a sunset beach"
OUTPUT_PATH="edited_output.png"
# Detect mime type and encode
MIME_TYPE=$([[ "$IMG_PATH" == *.png ]] && echo "image/png" || echo "image/jpeg")
IMG_BASE64=$(base64 -i "$IMG_PATH" 2>/dev/null || base64 -w0 "$IMG_PATH")

# Write request to file (required - base64 images are too large for command line)
cat > /tmp/gemini_request.json << JSONEOF
{
  "contents": [{
    "parts": [
      {"text": "$EDIT_PROMPT"},
      {"inline_data": {"mime_type": "$MIME_TYPE", "data": "$IMG_BASE64"}}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
JSONEOF

# Call API and extract image
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/gemini_request.json > /tmp/gemini_response.json

# Save the output image
python3 -c "
import json, base64
with open('/tmp/gemini_response.json') as f:
    data = json.load(f)
for part in data.get('candidates', [{}])[0].get('content', {}).get('parts', []):
    if 'inlineData' in part:
        with open('$OUTPUT_PATH', 'wb') as f:
            f.write(base64.b64decode(part['inlineData']['data']))
        print('Saved: $OUTPUT_PATH')
"
```

### Multi-Image Input (Combine/Compose)

To combine elements from multiple images (also uses file-based approach):

```bash
IMG1_PATH="/path/to/image1.png"
IMG2_PATH="/path/to/image2.png"
PROMPT="Put the dress from the first image on the person in the second image"
IMG1_BASE64=$(base64 -i "$IMG1_PATH" 2>/dev/null || base64 -w0 "$IMG1_PATH")
IMG2_BASE64=$(base64 -i "$IMG2_PATH" 2>/dev/null || base64 -w0 "$IMG2_PATH")

# Write request to file
cat > /tmp/gemini_request.json << JSONEOF
{
  "contents": [{
    "parts": [
      {"text": "$PROMPT"},
      {"inline_data": {"mime_type": "image/png", "data": "$IMG1_BASE64"}},
      {"inline_data": {"mime_type": "image/png", "data": "$IMG2_BASE64"}}
    ]
  }],
  "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}
}
JSONEOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/gemini_request.json > /tmp/gemini_response.json
```

## Capabilities

### Text-to-Image Generation
- Generate high-quality images from text descriptions
- Support for photorealistic, stylized, and artistic outputs
- Accurate text rendering in images (logos, infographics, diagrams)

### Image Editing
- Add or remove elements from images
- Inpainting with semantic masking (edit specific parts)
- Style transfer (apply artistic styles to photos)
- Multi-image composition (combine elements from multiple images)

### Advanced Features
- **High Resolution**: 1K, 2K, or 4K output
- **Aspect Ratios**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **Google Search Grounding**: Generate images based on real-time data
- **Multi-turn Editing**: Iteratively refine images through conversation
- **Up to 14 Reference Images**: Combine multiple inputs for complex compositions

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

## Prompting Best Practices

### 1. Be Descriptive, Not Keyword-Based
Instead of: `cat, wizard hat, cute`
Write: `A fluffy orange cat wearing a small knitted wizard hat, sitting on a wooden floor with soft natural lighting from a window`

### 2. Specify Style and Mood
- Photography terms: "shot with 85mm lens", "soft bokeh background", "golden hour lighting"
- Artistic styles: "in the style of Van Gogh", "minimalist illustration", "photorealistic"
- Mood: "warm and cozy atmosphere", "dramatic noir lighting"

### 3. For Text in Images
Be explicit about:
- The exact text to render
- Font style (descriptively): "clean, bold, sans-serif font"
- Placement and size

### 4. For Editing
- Describe what to change and what to preserve
- Use "keep everything else unchanged"
- Reference specific elements clearly

### 5. For Product/Commercial Images
Mention:
- Lighting setup: "three-point softbox lighting"
- Background: "clean white studio background"
- Camera angle: "slightly elevated 45-degree shot"

## Resolution and Aspect Ratio Reference

| Aspect Ratio | 1K Resolution | 2K Resolution | 4K Resolution |
|--------------|---------------|---------------|---------------|
| 1:1          | 1024x1024     | 2048x2048     | 4096x4096     |
| 16:9         | 1376x768      | 2752x1536     | 5504x3072     |
| 9:16         | 768x1376      | 1536x2752     | 3072x5504     |
| 3:2          | 1264x848      | 2528x1696     | 5056x3392     |
| 2:3          | 848x1264      | 1696x2528     | 3392x5056     |

## Common Use Cases

### Logo Creation
```
Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'.
The text should be in a clean, bold, sans-serif font.
Black and white color scheme. Put the logo in a circle.
```

### Product Photography
```
A high-resolution, studio-lit product photograph of a minimalist ceramic
coffee mug in matte black on a polished concrete surface. Three-point
softbox lighting with soft, diffused highlights. Slightly elevated
45-degree camera angle. Sharp focus on steam rising from the coffee.
```

### Style Transfer
```
Transform this photograph of a city street at night into Vincent van Gogh's
'Starry Night' style. Preserve the composition but render with swirling,
impasto brushstrokes and deep blues with bright yellows.
```

### Infographic
```
Create a vibrant infographic explaining photosynthesis as a recipe.
Show "ingredients" (sunlight, water, CO2) and "finished dish" (sugar/energy).
Style like a colorful kids' cookbook, suitable for 4th graders.
```

## Error Handling

Common issues:
- **No image returned**: Check that `response_modalities` includes `'IMAGE'`
- **Safety filters**: Some prompts may be blocked; try rephrasing
- **Rate limits**: Implement exponential backoff for retries
- **Large images**: For 4K, ensure sufficient timeout settings

## Dependencies

To use the Python SDK:
```bash
pip install google-genai pillow
```

For JavaScript:
```bash
npm install @google/genai
```

## Important Notes

- All generated images include a SynthID watermark
- The model uses a "thinking" process for complex prompts
- For best text rendering, generate text first, then request image with that text
- Images are not stored by the API - save outputs locally


## Limitations

- Requires the upstream tool, account, API key, or local setup when the workflow names one.
- Does not authorize destructive, production, paid, or external-message actions without explicit user approval.
- Validate generated artifacts or recommendations against the user's real sources before treating them as final.
