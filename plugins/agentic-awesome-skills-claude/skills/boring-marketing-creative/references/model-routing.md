# Model Routing: Job → Model Judgment

```
last-verified: 2026-11-13 · ttl-days: 60 · refresh: re-verify model availability via scripts/verify_models.sh (plus the public model page for anything near a sunset) and re-test operator priors against recent generations
changes: 2026-11-16: image-complex-prompt and image-instruct-edit now resolve to GPT Image 2.6 (Flare for drafts, Sunburst for finals and consistent edits; schemas and prices pulled 2026-11-16). 2026-11-13: availability, schemas and prices re-verified against the Replicate API and model pages (25/25 pass); Sora 2 and Sora 2 Pro are gone (API ended 2026-09-24, pages 404), so video-ugc now resolves to Seedance 2.0 with Veo 3.1 as the alternate and Seedance 2.0 sits in the hero trio; Seedance 2.0 is cheaper without video inputs; section 6 re-checked for availability only (all eight ElevenLabs and HeyGen IDs live on Replicate). Operator priors were last re-tested in June 2026: treat them as priors, not measurements
```

Load this BEFORE model selection, whenever the pick isn't already fixed by a saved
style lock, an approved presenter pack, or the user naming a model. This file carries
the judgment layer: which model for which job, when to feed text vs an image vs
references, and how a brand's look survives across sessions and models.

Everything here is a DEFAULT with a stated reason. Override freely when the situation
argues otherwise, saying why in one line. The defaults are **operator priors,
field-tested June 2026; availability, schemas, and prices re-verified 2026-11-13, the
priors themselves not re-tested since June**: earned opinions, not laws, and they
decay: when recent generations disagree with a prior, update this file rather than
silently routing around it.

This is the only file besides MODEL_REGISTRY.md that names models, and only in routing
tables (role + name, for judgment). Payloads, parameter surfaces, and prices live ONLY
in `references/MODEL_REGISTRY.md`. Resolve the role there before any call.

---

## 1. Job → model matrix

| Job smells like | Default (role → model) | Why this is the default | Deviate when |
|-----------------|------------------------|--------------------------|--------------|
| UGC / ad-native video: handheld, imperfect, "a person filmed this" | **video-ugc** → Seedance 2.0 (native audio on by default), Veo 3.1 as the alternate. Sora 2 held this role until OpenAI ended its API on 2026-09-24. The Seedance pick is an UNTESTED prior: run a 3-draft bake-off (Seedance vs Veo) on the first UGC brief and record the winner here | The natural-handheld-imperfect look that converts in ad feeds; native audio adds ambient realism for free, and both candidates carry it | The "UGC" needs the same recurring character across clips → video-reference; the brief actually wants polish (UGC framing, cinematic finish) → video-production |
| Polished / cinematic / reference-driven video | **video-reference** → Seedance 2.0 (Kling 3.0 Omni when already in the Kling ecosystem) | Great general video model AND the strongest reference pipeline on the roster (up to 9 image + 3 video + 3 audio refs): style, character, and product fidelity in one call | No references exist and nothing needs preserving → Kling 3.0 production path is cheaper per second |
| Production finals; long, multi-shot, or native-audio video | **video-production** → Kling 3.0 | 15s ceiling, multi-shot prompting, audio as a toggle (pay only when audio ships) | Reference consistency matters more than length → Seedance 2.0 |
| Cheap motion drafts: finding the move | **video-draft** → Wan tier (720p is the floor now: 480p left the wan-2.5-fast schema) | ~$0.35 per 5s clip at 720p, fast; 3-5 genuinely different drafts beat one expensive guess. The cost prior has inverted: seedance-1-pro drafts at 480p ($0.15 per 5s) or 720p ($0.30) now undercut Wan fast, so the Wan default stands on motion quality alone, untested since June. Re-test before the next TTL | Never ship drafts; skip the draft round only for trivially simple motion you've already validated |
| Locked-off product shot, zero camera drift | **video-locked-camera** → seedance-1-pro (`camera_fixed`) | The only roster model with a hard camera lock | Motion is wanted after all → back to the draft tier |
| Explicit "hero" video spend | **video-premium** trio in parallel (Runway 4.5 + Veo 3.1 + Seedance 2.0 at 1080p) | Three takes, pre-ranked: hero money buys options, not one roll | Never silently escalate here; ≥$2 confirm rule applies: at 2026-11 prices one 8s Veo take with audio is $3.20 on its own |
| Image workhorse: most stills, iterations, moodboards | **image-default** → Nano Banana 2 | Fast, cheap, strong general quality, fusion editing up to 14 refs; the default until a job below clearly fits | Dense prompts or exact text → next row; shipping 4K → image-premium-4k |
| Complex composition, exact in-image text, dense multi-element prompts | **image-complex-prompt** → GPT Image 2.6 (Flare drafts, Sunburst finals) | Best instruction-following and text rendering on the roster: when the prompt reads like a layout spec, route here. Ad text still goes on in HTML, not in the model | Simple typography-poster flat design → image-text-render (ideogram) is cheaper; high-volume iteration → NB2 then upgrade the winner |
| Premium 4K stills: hero, print | **image-premium-4k** → nano-banana-pro | Same family as the workhorse; NB2 itself now outputs 4K ($0.151), so pro ($0.30 at 4K) is the fidelity upgrade, not the only 4K path | ~2× NB2's own 4K price: only when the extra fidelity actually ships (print, hero) |
| Logos, icons, anything that must scale as vector | **image-vector** → recraft (`-svg` variant) | The only roster model returning real SVG | Raster brand graphics → NB2 |

