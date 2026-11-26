# Studio Prompt Architecture, Route Capabilities & Offline Validation

Nano Banana 2 Lite, Nano Banana 2.1, Nano Banana Pro, and Gemini Omni 1.2 Flash are multimodal reasoning models—not legacy diffusion keyword matchers. They interpret **intent, optical physics, lighting geometry, surface materiality, and spatial hierarchy**, rewarding coherent creative direction over comma-separated tag lists.

---

## 1. Core Prompting Principles

1. **Brief like a creative director, never with tag soup** — Write complete, grammatical sentences describing the scene rather than disconnected buzzwords.
   - ❌ **Weak (Tag soup):** `"espresso machine, dark cafe, morning, 4k, realistic, cinematic, bokeh, octane"`
   - ✅ **Strong (Natural-language brief):** `"An architectural medium-format studio photograph of a monolithic dark volcanic basalt espresso bar inside a converted 1920s concrete tram depot at dawn, lit by warm directional side-light grazing a brushed brass steam wand with shallow depth of field and calm slate shadows."`
2. **Anchor tactile materiality** — Replace generic nouns (`"a jacket"`, `"a table"`, `"a cup"`, `"a panel"`) with concrete materials and surface finishes (`"sculpted brushed-titanium shell"`, `"unbleached raw linen"`, `"matte black stoneware"`, `"board-formed concrete"`, `"oiled white oak"`).
3. **Declare surface purpose & audience context** — State *where* the output will ship (`"composed as a full-bleed 16:9 website hero plate for an architectural software product"`, `"framed as a 1:1 editorial vinyl sleeve"`). Purpose context steers focal breathing room, hierarchy, and commercial finish.
4. **Modify statefully via `previous_interaction_id` instead of re-rolling** — When a generation's composition is right and only lighting, weather, text, or material needs to change, send a conversational edit referencing `previous_interaction_id` (`"Shift the lighting from dawn to rainy nocturnal neon while keeping the camera angle and bar geometry identical"`). The model updates reflections, cast shadows, and scene physics automatically.

---

## 2. Adaptive Vision Discovery (2–3 Questions Max on Vague Briefs)

When a user's prompt omits critical visual decisions (whether for direct paid generation or zero-cost `/generate prompt` / `/ui prompt` crafting), check these **9 Vision Dimensions**:

| # | Dimension | What it governs | High-craft examples |
|---|---|---|---|
| 1 | **Focal Subject** | Hero object, character, or artifact | `"Precision milled silver audio interface"`, `"Hand-scored sourdough boule"` |
| 2 | **Environment / Ground** | Physical world or seamless backdrop | `"Seamless #0c1624 matte studio ground"`, `"Sun-drenched limestone courtyard"` |
| 3 | **Atmosphere / Mood** | Emotional tone | `"Quiet Swiss precision"`, `"Dramatic nocturnal chiaroscuro"` |
| 4 | **Medium & Lens** | Photographic or illustrative language | `"85mm f/2.0 medium-format film with fine grain"`, `"Botanical copperplate engraving"` |
| 5 | **Framing & Safe Zone** | Camera angle + UI text overlay clearance | `"90° overhead flat-lay"`, `"Subject right 60%, uninterrupted dark shadow bottom-left 40%"` |
| 6 | **Lighting Geometry** | Key/rim direction, color temp, shadow edge | `"Soft north window light from left"`, `"Warm 3200K tungsten rim + emerald tube fill"` |
| 7 | **Surface Purpose** | Final placement context | `"16:9 marketing hero"`, `"YouTube technical cover"`, `"Dashboard empty-state icon"` |
| 8 | **Quoted Typography** | Exact rendered `"TEXT"` + font style | `Render "SIGNAL ZERO" at top in bold condensed brushed-chrome sans-serif` |
| 9 | **Size & Aspect Ratio** | Model-supported pixel tier & ratio | `"1K"` (Lite), `"2K"` / `"4K"` (2.1 / Pro); `"16:9"`, `"3:4"`, `"1:1"`, `"21:9"`, `"4:1"` |

> **Discovery Rule:** Infer everything already answered by `DESIGN.md`, `style.md`, or workspace context. Never ask all 9 questions at once—ask **at most 2–3 high-leverage questions** in one concise turn, or state your chosen defaults in a single line when the brief implies them.

---

## 3. Prompt Assembly & Pre-Call Rationale Block

Assemble prompts in natural prose (prepending `generations/refs/<set>/style.md` verbatim when using a brand reference set):

```text
[Medium & optical lens] of [specific subject with tactile materiality] in [environment/ground],
[pose, action, or spatial arrangement], [lighting geometry & shadow falloff], [color palette & mood],
[camera framing & negative-space safe zone if HTML text will overlay].
[Exact double-quoted "TEXT" and typographic treatment, if requested.] [Surface purpose context.]
```

