# Gemini 4 Neon

Google's high-velocity Gemini 4 frontier intelligence model (`gemini-4-neon`), sitting between Gemini 4 Hydrogen (`gemini-4-hydrogen`) and Gemini 4 Argon / Carbon (`gemini-4-argon` / `gemini-4-carbon`). Built for frontier-level quality with fast end-to-end task completion across complex software engineering, UI/UX architecture, interactive code visuals (SVG, Three.js, Canvas, GLSL shaders), and dense multimodal storyboarding. Features a unified 1,048,576-token context window, long decode up to 1M tokens, and four tunable thinking levels (`low`, `medium`, `high` default, `xhigh`).

In `/generate` and `/ui`, reach for `gemini-4-neon` when you want frontier-level creative/architectural reasoning and multi-shot storyboard or complex interactive 3D/SVG generation with faster end-to-end turnaround than deep reasoning passes.

| Field | Value |
|---|---|
| Model ID | `gemini-4-neon` |
| Provider | Gemini API (Google AI Studio key) |
| API | Interactions API — `client.interactions.create` |
| Method | Sync up to 64K tokens (`65,536` default); async `background=True` for long decode up to 1M tokens |
| Type | Frontier Multimodal Reasoning / Storyboarding / Code Visuals (Text output) |
| API key | `GEMINI_API_KEY` env var |
| Docs | https://ai.google.dev/gemini-api/docs/models/gemini-4-neon |
| Cost | Paid tier only (no free tier): $3.00 / 1M input tokens and $15.00 / 1M output + thinking tokens; implicit caching enabled by default — quote current pricing from https://ai.google.dev/gemini-api/docs/pricing and get approval before every call (see SKILL.md, Rules) |

## Request (Python, `google-genai >= 3.2.0` SDK)

### Interactive Code Visuals (SVG / Three.js / Shaders) or Storyboard Planning (sync)
```python
from google import genai
import base64

client = genai.Client()  # reads GEMINI_API_KEY from env (v1 Interactions API by default)

input_parts = [{"type": "text", "text": prompt}]
for ref_path in reference_images:
    with open(ref_path, "rb") as f:
        input_parts.append({
            "type": "image",
            "data": base64.b64encode(f.read()).decode("utf-8"),
            "mime_type": "image/png",
        })

interaction = client.interactions.create(
    model="gemini-4-neon",
    input=input_parts,
    generation_config={
        "thinking_level": "high",  # "low" | "medium" | "high" (default) | "xhigh" — never "minimal"
    },
)
```

### Long decode (>64K tokens, up to 1M tokens via `background=True`)
When generating exhaustive design systems, multi-scene storyboards, or complex interactive 3D/WebGL applications that exceed 65,536 tokens:
```python
import time
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-4-neon",
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

- **Valid `thinking_level` values are `"low"`, `"medium"`, `"high"` (default), and `"xhigh"` only.** Passing `"minimal"` or a legacy `thinking_budget` raises a validation error on `gemini-4-neon`. Reserve `"xhigh"` for hard multi-step engineering or shader/geometry math where `"high"` falls short.
- **Do not pass sampling parameters (`temperature`, `top_p`, `top_k`).** They are deprecated and rejected/ignored across the Gemini 4 family.
- **`max_output_tokens` covers both thinking and final output** within the shared 1,048,576-token window. Leave it unset (defaults to `65,536`) or set at least `32,768`.
- **Paid tier only:** Every token processed (including thinking tokens) is billed at $3.00 / 1M input and $15.00 / 1M output. Always quote and get explicit user approval before calling `gemini-4-neon`.
