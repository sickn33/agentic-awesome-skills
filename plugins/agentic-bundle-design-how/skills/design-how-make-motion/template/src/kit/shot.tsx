import {useMemo, type ReactNode} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {Sampled, whipAt, whipping} from './motion';
import type {VideoTheme} from './theme';

// A video as a list of full-bleed scenes, cut on the beat: each whips in from the right and out to the left with
// motion blur while it moves, and draws itself at the composition's frame (not the scene's), so timing.ts holds one
// clock.

export type Scene = {
  name: string;
  from: number;
  to: number;
  /** An ink scene draws on the theme's dark ground. */
  dark?: boolean;
  draw: (frame: number) => ReactNode;
  /** Blur samples the scene wants at a frame for its own fast moves; 1 when still. */
  blur?: (frame: number) => number;
  whipIn?: boolean;
  whipOut?: boolean;
};

/** The most blur samples a scene asks for. */
function samplesFor(theme: VideoTheme, scene: Scene) {
  const {whipIn = true, whipOut = true} = scene;
  let n = whipIn || whipOut ? theme.motion.blur.whip : 1;
  if (scene.blur) for (let f = scene.from; f < scene.to; f++) n = Math.max(n, Math.min(scene.blur(f), theme.motion.blur.move));
  return n;
}

/** Frames over which the blur stack fades in before a move and out after it. */
export const BLUR_FADE = 8;

/** How much of the blur stack to draw at a frame, 0 to 1: full while the scene whips or asks for blur, fading over
 * BLUR_FADE frames either side, so the stack's small darkening ramps instead of stepping (motion.tsx, Sampled). */
export function blurMix(theme: VideoTheme, scene: Scene, frame: number) {
  const {from, to, whipIn = true, whipOut = true} = scene;
  const wants = (f: number) => whipping(theme, f, whipIn ? from : -1e9, whipOut ? to : 1e9) || (scene.blur?.(f) ?? 1) > 1;
  const f0 = Math.floor(frame);
  let best = Infinity;
  for (let d = 0; d <= BLUR_FADE; d++) {
    if (wants(f0 - d) || wants(f0 + d)) { best = d; break; }
  }
  return best === Infinity ? 0 : 1 - best / (BLUR_FADE + 1);
}

function Shot({theme, scene}: {theme: VideoTheme; scene: Scene}) {
  const frame = useCurrentFrame() + scene.from;
  const {from, to, whipIn = true, whipOut = true} = scene;
  const bg = scene.dark ? theme.color.dark.paper : theme.color.paper;
  // Fixed for the scene's life, so it's worked out once, not on every frame.
  const n = useMemo(() => samplesFor(theme, scene), [theme, scene]);
  return (
    <AbsoluteFill style={{background: bg}}>
      <Sampled frame={frame} n={n} mix={blurMix(theme, scene, frame)} render={t => (
        <AbsoluteFill style={{background: bg}}>
          <AbsoluteFill style={{transform: `translate3d(${whipAt(theme, t, from, to, whipIn, whipOut)}px, 0, 0)`}}>{scene.draw(t)}</AbsoluteFill>
        </AbsoluteFill>
      )}/>
    </AbsoluteFill>
  );
}

export function Scenes({theme, scenes}: {theme: VideoTheme; scenes: Scene[]}) {
  return (
    <>
      {scenes.map(scene => (
        <Sequence key={scene.name} name={scene.name} from={scene.from} durationInFrames={scene.to - scene.from} premountFor={30}>
          <Shot theme={theme} scene={scene}/>
        </Sequence>
      ))}
    </>
  );
}
