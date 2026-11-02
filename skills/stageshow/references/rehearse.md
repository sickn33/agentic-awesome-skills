# Rehearse

A dress rehearsal: run the whole demo at real speed and watch it as the audience will, before anyone does. Read every image you make, and confirm the page you filmed runs the code you wrote. The rules the film lines enforce are in `framing.md`, `craft.md` and `motion.md`; this file is how to film and what to watch.

## Prove the still before choreography

Render the opening and the payoff at both shipping widths beside the gold at shown size; the reduced-motion poster is not the opening, and it has to work as the only frame (`motion.md`, Story). Ask the still questions in `verify.md` (Framing, Hierarchy and density), then:

- Can the viewer find the focal object and what changes before any branding or copy?
- Compare the quality (hierarchy, density, spacing, crop, material) against the gold, separately from whether every object in the brief is present.
- Do the same for the busiest mid-story frame and every resting state that changed. A clean tool report does not close a composition question.

## The host's own controls

A demo lives in a page with a picker, playback buttons and labels, and those get judged too. `scripts/layout.mjs` checks ordinary UI outside a Stage, including a bento tile's inner crop (`nested-composition-crop`):

```sh
node scripts/layout.mjs "<url>/?example=hero-demo" --select .pg --width 390 --report shots/host-layout.json --screenshot shots/host-layout.png --strict
```

Run it on the viewer page, the direct scene route and the real destination page at its real width. Moving geometry is reported as incomplete, not passed. Watch each control at rest, hover in and out, pressed, focused, label changed and interrupted mid-transition; geometry cannot vouch for text rendering, focus styling or a filtered silhouette.

## Film

`scripts/film.mjs` opens a page in headless Chrome and shoots the stage at a fixed interval into one contact sheet at true size. It prints console and `[stageshow]` warnings (loop seams, missing targets); `--help` lists every flag.

First time: copy `scripts/` beside `kit/`, `npm i -D playwright-core` (and `postcss` for the CSS check); `CHROME_PATH` picks another Chrome. The kit itself needs neither.