When two rows both fit, the cheaper one runs first. Direction is found at the cheap
tier, quality is bought once for the winner.

## 2. Input modality: t2v vs i2v vs i2i vs references

The question is never "which mode is best". It's **what are you protecting?**

```
Protecting NOTHING yet (exploring direction)      → t2i / t2v
Something REAL must stay real                     → i2i / edit
An APPROVED LOOK needs motion                     → i2v from the approved still
CONSISTENCY across a SET                          → reference-driven
The motion has a required DESTINATION             → start + end frame
```

- **t2i / t2v: exploration.** Nothing to preserve, so let the model imagine. The
  cheapest way to find a direction. The moment something gets approved, stop
  re-rolling from text: you'll never get it back exactly.
- **i2i / edit: fidelity beats imagination.** Anything real that must stay real,
  YOUR actual product, YOUR face, YOUR packaging and label, goes in as an image and
  gets edited around. A generated look-alike bottle is a different bottle; customers
  notice. Pass the real photo via `image_input` (NB2 fusion) or the edit path
  (GPT Image 2.6 Sunburst) and change only what the prompt names. When RESTYLING a real person
  or product into a genre look, the reference alone isn't enough: also name what
  must NOT change ("warm olive skin, NOT dark brown"; "matte label, NOT glossy"):
  models drift to genre stereotypes unless explicitly negated.
- **i2v: motion without re-rolling the look.** Lock the composition as a STILL first
  (cheap, seconds to iterate), get it approved, then animate the winner. Frame one is
  the approved image; the prompt describes only the motion. This is why the tier
  pipeline starts with a source frame: t2v re-rolls the look and the motion at once,
  which is two lotteries instead of one.
- **Reference-driven: consistency across a set.** Campaign families, a recurring
  character, a brand style applied to many scenes: pass references (Seedance 2.0 ref
  arrays, Kling Omni `reference_images`, NB2 fusion for stills) instead of hoping
  prompt phrases re-summon the same look. One approved asset becomes the anchor for
  every sibling.
