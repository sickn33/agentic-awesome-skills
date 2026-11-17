# Product Photo Mode

Product photography that sells: commercial-photography craft encoded into prompts,
platform compliance enforced before delivery, and, for e-commerce, the user's REAL
product photo edited rather than reinvented. This is the floor, not the ceiling. When
the situation argues for a better path, take it and say why.

**Before generating:** resolve roles in `references/MODEL_REGISTRY.md` (this mode never
names models); follow `references/api-workflow.md` for calls, saving, manifest, and the
QA loop; read `./brand/creative-kit.md`. Stills run on **image-default**; 4K finals on
**image-premium-4k**; typography-heavy packaging mockups on **image-text-render**.

---

## Mode decision first: EDIT vs GENERATE

The first question for any product request: **does the user have a real photo of the
actual product?**

| Situation | Path | Why |
|-----------|------|-----|
| Real product photo exists (even a phone shot) | **EDIT**: image_input workflow | Exact product fidelity. Generated lookalikes get e-commerce returns and ad rejections; the real label, proportions, and materials are non-negotiable. |
| Product is pre-production / conceptual | GENERATE from prompt | Nothing real to preserve yet. |
| Real photo exists but user wants a different product variant | GENERATE, with the real photo as style reference | Reference anchors brand look without cloning the wrong SKU. |

Default to EDIT whenever a real photo is available. Ask for one if the request is for
an existing product and none was provided.

## Edit mode: the user's real photo

`image-default` supports fusion editing with up to 14 reference images via
`image_input` (payload in the registry). The product pixels come from the user's photo;
the prompt describes ONLY what changes.

**The three core edits:**

```
BACKGROUND SWAP
"Place this exact product on [white seamless / walnut desk / marble counter],
keep the product completely unchanged: same label, same proportions, same colors,
[new lighting description matching the new surface], realistic contact shadow"

RELIGHT
"Same product, same composition, relight with [single dramatic spotlight from upper
left / soft window light from the right], deep natural shadows, keep label legible"

STYLE TRANSFER / SET DRESSING
"This exact product styled into [lifestyle scene], product unchanged and in sharp
focus, scene elements secondary, [brand palette] tones in the environment"
```

**Edit-mode rules:**
- Prompt the CHANGES, never re-describe what the photo already shows.
- Always include a fidelity clause ("product completely unchanged, same label").
- QA step gains a dimension: compare output against the source photo: label text,
  cap/closure shape, proportions. Any drift = automatic regenerate.
- Phone photos work; ask for the highest-resolution original (1000px+ on the long
  side), product fully in frame, minimal motion blur.
- Multiple reference photos (front + angle + detail) in one `image_input` array give
  the model more truth to preserve.

## Shot types: the working vocabulary

| Shot | Job | Default ratio | Prompt spine |
|------|-----|---------------|--------------|
| **Hero** | The one image that carries the listing/page | 16:9 (banner) or 1:1 | best angle, dimensional lighting, background that doesn't compete, negative space on the text side |
| **Detail** | Prove quality up close | 1:1 | macro on ONE feature, shallow DOF, texture visible |
| **Lifestyle** | "I could use that here" | 4:5 | specific narrative moment, natural light, aspirational but believable |
| **E-commerce flat** | Marketplace main image | 1:1 | pure white, 85%+ frame fill, no props/text |
| **Flat lay** | Social, collections | 1:1 | top-down, complementary items, styled not cluttered |
| **Scale reference** | Kill size ambiguity | 1:1 | next to a hand or familiar object |

A "complete shoot" = the 5 non-ecommerce shots above generated in parallel under one
consistency lock (below); wall-clock ≈ one generation. Offer it for sets.

## Category judgment

What changes per category: fold into the prompt, don't recite.

**Electronics & tech**: the battle is reflections. Controlled (never eliminated)
reflections on metal/glass, rim light on edges for separation, dark gradient
backgrounds read premium. Screens: specify on/off and exact content.

```
+ controlled reflections on metallic surfaces, subtle rim lighting on edges,
+ separation light from background, premium technology aesthetic
```

Headphones: both cups + materials. Phones/laptops: screen content + thinness/angle.
Wearables: on-wrist for scale.

