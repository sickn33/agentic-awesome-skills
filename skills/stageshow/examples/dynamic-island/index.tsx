import { useId, useRef, type CSSProperties } from 'react'
import { Phone, LockScreen, Roll, Stage, Swap, type Act } from '../../kit'
import './island.css'

// A food delivery's Live Activity in the Dynamic Island, on the top of an
// iPhone rising from the foot of the stage. The island is the story; the
// lock screen behind it supplies the device context.
//
// Everything is in screen points on the kit's iPhone (402 × 874), round the
// screen's island: x 153.5 to 248.5, y 14.5, 95 × 37 (craft.md,
// Chrome and devices). The island is one black shape whose box (left, top,
// width, height, radius) springs between presentations: underdamped with a
// small overshoot when it grows, critically damped and quicker when it
// shrinks, a beat late so the content has cleared. Content is a separate
// layer above the shape at its final positions, so nothing in it stretches:
// each item blurs, shrinks and fades out first, and the new items sharpen in
// once the shape is most of the way there. A second activity (a timer) buds
// off as a circle through a soft neck: a goo filter on the black shapes only.
//
// Real strings: the minutes, "Preparing" then "Picked up", "Sam is your courier",
// the order number. Everything else is a shape.

/** A damped spring as a CSS linear() easing */
function spring(zeta: number, omega: number, ms: number, n = 48) {
  const wd = omega * Math.sqrt(1 - zeta * zeta)
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (ms / 1000)
    const x = i === n ? 1 : 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
    pts.push(x.toFixed(4))
  }
  return `linear(${pts.join(', ')})`
}

// Grow: about 4% overshoot, settled by 0.5s. Shrink: no overshoot, 0.38s.
const GROW = { ease: spring(0.7, 15, 500), ms: 500 }
const SHRINK = { ease: spring(0.98, 19, 380), ms: 380 }

type Mode = 'idle' | 'compact' | 'open' | 'split'
type Box = { l: number; t: number; w: number; h: number; r: number }

const CX = 201
const BASE: Box = { l: 153.5, t: 14.5, w: 95, h: 37, r: 18.5 }
const GEO: Record<Mode, Box> = {
  idle: BASE,
  // Wide enough that the trailing minutes clear the camera (at 248.5)
  compact: { l: CX - 103, t: 14.5, w: 206, h: 37, r: 18.5 },
  // Minimal, with a second activity: the island grows on its leading side only
  split: { l: 153.5 - 44, t: 14.5, w: 95 + 44, h: 37, r: 18.5 },
  // Expanded: inset 13 from the screen's sides and 10 from its top, so its
  // corners run concentric with the display's (64 - 12 = 52)
  open: { l: 13, t: 10, w: 376, h: 172, r: 52 },
}
const SIZE: Record<Mode, number> = { idle: 0, split: 1, compact: 2, open: 3 }
// The detached circle, 8pt clear of the island's trailing end
const BUD = { l: 248.5 + 8, t: 14.5, d: 37 }

type S = { mode: Mode; eta: number; prog: number; label: string; press: boolean; timer: number }
const START: S = { mode: 'compact', eta: 8, prog: 0.22, label: 'Preparing', press: false, timer: 0 }
const POSTER: S = { ...START, mode: 'open', eta: 7, prog: 0.4 }

// A takeaway bag, solid (small glyphs are filled), with its handle cut out
const BAG =
  'M8.2 7.2V6.6a3.8 3.8 0 0 1 7.6 0v.6h2.1c.8 0 1.4.6 1.5 1.4l.9 10.2a2 2 0 0 1-2 2.2H5.7a2 2 0 0 1-2-2.2l.9-10.2c.1-.8.7-1.4 1.5-1.4Zm1.8 0h4V6.6a2 2 0 0 0-4 0Z'

