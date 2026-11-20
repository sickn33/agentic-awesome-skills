// Every frame of the example as a beat (references/story.md, "Script"). A re-timing is one constant here, and the
// music (audio/cues.mjs) reads the same anchors. Ranges are [from, to): from inclusive, to exclusive.

export const FPS = 60;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 30 frames
export const b = (beats: number) => Math.round(beats * BEAT);

export const FRAMES = b(16);
/** The beat drops here: the story's turn. */
export const DROP = b(4);
/** The end card lands here, on the tonic. */
export const END = b(12);

export const SCENES = {
  hook: [0, b(6)],
  proof: [b(6), END],
  end: [END, FRAMES],
} as const;

/** Hard cuts on purpose, for the jump and energy checks (`npm run jumps example`). */
export const CUTS = [SCENES.proof[0], SCENES.end[0]];

export const CAPTIONS = [
  {text: 'Invoices pile up', from: -12, to: b(2.5)},
  {text: 'Nobody knows what got paid', from: b(3), to: b(5.4)},
  {text: 'So you watch it land', from: b(6.6), to: b(10.5)},
];

/** The hook's rows slide in, one every 12 frames, from just before the video starts. */
export const ROWS_AT = -20;
/** The paid total scrambles and lands; the chart draws under it; its bar fills. */
export const COUNT_AT = b(7);
export const CHART = [b(6.3), b(9.5)] as const;
export const FILL = [b(8), b(10)] as const;

/** Designed one-frame steps, planned for the jump check: here, the total's digits landing. */
export const STEPS = [COUNT_AT + 24];
/** The pointer presses the proof's Share button. A command is typed, never clicked: the end card types it. */
export const PRESS = b(10.5);
/** The end card's command starts typing here, a character every 3 frames. */
export const TYPE = END + 18;

export const STILLS = [b(1.5), b(4), b(7.5), b(10), b(12.5), b(14.5)];
export const THUMBNAIL = b(10);
