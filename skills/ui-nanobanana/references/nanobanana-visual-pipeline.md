# The OP High-Resolution Nano Banana Visual Pipeline for UI & Frontend

Most AI-generated frontends fail visually for one of two reasons:
1. They avoid imagery altogether and rely on CSS cards, badges, and gradients (**the thin/empty trap**).
2. They pull random stock URLs or generate unanchored AI images that clash in lighting, color temperature, and perspective (**the scrapbook trap**).

By combining **Nano Banana 2.1** (`gemini-nano-banana-2.1`), **Nano Banana Pro** (`gemini-3-pro-image`), **Gemini Omni 1.2 Flash** (`gemini-omni-1.2-flash`), and the **Gemini 4 suite** (**Gemini 4 Carbon** `gemini-4-carbon`, **Gemini 4 Argon** `gemini-4-argon`, **Gemini 4 Neon** `gemini-4-neon`, and **Gemini 4 Hydrogen** `gemini-4-hydrogen`), you have an **on-demand 2K/4K studio photography, motion, and shader department** wired directly into your frontend tokens.

---

## 1. Upfront Batch Media Plan & Single Approval Gate

When building a page ( typically 4 to 8 sections) or running `/ui visual-plan`, **do not interrupt the user 8 separate times**. Instead, design the entire visual suite upfront in Step 5, present one consolidated **Batch Media Plan Table**, and wait for a single explicit go-ahead before running the calls sequentially.

### Template to Present to the User

```markdown
### Proposed High-Resolution UI Media Plan

All image slots prepend `generations/refs/brand/style.md` verbatim and lock onto **Slot 1 (Hero)** as a visual reference so lighting, lens character, and color grading match across the entire scroll.

| Slot | UI Section & Role | Model ID | Size & Ratio | Safe-Zone / Composition Brief | Est. Cost |
|---|---|---|---|---|---|
| **1 (Anchor)** | Hero Full-Bleed Canvas (`public/images/hero_hearth.png`) | `gemini-3-pro-image` | `4K` (`16:9`) | Basalt stone hearth at 05:00 dawn; subject in right 60%, calm `#0c1624` shadow safe-zone in bottom-left 40% for `h1` overlay | ~$0.240 |
| **2** | Section 2: Fermentation Specimen (`public/images/ferment_macro.png`) | `gemini-nano-banana-2.1` | `2K` (`3:4`) | Macro cross-section of sourdough crumb on unbleached linen, matching Slot 1 side-lighting | ~$0.050 |
| **3–5** | Section 3 "One Live Thing" Crust States (`light`, `medium`, `charred`) | `gemini-nano-banana-2.1` | `2K` (`1:1` × 3) | State-locked via `previous_interaction_id`: identical overhead camera, 3 bake stages | ~$0.150 |
| **6** | Section 4 Panoramic Chapter Break (`public/images/street_panoramic.png`) | `gemini-nano-banana-2.1` | `2K` (`4:1`) | Wide architectural elevation of the 7 arched timber doors on Rue des Chartreux at dusk | ~$0.050 |
| **7 (Motion)** | Hero Ambient Muted Loop (`public/images/hero_hearth_loop.mp4`) | `gemini-omni-1.1-flash` | `720p` (`16:9`, 5s) | `<FIRST_FRAME>` locked to Slot 1; subtle rising steam and warm ember flicker, unbroken shot, no audio | ~$0.500 |
| **Total** | **6 High-Res Images (1× 4K, 5× 2K) + 1× 5s Video Loop** | | | **Saved to `public/images/` + `.json` sidecars** | **~$0.990** |