### Required Output Block (Zero-Cost `/generate prompt` Mode & Paid Approval Gate)

Whenever running zero-cost prompt mode (`/generate prompt`, `/ui prompt`) **or** presenting a paid cost quote for approval, display the exact prompt alongside concise rationale bullets:

```text
PROMPT:
─────────────────────────────────────────────────────────────
[Exact assembled natural-language prompt]
─────────────────────────────────────────────────────────────

WHY THESE CHOICES:
- Model & Route: [e.g., gemini-nano-banana-2.1 at 2K (16:9) (~$0.05) — supports 2K material sharpness and up to 14 input image parts]
- Framing & Safe Zone: [e.g., Focal subject in right 60% with calm #0c1624 shadow in lower-left 40% for >= 4.5:1 UI headline contrast]
- Materiality & Light: [e.g., Grazing warm dawn sidelight across porous basalt and brushed brass to avoid flat synthetic shading]
```

In zero-cost prompt mode (`$0.00` API spend), invite the user to refine any dimension (lighting, lens, palette, framing) or approve immediate API execution.

---

## 4. Built-In Multimodal Capabilities & API Route Matrix

### Crucial Interactions API Schema Rule (`input` vs. Sidecar `reference_images`)
- **In API calls (`client.interactions.create`):** There is **no** `reference_images` request parameter. Reference images, starting video frames, layout wireframes, and 2D sketches are passed strictly as `{"type": "image", "data": "<base64>", "mime_type": "<detected_mime>"}` dictionaries inside the top-level **`input=[...]`** list!
- **In local sidecar `.json` logs:** `reference_images` (an array of local file paths) is strictly a **local audit-log field** written beside the output file after generation succeeds.
- **Route-Specific `input` & `response_format` Matrix:** Do not assume every route accepts the same `response_format` or image count:

| Model ID | Output Modality (`response_format.type`) | Supported `image_size` / `resolution` | Supported `aspect_ratio` | Max Image Parts in `input` | Valid `thinking_level` |
|---|---|---|---|---|---|
| `gemini-3.1-flash-lite-image` | `"image"` | `"1K"` only | Standard (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `4:5`, `5:4`, `21:9`) | `0–2` recommended for fast drafting | `"minimal"` (default), `"high"` |
| `gemini-nano-banana-2.1` | `"image"` | `"1K"`, `"2K"`, `"4K"` | Standard + Panoramic (`1:4`, `4:1`, `1:8`, `8:1`) | Up to `14` (`<=4` chars + `<=10` objects) | `"minimal"`, `"medium"` (default), `"high"` |
| `gemini-3-pro-image` | `"image"` | `"1K"`, `"2K"`, `"4K"` (`1K` & `2K` cost same 1,120 tokens) | Standard (`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`) — no `1:4`/`8:1` | Up to `14` (`<=5` chars + `<=6` objects + `<=3` style refs) | Model-managed (omit `thinking_level`) |
| `gemini-omni-1.2-flash` | `"video"` | `"360p"`, `"720p"`, `"1080p"`, `"4k"` (`duration`: `"3s"`–`"15s"`) | `"16:9"`, `"9:16"` | `1` start frame, `2` start+end keyframes (`3s–10s`), or up to `6` R2V/edit/extend image refs | Model-managed (omit `thinking_level`) |
| `gemini-4-hydrogen` / `gemini-4-neon` | Text / Code (`"text"` or omitted) | Text/code (`SVG`, `HTML`, `Three.js`, `GLSL`, `.md`) | N/A (text/code output) | Multimodal `input` inspection (images, video, PDF) | `"low"`, `"medium"`, `"high"` (default), `"xhigh"` |
| `gemini-4-argon` / `gemini-4-carbon` | Text / Code (`"text"` or omitted) | Text/code (`SVG`, `HTML`, `Three.js`, `GLSL`, `.md`) | N/A (text/code output) | Multimodal `input` inspection (images, video, PDF) | `"low"`, `"medium"` (default), `"high"` |

### Specialized Workflows Enabled Across Image Routes (`2.1` & `Pro`)

1. **Exact In-Image Typography & One-Turn Visual Localization:**
   - Wrap exact rendered copy in `"double quotes"` and specify lettering craft (`"bold geometric Swiss grotesk"`, `"embossed gold serif"`, `"warm glass neon tubing"`).
   - To localize an existing banner or poster without rebuilding it, pass the source image in `input` (or chain via `previous_interaction_id`) and prompt: *"Translate all visible headline and caption text in this image into Spanish while keeping the exact font geometry, kerning, material reflections, layout, and scene lighting."*
