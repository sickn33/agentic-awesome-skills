# Product Video Mode

Cinematic product motion through the tier pipeline: cheap drafts to find the move,
production money only on the chosen direction, premium trio only on explicit "hero".
The craft here is the 8-layer shot grammar. These models were trained on film
language, so speak it. This is the floor, not the ceiling. When the situation argues
for a better path, take it and say why.

**Before generating:** when the role pick or the i2v/t2v call isn't obvious, load
`references/model-routing.md`: the job→model matrix and modality decision tree live
there (including **video-ugc** for handheld ad-native looks). Resolve roles in
`references/MODEL_REGISTRY.md` (drafts =
**video-draft**, finals = **video-production**, locked camera = **video-locked-camera**,
character/reference work = **video-reference**, hero = **video-premium** trio); follow
`references/api-workflow.md` for calls, frame-extraction QA, saving, manifest; read
`./brand/creative-kit.md`. The cross-model parameter cheat sheet in the registry is
mandatory reading before writing any payload: every family names the start-image and
duration params differently.

---

## I2V beats T2V: start from an approved frame

Image-to-video gives you a directed shot: frame one is exactly the approved still, the
product is locked, and iteration changes motion without re-rolling the product. T2V is
a lottery. Use it only when no source image exists or you're exploring composition
itself. If there's no approved still, route through product-photo mode first; a still costs a
fraction of a video, so approving the look there is the cheapest quality control in the pipeline.

**I2V prompt rule:** describe the MOTION, never the scene. The model sees frame one.
"Camera slowly orbits right, label rotates into view, reflections sweep across the
glass", not "a bottle on a table."

## The 8-layer shot grammar

The default discipline: drafts run 4-5 layers, production and premium prompts all
eight. Drop a layer only when it genuinely adds nothing to the shot.

```
1 SUBJECT     What's in frame, exactly (materials, state, position)
2 EMOTION     The feeling the shot evokes (desire, calm, urgency)
3 OPTICS      Lens + aperture: "85mm prime f/1.4", "100mm macro f/2.8"
4 MOTION      Named camera move: "slow dolly in", never "camera moves forward"
5 LIGHTING    Cinematography terms: "Rembrandt lighting", "golden hour", "rim light"
6 STYLE       Grading + body: "teal and orange grade, film grain, shot on Arri Alexa"
7 AUDIO       Only if the model generates it: "ambient room tone, no music"
8 CONTINUITY  Multi-shot sets: repeat exact wardrobe/prop/lighting phrases verbatim
```

**Weak:** "A leather wallet on a wooden surface"
**Strong:** "Extreme close-up of a hand-stitched leather bifold wallet, warm amber side
lighting casting long shadows across the grain, 100mm macro f/2.8, slow 180-degree
orbit revealing patina and thread detail, shallow DOF with dark bokeh background, shot
on Arri Alexa, warm analog film grain, no text overlays"

### Cinematography vocabulary (use these exact terms)

- **Camera:** slow dolly in · pull back · smooth orbit / 180-degree arc · crane shot
  rising · low angle push-in · tracking shot · steadicam follow · whip pan · rack
  focus · static locked-off frame
- **Lenses:** 85mm prime f/1.4 (product/portrait, creamy bokeh) · 35mm f/2.8
  (environmental context) · 100mm macro f/2.8 (texture) · 24mm f/5.6 (establishing)
- **Lighting:** Rembrandt · butterfly · rim lighting / backlit silhouette · golden
  hour · studio softbox · chiaroscuro
- **Grading:** teal and orange · desaturated cool tones · warm analog film grain ·
  high contrast deep blacks

### Seed-controlled iteration

Where a model supports seeds (registry cheat sheet says which), fix the seed while
iterating prompts. It isolates what your wording change actually did. Change one
layer per iteration. Record seeds in the manifest so production re-rolls match drafts.

## Motion styles: match motion to positioning

Wrong motion cheapens a product faster than wrong lighting. Five directions for the
draft round (pick 3-5 that fit, generate as drafts, present pre-ranked):

| Style | Fits | Avoid for |
|-------|------|-----------|
| **Slow Reveal** | luxury, beauty, food | anything needing energy |
| **Orbit Showcase** | practical, e-commerce, watches | mood-first brands |
| **Floating Premium** | tech, premium gadgets | grounded/organic brands |
| **Dynamic Energy** | sports, gaming, bold DTC | luxury (speed reads cheap) |
| **Contextual/Lifestyle** | fashion, home, food, relatable DTC | spec-driven tech |

**Slow Reveal**: builds anticipation; the luxury default.
```
Slow cinematic push-in toward [product], smooth elegant motion, dramatic spotlight
with subtle light shifts, atmospheric dust particles drifting through the beam,
premium commercial reveal, luxurious pacing
```
Variations: gradual brightness (dawn reveal) · side-light sweep (sculptural) ·
emerging from darkness (mystery).

