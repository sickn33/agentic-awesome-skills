# Nano Banana 2 Lite

Fastest, cheapest Gemini image model (sub-2-second latency target). Default for drafts, rapid iteration, and quick local edits — switch to Nano Banana 2.1 or Nano Banana Pro when a job needs 2K/4K output, multi-character consistency, search grounding, or dedicated style references.

| Field | Value |
|---|---|
| Model ID | `gemini-3.1-flash-lite-image` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync — one call, one reply |
| Type | Image |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/image-generation |
| Cost | ~$0.034 / 1K image ($30 / 1M image output tokens; $0.25 / 1M input tokens) — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before every call (see SKILL.md, Rules) |

## Request (Python, `google-genai` SDK)

```python
from google import genai
import base64

client = genai.Client()  # reads GEMINI_API_KEY from env

input_parts = [{"type": "text", "text": prompt}]
for ref_path in reference_images:  # keep to 0-2 images for fast drafting (endpoint accepts up to 14 object refs)
    with open(ref_path, "rb") as f:
        input_parts.append({
            "type": "image",
            "data": base64.b64encode(f.read()).decode("utf-8"),
            "mime_type": "image/png",
        })

interaction = client.interactions.create(
    model="gemini-3.1-flash-lite-image",
    input=input_parts,
    generation_config={
        "thinking_level": "minimal",  # "minimal" (default) | "high"
    },
    response_format={
        "type": "image",
        "image_size": "1K",       # 1K (1024px) only — 2K and 4K are unsupported on Lite
        "aspect_ratio": "16:9",   # 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9, etc.
    },
)
```

### Multi-turn local edit
```python
edited = client.interactions.create(
    model="gemini-3.1-flash-lite-image",
    previous_interaction_id=interaction.id,
    input="Swap the background to a warm studio gradient; keep everything else identical.",
    response_format={"type": "image", "image_size": "1K", "aspect_ratio": "16:9"},
)
```

## Response handling

```python
from pathlib import Path
import base64

if interaction.output_image is None or interaction.output_image.data is None:
    # No image came back — only text (a refusal, safety block, or commentary).
    # Surface that text to the user and stop. No file, no sidecar.
    raise RuntimeError(interaction.output_text or "empty response")

Path(output_path).write_bytes(base64.b64decode(interaction.output_image.data))
assert Path(output_path).stat().st_size > 0
```

Two rules that are not optional:

- **`output_image.data` is base64-encoded text, not raw bytes** — decode it with `base64.b64decode` before writing. Writing the string directly (or double-decoding) is the classic way a generation "succeeds" but no valid image ever lands on disk.
- **Verify the image file exists and is non-empty before writing the sidecar.** The sidecar is the record that an image exists — a sidecar without its image is a false log entry.

`output_text`, when present, is the model's commentary — safe to relay to the user, never the file.

## Notes

- **`image_size` is `"1K"` only.** `2K` and `4K` are unsupported on `gemini-3.1-flash-lite-image`. When a user wants 2K or 4K, route to Nano Banana 2.1 (`gemini-nano-banana-2.1`) or Nano Banana Pro (`gemini-3-pro-image`).
- **Thinking levels:** Supports `"minimal"` (default, fastest) and `"high"`. Google Search grounding is not supported on Lite.
- **Determinism & stateful edits:** No `seed` parameter is documented on the Interactions API. Log `interaction.id` in `response_id` on every sidecar so follow-up tweaks can chain statefully via `previous_interaction_id` or reuse the exact prompt and references (see SKILL.md, Determinism & coherence).
- **Promoting a draft:** A picked draft's identity does not transfer automatically to Nano Banana 2.1 or Pro. Pass the approved Lite draft image itself as a reference in the final call.
- If a request needs dense on-image text (infographics, packaging, readable UI copy), upgrade to Nano Banana 2.1 or Pro — Lite is weaker at typography.
