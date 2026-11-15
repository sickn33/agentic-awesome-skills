---
name: pro-motion
description: "Make a motion-graphics launch, brand or promo film audio first: plan the music, then render the film in code (canvas to MP4) cut to the track. Use for 发布视频, 宣传片, TVC, BGM, Suno prompts."
category: media
risk: safe
source: self
source_repo: jack-reson8/pro-motion
source_type: self
date_added: "2026-10-24"
author: jack-reson8
tags: [motion-graphics, video, music, launch-film]
tools: [claude, codex, cursor]
license: "MIT"
license_source: "https://github.com/jack-reson8/pro-motion/blob/main/LICENSE"
---

# Pro Motion — MG film, audio first (launch · brand · TVC · promo)

A method for making motion-graphics films that read as designed, not templated — in code, fast, locked to music.
It was distilled from a real project that went through ~10 rounds: early cuts were rejected as "PPT", "ugly material", "text floating on top", "pop art when I asked for stylized"; later cuts were accepted. **The difference was the method, not the tooling.** Follow the steps in order; each one exists because skipping it failed once.

## When to Use This Skill

- the user wants a launch video, brand film, TVC or app promo made as motion graphics
- the user wants a film re-cut to music, restyled, or localized into several languages
- the user needs a music plan or Suno/Udio prompts for a promo

## 0 · Setup (once per project folder)

Needs Node 18+, Python 3 with numpy / scipy / matplotlib, and a Chrome / Chromium install (auto-detected; set `CHROME=/path` to override). Subject cutouts need macOS 14+.

## Runtime prerequisite

