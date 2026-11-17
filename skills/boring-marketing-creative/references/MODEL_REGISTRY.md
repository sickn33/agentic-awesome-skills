# Model Registry: Creative Engine

```
registry_version: 3.4.0
last-verified: 2026-11-13
ttl-days: 60
refresh: run scripts/verify_models.sh  (re-verifies every model ID against the Replicate API and rewrites ./brand/creative-stack.md), then open replicate.com/{owner}/{model} for any model near a sunset: a delisted model can still pass the API check
changes: 2026-11-16: the GPT Image roles moved to GPT Image 2.6 (`openai/gpt-image-2.6-flare` for fast drafts, `openai/gpt-image-2.6-sunburst` for finals and consistent edits); both IDs answered 200, their input schemas were pulled from the API and their prices read from the model pages on 2026-11-16; the older GPT Image IDs left the roster (2.6 takes transparent backgrounds again and adds animated GIF and SVG output). 2026-11-13: verify_models.sh 25 pass / 0 fail after removing Sora 2 and Sora 2 Pro (pages 404 after the 2026-09-24 API sunset, although GET /v1/models still answered 200, so a script pass alone no longer proves a model is live); schemas and prices re-pulled; Seedance 2.0 bills less without video inputs; video-ugc and the hero trio resolve to their post-sunset routes; newer IDs list refreshed
```

**This is the ONLY file in the product that contains model payloads, parameter
surfaces, or prices.** SKILL.md and every mode file route by ROLE ("draft tier",
"production video model", "text-render image model") and resolve the role here at call
time. One sanctioned exception: `references/model-routing.md` names models alongside
roles in its routing tables (judgment needs names), but payloads and prices appearing
anywhere else is a bug; fix it by pointing the other file at this registry.

If today > last-verified + ttl-days, run the refresh BEFORE spending money, and update
`last-verified` after a clean pass. If any call 404s or 422s mid-session, check
`replicate.com/{owner}/{model}/api` for the current schema, fix THIS file, then retry.

**Verification status per model (the `Status` column below):**
- `schema-verified`: the ID returned 200 AND its input schema was pulled from the
  Replicate API on 2026-11-13; the parameter surface documented here matches that schema.
  The Replicate README pages lag the schemas in places (noted per model): the schema is
  what validates your call.
- `sunset`: the provider has announced a shutdown date. Do not start new work on it;
  the role map names the post-sunset route. (None on the roster at 2026-11-13.)

How to call any of these (async create → poll → download within 1 hour, plus error
handling, file naming, and the campaign manifest): see `references/api-workflow.md`.
Payload blocks below show only the request **body**; the model ID goes in the URL.

---

## Machine-readable roster

`scripts/verify_models.sh` parses this block. One model ID per line. Keep it in sync
with the sections below: adding a model means adding it here AND in its section.

```models
google/nano-banana-2
google/nano-banana-pro
openai/gpt-image-2.6-flare
openai/gpt-image-2.6-sunburst
black-forest-labs/flux-2-max
black-forest-labs/flux-2-pro
black-forest-labs/flux-2-flex
bytedance/seedream-4.5
recraft-ai/recraft-v4
recraft-ai/recraft-v4-svg
ideogram-ai/ideogram-v3-turbo
wan-video/wan-2.5-i2v-fast
wan-video/wan-2.5-t2v-fast
wan-video/wan-2.7-i2v
kwaivgi/kling-v3-video
kwaivgi/kling-v3-omni-video
bytedance/seedance-2.0
bytedance/seedance-1-pro
runwayml/gen-4.5
google/veo-3.1
google/veo-3.1-fast
sync/lipsync-2-pro
pixverse/lipsync
bytedance/omni-human
kwaivgi/kling-lip-sync
```

`openai/sora-2` and `openai/sora-2-pro` left the roster on 2026-11-13: OpenAI ended the
Sora 2 API on 2026-09-24 and both replicate.com pages now return 404.

---

## Role map (the routing table)

Modes ask for a role. This table answers with a model. Change a model here and every
mode follows automatically.

### Images

