declare module '*/audio/cues.mjs' {
  export const MUSIC: {fps: number; bpm: number; frames: number; drop: number; end: number; key: string; preset: string};
  export const SFX: {name: string; at: number[]; level: number; len?: number}[];
}
