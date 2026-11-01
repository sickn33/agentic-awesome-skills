import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useReducedMotion } from '../reduced-motion'
import type { Rect } from '../measure'
import './Expand.css'

/**
 * A card that opens into a full screen: one element, never a swap. Closed, it
 * is clipped to `from` (the card's rect from a.rect, in stage pixels; it is
 * converted for you, also inside a Phone, whose screen is scaled again) with
 * its corners; open, the clip releases to the whole parent.
 *
 * Without `face`, as iOS opens an App Store card: lay the children out as the
 * open screen, top-aligned so the card's header is the screen's header; the
 * content rides with the card and settles at the top.
 *
 * With `face`, as iOS opens an app out of a notification or an icon: `face` is
 * the closed thing's own look (render the notification again). The whole app,
 * laid out full size, is scaled down onto it and zooms up to fill the screen,
 * its top showing first; the face blows up with it and fades, so the app grows
 * out of the banner. Give the app's background as `--ss-expand-bg`.
 * `radius` is the card's corner. `duration` defaults to 520ms for a card and
 * 640ms for a launch.
 */
export function Expand({ open, from, radius = 16, duration, face, children, className, style, ...rest }: HTMLAttributes<HTMLDivElement> & { open: boolean; from: Rect; radius?: number; duration?: number; face?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  // Where the parent sits on the stage, and how much it is scaled on screen
  // (the stage's scale, times a phone screen's own)
  const [box, setBox] = useState({ w: 0, h: 0, x: 0, y: 0, k: 1, r: 0 })
  useLayoutEffect(() => {
    const p = ref.current?.parentElement
    const stage = p?.closest<HTMLElement>('.ss-stage')
    if (!p || !stage) return
    const sr = stage.getBoundingClientRect()
    const pr = p.getBoundingClientRect()
    const s = sr.width / stage.offsetWidth || 1
    const k = pr.width / p.offsetWidth || 1
    // Inside a Phone, open is the display's own corner, not square: the app
    // keeps its rounded corners all the way in and lands under the bezel's
    const r = parseFloat(getComputedStyle(p).getPropertyValue('--ss-screen-r')) || 0
    setBox({ w: p.clientWidth, h: p.clientHeight, x: (pr.left - sr.left) / s + (p.clientLeft * k) / s, y: (pr.top - sr.top) / s + (p.clientTop * k) / s, k: k / s, r })
  }, [from.x, from.y, from.width, from.height])
  const reduced = useReducedMotion()
  // Only opening and closing animate. A new `from` while the state holds (the
  // first measure, a re-measure) is applied at once: animating it would sweep
  // the clip in from wherever the unmeasured rect put it, the stage's top left.
  // A card not measured yet (no size) isn't shown at all
  const key = `${open}|${from.x}|${from.y}|${from.width}|${from.height}|${box.w}|${box.h}|${box.x}|${box.y}`
  const last = useRef({ open, key })
  // Open, the target doesn't depend on `from`, so a re-measure mid-open (the
  // tapped notification easing back from its press) must not cut it short
  const moving = last.current.key === key || last.current.open !== open || open
  useLayoutEffect(() => {
    last.current = { open, key }
  })
  const unmeasured = !open && (!from.width || !from.height || !box.w)
  // `from` in the parent's own pixels
  const x = (from.x - box.x) / box.k
  const y = (from.y - box.y) / box.k
  const w = from.width / box.k
  const h = from.height / box.k
  const r = Math.max(0, box.w - x - w)
  const b = Math.max(0, box.h - y - h)
  // A card: a quick start that settles long, like a UIKit spring with no
  // overshoot. A launch is gentler and longer: with the card's curve the app
  // is nearly full screen within a tenth of a second, which reads as a jump
  const curve = face ? 'cubic-bezier(0.25, 0.6, 0.2, 1)' : 'cubic-bezier(0.3, 0.75, 0.1, 1)'
  const ms = reduced ? 0 : (duration ?? (face ? 640 : 520))
  const ease = `${ms}ms ${curve}`
  if (face) {
    // The app at full size, scaled by the card's width onto the card, its
    // height clipped to the card's (in the window's own pixels)
    const s = box.w ? w / box.w : 1
    const clipH = Math.max(0, box.h - h / s)
    const shut = { transform: `translate(${x}px, ${y}px) scale(${s})`, clipPath: `inset(0px 0px ${clipH}px 0px round ${radius / s}px)` }
    const wide = { transform: 'translate(0px, 0px) scale(1)', clipPath: `inset(0px 0px 0px 0px round ${box.r}px)` }
    return (
      <div
        {...rest}
        ref={ref}
        className={`ss-expand${className ? ` ${className}` : ''}`}
        data-open={open || undefined}
        data-launch=""
        style={{ ...(open ? wide : shut), ['--ss-expand-ms' as string]: `${ms}ms`, ['--ss-expand-ease' as string]: curve, ...(moving ? null : { transition: 'none' }), ...(unmeasured ? { visibility: 'hidden' } : null), ...style }}
      >
        <div className="ss-expand__content">{children}</div>
        <div className="ss-expand__face" style={{ width: w, height: h, transform: `scale(${1 / s})` }}>
          {face}
        </div>
      </div>
    )
  }
  const clip = open ? `inset(0px 0px 0px 0px round ${box.r}px)` : `inset(${y}px ${r}px ${b}px ${x}px round ${radius}px)`
  // Retain the same composited content layer at both ends, so the text does
  // not re-rasterise when the card finishes opening or closing.
  const ride = { transform: `translate3d(0, ${open ? 0 : y}px, 0)`, transition: moving ? `transform ${ease}` : 'none' }
  return (
    <div
      {...rest}
      ref={ref}
      className={`ss-expand${className ? ` ${className}` : ''}`}
      data-open={open || undefined}
      style={{ clipPath: clip, transition: moving ? `clip-path ${ease}` : 'none', visibility: unmeasured ? 'hidden' : undefined, ...style }}
    >
      <div className="ss-expand__content" style={ride}>
        {children}
      </div>
    </div>
  )
}
