# 02 — Brand, Marketing & Portfolio Sites (`Persuade` / `Experience`)

Use this module for greenfield company sites, landing pages, product showcases, portfolios, and local businesses.

## 1. Classify Business Kind First
Never apply tech-startup aesthetics to physical trades or local shops:

| Kind | Examples | Visual & Motion Rules |
|---|---|---|
| `software` | SaaS, AI, devtool, fintech | Real product UI previews/diffs, clean node diagrams, max 1 subtle shader/WebGL accent. |
| `gaming` | Game studio, game launch | Full-bleed key art, dramatic display type, rich media bands. |
| `tech` | Hardware, robotics, devices | Product photography/renders, spec callouts, bench/context shots. |
| `product` | Physical goods (furniture, coffee) | Anchor-scale photography, color swatches that swap images, zero WebGL shaders. |
| `service` | Agency, clinic, law firm, studio | Human/workspace photography, crisp proof, calm flat grounds, zero shaders. |
| `place` | Cafe, bakery, hotel, gym, shop | Photography-led, flat color grounds, square/clean framing, hours/address (street + district only), **strictly zero WebGL/shaders**. |

## 2. Deal a Theme (Anti-Convergence)
Read [resources/themes.json](../resources/themes.json). Pick a palette + typography pairing that matches the business kind and differs from your last build (check `.atelier/history.json` if present):
- **Never** default to Inter + dark slate + purple gradient unless explicitly requested.
- Set `:root` CSS variables (or Tailwind v4 `@theme` tokens) upfront—including the theme's `surface` tokens (`elevation`, `shadow`, `ease`, `focusRing`)—so no raw hex colors or generic shadows leak into components.
- **Accent contrast scope:** Pair `--accent` with `--accent-ink` for filled buttons and badges (all six themes `>= 4.63:1`) and use `--accent` for focus rings and large UI signals (`>= 3.13:1`); when styling small inline body links, verify `>= 4.5:1` contrast against the underlying `--bg` or `--surface` (or use underlined `--ink`).
- **Load fonts properly:** Request only the weights listed in each theme's `weights` field when adding a Google Fonts `<link>` or `next/font` call (single-weight display fonts like `Instrument Serif` and `Bebas Neue` only publish `400`; requesting unsupported weights returns HTTP 400 and fails font load checks). Keep the system fallback stacks from `resources/themes.json` so offline or sandboxed headless runs still render proportionally.
- After shipping a brand build, append `{ "date": "YYYY-MM-DD", "themeId": "<id>" }` to `.atelier/history.json` (array of prior theme picks) so repeat builds rotate pairings. If shipping multiple pages, verify all of them in one pass (`/` and sub-routes).

## 3. Hero-First Gate
1. Design the hero layout posture (`split`, `editorial`, `full-bleed-photo`, `product-stage`, or `type-poster`).
2. Keep the hero focused: headline (<= 8 words), 1 crisp sub-sentence, 1–2 concrete `<Verb> <Object>` actions, and 1 signature visual visible at `1440x900` without scrolling.
3. Build **only the nav and hero first**. Run an initial desktop (`1440x900`) and mobile (`390x844`) layout and keyboard focus check against your local preview (`http://127.0.0.1` or `http://localhost`) using your environment's browser tool (or the optional upstream Chrome CDP verifier `check-ui.mjs --allow-pending-anchors` from `yashh1323/atelier-ui@a58151b66421769e1d59f0df3ed04b8c596481f7`, strictly against trusted local previews in an isolated profile, so unfinished lower `#section` links do not block the hero pass), and defer the Tier 3 critic review until lower sections exist.

## 4. Real Material Rules
- **No amateur SVG stand-ins:** Never draw cartoon SVG people or fake charts where real product UI, structured HTML tables, or clean photography belong.
- **No invented proof:** Never fabricate customer logos, star ratings, testimonials, or fake street addresses.
- **No broken image tags:** Use local assets, generated assets, or verified URLs with proper aspect ratios (`object-cover`). If no photography is supplied, render clean CSS/HTML product panels or aspect-ratio media placeholders styled with surface tokens—never empty `<img src="">` tags.
- **One idea per screen:** Give sections generous vertical breathing room; avoid packing 4 dense grids into a single viewport.
