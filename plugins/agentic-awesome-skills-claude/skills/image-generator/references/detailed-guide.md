# Image Generator - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Setup and bounded editing example

Use an approved supported `google-genai`/Pillow version and currently available image model. An API key does not imply free image generation or approved uploads. Read an existing secret environment variable or obtain a non-echoed session input; do not store real keys in tracked `.env` files, shell profiles or logs. Restarting a shell does not preserve a one-session prompt. Prefer the host’s secure secret facility.

The SDK serializes prompts (including quotes/newlines) without unsafe heredoc interpolation. This example sends one approved input; add multiple images to `contents` only when each is authorized. The inputs are not bundled.

```python
import os
import getpass
from pathlib import Path
from PIL import Image
from google import genai
from google.genai import types

api_key = os.environ.get("GEMINI_API_KEY") or getpass.getpass("Gemini API key: ")
if not api_key:
    raise ValueError("Missing credential")
input_path = Path("input.png")  # authorized input path
if input_path.stat().st_size > 20 * 1024 * 1024:
    raise ValueError("Input exceeds this example’s20MiB budget")
with Image.open(input_path) as image:
    if image.width * image.height > 25_000_000:
        raise ValueError("Input exceeds pixel budget")
    image.load()
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",  # verify current availability
        contents=["Add a wizard hat to this cat; preserve its pose.", image],
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
    )
parts = response.parts or []
images = [p for p in parts if p.inline_data is not None]
if not images:
    raise RuntimeError("No image returned; inspect refusal/error without exposing secrets")
for index, part in enumerate(images):
    mime = part.inline_data.mime_type
    suffix = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}.get(mime)
    if suffix is None:
        raise ValueError(f"Unexpected output MIME: {mime}")
    destination = Path(f"edited_image_{index}{suffix}")
    with destination.open("xb") as output:  # never overwrite an existing artifact
        output.write(part.inline_data.data)
    print(f"Saved: {destination}")
```

No fixed `/tmp/gemini_request.json`/response files are used; those can collide, leak images or follow preexisting symlinks. If a REST implementation needs temporary files, create a private unique directory, serialize JSON with a library, validate HTTP status and clean up in a finally block. Do not interpolate an output path into Python source.

## Capabilities

### Text-to-Image Generation
- Generate high-quality images from text descriptions
- Support for photorealistic, stylized, and artistic outputs
- Text rendering is probabilistic; proofread every character and factual diagram before use

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
- Save authorized outputs locally; storage, logging and retention depend on provider/account terms and must be verified, not assumed absent.