**Orbit Showcase**: informational, can still be premium. Camera orbits; the product
stays still and centered.
```
Camera smoothly orbits [product], elegant 180-degree arc, lighting shifts revealing
different surfaces, product perfectly centered, professional showcase, smooth
continuous motion
```
Variations: low-angle orbit (imposing) · half-orbit with return · orbit + slow zoom.

**Floating Premium**: weightless, dreamlike; the tech-launch look.
```
[Product] floating weightlessly, gentle hovering with subtle micro-movements, soft
rotating drift, clean minimal environment, dreamlike ethereal motion, premium tech
aesthetic
```
Variations: subtle particle field · gentle light ripples · breathing motion.

**Dynamic Energy**: impact and speed.
```
Dynamic reveal of [product], fast camera sweep with dramatic angles, impact moment,
bold lighting changes, kinetic energy, sports commercial aesthetic
```
Variations: whip-pan reveal · crash zoom · rhythmic stop-motion beats.

**Contextual/Lifestyle**: the product in believable motion.
```
[Product] in [setting], natural environmental motion: [hands reaching / wind /
steam / light shifting], lifestyle commercial quality, authentic not over-produced
```
Variations: morning-light time shift · hand reach/grab · condensation forming.

Category cues: tech = controlled reflections sweeping metal, subtle indicator glow;
fashion = natural fabric flow and wind; food = steam/pour/drip in motion; jewelry =
light dancing across facets (controlled, never chaotic); furniture = window light
shifting in a styled room.

## Camera motion vocabulary

| Movement | Use for | Speed guidance |
|----------|---------|----------------|
| push-in | reveals, intimacy, focus | slow = premium, fast = urgency |
| pull-out | context reveal, endings | slow |
| orbit / arc | 360 showcase, features | moderate, steady |
| dolly (lateral) | scanning, panning reveals | moderate |
| crane rising | grand reveals, overhead | slow |
| tracking / steadicam | lifestyle, following action | natural |
| whip pan / crash zoom | drama, energy beats | fast, sparingly |
| static locked-off | clean product shots | none (video-locked-camera role) |

Subject motion: float (tech/dreamlike) · rotate (feature reveal) · shimmer (light
across surface: luxury) · settle (endings) · rise (emergence). Atmosphere: particles,
animated bokeh, light shifts, moving reflections, traveling shadows. One or two,
never all five.

## The pipeline applied

```
1 SOURCE   Approved still (product-photo mode) at the target ratio.
2 DRAFTS   3-5 motion variants on video-draft (draft-tier cost per MODEL_REGISTRY, 720p). Genuinely
           different moves, not five orbit speeds. Extract frames, QA, present
           pre-ranked with reasons.
3 PICK     User picks the direction (or funds one more draft round).
4 FINALS   Winner on video-production: full res, native audio only if it ships
           with audio (audio adds to the per-second price; the registry has the exact surcharge). Reuse the draft prompt + seed discipline.
           Locked-off product shots → video-locked-camera with camera_fixed.
           Character/object consistency across shots → video-reference.
5 HERO     ONLY on explicit "hero": premium trio in parallel on the winning prompt,
           QA all three, present pre-ranked. Total the three prices from the registry and confirm first (≥$2 rule).
```

Cost discipline per SKILL.md: drafts never need confirmation; confirm ≥$2 (hero trio,
long multi-clip runs, audio-on 15s finals).

## Clip sequences: longer content

Models peak at 5-8s; 10s+ single takes dip mid-clip. Longer pieces are PLANNED
sequences of short clips that cut together, which is also how real commercials work.

Sequence planning before any generation, per clip: purpose (establish / reveal /
detail / context / close), camera move, duration; same source image for all clips
(product consistency); identical lighting phrases (layer 8); vary angle and distance
between clips (that's what makes cuts feel professional); end each clip in a state
that cuts to the next; `end_image`/`last_frame` params (registry) control endpoints.

**Frame bridging, past the model's ceiling:** when a sequence outruns the longest
single take, or consecutive clips must feel like one continuous scene, chain through
frames: clip N's final frame (set `end_image` where the family supports it, else
extract per api-workflow §2) becomes clip N+1's start image. The approved-still
discipline applied recursively: the look never re-rolls between cuts. Assembly:
normalize every clip to identical dimensions/fps first, then ffmpeg concat; audio is
a separate pass after the cut is locked (Audio strategy below).

Proven structures: **Classic reveal** (4×5s: dark establish → orbit features → macro
detail → hero landing) · **Lifestyle story** (context → product enters → in use →
aspirational hero) · **Feature walkthrough** (hero → 3 details → pull-back close) ·
**Quick social cut** (3×5s: hook → detail → clean end-frame with text space). Generate
all clips in parallel; run the sequence as drafts first, finals after the cut is approved.

**Worked sequence (classic reveal, headphones):**

```
Clip 1 Emergence:   Headphones emerging from darkness, single spotlight gradually
                    illuminating from above, particles catching light, slow reveal
Clip 2 Orbit:       Camera orbits at close range, ear-cup texture and brushed
                    aluminum details, controlled reflections, steady motion
Clip 3 Float:       Weightless hover, soft rotating drift revealing both sides,
                    minimal dark environment, ethereal motion
Clip 4 Landing:     Settling onto reflective surface, dramatic front angle,
                    premium closing shot, end-frame holds for text
                    (all clips: same source image, same lighting phrase, 16:9)
```

