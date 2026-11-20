// The example's sound map (references/sound.md): the music's shape from timing.ts, and each sound effect on the frame
// its picture event happens. Rendered with `npm run audio src/example`.
import {BPM, DROP, END, FPS, FRAMES, COUNT_AT, PRESS, ROWS_AT, SCENES, TYPE} from '../timing.ts';

export const MUSIC = {fps: FPS, bpm: BPM, frames: FRAMES, drop: DROP, end: END, key: 'D minor', preset: 'punchy'};

export const SFX = [
  {name: 'land', at: [SCENES.proof[0]], level: -34},
  // A soft tick as each invoice row lands, and one as the total settles.
  {name: 'flip', at: Array.from({length: 6}, (_, i) => ROWS_AT + i * 12 + 6).filter((f) => f >= 0), level: -40},
  {name: 'tick', at: [COUNT_AT + 24], level: -36},
  {name: 'press', at: [PRESS], level: -35},
  // One soft tick per typed character of the end card's command.
  {name: 'letter', at: Array.from({length: 13}, (_, i) => TYPE + 3 * (i + 1)), level: -41},
];