- **Start + end frame: the motion has a destination.** When a clip must LAND
  somewhere (a cut point in a sequence, an end-frame holding text space), set the end
  frame (`end_image` / `last_frame` / `last_frame_image`: registry cheat sheet for which
  families support it) instead of prompting toward it and praying.
- **The stitched sequence: style still → i2v → frame-piecing.** The field-tested
  route to >15s, scene-consistent video from 5-15s models: (1) define the LOOK as a
  still with the strongest image model for the job (i2i from the real subject when
  one exists), get it approved; (2) animate the approved still via i2v: frame one
  is the style lock; (3) chain clips by bridging frames: clip N's last frame (set
  `end_image` where supported, else extract it with ffmpeg) becomes clip N+1's start
  image; wan-2.7-i2v also takes the previous clip itself as `first_clip`, so the look
  never re-rolls between cuts; (4) normalize dimensions/fps and
  stitch with ffmpeg concat; (5) lock the picture cut FIRST, then layer audio
  (VO/music/SFX) in one post pass: never bake audio per-clip into a sequence.
  Stylized/illustrated characters: first-frame i2v + post-mixed VO beats the
  lip-sync path. Some reference pipelines make first-frame and reference-audio
  mutually exclusive, and stylized characters read fine without lip sync.

**The cost logic that governs all of it:** images are pennies and ~30 seconds; video
is dimes-to-dollars and minutes. Settle the LOOK in image space, spend in video space
only on approved looks. Iterating a look inside a video model is the most expensive
way to art-direct.

## 3. Brand / style understanding: the style capsule

A brand's look should not live in your working memory; it dies at session end. Distill
it into a **style capsule**, a 4-6 line reusable block:

```
palette:      <hex values + plain-language color story>
lighting:     <the exact phrase, e.g. "warm window light, soft shadows">
finish:       <grain/texture/render quality, e.g. "analog film grain, matte">
composition:  <habits, e.g. "centered subject, generous negative space">
tokens:       <era/genre anchors, e.g. "8-bit", "Y2K editorial", "Kinfolk minimal">
never:        <the avoid-list, verbatim>
```

Source it from `./brand/creative-kit.md` when one exists; otherwise extract it from
example assets the user provides. Read the images, describe what you literally see,
and confirm the capsule before using it. Save capsules to
`./brand/creative-kit.md` under `## Style Capsules`, **named per campaign or look**
("8bit-promo", "ugc-natural", "spring-editorial") so styles survive across sessions,
campaigns, and model swaps.

Worked capsule, a genre look ("8bit-promo"):

```
palette:      saturated primaries + warm sunset oranges, 16-bit console range
lighting:     flat 2D sprite shading, no realistic light sources
finish:       chunky visible pixels, dithered gradients
composition:  game-UI framing: HUD bars, menu boxes, overworld map views
tokens:       16-bit SNES RPG, classic JRPG overworld, pixel sprite
never:        smooth vector edges, photoreal textures, modern flat-design icons
```

The capsule is the pattern; the genre is the variable. Any aesthetic (claymation,
brutalist editorial, hand-drawn, photoreal) gets the same six lines. Learn what made
a look work and capture THAT; never carry one campaign's aesthetic into the next brief
uninvited.

Genre tokens land hardest with an ERA anchor plus a named-aesthetic anchor (a
recognizable game/film/editorial look), not adjectives alone. When a capsule restyles
a real subject, the subject's reference image rides along with the capsule on every
call: the capsule sets the world, the reference holds the identity.

Usage: every generation PREPENDS the active capsule to the prompt: same capsule, any
model. When the user says "in our style," the capsule is what that means; if no capsule
exists yet, building one is the first deliverable, not a detour.

## 4. Moodboarding and variants

Direction-finding is an image-space job at workhorse prices:

1. **Grid:** 4-8 genuinely different directions on image-default (NB2), one image
   each, ~$0.30-0.55 total at 1K ($0.067/image). Different directions, not eight crops of one idea.
