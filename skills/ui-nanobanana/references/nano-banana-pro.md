# Nano Banana Pro

Google's studio-grade reasoning image model (`gemini-3-pro-image`). Built for complex graphic design, strict brand adherence, multi-image composition (up to 14 reference images: up to 6 objects, 5 characters, and 3 dedicated style references), and dense, factual typography. Reach for this once a draft on Nano Banana 2 Lite has been picked, or when a job exceeds Nano Banana 2.1's reference/reasoning envelope; it costs roughly 3–4x the 2.1/Lite tier.

| Field | Value |
|---|---|
| Model ID | `gemini-3-pro-image` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync — one call, one reply (supports stateful multi-turn via `previous_interaction_id`) |
| Type | Image |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image |
| Cost | ~$0.134 (1K/2K) to ~$0.24 (4K) at $120 / 1M image output tokens ($2.00 / 1M input tokens, $12.00 / 1M text & thinking output tokens) — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before every call (see SKILL.md, Rules) |

`gemini-3-pro-image-preview` was deprecated 2026-05-28 and shut down 2026-06-25. `gemini-3-pro-image` is the current GA replacement.

## Request (Python, `google-genai` SDK)

```python
from google import genai
import base64

client = genai.Client()

input_parts = [{"type": "text", "text": prompt}]
for ref_path in reference_images:  # up to 14 supported (up to 6 objects, 5 characters, 3 style refs)
    with open(ref_path, "rb") as f:
        input_parts.append({
            "type": "image",
            "data": base64.b64encode(f.read()).decode("utf-8"),
            "mime_type": "image/png",
        })

interaction = client.interactions.create(
    model="gemini-3-pro-image",
    input=input_parts,
    response_format={
        "type": "image",
        "image_size": "2K",       # "1K" | "2K" (same 1,120 token cost as 1K) | "4K" (2,000 tokens)
        "aspect_ratio": "16:9",   # 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
    },
)
```

### Multi-turn conversational edit (`previous_interaction_id`)
```python
edited = client.interactions.create(
    model="gemini-3-pro-image",
    previous_interaction_id=interaction.id,
    input="Keep the layout and characters identical, but change the lighting to golden hour.",
    response_format={"type": "image", "image_size": "2K", "aspect_ratio": "16:9"},
)
```

## Response handling

Same shape as Nano Banana 2 Lite — see that recipe for the full save snippet. Decode `output_image.data` with `base64.b64decode` and write it to disk, verify the file exists and is non-empty **before** writing the sidecar. A text-only response means the generation failed: surface the text, save nothing, log nothing.

## Notes

- **1K and 2K cost the same on Pro:** Both `1K` and `2K` resolutions consume 1,120 image output tokens (~$0.134/image on Standard tier), while `4K` consumes 2,000 tokens (~$0.24/image). Default to `2K` on Pro unless `1K` dimensions are specifically needed.
- **When to pick Pro over Nano Banana 2.1:** Pro is worth the premium specifically for 5-character consistency, dedicated style-reference blending (up to 3 style refs + 6 objects + 5 characters = 14 total), and the hardest layout/typography prompts. For everyday finals, panoramic ratios (`1:4`, `4:1`, `1:8`, `8:1`), or video-to-image inputs, Nano Banana 2.1 (`gemini-nano-banana-2.1`) is faster and a third of the price.
- **Series lock:** For images that must match each other (a character across scenes, a product line, episode covers), pass the approved first image of the series as one of the references in every subsequent call, or chain edits with `previous_interaction_id`.
- **No `seed` parameter is documented on the Interactions API.** Hold `image_size` and `aspect_ratio` fixed across reruns for a consistent composition, and always log `interaction.id` in `response_id` in the sidecar.
