# Tokens

The defaults fit a hand-rolled app. When the repo already has a token source other tools read, keep its format, apply these rules inside it and record the departure. A foundation's own names are never renamed.

## Layers

| Layer | Holds | Read by |
|---|---|---|
| Primitive | Raw values with palette names: `gray.900`, `space.4` | Semantic tokens only |
| Semantic | Roles: `color.text.subtle`, `color.surface.raised`, `space.inset.md` | Components and product code |
| Component | A value one component themes apart from its role | That component only |

- Product code reads semantic tokens. A semantic token is an alias to a primitive, never a raw value.
- Start with zero component tokens. Delete one that only aliases a semantic token.
- Themes swap which primitive a semantic token points to. Every semantic token resolves in every theme. A theme the app ships on any route counts as shipped, even half built, and each value it lacks is a gate whose default is the nearest existing role.

## Names

- Name by purpose: `color.text.danger`, not `color.red`. The order is category, role, variant, state.
- Pair every surface with its foreground (`surface.inverse`, `text.inverse`) and check contrast on the pair.
- One word per idea. If `subtle` means lower emphasis in text, it means the same in borders. Do not also use `muted` and `secondary`.
- Keep a working name even when you would have chosen another. Split a token only when the inventory shows it doing two jobs.
- A role that starts with its property word doubles the class (`text-text-muted`). `rule/doubled-utility` flags it.
- No brand or product words in semantic names. Those are gates.

## What never becomes a token

`0`, `100%`, `auto`, `currentColor`. A value used once for one layout. Values set by content (an aspect ratio, chart colours from a scale). Third-party widget internals. Logo and illustration art. Math between tokens (`calc(var(--space-inset-md) * 2)`). A value within tolerance of an existing token maps to that token and makes no new one.

## Tolerances

Tolerance applies only after purpose fits. These are defaults, so `design-how-token-mapping` and the merge decisions agree.

| Category | Limit |
|---|---|
| Colour | delta E OK 2 (under 0.5 is exact) |
| Spacing, size, radius | 2 px |
| Font size | 1 px |
| Line height | 0.05 as a ratio |
| Border width, weight, family, easing | none, each value is a choice |
| Opacity | 0.02 |
| Duration | 30 ms |

A merge inside tolerance is a decision. A merge past it is a gate whose default is the merge, naming the largest shift and the surfaces it touches.

## Generating

Use the generator the repo has, or a short script. Output is sorted, the first line says it is generated and by which command, and a second run leaves no diff. Errors name the token path and the valid options. A brand value given as hex keeps its exact colour, so convert to another format with code, never by eye, and keep the hex in the description.

Do not reset a styling framework's whole palette to block palette classes, because stock components read black, white and transparent from it. `rule/palette-use` catches palette classes instead.

## Motion

Name the presets before the first component, by job: `instant` (press), `micro` (hover), `enter`, `exit`, `overlay`, `sheet`, `collapse`, `loader`, `follow` (drag). Each has a duration, an easing, the properties it animates and its reduced-motion form.

- The surface's tier caps announce motion. High-frequency surfaces (nav, list rows, primary actions, menus) get `instant` or first-open motion only.
- Enters ease out, exits are shorter than enters, nothing enters from `scale(0)`, and only progress and loops are linear.
- Animate `transform` and `opacity` only. Fix a motion finding with the first of these that clears it. Delete the animation, shorten or shrink it, fix its curve or origin, make it interruptible, move it to `transform` and `opacity`.
- When the app has no motion for a job, the gate default is `instant`.