| Role | Model | Status | Cost/image | Use when |
|------|-------|--------|------------|----------|
| **image-default** | `google/nano-banana-2` | schema-verified | $0.067 (1K) · $0.101 (2K) · $0.151 (4K) | Everything, unless a role below fits better. Fusion editing with up to 14 reference images; now outputs 4K itself. |
| **image-premium-4k** | `google/nano-banana-pro` | schema-verified | $0.15 (1K/2K) · $0.30 (4K) · $0.035 if the fallback model runs | Hero stills, print: the fidelity upgrade over NB2's own 4K, not the only 4K path. |
| **image-complex-prompt** | `openai/gpt-image-2.6-sunburst` (drafts: `gpt-image-2.6-flare`) | schema-verified 2026-11-16 | $0.05 low · $0.09 medium · $0.128 high · $0.25 xhigh · $0.50 max, the same on both (set `quality` explicitly: `auto` is the default and bills $0.25); GIF and SVG bill by tokens | Complex multi-element composition, dense instruction-heavy prompts, exact in-image text inside real scenes, native-looking phone photos, animated GIFs. Flare for fast drafts, Sunburst for the final. |
| **image-instruct-edit** | `openai/gpt-image-2.6-sunburst` (drafts: `gpt-image-2.6-flare`) | schema-verified 2026-11-16 | as above | Instruction-following edits and layout-aware compositing of a real photo, and keeping one product consistent across a series of edits (pass the previous output back in, one change at a time). Real photo goes in `input_images`. |
| **image-art-direction** | `black-forest-labs/flux-2-max` (premium) / `flux-2-pro` (standard and the cheapest) / `flux-2-flex` (control knobs; NOT the budget pick) | schema-verified | per megapixel: pro ≈$0.03 at 1 MP, ≈$0.08 at 4 MP · max ≈$0.07 / ≈$0.16 · flex ≈$0.06 / ≈$0.24 (reference images bill per input MP too) | Photoreal art direction, strong prompt adherence, style range, multi-reference editing. |
| **image-stylized** | `bytedance/seedream-4.5` | schema-verified | $0.04 | High-aesthetic stylized looks, editorial illustration vibes; sets of up to 15 in one call. |
| **image-vector** | `recraft-ai/recraft-v4` / `recraft-v4-svg` | schema-verified | $0.04 (raster) · $0.08 (SVG) | Logos, icons, flat design; `-svg` returns actual vector files. |
| **image-text-render** | `ideogram-ai/ideogram-v3-turbo` | schema-verified | $0.03 | Typography-dominant graphics where every character must be right. |

### Video (tier pipeline: see SKILL.md for the flow)

| Role | Model | Status | Cost | Use when |
|------|-------|--------|------|----------|
| **video-draft** | `wan-video/wan-2.5-i2v-fast` / `wan-2.5-t2v-fast` (720p is the floor: 480p is gone) | schema-verified | $0.068/s at 720p · $0.102/s at 1080p → ~$0.35 per 5s draft | DEFAULT first pass. 3-5 cheap drafts to find the motion direction. Never ship drafts. Cheapest verified per-second rate on the roster is `seedance-1-pro` at 480p ($0.03/s = $0.15 per 5s): a valid draft alternative; `wan-2.7-i2v` is NOT a draft model (see its section). |
| **video-ugc** | `bytedance/seedance-2.0` (alternate: `google/veo-3.1`) | schema-verified | Seedance 2.0 without video inputs $0.18/s at 720p (8s = $1.44) · Veo 3.1 $0.40/s with audio | UGC / ad-native video: the natural-handheld-imperfect look that converts in ad feeds; both carry native audio (on by default). Took the role when the Sora 2 API ended (2026-09-24). Still an untested prior: bake off Seedance vs Veo on the first UGC brief and record the winner in model-routing.md. |
| **video-production** | `kwaivgi/kling-v3-video` | schema-verified | `mode=pro` (default) $0.224/s, $0.336/s with audio · `standard` $0.168 / $0.252 · `4k` $0.42 either way → 5s pro ≈ $1.12 | DEFAULT finals. 3-15s, native audio, multi-shot prompting. Audio is ~+50%, not 2×. |
| **video-reference** | `kwaivgi/kling-v3-omni-video` or `bytedance/seedance-2.0` | schema-verified | Omni: pro $0.224/s ($0.28 with audio), standard $0.168 ($0.224), 4k $0.42 · Seedance 2.0 with video inputs: $0.10/s 480p · $0.22/s 720p · $0.55/s 1080p · $1.25/s 4k (without: $0.08 · $0.18 · $0.45 · $1.00) | Reference-driven work: character consistency, edit-by-reference. Omni = Kling ecosystem (image + video refs, editing, character lock). Seedance 2.0 = strongest raw reference pipeline (up to 9 image + 3 video + 3 audio refs) and audio ON by default. |
| **video-locked-camera** | `bytedance/seedance-1-pro` with `camera_fixed: true` | schema-verified | $0.03/s 480p · $0.06/s 720p · $0.15/s 1080p | Clean product shots needing a locked-off camera; also the cheapest draft path on the roster. |
| **video-premium** | `runwayml/gen-4.5` + `google/veo-3.1` + `bytedance/seedance-2.0` at 1080p, in parallel | schema-verified | Runway $0.12/s · Veo 3.1 $0.40/s with audio, $0.20/s without (8s = $3.20 / $1.60) · Seedance 2.0 1080p $0.45/s without video inputs → trio ≈ $7.70 for 8s takes | ONLY on explicit "hero" request. Run all three, pre-rank, user picks. `veo-3.1-fast` ($0.15/s with audio, $0.10 without) is the speed swap within the trio. |
| *newer, verify before use* | `bytedance/seedance-2.5` | not verified | not pulled | Our pick for Seedance video where your provider lists it. Replicate lists it (API metadata 2026-11-13: 30-second clips with native audio). No role resolves to it yet, so every Seedance role above stays on 2.0. Before it takes a role, pull its schema and price from replicate.com/bytedance/seedance-2.5, run one cheap test, and add it the registry way (roster line, section, verify run). |

