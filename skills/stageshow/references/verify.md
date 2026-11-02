# Verify

The last pass. Every answer comes from a frame you looked at, never from the code. Fix the largest visible failure first, re-shoot, return to the top, iterate until every answer is yes. The rules are in `framing.md`, `craft.md` and `motion.md`.

## Gate

- `film.mjs <url> --gate` on the wide loop ends `rehearsal passed`? (For a still, `--still --gate`.)
- The same at `--width 390`, and at the brief's own width when it names one?
- `--states --gate`: one sheet of the opening, every mark settled and the end, with nothing you would send back?

## Framing (first, because nothing else matters if this is wrong)

- One gutter, and the window or phone bleeds off at least one edge, or sits whole because the brief wants it?
- Is anything cut by the crop that has words on it, or that the eye needs whole?
- Is the ground the page the brief named, no plate behind the device on a white or dark page?
- Is any corner of the stage empty for no reason?
- Panes full: no void under a list (`empty pane:`), rows at their own pitch (`loose list:`)?
- Phone: nothing under the island, a sheet below the status bar, a cropped phone losing status bar and nav together?

## Hierarchy and density

- The closest gold's still beside yours: say the one difference. Is yours the sparser, flatter or smaller one, and why?
- Still: is the subject real words and values, with bars only beside it and on what the crop cuts?
- Label and value both words or both bars?
- Named avatars colored, gray discs only for filler?
- At realistic fidelity, does a list of six or more rows have at most as many placeholders as real rows?
- The heaviest mark sits on what the story is about?
- A date range: air between weeks, fading where the range continues, capped only on real start and end days?
- Bento: every tile a specific moment with its words on it; no tile that is a title over bars; stat and unit on one line?

## Motion (animated scenes)

- Each beat filmed at 40 to 80ms with `--at` and looked at: presses, morphs, hand-offs, exits, the seam?
- Nothing appears without an entrance or leaves without an exit, except `Bubble` and `Fly` with a visible hand-off?
- A swipe lands, presses, flicks a third of the screen, lifts still moving, and the page carries on as one motion?
- A reaction grows from the bubble's corner with the room opening on the same clock?
- A terminal's marks are glyphs in the grid, each line owning its own, swapped in place?
- Rolling numbers roll in the right direction and settle once?
- The loop ends where it began, or resets with a visible cause?

## Polish (last)

- Zoom every hand-drawn thing at 4x: would a stranger know what it is, and is any stroke clipped by its box?
- No translucent icon, no onion skin, no hand-drawn mark where the kit has one?
- Spacing even: words 12px from edges, stacks 4 to 6px of ink apart, dots 6px clear?
- Type: nothing under 10px on the phone, nothing wrapping that shouldn't?

## What you see, what you do

| You see | You do |
|---|---|
| A void under a list or pane (`empty pane:`) | More product into it until it runs off the crop, or crop the pane; never spread the rows |
| A one-line row three times taller than its words (`fat row:`) | Padding 12px (8px dense) and more rows; never air inside the row |
| Rows spaced wider than they are tall (`loose list:`) | Tighten the pitch to the row's padding; add rows |
| A whole window floating with even margins on a hero | Bleed it off two edges with one gutter, or fill it |
| Gray bars where the eye lands | Words there; bars beside it and off the crop stay |
| A label beside a real value drawn as a bar | Both words, or drop the row |
| A stat's unit on its own line (`unit wrapped:`) | Nowrap the pair, size the number to the tile, or move the unit to the lead |
| A phone drawn small, or whole, in a narrow host | Crop it: a gutter from one edge, off the other, screen 1:1 |
| A grabber or sheet under the island | Start the sheet below the status bar |
| A popover that shifts while open (`anchor drift:`) | Pin it by the edge it opened from; reserve the height |
| An emoji where an icon belongs (`emoji icon:`) | A drawn glyph from one family; emoji stay in messages and reactions |
| An icon cut by its box (`clipped glyph:`) | Fit the drawing in its viewBox, or use the kit's glyph |
| A reaction, dot or mark on the words | Move it to the edge or gutter the kit gives it |
| A gate line you think is intentional | Look again; if it still looks fine, say so in REHEARSAL.md with the frame; never clear it by hiding the thing |
| Ten film runs, gate green, frame unchanged | Stop. Fresh eye |

## Hand over

- `REHEARSAL.md` written beside the component? A template:

```md
# Rehearsal: <demo>
Gold: <example> (what you kept, what you changed)
Beats: 1 … 2 … 3 … payoff, loop <n>s
Captured: widths <wide, 390>, looks, states, reduced motion
Film: <each gate line> → <frame> → <fix or why it stands>
Review: <reviewer's list> → <your response>
Assumptions:
Unresolved:
Not checked:
```
- Did you say what you did not watch?
