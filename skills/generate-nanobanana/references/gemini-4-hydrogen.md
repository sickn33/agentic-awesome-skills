# Gemini 4 Hydrogen

Google's fast, balanced Gemini 4 daily driver (`gemini-4-hydrogen`) and the default model for everyday agentic workflows, live UI prototyping, multimodal document/video analysis, and rapid storyboard or prompt architecture. Features a unified 1,048,576-token context window, long decode up to 1M tokens, agentic video understanding, and four configurable thinking levels (`low`, `medium`, `high` default, `xhigh`).

In `/generate` and `/ui`, reach for `gemini-4-hydrogen` when you need fast, cost-efficient multimodal analysis of reference sets (`generations/refs/<set>/`), rapid copy/storyboard planning before calling Nano Banana 2.1 / Pro, or responsive SVG and interactive HTML widget prototyping.

| Field | Value |
|---|---|
| Model ID | `gemini-4-hydrogen` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync up to 64K tokens (`65,536` default); async `background=True` for long decode up to 1M tokens |
| Type | Fast Multimodal Reasoning / Live UI Prototyping / Storyboarding (Text output) |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/models/gemini-4-hydrogen |
| Cost | $1.50 / 1M input tokens and $7.50 / 1M output + thinking tokens on Paid tier (Free tier also available in Google AI Studio with rate limits) — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before paid runs (see SKILL.md, Rules) |

## Request (Python, `google-genai >= 3.2.0` SDK)

### Fast Storyboard / Reference Analysis or Live UI / SVG Prototyping (sync)
```python
from google import genai
import base64

client = genai.Client()  # reads GEMINI_API_KEY from env

input_parts = [{"type": "text", "text": prompt}]
for ref_path in reference_images:
    with open(ref_path, "rb") as f:
        input_parts.append({
            "type": "image",
            "data": base64.b64encode(f.read()).decode("utf-8"),
            "mime_type": "image/png",
        })

interaction = client.interactions.create(
    model="gemini-4-hydrogen",
    input=input_parts,
    generation_config={
        "thinking_level": "medium",  # "low" | "medium" (fast UI prototyping) | "high" (default) | "xhigh"
    },
)
```

### Long decode (>64K tokens, up to 1M tokens via `background=True`)
```python
import time
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-4-hydrogen",
    input=prompt,
    background=True,
    generation_config={
        "max_output_tokens": 131072,  # up to 1,048,576 minus input tokens
        "thinking_level": "high",
    },
)

while interaction.status in ("in_progress", "queued"):
    time.sleep(5)
    interaction = client.interactions.get(id=interaction.id)

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

- **Valid `thinking_level` values are `"low"`, `"medium"`, `"high"` (default), and `"xhigh"` only.** Passing `"minimal"` or `thinking_budget` raises a validation error on `gemini-4-hydrogen`. Use `"medium"` for fast interactive UI/SVG prototyping, `"high"` for default multi-step work, and `"xhigh"` only when `"high"` falls short.
- **Do not pass sampling parameters (`temperature`, `top_p`, `top_k`).** They are deprecated on Gemini 4 models.
- **Drop-in upgrade for Gemini 3.x Flash:** `gemini-4-hydrogen` replaces `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, and `gemini-2.5-flash` with over 5x fewer fabricated claims and a unified 1M context window.
- **Multi-model orchestration:** Pair `gemini-4-argon` or `gemini-4-neon` for heavy 3D/shader architecture with `gemini-4-hydrogen` for fast parallel asset/copy/SVG generation at $1.50 / $7.50 per 1M tokens.
