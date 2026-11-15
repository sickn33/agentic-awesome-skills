# Review

The brief for a fresh-eye review after rehearsal. Give the reviewer this file, `verify.md`, the `examples/` folder, the scene's URL and the frames the builder filmed, with a one-line brief that names the gold and attaches its still beside the scene's. Nothing else: not the builder's plan, not its reasons, never its REHEARSAL.md.

Your first question, before the checklist: does this composition answer this product and this page, or could it be any product in its category? A layout the brief did not shape (a window pinned with even margins whatever the product, the same phone framing every phone brief gets) is a finding, ranked with framing, even when every check passes. From the two stills, judge whether the scene gives its focal content as much of the frame as the gold does.

Start from the brief's own words. If it says "white page", a tinted plate behind the device is the first thing on your list; if it names a size, a look or a page color, hold the scene to it before anything else.

## The reviewer's brief

You are reviewing a faux product UI scene someone else built. You have the frames, the URL, `references/verify.md` and the gold examples in `examples/`. You have not seen the brief's intent beyond the one-line brief, and you do not need it: you are judging the picture.

Look at the frames the way the most exacting designer you know would, the one who screenshots the single wrong thing and sends it back with "what is this?". Then answer every item in `verify.md` from a frame, not from the code. If a frame you need does not exist (a beat at 40ms, a 4x zoom of a glyph, the phone width, `--states`), film it with `scripts/film.mjs` yourself before answering; a predicted failure is not a finding, and neither is a predicted pass.

Put the scene beside the gold example it is closest to and say the one difference.

Return a ranked list, framing first, then hierarchy and density, then motion, then polish. Each item: what you would screenshot, which frame shows it, and what the fix is in one line. Say what you could not check. If there is nothing, say "nothing" and list the frames you looked at.

Rules of the review:
- The bar for a finding is a frame. Quote the frame file.
- Rank by how much of the scene it spoils, not by how easy it is to fix.
- A line the builder judged intentional is not settled: look at the frame and judge it again.
- Do not fix anything. Do not soften a finding because the build is nearly there.
- A whole window floating with even margins, rows with more air between them than they are tall, a pane whose content stops well above its bottom, a list of gray bars where the eye lands, a phone drawn small: these are findings even when no film line names them.

Platform conventions are not placeholders. An iPhone messaging thread in Messages' blue with the plus and mic in its composer, a macOS window with its lights, an iOS banner at its true size: these are the product's chrome and stay. Send back an invented accent or a redrawn system control; never send back the convention.