2. **Pick:** present pre-ranked with a one-line vibe + risk per direction; user picks
   or combines.
3. **Lock:** write the winner into a style capsule (above).
4. **Variants of the winner only:** never variant the losers.

Variant discipline. Vary ONE axis at a time, and label which axis each variant moved:

- **Seed-locked prompt iteration** (fix seed, change one prompt clause) isolates what
  your wording did; for refining a look.
- **Prompt-locked seed exploration** (fix prompt, roll seeds) samples the model's
  range on a settled prompt; for picking the best of a direction.

Registry cheat sheet says which models respect seeds. Where seeds aren't supported
(NB2 family), iterate via fusion: feed the previous winner back as `image_input`.

## 5. Platform / use-case map

| Use case | Default route | Shape of the asset |
|----------|---------------|--------------------|
| UGC ad (TikTok/Reels/Meta) | video-ugc (Seedance 2.0), 9:16 | imperfect-real, hook lands <2s, captions-on design |
| Polished brand spot | video-reference (Seedance 2.0) or video-production (Kling 3.0) | cinematic grammar (product-video mode), 16:9 or 9:16 |
| Product detail / e-comm | i2i edit of the REAL photo (NB2 fusion / GPT Image 2.6 Sunburst) | fidelity first: the actual product, cleaned up |
| Social graphics with text | image-default (NB2); exact/dense text → image-complex-prompt (GPT Image 2.6) | platform-ratio, text legible at feed size |
| Hero / launch | image-premium-4k still + video-premium trio | parallel takes, pre-ranked, ≥$2 confirm |
| Moodboard / direction | image-default (NB2) grid | 4-8 directions, pennies, then lock a capsule |

## 6. When to reach for a dedicated platform (beyond Replicate)

```
last-verified: 2026-11-13 · ttl-days: 60 · refresh: re-check each platform's current offering + whether Replicate-hosted equivalents have closed the gap (2026-11-13: Replicate availability re-checked; vendor feature claims carried from 2026-09-02)
```

These are separate subscriptions/API keys. Route there on RECURRING need, not for a
one-off. The middle ground is real now: both vendors publish official models on
Replicate (checked 2026-11-13): `elevenlabs/v3`, `elevenlabs/flash-v2.5`,
`elevenlabs/music`, `elevenlabs/dubbing`; `heygen/avatar-v`, `heygen/lipsync-precision`,
`heygen/lipsync-speed`, `heygen/video-translate`, so a one-off at vendor quality needs
no new key. None are on the roster yet (untested here); add one the registry way
(roster block + section + verify) when a brief needs it.

Our pick for voice is ElevenLabs (free tier, then plans), so its row below is the first
platform to reach for when the recurring need arrives. Without a key, the Kling lip-sync
model's built-in TTS or any quick TTS covers a script test.

| Platform | Reach for it when | Stay on the Replicate roster when |
|----------|-------------------|-----------------------------------|
| **ElevenLabs** (TTS/voice; Eleven v3 went GA 2026-03-14: inline audio tags for emotional direction, 70+ languages; Flash v2.5 for real-time; Eleven Music for scores) | Voice QUALITY is the product: branded voice cloning, consistency across episodes/campaigns, multilingual dubs, fine pacing control for talking-head pipelines | One-off VO or script-iteration tests → lipsync-kling built-in TTS or any quick TTS is enough |
| **HeyGen** (avatars; Avatar V in 2026: photo-avatar flexibility with video-avatar realism from a 15s recording, plain-English Custom Motion since May 2026, up to three avatars in a scene, 30-minute videos, Seedance 2.0 integrated for identity-verified faces) | A consistent branded avatar/presenter at VOLUME, or multilingual lip-synced localization as an ongoing program | One-off lip-sync or a presenter built from our own spokesperson pack → lipsync roles + video-reference cover it |

State the trade-off honestly when recommending: a new subscription + key vs marginal
quality, and what the recurring volume is that justifies it.
