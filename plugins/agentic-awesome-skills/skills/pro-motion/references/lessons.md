# Lessons (bugs and process mistakes already paid for)

## Rendering
- **ffmpeg `-shortest` with a slow image pipe truncated the MP3 audio at ~13 s** (v2). Render frames to JPEGs first, then mux in one pass with `-map 0:v -map 1:a -t <dur>`; never `-shortest`. `render-fast.js` does this. Always check the audio duration of the output.
- Single-tab serial rendering + `-preset slow` took ~5 min per 25 s. Parallel tabs (6) + `-preset veryfast -crf 19` takes ~30 s for 20 s @60 fps.
- Parallel tabs mean `render(t)` must be deterministic: `Math.random()` in a noise texture made every worker different → flicker. Use a seeded generator.
- Puppeteer's bundled Chrome download can hang; install with `PUPPETEER_SKIP_DOWNLOAD=1` and point at the system Chrome. Killing an in-progress `npm i` rolls back node_modules.
- `ffmpeg-static` binary may land without the exec bit: `chmod +x`.
- Canvas `getImageData` on images needs http, not file:// — the renderers serve the folder over a local http server.

## Geometry & drawing
- Vision face boxes are normalized (0–1, top-left origin after flipping). Passing them into a pixel-space helper put the orbit ring and CCTV box off-screen. Convert explicitly.
- A rect + arc path clipped with `evenodd` drew a thin diagonal seam (implicit connecting line). `moveTo(cx + r, cy)` before `arc`, close the path.
- Text placed along an ellipse reads backwards on the near half unless the angle runs the other way; the far half being mirrored is physically correct.
- Spread ring text with `step = 2π / chars.length` or a gap rotates through the front.
- A full-bleed close-up leaves no room for clones / echoes; pull back to a graphic layout first.
- Fonts must be awaited (`document.fonts.load`) for every family used, including handwriting fonts, before the first frame.

## Design process
- Designing from memory produced templates. Pulling real frames (contact sheets) of references fixed taste fast.
- Stills-only checks missed motion/sync problems and the audio bug; always check audio length and a frame sheet of the final file.
- Code-drawn mascots and dated stock photos made everything look cheap ("素材丑 → 成片一定丑").
- Content swapping in a fixed frame = PPT, even with a continuous camera.
- Labels as lower-third templates, chips and boxes were rejected; text must be animated into the scene.
- Multiple languages in one block looked messy; master + per-language cuts was accepted.
- The user doesn't want repeated verification rounds; do one competent check pass, fix, deliver.

## Style (from a stylized brand film)
- The brief said "strongly stylized", not "pop art"; I collapsed four rich references (Persona 5, Promare, Mind Game, P5 anime) into the most obvious one (Lichtenstein pop art) because it was the first association and the easiest to draw in code. The output was good but generic relative to the references.
- Fix: technique sheets per reference + 3 divergent style frames for the user to choose before building (SKILL.md §2b). Name the techniques you are borrowing; if a direction can be summarised as one familiar label ("pop art", "flat", "Y2K"), it is probably not new enough.
- Techniques that were seen but not used, and were the distinctive part: Promare's flat polygon light and neon fields with zero gradients; Mind Game's mid-shot switches between drawing styles and photo collage; P5 anime's repeated framing (same train window, changing passengers); P5's silhouette crowds and graphic city maps.

## Music (audio-first, from a launch where the track was made from scratch)
- Starting the picture before the track was locked wasted rounds; the user calls audio first "the most important". Plan the music as a campaign asset first (`references/audio-first.md`).
- Prompts listing many electronic genre tags came back as generic EDM; prompts naming concrete acoustic instruments over a live-player foundation came back tasteful.
- Generators ignore precise seconds and default to slow intros; state "starts at full energy, no intro" and "biggest peak at the end for the logo", then fix timing in post.
- AI crowd vocals sound fake unless the recording situation is described; whispers and stuttered brand names were rejected; the brand name works best shouted by a group at a few key moments.
- Random / generative concepts without a marketing mechanism were called "boring"; every concept needs a reason to be shared.