function Bag({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d={BAG} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

const boxStyle = (b: Box, grow: boolean): CSSProperties => ({
  left: b.l,
  top: b.t,
  width: b.w,
  height: b.h,
  borderRadius: b.r,
  transitionDuration: `${grow ? GROW.ms : SHRINK.ms}ms`,
  transitionTimingFunction: grow ? GROW.ease : SHRINK.ease,
  // Shrinking waits for the content to clear, so nothing paints past the edge
  transitionDelay: grow ? '0ms' : '120ms',
})

function Island({ s }: { s: S }) {
  const gooId = useId()
  // Spring by direction: overshoot only when growing (an overshoot while
  // shrinking would dip the shape inside the bezel's own island)
  const last = useRef<{ mode: Mode; grow: boolean }>({ mode: s.mode, grow: true })
  if (last.current.mode !== s.mode) last.current = { mode: s.mode, grow: SIZE[s.mode] > SIZE[last.current.mode] }
  const grow = last.current.grow
  // In the plain pill, tuck the dormant circle inside its trailing cap.
  // Its compact position would protrude beyond the narrower idle shape.
  const budLeft = s.mode === 'split' ? BUD.l : s.mode === 'idle' ? BASE.l + BASE.w - BUD.d : BUD.l - 30
  const min = (n: number) => `${n} min`
  return (
    <div className="di-island" data-mode={s.mode} data-press={s.press || undefined}>
      <svg width="0" height="0" className="di-island__defs" aria-hidden>
        <filter id={gooId} x="-20%" y="-50%" width="140%" height="200%">
          {/* The neck reaches only between nearby shapes. A wider blur keeps
              pulling their facing edges even across the settled 8pt gap. */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 9 -4" />
        </filter>
      </svg>
      <div className="di-island__shapes" style={{ filter: `url(#${gooId})` }}>
        <span className="di-island__shape" style={boxStyle(GEO[s.mode], grow)} />
        <span
          className="di-island__bud"
          data-on={s.mode === 'split' || undefined}
          style={{ left: budLeft, top: BUD.t, width: BUD.d, height: BUD.d, transitionTimingFunction: s.mode === 'split' ? GROW.ease : SHRINK.ease, transitionDelay: s.mode === 'split' ? '90ms' : '0ms' }}
        />
      </div>

      {/* Compact: the bag leading, the minutes trailing */}
      <span className="di-item di-lead" data-on={s.mode === 'compact' || undefined} style={{ left: GEO.compact.l + 11, top: 14.5 + 7.5 }}>
        <Bag size={22} />
      </span>
      {/* Minimal: only the bag, on the leading side */}
      <span className="di-item di-lead" data-on={s.mode === 'split' || undefined} style={{ left: GEO.split.l + 11, top: 14.5 + 7.5 }}>
        <Bag size={22} />
      </span>
      <span className="di-item di-trail" data-on={s.mode === 'compact' || undefined} style={{ right: 402 - (GEO.compact.l + GEO.compact.w) + 14, top: 14.5 }}>
        <Roll>{min(s.eta)}</Roll>
      </span>

      {/* The timer's circle and its ring */}
      <span className="di-item di-timer" data-on={s.mode === 'split' || undefined} style={{ left: BUD.l + 6.5, top: BUD.t + 6.5 }}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
          <circle cx="12" cy="12" r="9.5" fill="none" stroke="#4a2f0a" strokeWidth="3" />
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            className="di-timer__arc"
            data-run={s.timer > 0 || undefined}
            style={{ strokeDashoffset: 1 - s.timer }}
          />
        </svg>
      </span>

      {/* Expanded: the whole body as one group, in once the shape is mostly there */}
      <div className="di-item di-body" data-on={s.mode === 'open' || undefined} style={{ left: GEO.open.l, top: GEO.open.t, width: GEO.open.w, height: GEO.open.h }}>
        <div className="di-body__top">
          <span className="di-body__words">
            <Swap id={s.label} className="di-body__label">
              {s.label}
            </Swap>
            <span className="di-body__eta">
              <Roll>{min(s.eta)}</Roll>
            </span>
          </span>
          <span className="di-body__badge">
            <Bag size={28} />
          </span>
        </div>
        <span className="di-track" style={{ ['--p' as string]: s.prog }}>
          <span className="di-track__fill" />
          <span className="di-track__rider">
            <Bag size={14} />
          </span>
          <span className="di-track__end" />
        </span>
        <span className="di-body__foot">
          <span>Sam is your courier</span>
          <span className="di-body__order">#2041</span>
        </span>
      </div>
    </div>
  )
}

/**
 * The loop, about 16s, one thing at a time:
 *   1.6s   the minutes roll down in the compact island
 *   3.0s   a finger presses and holds on the island; it squeezes in a touch
 *   3.9s   it springs open into the Live Activity; the body sharpens in
 *   5.6s   the order is picked up: the label changes, the minutes roll and the bag rides up the track
 *   8.0s   it folds back to compact
 *   9.4s   a timer starts: the island goes minimal and the timer buds off
 *          as a circle through a soft neck; its ring fills
 *  13.6s   the timer ends: the circle is drawn back in, compact again
 *  15.0s   the order arrives: the island draws in to its plain pill, and
 *          the next order's activity grows out of it, so the loop meets itself
 */
const script = async (a: Act<S>) => {
  await a.wait(1600)
  a.put({ eta: 7 })
  await a.wait(1400)
  a.mark('press')
  const r = a.rect('island')
  const point = r ? { x: r.x + r.width * 0.5, y: r.y + r.height * 0.55 } : 'island'
  await a.move(point, { duration: 420 })
  a.put({ press: true })
  // A long press: the finger holds where it landed
  await a.drag(point, undefined, { duration: 420 })
  a.put({ press: false, mode: 'open' })
  a.mark('open')
  // The finger lifts; a touch cursor shows only where it taps, so it goes
  // back to where it started unseen, and the loop meets itself
  void a.move(a.layout === 'compact' ? { x: 268, y: 400 } : { x: 470, y: 460 }, { duration: 300 })
  await a.wait(1700)
  a.put({ label: 'Picked up', eta: 6, prog: 0.58 })
  await a.wait(2400)
  a.mark('fold')
  a.put({ mode: 'compact' })
  await a.wait(1400)
  a.mark('timer')
  a.put({ mode: 'split' })
  await a.wait(500)
  a.put({ timer: 1 })
  await a.wait(3700)
  a.mark('merge')
  a.put({ mode: 'compact' })
  await a.wait(1400)
  a.mark('end')
  a.put({ mode: 'idle' })
  await a.wait(600)
  a.snap({ ...START, mode: 'idle' })
  await a.wait(200)
  a.put({ mode: 'compact' })
  await a.wait(900)
}

export default function DynamicIsland() {
  return (
    <Stage<S>
      width={640}
      height={400}
      compact={{ below: 560, width: 358, height: 340 }}
      initial={START}
      poster={POSTER}
      script={script}
      cursor={{ at: { wide: { x: 470, y: 460 }, compact: { x: 268, y: 400 } }, style: 'touch' }}
      className="di"
    >
      {(s, _rect, layout) => {
        const compact = layout === 'compact'
        const pw = compact ? 326 : 470
        const w = compact ? 358 : 640
        return (
          <div className="di-device" style={{ left: Math.round((w - pw) / 2), top: compact ? 16 : 40 }}>
            <Phone width={pw} frame="pro" island={false} time="" dark wallpaper="var(--di-wall)">
              <LockScreen className="di-lock" data-obscured={s.mode === 'open' || undefined} date="Sunday, October 25" time="9:41" controls={false} />
              <span className="di-hit" data-target="island" style={{ left: BASE.l, top: BASE.t, width: BASE.w, height: BASE.h }} />
              <Island s={s} />
            </Phone>
          </div>
        )
      }}
    </Stage>
  )
}
