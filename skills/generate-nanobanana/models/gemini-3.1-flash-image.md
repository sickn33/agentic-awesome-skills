# Gemini 3.1 Flash Image (`gemini-3.1-flash-image`)

## Overview
Nano Banana 2 is the standard production model for image generation ($0.07–$0.15 per generation). It balances crisp details, accurate style adherence, and high speed.

## Model Specification
- **Model ID**: `gemini-3.1-flash-image`
- **Primary Use**: Production image generation, brand assets, social media graphics
- **Ballpark Cost**: $0.07–$0.15
- **Supported Resolutions**: 1K, 2K
- **Supported Aspect Ratios**: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`

## Request Shape

### Python SDK (`google-genai`)
```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image",
    contents=["A sleek modern product advertisement for wireless headphones on a clean marble table, studio lighting"],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K"
        ),
        seed=481047
    )
)

for part in response.parts:
    if part.inline_data is not None:
        image = part.as_image()
        image.save("generations/headphones.png")
```

### REST API (`curl`)
```bash
cat > /tmp/flash_image_request.json << 'EOF'
{
  "contents": [
    {
      "parts": [
        {"text": "A sleek modern product advertisement for wireless headphones on a clean marble table, studio lighting"}
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "2K"
    },
    "seed": 481047
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/flash_image_request.json > /tmp/response.json
```

### Reference Image Input
```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()
ref_style = Image.open("generations/refs/brand/style_sample.png")

response = client.models.generate_content(
    model="gemini-3.1-flash-image",
    contents=["Generate a pricing page banner adhering to the color scheme and lighting of this style reference", ref_style],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="16:9", image_size="2K"),
        seed=481047
    )
)
```
