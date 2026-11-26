# 03 — App UI, Dashboards & Existing Codebases (`Operate` / `Read`)

Use this module when building or refining web apps, dashboards, admin panels, settings views, docs, or working inside an existing Tailwind / React / Next.js / Vue / Svelte / Astro repo.

**Important:** Marketing landing-page rules (hero-first gating, headline word caps, dealt themes from [resources/themes.json](../resources/themes.json)) are **DISABLED** here. Functional clarity and existing design-system fidelity win.

## 1. Read Incumbent Visual Truth First
Before editing any component:
1. Check `PRODUCT.md`, `DESIGN.md`, `tailwind.config.*`, `globals.css`, or existing UI primitives (e.g., `components/ui/`).
2. Preserve the project's existing token system, component library, and routing conventions instead of inventing a parallel theme.

## 2. Steering Vocabulary
Interpret or apply targeted refinements with precision:
- **`bolder`**: Increase typographic contrast, surface separation, or focal hierarchy without adding clutter.
- **`quieter`**: Reduce visual noise—strip redundant borders, tone down saturated badges, widen whitespace.
- **`distill`**: Remove unrequested cards, nested containers, and redundant labels.
- **`typeset`**: Fix heading/body scale, enforce `65-75ch` (65–75 characters per line) reading measure, add `tabular-nums` for metrics/tables. (For `Read` mode docs/article views, enforce `65-75ch` max measure by default.)
- **`layout`**: Fix alignment drift, spacing rhythm (tight inside groups, generous between groups, more space above headings than below).
- **`polish` / `harden`**: Complete every edge state before shipping.

## 3. Mandatory App Craft Checklist
- **No card-in-card nesting:** Use spacing, hairline dividers, or subtle surface contrast instead of wrapping cards inside rounded boxes inside cards.
- **Data & Density:** Tables and numeric readouts use `font-variant-numeric: tabular-nums`. Keep secondary metadata muted from the surface hue, never washed-out low-contrast gray.
- **All 6 UI States:** Every interactive view/form handles `default`, `hover/focus-visible`, `disabled`, `loading` (skeleton or inline spinner), `empty` (actionable empty state), and `error` (clear problem + recovery action).
- **Browser Surfaces & Keyboard Navigation:** When authoring new app styles/shells, style `::selection` and `:focus-visible` rings cleanly with project tokens (avoid noisy unrequested global CSS edits in existing repos). Verify logical `Tab` / `Shift+Tab` focus order across forms, tables, and drawers, and fix any horizontal overflow on the offending child container (using `min-width: 0` or scoped scroll containers) rather than applying `overflow-x: clip` or `hidden` to `html, body`.
- **Copy:** Labels match user mental models; buttons state the exact action (`Save changes`, `Revoke key`), never vague marketing fluff.