### Lip-sync

| Role | Model | Status | Cost | Use when |
|------|-------|--------|------|----------|
| **lipsync-default** | `sync/lipsync-2-pro` | schema-verified | $0.08325/s ≈ $5/min (30s ≈ $2.50) | Studio-grade default: best sync quality, handles head motion, multi-speaker via `active_speaker`. |
| **lipsync-budget** | `pixverse/lipsync` | schema-verified | $0.04/s (10s = $0.40) | Cheap drafts and script-iteration passes. Audio + video only: no text/TTS input. |
| **lipsync-kling** | `kwaivgi/kling-lip-sync` | schema-verified | $0.014/s (10s = $0.14); cheapest sync on the roster | Kling-generated source videos (pass `video_id`), or built-in TTS quick tests. |
| **digital-human** | `bytedance/omni-human` | schema-verified | $0.14/s (10s = $1.40) | Full digital human from a single still + audio (body motion, not just mouth). |

Prices were read from each model's replicate.com page on 2026-11-13, per second / per
image as displayed there. They are still planning numbers: costs scale with
duration, resolution, and mode, and Replicate reprices without notice. Refresh from the
MODEL page (`replicate.com/{owner}/{model}`), not `replicate.com/pricing`, which lists
only a handful of featured models.

---

## Image models: payloads

### google/nano-banana-2 (image-default): schema-verified

`POST /v1/models/google/nano-banana-2/predictions`

```json
{
  "input": {
    "prompt": "{{prompt}}",
    "aspect_ratio": "{{ratio}}",
    "output_format": "jpg",
    "resolution": "2K",
    "image_input": []
  }
}
```

| Parameter | Type | Default | Options | Notes |
|-----------|------|---------|---------|-------|
| `prompt` | string | none | required | Keep under ~300 words. See VISUAL_INTELLIGENCE.md for construction. |
| `aspect_ratio` | string | `"match_input_image"` | `1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9, 1:4, 4:1, 1:8, 8:1, match_input_image` | The ONLY size control. No width/height params. The extreme banner ratios (1:4 … 8:1) arrived with the 2026-07-21 version. |
| `output_format` | string | `"jpg"` | `jpg, png` | `webp` was REMOVED: sending it 422s. PNG for quality. |
| `resolution` | string | `"1K"` | `1K, 2K, 4K` | The default dropped to 1K and 4K arrived (2026-07-21). Price steps with resolution ($0.067 / $0.101 / $0.151): set it explicitly; the payload above pins 2K. |
| `image_input` | array | `[]` | up to **14** image URLs | Fusion/edit/reference. Always an array, even for one image. |
| `image_search`, `google_search` | boolean | `false` | none | New grounding toggles that pull outside imagery/facts into the generation. Leave off for brand work. |

