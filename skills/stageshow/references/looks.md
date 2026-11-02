# Looks

A look is a set of design tokens: color, type, shape and density. The kit's parts read them, so one look restyles every window, field, menu and badge at once while the motion, framing and craft rules stay the same. Use the product's own look whenever there is one: a demo in the product's real colors, radii and type reads as the product, not as a generic mock.

## The built-in looks

`Stage` takes `theme` (`light`, `dark`, `blueprint`, `glass`), `palette` (`accent`, `mono`) and `fidelity`. They are the starting point. A custom look sits on top of one of them, usually `light` or `dark`.

## The tokens

| Group | Tokens | Default |
|---|---|---|
| Surfaces | `--ss-canvas`, `--ss-surface`, `--ss-chrome`, `--ss-well`, `--ss-raised` | warm grays, white |
| Lines | `--ss-line`, `--ss-line-faint` | translucent black |
| Text | `--ss-text-strong`, `--ss-text`, `--ss-text-faint` | three grays |
| Icons | `--ss-icon`, `--ss-icon-faint` | opaque grays |
| Accent | `--ss-accent`, `--ss-accent-2`, `--ss-accent-soft`, `--ss-accent-text` | blue |
| Status | `--ss-success`, `--ss-danger`, `--ss-warning`, each with `-soft` and `-text` | green, red, amber |
| Type | `--ss-font`, `--ss-mono` | the system stacks |
| Shape | `--ss-radius-sm` (6), `--ss-radius-md` (8), `--ss-radius-lg` (10), `--ss-radius-window` (12), `--ss-radius-pill` (999) | px |
| Density | `--ss-control` (34, a text field), `--ss-row` (26, a menu row or segment) | px |
| Shadows | `--ss-shadow-hero`, `-satellite`, `-ground`, `-window`, `-float`, `-lift`, `-card` | see `framing.md` |

The placeholder inks (`--ss-ink-1` to `-5`) are the kit's, not the product's. Leave them unless the product's grays are a different temperature; then pick `Stage greys="cool"` or set the inks from the same gray family.

## Defining a look

As a stylesheet, which can also carry a dark variant:

```css
.look-acme .ss-stage {
  --ss-accent: #5b5bd6;
  --ss-font: "Inter", system-ui, sans-serif;
  --ss-radius-md: 6px;
  --ss-control: 32px;
}
.look-acme .ss-stage[data-theme="dark"] { --ss-surface: #18181b; }
```

```tsx
<Stage className="look-acme" theme="light" ...>
```

Or as values, for one stage: `<Stage tokens={{ '--ss-accent': '#5b5bd6', '--ss-radius-md': '6px' }}>`. Keep a product's look in one file next to its demos and use it on every stage of that product. `examples/looks/` has nine studies. Three invitation variants isolate token choices, including Radix Themes' public tokens (`radix.css`). `studies.tsx` adds a dark console, a financial overview, a creative canvas, a conversation and a research notebook, which change product anatomy, density and hierarchy as well as color. `skeuomorphic.tsx` adds a dimensional transfer receipt: layered paper, a translucent raised frame, coherent lighting and precise edge shadows. Skeuomorphic can mean restrained material depth in software UI, not an imitation appliance; keep the information clear and the physical cues behind it. These are examples, not a closed set: the brief may call for a language none of them use. Borrow the decisions, not an unrelated product's layout. For backgrounds and whole-grid relationships, read `backgrounds.md` and `bento.md`.

## From a codebase

When the product's code is at hand, its look is already written down. Read it before building anything:

1. **Find the tokens.** CSS custom properties (`:root { --color-primary ... }`), a Tailwind config (`theme.extend.colors`, `borderRadius`, `fontFamily`), theme files (`theme.ts`, a tokens JSON), or a component library's provider. Failing that, read the computed styles of the real components: a button, an input, a menu, a card.
2. **Map them.** The primary color to `--ss-accent`; the page and card backgrounds to `--ss-canvas` and `--ss-surface`; the text scale to the three text tokens; borders to `--ss-line`; the font stack to `--ss-font`; the radius scale to the shape tokens (the product's button or input radius to `-md`, its menu item to `-sm`, its popover or card to `-lg`); its input height to `--ss-control`, its menu row to `--ss-row`.
3. **Write the look file** and use it by default for every stage of that product.

Follow what the developer asks for. By default the demo is its own code, styled to match: the kit's small parts restyled with the product's tokens. When they ask for the demo to use their own components (their buttons, rows, avatars, design system), import those inside the stage instead of the kit's small parts. The stage, frames, cursor and motion parts still do their jobs around them: mark what the cursor touches with `data-target` and measure it with `rect()` as usual. Real components bring real density, so the restraint rules still apply: words where they carry meaning, quiet filler elsewhere. If a component fetches data or needs app context, give it fixed props or a small wrapper; a demo never calls a live service.

## From a public site

When the product is someone else's, approximate it from its public site: open it, read the computed styles of a button, an input, a menu and a card, and map them the same way. Take the values, not the assets: no unlicensed fonts or images. Use the kit's local brand marks where they fit (`brands.md`), or the project's own artwork under its terms.

## What a look doesn't change

A look sets visual tokens. The scene still takes on the product's own motion and interaction habits: the kit's timing and framing are defaults. Keep real interaction timing where it helps recognition, then give the audience reading time. Causality, continuous identity, legibility and reduced motion hold whatever the style. A small illustration may need more air than the app itself.

## Check it

Put a still of the demo next to a screenshot of the real product at the same scale. The accent, the grays' temperature, the radii and the type should match at a glance; if a control looks foreign, read its real computed styles again rather than nudging by eye.