**Fashion & apparel**: fabric truth: visible weave/texture, accurate color, natural
drape. Presentation is a decision: flat lay (pattern/detail) · form (structure without
a model) · on-model (aspiration + fit) · hanging (natural drape). Fabric-specific:

```
silk/satin  + subtle sheen, controlled highlights, luxurious drape
denim       + visible texture and weave, authentic blue tones
leather     + rich material quality, visible grain, subtle surface texture
knitwear    + visible knit pattern, cozy texture, soft lighting
```

**Food & beverage**: appetite cues do the selling: steam (hot), condensation (cold),
fresh garnish, and ONE deliberate imperfection (a crumb, a drip) for authenticity.

```
+ soft overhead natural daylight feel, backlit for steam visibility,
+ side lighting for texture, warm tones for appetite appeal
```

**Beauty & cosmetics**: color accuracy IS the product; render texture (cream, gel,
powder, liquid) and packaging quality. Clinical-clean vs spa-warm is a positioning
decision, not a default. Lipstick often wants a swatch; perfume goes abstract.

**Jewelry & watches**. Controlled sparkle, never chaos:

```
+ main light for exposure, rim light for metal definition,
+ one small accent light for sparkle on stones, gradient background for depth
```

Watches show 10:10 (balanced, frames the dial); case finishing and crown visible.

**Home & furniture**: styled realistic rooms beat white voids; scale via familiar
objects; natural window light; complementary (not competing) decor. Desire here is
"room transformation," not object isolation.

## Lighting: the amateur/professional line

Direction beats wattage. Specify direction + quality + temperature every time:

| Setup | Prompt language | Reads as |
|-------|-----------------|----------|
| Three-point | "key from upper left, soft fill from right, rim from behind" | Classic commercial |
| Single source | "single dramatic spotlight from upper left, deep shadows, gradient falloff" | Premium / moody |
| Soft diffused | "large softbox overhead, minimal shadows, even" | Beauty, catalog |
| Window | "natural window light from the left, soft organic shadows" | Lifestyle |
| Golden hour | "golden hour warmth, long soft shadows" | Aspirational |
| Backlit | "backlit with rim lighting, silhouette edge glow" | Drama, beverages |

45° side light is the safe default for dimension. Flat front light is for e-commerce
mains only. Never write "well-lit". That's the AI-glow trigger
(VISUAL_INTELLIGENCE.md Part 4).

## Background, staging, composition

- Surfaces carry positioning: marble = luxury, wood = warm/organic, concrete =
  industrial/modern, linen = soft lifestyle, pure white = marketplace.
- Props enhance, never compete: complementary materials, context items, scale
  references. Never competing products, loud colors, or more than 2-3 elements.
- Composition: rule-of-thirds for dynamic shots; centered ONLY for deliberate hero
  symmetry; explicit negative space ("product left, clean space right for headline")
  whenever copy will overlay.
- Angles: 45° = classic e-commerce; slightly below = imposing/premium; top-down =
  flat lay/food; macro = detail. Say the angle. Defaults drift.

## Multi-shot consistency lock

Inconsistent lighting/temperature across a set looks amateur and breaks brand trust.
Before any set, lock and reuse VERBATIM in every prompt:

```
LOCK: [product]
Lighting:  [exact phrase, e.g. "soft three-point studio lighting, key from upper left"]
Color:     [white balance phrase + product hex codes]
Background/surface: [exact phrase]
Quality:   [exact phrase, e.g. "commercial advertising photography, sharp focus"]
Seed:      [fixed seed where the model supports it; registry says which do]
Varies per shot: subject framing and angle ONLY
```

Same seed + structurally similar prompts = consistent rendering. Drastically different
prompts diverge even seeded. Keep the locked block identical and change only the
shot-specific clause. Save the lock to the campaign directory and the manifest.

For maximum consistency, chain references: approve the hero, then pass it as
`image_input` for the remaining shots.

**Worked lock + set (condensed):**