**Mistakes that 422:** `width`/`height` (not supported: aspect_ratio only),
`negative_prompt` (does not exist on this family: say what you want, not what you
don't), `image_input` as a bare string (must be an array), unsupported ratios like
`2:1`, `output_format: "webp"`, and `safety_filter_level` (that param now lives on
nano-banana-pro only). Prompts with quotes must be JSON-escaped.

### google/nano-banana-pro (image-premium-4k): schema-verified

Same family surface as nano-banana-2 with these differences: `resolution` defaults to
`2K` (`1K, 2K, 4K`); no 1:4 / 4:1 / 1:8 / 8:1 ratios; no search toggles;
`safety_filter_level` (`block_low_and_above / block_medium_and_above / block_only_high`,
default `block_only_high`: leave it); and `allow_fallback_model` (boolean, default
`false`): when `true`, Replicate substitutes a different model (a Seedream lite, billed
at $0.035) if Google is capacity-limited. Leave it `false` whenever the look must match
the rest of a set. $0.15 at 1K/2K, $0.30 at 4K.

### openai/gpt-image-2.6-flare and openai/gpt-image-2.6-sunburst (image-complex-prompt, image-instruct-edit): schema-verified 2026-11-16

`POST /v1/models/openai/gpt-image-2.6-sunburst/predictions` (or `.../gpt-image-2.6-flare/predictions`)

Flare is OpenAI's fast model, for drafts and interactive work; Sunburst is for detailed
compositions, precise edits and series of edits. Same input surface and the same per-image
prices on Replicate.

```json
{
  "input": {
    "prompt": "{{prompt}}",
    "quality": "medium",
    "complexity": "high",
    "aspect_ratio": "{{ratio}}",
    "output_format": "png",
    "input_images": []
  }
}
```

| Parameter | Type | Default | Options | Notes |
|-----------|------|---------|---------|-------|
| `prompt` | string | none | required | Reads like a layout spec. Put exact in-scene words in quotes; set ad text in HTML over the image instead. |
| `quality` | string | `"auto"` | `low, medium, high, xhigh, max, auto` | Drives price ($0.05 / $0.09 / $0.128 / $0.25 / $0.50; `auto` bills $0.25). `low` for drafts, `xhigh` or `max` for finals. |
| `complexity` | string | `"high"` | `low, medium, high` | How much the model plans before rendering. `high` for dense text and layouts; `low`/`medium` for focused edits. Does not change the price. |
| `aspect_ratio` | string | `"1:1"` | `1:1, 3:2, 2:3, 4:3, 3:4, 16:9, 9:16, auto` or a pixel size up to `3840x2160` / `2160x3840` | Sizes above 2560x1440 are experimental. |
| `input_images` | array | none | image URLs | Edit/compose from real photos and pass the product reference image. The param is **`input_images`**, NOT `image_input` (that is the Google family name). Read at high fidelity; there is no fidelity setting. |
| `output_format` | string | `"webp"` | `png, jpeg, webp, gif, svg` | `gif` returns an animated GIF; `svg` traces a vector (generation only, one image). PNG for hand-off. |
| `frame_count` | integer | `9` | 2-16 | GIF only. All frames share one image budget: a 1:1 GIF is 512x512, 16:9 is 896x512. |
| `frame_duration_ms` | integer | `200` | 20-2000 | GIF only, rounded to 10 ms. |
| `background` | string | `"auto"` | `auto, transparent, opaque` | Transparent needs `png` or `webp`. |
| `svg_model` | string | `"gpt-5.6-terra"` | tracing models | SVG only. |
| `moderation` | string | `"auto"` | `auto, low` | Leave at default. |
| `number_of_images` | integer | `1` | 1-10 | Variants in one call, each billed. |
| `output_compression` | integer | `90` | 0-100 | jpeg/webp only. |
| `openai_api_key` | string | none | optional | Your own OpenAI key bills OpenAI directly instead of Replicate. |

GIFs and SVGs bill by the tokens OpenAI reports (more frames and higher quality cost more).
For a loop, tell the prompt the last frame must match the first. Calling the API from
Python's urllib needs a `User-Agent` header or it returns 403.

### black-forest-labs/flux-2-max | flux-2-pro | flux-2-flex (image-art-direction): schema-verified

Shared surface: `prompt`; `aspect_ratio` (`1:1, 16:9, 3:2, 2:3, 4:5, 5:4, 9:16, 3:4,
4:3, match_input_image, custom`; `custom` unlocks `width`/`height` 256-2048);
`resolution` (`0.5 MP, 1 MP, 2 MP, 4 MP, match_input_image`, default 1 MP; the price
lever); `input_images` (array: references / edit source; pro takes up to 8, flex up to
10 per Replicate); `output_format` (`webp, jpg, png`, default webp); `output_quality`;
`safety_tolerance` 1-5; `seed` (FLUX respects seeds well: use for iteration
discipline). `flux-2-flex` adds `steps` (1-50, default 30), `guidance` (1.5-10, default
4.5), and `prompt_upsampling` (default `true`: set `false` for literal control). No
negative prompts.

Pricing is per megapixel in AND out: pro $0.015/run + $0.015 per input MP + $0.015 per
output MP; max $0.04/run + $0.03/MP each way; flex $0.06/MP each way. So flex is the
MOST expensive of the three per pixel: choose it for the knobs, never as the budget
option; pro is the budget option.

### bytedance/seedream-4.5 (image-stylized): schema-verified

`prompt`; `size` (`2K, 4K, custom`; `custom` unlocks `width`/`height` 1024-4096);
`aspect_ratio` (adds `21:9`, `9:21`, `match_input_image`); `image_input` (array:
references); `max_images` 1-15 with `sequential_image_generation: "auto"` to get a
coherent set in one call; `disable_safety_checker`. **No `seed` param**: 4.5 dropped
it; iterate by feeding the previous winner back through `image_input`. Strong
stylized/editorial aesthetics; weaker exact-text rendering than ideogram. $0.04/image.

### recraft-ai/recraft-v4 / recraft-v4-svg (image-vector): schema-verified

`prompt`; `size` (fixed pixel presets, default `1024x1024`); `aspect_ratio` (`Not set`
default, or `1:1` … `6:10`). **There is no `style` param on v4** (v3 had one). Put the
style in the prompt ("flat vector illustration, two-colour, …"). The `-svg` variant
returns real SVG markup: the only roster model that does. $0.04 (v4) · $0.08 (v4-svg).
Newer `recraft-v4.1` / `-pro` / `-utility` IDs exist (2026-05); not rostered, untested.

### ideogram-ai/ideogram-v3-turbo (image-text-render): schema-verified

`prompt` (put exact text in "double quotes" inside the prompt); `aspect_ratio`;
`resolution` (explicit pixel presets, default `None`); `style_type`: `None, Auto,
General, Realistic, Design` (**Title-case**, not `AUTO/GENERAL/…`: the enum is
case-sensitive); `magic_prompt_option`: `Auto, On, Off` (Title-case; `Off` when you
need literal control); `style_preset` (60+ named looks); `style_reference_images`
(array); `image` + `mask` for inpainting; `seed`. Route here whenever a graphic is
typography-dominant or has >6 words of in-image text. $0.03/image. Ideogram v4
(`ideogram-v4-quality`, `-balanced`; 2026-06) exists; not rostered, untested.

---

## Video models: payloads

### wan-video/wan-2.5-i2v-fast / wan-2.5-t2v-fast (video-draft): schema-verified

`POST /v1/models/wan-video/wan-2.5-i2v-fast/predictions`

```json
{
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{start_image_url}}",
    "resolution": "720p",
    "duration": 5
  }
}
```

- Image param is **`image`** (required for i2v; NOT `start_image`).
- `resolution`: **`720p` or `1080p` only**; 480p is gone from the schema even though
  the README still advertises it; `"480p"` 422s. 720p is the draft resolution.
- `duration`: `5` or `10` (integer enum).
- Also: `negative_prompt`, `seed`, `audio` (URL: generate in sync with a track), and
  `enable_prompt_expansion` (default `true`; set `false` when the motion prompt must be
  taken literally).
- **T2V variant uses `size`, not `resolution`/`aspect_ratio`:** `1280*720`, `720*1280`,
  `1920*1080`, `1080*1920` (asterisk, not x). Same body otherwise, minus `image`.
- $0.068/s at 720p · $0.102/s at 1080p (both variants) → a 5s 720p draft is ~$0.34.
- Older `wan-2.2-*` used `num_frames` instead of `duration`; if a 422 names
  `duration`, check the API page. Wan's duration param has churned across versions.

### wan-video/wan-2.7-i2v: schema-verified, NOT a drop-in for the draft tier

Different surface from 2.5: the start image is **`first_frame`** (not `image`);
`last_frame` sets the end frame; `first_clip` continues a previous clip (the
frame-piecing route without ffmpeg); `duration` any integer 2-15; `resolution`
`720p` / `1080p`: default **1080p**, set 720p or pay 1.5×; plus `audio`, `seed`,
`negative_prompt`, `enable_prompt_expansion`. $0.10/s 720p · $0.15/s 1080p → a 5s 720p
clip is $0.50, ~50% over a Wan-fast draft and with a 15s ceiling and end-frame control:
treat 2.7 as a mid-tier for approved motion, not a draft model. (No `-fast` variant
exists at 2.7.)

### kwaivgi/kling-v3-video (video-production): schema-verified

Note the ID: `kling-v3-video`, NOT `kling-v3.0` (the dotted v3 ID 404s).

`POST /v1/models/kwaivgi/kling-v3-video/predictions`

```json
{
  "input": {
    "prompt": "{{motion_description}}",
    "negative_prompt": "blurry, low quality, distorted, watermark, text overlay",
    "start_image": "{{image_url}}",
    "duration": 5,
    "aspect_ratio": "16:9",
    "mode": "pro",
    "generate_audio": false
  }
}
```

| Parameter | Type | Default | Options | Notes |
|-----------|------|---------|---------|-------|
| `prompt` | string | none | required | Describe the MOTION for I2V: the model sees the start image. Multi-shot: describe shots in sequence ("Shot 1: ... Cut to: ..."). |
| `mode` | string | `"pro"` | `standard, pro, 4k` | The price lever: $0.168 / $0.224 / $0.42 per second. `standard` is fine for drafts of finals. |
| `start_image` | URI | none | image URL | Kling-family param name. Aspect ratio inherits from the image when provided. |
| `duration` | integer | `5` | any integer **3-15** | Not just 5/10/15: 7s is legal. Integer, not string. |
| `aspect_ratio` | string | `"16:9"` | `16:9, 9:16, 1:1` | Ignored when `start_image` is set. |
| `negative_prompt` | string | none | free text | Supported (unlike the nano-banana family). |
| `generate_audio` | boolean | `false` | none | Native audio. +$0.084/s standard, +$0.112/s pro (~+50%); 4k includes it. Enable only when audio ships. |
| `end_image` | URI | none | image URL | Target final frame (interpolation). |
| `multi_prompt` | string | none | structured shot list | The explicit multi-shot input; prose shot lists in `prompt` also work. |

`guidance_scale` was REMOVED from the Kling API at 2.5. Never include it.

### kwaivgi/kling-v3-omni-video (video-reference): schema-verified

The kling-v3-video surface plus: `reference_images` (array: character/object
consistency), `reference_video` (URL) with `video_reference_type` (`feature` = borrow
its look/motion, `base` = edit this video), and `keep_original_sound` (default `true`).
Use for spokesperson packs (talking-head mode) and any "same character, new scene"
request. Prices: standard $0.168/s ($0.224 with audio), pro $0.224 ($0.28), 4k $0.42.

### bytedance/seedance-2.0 (video-reference): schema-verified

```json
{
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{start_image_url}}",
    "duration": 5,
    "resolution": "720p",
    "aspect_ratio": "9:16",
    "generate_audio": false,
    "reference_images": []
  }
}
```

- Start frame is **`image`**; end frame is `last_frame_image`.
- Reference arrays: `reference_images` (up to 9), `reference_videos` (up to 3),
  `reference_audios` (up to 3): the strongest raw reference pipeline on the roster.
- `duration`: integer up to 15, or **`-1`** to let the model pick the length.
- `resolution`: `480p, 720p, 1080p, 4k` (default 720p). `aspect_ratio` adds `21:9`,
  `9:21`, and `adaptive`.
- **`generate_audio` defaults to `true`**: audio is ON unless you turn it off. No
  negative prompt. `seed` supported.
- Billed by whether you pass video inputs: without them $0.08/s 480p · $0.18/s 720p ·
  $0.45/s 1080p · $1.00/s 4k; with `reference_videos` $0.10 · $0.22 · $0.55 · $1.25.

### bytedance/seedance-1-pro (video-locked-camera): schema-verified

```json
{
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{image_url}}",
    "duration": 5,
    "resolution": "1080p",
    "aspect_ratio": "9:16",
    "camera_fixed": true
  }
}
```

`camera_fixed: true` is the reason this model stays on the roster: locked-off product
shots with zero camera drift. Duration 2-12s (widest range); `resolution` `480p, 720p,
1080p`; 7 aspect ratios; `last_frame_image` end frame; `seed`; no negative prompt, no
audio. $0.03/s 480p · $0.06/s 720p · $0.15/s 1080p; the cheapest per-second rate on
the roster, which also makes it a legitimate draft path.

### runwayml/gen-4.5 (video-premium): schema-verified

Runway's current flagship on Replicate (version 2026-02-18). `prompt`; `image` (first
frame); `duration` `5` or `10`; **`aspect_ratio`** (`16:9, 9:16, 4:3, 3:4, 1:1, 21:9`),
NOT `ratio`; `seed`. No negative prompt, no audio, no end frame, no references.
$0.12/s.

