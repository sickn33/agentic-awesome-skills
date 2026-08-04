# Gemini 3.1 Flash Lite Image (`gemini-3.1-flash-lite-image`)

## Overview
Nano Banana 2 Lite is optimized for fast, cost-effective image drafting, rapid concept exploration, and quick visual iterations ($0.03–$0.05 per generation).

## Model Specification
- **Model ID**: `gemini-3.1-flash-lite-image`
- **Primary Use**: Image drafts, rapid prototyping, thumbnail concepts
- **Ballpark Cost**: $0.03–$0.05
- **Supported Resolutions**: 1K (`1024x1024` for 1:1, `1376x768` for 16:9, `768x1376` for 9:16)
- **Supported Aspect Ratios**: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`

## Request Shape

### Python SDK (`google-genai`)
```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-lite-image",
    contents=["A futuristic city skyline at sunset, cyberpunk aesthetic, high detail"],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="1K"
        ),
        seed=481047
    )
)

for part in response.parts:
    if part.inline_data is not None:
        image = part.as_image()
        image.save("generations/output.png")
```

### REST API (`curl`)
```bash
cat > /tmp/lite_image_request.json << 'EOF'
{
  "contents": [
    {
      "parts": [
        {"text": "A futuristic city skyline at sunset, cyberpunk aesthetic, high detail"}
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "1K"
    },
    "seed": 481047
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/lite_image_request.json > /tmp/response.json
```

### Reference Image Input
Pass reference images as `inline_data` (base64 encoded) or PIL Image objects alongside the text prompt:
```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()
ref_img = Image.open("generations/refs/brand/logo.png")

response = client.models.generate_content(
    model="gemini-3.1-flash-lite-image",
    contents=["Incorporate this logo style into a draft banner for summer sale", ref_img],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
        seed=481047
    )
)
```