```
LOCK: soft three-point studio lighting key from upper left · neutral white balance
5500K · light gray gradient background · white marble surface · commercial
advertising photography, sharp focus

Hero (16:9):   Ceramic pour-over coffee dripper hero shot, matte white glaze, wooden
               collar detail, negative space right for text, [LOCK]
Detail (1:1):  Close-up of wooden collar and ceramic join, visible grain and glaze
               texture, shallow depth of field, [LOCK]
Lifestyle (4:5): Dripper on kitchen counter, morning ritual, fresh coffee dripping,
               steam rising, window light supplementing [LOCK]
Flat lay (1:1): Dripper with paper filters, beans, wooden scoop, mug, top-down, [LOCK]
Scale (1:1):   Dripper next to standard coffee mug, proportions clear, [LOCK]
```

Note what varies: only the first clause. Everything after the comma is the lock,
verbatim, all five prompts.

## Platform compliance (e-commerce)

Run BEFORE delivery for marketplace work; auto-correct and regenerate on failure.

**Amazon main image:** pure white background (RGB 255,255,255) · product fills 85%+ ·
no text/logos/watermarks/borders · single product, no props · sharp, true-to-life
color · 1500×1500 target. Secondary images may use lifestyle/infographics/scale.

**Shopify/DTC:** 1:1 at ~2048px, consistent background across the catalog, 3-5 angles
per product; heroes and lifestyle have full creative freedom.

**Auto-corrections:** background not white → append "on pure white seamless
background, RGB 255 255 255" · product small → "product fills 85 percent of frame" ·
props present → strip context clauses, add "product only, no props" · colors off →
"accurate color rendering, neutral white balance".

**Instagram/social:** 4:5 beats 1:1 for feed real estate; scroll-stopping contrast;
lifestyle context usually outperforms studio. **Hero banners:** 16:9/21:9 with
explicit headline space. **Pinterest:** 2:3 vertical, aspirational, text overlay
space at top.

## Example prompts (complete)

```
TECH HERO       Premium wireless over-ear headphones hero shot, silver and black
                colorway, floating against dark charcoal gradient, dramatic single
                spotlight upper left, subtle rim lighting on edges, controlled
                metallic reflections, negative space right for headline, commercial
                technology advertising photography, sharp focus, 16:9

SKINCARE FLAT   Luxury skincare serum bottle, glass with dropper, golden serum
                visible, pure white background, soft diffused studio lighting,
                product fills 85% of frame, accurate color rendering, commercial
                beauty photography, 1:1

FOOD LIFESTYLE  Artisan coffee bag, kraft paper with bean window, rustic wooden
                kitchen counter, morning light through window, beans scattered,
                ceramic mug nearby, warm inviting tones, editorial food photography,
                aspirational home aesthetic, 4:5

JEWELRY MACRO   Diamond engagement ring, platinum band, brilliant cut center stone,
                extreme macro, sparkle on facets, black gradient background,
                controlled reflections, rim light on metal edges, high-end
                commercial jewelry photography, 1:1
```

## The 80/20

80% of results: (1) specific product description, (2) directional lighting, (3) a
background that supports the positioning, (4) platform-correct composition. The 20%
that separates good from great: multi-shot consistency, reference-image grounding
(edit mode), compliance that never bounces a listing, and complete-shoot sets instead
of one-off sessions.

## QA additions for this mode

On top of the standard rubric (SKILL.md): product accuracy (features visible, colors
true, proportions right vs the source photo in edit mode), commercial read (would
this pass as a paid shoot?), platform compliance (above), and the avoid-list. Common
fixes: looks AI → add specific camera/film reference; wrong reflections → "controlled
reflections"; flat → add light direction; cluttered → cut props; not premium → slow
down the staging and darken the background, don't just append "luxury".

## Output

Save per api-workflow.md: `creative-output/product-photos/<product>/<shot-type>/`
(edits go in `edits/`), named `[shot]-[descriptor]-[ratio]-v[N].png`, manifest updated,
one line to `./brand/assets.md`. Delivery = standard contract with the shots and one line each on where they fit (QA scores
stay in the manifest); offer the consistency lock and complete-shoot expansion when a single shot lands well.
Route onward: approved hero → product-video mode (I2V source frame); approved set →
ad-creative mode (matrix raw material).
