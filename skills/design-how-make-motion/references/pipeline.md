# Pipeline

## Project

Copy `template/` from this skill into the person's project (default `video/`), rename `gitignore.template` to `.gitignore` in the copy, then run `npm ci`. Each video gets
its own folder under `src/`; scenes are never shared between videos, only `src/kit/`.

```
video/
  package.json            Remotion pinned, the scripts below
  remotion.config.ts      headless shell, PNG frames
  src/
    Root.tsx              one line per video
    kit/                  theme, motion, shot, pointer, fonts, soundtrack
    <name>/
      SCRIPT.md           scenes, every word on screen, sound, before posting
      timing.ts           every frame as a beat; STILLS, THUMBNAIL
      theme.json          the theme, partial is fine
      video.tsx           the scenes and the composition
      audio/cues.mjs      MUSIC and SFX, read from timing.ts
  audio/                  synth, render, checks (README.md: cues contract, palette)
  scripts/                render.mjs, frame-jumps.mjs
  public/<name>/          rendered music.wav and sfx/ (written by npm run audio)
  out/<name>/             stills, review.mp4, contact.png, master.mp4, x.mp4, thumbnail.png
```

Start a new video by copying `src/example/` to `src/<name>/`, renaming the composition and adding it to `Root.tsx`,
then replacing every scene. Remotion's docs are at remotion.dev/docs.

## Commands

Pass flags to a script after `--`, as npm needs.

| Command | Does |
|-|-|
| `npm run studio` | Remotion Studio, to scrub the timeline |
| `npm run theme -- <url> --out src/<name>/theme.json` | a draft theme read from a site (theme.md) |
| `npm run stills <name>` | every frame in STILLS at scale 1, to `out/<name>/stills/` |
| `npm run review <name>` | the silent review cut at scale 1 and a contact sheet of every 10th frame |
| `npm run jumps <name>` | the jump check on the review cut, with `CUTS` from timing.ts as planned cuts |
| `npm run energy <name>` | the energy check on the review cut, per scene |
| `npm run audio src/<name>` | music and effects, mastered, into `public/<name>/` |
| `npm run audio:check -- src/<name> --mp4 out/<name>/master.mp4` | the audio checks; leave out `--mp4` before the master |
| `npm run master <name>` | scale 2, CRF 10, BT.709, with the soundtrack, and the thumbnail |
| `npm run x <name>` | the 1350x1080 cut for X, from the master |
| `npm run typecheck` | TypeScript over `src/` |

`jumps` and `energy` take `-- --file <video>` to check another file, such as the master.

The first render downloads Remotion's Chrome Headless Shell (about 95 MB) into `.remotion/`. Use it, not a full
Chrome: a full Chrome dropped elements in about one frame in three.

Times on an M-series Mac. The template's 8 s example: stills 2 s, review cut about 20 s, audio 3 s. A 20 s video
with blur on every whip and fast move: a review cut of a few minutes and a master at scale 2 of 10 to 25 minutes,
most of it in the frames that blur. Plan renders: a fix goes into a review cut, never straight into the master.

## Fonts

`useThemeFonts` loads every face in the theme before the first frame and fails the render if one doesn't load. Each
face registers under an alias ("Geist (video)"), so a copy of the same family installed on the machine can't stand in
for it; `stack()` in theme.ts uses the alias. A local file (`src.file`) is one variable font, or a list of static
files with their weights (`[{file, weight}]`). Measure text only after the fonts have loaded.

## X export

X plays about 1920x1200 at most, so post the lanczos downscale `npm run x` makes, not the master: H.264 high at
CRF 14, BT.709, AAC 192k, faststart. The thumbnail is the frame named `THUMBNAIL` in timing.ts.

## Studying a reference video

Read it with ffmpeg, not by eye: cut times with `select='gt(scene,0.3)'`, a contact sheet at 1 to 2 fps, every frame
of the type and the pointer, and the audio's tempo and loudness. Write down what to take and what to leave.