Shall I proceed with generating this batch?
```

> **Rule:** Wait for the user's explicit approval on the batch. Once approved, execute Slots 1..N **sequentially one at a time** (never in parallel), verifying each file on disk and writing its `.json` sidecar before moving to the next slot. If any slot needs a paid re-roll outside the approved batch, quote and confirm first.

---

## 2. Which Model to Route for Each UI Slot

| UI Visual Need | Best Model | Resolution & Ratio Strategy | Why |
|---|---|---|---|
| **Flagship Hero Canvas (Full-bleed desktop)** | Nano Banana Pro (`gemini-3-pro-image`) or Nano Banana 2.1 (`gemini-nano-banana-2.1`) | `4K` (`16:9` or `21:9`) | Crisp on 5K/Retina displays at `100vw`; Pro gives maximum compositional reasoning and up to 3 dedicated style-ref slots. |
| **Standard Editorial Section Plates & Diptychs** | Nano Banana 2.1 (`gemini-nano-banana-2.1`) | `2K` (`3:4`, `4:5`, `4:3`, `16:9`) | ~$0.050/image at `2K`; fast, sharp photorealism and material texture. |
| **Panoramic Chapter Dividers & Ribbon Bands** | Nano Banana 2.1 (`gemini-nano-banana-2.1`) | `2K` or `4K` (`21:9`, `4:1`, `8:1`, `1:4`) | Native ultra-wide/tall aspect ratios with zero tiling artifacts. |
| **Interactive State Switcher ("One Live Thing")** | Nano Banana 2.1 or Pro with `previous_interaction_id` | `2K` (`1:1`, `4:3`, or `16:9`) | Server-side stateful chaining changes *only* the requested variable (material, time of day, finish) while holding camera & geometry fixed. |
| **Multi-Ref Brand / Product / Character Fusion** | Nano Banana Pro (`gemini-3-pro-image`) | `2K` (same $0.134 cost as `1K`!) or `4K` | Fuses up to 14 refs (5 characters + 6 objects + 3 style refs) with studio accuracy. |
| **Rapid Layout / Crop Exploration** | Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`) | `1K` | Sub-2s drafts (~$0.034). Pass the winning Lite image as a reference into 2.1/Pro to upscale to `2K`/`4K`. |
| **Ambient Hero / Section Video Loop** | Gemini Omni 1.2 Flash (`gemini-omni-1.2-flash`) | `720p` or `1080p` (`16:9` or `9:16`, `3s`–`15s`) | Pass the 2K/4K still as the natural-language starting frame so `<video poster="hero.png">` transitions with zero visual jump. |
| **Fast UI Prototyping, SVGs & Ref Analysis** | Gemini 4 Hydrogen (`gemini-4-hydrogen`) | Code output (`.svg`, `.html`, `.md`) | High-speed daily driver ($1.50/$7.50 per 1M) with `low`/`medium`/`high`/`xhigh` thinking for fast vector and copy work. |
| **Fast Frontier Execution, Complex UI & 3D** | Gemini 4 Neon (`gemini-4-neon`) | Code output (`.svg`, `.html`, `.glsl`, `.ts`) | Frontier intelligence ($3/$15 per 1M, `xhigh` thinking) with fast end-to-end completion on complex interactive components. |
| **Efficient Frontier 3D/GLSL Shaders & Storyboard** | Gemini 4 Argon (`gemini-4-argon`) | Code output (`.svg`, `.html`, `.glsl`, `.ts`) | Exact mathematical geometry, interactive WebGL/Canvas, and architectural diagrams using CSS variables. |
| **Maximum-Depth Reasoning, 3D & GLSL Shaders** | Gemini 4 Carbon (`gemini-4-carbon`) | Code output (`.svg`, `.html`, `.glsl`, `.ts`) | Deepest hypothesis exploration and edge-case verification ($2/$10 per 1M intro) for complex procedural Three.js/shader scenes. |

---

## 3. Photographer's Brief Prompt Formula (With UI Safe Zones)

Never prompt an image model with vague UI words like *"a modern hero image for a SaaS website"*. That triggers generic 3D isometric slop.

Instead, every prompt is assembled from **6 deterministic blocks**:

```text
[1. VERBATIM style.md ANCHOR]
+ [2. SUBJECT & MATERIALITY from the Subject Inventory]
+ [3. CAMERA, LENS & PERSPECTIVE (e.g., 50mm f/2.8, eye-level / top-down 90° flatlay / architectural elevation)]
+ [4. LIGHTING DIRECTION & COLOR GRADE (matched to DESIGN.md --bg-ground & --accent-primary)]
+ [5. UI NEGATIVE-SPACE SAFE ZONE (engineered for the section's Composition Anchor)]
+ [6. HARD EXCLUSIONS ("No text, no typography, no watermarks, no UI frames, no buttons, no human hands, no split-screen collages.")]
```

### Engineering the Negative-Space Safe Zone (Block 5)
When HTML typography will sit on top of an image, **tell Nano Banana where the text will live** so the model keeps that quadrant calm, low-contrast, and unobstructed:

- **For `Bottom-Left Overlay` Hero:**
  > *"Composition: position the primary subject in the upper-right and center-right two-thirds of the frame. Keep the lower-left 40% in calm, uninterrupted deep slate shadow (`#0c1624`) with smooth out-of-focus falloff and zero bright highlights, creating a clean negative-space safe zone for white display typography."*