### google/veo-3.1 / veo-3.1-fast (video-premium): schema-verified

```json
{
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{image_url}}",
    "duration": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "generate_audio": true
  }
}
```

- Image param is **`image`** (NOT `start_image`). Duration: `4, 6, 8` only.
- No square aspect ratio (`16:9`/`9:16` only): crop in post for 1:1. `resolution`
  `720p` / `1080p`. `negative_prompt` supported. `seed` supported.
- `reference_images` (1-3 URLs) guides subject consistency; it does NOT set the first
  frame. `last_frame` sets the end frame. `generate_audio` defaults to `true`.
- `-fast` variant: same surface minus `reference_images`; lower fidelity.
- Veo 3.1: $0.40/s with audio, $0.20/s without (8s = $3.20 / $1.60). Fast: $0.15/s with
  audio, $0.10/s without.

### openai/sora-2 / sora-2-pro: REMOVED 2026-11-13

OpenAI ended the Sora 2 and Sora 2 Pro API on 2026-09-24 and both replicate.com pages
now return 404. The model metadata endpoint still answers 200, so verify_models.sh
alone would have passed them; check the public page for any model near a sunset. A saved brief or style lock that names
Sora resolves to `video-ugc` (Seedance 2.0) or the premium trio in the role map.

### Cross-model parameter cheat sheet

