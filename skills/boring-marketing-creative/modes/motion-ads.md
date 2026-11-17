# Motion Ads Mode

The code route for video ads: cut real or generated footage together with captions, overlays,
review cards and end cards, written as HTML and rendered to MP4 on your own machine. No per-render
fee and no key. The footage comes first: the owner's phone, a customer, a creator, or clips
generated from the product reference image. Code does the editing that makes footage into an ad:
the hook on frame 0, captions for muted viewers, the proof card, the offer, three hook variants from
one body, and every size. This is the floor, not the ceiling. When the situation argues for a better
path, take it and say why.

Text-only motion (kinetic type with no footage) stays for two jobs only: around a SaaS screen
recording, and as a 2 to 3 second offer bumper at the end of a footage cut. It is never the main ad
for a physical product: of 94 live DTC videos we viewed frame by frame, 61 were phone footage, 19
studio, 6 mixed and only 8 motion graphics.

Done = one MP4 per placement size, checked by the renderer, looked at frame by frame, named by
matrix cell when there is one, with the project source saved so it re-renders.

---

## What we use

**HyperFrames** (by HeyGen, Apache-2.0): you write HTML, CSS and a GSAP timeline, and its CLI
renders the page frame by frame in headless Chrome and encodes MP4 with FFmpeg, audio included. It
needs Node 22 or newer and FFmpeg; the CLI downloads its own Chrome. Run
`npx hyperframes@0.9.8 doctor` to see what's missing. Free, no account, no per-render fee.

**Remotion** (React to MP4) is the alternative when your team already writes React. It is free for
individuals, non-profits and for-profit companies with up to 3 employees; bigger companies need a
paid company license, and a pending Remotion 5 change counts contractors toward team size, so check
remotion.dev/license before you build on it (checked 2026-11-16).

**Footage you don't have** comes from the model route: Higgsfield Marketing Studio video for a
presenter or UGC-style clip, Seedance 2.5 (through Higgsfield or Replicate) for b-roll, foley and
talking-object skits. See "Generated footage" below.

## What to collect first

Real material only. Ask for whatever is missing in one message:

- **The clips.** Phone video in 9:16 from the owner, staff, a customer or a creator, following the
  shot list from ad-creative mode: three openings, the product in use, the result. Footage the
  business owns or has permission to use.
- The hook, the offer and the landing page the ad points to. The offer on screen must match that
  page.
- The proof: reviews verbatim with where each came from, before and after photos with dates,
  numbers with a source, screenshots at 2x.
- A real photo of the product in use for the end card, logo, brand colors as hex and brand fonts (or
  one display and one text face from Google Fonts).

If a matrix cell drives the ad, read its hook, format and copy from `ad-matrix.json` (ad-creative
mode). Read `./brand/creative-kit.md` for colors, fonts and the avoid-list.

## The workflow

Tested end to end on 2026-11-16 with version 0.9.8. Keep every command on the same version as
`init`; the project's npm scripts pin it, and the CLI ships new versions almost daily.

```bash
npx hyperframes@0.9.8 init ad-9x16 --example blank --non-interactive --skip-skills
cd ad-9x16
# 1. Normalize every clip to the frame first (phones shoot odd sizes and frame rates):
ffmpeg -i raw/hook-a.mov -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1" \
  -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -ar 48000 assets/clips/hook-a.mp4
# 2. Word timings for captions (local speech model, installs on first use):
npx hyperframes@0.9.8 transcribe assets/clips/body.mp4 --to srt
# 3. Write index.html from references/motion-ads-starter.html; self-host fonts in assets/fonts/.
npx hyperframes@0.9.8 check --json 2>/dev/null          # fix every error, read every warning
npx hyperframes@0.9.8 snapshot --at 0,1,3.5,5,8,11,14.5 --no-end --json   # returns a contact sheet
npx hyperframes@latest check --safe-zone reels           # optional, see Safe zones
npx hyperframes@0.9.8 render --quality delivery --fps 30 --output renders/MA-H2-B-9x16-v1.mp4
# 4. Hook variants from the same project:
npx hyperframes@0.9.8 render --quality delivery --fps 30 \
  --variables '{"hookClip":"assets/clips/hook-b.mp4","hookText":"Second opening"}' \
  --output renders/MA-H2-B-9x16-var-hook-2-v1.mp4
```

- **check** runs lint, a headless-browser pass, layout, contrast and a craft pass that catches
  unreadable text. `--json` prints progress on stderr, so `2>/dev/null` keeps the JSON clean.
