# Teaching pairs

`teaching/` holds bad/good pairs: the same scene twice, with one thing wrong on the left. Open **Comparisons** in the playground (`?example=contrasts`) and pick a principle; only that pair mounts, so its controls stay nearby and the others don't keep running. Use **Replay pair** to restart both halves together.

Use a pair to diagnose a problem in your own demo: find the one that looks like your bug, then read why the good half works. The bad halves are never starting points. Watch at normal speed first, then pause and step through the transition. On a narrow screen the halves stack rather than shrink. Under reduced motion the motion pairs show matching endpoints, because the difference is in the transition, not the end state.

## Motion

Both halves share one stage and one timeline, with a duplicated stationary pointer so each gets exactly the same input at the same moment. That pointer is a teaching device; a product demo uses the Stage's real cursor and `a.click`. The first four pairs use a 180ms press and hold the result for 1.8s before returning. The longer ones play once and hold their ending.

| Failure | Look at | Correction |
| --- | --- | --- |
| Instant label replacement | "Open preview" becoming "Back to editor", then returning | A stable button and a clipped label slot; the old words leave as the new words enter (`Roll`). |
| Result without press feedback | "Save changes" under the pointer, before "Saved" appears | A small press and surface response before the result. In a demo, change state after `a.click` completes. |
| New row shoves its neighbors | "Standard shipping" below the delivery note | Animate the note's containing track so the line moves with its height. Reserving the space is the other option. |
| Object loses its identity | The plus becoming a close icon, then returning | Keep the same strokes and rotate them; replacing the icon skips the relationship between the shapes. |
| Exit is skipped | "Link copied" when its close control is pressed | Keep the message mounted for its 320ms exit, then remove it. |
| Interrupted motion restarts | The highlight heading to Month, redirected to Week after 200ms | Keep the highlight mounted and retarget from where it is; re-keying its entrance restarts it from Day. |
| Landing jumps at handoff | The 24px avatar when the flyer becomes the assignee | Measure the avatar itself with `rect()`, not its padded wrapper. The bad flight takes the wrapper's origin and lands four pixels off. |
| Loop erases accumulated work | Three files clearing after they have been added | Give the reset a visible cause: the good side presses Clear. |
| Added content shifts its neighbor | A status icon appearing beside a label | Open the icon's width and gap together while the label travels; close both on removal. |
| A list jumps around a new row | Existing rows during insertion and removal | Animate their space as the new row enters whole; let it exit before its space closes. |
| A changing action shoves another | The secondary action beside a growing label | Carry the neighbor with the changing width, not in one frame at the end. |
| Surface and content resize separately | A popup opening its details, returning, reversing | Surface and content on one coordinated geometry, with text that never stretches. |
| Drag starts from the wrong point | The file just after an off-center grab | Keep the pointer's offset inside the object through travel and release. |
| Spinner begins after appearing | The first saving-state frames | Start rotation before the spinner is visible; keep it turning through the fade out. |
| Text shifts as it settles | The changed label and the word "Optional" as the old label hides | Move the label by transform inside a stable grid. Margin travel on overlapping inline-grid items moves the shared baseline even while hidden. |
| A label hits a hard edge | Letters crossing the top and bottom of a label slot | Soften the moving boundary locally; resting text stays sharp and wholly inside the control. |
| Scrolling reveals a harsh crop | Rows crossing the viewport edge | Start with whole rows; after scrolling, fade only the edges hiding content, and clear the fade at the end. |
| Dependent changes start together | Currency, price, payment method and address in one checkout | Offset the related starts while their movements overlap. Same layout, curve and masks on both sides; see `choreography.md`. |

The neighbor pairs live in `teaching/relationships.tsx`, the drag and spinner pairs in `teaching/continuity.tsx`, the label and scroll edges in `teaching/edges.tsx`, and the baseline bug in `teaching/text-settle.tsx`. They are small standalone patterns, not imports from a library.

## Motion between neighbors

An insertion changes two things: the arriving object and the space of what was already there. Animate both. Fading an icon in while its label jumps still breaks the relationship. The rules are in `motion.md` (Changing text and values; Things that appear, travel and leave; The cursor): a label's icon opens its width and gap together, a list's height carries the rows below (`Collapse reveal="drop"`), the cursor stays where the press happened, a resizing surface moves size, position and content as one transition. For a changing control, a measured `Roll variant="fade"` resizes its label; keep the actions beside it in normal flex flow so they follow, because a transform that only moves the new label can't move its neighbor.

Watch the unchanged neighbor through an insertion and a removal, then the popup's reversal before its first move finishes. Matching endpoint screenshots prove nothing about the frames between.

## UI details (stills)

Thirteen still pairs in `teaching/composition.tsx`, same content on both sides, so the difference is framing and structure, not a prettier story. Each pair's rule lives in `craft.md` or `framing.md`; the pair shows it.

- **Framing:** clear gutters around the useful part; a window may continue past an edge, a cropped title or a status covering a row hides the story (`framing.md`, rules 2, 4 and 10).
- **Anatomy:** headings, values, metadata and actions read as different roles; related rows share columns (`craft.md`, Spacing and alignment).
- **Emphasis:** nested borders, shadows and accents make every subpart compete; quieten the supporting details before adding another container (`craft.md`, Restraint; Color and looks).
- **Compact:** reflow before shrinking; a desktop screen scaled into a small slot passes an overflow check while its text becomes unreadable (`framing.md`, Small formats and the page).
- **Edges:** near-tangents; check corners too (`craft.md`, Spacing and alignment).
- **Nested spacing:** carry the inset round the bottom (`craft.md`, Spacing and alignment).
- **Control alignment:** label and icons on one balanced row; judge the visible glyph, not its SVG box (`craft.md`, Spacing and alignment).
- **Density:** whitespace groups information (`craft.md`, Spacing and alignment).
- **Contrast:** quiet is not faint (`craft.md`, Color and looks).
- **Icons:** one construction, one stroke, one optical size (`craft.md`, Icons and logos).
- **Decoration:** a gradient or glow serves the story or goes (`craft.md`, Color and looks).
- **Task anatomy:** chrome for the task (`craft.md`, Chrome and devices).
- **Unread gutter:** an unread dot never pushes its row in (`kit.md`, Row).

