# Ad formats

last-verified: 2026-11-16 · ttl-days: 120 · refresh: run scripts/ad_library.py on 5 to 10 strong advertisers in two categories, view the 30 oldest live ads, and update the counts and examples below; re-check the model names against MODEL_REGISTRY.md and Higgsfield's model list (open.higgsfield.ai).

The formats that working advertisers run on Meta, how common each one is, real examples, and how
to make each one for any kind of business. Built from 336 live US Meta ads from 48 top DTC brands,
pulled 2026-11-16. Every ad was viewed: 189 images, 8 carousels, 94 videos as frame-by-frame
contact sheets and 45 videos as poster frames only. Every example cited below was looked at.

Counts read "all / running 60+ days". 137 of the 336 ads had run 60 days or more. Run time is a
signal, not proof: advertisers tend to switch off ads that lose money, but some heavy spenders
(Gymshark, Oura) had nothing older than two weeks. The pull ran two weeks before Black Friday,
which inflates the offer cards. The hooks that open these ads are in `references/hooks.md`.

## What the pull showed

1. **Long runners are mostly simple stills.** Of the 137 ads running 60+ days: product hero
   stills 30, offer or price cards 15, creator endorsements 13, text-on-image statements 11,
   customer UGC testimonials 8, lifestyle montages 8, hands demos 7, native posts 5, catalog
   grids 5. 24 of the 34 oldest ads (203 to 572 days) are stills.
2. **Creator video rotates fast.** Creator endorsements have a median of 38.5 days and only 13 of
   50 reached 60 days (26%, against 41% for the whole pull). Customer UGC holds up better (8 of 18,
   median 44.5 days). Brands test many creator videos and keep few, so a batch needs both: still
   formats that last and a stream of new UGC.
3. **Videos open on a person or a hand.** Of 94 videos with contact sheets, 46 open on a face to
   camera (21 of them captioning the spoken words) and 18 on hands holding the product. About a
   quarter of all 139 videos (34) open on a caption that stops mid-sentence.
4. **The product shows early.** 192 of 197 stills show it at once. 68 of 94 videos show it within
   2 seconds, 17 later and 9 never.
5. **Video is phone-shot, stills are studio.** 61 of 94 videos are phone or native footage; 165 of
   197 stills are studio work. Motion graphics are 7% of the whole pull.
6. **Vertical and longer than expected.** 230 of 336 ads are 9:16. The median video runs 34
   seconds; only 19 of 94 are 15 seconds or shorter.
7. **Winners get cloned.** 120 of the 336 ads show the same creative running as 2 or more ads
   (up to 14). 33 of the first picks were exact duplicates of other picks under new ad IDs.
8. **Coffee runs longest and leans on hands.** Coffee ads (64) have a median of 84 days against 42
   for the rest. Hands are the main human element in 38% of coffee ads and 9% of the rest.
9. **Most ads land on ordinary pages.** A September 2026 sweep of 17 DTC brands' live ads found
   58% of ad-to-URL mentions pointing at a plain product, collection or home page. The ad has to
   do the persuading; the page it lands on usually won't.

## The three routes

Every format below lists the material it needs and the route to make it, in this order. Take the
first route the business can do.

- **Real.** The owner, a staff member, a customer or a paid creator films or photographs it on a
  phone. Settings: vertical 9:16, 4K at 30 fps, lens wiped, window light from the side, a clip-on
  mic for speech. Each format carries its shot list. Real footage is the only route for anything
  that claims a customer's experience.
- **Model.** Our picks, by job (tested 2026-11-16, details below):
  - Presenter or UGC-style video, and exploring many static formats fast: Higgsfield Marketing
    Studio.
  - Statics with exact copy: GPT Image 2.6 for the picture (Flare for fast drafts, Sunburst for
    finals and for keeping a product consistent across edits), HTML/CSS for the words.
  - B-roll, foley and talking-object skits: Seedance 2.5, through Higgsfield or Replicate.
  - Voiceover: ElevenLabs.
  - Replicate is the alternative for the same image and video models by API. Payloads and prices:
    `references/MODEL_REGISTRY.md`.
- **Code.** HyperFrames (or Remotion) cuts real or generated footage together with captions,
  overlays, review cards and end cards; HTML and CSS set exact text over a photo for stills, so no
  misspelled model text ever ships. Mode: `modes/motion-ads.md`.

Truth rules apply to every route: real reviews only, quoted exactly; an AI-made person can present
or demonstrate but never poses as a customer or gives a testimonial; before-and-afters show
typical results. Full rules in `modes/ad-creative.md`.

### Higgsfield for ads (checked 2026-11-16 on higgsfield.ai and its API docs, and tested with the Higgsfield CLI 1.2.2)

- **Setup.** `npm i -g @higgsfield/cli`, then `higgsfield auth login` (opens a browser), then
  `higgsfield workspace set <id>`. The companion agent skills install with
  `npx skills add higgsfield-ai/skills`. The Higgsfield MCP connector reaches the same tools from a
  chat. Generations spend credits from the Higgsfield account.
- **Marketing Studio** builds ads around a product added by link or photos, with a presenter from
  40+ stock avatars or one you generate. Template groups: UGC, Product shot, Motion, TikTok, Ads,
  Posters and Marketplace (1,500+ templates). "Click to Ad" turns a product link into a video. "Ad
  Reference" takes a 4 to 30 second ad you upload and remakes its structure and timing around your
  product, a different presenter or a new hook. Single tools include Packshot, Macroshot Product,
  Giant Product, Mascot and ASMR Promo.
