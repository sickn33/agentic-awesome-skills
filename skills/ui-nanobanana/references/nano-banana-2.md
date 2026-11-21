# Nano Banana 2.1

Google's primary high-efficiency workhorse image model — the GA successor to Nano Banana 2 (`gemini-3.1-flash-image`, deprecated 2026-10-06). Halves per-image output token cost compared to `gemini-3.1-flash-image` while upgrading visual realism across 1K/2K/4K, typography and infographic layout accuracy, multi-turn character consistency, wide/panoramic aspect ratios (`1:4`, `4:1`, `1:8`, `8:1`), and Google Web + Image Search grounding. Default for standard finals and iterative multi-turn edits.

| Field | Value |
|---|---|
| Model ID | `gemini-nano-banana-2.1` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync — one call, one reply (supports stateful multi-turn via `previous_interaction_id`) |
| Type | Image |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 |
| Cost | ~$0.034 (1K), ~$0.050 (2K), ~$0.113 (4K) at $30 / 1M image output tokens ($1.50 / 1M input tokens) — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before every call (see SKILL.md, Rules) |

`gemini-3.1-flash-image` (Nano Banana 2) was deprecated on 2026-10-06 and `imagen-4.0-*` endpoints were shut down on 2026-08-17 — `gemini-nano-banana-2.1` is the GA replacement for both.

## Request (Python, `google-genai` SDK)

```python
from google import genai
import base64

client = genai.Client()  # reads GEMINI_API_KEY from env

input_parts = [{"type": "text", "text": prompt}]
for ref_path in reference_images:  # up to 14 refs (up to 4 characters + 10 objects)
    with open(ref_path, "rb") as f:
        input_parts.append({
            "type": "image",
            "data": base64.b64encode(f.read()).decode("utf-8"),
            "mime_type": "image/png",
        })

interaction = client.interactions.create(
    model="gemini-nano-banana-2.1",
    input=input_parts,
    generation_config={
        "thinking_level": "medium",  # "minimal" | "medium" (default) | "high"
    },
    response_format={
        "type": "image",
        "image_size": "1K",       # "1K" (default) | "2K" | "4K"
        "aspect_ratio": "16:9",   # 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9, 1:4, 4:1, 1:8, 8:1
    },
)
```

### Multi-turn conversational edit (`previous_interaction_id`)
```python
edited = client.interactions.create(
    model="gemini-nano-banana-2.1",
    previous_interaction_id=interaction.id,
    input="Update the headline to Spanish and keep every other element identical.",
    response_format={
        "type": "image",
        "image_size": "2K",
        "aspect_ratio": "16:9",
    },
)
```

### Search & Image Search grounding (optional)
```python
grounded = client.interactions.create(
    model="gemini-nano-banana-2.1",
    input=prompt,
    tools=[{
        "type": "google_search",
        "search_types": ["web_search", "image_search"],
    }],
    response_format={"type": "image", "image_size": "2K", "aspect_ratio": "16:9"},
)
```

## Response handling

Same shape as Nano Banana 2 Lite — see that recipe for the full save snippet. Decode `output_image.data` with `base64.b64decode` and write it to disk, and verify the file exists and is non-empty **before** writing the sidecar. If `output_image` is empty and only `output_text` came back, the generation failed — surface that text to the user, save nothing, log nothing.

## Notes

- **Pricing parity at 1K with Lite, higher input cost:** At `1K`, image output tokens cost the same ~$0.034/image as Nano Banana 2 Lite ($30/1M image tokens), though input tokens are $1.50/1M vs Lite's $0.25/1M and default `thinking_level="medium"` adds thinking tokens ($7.50/1M). Use Lite (`thinking_level="minimal"`) for rapid throwaway drafts, then promote to Nano Banana 2.1 (`1K`/`2K`/`4K`) for finals.
- **Promoting a draft:** Pass the picked Lite draft image as a reference alongside the original prompt so the final is anchored to approved pixels instead of a fresh roll of the same words.
- **Stateful chaining:** Log `interaction.id` in `response_id` in the sidecar. `previous_interaction_id` is officially supported on `gemini-nano-banana-2.1` for server-side multi-turn edits without re-uploading prior images.
- **Reference limits (up to 14 images):** Supports up to 4 character references for character consistency and up to 10 object references. When a job needs 5 characters, dedicated style reference slots (up to 3), or maximum creative reasoning on dense layouts, use Nano Banana Pro (`gemini-3-pro-image`).
- **Panoramic aspect ratios:** `1:4`, `4:1`, `1:8`, and `8:1` are natively supported at `1K`, `2K`, and `4K` with tiling artifacts fixed in 2.1. (Legacy `512px` / `0.5K` from `gemini-3.1-flash-image` is not supported on `gemini-nano-banana-2.1`.)