## Whole scenes (stills)

Nine larger pairs in `teaching/scenes.tsx`, each 540 wide with a compact composition down to 280. The ground, the hero and the supporting pieces are judged as one picture.

- **Dashboard and phone:** each device gets a readable role; the phone never covers the amount or state it explains (`craft.md`, Chrome and devices). Compact stacks them and crops the phone's unused lower screen.
- **Window and satellite:** the result sits in the hero's quiet margin; a product's own popup is not a satellite (`framing.md`, rules 16 and 19).
- **Several windows:** choose the active step; supporting windows keep their titles and context while quieter contrast and shadow push them back (`craft.md`, Chrome and devices). Three equally loud surfaces compete even when all of them fit.
- **Colored grounds:** the background frames the product. Choose surface, text and accent against that ground; tinting everything alike removes the separation (`backgrounds.md`).
- **Dark and light materials:** a light document over a dark workspace stays a readable light document (`craft.md`, Color and looks).
- **Action and payoff:** a whole application becomes an unreadable thumbnail. Crop to the useful content at reading size and let chrome run off; the title, action and result stay whole (`framing.md`, Small formats and the page).
- **Result weight:** ask what the eye lands on first. A new file that is one thin row in a long list loses to the list; fewer, larger rows make it the heaviest thing in the frame (`examples/upload`).
- **Crop filler, never the story:** move the window or narrow the column until the last value that matters is whole (`framing.md`, rule 4).
- **One tile leads:** four equal tiles of heading and bars read as a template (`bento.md`, rule 2).

## Style (stills)

The same deploys card in every pair; the good side never changes, and each bad side has one fault. `?example=contrasts`, Style group.

- **Purple slop:** a violet-to-pink gradient ground, gradient text and a tinted card read as generated. The product's own neutrals, one accent on the thing that matters (`craft.md`, Color and looks).
- **Tiny text:** 9 to 10px type shrunk to fit more in reads as a wireframe. 13 to 14px names, 11 to 12px metadata, fewer rows.
- **Over-detailed:** a branch, hash, author, duration and badge on every row makes every row the subject. Real detail on the one row the story is about.
- **Glow:** colored light on the card, button or status is a neon template. One soft neutral shadow.
- **Capitals:** tracked caps on headings, labels and buttons. Sentence case, unless the product itself capitalizes.
- **Invented icons:** glyphs drawn for the demo, in rainbow tiles, filled beside outlined. The product's own set or one pack, one stroke, color only where it carries status; draw an icon only when no pack has it (`craft.md`, Icons and logos).
- **AI shorthand:** sparkles, wands and gradient "AI" chips say nothing about the feature. The product's own mark, or a plain label that says what happens (`craft.md`, Icons and logos).
- **Onion skin:** an icon in a translucent ink paints darker wherever its strokes cross or join. One opaque color; a lighter opaque gray for a quieter icon.

## Making a comparison

Change one thing. Same content, layout, endpoints and input timing; only the behavior being taught differs. No extra cards, status marks or decorative backgrounds competing for attention. Say the exact difference under each side, give the pair a replay, and make it readable at normal speed. If the lesson only shows at slow speed, the pair needs another go. How a bad example is marked on a page is in `craft.md`, A page of demos.

## What a pair can't show

Some faults need the real demo, not a contrived pair:

- **Other text shifts:** the baseline pair reproduces one cause; the others are in `motion.md`, Changing text and values.
- **Story continuity:** does the reset make sense for what the viewer just did? Compare `examples/story/`.
- **Handoff timing:** does the flying object vanish before its destination takes over? Compare `examples/subscriptions/` and inspect the frame where ownership changes.
- **Desktop at phone width:** can you read the important labels? A recognizable silhouette is not readable UI.
- **Motion without hierarchy:** `motion.md`, Story.

A checker can flag a jump and still miss a wrong path, an implausible gesture, a bad story or an unreadable crop. Say what the tools covered and what you watched yourself.

## Details

Six small pairs in `teaching/details.tsx`, `?example=contrasts`, Details group. Four move, two are stills; the scene is the same on both sides but for the one choice.

- **Throw a swipe at the finger's speed:** released, the row carries on at the speed it was moving and the gap closes in one ease. A pause at the hand-over, an ease-in from rest or a gap that snaps shut reads as harsh (`examples/swipe`).
- **Draw a reaction as the app does:** the real emoji in a small pill on the bubble's lower corner, ringed in the ground, scaling in from that corner. Never a drawn glyph in a disc over the words.
- **Draw a chart on from its start:** the line draws left to right, the area follows under it, the end dot lands when the line reaches it. Faded in whole, the trend is never seen (`examples/chart-scrub` for hover).
- **Balance a top bar:** one control and an empty side reads as unfinished. Put what the product puts there, or drop the bar.
- **Choose copy that fits:** unless the brief fixes them, pick names, emails and values whose length suits the layout: no truncated chips, wrapped names or ragged labels.
- **Pin a changing label to its icon:** in a fixed-width control the label sits against its chevron and grows away from it, so the gap never changes.

