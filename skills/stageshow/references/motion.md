# Motion

The rules for everything that moves: the story, the loop, pace, text that changes, things that arrive and leave, the cursor, drags, scrolling and the camera. The still frame is in `craft.md`; each kit part's props are in `kit.md`.

## Index

1. [Story](#story): the shape, the beats, the payoff, satellites
2. [Loops](#loops): caused resets, data never rewinds, the seam, exits, conveyors
3. [Pace and easing](#pace-and-easing): two curves, fast feedback, overlap, stagger
4. [Changing text and values](#changing-text-and-values): change only what changed, footprints, numbers, chips
5. [Things that appear, travel and leave](#things-that-appear-travel-and-leave): nothing pops, whole arrivals, flights, handoffs, landings
6. [The cursor](#the-cursor): its kind, never over the label, every move explained, keys
7. [Drags and selection](#drags-and-selection): pickup, held cards, the grab offset, slots, I-beam selections
8. [Scrolling and the camera](#scrolling-and-the-camera)
9. [Phones in motion](#phones-in-motion): touch, swipes, the Dynamic Island, reactions
10. [Recipes](#recipes): page swaps, stepped demos, replay, annotations, motion on a page

## Story

Pick the shape from what the product is valued for; a demo forced into the wrong shape gets busier, not better.

- **How it feels to use:** the gesture is the story; a cursor does one satisfying thing and the result appears under its hand (`examples/hero-demo`).
- **A flow in an app:** a few screens told as one continuous object with the payoff on the last; no bolted-on second device (`examples/phone-touch`).
- **What the system does:** the consequence lands somewhere else; make the link visible (a value on a connector, a card flying into a list); usually no cursor (`examples/subscriptions`).
- **Beauty decides.** The calmer, fuller, better-framed version beats the one with more story (`examples/payout-flow`).
- **A hero loop is 10 to 16 seconds;** a repeat is a short beat, never the whole flow twice (`examples/subscriptions`).
- **Three to five beats building to a payoff;** one gesture and a response can be enough; add beats only when they clarify.
- **Open on a finished screen that works as a still.** The first real content is on screen before the beat. A thread opens with a real message, not bars (`examples/messages`).
- **A short history sits at the top of its pane** under the header, never pinned to the bottom with a void above; size the pane to what it holds.
- **The cursor rests on empty surface between beats,** near its next move, never on an unused control, never an I-beam over a button.
- **A satellite arrives at the beat it pays off,** carrying its payload, or is present from the first frame in a reserved column; never an empty parked object.
- **The payoff is visible at the shown size:** a panel, a window coming forward, a clear state change. A 16px avatar at the edge is not a payoff (`examples/hero-demo`).
- **The payoff arrives full.** A panel or card opens with its content; with `Collapse`, put the first lines in before `open`. Never a blank surface for a quarter second.
- **Things connect.** A `Connector` draws on over about a second after both ends are placed, routes around cards, and ends on a dot (`examples/story`).
- **A small label with a leader line can name what just happened** (`examples/hero-demo`); the full rules are in `annotations.md`.
- **Motion without hierarchy:** cover each moving element in turn; if the story gets clearer without it, cut it.
- **The poster is the frame most people see:** a thumbnail, reduced motion, a screenshot. Set `poster` to the beat that tells the story on its own (the row mid-swipe with Archive showing, the card over its new column), and let the result stay on screen after the action instead of tidying it away. Cover the motion and ask what happened; if the poster can't answer, choose another beat. A poster is never caught mid-change: a digit mid-roll, a label mid-morph or a surface mid-fade reads as a glitch when it holds still, so choose the frame after it lands.

## Loops

- **A reset removes what the loop added as one thing.** A reply and its reaction leave together, never reaction then message; a list that grew loses its new rows in one motion. The fewest steps that return the frame, with a seen cause where one exists.
- **A loop keeps a complete product picture:** open on context and return to it; a header over a blanked list is not an anchor. Film the seam at 60ms.
- **Every reset has a cause or is invisible,** in order: a seen cause (undo with its keycaps, clear, close), an exit around an anchor, a snap while hidden (`act.snap`). See `examples/subscriptions` and `examples/story`.
- **A loop never plays a navigation backwards.** An app opened from a notification doesn't shrink back into it, and a pushed screen doesn't slide back in reverse; no product does that. Leave the way the product leaves (the phone locks, the app goes home) or cut to the opening frame while something covers it.
- **Data never rewinds in view.** Snap it back hidden (off camera, under a closed panel, behind the exit) or bring the next loop's data in as new.
- **No dead air at the seam:** within about a second of the exit ending, the next action has begun.
- **Exiting around an anchor:** what the story added leaves in one reverse stagger, everything moving within half a second, 40 to 80ms apart, while product content stays. Never everything at once.
- **A story that accumulates runs as a conveyor:** exit the built batch, bring a fresh one in from the crop, reset unseen.
- **The payoff holds for 2s** before the exit (`examples/payout-flow`); nothing on screen sits still for more than three seconds.
- **A second scene earns its length** by adding something new (a different outcome, surface or side); repeating the beat doubles the loop for nothing (`examples/subscriptions`).
- **A looping video starts on a calm frame,** never mid fast motion.

## Pace and easing

- **Unhurried, on two curves.** Travel: `cubic-bezier(0.45, 0, 0.1, 1)`. Arrival from nowhere: `cubic-bezier(0.25, 0.8, 0.25, 1)` over 0.8 to 1s. Judge distance and overlap, not duration (`examples/payout-flow`).
- **Travel has a departure, clear travel and a soft arrival;** length alone does not make it fluid.
- **Choose durations and easings together by job;** one easing everywhere flattens the hierarchy; an accumulating number may take longer than its transfer (`choreography.md`).
- **UI feedback stays as quick as the real product;** only storytelling motion slows down. Feedback starts on the input; a presentation delay feels unresponsive.
- **Related responses overlap.** A changed setting leads its label, then its dependents, while the frame holds; a confirmation still follows its cause (`examples/choreography`).
- **Related updates can each take a different time;** the result still follows its cause.
- **Stagger groups in reading order 40 to 80ms apart** within a scene (`act.stagger` default 60); 80 to 120ms between tiles of a grid. One object enters whole; holds are beats too (`examples/calendar`).
- **Introducing a composition:** a small front-loaded movement can settle longer than its busy part; don't scale readable text much.
- **A small expressive icon may overshoot** while its card and text settle without bounce; keep the accent local; give the final state time to read.
- **Color changes between distant hues take about 200ms** (they pass through mud however done); let the label carry the slower motion.
- **Holding a result means stop:** a useful still needs no new pulse or repeated count.

## Changing text and values

- **Inspect the glyphs, not only the box.** Text can shimmer as a layer finishes; keep its transform layer through cleanup, never `will-change` over the whole scene.
- **Settle geometry before chasing a text shift.** Compare the last moving frame with the first settled one (`lands on a transform`, `steps in its box`).
- **Other text shifts:** a released measured width, a transform losing its layer, a late-loading font; inspect at real size.
- **Every change moves.** Text that turns into a pill, a menu replaced by another in one frame, a number that jumps: a submenu slides, text rolls, a surface morphs.
- **Change only what changed.** `Roll` animates the changed span and moves what follows by its measured width; pick the anchor on purpose (`examples/story`).
- **Decide a control's footprint before its label transition:** `States` holds the largest, `Roll variant="fade"` resizes; never roll unchanged words (`examples/parts`).
- **Button states share one slot.** Keep the button mounted, variants in one grid cell, each icon-and-label variant default-centered; check shortest, longest and pending (`examples/hero-demo`).
- **Added content opens its space with its neighbor:** the icon's width and gap open together while the label travels; both close on removal (`examples/annotations`).
- **A right-pinned value changes against that edge** (`Roll align="end"`); a status icon beside it keeps a fixed slot (`examples/payout-flow`).
- **Numbers roll with `Count`,** last digit first, unchanged digits still; no per-frame lerp blur; give it a slot; hold the completed value (`examples/subscriptions`).
- **Typed text becomes a chip in place** (`Field chip`): the words stay, the surface grows around them, the x opens beside.
- **Result follows press feedback:** a small press and surface response before the result; change state after `a.click` completes.
- **An object keeps its identity when it changes** (a plus becoming a close): rotate the same strokes; replacing the icon skips the relationship.
- **A spinner turns before it is visible** and keeps turning through its fade out.

## Things that appear, travel and leave

- **A thing that grows as it travels takes the long settle.** A thumbnail becoming a card swells on a soft start and a long deceleration (the kit's `Fly` curves, 600ms or more); a quick ease-in-out lurches.
- **Nothing pops.** Everything has an entrance and stays mounted until its exit finishes; `Bubble` and `Fly` hand off at the same geometry.
- **No holes or blank frames.** What replaces something arrives as it leaves; reopening rows fade content in as their height finishes (`Collapse`) (`examples/subscriptions`).
- **Neighbors make room continuously** as the newcomer arrives; its fade rides with its travel, not before.
- **A new row carries the rows below it:** animate the containing track so the line below moves with its height, or reserve the space.
- **A resizing surface moves size, position and content as one transition,** never stretching its text, and retargets from its current geometry when interrupted (`examples/choreography`).
- **Replacing content keeps the container, alignment and reading interval,** masking only the moving slot.
- **Keep header, outer surface and action positions steady** while variable content changes inside; old and new content stay in tracks.
- **Solid things do not fade through.** Windows, phones and cards arrive by moving, opaque or nearly; a half-transparent phone is a ghost.
- **Cards, toasts, pills and reactions arrive whole from just above** (`Collapse reveal="drop"`), never uncovered by a hard edge; clip only rows of text.
- **Content arrives after its container:** a pin's number appears once its circle is nearly full size.
- **A popup fits before its first frame:** sized and scrolled before showing; it never corrects its size while opening (`examples/parts`).
- **An open surface holds its anchor.** A popover, palette, menu or sheet is pinned by the edge it opened from. Reserve height for the longest list (`anchor drift`, `examples/linear`).
- **Overlays close where they were:** keep `{ open, at }` apart, never a nullable `menu` point.
- **A zone becoming something else takes its new size** (a drop zone into an upload card); the fixed-footprint rule is for optional content inside a surface.
- **A value chip grows from the value's own words,** gains fill and lift as it departs, and wears one of its two looks, never a third color. The recipe is in `kit.md` (`examples/subscriptions`).
- **A dashed edge never changes size:** draw it at final size on its own layer and only fade it (`dashed edge resizes`, `examples/controls`).
- **Border style does not transition:** keep the solid hairline and fade a dashed `::before` layer out over it.
- **Switching versions morphs in place** or crossfades with the plate's height eased; never a flash or hard swap.
- **A released marquee fades;** it never sits still then vanishes.
- **A moving edge never slices text.** `Collapse` fades before and after the height moves; otherwise sequence fade and movement, or mask locally without softening the whole interface (`hard edge`).
- **One object, one trip, ending in its final place:** open the room (`Collapse`), measure the slot, then `Fly`; never land then re-lay out around it (`examples/subscriptions`).
- **After motion nothing moves.** A handoff is the same size, place and look on the swap frame. Measure the landing element itself, never its padded wrapper (`handoff shift`, `settle snap`, `fly size`).
- **A flight's ends are fixed at take-off** (`Fly` holds its rects when `go` turns true); a moving start retargets every frame and jumps.
- **A flyer changes to its resting look during the last third** (`.ss-fly[data-go]` with a delayed transition); never swap looks on the landing frame.
- **Landings are soft:** decelerate over the last third, back to size before arrival, no bounce, no ring pulse.
- **A selection ring or highlight moving between items uses `Follow`,** so it keeps momentum when retargeted; re-keying its entrance restarts it (`examples/figma`).
- **Look at every motion finding** (`appears, then moves`, `near-empty frames`, `lands on a transform`, `steps in its box`). Fix the real ones, name the intentional, never cut good motion to quiet a detector.

## The cursor

- **No cursor means no stand-in.** Never walk a focus ring, halo or spotlight between controls; states and timing carry a system story (`examples/cursors`).
- **The elements decide the cursor's kind** via `data-cursor` (`ibeam`, `hand`, `open`, `crosshair`, `resize-ns` or `resize-ew` on an edge that drags, `resize-nwse` or `resize-nesw` on a corner, with `drag(..., { cursor: 'preserve' })` so it doesn't close to a fist), switching mid-path as it crosses the edge, never after arriving (`examples/cursors`, `examples/cursor-resize`).
- **`drag()` closes and reopens the hand itself;** a drag over text stays an I-beam; `{ cursor: 'preserve' }` keeps the arrow for arrow-based creation (`examples/google-calendar`).
- **Native app buttons keep the arrow,** and a button inside a marked area is the arrow again unmarked; `cursor()` is only for kinds nothing implies (`wait`).
- **The I-beam and crosshair turn white with a dark edge on a dark stage;** the glass circle narrows into a bar over text.
- **The cursor never covers the words it clicks.** Aim inside the target but off its text (`x: 0.85, y: 0.6`). Rest off a changed label; park in a menu row's empty space (`covers`).
- **The cursor stays where the press happened** while the result changes size; never pin it to a moving button edge.
- **A cursor changes style by morphing,** never popping (`examples/cursor-morph`).
- **Every move travels to the next action,** follows a held object or clears the way; the Stage fades a resting cursor after 4s.
- **Keyboard stories show the keys** with `act.key('cmd+k')`; the cursor can rest or leave (`examples/raycast`).

## Drags and selection

- **A pointer drag is one motion.** With a mouse the row follows the pointer the whole way and leaves on release; the short drag then throw is a finger's flick and reads as two motions under an arrow.
- **A drag starts where the thing is.** A file from outside enters already held with a fixed grab offset. Never a pickup at an empty point or a changing grip (`examples/freeform-drag`).
- **A text selection reads left to right** from a word boundary; dragging back from the end reads as a correction (`examples/google-docs`).
- **A text selection stays under the I-beam every frame:** drive it from `a.drag` with `a.caret(name, at)` in the drag's `onMove` and render from the character count. A highlight grown by time or a word count runs ahead of the cursor on one line and behind it on the next; `--gate` fails on `selection drift`. Never clamp it or hit-test with `caretRangeFromPoint` (`examples/google-docs`).
- **Pickup belongs to the press:** set `lifted` and the first carried position inside `onMove`, never before `drag()`; a long press shows press, hold, lift (`examples/calendar`).
- **A carried card is held, not slid:** scale 1.03, deeper shadow, a degree or two of tilt, following the hand's arc. The whole card tilts, words and all: a surface tilting under level text reads as a bug. Keep its text from hopping as it lands with a layer it holds throughout (`will-change: transform`), not by leaving the text out of the tilt. It settles flat on drop, with no selection outline in the air (`examples/controls`).
- **Constrained controls follow their mechanism:** give `drag` a `{ path }` so a knob turns on a circle; check the hand's radius all the way round (`examples/annotations`).
- **The grab offset is where the hand took hold:** derive it from the pickup fractions, share the `transform-origin`, keep stage translation outside the lifted transform (`examples/freeform-drag`).
- **A held item rides with the cursor exactly** from `onMove` on both axes with no transition; `Fly` is only for flights the cursor is not carrying.
- **Drop targets never travel:** the slot appears in a cell and jumps to the next, hides over the card's own cell; `cellOf` for sticky borders (`examples/freeform-drag`).
- **Moving a card between lists uses `Slot`:** source closes on lift, destination opens in flight, drop aims at the open slot, then the real card swaps in (`examples/controls`).

## Scrolling and the camera

- **Nothing scrolls unless the pointer is on it:** `a.scroll` moves the cursor in and holds it; scroll back before the loop ends, never at the seam (`examples/controls`).
- **Scrolling starts with whole rows;** fade only the edges hiding content once scrolled, and clear the fade at the end.
- **The camera needs a reason.** Push in only when the payoff would be too small to read at the shown size; cut any zoom nobody would miss.
- **Frame the wide shot as a good still before any push-in;** the zoom never rescues a weak frame.
- **A push-in frames the stage's shape:** `Camera` fits the focus to the aspect, so widen the focus to the content column rather than accept leftovers (`examples/calendar`).
- **One push-in per story,** in and back out; edges feather while zoomed; the cursor holds still while the view moves (`examples/controls`).
- **Inside an overlay, wrap only the region that zooms** in `Camera`, with `pad={0}` when the region is already the frame.

## Phones in motion

- **Act where people do.** A notification is tapped to open its app, and the reply, the accept or the purchase happens in the app. Its long-press actions are a shortcut few people use, so a story told through them reads as invented.
- **Touch on a phone uses `cursor={{ style: 'touch' }}`,** never the macOS arrow. In-app responses are UIKit-quick, `cubic-bezier(0.3, 0.75, 0.1, 1)` over 0.5s; `Expand` does card-to-screen (`examples/phone-touch`).
- **A swiped row stays in its list:** the action is the row's own back, the same height and edge to edge, revealed as the row slides off it, not a separate rounded card beside it with a gap. The list clips both, so the row never paints over a neighboring pane, and its text is cut only by that edge. Check the frame at the furthest point of the swipe at full size: it is the one people screenshot (`examples/swipe`).
- **A swipe is a flick:** a third of the screen in about a quarter second, lifting while moving. The page is thrown on over 0.5s with `cubic-bezier(0.25, 1, 0.5, 1)` (`examples/phone-touch`).
- **A reaction is `Bubble tapback`:** a white circle on the bubble's bottom corner, growing from the edge as the room opens on the same clock. It fades before the room closes.
- **Dynamic Island:** animate the black shape's box and radius together, never by stretching its contents; content lives on a separate unfiltered layer and fades into place (`examples/dynamic-island`).
- **Island timing:** 500ms underdamped growth, 380ms shrink delayed 120ms for content to clear, a press squeeze to 0.965.
- **Island filters** (blur 2.6, alpha matrix 9 -4) belong to that geometry; filter only the black shapes. Keep the dormant circle inside the pill and inspect the contour at contact, separation and rest.

## Recipes

- **A page swap inside one window** keeps the chrome and crossfades only the body (200ms, an 8px rise); tabs move with it; never slide whole pages sideways.
- **A stepped demo keeps its object across steps;** swapping a Stage's script is a cut. An outside-switched variant gets one stable `play="once"` script; verify skip, reverse and mid-play change.
- **Replay remounts at the story boundary** with a key; never changing keys for ordinary state, text or variant changes (`kit.md`, Explicit replay).
- **A look sets tokens only;** the scene keeps the product's own motion habits and real timing (`looks.md`).
- **Annotations** (leaders, connectors, flows, moving targets) have their own rules in `annotations.md`; `choreography.md` walks one content change end to end.
- **Motion on a page of demos or in a grid has one place to lead** (`bento.md`, rule 11).
