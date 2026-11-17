# Creative for paid social

## The crop-safe zone

A 1080×1920 story asset is **cropped**, not letterboxed, for feed placements:

| Placement | Aspect | Vertical crop from a 1920px asset |
|---|---|---|
| Stories / Reels | 9:16 | none |
| Feed (portrait) | 4:5 | ~285px off each end |
| Feed (square) | 1:1 | ~420px off each end |

Most impressions land in feed. Anything in the top or bottom 420px is destroyed
exactly where it matters most.

**Keep every critical element inside y 420 → 1500** and move it as one block, so
identifier, message, and CTA survive every crop.

Simulate the crops rather than trusting the full-size render:

```js
import sharp from 'sharp';
for (const h of [1350, 1080]) {          // 4:5 and 1:1 from a 1080-wide asset
  await sharp(file)
    .extract({ left: 0, top: Math.round((1920 - h) / 2), width: 1080, height: h })
    .toFile(`crop_${h}.jpg`);
}
```

Then check the Ads Manager preview per placement, which renders for real. That
is what catches what the simulation misses.

## Making it look native rather than designed

Designed-looking creative reads as an ad and gets scrolled past. What reads as a
person:

- **Per-line rounded caption boxes**, not one flat band. The per-line pill is the
  signature of the IG/TikTok caption format; a single band reads as a slide.
- **Heavy bold-italic in a system sans**, not the brand typeface. Slanted type
  reads as native to those platforms in a way upright type does not.
- **Real photographs from the actual work.** In a category where the audience are
  practitioners, one real screenshot or job photo does more identification work
  than any amount of stock.
- **No fake platform chrome.** Progress bars, reply boxes, swipe-up arrows, and
  drawn-in cursors are rejected as mimicking Meta's own UI. A plain caption band
  is fine.

**Auto-fit rather than trusting copy length.** SVG cannot size a rect to its own
text and there's no measuring API, so estimate the advance width and shrink until
it fits. Italic overhangs its advance width, so widen horizontal padding when
italic is on. A clipped line is the kind of defect nobody notices until it has
spent money.

## Special Ad Categories

Employment, Housing, Financial products and services (which replaced Credit in
January 2025), Social Issues/Elections. If your ad is for a job, a home, a loan or
another financial product, you must declare it, and Meta strips the targeting:

- no age or gender targeting (forced 18 to 65+, all genders)
- no detailed interest or behaviour targeting
- **minimum 15-mile radius** on location targeting
- restricted lookalikes

**Consequence: the creative IS the targeting.** With no interest targeting, the
only thing making the right person recognise themselves is the ad itself. Put
the audience identifier in the image as literal words (`TAMPA HVAC
TECHNICIANS`), not a clever hook. Then verify it survives the crop, because that
line disappearing in feed removes the only targeting you have.

Employment and Financial products and services forbid earnings claims. Guard it in code, everywhere copy
can be edited, and fail loudly:

```js
const MONEY = /\$\s?\d|\b\d+\s?(k|dollars|usd)\b|\bper hour\b|\/hr\b/i;
```

The category is **immutable after campaign creation**. Wrong category means
delete and rebuild.

## Advantage+ creative enhancements

Meta will, by default, auto-crop your image, add its own text overlays, adjust
brightness, and generate variations. If your creative's composition is load
bearing (with the safe zone, it is), this wrecks it.

The API field `standard_enhancements` is deprecated and its per-feature
replacement moves, so **set it in Ads Manager**, then confirm via the API:

```
GET /[CREATIVE_ID]?fields=degrees_of_freedom_spec
→ advantage_plus_creative: OPT_OUT
```

## Copy structure

```
message      body text above the image; first ~125 chars show before "See more"
name         headline, bold, under the image
description  small line under the headline; often truncated on mobile
```

Front-load the message. Everything after the fold is for people already
interested.

## Testing variants

Run several creatives in **one** ad set rather than one per ad set. Separate ad
sets split the budget and each learns independently from a fraction of the data;
one ad set lets Meta allocate between creatives on shared learning.

Tag each variant in `utm_content` so you can attribute in your own analytics
rather than only in Ads Manager.