- **Marketing Studio video, tested.** `higgsfield generate create marketing_studio_video --mode
  ugc_how_to --product_ids @file --duration 15 --aspect_ratio 9:16 --resolution 720p
  --generate-audio true` cost 75 credits and took about 2 minutes. It made the most convincing
  face-to-camera presenter of anything in the test, and face to camera is the most common video
  opening in the live ads. It stayed within the facts it was given. Misses: one garbled phrase, a
  French press where the brief said pour-over, and no captions. So transcribe every clip to check
  the words, and burn in captions in the edit.
- **Which modes.** With an AI presenter, use the how-to, unboxing, product showcase or TV spot
  modes. Never `product_review` mode with an AI presenter: that is a fake testimonial. Check the ad
  platform's current AI-content disclosure rules for photorealistic AI people and label the ad.
- **DTC Ads Engine, tested.** `higgsfield marketing-studio dtc-ads generate --format-id <id>
  --product <product>` makes statics in 42 ad formats that map onto this file (Customer Quote,
  Comparison Table, Organic Post, Whiteboard Explainer, Then vs Now, Social Comment, Stat Surround,
  Trending Post and more). About 7 credits and a minute per 3:4 2K high-quality image; the product
  stays consistent from uploaded product photos and the text renders cleanly. But 3 of 4 outputs
  invented things the brief forbade: a reviewer name attached to a real review, a made-up website,
  and negative claims about competitors. Use it to explore many formats fast; every output goes
  through the claim check, and the copy is fixed or rebuilt in HTML before anything ships.
- **Virality Predictor** is documented, but CLI 1.2.2 returned "Model type text is not supported by
  generate create yet". It is available in the Higgsfield web app; re-check the CLI later.
- **Length and cost.** Higgsfield's own pages give 15 seconds per Marketing Studio video in one
  place and up to 30 seconds for UGC and Motion in another; check the current Higgsfield docs.
  Their guide priced a 15-second video at 90 to 107.5 credits (about $4.41 to $5.27, checked by
  Higgsfield 2026-10-31); the test above spent 75.
- **The REST API** (`HF_API_KEY_ID` + `HF_API_KEY_SECRET`, async request and status URL) serves the
  models: Seedance 2.5 (up to 30 seconds from text, image, video or audio, from $0.118 a second),
  Kling 4.0, Genjutsu motion transfer (keeps a video's motion, swaps the character, product or
  setting) and Marketing Studio Image. Higgsfield's guide says Marketing Studio video is not in the
  public API; use the CLI, the MCP connector or the web app for it. Failed and moderated requests
  are not charged. Anything else: check the current Higgsfield docs.
- **Formats it suits:** creator-style presenter videos (as a presenter, never a customer), hands
  demos and product b-roll (Packshot, Macroshot), unboxings and recipes, lifestyle montages, the
  talking object, animated explainers, fast drafts of the still formats, and Ad Reference for
  iterating a winner (same format, new hook).

### Making it: lessons from a real batch

From a coffee batch made with these tools in November 2026 (10 images, 5 clips):

