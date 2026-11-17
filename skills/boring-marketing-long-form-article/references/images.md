# Images (optional): the cover, body images, checks

Load at Phase 6. Generation runs through `/boring-marketing-creative`, which owns model choice and cost. This file is about what to make.

## The cover decides the click

On X and LinkedIn the cover shows as a small card, about 500 pixels wide, with the title under it. Most readers decide there.

- **One subject, five words or fewer, high contrast.** It has to read at card size. One article's first cover carried dozens of small labels; none of them read at feed size and the piece got little traction until it was replaced with a single person and a short line.
- **The cover adds a hook; it doesn't repeat the title.** The title already sits under it. A sharp line from the article works well.
- **A person with an emotion** (a grin, a phone ringing, a face reading something) usually beats objects and diagrams.
- **A series line is fine** as a smaller second line, when the author publishes a series.
- **Make four or more directions in different styles** (the author's house style, a photo, a type poster, a retro ad, 3D clay), then judge them in a mockup at true card size with the real title under each. Judging covers at full size picks the wrong one.
- **Crop to the platform's ratio** (see `platform-notes.md`) and check no lettering was cut off.

## Body images

- **One per major idea, about every 400 to 600 words.** A picture marks the start of a new part and gives the skimmer a place to land.
- **Each image carries one concept**: a timeline for the eras, a scorecard, a menu, a balance scale for the money math, a weekly checklist.
- **At most about eight labels**, each quoted exactly in the prompt. Fewer is better.
- **Style comes from the author's `creative-kit.md`.** Without one, pick a single style and write it as a preamble used for every image (medium, palette of three or four colors, mood, "no logos of real companies", "spell every word exactly as written and include no other words").
- **Captions on about three images**, where a caption adds something (the source, the takeaway, or where to get the tool).

## Exact text doesn't go in generated images

File trees, prompts, long lists and tables belong in code blocks or real lists. Image models garble long text. When a diagram needs exact words, build it as HTML and screenshot it.

## Checks before an image goes in

- Look at every image at full size. Check the spelling of every word and that every number matches the article.
- No real company logos, and no claim in an image that the article doesn't make.
- Regenerate any image with a wrong word. Don't ship "close enough".
- Save finals in article order (`00-cover.jpg`, `01-eras.jpg`) in `./campaigns/{slug}/images/`.