- **For `Centered-Low` Hero:**
  > *"Composition: frame the architectural subject in the upper 60% of the canvas; allow the bottom 35% to fall into a clean, dark tonal gradient shadow (`#0c1624`) suitable for centered headline overlay."*
- **For `Isolated Object on Ground Token` (Seamless Blend into CSS Background):**
  > *"Background: solid, uniform flat matte `#0c1624` studio backdrop extending to all four edges with zero vignette at the borders, so the image blends seamlessly into a `#0c1624` web page background."*

---

## 4. Hero-First Series Lock & Stateful Chaining (Python Reference)

Run this pattern sequentially so every asset on the page belongs to one visual world:

```python
import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from google import genai

client = genai.Client()  # Reads GEMINI_API_KEY from environment

# 1. Load verbatim style anchor from DESIGN.md -> style.md
import mimetypes
style_path = Path("generations/refs/brand/style.md")
style_anchor = style_path.read_text(encoding="utf-8").strip() + "\n\n" if style_path.exists() else ""

output_dir = Path("public/images")
output_dir.mkdir(parents=True, exist_ok=True)

def detect_image_mime(p: Path) -> str:
    header = p.read_bytes()[:12]
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    guessed, _ = mimetypes.guess_type(str(p))
    if guessed in {"image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"}:
        return guessed
    raise ValueError(f"Unsupported image MIME ({guessed}) for {p}")

def save_and_log(interaction, out_path: Path, model_id: str, prompt: str, logged_ref_paths: list[str], params: dict, cost: str):
    if interaction.output_image is None or interaction.output_image.data is None:
        raise RuntimeError(interaction.output_text or "Model returned no image data.")
    out_path.write_bytes(base64.b64decode(interaction.output_image.data))
    assert out_path.exists() and out_path.stat().st_size > 0, f"Failed to write {out_path}"

    # Note: 'reference_images' is strictly a local sidecar audit field; API calls pass image blocks inside 'input'.
    sidecar = {
        "model": model_id,
        "prompt": prompt,
        "reference_images": logged_ref_paths,
        "reference_set": "brand",
        "response_id": interaction.id,
        "params": params,
        "cost": cost,
        "created": datetime.now(timezone.utc).isoformat(),
        "approved_by_user": True,
    }
    out_path.with_suffix(".json").write_text(json.dumps(sidecar, indent=2), encoding="utf-8")

# --- SLOT 1: Generate 4K Hero Plate First (The Series Anchor) ---
hero_prompt = (
    style_anchor
    + "Architectural studio photograph of a monolithic basalt stone espresso bar inside a converted "
    + "1920s concrete tram depot at dawn. Warm directional key light grazing the porous dark volcanic stone "
    + "and brushed brass steam wand on the right two-thirds. Keep the bottom-left 40% in calm, uninterrupted "
    + "deep slate shadow (#0c1624) as a negative-space safe zone, composed for a 16:9 website hero. No text, no watermarks, no human hands."
)
hero_params = {"type": "image", "image_size": "4K", "aspect_ratio": "16:9"}
hero_interaction = client.interactions.create(
    model="gemini-3-pro-image",
    input=[{"type": "text", "text": hero_prompt}],
    response_format=hero_params,
)
hero_path = output_dir / "hero_basalt_bar.png"
save_and_log(hero_interaction, hero_path, "gemini-3-pro-image", hero_prompt, [], hero_params, "$0.24")

# --- SLOT 2: Section Plate Locked to Hero's Exact Lighting & Palette via input Image Part ---
hero_b64 = base64.b64encode(hero_path.read_bytes()).decode("utf-8")
hero_mime = detect_image_mime(hero_path)
sec2_prompt = (
    style_anchor
    + "Match the exact color grading, film grain, and warm dawn side-lighting of the first image. "
    + "Macro 85mm studio photograph of freshly roasted whole coffee beans resting on a rough dark basalt slab, "
    + "shallow depth of field, rich natural oils catching the same warm sidelight. No text, no hands."
)
sec2_params = {"type": "image", "image_size": "2K", "aspect_ratio": "3:4"}
sec2_interaction = client.interactions.create(
    model="gemini-nano-banana-2.1",
    input=[
        {"type": "image", "data": hero_b64, "mime_type": hero_mime},
        {"type": "text", "text": sec2_prompt},
    ],
    response_format=sec2_params,
)
sec2_path = output_dir / "section_roast_macro.png"
save_and_log(sec2_interaction, sec2_path, "gemini-nano-banana-2.1", sec2_prompt, [str(hero_path)], sec2_params, "$0.05")
```

---

## 5. "One Live Thing" State-Locked Variations via `previous_interaction_id`

