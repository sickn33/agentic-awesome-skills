# Measuring

`measure_logo.py` turns each reference into whole-mark numbers. No outline leaves the script: the ink mask is made,
measured and dropped.

## Finding the ink

The ground is the median colour of the image's border; ink is anything more than 12 Lab units from it, split by Otsu.
That handles dark marks on light, light on dark (`reversed`), and colour on a coloured ground. Specks under 0.02% of
the image are dropped, and the mark is cropped to its box.

A reference is skipped, with the reason, when it isn't a flat mark:

| Reason | Test |
|-|-|
| not flat | Otsu's separation under 0.8 (a photo or a gradient) |
| ground not plain, or the mark touches the edge | under 85% of the border near the ground colour |
| too many colours | over 6 colours make up 90% of the ink |
| ink fills the frame | the mark's box over 97% of the image |

On 139 Are.na images it measured 98 and skipped 41. The tests still let some through: a photo of a lightbox sign, a
mark with its caption, a sheet of several marks. That's why step 3 makes you look at `--sheet`, the source and its
mask side by side, and drop the bad ones.

## The numbers

Lengths are per 1000 units of the mark's height.

| Number | What |
|-|-|
| `aspect` | width over height |
| `coverage` | ink over the box |
| `solidity` | ink over its convex hull: 1 is a solid blob, low is open and airy |
| `stroke` | median stroke width (twice the distance to the edge along the skeleton) |
| `stroke_contrast` | 90th over 10th percentile stroke: near 1 is monoline |
| `components` | separate pieces of ink |
| `counters`, `counter_shares` | enclosed holes and their areas over the ink |
| `symmetry` | overlap with itself mirrored, flipped and turned 180° |
| `compactness` | perimeter squared over 4π area: 1 is a disc, high is intricate |
| `corners` | sharp turns on the outline |
| `centre_offset` | ink centroid from the box centre, as a share of height and width |
| `kind` | `wordmark` if wider than 2.2 and in three or more pieces, else `mark` |

Medians on the 98: aspect 1.36, coverage 0.34, solidity 0.42, stroke 59, counters 3, compactness 30, corners 62.

## Using them

The person's references set the target; the wider Are.na set shows the range. Read the spread before averaging: two
references that disagree (a monoline mark and a heavy one) are a question for the person, not a mean.
