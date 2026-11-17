# Ad Creative Mode

Paid ad production, built the way working advertisers build: look at what is running first,
pick angles from what customers say, plan a batch that mixes long-running still formats with a
stream of UGC, make each piece by the best route, check every piece at phone size, then iterate
from the winners. It stays wired to the shared ad-matrix contract: /boring-marketing-positioning-angles writes the
matrix, this mode fills its cells, /boring-marketing-paid-ads runs them and /boring-marketing-performance-review maps results back
to the same cell IDs. This is the floor, not the ceiling. When the situation argues for a better
path, take it and say why (the cell-ID naming contract isn't the flexible part).

**Load before planning:** `references/ad-formats.md` (21 formats with real examples, the three
routes, Higgsfield, production lessons) and `references/hooks.md` (12 opening patterns). Before
generating, resolve roles in `references/MODEL_REGISTRY.md` and follow `references/api-workflow.md`
for calls and the manifest. Video cut from footage, captions, review cards and end cards goes to
`modes/motion-ads.md`. Read `./brand/creative-kit.md` and `./brand/positioning.md#chosen-angle`.

---

## The matrix contract

Schema: `${CLAUDE_SKILL_DIR}/../boring-marketing-start-here/references/schemas/ad-matrix.schema.json`. File:
`./campaigns/<name>/ad-matrix.json` (+ a human-readable `.md` twin).

```
4 HOOKS (rows)              3 FORMATS (columns)         12 CELLS
H1-H4, taxonomy:            A = static                  MA-H{1-4}-{A-C}
  direct      plain benefit claim                       e.g. MA-H2-B
  question    opens a loop the ad answers
  proof       specific result/evidence leads
  contrarian  challenges the category's accepted advice
                            B = video
                            C = carousel
```

Every cell carries: `cell_id`, hook + format refs, `headline`, `body_copy`, `cta_text`,
`creative_prompt` (consumed by this mode), `asset_paths`, `status`
(`planned → copy-ready → creative-ready → live → …`). The column says still, video or carousel;
the specific format from `ad-formats.md` goes at the start of `creative_prompt` ("hands demo
video", "review static", "native post") so the brief, the asset and the results all name it.

**Asset naming is the contract:** `{cell_id}-{ratio}-v{N}.{ext}`, for example
`MA-H2-B-9x16-v1.mp4`, `MA-H3-A-1x1-v2.png`, carousel cards `MA-H1-C-card1-1x1-v1.png`. A second
format or hook in the same cell is a named variant: `MA-H3-A-4x5-var-format-review-v1.png`,
`MA-H2-B-9x16-var-hook-2-v1.mp4`. The name is the ad name in the platform and the UTM content, so
results map back with no translation.

## Entry points

1. **Matrix exists** (the normal path): read `ad-matrix.json`, list cells by status, run steps 1
   to 6 for the `planned` and `copy-ready` cells the user picks. After each piece: append the file
   to the cell's `asset_paths`, set `status: creative-ready`, update the manifest.
2. **No matrix, campaign-scale ask:** route to `/boring-marketing-positioning-angles` ("it writes the matrix this
   mode fills, about 15 minutes"). If the user wants to skip it, build a minimal schema-conforming
   matrix from the chosen angle and customer words (step 2) and say so.
3. **Quick Mode, one ad:** skip the plan. Pick the format, make it, run the visual check, deliver,
   and suggest the batch when they're ready to test properly.

## Step 1: Look first

Never plan ads for a category you haven't looked at. Pull 15 to 30 live ads from 3 to 5
competitors in the category plus 2 to 3 best-in-class advertisers (strong brands selling to a
similar buyer or at a similar price, in any category), and view them.

- **Pull:** `python3 ${CLAUDE_SKILL_DIR}/scripts/ad_library.py "<brand or category>" --advertiser
  "<page name>" --limit 30 --out ./campaigns/<name>/research/ads/<brand>` per advertiser. It reads
  the Meta Ad Library through Firecrawl (`FIRECRAWL_API_KEY`, free tier, about 1 to 2 credits a
  brand), downloads images and video posters, and writes `index.json` and a `board.html`. Add
  `--videos` to download the video files for contact sheets. With no key it prints the Ad Library
  URL: open it in a browser and screenshot the cards instead.
- **Local businesses:** many local competitors run no Meta ads. Search "<service> <city>" and the
  top competitors by name; if the category is empty, say so, and study the best operators of the
  same trade in bigger cities plus Google's Ads Transparency Center.
- **View them, don't skim the text.** Read every image. For videos, make a contact sheet and read
  it:
  `ffmpeg -i ad.mp4 -vf "select='eq(n\,0)+eq(n\,15)+eq(n\,30)+eq(n\,60)+eq(n\,90)+eq(n\,150)+eq(n\,240)+eq(n\,360)',scale=240:-1,tile=8x1" -frames:v 1 -fps_mode vfr sheet.jpg`
  (frames at 0, 0.5, 1, 2, 3, 5, 8 and 12 seconds of a 30 fps clip; older ffmpeg takes
  `-vsync vfr` in place of `-fps_mode vfr`).
- **Log each ad:** format (names from `ad-formats.md`), hook pattern (`hooks.md`), days running,
  product visible in the first 2 seconds, who is on screen (face, hands, nobody), phone or studio,
  offer, landing page type.
- **Write `./campaigns/<name>/research/ad-scan.md`:** formats and hooks counted, the 5 oldest
  runners and what they have in common, offers in play, and what nobody in the category is doing.
  That gap is often the first test. Study the pattern; never lift another brand's footage, words,
  reviews or marks.

## Step 2: Angles (3 to 5)

An angle is the reason to buy the ad leads with. Build 3 to 5 from the chosen position in
`positioning.md`, the scan's gaps and the customers' own words (reviews, sales calls, `audience.md`).
Each angle gets one line in the customer's words and the proof that backs it.

Run the claim gate from `/boring-marketing-positioning-angles` on every angle: a line someone could paste into an
ad uses only facts from the brief, the business's site, its reviews or research with a source. A
guarantee is one the business already offers. Nothing that doesn't exist yet.

## Step 3: The batch plan, with a diversity rule

Every batch meets all of these:

- **At least 4 formats across stills and video.**
- **At least 3 angles.** Where the budget allows, run the strongest angle in two formats, so a
  winner tells you whether the angle or the format won.
- **At least one native or organic-feeling piece** (native post, customer UGC, reply to a comment,
  POV).
- **At least one proof piece:** a review or quote static, a before and after, or a comparison.
- **At least one UGC or creator video with 3 hook variants** (three filmed openings, one body).
- **A mix of the two lifespans the pull showed:** proven still formats that run for months (hero
  still, offer card, review static, before and after, lifestyle still) and fast-rotating creator
  and UGC video that gets replaced every few weeks.

A default 8-piece first batch (illustrative, a sample coffee subscription):

| Cell | Angle | Format | Hook pattern | Route |
|---|---|---|---|---|
| MA-H1-A | Freshness | Product hero still with a stat row | none, the product | Real photo, code text |
| MA-H3-A | Taste | Review static | Result quote | Real review, model scene, code text |
| MA-H4-A | Vs grocery bags | Us vs them | Dare | Real photo, model stand-in, code table |
| MA-H2-A var | Convenience | Native post | POV | Model phone photo, code captions |
| MA-H1-B | Freshness | Hands demo | Mid-sentence caption | Real or model b-roll, code cut |
| MA-H2-B | Convenience | Customer UGC, 3 hooks | Confession, question, myth | Real customer, code cut |
| MA-H3-B | Taste | Founder or maker | Velocity stat | Real founder, code cut |
| MA-H4-C | Price | Offer carousel | Offer | Real photo, code cards |

Write the plan to `./campaigns/<name>/ads/batch-plan.md`: cell, angle, format, hook pattern, route,
who films or makes it, and when. The budget math in `/boring-marketing-paid-ads` (`references/ads-judgment.md`)
decides how many pieces can run at once; a small account runs the batch over two or three weeks.

## Step 4: Make each piece by the best route

Take the first route the business can do, in this order (details per format in `ad-formats.md`):

1. **Real.** The owner, a staff member, a customer or a creator on a phone. Hand over a shot list
   and, for creators, a brief (templates below). Real is the only route for a testimonial.
2. **Model.** Make a product reference image first (GPT Image 2.6 Sunburst from the real product
   photo), then pass it into every scene and every video first frame. Higgsfield Marketing Studio
   for presenter or UGC-style video and for exploring many static formats fast; GPT Image 2.6 plus
   HTML text for statics with exact copy (Flare for drafts, Sunburst for finals); Seedance 2.5,
   through Higgsfield or Replicate, for b-roll, foley and talking-object skits; ElevenLabs for
   voiceover. Generated copy invents names, sites and competitor claims, so every generated piece
   goes through the claim check. Details and test results: `ad-formats.md`; payloads:
   `MODEL_REGISTRY.md`.
3. **Code.** Video: cut the footage with captions, overlays, review cards and end cards in
   motion-ads mode. Stills: set every word of ad text in HTML/CSS over the photo and export a PNG,
   so nothing misspelled ships. Text that belongs to the photo (a label, a sticker) can come from
   the model.

**Shot list (give it to whoever films):**

```
Ad: MA-H2-B (customer UGC, convenience angle) · 9:16, 4K 30fps, phone, window light, mic on
1. Opening A, to camera: "<line from hooks.md>"            3 to 4s
2. Opening B, to camera: "<second pattern>"                3 to 4s
3. Opening C, product in hand to the lens: "<third>"       3 to 4s
4. Product in use, close, hands only                        3 takes
5. The result (the cup, the fixed drain, the screen)        2 takes
6. Product beside the result, still                         5s
7. Sign-off in their own words                              5s
Don't: read a script word for word, show other brands, promise results
```

**Creator brief (one page):** the product and who it is for; the angle in one line; the three
openings to film; the must-show moments (product in frame by 2 seconds, the use, the result); claims
they may make, and claims they may not; the paid-partnership label; raw files in 9:16 plus all
three openings; usage rights and how long.

**Filling a cell:**

```
1 READ the cell: hook_text + taxonomy + format + creative_prompt (+ headline/cta).
2 PICK the route (real, model, code) and write the shot list or prompt.
3 STILLS: photo or generated scene from the product reference, then the words in HTML/CSS.
  VIDEO: footage (filmed or generated), then the cut in motion-ads mode.
  CAROUSEL: 2 to 10 cards, card 1 stands alone, one visual lock across cards.
4 MAKE 9:16 first (most live ads ran 9:16, stills included), then 4:5 for feed; winners get the rest.
5 VISUAL CHECK (step 5), then save under the cell name and update the json and manifest.
```

**Placement prompts (model route).** Start every prompt from the product reference image and say
what it is for:

```
FEED PRODUCT STILL   The product from the reference image, [setting], [one light source and
                     direction], product fills half the frame, plain ground, room at the top
                     for one line of text, no text in the image, 4:5
NATIVE PHONE PHOTO   A phone photo of the product from the reference image in a real [kitchen /
                     truck / desk], slight tilt, ordinary light, a little clutter, not styled,
                     not studio, no text, 9:16
B-ROLL CLIP          First frame: [the still]. Small natural handheld motion only. [The one
                     action]. Natural sounds only ([foil crinkle / pour]). No speech, no music.
GOOGLE RESPONSIVE    The product, clean background, no text anywhere, survives a crop to 1:1
                     and 1.91:1
```

### Platform specs and safe zones

| Placement | Ratio / size | Safe zone and rules |
|-----------|--------------|-------------------|
| Meta feed | 4:5 or 1:1 (1080 base) | bottom ~10% gets the CTA overlay; keep in-image text short |
| Meta Stories/Reels | 9:16 (1080×1920) | keep text and logos out of the top ~14%, the bottom ~35% and 6% each side (Meta's stated zone, see `meta-ads` `references/meta-facts.md`) |
| Meta carousel | 1:1, 2 to 10 cards | every card stands alone and leads to the next |
| Google responsive display | 1.91:1 + 1:1 (1200 base) | no text in the image; Google adds it |
| TikTok in-feed | 9:16 | top ~130px, bottom ~480px, right ~140px are UI (rule of thumb from `/boring-marketing-paid-ads` platform-specs) |
| One 9:16 for Reels, TikTok and Shorts | 1080×1920 | text inside x 120 to 888, y 288 to 1248, and left of x 780 below y 840 (motion-ads mode) |

230 of the 336 ads in the pull were 9:16, stills included. Make 9:16 first, then 4:5.

### Carousels and algorithm-assembled placements

Carousel order for conversion: hook, problem, the fix, proof, offer. Every card stands alone. For
Advantage+ and Performance Max, make components rather than one finished ad: 3 to 5 product shots,
3 to 5 in-use shots and 2 or 3 graphic variants, each at 1:1, 4:5, 9:16 and 16:9, no baked-in text,
genuinely different from each other, plus 5 headlines, 5 descriptions and 5 primary texts.

### Ad copy fields

When the matrix's copy fields are empty, write them with the asset. Meta: primary text (the first
125 characters do the work), headline ~40 characters, CTA from the fixed set. Google responsive
display: up to 5 headlines of 30 characters, 1 long headline of 90, up to 5 descriptions of 90.
TikTok: 100 characters, native voice. Deeper copy work belongs to `/boring-marketing-direct-response-copy`.

## Step 5: The visual check (every piece, before handover)

Look at a phone-size render (390 px wide) of every still and the contact sheet of every video.
For a still: `sips --resampleWidth 390 ad.png --out ad-phone.png` (macOS) or
`ffmpeg -i ad.png -vf scale=390:-1 ad-phone.png`, then Read both sizes. For a video: the contact
sheet command in step 1, run on the final MP4. A piece passes only when all of these are true:

- **The product or the person is visible in the first 2 seconds** (frame 0 for stills).
- **The first frame works with the sound off:** it says or shows something on its own.
- **Text is readable at phone size** (about 28 px or more on a 1080-wide frame) and captions are on
  for every spoken word.
- **Nothing reads as a slide deck or a template.** Text over a flat gradient is never a finished ad
  for a physical product; put the words over the product or a real scene.
- **No big empty areas.** Every part of the frame is doing something, or is deliberate quiet around
  the product.
- **Native formats look native:** a phone-photo look, platform-style text, no logo block, no button
  baked into the image.
- **The brand is clear in every ad:** the name is readable on the product, in a wordmark or in the
  copy. A logo mark alone (a leaf on a bag) doesn't count. When you generate packaging, put the
  brand name on it.
- **Every ad except a native post carries the offer or the next step** (subscribe and save 10%,
  book a visit, the price), so the click has a reason. Native posts leave that to the caption
  and the platform button.
- **The claims are true,** including the end card and the captions, checked against the claim gate.
  No unsupported claims about competitors (say "check the bag", not "sits on a shelf for months"),
  and never put an AI-generated person next to a real review, where they read as the reviewer.
- **Safe zones hold** for the placement, and the file carries the right cell name.

Fix what fails and check again. A piece that still fails after about two tries is shown with its
flaw named in one line, never passed off as clean. Results go in the manifest, not the chat.

## Truth rules

- **Real reviews only, quoted exactly.** The FTC's rule on consumer reviews and testimonials (in
  effect since 2024-10-21) bans fake or misrepresented reviews and testimonials. Quote word for
  word, never stitch two reviews together, show stars only if the review had them, and get
  permission for names and faces beyond the public post.
- **An AI-generated person can demonstrate or present, never pose as a customer or give a
  testimonial.** No "I've been using this for a month" from a generated face or a cloned voice.
  Apply the platform's AI label where required (talking-head mode has the disclosure rules).
- **Disclose material connections.** Paid creators use the paid-partnership label; a customer who
  got a gift card for a video says so.
- **Before and after shows typical results,** same angle and light, the time between stated. Meta
  restricts body and health before-and-afters, health claims need support, and law, finance and
  health practices have their own testimonial rules.
- **Keep the claim gate from `/boring-marketing-positioning-angles`** for every line on screen, in the captions and
  on the end card.
- **No fake furniture:** no invented customer chats or engagement numbers, no fake app screens, no
  "news" headlines that aren't news, no countdown without a real deadline. Screenshot-style ads use
  real screenshots with permission.
- **Meta's personal-attribute rule:** name the situation ("waking up drenched?"), never the
  attribute ("are you overweight?"). Creative must match the landing page.

In the delivery, name only the pieces that need a review, one line each with the issue.

## Step 6: Iterate from the winners

Once results identify winning cells (via /boring-marketing-performance-review or pasted platform data):

1. **Keep the angle, change the format.** A winning review static becomes a customer UGC video;
   a winning hands demo becomes a hero still with a stat row. This makes a genuinely new ad, which a
   tired ad needs. Huel ran one customer quote in at least three designs.
2. **Keep the format, change the hook.** Swap the first line or the first 3 seconds and keep the
   body that converts. Film three openings every time you film, so the swaps already exist.
3. **Run the winner again before rebuilding it.** The pull found 120 of 336 ads running the same
   creative as several ads. A winning file can go into a new ad set as is.

Name variants from the winning cell (`var-format-<name>`, `var-hook-<n>`). Change one thing per
variant, reuse the seed and the reference image so the change is attributable, and judge nothing
under ~1,000 impressions per variant. Plan for creator and UGC video to need replacing every few
weeks and stills every few months; the fatigue labels to watch are in `/boring-marketing-paid-ads`
`references/ads-judgment.md`.

**Recurring batches.** When this mode runs on a cadence, check the last week of concepts first:
don't reuse a format from the last ~3 days or an angle from the last ~5 unless it is a deliberate
iteration of a winner; never open two hooks with the same first three words; give every concept a
one-line reason it is new. Default mix: ~40% proven family (winning format and angle, new hook),
~40% adjacent test (change format or angle), ~20% new bet (a gap from the scan).

## Output

Assets under `./campaigns/<campaign>/ads/` (or `creative-output/ad-creative/<campaign>/` when no
campaign folder exists), named by cell ID; `ad-matrix.json` updated (`asset_paths`, `status:
creative-ready`), with the old json versioned per the brand-memory spec
(`${CLAUDE_SKILL_DIR}/../boring-marketing-start-here/references/brand-memory.md`); manifest and `./brand/assets.md`
per asset. Shot lists and creator briefs save as files beside the batch plan
(`./campaigns/<campaign>/ads/briefs/<cell-id>.md`); the scan stays in `research/`.

The client sees, in order: the ads (file, format, hook, headline and CTA for each), the shot lists
and briefs for anything still to be filmed, one line for any piece that needs a review, then a short
test plan (which angles and formats run first, one variable at a time, nothing judged under ~1,000
impressions, the file name as the ad name). Script paths, commands, visual-check results, QA scores
and cell bookkeeping stay out of the deliverable.

**What's next:** `/boring-marketing-paid-ads` to build campaigns from the creative-ready cells ·
`/boring-marketing-performance-review` after spend to map results back to cells · `/boring-marketing-direct-response-copy` for the
landing page the ads point at.
