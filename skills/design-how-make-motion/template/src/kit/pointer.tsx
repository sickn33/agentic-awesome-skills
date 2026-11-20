import type {VideoTheme} from './theme';

// The pointer (references/motion.md, "Micro-interactions"): it appears only to act, glides on a minimum-jerk path,
// hovers, presses, rests and leaves. It never teleports between targets.

/** Minimum-jerk position along a move, 0 to 1: zero speed and zero acceleration at both ends. */
export const minJerk = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (10 - 15 * x + 6 * x * x);
};

export type Stop = {x: number; y: number; at: number};

/** Where the pointer is at a frame, gliding from stop to stop over `glide` frames ending at each stop's `at`. */
export function pointerAt(frame: number, stops: Stop[], glide = 40) {
  let p = stops[0];
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i];
    if (frame >= s.at) { p = s; continue; }
    // A move never starts before the stop it leaves from has ended: a short gap glides in the time it has.
    const start = Math.max(p.at, s.at - glide);
    const k = minJerk((frame - start) / (s.at - start));
    return {x: p.x + (s.x - p.x) * k, y: p.y + (s.y - p.y) * k};
  }
  return {x: p.x, y: p.y};
}

/** How far a press is down at a frame, 0 to 1 and back, over 8 frames from `at`. Scale a target by 1 - 0.03 * this. */
export function pressAt(frame: number, at: number) {
  const k = frame - at;
  if (k <= 0 || k >= 8) return 0;
  return k < 3 ? k / 3 : 1 - (k - 3) / 5;
}

/** An arrow pointer, 1.15 times a real one, with its tip at (x, y). */
export function Pointer({theme, x, y, opacity = 1, press = 0, dark = false}: {theme: VideoTheme; x: number; y: number; opacity?: number; press?: number; dark?: boolean}) {
  const fill = dark ? theme.color.dark.ink : theme.color.ink;
  const edge = dark ? theme.color.dark.paper : theme.color.paper;
  return (
    <svg width={30} height={40} viewBox="0 0 26 34" style={{position: 'absolute', left: x, top: y, opacity, transform: `scale(${1 - 0.08 * press})`, transformOrigin: '2px 2px', overflow: 'visible'}}>
      <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill={fill} stroke={edge} strokeWidth={1.8} strokeLinejoin="round"/>
    </svg>
  );
}
