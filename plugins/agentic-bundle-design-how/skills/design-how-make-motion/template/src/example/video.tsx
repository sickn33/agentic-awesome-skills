import {AbsoluteFill} from 'remotion';
import {useThemeFonts} from '../kit/fonts';
import {bezier, Caption, LINEAR, Panel, Push, ramp, scramble, whole} from '../kit/motion';
import {Pointer, pointerAt, pressAt} from '../kit/pointer';
import {type Scene, Scenes} from '../kit/shot';
import {Soundtrack} from '../kit/soundtrack';
import {mix, resolve, stack, type VideoTheme} from '../kit/theme';
import {SFX} from './audio/cues.mjs';
import themeJson from './theme.json';
import {CAPTIONS, CHART, COUNT_AT, END, FILL, FRAMES, PRESS, ROWS_AT, SCENES, TYPE} from './timing';

// A smoke test for the pipeline that also passes its own energy check: an invented invoicing app, three scenes, every
// kit part used once, three things alive in every scene (references/motion.md, "Energy"). Not a video to copy. Make
// each real video in its own folder, with scenes written for its story (SKILL.md, "Rules").

export const THEME: VideoTheme = resolve(themeJson as Parameters<typeof resolve>[0]);
const {w: W, h: H} = THEME.frame;
const settle = bezier(THEME.motion.ease.settle), glide = bezier(THEME.motion.ease.glide), resolveEase = bezier(THEME.motion.ease.resolve);

/** Invented, plausible content: no placeholder bars (references/motion.md, "Motion slop"). */
const INVOICES: [string, string, string][] = [
  ['Lumen Studio', 'Due Friday', '$1,240'], ['Field & Pine', 'Overdue 4 days', '$860'], ['Okra Café', 'Sent', '$2,315'],
  ['Harbor Print', 'Overdue 9 days', '$470'], ['Tidewell Co', 'Sent', '$3,080'], ['Marsh & Vale', 'Due Monday', '$1,955'],
];

function Hook({frame}: {frame: number}) {
  const t = THEME;
  // The camera pushes in on the list the whole scene, so even the rest between rows moves.
  const push = ramp(frame, [-20, 190], [0.94, 1.06], glide);
  return (
    <AbsoluteFill>
      {CAPTIONS.slice(0, 2).map(c => <Caption key={c.text} theme={t} {...c} frame={frame} x={96} y={96}/>)}
      <Push scale={push} max={1.06} origin={[(W - 192) / 2, 220]} style={{left: 96, top: 260}}>
        <Panel theme={t} w={W - 192} h={740}>
          {INVOICES.map(([who, when, amount], i) => {
            const at = ROWS_AT + i * 12;
            const p = ramp(frame, [at, at + 22], [0, 1], settle);
            const late = when.startsWith('Overdue');
            return (
              <div key={who} style={{display: 'flex', alignItems: 'center', height: 118, padding: '0 44px', borderBottom: `${t.shape.hairline}px solid ${t.color.hair}`,
                opacity: ramp(frame, [at, at + 8], [0, 1]), transform: `translateX(${((1 - p) * 60).toFixed(2)}px)`}}>
                <span style={{flex: 1, fontFamily: stack(t.font.text), fontSize: 34, color: t.color.ink}}>{who}</span>
                <span style={{width: 300, fontFamily: stack(t.font.text), fontSize: 26, color: late ? t.color.accent : t.color.muted}}>{when}</span>
                <span style={{width: 180, textAlign: 'right', fontFamily: stack(t.font.display), fontSize: 36, fontWeight: 500, color: t.color.ink, fontVariantNumeric: 'tabular-nums'}}>
                  {scramble(frame, at + 6, amount, 18, i)}
                </span>
              </div>
            );
          })}
        </Panel>
      </Push>
    </AbsoluteFill>
  );
}

