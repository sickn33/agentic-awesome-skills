# Distance

`distance.py` says how close a variant is to each reference and fails it when the nearest is too close. It is a
guardrail against a near copy of these references, never a legal clearance.

## The measures

Both marks are fitted into the same 128 px box, so size, position and ground colour don't count. The variant is tried
as is, mirrored, and turned up to 6° either way; every measure is taken at its closest pose.

- `overlap`: intersection over union of the silhouettes.
- `edges`: mean nearest distance between the outlines, both ways, in thousandths of the box.
- `hash`: matching bits of a 63-bit DCT hash.

`score`, 0 to 1, is a logistic model on the three, fitted by `calibrate.py`.

## Calibration

`calibrate.py` fits the model and sets the limit from the references themselves:

- different pairs: every pair of distinct references (a pair overlapping over 0.9 is the same logo uploaded twice and
  is set aside);
- near copies: each reference against edited copies of itself, the edits a trace-and-change makes: turned 4°,
  thickened, thinned, stretched 10%, a part cut away, a part added, mirrored, and three at once.

The limit is where 10% of references reach it against their nearest other reference. That's the number that matters:
a variant is checked against all of them, so a per-pair limit would trip on almost every original mark (at 2% per
pair, about 86% of marks against 98 references).

On 98 Are.na references (2026-11-15). The held-out column fits the model on half of them and tests on the other 49
(limit 0.64 there); the second column fits and tests on all 98 (limit 0.81, the shipped default), so it flatters a
little:

| Edit | Held-out half | All 98 |
|-|-|-|
| turned 4° | 100% | 97% |
| thicker | 98% | 92% |
| thinner | 94% | 92% |
| stretched 10% | 98% | 97% |
| mirrored | 100% | 98% |
| part cut away | 100% | 94% |
| part added | 100% | 97% |
| three at once | 94% | 81% |

The limit grows with the number of references, because more of them means a closer nearest one; the catch rate falls
with it. With the person's own 30 or more, recalibrate on them.

## What it misses

- The near copies come from these edits, not from real remixes. A remix that redraws a mark in a new style can keep
  its idea and still score low. The look in step 7 is the backstop.
- Silhouettes stop telling dense, heavy marks apart: a row of rounded bars drawn from nothing scored 0.84 against a
  heavy wordmark. About 1 original mark in 10 is flagged; that's the cost of the limit, and it's why a flag means
  "look at the three nearest", then build another variant.
- It compares shapes, not ideas or names. Trademark risk comes from looking alike in a market, which needs the search
  sheet and, before filing, a clearance search.
- Next, if the cheap measures miss real lookalikes: an image embedding (DINOv2 or DreamSim) as a fourth feature.
