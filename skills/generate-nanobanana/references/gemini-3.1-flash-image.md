# Gemini 3.1 Flash Image (`gemini-3.1-flash-image`)

## Overview
Nano Banana 2 is the standard production model for image generation. It balances crisp detail, accurate style adherence, and high speed for most finished work.

## Model Specification
- **Model ID**: `gemini-3.1-flash-image`
- **API**: Interactions API (`client.interactions.create`) — this model does not use the older `generate_content` method.
- **Primary Use**: Production image generation, brand assets, social media graphics.
- **Cost**: Billable per call. Quote the current price from the live [pricing page](https://ai.google.dev/gemini-api/docs/pricing) and get explicit user approval before every generation — see the skill's cost-approval rule.
- **Reference images**: Up to 14 supported as additional `image` input parts.
- **Reproducibility**: No `seed` parameter is documented for this model. Treat every generation as non-deterministic; for "same image but change X" requests, reuse the exact original prompt and reference images rather than promising an identical re-roll.

## Request Shape

### Python SDK (`google-genai`, Interactions API)
```python
from google import genai
import base64

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.1-flash-image",
    input="A sleek modern product advertisement for wireless headphones on a clean marble table, studio lighting",
    response_format={
        "type": "image",
        "aspect_ratio": "16:9",
        "image_size": "2K",
    },
)

with open("generations/headphones.png", "wb") as f:
    f.write(base64.b64decode(interaction.output_image.data))
```

### Reference Image Input
```python
from google import genai
import base64

client = genai.Client()

with open("generations/refs/brand/style_sample.png", "rb") as f:
    style_bytes = f.read()

interaction = client.interactions.create(
    model="gemini-3.1-flash-image",
    input=[
        {"type": "text", "text": "Generate a pricing page banner adhering to the color scheme and lighting of this style reference"},
        {"type": "image", "data": base64.b64encode(style_bytes).decode("utf-8"), "mime_type": "image/png"},
    ],
    response_format={"type": "image", "aspect_ratio": "16:9", "image_size": "2K"},
)
```

### REST API (`curl`)
```bash
mkdir -p generations
cat > generations/flash_image_request.json << 'EOF'
{
  "model": "gemini-3.1-flash-image",
  "input": [
    {"type": "text", "text": "A sleek modern product advertisement for wireless headphones on a clean marble table, studio lighting"}
  ],
  "response_format": {
    "type": "image",
    "aspect_ratio": "16:9",
    "image_size": "2K"
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @generations/flash_image_request.json > generations/flash_image_response.json
```

The response's `output_image.data` field holds the base64-encoded image bytes; decode and write them to the target file.
