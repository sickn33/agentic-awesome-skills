# Extras

Each extra is off unless enabled by a CLI flag or the config.

## Variant compare

Capture every value of a query parameter on head and show them side by side so reviewers can pick.

```bash
ui-diff run --pr 12 --variants hero=1..4                 # every captured route
ui-diff run --pr 12 --variants "/pricing:plan=basic,pro"  # one route
```

```json
{ "routes": [{ "path": "/", "variants": { "param": "hero", "values": "1..4", "viewports": ["desktop"], "themes": ["light"] } }] }
```

`values` is a range (`1..4`, `0..20..5`), a comma list or an array (max 12). By default variants
use every selected viewport and the first theme. The comment gets one table per route and viewport
plus a checklist (`- [ ] hero=2`); reviewers with write access tick their choice, and ticks are kept
when the sticky comment is updated. `variants/*__strip.png` is a single labelled image of all
variants. Set `"variants": { "enabled": false }` at the top level to ignore configured variants.

## Motion clips

Static screenshots miss hover states, transitions and micro-interactions. Motion records the same
scripted interaction on base and head and encodes one looping side-by-side GIF (renders inline in
PR comments), plus optional WebM files per side.

```json
{
  "motion": { "enabled": true, "format": "gif", "fps": 10, "scale": 0.6, "durationMs": 3000, "parallel": true },
  "routes": [{
    "path": "/",
    "motion": {
      "steps": [{ "wait": 300 }, { "hover": ".cta" }, { "wait": 600 }, { "click": "[data-tab=yearly]" }, { "scroll": 600 }],
      "durationMs": 3500,
      "viewport": "desktop"
    }
  }]
}
```

Steps: `hover`, `click`, `focus`, `press` (key), `fill` + `value`, `scroll` (px or selector,
`smooth` default true), `wait` (ms), `waitFor` (selector), `mouse` ([x, y]). A step whose element
does not exist on one side (e.g. a new control) is skipped there and noted in the comment.
`fromNavigation: true` starts recording before the page loads (entrance animations).
`--motion` on the CLI records routes that declare `motion`; if none do, it records page load plus
`motion.steps` for every captured route. Which of those get a clip:

- When ui-diff detected the changed files (the usual run), a route gets a clip when one of its
  changed files touches motion: transitions, animations, keyframes, transforms, opacity,
  `:hover`/`:focus`/`:active`, motion libraries (Framer Motion, GSAP, React Spring...), or the
  classes, ids and attributes the motion steps target (`.cta`, `[data-tab=yearly]`). That
  includes transition-only changes, which leave the still capture unchanged. Other routes are
  listed in `motionNoAnimation`. A changed animation package records every candidate.
- Without detection (`--routes`, `--all-routes`), routes without a visual change are skipped
  (listed in `motionSkipped`).
- `--motion-all` or `motion.all: true` records every candidate.

Each side is recorded from a single page load: the GIF frames and the WebM come from the same run
of the steps, and base and head are recorded at the same time (`motion.parallel`, default true;
set false to record them one after the other). `format`: `gif` (default), `webm` or `gif+webm`.
Animations run normally here (no freezing, no fixed clock, and `prefers-reduced-motion:
no-preference` even though static captures use `reduce`); GIFs are 10 fps and downscaled to keep
PR comments light. Each clip reports its distinct frame count per side (`frames`); a clip with a
single frame gets a "no motion detected" warning.

## Design-token audit

```bash
ui-diff run --pr 12 --tokens src/styles/tokens.css,design/tokens.json
```

```json
{ "tokens": { "enabled": true, "files": ["src/styles/tokens.css"], "scope": "changed-regions", "allow": ["1px", "#ffffff"] } }
```

Token files: W3C design tokens (`$value`/`$type`, `{alias}` references, typography composites),
Style Dictionary (`value`/`type`), plain or Tailwind-style nested JSON, and CSS custom properties
(`--name: value`, `var()` references resolved, every theme block read), and StyleX token files
(`*.stylex.ts` with `defineVars`, `defineConsts` or `createTheme`; read statically, never executed:
literal strings and numbers only, conditional values such as `{ default, '@media …' }` all
allowed). With no files configured, `tokens.enabled` (or `--tokens auto`) looks for `*.stylex.ts`
token files and `tokens.json`/`tokens.css` style files in the app. Tokens are classified as
color, spacing, radius, font size, font weight, font family or line height from `$type`, their
name and their value: long names (`--space-4`, `font.size.sm`, `--radius-md`) and common short
ones (`--s-4`, `--sp-4`, `--fs-sm`, `--fw-bold`, `--ff-serif`, `--lh-tight`, `--r-md`) work, and
any color value counts as a color token. When your names say nothing about the kind, map them:

```json
{ "tokens": { "categories": { "spacing": ["--gx-*"], "font-size": ["type.*"], "radius": ["corner.*"] } } }
```

A base unit token named `--spacing` (Tailwind v4) allows multiples of it. Kinds with no recognized
tokens are not audited, and the comment and summary say so.

During capture ui-diff records the computed styles of visible elements; colors are normalized in
the browser, so `oklch()`, `color-mix()` and named colors compare correctly. The audit checks
text color, background, border colors, margins/padding/gaps (auto-centering margins are ignored),
radii, font size, weight and family. Only changed screens are audited, and with the default scope
only elements that intersect the changed areas. Each finding lists selectors, the nearest token
(for colors only below a CIEDE2000 difference of 5; otherwise "no close token") and whether base already used the value: new values are reported, existing
ones are collapsed. Categories without any tokens are skipped. Options: `properties`,
`colorTolerance` (per channel, 2), `pxTolerance` (0.5), `remBase` (16), `allow`, `categories`, `ignoreSelectors`,
`maxFindings`. Styles are recorded for at most `capture.styleMaxElements` (2500) visible elements per
capture, in document order and including open shadow roots; a capture that has more gets a warning,
because elements past the cap are not audited. The older `tokens.maxElements` still works when
`capture.styleMaxElements` is not set.

## Accessibility delta

```bash
ui-diff run --pr 12 --a11y
```

```json
{ "a11y": { "enabled": true, "tags": ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"], "rules": { "tabindex": true }, "themes": ["light", "dark"] } }
```

axe-core runs on both sides of every capture (restrict with `viewports` / `themes`). Violations are
matched by rule and selector (falling back to the element's HTML when selectors shift), and only
issues that appear or disappear are reported, grouped as contrast, labels, focus or other.

Focus order: ui-diff tabs through the page (up to `maxTabStops`, 40) on both sides and reports new
or removed tab stops, controls whose accessible name changed (e.g. a removed `<label>`), reordering,
and new jumps against reading order (focus moving up, or left on the same line). Set
`focusOrder: false` to skip it.

## Protected previews

See `privacy.md`. Short version:

```json
{ "auth": { "headers": [{ "name": "x-vercel-protection-bypass", "env": "VERCEL_AUTOMATION_BYPASS_SECRET" }] } }
```

```bash
export VERCEL_AUTOMATION_BYPASS_SECRET=…   # from your secret manager / CI secrets
ui-diff run --base-url https://app-git-main-acme.vercel.app --head-url https://app-git-feature-acme.vercel.app --routes /,/pricing
```