2. **Dimensional Translation (`2D <-> 3D`):**
   - Pass a hand-drawn industrial sketch, 2D architectural floor plan, or flat vector elevation as an `{"type": "image", ...}` part in `input` and specify real-world camera focal length, surface materials, and lighting to synthesize a photorealistic 3D studio or interior visualization.
3. **Structural Control via Wireframes & Layout Sketches:**
   - Pass a rough wireframe, box grid, or composition sketch as an `{"type": "image", ...}` part in `input` with instructions such as: *"Use the spatial arrangement of the uploaded layout diagram strictly to position the hero subject on the right and preserve the lower-left negative-space zone, rendering the final scene as an editorial studio photograph with zero visible wireframe lines."*

---

## 5. Prompt Anti-Patterns Auto-Rewrite Checklist

Automatically rewrite these five failure modes before quoting or calling any model:

| Anti-Pattern | Example Input | Required Rewrite |
|---|---|---|
| **Tag Soup** | `"watch, luxury, dark, 8k, photorealistic, studio"` | Convert into 2–3 prose sentences specifying watch case metal, dial texture, lens, surface, and key/rim light. |
| **Vague Nouns** | `"a developer at a desk"`, `"a modern building"` | Specify architectural materials, era, lighting temperature, and concrete objects from the project's domain. |
| **Unlit Scene** | Describes objects only with zero lighting cues | Add explicit light direction, softness, color temperature, and shadow behavior. |
| **Context-Free Asset** | Omits how/where the image will be cropped or used | Add target surface framing (`"composed for a 16:9 landing page hero with calm left-hand copy clearance"`). |
| **Contradictory Directives** | `"Flat 2D minimalist vector icon with 85mm shallow bokeh"` | Commit to one coherent optical or illustrative medium. |

---

## 6. No-Cost Offline Request-Shape, MIME & Timeout Validator

Run this **$0.00 offline validator** before every paid approval gate (and use `parse_verified_file_name` + bounded `monotonic()` deadlines for large video/long-decode polling). Test fixtures live in [`references/fixtures/offline-request-fixtures.json`](fixtures/offline-request-fixtures.json) and [`references/fixtures/offline-timeout-uri-fixtures.json`](fixtures/offline-timeout-uri-fixtures.json).