One of the highest-converting patterns on award-winning product sites is an interactive switcher where clicking a material, roast level, acoustic mode, or lighting state swaps a 2K studio photograph **without the camera or object jumping by a single pixel**.

Use `previous_interaction_id` on Nano Banana 2.1 (`gemini-nano-banana-2.1`) or Pro (`gemini-3-pro-image`):

```python
# State A (Base state)
state_a = client.interactions.create(
    model="gemini-nano-banana-2.1",
    input=style_anchor + "Three-quarter studio product photograph of a precision milled anodized silver aluminum audio interface on a flat #0c1624 surface. No text, no hands.",
    response_format={"type": "image", "image_size": "2K", "aspect_ratio": "4:3"},
)
save_and_log(state_a, output_dir / "device_state_silver.png", "gemini-nano-banana-2.1", "...", [], {"image_size": "2K", "aspect_ratio": "4:3"}, "$0.05")

# State B (Chained onto State A — identical geometry, new finish)
state_b = client.interactions.create(
    model="gemini-nano-banana-2.1",
    previous_interaction_id=state_a.id,
    input="Keep the camera angle, lighting, shadows, and object geometry 100% identical. Change only the chassis finish to matte stealth black anodized aluminum with chlorophyll green (#38d399) LED meter indicators.",
    response_format={"type": "image", "image_size": "2K", "aspect_ratio": "4:3"},
)
save_and_log(state_b, output_dir / "device_state_stealth.png", "gemini-nano-banana-2.1", "...", [], {"image_size": "2K", "aspect_ratio": "4:3"}, "$0.05")
```

When wired into an Angular Signal (`activeFinish = signal<'silver' | 'stealth'>('silver')`) or React state with preloaded `<img>` layers cross-fading over `200ms`, the interface feels like a real-time 3D configurator at a fraction of the bundle weight.

---

## 6. Zero-Jump-Cut Hero Video Loops with Gemini Omni 1.2 Flash

When a `Persuade` or `Experience` page calls for living footage, pass the generated 2K/4K Hero plate (`hero_b64`) into `gemini-omni-1.2-flash` using natural-language starting-frame binding:

```python
video_prompt = (
    "Use this image as the starting frame. In a single unbroken scene, no scene cuts. "
    "Subtle, atmospheric camera micro-drift forward; gentle wisps of warm steam rise naturally "
    "from the brass espresso group head while dust motes catch the dawn sidelight. "
    "Keep all architectural lines rock-steady. No dialogue, no music."
)
video_interaction = client.interactions.create(
    model="gemini-omni-1.2-flash",
    input=[
        {"type": "image", "data": hero_b64, "mime_type": hero_mime},
        {"type": "text", "text": video_prompt},
    ],
    response_format={"type": "video", "aspect_ratio": "16:9", "resolution": "720p", "duration": "5s"},
)
```

Wire it into the hero with the exact 4K still as `poster`:
```html
<video
  class="hero-media"
  src="/images/hero_basalt_loop.mp4"
  poster="/images/hero_basalt_bar.png"
  autoplay
  loop
  muted
  playsinline
  width="1920"
  height="1080"
></video>
```
Because Frame 0 of the `.mp4` was generated directly from `hero_basalt_bar.png`, there is **zero flash or layout shift** when the video starts playing, and users with `prefers-reduced-motion: reduce` simply see the 4K poster plate.

---

## 7. Production Frontend Image Rules

1. **Zero CLS (Cumulative Layout Shift):** Every `<img>` and `<video>` must declare explicit `width` and `height` attributes matching its generated aspect ratio (`16:9` $\rightarrow$ `width="1920" height="1080"`, `3:4` $\rightarrow$ `width="1536" height="2048"`, `4:1` $\rightarrow$ `width="2048" height="512"`).
2. **Priority & Lazy Loading:**
   - First-viewport Hero image: `fetchpriority="high" loading="eager" decoding="async"` (or Angular `ngSrc="..." priority`).
   - All below-the-fold images: `loading="lazy" decoding="async"`.
3. **Square Corners by Default:** 94% of Awwwards SOTD winners use `border-radius: 0` on photography plates. Never slap `border-radius: 16px` + a grey drop shadow on editorial photography.
4. **Legibility Over Imagery:** Never place raw text over an un-scrimmed high-contrast photo. Combine Nano Banana's engineered **Negative-Space Safe Zone** with a subtle CSS tonal scrim (`background: var(--scrim-hero)`) and verify contrast is $\ge 4.5:1$ for body copy and $\ge 3.0:1$ for display type.

