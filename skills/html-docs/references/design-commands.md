# Design Commands — a shared vocabulary for steering a doc

When you (or the user) want to change how a doc looks, it helps to have precise
verbs. "Make it better" is unactionable; "make it bolder" or "quiet the color"
points to a specific set of moves. This file defines a small command vocabulary
— each one is a *named transformation* you can apply to a draft and that the
user can ask for by name.

Use these two ways:
1. **Self-direction:** after a first draft, run `audit` then apply the fixes.
2. **User shorthand:** when the user says "bolder" or "polish it," apply the
   corresponding move below rather than guessing.

All moves preserve the self-contained constraint (inline CSS/SVG, no external
deps) and respect [anti-slop.md](anti-slop.md). Read
[design-system.md](design-system.md) for the underlying system.

---

## Diagnostic commands (look, don't change)

### `audit`
Run the doc through [anti-slop.md](anti-slop.md)'s checklist and report every
tell you find, worst first. Output: a short list of concrete problems with the
specific element/line each refers to. No changes yet.

### `critique`
Give an honest design critique as a sharp art director would: what's working,
what's generic, what the doc is *trying* to be vs. what it *is*. Focus on
hierarchy, focal point, and whether it looks designed for *this* content.

### `distill`
State the doc's design DNA as it currently stands (see
[design-dna.md](design-dna.md)) — dominant hue, type, mood, signature. Useful
to check whether the doc has a point of view at all. If you can't distill it,
it doesn't have one yet.

---

## Transformation commands (change the doc)

### `polish`
The all-purpose cleanup. Tighten spacing rhythm, fix contrast, align the type
scale, remove stray slop, smooth the details. Doesn't change the concept —
makes the existing concept land cleanly. This is the default "make it better."

### `harden`
Make it production-ready and robust: check mobile/narrow widths, ensure
contrast passes, verify the page works in the shadow-DOM viewer, confirm no
external dependencies leaked in, validate that diagrams scale. The
"ship-readiness" pass.

### `bolder`
Increase drama and confidence: bigger hero type, stronger focal point, more
decisive accent use, more generous whitespace, a more pronounced signature.
Turns a timid page assertive. Don't add noise — add *commitment*.

### `quieter`
The opposite: dial back. Reduce the number of accents, calm the motion, soften
contrast, remove decoration, let whitespace and restraint carry it. Turns a
busy or shouty page composed and calm.

### `typeset`
Focus only on typography: choose a deliberate display/body pairing, fix the
size scale and line-heights, sort out tracking on headings, improve measure
(line length), handle widows/orphans, set a real reading rhythm. The single
highest-leverage move on a text-heavy doc.

### `colorize`
Focus only on color: establish ONE dominant hue + one accent, derive a coherent
neutral/muted set from that hue, fix gray-on-color and pure-black/white, tint
the background. Replaces a default palette with a designed one.

### `animate`
Add motion *carefully*: at most one restrained entrance, calm easing, motion
only on genuine affordances. If the doc already has motion, this often means
*removing* most of it and keeping one purposeful moment. CSS-only (see
[effects.md](effects.md)).

### `restructure`
Change the layout DNA: pick a better archetype (report, dashboard, comparison,
timeline, etc. from design-system.md), reorder for a stronger visual lead,
break the three-equal-columns reflex, let importance drive block size.

### `illustrate`
Add or improve visual explanation: convert a wall of text into an inline-SVG
diagram, a hand-authored chart, a comparison table, or a timeline. Lead with
the visual. Color-code consistently and label everything.

### `match <reference>`
Capture the design DNA of a reference (screenshot, named site, brand, or a
sibling doc) per [design-dna.md](design-dna.md) and re-author the doc to those
tokens and style. Use when consistency or a specific look is the goal.

### `theme <mood>`
Re-skin the doc to a named mood (e.g. `theme editorial`, `theme terminal`,
`theme luxe`, `theme clinical`) by swapping the DNA — type, hue, effects,
signature — while keeping the content and structure. Useful for trying
directions fast.

---

## Composing commands

These chain. A typical authoring flow:

```
draft → audit → polish → typeset → colorize → harden → (publish)
```

A "make it pop" request usually means:

```
critique → bolder → illustrate → harden
```

A "tone it down" request:

```
critique → quieter → colorize(fewer accents) → harden
```

When the user asks for something vague, map it to commands out loud ("I'll
*bolder* the hero and *illustrate* the comparison") so the change is legible
and they can redirect with the same vocabulary.

---

## The one rule behind all of them

Every command answers to the doc's design DNA (design-dna.md) and avoids the
tells in anti-slop.md. A command never adds a default; it makes a *decision*.
If applying a command would make this doc look more like every other doc,
you've applied it wrong.