```python
from __future__ import annotations
import mimetypes
import re
from pathlib import Path
from urllib.parse import urlparse

SUPPORTED_IMAGE_MIMES = {"image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"}
STANDARD_IMAGE_RATIOS = {"1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9"}
PANORAMIC_2_1_RATIOS = STANDARD_IMAGE_RATIOS | {"1:4", "4:1", "1:8", "8:1"}

def detect_image_mime(path: str | Path) -> str:
    """Inspect magic bytes first (falling back to extension) so JPEGs/WEBPs are never mislabeled image/png."""
    p = Path(path)
    if not p.is_file() or p.stat().st_size == 0:
        raise ValueError(f"Reference image missing or empty: {p}")
    header = p.read_bytes()[:12]
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    if header[4:8] == b"ftyp":
        brand = header[8:12]
        if brand in {b"heic", b"heix", b"mif1"}:
            return "image/heic"
        if brand in {b"heif", b"msf1"}:
            return "image/heif"
    guessed, _ = mimetypes.guess_type(str(p))
    if guessed in SUPPORTED_IMAGE_MIMES:
        return guessed
    raise ValueError(f"Unsupported image MIME ({guessed}) for {p}")

def validate_interaction_request(payload: dict) -> None:
    """Offline $0 request-shape check aligned with the pinned Interactions API schema."""
    if not isinstance(payload, dict):
        raise ValueError("Request payload must be a dict.")
    if "reference_images" in payload:
        raise ValueError("Invalid top-level 'reference_images' key: pass {'type': 'image', 'data': ..., 'mime_type': ...} blocks inside 'input'.")

    model = payload.get("model", "")
    inp = payload.get("input")
    if not inp or not isinstance(inp, (str, list)):
        raise ValueError("'input' must be a non-empty string or list of content parts.")

    image_parts = []
    if isinstance(inp, list):
        for idx, part in enumerate(inp):
            if not isinstance(part, dict) or "type" not in part:
                raise ValueError(f"input[{idx}] must be a dict with a 'type' field.")
            if part["type"] == "image":
                if part.get("mime_type") not in SUPPORTED_IMAGE_MIMES:
                    raise ValueError(f"input[{idx}] has unsupported or missing mime_type: {part.get('mime_type')}")
                if not part.get("data") and not part.get("uri"):
                    raise ValueError(f"input[{idx}] image part requires 'data' (base64) or 'uri'.")
                image_parts.append(part)

    rf = payload.get("response_format") or {}
    gc = payload.get("generation_config") or {}
    for deprecated in ("temperature", "top_p", "top_k", "thinking_budget"):
        if deprecated in gc:
            raise ValueError(f"Unsupported/deprecated generation_config field: '{deprecated}'.")

    if model == "gemini-3.1-flash-lite-image":
        if rf.get("type") != "image" or rf.get("image_size", "1K") != "1K":
            raise ValueError("gemini-3.1-flash-lite-image requires response_format.type='image' and image_size='1K' only.")
        if rf.get("aspect_ratio", "1:1") not in STANDARD_IMAGE_RATIOS:
            raise ValueError(f"Unsupported aspect_ratio on Lite: {rf.get('aspect_ratio')}")
        if len(image_parts) > 2:
            raise ValueError("Keep Nano Banana 2 Lite drafting inputs to 0-2 reference images.")
        if gc.get("thinking_level", "minimal") not in {"minimal", "high"}:
            raise ValueError("Lite supports thinking_level 'minimal' or 'high' only.")

    elif model == "gemini-nano-banana-2.1":
        if rf.get("type") != "image" or rf.get("image_size", "1K") not in {"1K", "2K", "4K"}:
            raise ValueError("gemini-nano-banana-2.1 requires response_format.type='image' and image_size in {'1K','2K','4K'}.")
        if rf.get("aspect_ratio", "1:1") not in PANORAMIC_2_1_RATIOS:
            raise ValueError(f"Unsupported aspect_ratio on Nano Banana 2.1: {rf.get('aspect_ratio')}")
        if len(image_parts) > 14:
            raise ValueError("gemini-nano-banana-2.1 accepts at most 14 image parts in input.")
        if gc.get("thinking_level", "medium") not in {"minimal", "medium", "high"}:
            raise ValueError("Nano Banana 2.1 supports thinking_level in {'minimal','medium','high'}.")

    elif model == "gemini-3-pro-image":
        if rf.get("type") != "image" or rf.get("image_size", "2K") not in {"1K", "2K", "4K"}:
            raise ValueError("gemini-3-pro-image requires response_format.type='image' and image_size in {'1K','2K','4K'}.")
        if rf.get("aspect_ratio", "1:1") not in STANDARD_IMAGE_RATIOS:
            raise ValueError(f"Unsupported aspect_ratio on Nano Banana Pro (panoramic 1:4/8:1 requires 2.1): {rf.get('aspect_ratio')}")
        if len(image_parts) > 14:
            raise ValueError("gemini-3-pro-image accepts at most 14 image parts in input.")

    elif model == "gemini-omni-1.2-flash":
        if rf and rf.get("type", "video") != "video":
            raise ValueError("gemini-omni-1.2-flash outputs video only.")
        if rf.get("resolution", "720p") not in {"360p", "720p", "1080p", "4k"}:
            raise ValueError(f"Unsupported Omni resolution: {rf.get('resolution')}")
        if rf.get("aspect_ratio", "16:9") not in {"16:9", "9:16"}:
            raise ValueError(f"Unsupported Omni aspect_ratio: {rf.get('aspect_ratio')}")
        if len(image_parts) > 6:
            raise ValueError("gemini-omni-1.2-flash accepts at most 6 image parts in input.")

    elif model in {"gemini-4-hydrogen", "gemini-4-neon", "gemini-4-argon", "gemini-4-carbon"}:
        if rf.get("type") in {"image", "video"}:
            raise ValueError(f"{model} outputs text/code only, not raster image or video.")
        allowed_thinking = {"low", "medium", "high", "xhigh"} if model in {"gemini-4-hydrogen", "gemini-4-neon"} else {"low", "medium", "high"}
        if gc.get("thinking_level", "medium") not in allowed_thinking:
            raise ValueError(f"Invalid thinking_level '{gc.get('thinking_level')}' for {model} (allowed: {sorted(allowed_thinking)}).")
    else:
        raise ValueError(f"Unrecognized model route: {model}")

def parse_verified_file_name(uri: str) -> str:
    """Validate that a returned delivery URI belongs strictly to Google's Files API and extract 'files/<id>'."""
    parsed = urlparse(uri or "")
    if parsed.scheme != "https" or parsed.hostname != "generativelanguage.googleapis.com" or parsed.query or parsed.fragment:
        raise ValueError(f"Untrusted or non-canonical delivery URI: {uri}")
    match = re.fullmatch(r"/(?:v1(?:beta)?/)?(files/[a-z0-9-]+)", parsed.path)
    if not match:
        raise ValueError(f"Invalid Files API resource path in URI: {uri}")
    return match.group(1)
```