- **snapshot** saves full-size PNGs at the seconds you name plus a contact sheet. Read the contact
  sheet critically (the visual check below): frame 0, each cut, the proof card, the end card.
- **render** at `--quality delivery`. The starter's 16 seconds at 1080x1920 with three clips and
  audio rendered in about 9 seconds on an Apple silicon laptop at draft quality.
- **A still is free too.** `snapshot --at <time> --no-end` writes a full-size PNG, so a text-exact
  still (an offer card, a review static, us vs them) can be set in HTML over a real or generated
  photo and exported letter-perfect.

If npx fails with "Permission denied" on its own binary, a shared npm cache is stale. Point npm at a
fresh one for the session: `export npm_config_cache="$PWD/.npm-cache"`.

## Authoring rules that keep the render clean

The root element carries `data-composition-id`, `data-start="0"`, `data-duration`, `data-width` and
`data-height`. Every timed element gets `class="clip"`, `data-start` and `data-duration`. Register
one paused GSAP timeline on `window.__timelines["<id>"]`. No `Date.now()`, no unseeded
`Math.random()`, no fetching mid-render.

**Footage.** Each clip is a top-level `<video class="clip">` with absolute `data-start` and
`data-duration`, trimmed with `data-media-start`. A clip with speech keeps its sound
(`data-has-audio="true"`, no `muted`); b-roll is `muted`. `data-volume`, `data-fade-in` and
`data-fade-out` set levels and clip-edge fades. Media never plays or seeks from GSAP; the runtime
does that from the attributes. Use a separate `<audio class="clip">` for a voiceover.

The gotchas, each one hit in practice:

1. **Keep timed elements top level with absolute times.** Captions, the review card and the end card
   are each their own `.clip` at the root, so their times never depend on a parent.