Every family names the same concept differently. Check this before writing ANY call.

| Concept | Wan 2.5 fast | Wan 2.7 | Seedance 1-pro / 2.0 | Kling 3.0 (/Omni) | Veo 3.1 | Runway 4.5 |
|---------|-------------|---------|----------------------|-------------------|---------|------------|
| Start image | `image` | `first_frame` | `image` | `start_image` | `image` | `image` |
| Duration | `duration` (5/10) | `duration` (2-15) | `duration` (2-12 / -1 or ≤15) | `duration` (3-15) | `duration` (4/6/8) | `duration` (5/10) |
| Resolution / tier | `resolution` 720p-1080p (t2v: `size`) | `resolution` 720p-1080p | `resolution` 480p-1080p / -4k | `mode` standard/pro/4k | `resolution` 720p/1080p | none |
| Aspect ratio | from image (t2v: `size`) | from image | `aspect_ratio` (7 / 8 incl. `adaptive`) | `aspect_ratio` (3) | `aspect_ratio` (no 1:1) | `aspect_ratio` (6) |
| Negative prompt | yes | yes | NO | yes | yes | no |
| Native audio | `audio` input (sync to a track) | `audio` input | 1-pro: no · 2.0: `generate_audio` (default ON) | `generate_audio` (default off) | `generate_audio` (default ON) | no |
| End frame | none | `last_frame` | `last_frame_image` | `end_image` | `last_frame` | none |
| Reference imgs | none | none | 2.0: `reference_images` (≤9) + `reference_videos` / `reference_audios` (≤3) | Omni: `reference_images`, `reference_video` | `reference_images` (1-3; not on -fast) | none |
| Camera lock | none | none | 1-pro: `camera_fixed` | none | none | none |
| Seed | yes | yes | yes | no | yes | yes |

