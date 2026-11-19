# Motion

Every value in a frame is a pure function of the frame number. No CSS transitions, no timers, no `Math.random`
without a seed, no state carried between frames. Add `* { transition: none !important }` to the composition.
Values below are the `punchy` preset; `calm` is in `template/src/kit/theme.ts`.

## Energy: more going on

The videos people share have something moving in half their frames, and what moves is big. A spec video reviewers
called flat had motion in a quarter of its frames, small. `npm run energy <id>` measures this and fails a cut under
the bar (`references/review.md`). Build for it from the script on:

- **Three things alive in every scene, at different speeds.** The main move (a URL lifting out, a card flipping), a
  supporting move (a list filling, a number counting), and a slow one underneath (a camera drift, a backdrop
  breathing). One move per scene reads as a slideshow.
- **Overlap the moves.** The next thing starts while the last is still landing, a few frames apart, never in turn. A
  scene where each element waits for the one before is the commonest way to lose energy.
- **The camera works.** Push in on what matters as it happens, pull back to show the result, re-frame between beats.
  A camera locked off on a panel is a screenshot with captions.
- **Scale changes.** Something goes from small to filling the frame, or the reverse, once a scene. The make-font
  video's crop lifted off a page and became the whole frame; that's the move people remembered.
- **Fill the frame.** The subject takes most of the frame width. UI text at 1350 wide is 22 px or more, or the camera
  pushes in until it is: on a phone, 14 px UI text is a grey smear. Empty halves of the frame read as unfinished.
- **Every beat lands something.** Cuts, arrivals and presses on the beat grid; between beats, smaller things on the
  off-beats (a tick, a digit, a row).
- **Holds are short and alive.** A hold over 1 s with nothing moving fails the check. Let the end card rest, nothing
  else.

## Motion slop

These read as generated. The look review checks for every one:

- a screen a stranger can't read in a second: diagrams of the process, pipelines, cards of internal steps, labels
  of the tool's own vocabulary ("beats", "stills", "cues");
- grey placeholder bars where content should be: draw real, invented, plausible content (prices, names, rows);
- decorative frame lines, crosshair corners and grids that mean nothing;
- UI shrunk into the top half of the frame with the rest empty;
- every element fading up in place, one after another;
- a camera that never moves, or moves only on cuts;
- generic chat or comment bubbles with a stock first name;
- an end card with the name, a command and a URL centred in an empty frame, nothing moving;
- captions that describe the picture ("It builds on its own" over a build log);
- glows, gradients and glass on UI that doesn't have them.

## Curves

| Name | Bezier | For |
|-|-|-|
| settle | 0.16, 1, 0.3, 1 | arrivals: fast start, long soft landing |
| glide | 0.83, 0, 0.17, 1 | a move from one rest to another (a pointer, a drag) |
| exit | 0.6, 0, 1, 0.6 | leaving: slow start, full speed at the end |
| resolve | 0.25, 0.6, 0.15, 1 | a value settling (a number, a width) |
| press | 0.2, 0.8, 0.2, 1 | a button going down to 97% and back |

No overshooting curves for sizes or layout. A spring is fine for one thing's position (a crop lifting off a page),
never for a scale. Opacity fades run linear: on an ease, a fading element sits near full and vanishes in one frame.

## The cut: whips

A scene comes in from the right over 10 frames on settle and leaves to the left over 7 on exit, 420 px each way,
with 16 blur samples while it moves (`whipAt` in `src/kit/motion.tsx`). Cut on the beat: the incoming scene's fastest
frame lands on the downbeat. Alternate paper and ink scenes so each cut reads. The ground swaps on the cut frame, a
planned hard cut: list every cut in `CUTS` in timing.ts, and `npm run jumps` passes them to the jump check.

`calm` glides instead: a 7 frame fade and 160 px drift, no blur.

## Motion blur

`Sampled` draws the frame n times across a forward 180° shutter (from the frame to half a frame after it), each
sample opaque, the k-th at opacity 1/k, which averages them. The forward shutter means a scene's first frame after a
cut is already blurred. Use 16 on whips, 6 to 8 on fast moves.

Holds draw one sample, and that matters: the kit's first version drew 16 on every frame of a scene that ever moved,
and a 20 s master took 22 minutes. Stacking samples darkens content by about 2 levels in 8 bits (2.3 at 16 samples,
measured), so dropping from 16 to 1 in one frame steps the whole frame. `Scenes` (`src/kit/shot.tsx`) lays the stack
over one sharp copy and fades it in and out over 8 frames either side of a move (`blurMix`), so the shift ramps in
one-level steps nobody can see, and the jump check ignores them. The template's 8 s review cut takes about 20 s.

