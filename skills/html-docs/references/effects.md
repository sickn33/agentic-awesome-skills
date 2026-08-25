# Visual Effects — the finishing layer, self-contained only

Effects are the treatments that sit on top of a solid layout: the background
that has character, the depth that makes panels feel placed, the one motion
that makes the page feel alive, the signature flourish that makes it memorable.

**Hard constraint:** every effect here is CSS-only (plus inline SVG). No
external JS, no CDNs, no libraries, no web-font fetches unless the user
explicitly opts in. Docs render in a shadow-DOM viewer and on mobile, so
effects must be self-contained and degrade gracefully. Read
[design-system.md](design-system.md) for the system and
[anti-slop.md](anti-slop.md) for what *not* to do — many "effects" are slop.

Use effects sparingly. One or two deliberate treatments make a page feel
crafted; a pile of them makes it feel like a demo.

---

## Backgrounds with character

The default flat `#fff` is the #1 "untouched" tell. Give the canvas a quiet
personality:

```css
/* Soft tint of the dominant hue — almost subliminal */
background: hsl(28 30% 98%);

/* Gentle top-down gradient */
background: linear-gradient(180deg, hsl(220 40% 99%), hsl(220 30% 96%));

/* Atmospheric radial glow behind the hero */
background:
  radial-gradient(60% 50% at 50% 0%, hsl(264 60% 96%), transparent 70%),
  hsl(264 20% 99%);

/* Section banding — alternate subtle tints to separate zones */
.section--alt { background: hsl(28 24% 97%); }
```

Keep it quiet: this is atmosphere, not decoration. If you notice the
background, it's too strong.

---

## Texture (CSS-only)

Texture adds tactility without images. All of these are pure CSS:

```css
/* Hairline grid — great for technical/blueprint docs */
background-image:
  linear-gradient(hsl(220 20% 90% / .5) 1px, transparent 1px),
  linear-gradient(90deg, hsl(220 20% 90% / .5) 1px, transparent 1px);
background-size: 24px 24px;

/* Dotted field */
background-image: radial-gradient(hsl(220 14% 80%) 1px, transparent 1px);
background-size: 16px 16px;

/* Grain via SVG turbulence (inline data URI, no network) */
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
```

Use one texture at most, at low opacity. Texture is seasoning.

---

## Depth & elevation

Prefer hairline borders over shadows; when you do use shadow, make it soft,
large, low-opacity, and tinted with the hue (never a harsh default gray):

```css
/* Tinted soft elevation */
box-shadow: 0 12px 40px -12px hsl(264 40% 30% / .18);

/* Hairline separation (often better than a shadow) */
border: 1px solid hsl(264 20% 88%);

/* Glassy panel — use sparingly, ensure a fallback bg */
background: hsl(0 0% 100% / .65);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

Reserve elevation for things that are genuinely "above" the page. If everything
floats, nothing does (anti-slop #18).

---

## Accents & signature marks

The small, distinctive touches that make a doc memorable — pick ONE as the
doc's signature, don't stack them:

```css
/* Marker highlight on a key phrase */
.mark {
  background: linear-gradient(transparent 60%, hsl(48 95% 70% / .6) 0);
}

/* Editorial drop-cap */
.lead::first-letter {
  float: left; font-size: 3.4em; line-height: .8;
  padding: .05em .08em 0 0; font-weight: 700;
}

/* Hairline section rule with a hue tint */
.rule { height: 1px; background: hsl(264 30% 86%); }

/* Accent underline that doesn't touch the text */
.link { border-bottom: 2px solid hsl(348 72% 55%); padding-bottom: 1px; }

/* Numbered step badge */
.badge {
  display: grid; place-items: center; width: 2rem; height: 2rem;
  border-radius: 999px; background: hsl(264 60% 50%); color: #fff;
  font-weight: 700;
}
```

---

## Motion — one moment, calm easing

The rule from design-system.md holds: **at most one entrance** for the whole
page, calm easing, never on body text, and always behind a reduced-motion
guard.

```css
@media (prefers-reduced-motion: no-preference) {
  .hero { animation: rise .5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  @keyframes rise {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: none; }
  }
}
```

Good easings: `ease-out`, `cubic-bezier(0.16, 1, 0.3, 1)` (gentle settle).
Avoid bounce/overshoot and staggered cascades across the whole page
(anti-slop #13, #14).

Subtle, *continuous* ambient motion can work for a single hero element if it's
slow and ignorable (e.g. a 20s drifting gradient) — but when in doubt, don't.

---

## Effect recipes by mood

- **Editorial:** 2% warm tint background, hairline top-rules, drop-cap
  signature, no shadows, no motion (or one fade on the title).
- **Technical / blueprint:** hairline grid texture, monospace accents,
  hue-tinted borders, color-coded SVG diagrams, zero decoration.
- **Dashboard:** flat tinted surface, soft tinted elevation on metric cards,
  one accent hue for the key number, no entrance animation (data should be
  instant).
- **Luxe:** deep dark surface, generous space, a single gold/accent hairline,
  one slow ambient gradient, serif display.
- **Playful (rare, earn it):** warm gradient background, rounded radius system,
  one springy-but-quick entrance on the hero only, marker highlights.

---

## The effects rule

An effect must serve the content or the mood. If you can't say which, cut it.
The goal is a page that feels *crafted* — and craft reads as restraint plus one
or two confident, intentional touches, never as a checklist of every trick.