In the playground, film the direct `?capture=<name>` route (the ordinary viewer wraps the scene in an iframe); on a site, the real page URL (open an embedded frame's URL directly when needed). Still watch playback, pause, resume and Replay in the viewer yourself.

```sh
node scripts/film.mjs "<url>/?capture=hero-demo" --out shots/hero.png --every 1000 --count 18
node scripts/film.mjs <url> --out shots/still.png --still                        # one clean image of a still
node scripts/film.mjs <url> --out shots/phone.png --width 390 --every 2500 --count 6
node scripts/film.mjs <url> --out shots/drop.png --at drop --every 50 --count 24   # one beat, frame by frame
node scripts/film.mjs <url> --out shots/zoom.png --zoom 380,40,240,120 --still    # close-up, in stage design px
node scripts/film.mjs <url> --out shots/hover.png --hover --every 300             # play="hover": rest, hover, leave
node scripts/film.mjs <host-url> --select "#feature-demo" --report shots/report.json --strict
```

- **Selection and marks.** Film discovers every visible `.ss-stage` (hidden compact or wide twins skipped); `--select` narrows; `--at` and `--zoom` need one stage. Call `act.mark('drop')` at a beat and film with `--at drop`; never guess delays.
- **Close-ups.** `--zoom x,y,w,h` is in stage design pixels at high resolution; `--zoom target:<name>[,pad]` follows a `data-target` every frame. Stills wait for a rolling `Count` to land.
- **Hover stages.** `--hover` films rest, hover and the settle after leaving; the rest frame must stand as a still and leaving must glide back without a jump.
- **Looks and widths.** `--dark` films the dark theme; `--width 566` for a 550 column; `--slow 6 --every 40` samples a landing or press closely (stage and CSS both slow).
- **Jumps.** Film records geometry every animation frame and reports `jump:` and `drift:` candidates at their timestamps. Fix accidental ones; mark an intentional step narrowly with `data-snap`. `node scripts/jumps.mjs "<url>/?capture=<name>" --ms 30000 --report shots/jumps.json` runs a longer scan without screenshot overhead.
- **Coverage.** Empty, short or gapped recordings (gaps over 1.6x the typical interval, intervals over 40ms) are `inconclusive`, exit 2. Camera omissions and same-box text changes are listed for manual review.
- **Reports.** `--report <path>` writes JSON (`status` and `exitCode`, with each stage's `coverage`, `findings` and `manual` under `stages`); `--strict` exits 1 on candidates; `no-issues-detected` is not approval; exit 3 on persistent dev reloads.
- **Class clashes.** `node scripts/class-clash.mjs <demo folders>` (needs postcss) checks overlapping class namespaces. A scoped `.row` is fine, an unscoped one is not; complex roots are inconclusive. Check repeated demos together on the host too.

## Lines that are never intentional

Not candidates for judgment: fix the cause and re-shoot. `film.mjs --gate` ends `rehearsal passed` only when all are at 0. Clearing a line by hiding, removing or marking (`data-crop`, `data-snap`) the thing it points at is a bug, and the fresh eye re-judges every line you call intentional.

| Line | What it means |
|---|---|
| `framing:` | A gutter, bleed, crop or window shape `framing.md` forbids; a hero floating whole; a popover against an edge |
| `cut by the crop:` | An action or chip sliced by the stage edge; filler bleeds, actions read whole or not at all |
| `tight stack:` / `loose stack:` | A title on its subtitle with under 3px of ink between, or drifting past 10px in a small label (4 to 6px is right) |
| `tight mark:` | A status dot within 5px of the avatar or text, or outside its row (6px clear) |
| `tight inset:` | Words under 8px from a window's, card's or row's edge (12px is right) |
| `skeleton ladder:` | At realistic fidelity, a list in frame (4+ rows) where the wordless rows (at least 3) outnumber the worded ones |
| `onion skin:` | See-through fills overlapping at rest |
| `kit override:` | Your CSS reshaping a kit part's geometry (rows, bubbles, stamps, avatars, phones) |
| `unit wrapped:` | A stat's unit on its own line |
| `clipped glyph:` | An icon drawn past its box |
| `loose list:` | Rows spread out to fill a pane |
| `fat row:` | A one-line row three times taller than its words |
| `empty pane:` | A void under a pane's or screen's content |
| `emoji icon:` | An emoji where an icon belongs |
| `anchor drift:` | An open popover moving as its list changes height |
| `uneven padding:` | A card or tile whose content sits about a third closer to one edge than the side inset, or past it |
| `mixed icons:` | Filled and outline glyphs side by side in one nav, list or toolbar |
| `tight control:` | A button or chip with under 8px between it and the field, line or card edge above it |
| `invented mark:` | A one-letter tile in a brand color beside a real company's name |
| `uneven inset:` | A bar, pill or row of controls whose children sit much closer to one end than the other |
| `uneven gutters:` | A window or panel in a tile much closer to one side than the other |
| `avatar alignment:` | A body under an avatar row starting under the avatar instead of at the name's edge |
| `spills its slot:` | Content running past the width it was laid out in, or closing its row's gap |

A `[stageshow] selection drift` kit warning (a text selection that isn't under the I-beam) fails the gate too.

## Other film lines

Candidates, each named beside its rule. In `craft.md`: `touching` (text within 5px of a box) and `tight lines` (bars closer than the text they stand for), `lopsided`, `uneven`, `near-tangent`, `half-pixel glyph`, `squeezed`. In `motion.md`: `covers`, `dashed edge resizes`, `handoff shift`, `settle snap`, `fly size`, `hard edge`, `appears, then moves`, `near-empty frames`, `lands on a transform`, `steps in its box`. Defined only here:

- `clipped:` is a mark sliced by a container edge inside the stage; fix it, or mark the container `data-crop` only if the crop is deliberate.
- `unclipped:` means the page decides the crop: give the stage `overflow: hidden`. `double corner` means two rounded clips share an edge with different radii: give one the corner.
- `appears with no entrance` and `vanishes with no exit` can be missed in a sampling gap; film each appear and disappear at 50ms. Instant typing feedback may be intentional: `data-typing` or `data-snap` on the exact changing node, never a whole field or subtree.
- `shrunk, not laid out for the phone: drawn at 0.72` means the type will read small at that width: give it a `compact`. `grown past the design size` means it reads large; `small text: X renders at Npx` is text under 10px, checked at widths under 600.
- A pen tip intentionally leading a draw carries `data-lead`.

## What to watch

- **Framing first.** Film the still and clear every `framing:` and `cut by the crop:` line before motion work; after moving anything, re-shoot the whole loop.
- **Every frame, at the real width,** including the figure in view before it has loaded.
- **Measure, don't eyeball.** Compare computed styles across the page (one shadow, plate, radius set); sample a morph every animation frame, not from a sheet.
- **The loop, end to end.** Film one full loop plus the start of the next; investigate every `loop seam` warning.
- **Text and glyphs.** Inspect pixels at `--slow 4` after a move; a compositing layer is a possible fix, not proof the pixels stayed still. Nothing spills out of its box on any frame.
- **The whole drag,** hover to settle at speed, then stepped: the surface never lifts before the press; track the hand's hotspot through every transform. A temporary zero-size child at the grip point makes the browser project every transform (subtract the parent border); a hand-written matrix can miss separate `translate`, `rotate` or `scale`.
- **Overlays land.** Highlights, selections and markers sit on the thing they describe at every scale; check a drag box against the items it claims.
- **Crops explain themselves.** Every edge where screen meets stage fades, bleeds with intent, or is a real window edge.
- **Edges and corners.** Zoom into hover fills and selected rows: rounded corners intact under a parent's `overflow: hidden`.
- **The narrowest shipping host.** Film the whole loop at 390 and at the brief's own width when it names one, gutters included, read as closely as the wide pass.
- **Every look shipped,** filmed separately.
- **Check the host.** The demo works in the real page at every shipping width (plate, ground, padding, crop). Page backgrounds stay in the host; a component brings no full-page wrapper.
- **Reduced motion.** `--reduced` shows the poster, still and complete; overlays from `rect()` sit right in it; toggle the preference during playback and back. Drop presentation waits; keep task timing and reading time.
- **Live pacing.** The virtual clock proves geometry, not frame rate: log rAF timestamps against the transform on the real page; repeated poses then a jump mean a clock bug. Pause, offscreen, hidden tab and finished `once` scenes stop their work; resume and replay never skip a beat or replay an accumulation. Say which browser and device you checked.
- **Typecheck.** Run the host's typecheck (`npm run typecheck` from the skill folder); report unrelated failures separately, never filter them into a pass.
- **Blueprint grid.** Lines sit at `--ss-grid-x` and `--ss-grid-y`; set them on the Stage so a window's edge lands on a grid line.
- **What the tools can't sign off.** A contact sheet misses a one-frame flash; a scan does not know whether a morph, a story or a gesture is right. Watch playback at speed, slowed transitions, loop plus next start, an interruption, reduced motion, a return from offscreen; again after the final edit. The playground isolates each example in an iframe; Pause and Step advance one clock; Phone changes width but not touch, so check touch on a device or with input emulation.

Then put your sheet beside the closest gold's: is this instantly a real product, quiet, with one clear story? Iterate until yes.

## The last pass

`verify.md` from frames; `--gate` passing on the wide loop, the phone loop and `--states`; a fresh-eye review (`review.md`) returning nothing; `REHEARSAL.md` written beside the component. It lists the widths, looks, interactions and stages captured and the cases not. An empty, late or gapped capture is inconclusive, not a pass.