2. **Captions as phrase chunks, not one word per chunk.** A chunk of 2 to 4 words stays up for its
   words (about 1.1 seconds or more, or check's `line_unread` fires), and each word lights up at its
   own start time with one tween per word span. Put the words on a dark box: white text over bright
   footage failed the contrast check until it had one.
3. **Self-host every font.** Lint fails any family with no `@font-face`. Download the latin `.woff2`
   of each weight, declare `@font-face`, and write the literal family name in every `font-family`.
4. **Initial hidden states go in `gsap.set` outside the timeline.** A `tl.set` at 0 does not render
   while the playhead sits at 0.
5. **One element, one tween.** A second tween on the same element late in the timeline may not
   render. Use a wrapper for exits and pulses.
6. **Never tween letterSpacing** (or width, height, top, left). Animate transforms and opacity only;
   for a spreading word, animate each letter's `x`.
7. **SVG strokes show their round cap at zero length.** Hold the path's wrapper at opacity 0 until the
   draw starts and draw with an `out` ease.
8. **Hook variants through `--variables`.** The starter swaps the hook clip and line from
   `data-composition-variables` before the timeline is built. Check warns
   `media_runtime_src_mutation` for this; the swap is synchronous and rendered correctly in testing,
   but look at frame 1 of each variant.
9. **Decoration that overflows** (a scaled photo, a shade layer) gets `data-layout-ignore`.
   `nested_structure_needs_subcomposition` warnings only affect the Studio timeline view.

## Sizes and safe zones

Build each size as its own composition: copy the project folder, change the size and re-lay out. A
9:16 shrunk into a square makes every word smaller, and a 4:5 cropped from a 9:16 can cut the hook.

| Size | Runs on | Keep every word and logo inside |
|---|---|---|
| 1080x1920 | Meta Reels and Stories only | x 65 to 1015, y 269 to 1248 (Meta's stated zone: top 14%, bottom 35%, 6% a side) |
| 1080x1920 | one master for Reels, TikTok and Shorts | x 120 to 888, y 288 to 1248, and below y 840 stay left of x 780 (TikTok's buttons) |
| 1080x1350 | Meta feed 4:5 | 65px side margins; keep the bottom ~135px light (CTA overlay) |
| 1080x1080 | Meta feed 1:1 | 65px side margins; keep the bottom ~108px light |

The Meta numbers match `meta-ads` `references/meta-facts.md`. The one-master band is the overlap of
the Reels, TikTok and Shorts zones that HyperFrames checks against. On newer versions,
`check --safe-zone reels` (or `tiktok`, `shorts`) flags any text outside them; 0.9.8 lacks the flag,
so run that one check with `@latest`, which only reads. Footage, photos and decoration fill the whole
frame. Only words, logos, prices and the CTA need the band.

## The cuts

Each is a beat plan over footage. Formats and real examples are in `references/ad-formats.md`; the
openings are in `references/hooks.md`. Captions run on every spoken word in every cut.

**1. UGC or creator cut (the starter).** 0 to 3s the hook clip with the hook as a native text box on
frame 0; 3 to 10s the body, product in use, captions; 10 to 13.5s the result with a real review card
over it; last 2.5s the end card on a real photo. Film three openings and render three variants from
one body. The median live video we viewed ran 34 seconds; cut a 15-second version from the same
project by trimming the body.

**2. Hands demo or recipe cut.** No face needed. Clips of the steps, a short step label on each
("Step 2: three dashes of bitters"), the payoff shot, the product beside the result, the end card.
Native foley from the footage, or from Seedance 2.5 clips.

**3. Review card over footage.** The review sits on a card over the product in use, never on an empty
background. One real review per card, verbatim, first name and last initial with permission, stars
only if the review had them. Never stitch two reviews into one. Mark one phrase with a highlight
under the words; a bar through the middle reads as a strikethrough at feed size. Place the card where
it doesn't hide the product.

**4. Before and after.** Real photos or clips, same angle, same light, the time between stated. Wipe
with transforms only: the "after" wrapper slides in on `x` while the image inside slides the
opposite way, so the picture stays put. Typical results only; no body, health or income
before-and-afters on Meta.

**5. Reply to a comment.** A comment bubble at the top of the frame from frame 0 (the real comment, as
written, name blurred unless they agree), then the answer on camera with captions, then the proof.

**6. Screen recording with a face (SaaS).** A real screen recording at 2x, a face cam in a corner,
captions, a slow push (scale on a wrapper) toward the one element that matters. Kinetic text may
carry the hook and the step labels here. Real UI only, customer data blurred, nothing that doesn't
ship.

**7. Offer bumper.** 2 to 3 seconds at the end of any cut: the offer, the terms in plain words, one
CTA, over the last frame of footage or a real product photo. Check the math on screen. This is the
only place a text-only card belongs in a physical-product ad.

## Generated footage

When a shot can't be filmed, generate it, then cut it like any other clip. The route, tested
2026-11-16:

- **A presenter or UGC-style clip:** Higgsfield Marketing Studio video. In the test it made the most
  convincing face-to-camera presenter of anything we tried (75 credits, about 2 minutes for 15
  seconds at 720p) and stayed within the facts given, but garbled one phrase, swapped a pour-over
  for a French press and added no captions. Use the how-to, unboxing, product showcase or TV spot
  modes; never `product_review` with an AI presenter, which is a fake testimonial.
- **B-roll, foley and talking-object skits:** Seedance 2.5, through Higgsfield or Replicate.
- **Captions and assembly:** here, in HyperFrames, or with ffmpeg for a plain join.

Setup, commands and what Higgsfield's API covers are in `references/ad-formats.md` ("Higgsfield for
ads"). Payloads and prices for Replicate: `references/MODEL_REGISTRY.md`. Check the ad platform's
current AI-content disclosure rules for photorealistic AI people.

From a real batch made this way (10 images, 5 clips):

- **Make a product reference image first** with GPT Image 2.6 Sunburst from the real product photo,
  and pass it into every scene and every first frame. The bag stayed the same across all 15 assets.
- **Start each clip from a crisp first frame with small motion.** A bag turned mid-clip garbled a
  sticker date; re-run from a first frame with the sticker sharp and facing camera, prompted "small
  natural handheld motion only", and the date stayed readable.
- **Use Seedance 2.5's native audio as foley:** "Natural sounds only (foil crinkle, beans into a
  grinder). No speech, no music."
- **Dialogue in double quotes comes out exactly.** Check every generated clip with
  `npx hyperframes@0.9.8 transcribe` against the script, then burn in captions anyway.
- **The talking object works:** one GPT Image 2.6 frame of two products with cartoon faces, then
  Seedance 2.5 image-to-video with three lines of quoted dialogue, about 10 seconds.
- **Set Python's User-Agent** when calling Replicate with urllib, or it returns 403.

Generated footage never shows the product doing what it doesn't, never stands in for a customer or an
expert, and carries the platform's AI label where required. An AI presenter may demonstrate or
present; it never gives a testimonial.

## Pairing

- **Voiceover.** We use ElevenLabs for a consistent brand voice (free tier, then plans). The free
  path runs locally: `npx hyperframes@0.9.8 tts "script" --voice am_michael -o assets/vo.wav`. Place
  it as `<audio class="clip" data-start=... data-duration=...>`, then transcribe it to time the
  captions. A real person's voice beats a synthetic one for anything in the first person.
- **Music.** Add it at upload from the platform's commercial music library, or use a track you hold a
  license for. Don't bake in music you can't prove you may use.

## Quality checklist

Run it silently before anything reaches the client, together with the visual check in ad-creative
mode (step 5). The check command enforces several of these items.

- **Something real at frame 0.** A face, hands or the product, plus the hook as text. The product or
  the person is visible in the first 2 seconds.
- **Works muted.** Every spoken word is captioned; the first frame makes sense with no sound.
- **Not a slide deck.** Footage or a real photo under every word; no bare gradient except a short
  offer bumper.
- **No big empty areas.** The end card and the proof card frames are filled by the photo or footage.
- **Readable at phone size.** At least 28px on a 1080-wide frame; captions on a dark box over
  footage; contrast passes AA (`contrast_aa_failure`).
- **Time to read.** Each line stays about 0.5s plus 0.3s a word; the last line at least 2s
  (`line_unread`). End card with the offer and one CTA held at least 2 seconds.
- **True.** Reviews verbatim, claims on the end card checked against the claim gate ("At your door
  this week" became "Shipped by Wednesday" in a real batch, because only shipping within 48 hours was
  promised).
- **Safe zones** hold for the placement.
- **Export check.** `ffprobe` shows the planned size, H.264, yuv420p, 30 fps, AAC audio when there is
  speech, and the planned duration. Watch it once muted at phone size.

## Vision QA for motion

Look before the client does. Read the contact sheet, then crop and zoom any frame that looks off
(`snapshot --zoom` or ffmpeg). The usual catches: a half-built first frame, captions washed out by
bright footage, a card covering the product, an empty bottom third on the end card, garbled text in a
generated clip, a highlight that reads as a strikethrough. Fix, check, snapshot again, and render only
when the sheet is clean. After the final render, pull frames from the MP4 itself to confirm it matches
the snapshots, including frame 1 of every hook variant.

## Naming and output

From a matrix cell: `MA-H2-B-9x16-v1.mp4`, hook variants `MA-H2-B-9x16-var-hook-2-v1.mp4`
(ad-creative mode's naming contract; the name is the ad name and the UTM content). Quick Mode: a
descriptive name.

- MP4s → `./campaigns/<campaign>/ads/` (or `creative-output/motion-ads/<name>/`)
- Project source → `./campaigns/<campaign>/motion/<cell-id or name>/` so a price or a date change is a
  re-render, not a rebuild
- Update `ad-matrix.json` (`asset_paths`, `status: creative-ready`) and `./brand/assets.md`

The client sees the videos (path, length, size, what each is for), a one-line note for any residual
flaw, then the short test plan. Commands, check output and the checklist stay out of the deliverable.

## Worked example: a tech-on-the-job ad (sample: Hartline Plumbing, Dallas TX)

A plan, built on the starter. The material is real: one technician's phone footage from a slow-drain
call and one Google review.

| Beat | Time | On screen |
|---|---|---|
| Hook | 0 to 3.2s | The tech holds a clump pulled from the drain to the lens; text box: "This was in a 2-year-old drain" (variants: "I never pour drain cleaner down a slow drain", reply bubble "Why do you charge to show up?") |
| Body | 3.2 to 10s | Hands on the cable machine, the drain running clear, captions of his own words |
| Proof | 10 to 13.5s | The clear drain, with the Google review card over the top half: verbatim, first name and last initial, "Google review" |
| Offer | 13.5 to 16s | A real photo of the tech at the van; "$99 drain clearing", the terms, "Book online" |

The starter itself was checked and rendered with stand-in clips on 2026-11-16 (version 0.9.8): check
passed, and the 16-second 1080x1920 draft with audio rendered in about 9 seconds, including a hook
variant through `--variables`. What the checks caught on the way: white captions over bright footage
failed contrast (fixed with a dark caption box), one-word caption chunks were on screen too briefly to
read (fixed with phrase chunks and a moving highlight), the CTA was held under 2 seconds, and the
visual check found an empty bottom third on a packshot end card (fixed with a full-frame photo).