---

## Lip-sync models: payloads

### sync/lipsync-2-pro (lipsync-default): schema-verified

```json
{
  "input": {
    "video": "{{source_video_url}}",
    "audio": "{{audio_url}}",
    "sync_mode": "loop"
  }
}
```

Studio-grade default. Param names are `video`/`audio` (NOT `video_url`/`audio_file`:
that's the Kling model). `sync_mode` handles audio/video length mismatch: `loop`,
`bounce`, `cut_off`, `silence` (pad the video with silence), `remap` (retime the
video to the audio). `temperature` 0-1 (default 0.5: expressiveness of the mouth
motion); `active_speaker` (boolean: in multi-person shots, sync only whoever is
speaking). Handles head motion and longer clips better than alternatives.
$0.08325/s ≈ $5/min.

### kwaivgi/kling-lip-sync (lipsync-kling): schema-verified

```json
{
  "input": {
    "video_url": "{{source_video_url}}",
    "audio_file": "{{audio_url}}"
  }
}
```

Text-driven variant: replace `audio_file` with `text` + `voice_id` (e.g. `"en_AOT"`) +
`voice_speed` (**0.8-2.0**, default 1). Constraints (carried from the earlier registry,
still enforced by the provider): video 2-10s, 720p-1080p, <100MB; audio <5MB;
`audio_file`/`text` mutually exclusive; `video_url`/`video_id` mutually exclusive (use
`video_id` for Kling-generated sources: skips re-upload). Front-facing, well-lit,
single person. Side profiles fail. $0.014/s.

### pixverse/lipsync (lipsync-budget): schema-verified

`audio` + `video` (both required): that is the whole surface; there is no `text`/TTS
input, so bring your own voice track. Cheap sync for draft passes and script iteration.
$0.04/s.

### bytedance/omni-human (digital-human): schema-verified

Full digital human: `image` (single still) + `audio` → talking, gesturing person (body
motion, not just mouth). The most expensive lip-sync path and the only one that works
from a photo instead of a video. $0.14/s.

---

## Newer IDs seen on Replicate (2026-11-13): NOT on the roster

Untested here; each needs a roster line, a section, and a verify run before it carries
a role. Listed so a refresh does not rediscover them from scratch (API metadata checked
2026-11-13; schemas and prices not pulled):

- Video: `kwaivgi/kling-v4.0` (2026-11-10; 3-30s at up to 1080p from text, keyframes or
  references; the likely next video-production candidate) and `kling-v4-flash`;
  `bytedance/seedance-2.5` (30-second clips with native audio), `seedance-2.0-fast`,
  `seedance-2.0-mini`; `wan-video/wan-2.7-t2v`, `wan-2.7-r2v`, `wan-2.7-videoedit`;
  `minimax/hailuo-2.3` (+`-fast`); `pixverse/pixverse-v6`; `runwayml/aleph-2`;
  `kwaivgi/kling-v3-motion-control`, `kling-avatar-v2`; `google/veo-3.1-lite`.
- Images: `google/nano-banana-2.1` (2026-11-05; sharper text, up to 4K) and
  `nano-banana-2-lite`;
  `black-forest-labs/flux-3-image` (2026-10) and the `flux-2-klein-*` budget tier;
  `bytedance/seedream-5-lite`; `ideogram-ai/ideogram-4-5` (2026-11-09) and
  `ideogram-v4-quality` / `-balanced`; `recraft-ai/recraft-v4.1` / `-pro` / `-svg` /
  `-utility`.
- Lip-sync and voice, official on Replicate: `bytedance/omni-human-1.5`;
  `sync/lipsync-2` (non-pro); `heygen/avatar-v`, `heygen/lipsync-precision`,
  `heygen/lipsync-speed`, `heygen/video-translate`; `elevenlabs/v3`,
  `elevenlabs/flash-v2.5`, `elevenlabs/music`, `elevenlabs/dubbing`.

---

## Cost reference (planning numbers at 2026-11-13 prices)

| Job | Assets | Cost |
|-----|--------|------|
| Image iteration (5 variants, default model at 1K) | 5 images | ~$0.35 (2K: ~$0.50) |
| Hero still at 4K (nano-banana-pro) | 1 image | ~$0.30 (NB2's own 4K: $0.15) |
| Draft pass (4 motion drafts, draft tier, 5s at 720p) | 4 clips | ~$1.35 (seedance-1-pro at 480p: ~$0.60) |
| Production final (5s, no audio, Kling `pro`) | 1 clip | ~$1.12 (`standard`: $0.84) |
| Production final (15s, audio, Kling `pro`) | 1 clip | ~$5.04 (`standard`: $3.78) |
| Premium hero trio (parallel, 8s each) | 3 clips | ~$7.70 (Veo with audio $3.20 + Runway $0.96 + Seedance 2.0 at 1080p $3.60) |
| Lip-sync pass (studio default, 30s) | 1 clip | ~$2.50 (budget tier $1.20; Kling $0.42) |
| 12-cell ad matrix, statics at 1 ratio (1K) | 12 images | ~$0.80 |
| Full campaign (20 images + 5 production clips + 2 lip-syncs) | 27 assets | ~$9-14 |

Cost discipline (from SKILL.md): generations under $1 need no confirmation; state cost
in one line and proceed for $1-2; confirm before anything ≥$2. At these prices a single
5s production clip in `pro` mode already crosses the $1 line: say the number.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| 401 | bad/missing `REPLICATE_API_TOKEN` | Check env / .env |
| 404 on model | wrong/renamed model ID | Run `scripts/verify_models.sh`; fix this file |
| 404 on a model that passed last month | provider sunset (Sora 2 / Sora 2 Pro ended 2026-09-24) | Delete it from the roster block + its section; point its role at a rostered model |
| 422 | wrong param name for THIS family | Cross-model cheat sheet above |
| Output URL 404 | downloaded >1h after success | Regenerate; always download immediately (api-workflow.md) |
| Video has no motion | I2V prompt described the scene, not the motion | Rewrite prompt as motion only |
| Square ratio rejected | Veo has no 1:1 | Generate 16:9, crop in post, or use Kling |
| Lip-sync rejected | source video length/res/size limits | See per-model constraints above |
| 429 | rate limited | Wait 60s; batch in waves of 5-8 (api-workflow.md) |

---

*Single source of truth for the creative engine. When a model changes upstream:
update this file, bump `registry_version`, re-run `scripts/verify_models.sh`. Mode
files reference roles and never need to change.*
