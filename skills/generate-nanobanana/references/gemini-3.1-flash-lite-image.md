# Gemini 3.1 Flash Lite Image (`gemini-3.1-flash-lite-image`)

## Overview
Nano Banana 2 Lite is Google's fastest and cheapest Gemini image model — the draft tier for rapid concept exploration and quick visual iteration before promoting a picked result to a higher tier.

## Model Specification
- **Model ID**: `gemini-3.1-flash-lite-image`
- **API**: Interactions API (`client.interactions.create`) — this model does not use the older `generate_content` method.
- **Primary Use**: Image drafts, rapid prototyping, thumbnail concepts.
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
    model="gemini-3.1-flash-lite-image",
    input="A futuristic city skyline at sunset, cyberpunk aesthetic, high detail",
    response_format={
        "type": "image",
        "aspect_ratio": "16:9",
        "image_size": "1K",
    },
)

with open("generations/output.png", "wb") as f:
    f.write(base64.b64decode(interaction.output_image.data))
```

### Reference Image Input
Pass reference images as additional `input` parts (base64-encoded), alongside the text prompt:
```python
from google import genai
import base64

client = genai.Client()

with open("generations/refs/brand/logo.png", "rb") as f:
    logo_bytes = f.read()

interaction = client.interactions.create(
    model="gemini-3.1-flash-lite-image",
    input=[
        {"type": "text", "text": "Incorporate this logo style into a draft banner for summer sale"},
        {"type": "image", "data": base64.b64encode(logo_bytes).decode("utf-8"), "mime_type": "image/png"},
    ],
    response_format={"type": "image", "aspect_ratio": "16:9"},
)
```

### REST API (`curl`)
```bash
mkdir -p generations
cat > generations/lite_image_request.json << 'EOF'
{
  "model": "gemini-3.1-flash-lite-image",
  "input": [
    {"type": "text", "text": "A futuristic city skyline at sunset, cyberpunk aesthetic, high detail"}
  ],
  "response_format": {
    "type": "image",
    "aspect_ratio": "16:9",
    "image_size": "1K"
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @generations/lite_image_request.json > generations/lite_image_response.json
```

The response's `output_image.data` field holds the base64-encoded image bytes; decode and write them to the target file.
