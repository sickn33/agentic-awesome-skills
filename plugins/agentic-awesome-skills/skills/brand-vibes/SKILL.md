---
name: brand-vibes
description: "Apply a company's design language to a site from 66 brand profiles, or extract a brand's DNA into semantic tokens for Tailwind, CSS variables or shadcn."
category: design
risk: critical
source: self
source_type: self
license: MIT
date_added: "2026-11-16"
author: instax-dutta
tags: [design-system, brand, tailwind, css-variables, shadcn, typography, tokens]
---

# Brand Vibes

## Overview

Give a website the design language of a named company - cleanly, token-first, and
without turning inspiration into imitation.

Most generated UI converges on the same defaults: Inter, a purple gradient, a
glassy card, a bento grid. This skill replaces guessing with a reference: a
library of full brand design profiles plus a DNA-extraction workflow for companies
that are not in the library. Point the agent at a vibe and it applies the right
tokens to the user's actual stack.

The skill owns the visual DNA: palette roles, type scale, radius, shadow and
spacing systems, component styling rules, and each brand's explicit do and do not
constraints. It does not own layout invention, copywriting, motion choreography or
accessibility review. When another design skill is also loaded, run this one first
so everything downstream styles against the correct tokens.

## When to Use

- The user says "make my site feel like X", "X-style", "X-vibe", "X-aesthetic",
  "apply X's design system", or "redesign in the spirit of X".
- The user names a company whose look they want, or describes a vibe and wants
  candidate references.
- A project needs a coherent token layer before component work starts.

Use a design-direction or critique skill when the question is hierarchy, layout or
motion rather than a named design language. Use an accessibility audit when
contrast and semantics need a dedicated pass.

## Prerequisites

Write access to the user's frontend and knowledge of its stack: Tailwind v3 or v4,
plain CSS variables, or shadcn/ui. The full library of 66 profiles and its index
live in the upstream repository linked at the end and are not bundled with this
skill; without them, use the extraction workflow below on the user's own reference
material. Network access is needed only when extracting DNA from a live site.

The skill edits design tokens and component styles. It copies no assets and adds
no dependency beyond fonts the user approves.

## How It Works

### 1. Resolve the brand

Name match first, then vibe match. One request means one primary brand unless the
user asks for a blend. If they describe a vibe rather than a company, propose two
or three candidates in one short message and let them choose. If the brand is not
in the library, extract its DNA from the live site or screenshots into the same
shape as a profile before styling anything. Never jump straight to writing code.

### 2. Extract the DNA into a semantic token sheet

Before any markup, distil the profile into a stack-agnostic contract:

```text
Colors     background, elevated surface, alternate section, primary/secondary/muted
           text, accent and accent-hover, subtle and strong borders, status colours
Type       display, body and mono families, with weight, tracking and line height
           per tier (display, heading, body, caption)
Shape      small, medium, large and pill radii
Elevation  card and popover shadows, in the profile's own shadow philosophy
Rhythm     spacing base plus signature values
Signature  one sentence naming what makes the brand instantly recognisable
```

Font substitution is mandatory: never hotlink proprietary fonts. Substitute free
equivalents that keep the weight personality and width, and tell the user what was
substituted. A tight geometric grotesque becomes Space Grotesk or Manrope; a
humanist UI face becomes Inter or Inter Tight; a system display face becomes the
system UI stack; a slab becomes the closest Google Font with matching weight
stops.

### 3. Apply to the stack

Detect the stack, then use the matching recipe. Define tokens once, centrally;
never scatter hex values through components.

- **Tailwind v4:** declare the contract inside `@theme` so utilities are generated
  from it.
- **Tailwind v3:** extend colours, font families, radii and box shadows in the
  config with the same semantic names.
- **Plain CSS:** custom properties on `:root`, then style components against them.
- **shadcn/ui:** keep its variable names and map values into them: background,
  foreground, muted-foreground, primary, border, radius.

Apply in order: tokens, then navigation and buttons (the two most
identity-bearing components), then hero, then cards and sections, then forms and
footer.

### 4. Verify before claiming done

- Walk the profile's explicit do-not list and grep the diff for violations: pure
  white on a dark brand, heavy serif weights, cool greys in a warm palette, pill
  radii where the brand forbids them.
- Confirm the signature element is visibly true on the page.
- Accessibility floor, which overrides the brand on conflict: body contrast at
  least 4.5:1, visible focus states, touch targets at least 44 px,
  `prefers-reduced-motion` respected.
- Confirm tokens are centralised, with no stray hard-coded hex outside the token
  file.

### 5. Blend only when asked

A blend gets one dominant brand (structure, type and rhythm, about 70 percent) and
one supporting brand (an accent colour or one signature element, about 30
percent). Never merge both brands' shadows, radii and type; state the split in one
line before building.

Match effort to phrasing: "inspired by" means colours, type, radius and shadow
philosophy; "X-style" adds component treatments and layout rhythm; "pixel-faithful"
adds responsive behaviour and image treatment.

## Examples

```text
User request: "Make my dashboard feel like Linear, we use Tailwind v4."
Inputs: existing dashboard, Tailwind v4, no design system in place.
Expected result (illustrative):
  Tokens declared in @theme: near-black background, luminance-stepped surfaces,
  a single restrained accent, tight tracking on headings, small radii, ring-based
  borders instead of heavy shadows.
  Navigation and buttons restyled first, then the table and empty states.
  Verification: no pure white on dark, accent used sparingly, focus rings visible
  at 3:1, tokens centralised in one block.
```

## Limitations

- The 66-profile library and its index are in the upstream repository, not in this
  bundle. Without it, quality depends on the reference material the user supplies.
- Profiles describe public design systems, not internal component code. Recreating
  a layout from a profile is still design work.
- Brand tokens lose to accessibility requirements every time, so a faithful match
  can be slightly off on contrast.
- It does not write copy, invent layout, or choreograph motion.
- Font substitution changes metrics; a substituted family needs its own spacing
  check.

## Safety and side effects

Modifies frontend files: token definitions and component styles, and may add font
links. No logos, wordmarks, screenshots, illustrations or marketing copy are
copied from the profiled company, and no "powered by" claims are invented;
inspiration stays structural and generic. Reading a live site for DNA extraction is
read-only. Review the diff before committing, and keep the accessibility floor even
when the brand argues otherwise.

## Sources and related skills

- Upstream repository, including the 66 profiles and the index:
  <https://github.com/instax-dutta/brand-vibes>
- Pair with `scroll-3d-world` when the page is a 3D landing page, and with an
  accessibility audit skill before shipping.
