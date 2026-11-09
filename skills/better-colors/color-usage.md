# Color usage

Deploying color once the system exists: meaning, emphasis, gradients and appearance variants. For picking values see [palette-generation.md](palette-generation.md), for naming them [token-naming.md](token-naming.md), for checking pairs [contrast.md](contrast.md).

## One color, one meaning

Users read a near-miss in hue as a slightly different shade, not as a different color.

```css
/* Bad: the accent means both "link" and "decorative heading" */
a { color: #3b82f6; }
.section-title { color: #4f8ef7; }

/* Good: interactive elements own the accent; headings stay neutral */
a { color: var(--color-accent-text); }
.section-title { color: var(--color-text-primary); }
```

The rule runs both ways. A color must not be *absent* where its meaning occurs. If the accent means interactive, an interactive element rendered neutral is just as misleading.

## Use tokens in their role

A value that happens to work in two roles stops working in both at the next theme change.

```css
/* Bad: separator token repurposed as a text color because it looked right */
.caption { color: var(--color-border); }

/* Bad: text token repurposed as a background */
.tag { background: var(--color-text-secondary); }
```

The role inventory in [token-naming.md](token-naming.md) is the list of roles a system needs.

## One colored action per view

```html
<!-- Good: one filled primary action, neutral secondaries -->
<button class="bg-accent-solid text-text-on-accent">Save</button>
<button class="text-text-secondary">Cancel</button>

<!-- Bad: every action colored, so nothing is primary -->
<button class="bg-accent-solid text-text-on-accent">Save</button>
<button class="bg-accent-solid text-text-on-accent">Duplicate</button>
<button class="bg-accent-solid text-text-on-accent">Export</button>
```

Selected states may use the accent on the glyph and label. An active tab or a checked segment is state, not emphasis.

## Gradients

**The interpolation space is a look, not a correctness setting.** Three are worth knowing, and the difference between them is most visible in the middle of the gradient:

```css
/* sRGB: the default and the classic. Midpoint darkens and mutes. */
background: linear-gradient(#3b82f6, #ec4899);

/* oklab: even brightness across the transition. The best default. */
background: linear-gradient(in oklab, #3b82f6, #ec4899);

/* oklch: travels around the hue wheel, staying vivid throughout. */
background: linear-gradient(in oklch, #3b82f6, #ec4899);
```

`oklab` and sRGB are **rectangular**, interpolating in a straight line through the color space. `oklch` is **polar**, interpolating the hue angle, so it arcs around the wheel through every hue between the stops. That is why it stays saturated and why it can produce hues nobody asked for. A blue-to-pink gradient routes through purple, which is either the look or a surprise.

**The gray dead zone is a rectangular-space problem.** Two hues on opposite sides of the wheel sit either side of the neutral axis. A straight line between them passes near gray, and the middle goes lifeless. Either switch to a polar space, which routes around the axis, or add a third stop between the two and keep the space you have.

With a polar space you also control which way it goes around:

```css
/* The short way round, usually what you want */
background: linear-gradient(in oklch shorter hue, #3b82f6, #ec4899);

/* The long way, sweeps most of the spectrum */
background: linear-gradient(in oklch longer hue, #3b82f6, #ec4899);
```

**Banding shows up on large areas.** A gradient spanning a hero with little contrast between its stops steps visibly on 8-bit displays. Widen the contrast, shrink the area or overlay a subtle noise texture.

**Keep text off gradients where you can.** Contrast varies continuously across one, so a single measurement does not describe it. Where text must sit on a gradient, measure the worst region rather than the average, or put a scrim behind it.

## Color across cultures

Where a color carries meaning in finance, status or alerts, verify the meaning holds in every locale you ship to. Chinese financial UIs show gains in red and losses in green, the reverse of English ones. Where the product ships to such markets, make gain and loss per-locale tokens rather than hardcoded values.

## Light, dark and increased contrast

When the product ships a dark appearance, every custom color needs a dark variant, derived per [palette-generation.md](palette-generation.md). Users who enable increased contrast expect visibly stronger differentiation in each appearance:

```css
:root {
  --color-accent-solid: var(--blue-600);
}

@media (prefers-contrast: more) {
  :root { --color-accent-solid: var(--blue-900); }
}

@media (prefers-color-scheme: dark) {
  :root { --color-accent-solid: var(--blue-400); }
}

@media (prefers-color-scheme: dark) and (prefers-contrast: more) {
  :root { --color-accent-solid: var(--blue-200); }
}
```

A single `prefers-contrast` block shared by both appearances darkens the color on a dark background too, lowering contrast there. The increased-contrast variant widens the gap to its background by at least `0.15` of OKLCH `L` over the default. Remeasure it, aiming for Lc 90 on body text. Widening the gap without remeasuring is not fixing it.
