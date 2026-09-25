# Model prompting adapters

The crew's decisions are model-agnostic. This file turns them into the phrasing each model
family tends to follow best.

> Video models change every few months. Treat these as conservative defaults, check the
> model's current docs for hard limits (clip length, resolution, prompt length), and send a
> PR when something here goes stale.

## Generic adapter (use when the model is unknown)

One paragraph, present tense, concrete, in this order:

1. Shot size, lens, camera move
2. Subject (verbatim from the continuity bible)
3. The one action
4. Location (verbatim)
5. Lighting
6. Look / film stock
7. Audio (only if the model generates audio)

~40–90 words. Longer is fine for open-weights models; shorter for models with prompt
rewriting ("prompt enhancement") turned on.

## Open-weights models (Wan, HunyuanVideo, LTX-Video, Mochi, CogVideoX…)

- **Be literal and long.** These models generally reward detailed, chronological,
  paragraph-style descriptions (roughly 60–150 words): what's in frame, what moves, in
  what order.
- **Describe motion in sequence:** "…lifts the cup, pauses, then sets it down."
- **Use the negative prompt** if your workflow exposes one:
  `blurry, warped hands, extra fingers, morphing, flicker, text, watermark, logo, static frame, oversaturated`
- **Seed discipline:** when rerolling to test a single change, keep the seed fixed so you
  isolate the effect of the change.
- Clip length is bounded by frame count and VRAM. Plan short shots and cut them together.

## Kling

- Structure: subject → movement → scene → camera → lighting → atmosphere.
- Keep it tighter than open-weights prompts; one clear action.
- Clip length is chosen from presets (commonly 5 s or 10 s). Plan with the editor's
  fixed-length rule.
- Negative prompt: use it where your version/interface exposes the field.
- Some newer versions can generate audio. If yours does and the user wants in-model
  sound, apply the audio rules from the Veo section; otherwise keep sound out of the prompt.
- Image-to-video: describe only the motion and the camera; the image already carries the
  look.

## Veo (and other models that generate audio)

- Write sound explicitly, as its own sentence(s):
  - Dialogue: `The barista says, "Sorry — my fault."`
  - SFX: `SFX: paper cup hits tile, liquid splash.`
  - Ambience: `Ambient café murmur, espresso machine hiss.`
- Keep dialogue short (one line per shot). Long lines drift out of sync.
- Camera and lens terminology is followed well; use it.

## Seedance and other multi-shot-capable models

- If your version supports multiple shots in one generation, you can write the sequence
  explicitly: `Shot 1: … Cut to Shot 2: …`. Keep each shot to one action and restate the
  character descriptors in each.
- If you need tight control, still generate shot by shot and cut in the edit.

## Hailuo / MiniMax

- Camera moves can be stated plainly in the prompt ("slow push-in", "pan left"). Some
  versions and front-ends accept bracketed camera commands such as `[Push in]` or
  `[Pan left]`; use them if your interface documents them.
- Keep one move per shot even when the syntax allows chaining several.

## Runway / Luma / Pika / Sora-style prompt-enhanced models

- These often rewrite your prompt. Put the non-negotiables first (subject descriptors,
  the action, the camera move) and keep the prompt short enough that the rewrite doesn't
  bury them.
- For image-to-video: motion + camera only.

## Image-to-video (every model)

The most reliable way to keep a character consistent across shots:
1. Generate or pick **one** reference still per character/location.
2. Use it as the first frame for every shot where they appear.
3. In the prompt, describe **only** what moves and how the camera moves.

## Clip length cheat sheet

Check your model's current limit. Common ranges in practice: 4–10 s per generation.
The editor role should never plan a shot longer than the limit minus ~1 s of handles.
