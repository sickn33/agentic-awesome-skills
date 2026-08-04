# Gemini 3 Pro Image (`gemini-3-pro-image`)

## Overview
Nano Banana Pro is the flagship model for highest-quality rendering, complex multi-image fusion, character consistency, and sharp on-image typography.

> **Model ID note**: the earlier `gemini-3-pro-image-preview` was deprecated 2026-05-28 and shut down 2026-06-25. `gemini-3-pro-image` is the current generally-available (GA) replacement. Re-verify against [ai.google.dev/gemini-api/docs/image-generation](https://ai.google.dev/gemini-api/docs/image-generation) before relying on this ID, since Google rotates preview/GA model names on its own schedule.

## Model Specification
- **Model ID**: `gemini-3-pro-image`
- **API**: Interactions API (`client.interactions.create`) — this model does not use the older `generate_content` method.
- **Primary Use**: Premium graphics, multi-image fusion, dense on-image text, complex composite scenes.
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
    model="gemini-3-pro-image",
    input="A high-end editorial magazine cover featuring a futuristic electric car with legible headline text 'THE FUTURE OF MOBILITY'",
    response_format={
        "type": "image",
        "aspect_ratio": "3:4",
        "image_size": "2K",
    },
)

with open("generations/cover.png", "wb") as f:
    f.write(base64.b64decode(interaction.output_image.data))
```

### Multi-Image Reference & Fusion
Nano Banana Pro supports up to 14 reference images for composition and style fusion:
```python
from google import genai
import base64

client = genai.Client()

with open("generations/refs/brand/character.png", "rb") as f:
    subject_bytes = f.read()
with open("generations/refs/brand/logo.png", "rb") as f:
    logo_bytes = f.read()

interaction = client.interactions.create(
    model="gemini-3-pro-image",
    input=[
        {"type": "text", "text": "Combine the character from the first image and place the logo from the second image on their jacket in a retro synthwave city"},
        {"type": "image", "data": base64.b64encode(subject_bytes).decode("utf-8"), "mime_type": "image/png"},
        {"type": "image", "data": base64.b64encode(logo_bytes).decode("utf-8"), "mime_type": "image/png"},
    ],
    response_format={"type": "image", "aspect_ratio": "16:9", "image_size": "2K"},
)
```

### REST API (`curl`)
```bash
mkdir -p generations
cat > generations/pro_image_request.json << 'EOF'
{
  "model": "gemini-3-pro-image",
  "input": [
    {"type": "text", "text": "A high-end editorial magazine cover featuring a futuristic electric car with legible headline text 'THE FUTURE OF MOBILITY'"}
  ],
  "response_format": {
    "type": "image",
    "aspect_ratio": "3:4",
    "image_size": "2K"
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @generations/pro_image_request.json > generations/pro_image_response.json
```

The response's `output_image.data` field holds the base64-encoded image bytes; decode and write them to the target file.
