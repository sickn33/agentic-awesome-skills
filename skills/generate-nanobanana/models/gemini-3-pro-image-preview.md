# Gemini 3 Pro Image (`gemini-3-pro-image-preview`)

## Overview
Nano Banana Pro is the flagship model for highest-quality rendering, complex multi-image fusion, character consistency, and sharp on-image typography rendering ($0.13–$0.30 per generation).

## Model Specification
- **Model ID**: `gemini-3-pro-image-preview`
- **Primary Use**: Premium graphics, multi-image fusion, dense on-image text, complex composite scenes
- **Ballpark Cost**: $0.13–$0.30
- **Supported Resolutions**: 1K, 2K, 4K
- **Supported Aspect Ratios**: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`, `5:4`, `4:5`

## Request Shape

### Python SDK (`google-genai`)
```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=["A high-end editorial magazine cover featuring a futuristic electric car with legible headline text 'THE FUTURE OF MOBILITY'"],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="3:4",
            image_size="2K"
        ),
        seed=481047
    )
)

for part in response.parts:
    if part.inline_data is not None:
        image = part.as_image()
        image.save("generations/cover.png")
```

### REST API (`curl`)
```bash
cat > /tmp/pro_image_request.json << 'EOF'
{
  "contents": [
    {
      "parts": [
        {"text": "A high-end editorial magazine cover featuring a futuristic electric car with legible headline text 'THE FUTURE OF MOBILITY'"}
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "3:4",
      "imageSize": "2K"
    },
    "seed": 481047
  }
}
EOF

curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/pro_image_request.json > /tmp/response.json
```

### Multi-Image Reference & Fusion
Nano Banana Pro supports up to 14 reference images for composition and style fusion:
```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()
subject_img = Image.open("generations/refs/brand/character.png")
logo_img = Image.open("generations/refs/brand/logo.png")

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        "Combine the character from the first image and place the logo from the second image on their jacket in a retro synthwave city",
        subject_img,
        logo_img
    ],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="16:9", image_size="2K"),
        seed=481047
    )
)
```
