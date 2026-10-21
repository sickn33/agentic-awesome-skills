# A styled explainer film

This HyperFrames project was made from a style starter of the `lanshu-create-ai-presenter-video` skill
(`explainer/tools/new_film.sh`). Follow that skill's `references/styled-explainer.md`; do not switch to another
HyperFrames workflow.

- **The only topic file is `beats.js`.** Replace each 「待演绎」 placeholder with the line's performed scene, using the
  idioms in `STARTER.md` (this style's `api`, stations and examples). `index.html` is the style's world, camera and
  chrome — change it only to change the style.
- `lib/` is generated (`tools/sync.sh` copies the core, the style kit and `lib/story.js` from the story). Edit the
  story's `script.md`, rebuild it with `story.py`, then sync and `python3 <skill>/explainer/tools/stamp.py .`.
- Every frame is a pure function of t: no `Math.random`, `Date.now` or network fetches; every beat time comes from
  `story.at()` / `story.phrase()` / `story.span()`.
- After editing text: `python3 <skill>/explainer/tools/fonts.py .`; after timing changes: `bash tools/sfx.sh`.
- Verify with `npx --yes hyperframes@0.8.81 check` (0 errors; `composition_file_too_large` and
  `nested_structure_needs_subcomposition` warnings are expected for these single-file films) and
  `python3 <skill>/explainer/tools/qa.py .` (snapshots, stillness, composition report, cover).
- Render with `bash <skill>/explainer/tools/render.sh . <name> <out-dir>`; never deliver a film that still shows
  「待演绎」 placeholders.