1. **Make a product reference image first.** A clean GPT Image 2.6 Sunburst product shot, made
   from the real product photo, then passed as the reference image to every scene and every video
   first frame (`input_images` on Replicate, `image[]` on OpenAI's edits endpoint). The bag stayed
   the same across all 15 assets.
2. **Set ad text in HTML/CSS over the photo, not inside the model.** Exact words, brand fonts, no
   misspellings. Text that belongs to the photo (a label, a sticker on the bag) is fine to generate.
3. **Keep text sharp in video by starting from a crisp first frame with small motion.** When the
   bag turned mid-clip, Seedance garbled a sticker date. Re-run from a first frame with the sticker
   sharp and facing camera, prompted "small natural handheld motion only", and the date stayed
   readable for the whole clip.
4. **Seedance 2.5's native audio gives real-sounding foley for free:** foil crinkle, beans into a
   grinder, a kettle pour. Prompt "Natural sounds only ... No speech, no music."
5. **Dialogue in double quotes comes out word for word.** Check it with a speech-to-text pass
   (`npx hyperframes transcribe`), then burn in captions anyway: most people watch muted.
6. **Run the claim check on end cards too.** "At your door this week" was caught and replaced with
   "Shipped by Wednesday", because the business only promises shipping within 48 hours.
7. **Calling Replicate from Python's urllib returns 403 without a User-Agent header.** Set one.

---

## Stills

### 1. Product hero still

- **Looks like:** the product alone, big, on a plain or single-color ground, with one line of text
  or none.
- **In the pull:** 84 / 30, the most common format at any age; 9 of the 34 oldest ads. 80 of 84 are
  studio shots and 38 carry no text at all.
- **Seen:** Onyx Coffee Lab, 262 days, a peach coffee box centered on white
  ([ad](https://www.facebook.com/ads/library/?id=1447766330029979)). Helix Sleep, 356 days, a
  mattress on a styled bed above a retailer logo panel
  ([ad](https://www.facebook.com/ads/library/?id=1351354962633138)). Caraway, 31 days, a coffee maker
  with four one-word tags pinned to its parts
  ([ad](https://www.facebook.com/ads/library/?id=2165464154179597)).
- **Eye lands:** the product, then the line.
- **Layout:** product fills half to two thirds of the frame; ground is one color or a simple
  surface; logo small. Variants: one-word tags pinned to parts of the product, or a three-number
  stat row under it (Huel, 162 days, "40g protein / 27 vitamins / 10 flavors").
- **Material:** a sharp photo of the real product.
  - Real: product on a sheet of card by a window; phone at its 2x lens; straight on, three-quarter,
    top down, in a hand.
  - Model: GPT Image 2.6 edits of that photo to change the ground and light (Flare for 4 drafts,
    Sunburst for the final). Never generate the product from nothing.
  - Code: the line and tags in HTML/CSS over the photo, exported as a PNG.
- **Any business:** local service: the finished install shot straight on (a new water heater, neat
  copper) or the clean van. SaaS: the one screen that sells, real UI on a phone. Practice: the
  deliverable (the sample report, the aligner case) or the front door with the team. DTC: the
  product alone.

### 2. Offer or price card

- **Looks like:** the offer number in the biggest type, the product or what you get, the terms.
- **In the pull:** 40 / 15 (37 stills, 3 short videos). 13 of the 40 are text-heavy; 10 are motion
  graphics. Inflated by the pre-Black Friday timing.
- **Seen:** Hungryroot, 326 days, a giant "Get 40% off" over the box and a spill of groceries
  ([ad](https://www.facebook.com/ads/library/?id=2121921558580156)). Atlas Coffee Club, 137 days,
  "BOGO coffee" over one bag floating in a night sky
  ([ad](https://www.facebook.com/ads/library/?id=1001002149572910)). Ryze, 368 days, last year's
  "Black Friday deal that broke our site" card, still live
  ([ad](https://www.facebook.com/ads/library/?id=1463386808100408)).
- **Eye lands:** the number.
- **Layout:** offer, product, terms in one line, a deadline only if it is real. A 10 to 15 second
  video version cycles the bundle items (Javy, 277 days,
  [ad](https://www.facebook.com/ads/library/?id=2404635569983581)).
- **Material:** the live offer and a photo of what is included.
  - Real: everything in the offer laid out and shot from above.
  - Model: GPT Image 2.6 for the scene behind the real product (sky, kitchen, season).
  - Code: price, strike line and terms in HTML so every digit is right.
- **Watch:** the same offer, unaltered, on the landing page; the math checked; dated offers switched
  off on their end date, not a year later.
- **Any business:** local service: "$89 furnace tune-up through Oct 31" over the tech at the unit.
  SaaS: "First month free" over the product screen. Practice: "New-patient exam $99" over the room.
  DTC: bundle plus free gift.

### 3. Text-on-image statement

- **Looks like:** one statement in big type over a single photo, most of the frame quiet.
- **In the pull:** 30 / 11, median 18 days: many short tests and a few long runners.
- **Seen:** Atlas Coffee Club, 312 days, "We dare you to drink our espresso black..." over one shot
  glass ([ad](https://www.facebook.com/ads/library/?id=732747836141467)). Huel, 178 days, "GLP-1
  killed your appetite." over the flavor lineup
  ([ad](https://www.facebook.com/ads/library/?id=1169896608601745)). Thorne, 263 days, "A passive
  revenue stream." beside a small bottle and a white vase
  ([ad](https://www.facebook.com/ads/library/?id=752329564415791)), run in a second version aimed
  at doctors.
- **Eye lands:** the line.
- **Layout:** two to four lines, then the product or one object. The product is still in frame in
  most of them. Over a real photo, never over a flat gradient alone: text on a gradient is not a
  finished ad for a physical product.
- **Material:** one photo and one sentence from the hook bank.
  - Real: the product or the one object the line is about.
  - Model: GPT Image 2.6 for the photo behind the words (a macro, a texture, a scene).
  - Code: the words in HTML/CSS in the brand font, exported as a PNG.
- **Any business:** local service: "Your water heater has a birthday. Check the sticker." over a real
  tank label. SaaS: one contrarian line over a product screenshot. Practice: "Most penalties come
  from one form." over that form. DTC: a dare or a timely line over the product.

### 4. Review, quote or press static

- **Looks like:** a quote as the headline, the attribution under it, the product beside it.
- **In the pull:** tagged 4 / 4 (2 review stacks, 2 press quotes, all past 60 days), plus at least
  four quote-led ads filed under other labels (three Huel designs, one doctor quote).
- **Seen:** Huel, 247 days, "Lost 80lbs (so far) with Huel." with first name, year and Trustpilot
  stars over a shake lineup ([ad](https://www.facebook.com/ads/library/?id=4239632006288183)); the
  same quote ran on yellow with three benefit callouts and a price per meal (247 days,
  [ad](https://www.facebook.com/ads/library/?id=897943063070733)) and set inside a pour (162 days,
  [ad](https://www.facebook.com/ads/library/?id=1547645686825388)). Death Wish Coffee, 86 days, a
  review line, five stars and a first name over an iced pour
  ([ad](https://www.facebook.com/ads/library/?id=1851748852467374)). Death Wish, 81 days, a
  two-word press quote with the publication's name
  ([ad](https://www.facebook.com/ads/library/?id=1383306986605344)).
- **Eye lands:** the quote.
- **Layout:** quote in quotation marks, attribution (first name, year, source, stars only if the
  review has them), product photo, optional three callouts. Huel kept the quote and changed the
  design three times: that is the iteration loop.
- **Material:** real reviews, exported from Google, Trustpilot, the store or the app store.
  - Real: the review as written, with permission for anything beyond the public post; a real
    product photo.
  - Model: GPT Image 2.6 for the scene around the real product. Never let a generator write or
    attribute the review: in testing, an ad generator attached an invented name to a real review.
  - Code: quote, stars and attribution in HTML so every word is exact.
- **Any business:** local service: a Google review line over the tech at that kind of job. SaaS: a
  G2 or Capterra quote with job title and company size, with permission. Practice: a client quote
  where the profession's rules allow it (law, finance and health have rules), or a press mention.
  DTC: as seen.

### 5. Native post or meme

- **Looks like:** a phone photo or a screenshot that could be a friend's post: chat bubbles, a
  search bar, story text boxes, a link sticker.
- **In the pull:** 9 / 5 (median 60 days), plus 19 ads using it as a second label. 7 of 9 are
  phone-shot.
- **Seen:** Hungryroot, 365 days, a real photo of a packed fridge with a first-person "I used to
  think... until" caption in outlined type ([ad](https://www.facebook.com/ads/library/?id=1163032862088700)).
  Trade Coffee, 51 days, "The search:" over a search bar, then "The solution:" with an arrow to the
  mailer in a woman's hand ([ad](https://www.facebook.com/ads/library/?id=1612586367073535)). Cozy
  Earth, 243 days, a creator carousel with an ironic caption and "IGNORE THIS"
  ([ad](https://www.facebook.com/ads/library/?id=1665168554828729)).
- **Eye lands:** the caption, then the photo.
- **Layout:** no logo block and no button in the image. Platform-style type: white text with an
  outline, white caption boxes, a handwritten note with an arrow, a link sticker (Cuts Clothing,
  62 days, [ad](https://www.facebook.com/ads/library/?id=2389162358554427)).
- **Material:** a believable phone photo and the caption.
  - Real: a staff member's or customer's phone photo of the product where it lives (fridge,
    counter, truck seat).
  - Model: GPT Image 2.6 with the product reference image in a real place, prompted as a phone
    photo (flash, slight tilt, ordinary room). A real batch's native POV still (phone photo, white
    caption boxes, a handwritten note with an arrow) read as organic.
  - Code: the caption boxes and stickers in HTML/CSS over the photo.
- **Watch:** a chat or post screenshot is real and used with permission, or plainly the brand's own
  voice. Never a made-up customer conversation, invented engagement numbers or a fake app screen.
- **Any business:** local service: a dashboard photo, "3 water heaters before lunch", or a real
  customer's thank-you text with permission. SaaS: "The search: how do I stop double-booking
  crews / The solution:" over the app. Practice: a handwritten note on the desk. DTC: the fridge or
  counter photo.

### 6. Before and after

- **Looks like:** the same thing twice, before and after, labeled; or a drawn version of the change.
- **In the pull:** 4 / 4, median 145.5 days, the highest of any format with four or more ads.
- **Seen:** Bioma, 392 days, three line-drawn torsos labeled by month with the belly shrinking,
  bottles below, small disclaimer text ([ad](https://www.facebook.com/ads/library/?id=1503291010795287)).
  Cozy Earth, 131 days, a whiteboard with a sweating stick figure "Before bamboo PJs" and a sleeping
  one "After", held beside the real pajamas
  ([ad](https://www.facebook.com/ads/library/?id=1887019256070526)).
- **Eye lands:** the difference.
- **Layout:** two states side by side or left to right, same angle and light, labels, the time
  between them. The drawn versions show a change without body photos.
- **Material:**
  - Real: same spot, same angle, same light, phone on a mark; the date of each.
  - Model: GPT Image 2.6 for a drawn or whiteboard version of a true, typical change. Never a
    generated "after" of a real job, body or face.
  - Code: labels, dates and the split in HTML/CSS.
- **Watch:** typical results only; Meta restricts body and health before-and-afters; health
  claims need support.
- **Any business:** local service: the drain, the roof, the lawn, the carpet, the strongest format
  for trades. SaaS: the old spreadsheet against the new screen. Practice: the shoebox of receipts
  against the closed month. DTC: drawn for health products, photos for home goods.

### 7. Us vs them

- **Looks like:** your product beside a generic alternative, with a short table.
- **In the pull:** 9 / 2, plus 3 comparison charts used as a second label.
- **Seen:** Liquid Death, 200 days, its can beside a plain white "SODA" can over a short table of
  sugar and calories ([ad](https://www.facebook.com/ads/library/?id=2454367678367987)); a 181-day
  version adds caffeine and coloring rows. Poppi, 49 days, "Old Me" (a
  blank can) against "New Me" ([ad](https://www.facebook.com/ads/library/?id=1106288058787905)).
  Everyday Dose, 35 days, names the rival brand and lists four rows and both prices
  ([ad](https://www.facebook.com/ads/library/?id=4185338451598526)).
- **Eye lands:** the two objects.
- **Layout:** two objects, three to five rows with numbers, our side lit. The long runners compare
  against an unbranded stand-in.
- **Material:**
  - Real: a product photo and a plain stand-in (an unlabeled can, a generic bottle).
  - Model: GPT Image 2.6 for the unbranded stand-in.
  - Code: the table in HTML so the numbers are exact.
- **Watch:** every number sourced and dated, and matching the pack in the same picture (one ad in
  the pull printed a sugar figure that differs from the one on the can beside it). Naming a rival
  needs proof for every row. Generated comparison layouts invent competitor claims; rebuild the
  rows from your own facts.
- **Any business:** local service: "Price in writing before we start / Typical: 'depends'". SaaS:
  against the spreadsheet or the whiteboard. Practice: flat fee against hourly. DTC: as seen.

### 8. Catalog grid or "what you get"

- **Looks like:** the range or the box contents in an even grid or a flat lay, one headline.
- **In the pull:** 13 / 5 (6 stills, 5 carousels, 2 videos).
- **Seen:** Atlas Coffee Club, 384 days, a 3x3 grid of country bags, "It's time to break up with
  big espresso." ([ad](https://www.facebook.com/ads/library/?id=1697370864264896)). True Classic,
  127 days, "Date night, sorted. 5 looks, zero guesswork" over a flat lay
  ([ad](https://www.facebook.com/ads/library/?id=1680166059927179)). Huel, 57 days, "The Trial Box"
  with "16 meals / 40g protein / 8 flavors" over the flavor grid
  ([ad](https://www.facebook.com/ads/library/?id=1081914421425045)).
- **Eye lands:** the grid as a whole, then the headline.
- **Layout:** items on one ground in one light, one headline, an optional stat row.
- **Material:**
  - Real: a flat lay shot from above with the phone on a stand.
  - Model: GPT Image 2.6 Sunburst to unify separate product photos into one consistent set.
  - Code: the grid and the stat row in HTML from the real photos.
- **Any business:** local service: "What's in a $149 tune-up", the 12 checklist items. SaaS: the
  features as a grid of real screens. Practice: what the engagement includes. DTC: as seen.

### 9. Lifestyle still

- **Looks like:** one person using or holding the product, one line.
- **In the pull:** 7 / 6, median 123 days.
- **Seen:** Helix Sleep, 503 days, the oldest still in the pull: a smiling man hugging a pillow on a
  mattress, retailer logos and "See showrooms near you" below
  ([ad](https://www.facebook.com/ads/library/?id=1822033901673742)). Trade Coffee, 123 days, a woman
  hugging an armful of roaster bags on lilac
  ([ad](https://www.facebook.com/ads/library/?id=862211926682640)). Liquid Death, 201 days, "Parenting
  is an Extreme Sport" over a scowling mom holding a can
  ([ad](https://www.facebook.com/ads/library/?id=1331357658841194)).
- **Eye lands:** the face, then the product.
- **Layout:** person and product together, one line, plain backdrop or a real room.
- **Material:**
  - Real: a staff member or customer, with permission, or a half-day shoot.
  - Model: GPT Image 2.6 with the product reference image; an AI person here is a model in a scene,
    never captioned as a customer.
  - Code: the line over the photo.
- **Any business:** local service: the homeowner in a cool living room as the tech packs up (real
  customer, with permission). SaaS: the owner leaving at 5pm, the app on the phone. Practice: client
  and advisor at the table. DTC: as seen.

---

## Video

Beats are for the median length in the pull (about 30 to 45 seconds). Cut a 15-second version of
any of them by keeping the first 3 seconds, the best 8 seconds of proof and the end card.

### 10. Creator to camera

- **Looks like:** a creator talking to the phone with the product in hand, captions on.
- **In the pull:** 50 / 13, median 38.5 days: the most tested video format and the fastest to
  rotate. 37 ads ran under a creator's own page. 40 of 50 are phone-shot.
- **Seen:** Trade Coffee, 109 days, a creator holds a roaster's bag to the lens, "Delicious coffee
  and it came to me from Trade", then beans and the guarantee
  ([ad](https://www.facebook.com/ads/library/?id=1580079020173490)). Atlas Coffee Club, 396 days, "I
  never put oily beans in my espresso machine" over a bean macro
  ([ad](https://www.facebook.com/ads/library/?id=1397865848579594)). PetLab Co, 200 days, a presenter
  in a kitchen holding a small mic, word-by-word captions and photo insets, ending on the tub with
  "Actor portrayal. Individual results may vary."
  ([ad](https://www.facebook.com/ads/library/?id=1617910212803797)).
- **First second:** a face and a caption already mid-sentence, or the product pushed at the lens.
- **Beats:** 0 to 2s hook with the product in frame; 2 to 10s the problem or the story; 10 to 25s
  the product in use in close-ups; 25 to 35s the result or offer in their words; end card.
- **Material:**
  - Real: a paid creator who used the product, or the owner. One-page brief: who it is for, the
    angle, three opening lines to film, the must-show moments, claims they may and may not make,
    the paid-partnership label, and deliverables (raw 9:16 files, all three openings).
  - Model: an AI presenter (Higgsfield Marketing Studio video in how-to, unboxing, showcase or TV
    spot mode, never `product_review`) may present or demonstrate, never "I've used this for three
    weeks". Transcribe it to check the words, caption it, and label it as AI where required.
  - Code: three hook cuts over one body, captions, end card.
- **Any business:** local service: the owner or a tech to camera on the job. SaaS: the founder with
  a screen recording inset. Practice: the dentist or attorney explaining one thing. DTC: as seen.

### 11. Customer UGC testimonial

- **Looks like:** a real customer on their own phone, talking about their own use.
- **In the pull:** 18 / 8, median 44.5 days, all phone-shot. It lasts longer than creator video.
- **Seen:** Atlas Coffee Club, 572 days, the oldest ad in the pull: a woman holds a Keurig over the
  trash, "I was about to throw my Keurig away"
  ([ad](https://www.facebook.com/ads/library/?id=672977635689815)). Hungryroot, 202 days, hands
  cutting into a salad from above under first-person captions
  ([ad](https://www.facebook.com/ads/library/?id=1328568305840257)). Atlas, 377 days, a hand holds a
  portafilter, "My barista told me this coffee secret"
  ([ad](https://www.facebook.com/ads/library/?id=3194950073979529)).
- **First second:** the person mid-sentence, or the product in their hand, with a caption.
- **Beats:** the confession or problem; what changed; the product in use; the result in their words.
- **Material:**
  - Real only. Ask happy customers after a good review, offer a gift card or credit, get written
    permission, and disclose the incentive. Shot list: three openings, product in hand, product in
    use, the result, a five-second sign-off.
  - Model: never the person. Generated product b-roll under a real customer's voice is fine.
  - Code: trims, captions, a review card, the end card.
- **Any business:** local service: the homeowner on the porch, the fixed thing shown. SaaS: a
  customer's screen recording with their face in the corner, "here's how I build Monday". Practice:
  a client video where the profession allows it. DTC: as seen.

### 12. Hands demo

- **Looks like:** hands using the product, close, often with no face at all.
- **In the pull:** 14 / 7, median 56 days, plus 19 ads using it as a second label. 11 of 14 are
  phone-shot. The coffee brands' favorite.
- **Seen:** Cometeer, 133 days, hands drop a frozen coffee puck into a glass and pour hot water,
  then the factory line and an end card ([ad](https://www.facebook.com/ads/library/?id=1549914910180324)).
  Blue Bottle Coffee, 125 days, matcha spooned into a bowl, whisked, poured, no words
  ([ad](https://www.facebook.com/ads/library/?id=1384216296953891)). Javy Coffee, 157 days, powder
  stirred into an iced drink in sun under a first-person text block
  ([ad](https://www.facebook.com/ads/library/?id=1337432737857373)).
- **First second:** the product in hand, in use, from frame 0.
- **Beats:** product in hand; the steps in close-up; the payoff shot; product beside the result;
  offer. 10 to 30 seconds.
- **Material:**
  - Real: anyone's hands, phone on a stand overhead or held POV. Shot list: reach, open, use, the
    satisfying moment, the result, product beside the result.
  - Model: Seedance 2.5 image-to-video from the product reference image for a 3 to 5 second macro
    (pour, steam, crinkle), with native foley. Never show the product doing what it doesn't.
  - Code: step labels, captions, end card.
- **Any business:** local service: the tech's hands on the one satisfying step (the new filter
  sliding in). SaaS: a hand holding the phone with the screen recording. Practice: hands filling in
  the one form that matters. DTC: as seen.

### 13. Unboxing

- **Looks like:** hands opening the box and naming what is inside.
- **In the pull:** 5 / 2, plus 8 ads using it as a second label.
- **Seen:** Atlas Coffee Club, 394 days, hands lift patterned bags out of the box under a breakup
  joke caption ([ad](https://www.facebook.com/ads/library/?id=800404742727541)). Hungryroot, 202 days,
  a man unpacks groceries at a kitchen island under a POV caption
  ([ad](https://www.facebook.com/ads/library/?id=4309638865973296)). Factor, 18 days, a hand opens
  the box under a quoted line and "SAY NO MORE."
  ([ad](https://www.facebook.com/ads/library/?id=928768263500819)).
- **First second:** the box in hand, the lid lifting.
- **Beats:** box; open; each item named; the item you're excited about; offer.
- **Material:**
  - Real: owner, staff or customer at a counter; hands only is fine.
  - Model: Higgsfield Marketing Studio video in unboxing mode, with a presenter script only.
  - Code: item labels, captions, end card.
- **Any business:** local service: opening the van doors, the parts on the shelf. SaaS: the
  "unboxing" of the first login and setup checklist. Practice: the new-client welcome packet. DTC:
  as seen.

### 14. Podcast or interview clip

- **Looks like:** a person at a microphone mid-story, bold captions a few words at a time.
- **In the pull:** 3 / 3, median 203 days.
- **Seen:** Huel, 203 days, two cuts from the same set: a guest says the host doesn't eat solid
  meals ([ad](https://www.facebook.com/ads/library/?id=2143082343178303)), and the founder says he
  ate the same food for three months and lost body fat
  ([ad](https://www.facebook.com/ads/library/?id=967905472378239)).
- **First second:** a face at a mic, the caption already moving.
- **Beats:** one surprising claim or story from a longer talk (30 to 50 seconds); product b-roll;
  end card.
- **Material:**
  - Real: a real conversation, two clip-on mics, two phones on stands; cut the best 30 to 45 seconds.
  - Model: none needed. No AI guests.
  - Code: captions, a name lower-third, end card.
- **Any business:** local service: the owner on a local podcast, or a sit-down with a 20-year
  tech. SaaS: the founder on an industry show. Practice: a partner on the most common mistake. DTC:
  as seen.

### 15. Expert or professional

- **Looks like:** someone with a visible credential (scrubs, a title card) explaining one thing.
- **In the pull:** 5 / 2, all face to camera.
- **Seen:** PetLab Co, 200 days, a vet in scrubs: "If your dog eats grass..." with a picture-in-picture
  of a dog ([ad](https://www.facebook.com/ads/library/?id=1519997246498037)). AG1, 52 days, a named
  scientist with a credential lower-third, captions and product b-roll
  ([ad](https://www.facebook.com/ads/library/?id=1447266210638356)). Lemme, 111 days, a doctor's
  quote as a still, her title saying she is the company's chief medical officer
  ([ad](https://www.facebook.com/ads/library/?id=4077879232511435)).
- **First second:** the credential is visible.
- **Beats:** the symptom or question; the explanation; the product as the answer; end card.
- **Material:**
  - Real only: a real expert with a real credential, and their tie to the business disclosed.
  - Model: never the expert. Insets and b-roll only.
  - Code: name and credential lower-third, captions, insets.
- **Any business:** local service: the master plumber with the license number on screen. SaaS: an
  operator from the industry, with permission. Practice: the practitioner, the native format. DTC:
  as seen.

### 16. Founder or maker

- **Looks like:** the founder holding the product, cut with how it is made.
- **In the pull:** 3 / 3 (two founder videos and one factory clip).
- **Seen:** Cometeer, 133 days, a man in a hairnet pushes a steaming frozen tray at the lens, "This
  right here is...", then the puck demo and "$46 off"
  ([ad](https://www.facebook.com/ads/library/?id=1537572474773598)). Graza, 84 days, the founder at a
  table: "We grew eleven million pounds of potatoes to make this", cut with the production line
  ([ad](https://www.facebook.com/ads/library/?id=1711390340123334)). Graza, 84 days, chips pouring
  through a weigher under "Your new favorite potato chips"
  ([ad](https://www.facebook.com/ads/library/?id=2034231090545315)).
- **First second:** the product pushed at the lens, or the most striking moment of the process.
- **Beats:** a claim only an insider can make; how it is made; the product; offer.
- **Material:**
  - Real: the founder on a phone at work; b-roll of the process.
  - Model: Seedance 2.5 only for a shot that can't be filmed and isn't the proof. Never fake the
    factory.
  - Code: captions, b-roll cuts, end card.
- **Any business:** local service: the owner in the warehouse, "we stock 40 water heaters so you get
  one today". SaaS: the founder in a customer's truck. Practice: the partner in the office. DTC: as
  seen.

### 17. Skit or comedy

- **Looks like:** a short scene already underway, a caption setting it up.
- **In the pull:** 7 / 4.
- **Seen:** Liquid Death, 200 days, a couple in a car with a can in the cup holder
  ([ad](https://www.facebook.com/ads/library/?id=879438635156421)). Atlas Coffee Club, 69 days, "Me
  preparing for a Netflix documentary about how coffee is really made" over a man walking through a
  backyard ([ad](https://www.facebook.com/ads/library/?id=3470897453084064)). True Classic, 77 days,
  "POV: asking neighbors for eggs" at a front door, the product only as the creator's clothes
  ([ad](https://www.facebook.com/ads/library/?id=2067350817236397)).
- **First second:** the situation, mid-scene.
- **Beats:** set-up; the turn; the product as the punchline or the prop; end card.
- **Material:**
  - Real: staff or creators acting; label it a dramatization if it could be read as real.
  - Model: Seedance 2.5 scenes and AI actors only in plainly fictional skits, never as customers.
  - Code: captions and end card.
- **Any business:** local service: the neighbor who tried to fix it himself. SaaS: the dispatcher on
  a Monday. Practice: the tax-season skit. DTC: as seen.

### 18. Reply to a comment

- **Looks like:** a comment bubble at the top of the frame, someone answering it.
- **In the pull:** 1 tagged, and 4 videos in all open on a comment bubble.
- **Seen:** MUD\WTR, 41 days, a man in a MUD\WTR cap answers a comment calling the product expensive
  ([ad](https://www.facebook.com/ads/library/?id=2312904466137170)). Our Place, 46 days, "What do pro
  chefs use to always get the perfect sear?!" over a steak searing
  ([ad](https://www.facebook.com/ads/library/?id=2596075900855943)). Comfrt, 44 days, a creator
  answers "My kiddo would love it" holding the kids' hoodie, with the offer on screen
  ([ad](https://www.facebook.com/ads/library/?id=29039140319014170)).
- **First second:** the bubble and the person or product.
- **Beats:** read the comment; answer it; show the proof; offer.
- **Material:**
  - Real: the owner or staff answering a real comment.
  - Model: product macros under the answer.
  - Code: the comment bubble (name blurred unless they agree), captions, end card.
- **Any business:** local service: "Why so expensive?" answered with the parts and the warranty.
  SaaS: "Does it work without signal?" with a screen recording. Practice: "Do I need a lawyer for
  this?" DTC: as seen.

### 19. Recipe or how-to

- **Looks like:** the finished result first, then the steps, the product in each.
- **In the pull:** 2 / 1, plus 9 ads using it as a second label.
- **Seen:** Onyx Coffee Lab, 69 days, "How to make: tropical soda" over a pour, step titles, ending
  on the box ([ad](https://www.facebook.com/ads/library/?id=2124382605139991)). Ka'Chava, 52 days, a
  creator in her kitchen with the bag, a blender and the finished bowl
  ([ad](https://www.facebook.com/ads/library/?id=1105645091832403)).
- **First second:** the payoff (the pour, the finished dish) with the title.
- **Beats:** result; step 1 to 3 as labels; result again beside the product.
- **Material:**
  - Real: hands and a phone overhead.
  - Model: Seedance 2.5 for the hero pour or steam shot.
  - Code: step titles, captions, end card.
- **Any business:** local service: "How to read your water heater's age in 10 seconds." SaaS: "Build
  next week's schedule in 2 minutes." Practice: "Where to find last year's AGI." DTC: as seen.

### 20. Brand or lifestyle montage

- **Looks like:** several short, well-lit shots of the product in use, little or no text.
- **In the pull:** 18 / 8 (10 studio, 7 phone).
- **Seen:** Onyx Coffee Lab, 171 days, hands open a box on a sunlit counter, beans, brewing, no words
  ([ad](https://www.facebook.com/ads/library/?id=853539411148586)). Poppi, 94 days, can close-ups,
  tabs popping, pours over ice, one small native caption
  ([ad](https://www.facebook.com/ads/library/?id=1622748079402008)). Ruggable, 83 days, a man unrolls
  a rug on a prop-filled counter, then sits down with a second person to talk about it
  ([ad](https://www.facebook.com/ads/library/?id=1117198380988608)).
- **First second:** the product, close, in good light.
- **Beats:** 5 to 8 shots of 1 to 3 seconds; the product in every one; logo or offer last.
- **Material:**
  - Real: a short shoot of the product in its real setting.
  - Model: Seedance 2.5 clips from the product reference image (Higgsfield's Packshot and Motion
    templates fit), with native foley.
  - Code: the cut, one caption, end card.
- **Any business:** local service: a day on the truck in eight shots. SaaS: the app on phones in real
  places. Practice: the office, the team, the handshake. DTC: as seen.

### 21. Animated or 3D explainer

- **Looks like:** an animated or 3D picture of what is happening inside (a body, a machine).
- **In the pull:** 3 ads (a 3D anatomy clip, an animated brand illustration, an animated comparison).
- **Seen:** PetLab Co, 148 days, a translucent 3D dog licking a glowing sore paw
  ([ad](https://www.facebook.com/ads/library/?id=1531843508294925), poster viewed only).
- **First second:** the striking picture of the problem.
- **Beats:** the problem made visible; what fixes it; the product; end card.
- **Material:**
  - Real: none needed.
  - Model: Seedance 2.5 or a GPT Image 2.6 GIF storyboard (below) for the animation.
  - Code: labels and captions.
- **Watch:** an animated mechanism is still a claim and needs support.
- **Any business:** local service: a cutaway of sediment in a water heater tank. SaaS: the data moving
  from the job to the invoice. Practice: a case timeline. DTC: as seen.

## Seen once or twice (not formats yet)

A first-person "Here's why" checklist over a phone photo of steaks and the box (ButcherBox, 13
days), a "News flash" headline that isn't news (ButcherBox, 13 days; skip it, it misleads), a fit
finder chart matching body shapes to products (Honeylove, 20 days), an in-store announcement shot
on a phone in the aisle (Everyday Dose, 68 days), and retailer co-branded cards (Helix, 284 days). For a local business the
last two translate directly: "Now at the Main St. hardware store", "We're in your neighborhood
Tuesday".

## What "real footage" means for each business

| | UGC looks like | Hands demo looks like | Proof looks like |
|---|---|---|---|
| Local service | A tech on the job, phone on the truck dash, the before and after | The one satisfying step, close | Google reviews, the finished job |
| SaaS | A screen recording with a face in the corner | A hand holding the phone with the app | G2 or Capterra quotes, a customer's number |
| Professional practice | The practitioner explaining one thing | The form, the tool, the case file | Client quotes where rules allow, press |
| DTC | A customer on their phone at home | Hands, the package, the pour | Reviews with stars, before and after |

## New, untested: GPT Image 2.6 GIFs

The November 4, 2026 Images 2.6 release can return an animated GIF: set the output format to
`gif`, 2 to 16 frames (default 9), each frame shown 20 to 2,000 ms (default 200). All frames share
one image budget, so frames are small (a 1:1 GIF on Replicate is 512x512). Nobody in the pull ran one, so treat these as tests:

- **An animated brand character** (a mascot that waves, blinks or holds the product).
- **A product loop:** steam rising, a can sweating, a lid opening and closing.
- **A reaction meme** built from the brand's own character or product, for a native post.
- **An animated storyboard** before paying for video: 9 to 12 frames of the planned ad to check the
  idea and the order of shots.

From a real batch: 12 frames at 720x720 and 110 ms per frame worked for a mascot loop. Tell the
prompt the last frame must match the first, or the loop jumps (a stamp mark vanished at the seam).
Check how the GIF plays in the platform's ad preview before launch.

## New, untested: the talking object

Also from that batch: two products with cartoon faces trading three lines of dialogue, about 10
seconds, made from one GPT Image 2.6 frame and Seedance 2.5 image-to-video, with the lines in double
quotes so the speech comes out exactly. Not seen in the pull; test it as a native or skit piece.
