# Gemini 4 Argon

Google's efficient Gemini 4 frontier reasoning model (`gemini-4-argon`) with a unified 1,048,576-token context window, long decode up to 1M tokens, tunable thinking levels (`low`, `medium` default, `high`), and agentic multimodal (text, image, video, audio, PDF) understanding. It delivers Gemini 4 frontier reasoning with faster responses and leaner token spend per turn compared to `gemini-4-carbon`. It does not output raster images or `.mp4` video directly — in `/generate` and `/ui`, reach for it in two places:

1. **Storyboard, typography & prompt architecture** — ingest a reference set (`generations/refs/<set>/`), an existing clip, or a dense brief to plan multi-shot storyboards, natural-language Omni 1.2 Flash scripts, or exact infographic copy before calling Nano Banana 2.1 / Pro or Gemini Omni 1.2 Flash. (Google's Nano Banana docs explicitly recommend generating dense on-image copy first and then prompting the image model with that text.)
2. **Code-driven visuals (SVG, Three.js, Canvas, GLSL Shaders)** — generate crisp, self-contained vector assets (`.svg`) or interactive 3D/shader scenes (`.html`) into `generations/` when exact geometry or programmable visuals beat raster pixels.

| Field | Value |
|---|---|
| Model ID | `gemini-4-argon` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync up to 64K tokens (`65,536` default); async `background=True` for long decode up to 1M tokens |
| Type | Efficient Frontier Reasoning / Storyboarding / Code Visuals (Text output) |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/models/gemini-4-argon |
| Cost | Paid tier only (no free tier): $2.00 / 1M input tokens and $10.00 / 1M output + thinking tokens through 2026-11-30 ($4.00 / 1M input and $20.00 / 1M output starting 2026-12-01); 95% implicit cache discount at ≥4,096 tokens — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before every call (see SKILL.md, Rules) |

## Request (Python, `google-genai >= 3.2.0` SDK)

### Storyboard / visual reasoning or SVG / Three.js generation (sync)
```python
from google import genai
import base64
import mimetypes
from pathlib import Path

client = genai.Client()  # reads GEMINI_API_KEY from env

input_parts = [{"type": "text", "text": prompt}]
for ref_path in ref_paths:
    raw = Path(ref_path).read_bytes()
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        mime_type = "image/png"
    elif raw.startswith(b"\xff\xd8\xff"):
        mime_type = "image/jpeg"
    elif raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        mime_type = "image/webp"
    else:
        mime_type, _ = mimetypes.guess_type(str(ref_path))
    if mime_type not in {"image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"}:
        raise ValueError(f"Unsupported reference MIME {mime_type} for {ref_path}")
    input_parts.append({
        "type": "image",
        "data": base64.b64encode(raw).decode("utf-8"),
        "mime_type": mime_type,
    })

interaction = client.interactions.create(
    model="gemini-4-argon",
    input=input_parts,
    generation_config={
        "thinking_level": "medium",  # "low" | "medium" (default) | "high" — never "minimal"
    },
)
```

### Long decode (>64K tokens, up to 1M tokens via `background=True`)
When generating large multi-scene storyboards, complex interactive 3D scenes, or exhaustive asset packs that exceed 65,536 tokens, run in background mode so the server handles continuation hops automatically:
```python
import time
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-4-argon",
    input=prompt,
    background=True,
    generation_config={
        "max_output_tokens": 131072,  # up to 1,048,576 minus input tokens
        "thinking_level": "high",
    },
)

deadline = time.monotonic() + 900  # 15-minute bounded deadline for long decode
while interaction.status in ("in_progress", "queued"):
    if time.monotonic() >= deadline:
        raise TimeoutError(f"Long decode timed out (interaction={interaction.id})")
    time.sleep(5)
    interaction = client.interactions.get(id=interaction.id)

# Join text across all continuation hops
full_text = "".join(
    content.text
    for step in interaction.steps
    if step.type == "model_output"
    for content in (step.content or [])
    if content.type == "text"
)
```

## Response handling

```python
from pathlib import Path

output_text = interaction.output_text
if not output_text:
    raise RuntimeError(f"Empty response (status={interaction.status})")

Path(output_path).write_text(output_text, encoding="utf-8")
assert Path(output_path).stat().st_size > 0
```

Verify the saved artifact (`.svg`, `.html`, or storyboard `.md`) exists and is non-empty on disk before writing the matching `.json` sidecar. Log `interaction.id` in `response_id` so follow-up turns can chain statefully via `previous_interaction_id`.

## Notes

- **Choosing across the Gemini 4 family:**
  - **`gemini-4-argon`** ($2/$10 per 1M intro through Nov 30, 2026; $4/$20 thereafter, default `thinking_level="medium"`): Efficient frontier reasoning for interactive loops, 3D/shader architecture, and deep storyboarding. (Its sibling **`gemini-4-carbon`** shares the exact same schema and price for maximum sustained reasoning depth.)
  - **`gemini-4-neon`** ($3/$15 per 1M, default `thinking_level="high"`, supports `"xhigh"`): Fast end-to-end frontier execution across complex UI/code visuals and multimodal synthesis (see `models/gemini-4-neon.md`).
  - **`gemini-4-hydrogen`** ($1.50/$7.50 per 1M, default `thinking_level="high"`, supports `"xhigh"`): High-speed daily driver for rapid UI prototyping, SVG generation, and multimodal reference analysis (see `models/gemini-4-hydrogen.md`).
- **Valid `thinking_level` values on Argon are `"low"`, `"medium"` (default), and `"high"` only.** Passing `"minimal"` (which works on Nano Banana 2.1 / Lite) or a custom `thinking_budget` raises a validation error on `gemini-4-argon`.
- **Do not pass sampling parameters (`temperature`, `top_p`, `top_k`).** They are deprecated and ignored on Gemini 4 models.
- **`max_output_tokens` covers both thinking and final output** within the shared 1,048,576-token context window. Leave it unset (defaults to `65,536`) or set at least `32,768` so reasoning doesn't truncate the response.
- **Implicit caching only:** Explicit context caching (`cachedContents` / `caches.create`) is unsupported and will error. Implicit caching is enabled by default for prompts ≥4,096 tokens (95% discount on cache hits: $0.10 / 1M tokens through Nov 30, 2026; $0.20 / 1M thereafter).
- **No free tier:** Every token processed — including thinking tokens and internal tool/grounding declarations — is billed. Always quote and get explicit user approval before calling `gemini-4-argon`.
