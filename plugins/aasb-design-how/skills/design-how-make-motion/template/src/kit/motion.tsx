import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {type Bezier, type VideoTheme, stack} from './theme';

// The motion primitives every scene builds on (references/motion.md). Every value is a pure function of the frame.

export const bezier = (b: Bezier) => Easing.bezier(b[0], b[1], b[2], b[3]);
export const LINEAR = (t: number) => t;

/** A value from `a` to `b` over frames [f0, f1], held outside, on an ease. */
export function ramp(frame: number, [f0, f1]: readonly [number, number], [a, b]: readonly [number, number], ease: (t: number) => number = LINEAR) {
  if (frame <= f0) return a;
  if (frame >= f1) return b;
  return a + (b - a) * ease((frame - f0) / (f1 - f0));
}

/** The whole frame a blur sample belongs to. Samples run from the frame to half a frame after it, so floor, never
 * round: rounding sends the later samples to the next frame and a choice made on it (a digit, a face, a letter
 * typed) draws twice. */
export const whole = (frame: number) => Math.floor(frame);

/** A number landing: its digits run for `len` frames, settling left to right, then hold. Whole frames only, so every
 * blur sample of a frame draws the same digits. `salt` keeps two numbers from scrambling in lockstep. */
export function scramble(frame: number, at: number, text: string, len = 18, salt = 0) {
  frame = whole(frame);
  const k = frame - at;
  if (k >= len) return text;
  if (k < 0) return text.replace(/\d/g, '0');
  const settled = Math.floor((k / len) * text.length);
  return [...text].map((c, i) => {
    if (i < settled || !/\d/.test(c)) return c;
    const n = Math.abs(Math.sin((frame + 1) * 12.9898 + i * 78.233 + salt * 39.425) * 43758.5453);
    return String(Math.floor(n) % 10);
  }).join('');
}

/**
 * Motion blur: the frame drawn at `n` sub-frame times across a forward 180 degree shutter (from the frame to half a
 * frame after it), each sample opaque and the k-th at 1/k over those under it, which averages them. A forward shutter
 * means a scene's first frame after a cut is already blurred.
 *
 * Stacking samples quantises every pixel to 8 bits at each layer, which darkens content by a few levels (2.3 at 16
 * samples on an ink scene, measured). Switching from 16 samples to one in a single frame steps the whole frame. So
 * `mix` lays the stack over one sharp copy at that opacity: callers ramp it from 1 to 0 over a few frames as a move
 * ends (`blurMix` in shot.tsx), the shift fades instead of stepping, and holds render one sample, which is fast.
 */
export function Sampled({frame, n, mix = 1, render}: {frame: number; n: number; mix?: number; render: (t: number, i: number) => ReactNode}) {
  // The sharp copy draws the shutter's middle moment, a quarter frame on, so it lines up with the stack's average:
  // otherwise, under a moving camera, fading between them shows two different moments and steps.
  const mid = frame + 0.25;
  if (n <= 1 || mix <= 0) return <>{render(mid, 0)}</>;
  const stack = Array.from({length: n}, (_, i) => {
    const t = frame + (0.5 * i) / (n - 1);
    return <AbsoluteFill key={i} style={{opacity: 1 / (i + 1)}}>{render(t, i)}</AbsoluteFill>;
  });
  if (mix >= 1) return <>{stack}</>;
  return (
    <>
      <AbsoluteFill>{render(mid, 0)}</AbsoluteFill>
      <AbsoluteFill style={{opacity: mix}}>{stack}</AbsoluteFill>
    </>
  );
}

/** The beat cut: a scene's x offset, in from the right over whipIn frames and out to the left over whipOut. */
export function whipAt(theme: VideoTheme, frame: number, from: number, to: number, ins = true, outs = true) {
  const {frames, whipPx, ease} = theme.motion;
  let x = 0;
  if (ins) x += whipPx * (1 - ramp(frame, [from, from + frames.whipIn], [0, 1], bezier(ease.settle)));
  if (outs) x -= whipPx * ramp(frame, [to - frames.whipOut, to], [0, 1], bezier(ease.exit));
  return x;
}

/** True while a scene is whipping, so the caller can raise its blur samples. */
export function whipping(theme: VideoTheme, frame: number, from: number, to: number) {
  const {whipIn, whipOut} = theme.motion.frames;
  return (frame >= from && frame < from + whipIn) || (frame >= to - whipOut && frame < to);
}

