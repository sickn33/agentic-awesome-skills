# 05 — Tiered QA & Zero-Context Critic Gate

Execute verification in strict order using the tools available in your environment. Never claim a check passed unless you ran it after your final edit and inspected the result.

## Tier 1: Static Craft Floor Audit (Docs-Only Checklist)
Audit every authored or modified file against the **Universal Craft Floor** (via codebase search / inspection, or via optional external tools if already installed):
- **Layout traps & overflow root causes:** Zero `100vw` widths and **zero root `overflow-x: clip` or `overflow-x: hidden` on `html, body`** (root overflow clipping masks layout bugs and hides off-screen keyboard-focusable elements). Fix overflowing elements at the source: image/grid tracks use `minmax(0, 1fr)`, flex/grid children carry `min-width: 0`, media uses `max-width: 100%`, and display headings carry `min-width: 0; overflow-wrap: break-word`.
- **Tokens, motion & keyboard focus:** Zero un-tokenized random hex colors outside `:root` / theme definitions; zero `transition: all` declarations; explicit `:focus-visible` outlines, logical keyboard focus order without positive `tabindex` hacks or off-screen clipped controls, and `@media (prefers-reduced-motion: reduce)` handling.
- **Anti-slop & copy:** No unearned purple-to-blue gradients, no nested cards inside cards, no bare UI emoji icons, no `"Learn more"` filler buttons, no `Lorem ipsum` / `Acme` / `TODO`.
- *(If the user also installed optional upstream helpers from `yashh1323/atelier-ui@a58151b66421769e1d59f0df3ed04b8c596481f7`, static linting can be automated with `lint-ui.mjs` (do not run `--fix` to introduce root `overflow-x: clip` on `html, body`; fix the overflowing child element directly instead); on Tailwind/shadcn repos, scope checks to authored files/directories rather than untouched `components/ui/*` primitives.)*

## Tier 2: Live Browser, Responsive & Keyboard Check
For Next.js, Vite, Astro, Svelte, or Vue projects, start the local dev server only when verification requires a live runtime, confirm `http://127.0.0.1:<port>` responds, run your browser check, and stop the dev server cleanly afterward (note: auth-gated routes require a demo route or authenticated session):

1. **With an environment browser tool (Playwright MCP, Chrome DevTools MCP, `agent-browser`, or agent browser subagent):**
   - Inspect both **desktop (`1440x900`)** and **mobile (`390x844`)** viewports.
   - Click through primary interactive controls, tabs, forms, and error/empty/loading states.
   - Step through all interactive controls (`a, button, input, select, textarea, [tabindex]`) using `Tab` and `Shift+Tab` at both desktop and mobile widths to confirm logical focus order, visible `:focus-visible` rings, and that no focusable element is clipped or positioned off-screen.
   - Check browser console and network tabs for runtime errors, uncaught exceptions, or failed webfont/asset loads (`HTTP >= 400`).
   - Verify no horizontal scroll overflow (`document.documentElement.scrollWidth <= document.documentElement.clientWidth` **without** `overflow-x: clip` or `hidden` on `html, body`—if overflow occurs, inspect element bounding boxes and fix the specific overflowing child component), no broken images (`naturalWidth === 0`), no fixed headers overlapping `<h1>`, and no dead `href="#"` links.
   - Save `.atelier/shots/desktop-1440.png` and `.atelier/shots/mobile-390.png` (plus `-full.png` captures when `QA Depth` is `critic` or `deep`).
2. **With the optional upstream Chromium CDP verifier (kept upstream, not bundled here):**
   - Users needing zero-dependency automated pixel-sampled contrast over `<canvas>` or gradients, fixed-header `<h1>` occlusion checks, multi-route/shot sweeps (`--routes`, `--shots`), webfont HTTP trapping, or 2-up `review-sheet.png` stitching can run `check-ui.mjs` separately from `yashh1323/atelier-ui` at pinned commit `a58151b66421769e1d59f0df3ed04b8c596481f7`. Note that pinned `v1.1.0` `check-ui.mjs` passes `--enable-unsafe-swiftshader` for software WebGL, so it must only be run inside an isolated disposable browser profile against trusted local build outputs (`http://127.0.0.1`, `http://localhost`, or local project files) — never against arbitrary or untrusted remote URLs.
3. **If no browser runtime is available:**
   - Report honestly that runtime pixel/overflow/font checks were **not executed**; do not claim rendered verification from code reading alone.

## Tier 3: Zero-Context Critic Pass (When `QA Depth` is `critic` or `deep`)
Spawn **one** fresh subagent on a fast/lightweight vision-capable model with **NO code access and NO prior conversation context**. Pass the captured desktop and mobile screenshots (for `3D` builds in [04-3d-visual.md](04-3d-visual.md), score `Composition, Lighting, Color/Materials, Craft`):

```text
You are a strict design director seeing this UI for the first time.
Review the desktop (1440px) and mobile (390px) screenshots.
Score 1-10 on: Hierarchy, Typography, Color/Contrast, Spacing/Alignment, Craft (zero AI slop).
List the top 3 concrete visual defects (exact location, what looks off, exact fix).
If all dimensions are >= 8 and no layout defects exist, verdict: SHIP. Else: FIX.
```

- If verdict is `FIX`, address the defects in one clean batch, re-run Tier 1 & Tier 2 checks, log scores in `.atelier/ROUNDS.md` when `deep`, and finish within the brief's round cap.
- If subagents are unavailable, audit the screenshots directly against the rubric and report any limitations candidly.
- **Repo hygiene:** Unless the user wants `.atelier/` kept, add `.atelier/` to `.gitignore` or remove temporary screenshots before final commit/handoff.