## Audio strategy

Three options, chosen by destination, not by default:

1. **Model-native** (production and some premium models, `generate_audio`/always-on;
   registry per model): good ambient/product sound; adds cost where toggleable (see the registry). Use for
   site heroes and TikTok food/texture content.
2. **Silent + post:** the professional default for sequences and anything getting
   music/VO. Feeds auto-mute anyway; most social viewing is silent. Design for
   silent-first, audio as enhancement. The post mix that works: VO at full volume,
   music ducked to ~10% with fades, SFX placed on cut points (`adelay`); use
   `amix … normalize=0` so simultaneous layers don't crush the VO, and `-shortest`
   to trim picture to the VO. Audition music as 3 contrasting tracks and let the
   user pick BEFORE mixing. A wrong vibe costs a full render cycle, and track
   energy must match cut speed (slow lo-fi over fast cuts jars).
3. **TTS voiceover:** generate silent, add VO via talking-head mode's TTS guidance.
   5s of video fits ~10-15 words. VO-led sequences run VO-FIRST: generate and
   approve the narration, measure its real duration (ffprobe), and build the scene
   timeline to it: scenes flex, narration doesn't. Caption timing comes from a real
   transcript of the VO with timestamps, never word-count estimates; burn captions
   as ASS subtitles (drawtext timing expressions are fragile).

Where audio always ships silent: e-commerce listings, feed posts that get platform
music. Review always-on audio (some premium models). Strip in post if it distracts.

## Platform targets

| Destination | Ratio | Duration | Notes |
|-------------|-------|----------|-------|
| TikTok / Reels | 9:16 | 5-15s | Hook inside ~1.7s; native > polished |
| Instagram feed | 1:1 / 4:5 | 5-10s | Seamless loops perform; first frame = thumbnail |
| Site hero | 16:9 | 5-8s | Clean loop or freeze-end; silent autoplay |
| Product page | 16:9 / 1:1 | 5-15s | Informational motion (orbit, features) |
| YouTube pre-roll | 16:9 | 6-15s | Hook before the 5s skip; audio required |
| Bumper | 16:9 | 5-6s | One message, one visual |

Square (1:1): the registry cheat sheet shows which families support it natively;
others generate 16:9 and crop in post. Vertical: compose for the middle of frame;
platform UI eats top/bottom.

## Prompt starters (full 8-layer examples in the field)

```
HERO REVEAL    [Product] centered on [surface], dramatic single spotlight upper left,
               100mm macro f/2.8, slow 5s push-in revealing texture and craftsmanship,
               shallow DOF dark bokeh, Rembrandt lighting, shot on RED Komodo,
               high contrast deep blacks, premium commercial reveal
ASMR TEXTURE   Extreme close-up, hands interacting with [product], [specific texture],
               100mm macro, slow deliberate motion, warm side light, ASMR commercial
               aesthetic, shallow DOF, analog film warmth
BEFORE/AFTER   Split composition, [problem state] cool desaturated left, [product
               solution] warm saturated right, smooth wipe left-to-right over 5s,
               lighting shifts flat to dimensional
LIFESTYLE      [Product] in [specific scenario], 35mm f/2.8, gentle handheld motion,
               golden hour through window, natural palette, subtle DOF
UGC CLOSE-UP   Casual handheld close-up, slightly imperfect framing, window daylight,
               smartphone aesthetic, hands turning product to show detail
```

## The 80/20

80% of results: (1) a quality source image via I2V, (2) motion style matched to
positioning, (3) speed matched to the price point, (4) clean simple motion prompts.
Classic mistakes: over-animating (motion chaos cheapens), 10s when 5s cuts better, T2V
when a still exists, and iterating on a broken foundation: if the draft is
fundamentally wrong, change the style or the family, don't polish it.

## QA additions for this mode

Frame-extraction QA per api-workflow.md §2 on every clip, plus: product remains
recognizable the whole duration (morph check across the three frames), motion speed
matches positioning, no edge warping (fast camera moves on some models), first frame
works as a thumbnail, loop point clean if looping. Common fixes: morphing → simpler
motion + I2V; too fast → "slow, elegant, deliberate"; unwanted elements → simplify
prompt or switch family; mid-clip quality dip → shorter clips, stitch.

## Output

`creative-output/videos/<product>/{drafts,production,premium,sequence,approved}/`,
named `[style]-[model-shortname]-[ratio]-v[N].mp4`, manifest updated per clip with
prompt/seed/cost/qa_score, one line per asset to `./brand/assets.md`. Delivery =
standard contract, drafts presented pre-ranked with a one-line reason each, finals shown as
passing with a flaw named only if one remains (scores and cost stay in the manifest). Route onward:
needs a speaking human → talking-head mode; ad cells → ad-creative mode naming.
