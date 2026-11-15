# Reading a screenshot

The method for a screenshot, where the answer is a reconstruction rather than a reading. Which property lands in which bucket:

| Exact from pixels | Ratios only | Unavailable |
| --- | --- | --- |
| Color values | Type sizes | Tokens and their names |
| Contrast between any two sampled colors | Spacing values | The stack and styling system |
| Which colors repeat and where | Radii | Breakpoints |
| | Stroke and border weights | Motion, easing, duration |
| | | Every state but the captured one |

You do not know the capture's scale. A screenshot may be at 1×, 2× or browser zoom, so a measured 30px could be 15px of type or 30. Never report a `px` size or spacing from an image alone.

One exception. Where the image contains text you can identify as body copy, assume `16px` and express everything as a multiple of it. Say you did, since the assumption may be wrong.

You cannot even be sure an effect is CSS. A gradient may be a flat image, a `canvas` or a shader.

## Colors, which are the reliable part

Sample the actual pixels rather than describing what you see. Then measure against `better-colors`, which owns these checks:

- Convert each sample to OKLCH, so lightness is comparable across hues.
- Sort by lightness to see whether the samples form a ramp. `better-colors` expects the steps to sit closer together at the light end, so report the spacing you find.
- Compare hue across the ramp. `better-colors` holds hue constant end to end, so report how far it moves.
- Measure contrast on every foreground and background pair you can isolate. It is exact and the most valuable single number an image gives you.
- Check the grays for a few percent of the accent hue, and name a tinted neutral where you find one.

## Type, by category not by name

You cannot identify a typeface from a screenshot with confidence, so never claim one. You can read its category and features, which is what transfers:

- **Category.** Geometric sans, grotesque, humanist, transitional serif or slab. Say which and why.
- **Tells worth naming.** Single or double-storey `a` and `g`, terminal angle, aperture, x-height against cap height. Also whether the digits are lining or old-style and whether the figures look tabular.
- **Scale.** Count the distinct sizes. Express them as multiples of the body size and derive the ratio.
- **Weights.** Count them and estimate how far apart they sit.
- **Measure.** Count characters on a full line of body copy and compare against the 60 to 75 range `better-typography` sets.

Where the actual face matters, name the category and suggest identifying it from the live page.

## Spacing, as a rhythm

Measure in the image, then divide everything by the smallest repeated gap. That quotient set is the rhythm, and it survives not knowing the scale.

Then measure the gap between groups against the gap within one. `better-layout` sets the yardstick at 2× or more for space to carry the grouping. Below that, something else carries it, usually a border or a background shape.

## Say what the image hid

Close by naming what a screenshot could not show, since that is where the reader would otherwise assume you looked:

- Hover, focus, active, disabled, loading, empty and error states.
- Whether anything animates and how.
- Behavior at any other width.
- Whether it is keyboard reachable and whether focus is visible.
- The other appearance, light or dark.

Where any of these matter to the reader's question, say that a live URL would answer it and this image cannot.