/** The paid line, as a path drawn left to right over CHART. */
const POINTS = [0.1, 0.18, 0.15, 0.32, 0.3, 0.46, 0.52, 0.5, 0.68, 0.74, 0.9];
function Chart({frame, w, h}: {frame: number; w: number; h: number}) {
  const d = THEME.color.dark;
  const k = ramp(frame, CHART, [0, 1], resolveEase);
  const pts = POINTS.map((v, i) => [(i / (POINTS.length - 1)) * w, h - v * h] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const len = 2 * w;
  const [hx, hy] = pts[Math.min(pts.length - 1, Math.floor(k * (pts.length - 1)))];
  return (
    <svg width={w} height={h} style={{overflow: 'visible'}}>
      <path d={path} fill="none" stroke={d.accent} strokeWidth={6} strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={(len * (1 - k)).toFixed(1)}/>
      {k > 0 && k < 1 && <circle cx={hx} cy={hy} r={10} fill={d.accent}/>}
    </svg>
  );
}

function Proof({frame}: {frame: number}) {
  const t = THEME, d = t.color.dark;
  // The pointer comes in, presses Share and leaves; the button eases into the accent over the press.
  const p = pointerAt(frame, [{x: W + 40, y: 900, at: PRESS - 50}, {x: 1070, y: 880, at: PRESS - 8}, {x: 1070, y: 880, at: PRESS + 20}, {x: W + 60, y: 960, at: PRESS + 60}]);
  const press = pressAt(frame, PRESS);
  const on = ramp(frame, [PRESS, PRESS + 6], [0, 1], LINEAR);
  // The camera pushes from the whole card in toward the total as it lands.
  const push = ramp(frame, [180, 340], [1.0, 1.1], glide);
  return (
    <AbsoluteFill>
      <Caption theme={t} {...CAPTIONS[2]} frame={frame} x={96} y={96} color={d.ink}/>
      <Push scale={push} max={1.1} origin={[(W - 192) * 0.3, 260]} style={{left: 96, top: 230}}>
        <Panel theme={t} w={W - 192} h={760} dark>
          <div style={{padding: '44px 48px 0', fontFamily: stack(t.font.text), fontSize: 26, color: d.muted}}>Paid this month</div>
          <div style={{padding: '0 48px', fontFamily: stack(t.font.display), fontWeight: 500, fontSize: 184, color: d.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em'}}>
            {scramble(frame, COUNT_AT, '$18,420', 24)}
          </div>
          <div style={{padding: '18px 48px 0'}}><Chart frame={frame} w={W - 192 - 96} h={230}/></div>
          <div style={{margin: '34px 48px 0', height: 8, borderRadius: 4, background: d.hair}}>
            <div style={{height: 8, borderRadius: 4, background: d.accent, width: `${ramp(frame, FILL, [0, 82], resolveEase).toFixed(2)}%`}}/>
          </div>
          <div style={{position: 'absolute', left: 48, bottom: 44, fontFamily: stack(t.font.text), fontSize: 24, color: d.muted, fontVariantNumeric: 'tabular-nums'}}>
            {scramble(frame, FILL[0], '82', 20)}% of invoiced
          </div>
          <div style={{position: 'absolute', right: 48, bottom: 32, padding: '16px 32px', borderRadius: t.shape.radius.control, fontFamily: stack(t.font.text),
            fontSize: 26, fontWeight: 500, background: mix(d.well, d.accent, on), color: mix(d.ink, d.onAccent ?? t.color.onAccent, on),
            border: `${t.shape.hairline}px solid ${d.hair}`, transform: `scale(${1 - 0.03 * press})`}}>Share</div>
        </Panel>
      </Push>
      <Pointer theme={t} x={p.x} y={p.y} press={press} dark/>
    </AbsoluteFill>
  );
}

function End({frame}: {frame: number}) {
  const t = THEME;
  // The command types itself, a character every 3 frames, with a steady caret: you type a command, you don't click it.
  const cmd = '/make-motion';
  // Each character fades in over its 3 frames, so a calm end card never steps a whole glyph in one frame.
  const charOpacity = (i: number) => ramp(frame, [TYPE + i * 3, TYPE + i * 3 + 3], [0, 1], LINEAR);
  // Characters typed so far, the one fading in included; the caret follows them.
  const typed = Math.max(0, Math.min(cmd.length, Math.floor((whole(frame) - TYPE) / 3) + 1));
  const rise = ramp(frame, [END, END + 28], [60, 0], settle);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34}}>
      {/* The opening comes back changed: every invoice that piled up flips to Paid, one by one. */}
      <div style={{display: 'flex', gap: 14, marginBottom: 24}}>
        {INVOICES.map(([who], i) => {
          // One linear clock for the angle and the face: the face changes exactly at 90 degrees, edge on.
          const at = END + 8 + i * 14;
          const k = ramp(frame, [at, at + 14], [0, 1], LINEAR);
          const paid = ramp(whole(frame), [at, at + 14], [0, 1], LINEAR) >= 0.5;
          return (
            // A fixed width: a chip that changed width as it flipped would re-centre the whole row.
            <div key={who} style={{width: 168, textAlign: 'center', padding: '12px 0', borderRadius: t.shape.radius.control, fontFamily: stack(t.font.text), fontSize: 22,
              background: paid ? t.color.accent : t.color.well, color: paid ? t.color.onAccent : t.color.muted, border: `${t.shape.hairline}px solid ${t.color.hair}`,
              transform: `perspective(600px) rotateX(${paid ? (k - 1) * 180 : k * 180}deg)`, opacity: ramp(frame, [END - 4 + i * 3, END + 6 + i * 3], [0, 1])}}>
              {paid ? 'Paid' : who}
            </div>
          );
        })}
      </div>
      <div style={{fontFamily: stack(t.font.display), fontWeight: 500, fontSize: 168, color: t.color.ink, letterSpacing: '-0.035em',
        opacity: ramp(frame, [END, END + 12], [0, 1], LINEAR), transform: `translateY(${rise}px)`}}>Your product</div>
      <div style={{padding: '18px 32px', borderRadius: t.shape.radius.control, border: `${t.shape.hairline}px solid ${t.color.hair}`, background: t.color.well,
        color: t.color.ink, fontFamily: stack(t.font.mono), fontSize: 40, opacity: ramp(frame, [END + 6, END + 18], [0, 1]), whiteSpace: 'pre'}}>
        {/* The full command, hidden, holds the box's width; the typed part and its caret sit over it. */}
        <span style={{position: 'relative', display: 'inline-block'}}>
          <span style={{visibility: 'hidden'}}>{cmd}</span>
          <span style={{position: 'absolute', left: 0, top: 0}}>
            {[...cmd.slice(0, typed)].map((c, i) => <span key={i} style={{opacity: charOpacity(i)}}>{c}</span>)}
            <span style={{display: 'inline-block', width: 4, height: 40, marginLeft: 2, verticalAlign: -6, background: t.color.accent}}/>
          </span>
        </span>
      </div>
    </AbsoluteFill>
  );
}

const pointerMoving = (f: number) => (f > PRESS - 50 && f < PRESS - 8) || (f > PRESS + 20 && f < PRESS + 60);
const scenes: Scene[] = [
  {name: 'Hook', from: SCENES.hook[0], to: SCENES.hook[1], draw: f => <Hook frame={f}/>, whipIn: false},
  {name: 'Proof', from: SCENES.proof[0], to: SCENES.proof[1], dark: true, draw: f => <Proof frame={f}/>, blur: f => (pointerMoving(f) ? 6 : 1)},
  {name: 'End', from: SCENES.end[0], to: SCENES.end[1], draw: f => <End frame={f}/>, whipOut: false},
];

export const Example = () => {
  useThemeFonts(THEME);
  return (
    <AbsoluteFill style={{background: THEME.color.paper}}>
      <style>{'*{transition:none!important;animation:none!important}'}</style>
      <Scenes theme={THEME} scenes={scenes}/>
      <Soundtrack name="example" sfx={SFX}/>
    </AbsoluteFill>
  );
};

export const EXAMPLE = {id: 'example', component: Example, durationInFrames: FRAMES, fps: THEME.frame.fps, width: W, height: H};
