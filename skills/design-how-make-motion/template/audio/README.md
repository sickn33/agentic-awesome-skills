# Audio

The soundtrack is made in code: a beat on the video's own frame grid and a palette of effects in the same key,
rendered in a headless browser and mastered in Node. Nobody in the loop can listen, so `check.mjs` measures it.

```
npm run audio -- src/<name>          # node --experimental-strip-types audio/render.mjs src/<name>
npm run audio:check -- src/<name>    # add --mp4 out/master.mp4 once the video is muxed
```

`--experimental-strip-types` (Node 22.6+) lets `cues.mjs` import its frames from `../timing.ts`. Without it the
import fails and the scripts say so.

## Files

- `synth.js` is the browser side: the instruments, the `punchy` and `calm` beds and the effect palette, as
  `window.LaunchSynth`. It's also evaluated in Node, without audio, for the grid, the note lists the chord checks read,
  and the palette's pitches.
- `dsp.mjs` holds WAV I/O, BS.1770 loudness, true peak, the glue compressor and limiter, band energy, and the loader
  for a video folder's cues.
- `render.mjs` runs `synth.js` in Remotion's Chrome Headless Shell (`ensureBrowser` downloads it on first use), sets
  the bed's level, places the effects, masters the whole mix with one gain curve and splits it back into files. Set
  `GR_LOG=1` to print where the compressor and limiter work over 3 dB.
- `check.mjs` runs the checks below, prints a table and exits 1 on any failure.

Render writes `public/<name>/music.wav` and `public/<name>/sfx/<cue name>.wav`, which `kit/soundtrack.tsx` places,
and `src/<name>/audio/master.json`, `preview-mix.wav` (music plus effects, as the video will sound) and
`kick-stem.wav` (the kicks alone, for the grid check) and `bass-stem.wav` (the bass alone with its ducking, for the duck
check).

## The cues contract

`src/<name>/audio/cues.mjs`:

```js
import {FPS, FRAMES, DROP, END} from '../timing.ts';

export const MUSIC = {fps: FPS, bpm: 120, frames: FRAMES, drop: DROP, end: END, key: 'D minor', preset: 'punchy'};

export const SFX = [
  {name: 'press', at: [206, 1116], level: -36},
  {name: 'tag', sound: 'stamp', at: [112, 962], level: -37},  // a second stamp needs its own file name
  {name: 'thump', at: [END], level: -31},
];

// Optional. Without it the kicks follow the pattern below, from the drop to the gate.
// export const KICKS = [240, 348, 390, ...];
```

- `preset` is `punchy` (swung half-time, 120 BPM is its tempo) or `calm` (lo-fi, 80 BPM).
- `bpm` must give whole frames a beat (`fps * 60 / bpm`): at 60 fps that's 120 (30), 100 (36), 90 (40) or 80 (45).
  `end` must sit a whole number of beats after `drop`. Both throw otherwise.
- `drop` is where the beat comes in, on the story's turn; before it there are only keys, crackle and soft hats. `end`
  is the end card. `frames` is the file's length; the ring after `end` fades out.
- `key` is any minor or major key ("F minor", "C# minor", "Bb major"). Everything is written in D and transposed by
  the nearest offset, -6 to +5 semitones.
- Optional: `peak` (the bed's peak before the master, -20 dB), `fills` (frames that get a four-hit hat fill into
  them; one felt bar after the drop by default).
- An SFX cue is `{name, at: [frames], level}` plus optional `sound` (the palette sound, default `name`) and `len` in
  frames (default from the palette). `level` is the effect's peak in dB before the master. The file is
  `sfx/<name>.wav`.

Everything in the grid derives from `fps`, `bpm`, `drop` and `end`: a chord every 4 beats and the chord bar before
`end` forced to V so the card lands V to I. In `punchy` a felt bar is 8 beats in 16 steps of half a beat, odd steps a
tenth of a beat late, the gate 1.6 beats before `end`, the bell line on the drop, every 2 felt bars after, and once
more so it ends leading into the card; the default kicks are steps 0, 7, 10 and 0, 3, 10 in alternate felt bars. In
`calm` a felt bar is one bar of 16 sixteenths, odd ones a fifteenth of a beat late, the gate 1 beat before `end`, the
tine every other bar and on the V bar; the default kicks are steps 0, 7, 10 and 0, 10.

## The palette

Lengths are at 60 fps and scale with the frame rate. Every pitch comes from the key.

| sound | frames | for |
|-|-|-|
| `letter` | 3 | letters or items dropping in quick runs |
| `tick` | 6 | a guide, a cursor step, a counter |
| `press` | 5 | a button press, a drag starting |
| `flip` | 5 | a word or card flipping |
| `land` | 14 | something heavy landing, a shutter |
| `stamp` | 10 | a stamp or tag dropping |
| `ping` | 10 | a measurement or a row landing |
| `step` | 14 | a pass or a step starting |
| `chime` | 20 | the turn: a reveal, a flip into the product |
| `thump` | 24 | the end card's kick, on the tonic |

## The checks

| Check | Pass |
|-|-|
| Loudness of the preview mix | -14.0 LUFS ± 0.5 |
| True peak of every file | at most -2.8 dBTP (the MP4's AAC overshoots by up to 1.3 dB) |
| Limiter gain reduction, from master.json | under 4 dB |
| Kick onsets on the kick stem | within 4 ms of the grid |
| Kick stem | silent before the drop; every felt bar after it within 6 dB of the others |
| Energy under 30 Hz | under -40 dBFS |
| Energy over 5 kHz | over -45 dBFS, or the beat vanishes on a phone speaker |
| Effect pitches | every sound in the palette in the key's natural minor or major |
| Tune vs chord, from `notes()` | no bell, echo or tine note a semitone or a minor 9th from a chord tone sounding with it |
| Chord tones under 200 Hz, from `notes()` | no two sounding together closer than a whole tone |
| Bass at each kick, on the bass stem | the 30 ms from the kick at least 6 dB under the 30 ms from 120 ms later |
| With `--mp4` | the muxed audio at -14.0 LUFS ± 0.5 and at most -1 dBTP, by ffmpeg's ebur128 |

`--mp4` uses Remotion's bundled ffmpeg from `node_modules/@remotion/compositor-*`, or `ffmpeg` on the PATH.