A scene asks for blur on its own fast moves with `blur(frame)`. Anything picked per frame (a digit, a face, a word)
must be picked on the whole frame, floored (`whole()` in `src/kit/motion.tsx`), or the samples disagree and the thing
draws twice. Floor it: the shutter runs forward, and rounding sends its later samples to the next frame.

## Camera

- Keyed channels (x, y, scale, rotation) on a monotone cubic (Fritsch-Carlson tangents) or a quintic Hermite, so speed
  is continuous and acceleration is zero at every key. No hard starts or stops.
- It never quite stops: holds drift 3 to 6 px a second (0.05 to 0.1 px a frame), each move keeps one direction. The
  first version of this file said "a frame"; at 60 fps that's 180 to 360 px a second and pushed a caption off frame.
- Cap the peak at about 40 px a frame at 1350 wide.
- Keep a 0.02° rotation floor on a moving camera (`Push` in `src/kit/motion.tsx` has one), so the browser
  re-rasterises it the same way on every frame. Leave it off still scenes with hairlines: it stair-steps them.
- Lay content out with CSS `zoom` at the largest scale it reaches and let the transform only shrink it. Chrome draws a
  transform-scaled layer once and re-draws it sharp a few frames later: a one-frame step.
- Never settle a zoom on exactly 1, or on a value that makes whole device pixels at the render scale.

## Kinetic captions

Each word rises half its size into place over 20 frames on settle, 4 frames after the word before it, with its
letters spread 0.16 em wider and pulling in as it lands. It leaves upward, 2 frames apart, over 12 frames on exit,
spreading 0.08 em, fading linearly.

The spread is drawn on a copy laid over the word, and the word itself is held at its final width. Animating
letter-spacing in the line reflows it: every later word slides along. Open the spread toward the side with no word:
rightward on entry, leftward on exit. A spread centred on the word makes neighbours collide.

`calm` captions cut in and out with no animation, in the muted colour.

## Micro-interactions

Each surface gets at least one, and each scene at least three things alive (above). These have shipped:

- **Pointer.** Appears only to act. Glides on a minimum-jerk path over about 40 frames, hovers a third of a beat,
  presses (the target goes to 97%), rests, leaves. Never teleports from one target to the next; it travels. It
  presses buttons, never a command: a command is typed.
- **Press.** Never changes a label. The button's colour eases over 6 frames. The screen moves on a beat later.
- **Numbers.** Digits scramble for 18 to 24 frames, settling left to right, then hold. Count between values with the
  same digit count so nothing reflows (120,000 to 184,200).
- **No.** A lock or a badge shakes side to side three times when something is refused. Start the shake from rest.
- **Crop.** A screenshot leaves a hole in the page where it was cut, lifts on a spring, floats, swings back and flips
  to show what it became.
- **Typing.** A prompt or command types in from a fixed left edge, a character every 3 frames, each fading in over
  its 3 frames (a glyph appearing whole steps a calm frame), with its full width reserved so nothing re-centres and a
  steady caret.
- **Fan.** Cards leave a stack one at a time, each on its own beat, with a small rotation that overshoots and settles.
- **Flip.** Words change face one by one like a split-flap, with the width easing between the two faces' measured
  widths so the line closes up smoothly.
- **Lift.** One element leaves its place (a URL from a log, a crop from a page) and becomes the next scene's subject.
- **Return.** The opening's situation comes back changed at the end: the screen that couldn't open the page now opens
  it, the empty field is filled. Then the command types itself on the end card.

## Bugs that make jumps

Each of these put a visible one-frame step in a shipped video:

- a `perspective()` or `transform-origin` that exists only while a move runs;
- a move that starts or stops at full speed at a cut, or a shake that starts at full speed;
- a part dropping its 3D transform when its entrance ends (its text re-rasterises);
- an element unmounted while it still moves, or a veil that appears mid-film (keep it mounted, a hair above zero);
- a crop cut from the static source while the source itself drifts: the crop and the page double;
- widths measured before the fonts loaded, or in a fallback that `document.fonts.check` waved through;
- a blur sample count that drops from many to one in a single frame;
- a colour that snaps on a press instead of easing over a few frames (`mix` in `src/kit/theme.ts`);
- a slow transform rounded to a few decimals (`scale(${v.toFixed(4)})`): as the ease slows, the value changes only every
  other frame and the text re-rasterises in steps. Pass the full number;
- a theme change done by swapping an attribute instead of interpolating the tokens (interpolate in oklab).