/**
 * A caption in the theme's display face. Kinetic: each word rises into place with its letters spread and pulls the
 * spread in as it lands, then leaves upward, spreading again. The spread is drawn on a copy over the word, which is
 * held at its final width, so the line never reflows. Static: the line cuts in and out.
 */
export function Caption({theme, text, from, to, frame, x, y, color, style}: {
  theme: VideoTheme; text: string; from: number; to: number; frame: number; x: number; y: number; color?: string; style?: CSSProperties;
}) {
  const {caption, frames, ease} = theme.motion;
  const t = theme.type.caption;
  const base: CSSProperties = {position: 'absolute', left: x, top: y, whiteSpace: 'nowrap', fontFamily: stack(theme.font.display),
    fontWeight: t.weight, fontSize: t.size, lineHeight: t.leading, letterSpacing: `${t.tracking}em`, color: color ?? theme.color.ink, ...style};
  if (caption.style === 'static') {
    if (frame < from || frame >= to) return null;
    return <div style={base}>{text}</div>;
  }
  if (frame < from - 1 || frame > to + 40) return null;
  const words = text.split(' ');
  return (
    <div style={{...base, letterSpacing: undefined}}>
      {words.map((word, i) => {
        const at = from + i * frames.wordStagger;
        const p = ramp(frame, [at, at + frames.wordSettle], [0, 1], bezier(ease.settle));
        const out = ramp(frame, [to + i * 2, to + i * 2 + frames.wordExit], [0, 1], bezier(ease.exit));
        // Open toward the side with no word: rightward on entry, leftward on exit, so neighbours never collide.
        const spreadIn = caption.spreadIn * (1 - p), spreadOut = caption.spreadOut * out;
        const tracking = spreadIn + spreadOut + t.tracking;
        // Opacity fades on its own linear ramp: on the exit curve a word sat near full and vanished in one frame.
        const fade = ramp(frame, [to + i * 2, to + i * 2 + frames.wordExit], [0, 1], LINEAR);
        const opacity = Math.min(ramp(frame, [at, at + 6], [0, 1]), 1 - fade);
        const dy = (1 - p) * t.size * 0.5 - out * t.size * 0.35;
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', marginRight: '0.24em', letterSpacing: `${t.tracking}em`}}>
            <span style={{visibility: 'hidden'}}>{word}</span>
            <span style={{position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', opacity, letterSpacing: `${tracking}em`,
              transform: `translate3d(${-(word.length - 1) * spreadOut}em, ${dy}px, 0)`}}>{word}</span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * A camera push: its children scaled by `scale` about `origin` (in the children's own pixels). The recipe the shipped
 * videos' camera uses (references/motion.md, "Camera"): the children are laid out once with CSS zoom at the largest
 * scale the push reaches (`max`), a transform only shrinks them, and a 0.02 degree rotation keeps Chrome
 * re-rasterising them the same way on every frame. A transform alone draws the layer once and re-sharpens it a few
 * frames later; a changing zoom snaps text to whole pixels. Both step.
 */
export function Push({scale, max, origin: [ox, oy], children, style}: {scale: number; max: number; origin: [number, number]; children: ReactNode; style?: CSSProperties}) {
  return (
    <div style={{position: 'absolute', ...style}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: `${ox}px ${oy}px`,
        transform: `rotate(0.02deg) scale(${scale / max})`}}>
        {/* Chrome multiplies a zoomed element's own left and top by its zoom, so the offset is divided by it. */}
        <div style={{position: 'absolute', left: (ox - ox * max) / max, top: (oy - oy * max) / max, zoom: max}}>{children}</div>
      </div>
    </div>
  );
}

/** A surface with a hairline, on paper or on an ink scene. */
export function Panel({theme, w, h, dark = false, children, style}: {theme: VideoTheme; w: number; h: number; dark?: boolean; children?: ReactNode; style?: CSSProperties}) {
  const g = dark ? theme.color.dark : theme.color;
  return (
    <div style={{position: 'relative', width: w, height: h, background: dark ? g.well : g.paper, border: `${theme.shape.hairline}px solid ${g.hair}`,
      borderRadius: theme.shape.radius.panel, boxShadow: theme.shape.shadow === 'none' ? undefined : theme.shape.shadow, overflow: 'hidden', ...style}}>{children}</div>
  );
}
