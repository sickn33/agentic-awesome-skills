# Review

Two passes on the silent review cut, then the sound. Measured checks must pass; taste is advice, weighed against the
one-sentence story. Never call a check passed that didn't run.

## Measured checks

- **Jump check.** `npm run jumps <id>`. Decodes the cut to small greyscale frames, takes the mean difference between
  each frame and the next, counting only pixels that change by 3 levels or more, and flags any frame far above its
  neighbours' median. The planned cuts come from `CUTS` in timing.ts, and designed one-frame
  steps (a number landing, a shutter flash) from `STEPS`. One- and two-level changes are 8-bit rounding (a blur stack
  fading) and never count; a colour snap or a 1 px text shift is caught (both tested). Exit 0 or fix.
- **Energy.** `npm run energy <id>`. Fails when under 40% of frames have visible motion, when under 1% of pixels move
  in the median frame, or when anything but the end card holds still for over 1 s. The last second (the end
  card's hold) is left out. The bar comes from a launch video people shared (54%, 1.6%); a spec cut reviewers called
  flat measured 27% and 0.68%. It reports each scene, so a weak one shows even when the
  whole passes. Fix a weak scene with the rules in `references/motion.md`, "Energy".
- **Contact sheet.** Every 10th frame, 4 across. Read it as a strip: does it tell the story with no sound, and does
  every row look busy?
- **Stills.** Every frame in `STILLS`, at scale 1. Nothing cropped, no text under 64 px from an edge, UI text 22 px or
  more, contrast passes.
- **Audio.** Every check in `references/sound.md`.

## Roast passes

Spawn one fresh agent per area. Give each only the cut (or its stills and contact sheet), SCRIPT.md and its brief
below, never your own opinion of the cut. Each returns findings as: frame range, what's wrong, why it matters,
severity (must fix, should fix, minor), and a fix. Without workers, run the briefs yourself one at a time, and say so.

**Story, for a stranger.** "You have never heard of this product. Watch the first 3 seconds and say what it's about.
Then watch it all and say the one sentence it tells. For every screen, say in five words what it shows; a screen you
can't is a must fix. Name any scene you'd cut, any caption that repeats another or says what the picture shows, any
word on screen only the maker would know, and any moment you were lost or bored."

**Motion.** "Go through the cut frame by frame around every cut and arrival. Find anything that jumps, teleports,
doubles, ghosts, reflows, collides or stops dead. For each scene, count the things moving at once: under three is a
finding. Find moves that wait for each other instead of overlapping, a camera that never moves, and any scene with no
change of scale. Check that cuts land on the beat grid in timing.ts."

**Look.** "Check type, spacing, contrast and alignment on every still, and how much of the frame the subject fills;
UI text under 22 px at 1350 wide is a finding. Go through the motion slop list in references/motion.md item by item
and name every one you see, with its frame: placeholder bars, decorative lines, an empty half frame, generic chat, a
static end card. Check the theme's roles are used, not literals, and that there is one accent."

**Technical.** "Read the scenes. Find any value not a pure function of the frame, any per-frame choice not on whole
frames, any measurement taken before fonts load or under a transform, any element unmounted while moving."

**Sound** (pass after music). "Read synth.js, cues and master.json. Check every pitch against the key, the chord
voicings for clashes, the swing on every delayed part, the kick against the grid, and the master's numbers."

## Fixing

Fix every must fix and should fix. A minor gets fixed if it is one line. Then pass two, with fresh agents, on a new
review cut of the fixed video, and run jumps and energy on it. If pass two leads to changes, render the review cut
once more and rerun jumps and energy before the master: the master is never the first render of a fix. In `step`,
put the findings to the person as choices before changing anything.
