# 05 — Tiered QA & Zero-Context Critic Gate

Execute verification in strict order using the tools available in your environment. Never claim a check passed unless you ran it after your final edit and inspected the result.

## Tier 1: Static Craft Floor Audit (Docs-Only Checklist)
Audit every authored or modified file against the **Universal Craft Floor** (via codebase search / inspection, or via optional external tools if already installed):
- **Layout traps:** Zero `100vw` widths (prefer `overflow-x: clip` on `html, body`); image grid tracks use `minmax(0, 1fr)`; display headings carry `min-width: 0; overflow-wrap: break-word`.
- **Tokens & motion:** Zero un-tokenized random hex colors outside `:root` / theme definitions; zero `transition: all` declarations; explicit `:focus-visible` outlines and `@media (prefers-reduced-motion: reduce)` handling.
- **Anti-slop & copy:** No unearned purple-to-blue gradients, no nested cards inside cards, no bare UI emoji icons, no `"Learn more"` filler buttons, no `Lorem ipsum` / `Acme` / `TODO`.
- *(If the user also installed optional upstream helpers from `yashh1323/atelier-ui@a58151b66421769e1d59f0df3ed04b8c596481f7`, static linting can be automated with `lint-ui.mjs`; on Tailwind/shadcn repos, scope checks to authored files/directories rather than untouched `components/ui/*` primitives.)*

## Tier 2: Live Browser & Responsive Check
For Next.js, Vite, Astro, Svelte, or Vue projects, start the local dev server only when verification requires a live runtime, confirm `http://127.0.0.1:<port>` responds, run your browser check, and stop the dev server cleanly afterward (note: auth-gated routes require a demo route or authenticated session):

1. **With an environment browser tool (Playwright MCP, Chrome DevTools MCP, `agent-browser`, or agent browser subagent):**
   - Inspect both **desktop (`1440x900`)** and **mobile (`390x844`)** viewports.
   - Click through primary interactive controls, tabs, forms, and error/empty/loading states.
   - Check browser console and network tabs for runtime errors, uncaught exceptions, or failed webfont/asset loads (`HTTP >= 400`).
   - Verify no horizontal scroll overflow (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), no broken images (`naturalWidth === 0`), no fixed headers overlapping `<h1>`, and no dead `href="#"` links.
   - Save `.atelier/shots/desktop-1440.png` and `.atelier/shots/mobile-390.png` (plus `-full.png` captures when `QA Depth` is `critic` or `deep`).
2. **With the optional upstream Chromium CDP verifier (kept upstream, not bundled here):**
   - Users needing zero-dependency automated pixel-sampled contrast over `<canvas>` or gradients, fixed-header `<h1>` occlusion checks, multi-route/shot sweeps (`--routes`, `--shots`), webfont HTTP trapping, or 2-up `review-sheet.png` stitching can run `check-ui.mjs` separately from `yashh1323/atelier-ui` at pinned commit `a58151b66421769e1d59f0df3ed04b8c596481f7` (requires Node 22+ and Chrome/Edge/Chromium/Brave).
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