Pinned upstream reference: [jack-reson8/pro-motion at 50db3957004a086c24575897c0b97a2a975624a1](https://github.com/jack-reson8/pro-motion/tree/50db3957004a086c24575897c0b97a2a975624a1).

This catalog entry bundles documentation, `assets/template/audio-plan.md`, `references/*.md`, and `LICENSE` only; the runtime template (`film.html`, `film.js`, `motion-lib.js`, OFL font binaries) and `scripts/` helpers (`setup.sh`, `analyze_music.py`, `audio_post.py`, `render-fast.js`, `contact_sheet.sh`, `ref_frames.sh`, `cutout.swift`, `faces.swift`) are not bundled. Before executing any rendering or setup step, obtain user consent to fetch the pinned upstream commit above, inspect all scripts and dependencies, and verify their contents.

## 1 · Brief intake (decide, don't interrogate)

Write down in one block, filling gaps with sensible defaults and saying so: product / brand and what the film must make people feel · audience and markets (→ languages) · music file (if there is none, make one in step 1b — never start the picture without a locked track) · duration · aspect ratios (default 9:16 master, 1:1 and 16:9 later) · film type (product launch = show the product's real design language; brand film = story and style first, product optional) · must-have elements (logo, mascot, slogan, features) · what the user has rejected before.

## 1b · Audio first: plan and generate the track

Copy `assets/template/audio-plan.md` into the project (setup does this for new folders; copy it by hand into existing ones) and fill it in order — each part feeds the next, and the picture doesn't start until the track is locked:
1. **Campaign brain** (§1): read `references/audio-first.md` §1 and pick a mechanism type A–G from `references/campaign-cases.md`; write the sound that *is* the mechanism. A concept with no mechanism gets rejected as "boring" — fix it here, not later. For "viral / 神级" briefs, search recent Cannes / Spikes winners first.
2. **Palette and energy map** (§2–3): use the fusion engine, sound-design and voice lists in `audio-first.md` §3; bars on round seconds.
3. **Rails** (§4): tick every box; any unticked box means rewrite the map, not the prompt.
4. **Prompt** (§5): follow `audio-first.md` §4 (style = identity, tags = placement). Show the user the plan's §1 and §3 plus the prompt. Offer 2–3 directions only while they're still exploring.
5. **Post** (§6): user generates takes → analyse (step 2) → `tools/audio_post.py` for tuned SFX on exact beats, glow-up muffle, on-twos stutter, loop, Morse / spectrogram signature; loudness with ffmpeg.

## 2 · Analyse the music (the edit is the music)

```bash
$FF -y -i music.mp3 -ac 1 -ar 22050 music/mono.wav
python3 tools/analyze_music.py music/mono.wav music/   # tempo, grid offset, onsets, low/high hits, RMS → music/analysis.json + music/spec.png
```
Look at `spec.png` (spectrogram, envelope, beat grid). Write the **music map**: lead-in, stabs, builds, the drop, held / half-time sections, silences, the biggest hit, the final hit, the tail — in seconds. A user's description of the track ("drop at 0s, logo at 25s") is a hint; the spectrogram is the truth. Every major move lands on a mapped event; secondary moves on 8ths / 16ths (`grid0 + k * 60 / BPM / 4`).

## 3 · Research with real frames (never from memory)

Follow `references/sourcing.md`:
- find official uploads with web search → `bash tools/ref_frames.sh <url> <name>` → 24-frame contact sheet (no browser, no permission prompts);
- 6–10 references across countries and media, not one genre — category leaders, motion-design studios, and (for anything "stylized") feature animation, anime OP/ED, art shorts, MV, game cinematics;
- the product's own latest screenshots, icon, mascot and design notes (for launch films the film must speak the product's current design language).

For each reference write a **technique sheet** (palette rule · line · texture · shape language · depth trick · camera · transition device · timing · signature move). `references/research-notes.md` has worked examples.

## 4 · Direction: three style frames before any film

Don't default to the first association or the style that is easiest to code — if a direction can be named by one familiar label ("pop art", "flat", "Y2K", "clean SaaS") it is probably not new enough.
1. Propose **3 clearly different directions**, each = 2–3 *named techniques* borrowed from the technique sheets + the material it needs.
2. Render **one style frame each** (`node tools/render-fast.js "film.html?dir=a" stills/ --stills 1.2` — a still at the key moment, or a 2-second loop) and show them side by side.
3. The user picks or mixes. Only then write the shot map.

## 5 · Story: protagonist + shot map

- **One protagonist** that transforms through every scene (an object, shape or mascot tied to the brand — e.g. a brand dot that becomes a punch tool, a REC light, a page indicator, and finally the dot of the logo). Narrative beats feature lists.
- **Each feature / object performs itself** on a music event (a punch is a hit, dots breathe on hi-hats, an outline draws itself, a sticker peels). Material and motion are the same thing.
- **Every scene change is designed**: match cut, morph, object flies into the next layout, shard / scan / push wipe, metaball convergence, colour-block slam. Plain cuts only as deliberate stutters.
- **Text is animation**: written on by the protagonist, riding a path, echoing an effect, annotating what it names. No lower-third templates, chips or boxes. Few words.
- **The ending grows out of the film**: everything converges into the protagonist, which becomes part of the logo.
- Shot map table: time · music event · picture · transition in · words. Save it as `shotmap.md`.

Run `references/aesthetic-checklist.md` against the shot map before coding.

## 6 · Build

- Start from `film.js` (scene table + `render(t)`), `motion-lib.js` (primitives — read its header index) and `film.html`.
- `render(t)` must be **pure and deterministic**: no `Math.random` at draw time (use `rand(seed)` / `hash`), no state between frames — frames are rendered by parallel tabs.
- Material: real, current, licence-safe photos (the user's own > Lorem Picsum / Unsplash licence) or pure drawn graphics. Half-body > big faces. Blank space beats an ugly asset. Cutouts / face boxes: `swift tools/cutout.swift in.jpg mask.png`, `swift tools/faces.swift *.jpg > faces.json` (normalized — convert to pixels explicitly).
- Frame-rate language is a style choice: 60 fps smooth for product films; 24 fps with objects on twos (`Math.floor(t*12)/12`) for hand-made animation; 12 fps line boil for doodle layers.
- Languages: `?lang=` parameter → EN master + local cuts that swap only key lines; decorative multilingual text (onomatopoeia, rings, slams) stays in every cut. Handwriting fonts (OFL) are bundled in `assets/template/assets/fonts`.

## 7 · Render fast, verify once, deliver

```bash
node tools/render-fast.js "film.html?lang=en" out/film-en.mp4 --dur 20.04 --audio music/track.mp3 [--fps 24]   # parallel tabs; ~30 s per 20 s @60fps
bash tools/contact_sheet.sh out/film-en.mp4 stills/check.jpg 0.5,1.0,2.4,...                               # frames at chosen seconds → one image
$FF -i out/film-en.mp4 -map 0:a -f null - 2>&1 | grep -oE 'time=[0-9:.]+' | tail -1                       # audio must run full length
```
One check pass per render: read the sheet at every mapped event and transition, fix concrete bugs (off-screen, overlaps, backwards text, seams, unreadable contrast), re-render. Don't ask the user to verify what a sheet can show, and don't loop endlessly — the first draft should already be good. Deliver: `open` the file, clickable links, a side-by-side `index.html` for several cuts; offer 1:1 / 16:9 re-layouts only after the master is approved.

## 8 · Iterate by timestamp

Take feedback as "time → problem", fix only that, re-render (seconds, not minutes). When feedback is about taste ("PPT", "ugly", "not stylized enough"), go back to steps 3–4 instead of patching. Record new rejections / acceptances in `references/lessons.md`.

## Files

- `assets/template/` — `audio-plan.md`, `assets/fonts/LICENSES.md` (runtime HTML/JS/fonts at the pinned upstream commit)
- `references/` — `audio-first.md`, `campaign-cases.md`, `sourcing.md`, `research-notes.md`, `aesthetic-checklist.md`, `lessons.md`

## Examples

- **Audio-first launch film:** "Plan a 20-second 9:16 launch film for our creative iOS app." Complete `audio-plan.md` first (campaign mechanism, energy map, and prompt), analyze the locked track's beat grid, propose 3 distinct style frames from multi-region references, and write `shotmap.md` before coding any scene.
- **Music-synced revision:** "The cut at 4.2s feels like a generic slide transition." Check `references/aesthetic-checklist.md` and `references/lessons.md`, replace the static swap with a protagonist-driven morph synced to the mapped beat event, and verify via a contact sheet.

## Limitations

- Rendering requires a separately reviewed copy of the upstream runtime plus local Node, Chrome, and ffmpeg; subject cutouts need macOS 14+.
- Generated music comes from external tools the user runs themselves; the skill writes the audio plans, prompts, and shot maps.
