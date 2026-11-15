# Finding references (what actually worked)

## Pipeline
1. **Find the official upload** with web search restricted to youtube.com:
   `youtube <title> official trailer OR opening OR "textless OP"` — textless OP/ED versions are best (no credits over the art).
2. **Download low-res and tile 24 frames** (no browser needed, no permission prompts):
   `bash tools/ref_frames.sh <url> <name> 24` → `<name>_sheet.jpg` (6×4 across the whole clip). Look at it with the image viewer.
3. For a moment you care about, grab dense frames: `$FF -ss 31 -t 3 -i name.mp4 -vf "fps=8,scale=-2:300,tile=8x3" -frames:v 1 dense.jpg` — transitions and timing only show up at 8+ fps.
4. Motion-design / UI motion: 60fps.design pages contain direct mp4 links (ref_frames.sh handles them). Impractical (impractical.ai/launch-videos) has written breakdowns.
5. Category look: App Store screenshots of competitors; Behance project images can be listed from an already-open browser tab via `javascript_tool` (curl is blocked), then downloaded from the CDN.

## Blocked / painful
- The in-app browser asks the user to allow every new site and YouTube may be refused → prefer yt-dlp in the shell.
- Vimeo now requires login for yt-dlp; look for a YouTube mirror.
- Behance/YouTube pages block curl; their CDNs (mir-s3-cdn-cf.behance.net, i.ytimg.com) don't.

## A wider pool for "strongly stylized" (pick across countries and media)
- **Japan:** Persona 5 opening (limited red/black/white, halftone, shard cuts, silhouettes, repeated framing), Promare / Trigger (flat polygon light, neon fields, no gradients), Masaaki Yuasa — Mind Game, Devilman Crybaby, Inu-Oh (elastic bodies, style switching, photo collage), Studio 4°C — Tekkonkinkreet (painted density), Mob Psycho 100 (painted-on-glass effects), Kill la Kill (type as staging).
- **US:** Spider-Verse films (halftone on 3D, misregistration, on-twos characters, comic captions), The Mitchells vs the Machines (doodle overlays on 3D), Puss in Boots: The Last Wish (painterly fight smears), Arcane (painted textures, ink flashes), Saul Bass titles, Catch Me If You Can titles (Kuntzel + Deygas cut-paper).
- **Europe:** Gobelins graduation shorts, Cartoon Saloon (Wolfwalkers: visible construction lines, woodcut textures), Klaus (2D with volumetric light), Yellow Submarine (psychedelic flat).
- **China:** 雾山五行 (ink action, brush speed), 中国奇谭 (style anthology: ink, paper-cut, stop motion).
- **Korea / other:** music-video animation, game cinematics (Hi-Fi Rush: everything on the beat), Gorillaz.
- **Motion design:** Spotify Wrapped, Figma Config openers (Relay), BUCK, Ordinary Folk, Giant Ant, Oddfellows.

## What to write down per reference (technique sheet)
palette rule · line (weight / none / boiling) · texture (halftone, grain, paper, brush) · shape language · depth trick · camera language · transition device · timing (ones / twos / holds / smears) · signature move nobody else has.
