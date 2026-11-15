import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'
import type { Rect } from '../measure'
import { useReducedMotion } from '../reduced-motion'
import './Follow.css'

export interface FollowProps extends HTMLAttributes<HTMLDivElement> {
  /** The rect to sit on, in stage pixels. null hides it. */
  to: Rect | null
  /** Higher is snappier. 0.25 is a quick, settled follow. */
  stiffness?: number
  children?: ReactNode
}

/**
 * An overlay that springs onto a rect and keeps its momentum when the rect
 * changes: drop targets, selection rings, hover highlights. A CSS transition
 * restarts from rest on every change, so a target updated cell by cell on a
 * freeform drag stutters and shakes; this retargets smoothly instead.
 */
export function Follow({ to, stiffness = 0.25, className, style, children, ...rest }: FollowProps) {
  const reduced = useReducedMotion()
  const el = useRef<HTMLDivElement>(null)
  const cur = useRef<Rect | null>(null)
  const vel = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const target = useRef(to)
  target.current = to
  // The loop sleeps once it has settled; a new target wakes it
  const wake = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    let id = 0
    let running = false
    const k = stiffness
    const damp = 2 * Math.sqrt(k) * 0.95
    const frame = 1000 / 60
    const keys = ['x', 'y', 'width', 'height'] as const
    let previous = performance.now()
    let remainder = 0
    let simulation = cur.current ? { ...cur.current } : null
    let velocity = { ...vel.current }
    let priorTarget: Rect | null = null
    const integrate = (c: Rect, v: typeof velocity, t: Rect) => {
      for (const key of keys) {
        v[key] += (t[key] - c[key]) * k - v[key] * damp
        c[key] += v[key]
      }
    }
    const step = (time = performance.now()) => {
      const elapsed = Math.min(100, Math.max(0, time - previous))
      previous = time
      const t = target.current
      const node = el.current
      // Hidden: forget where it was, so it next appears on its target rather than sliding in from the last one
      if (!t || reduced) {
        cur.current = t ? { ...t } : null
        vel.current = { x: 0, y: 0, width: 0, height: 0 }
        simulation = cur.current ? { ...cur.current } : null
        velocity = { ...vel.current }
        remainder = 0
      }
      if (node && t) {
        if (!cur.current) cur.current = { ...t }
        if (!simulation || !priorTarget || keys.some(key => priorTarget![key] !== t[key])) {
          // Retarget from the last rendered position and velocity, including
          // a partial simulation step, so an interruption cannot rewind.
          simulation = { ...cur.current }
          velocity = { ...vel.current }
          remainder = 0
        }
        priorTarget = { ...t }
        const c = cur.current
        const v = vel.current
        // Preserve the existing 60Hz spring trajectory. Interpolate its next
        // step at higher refresh rates instead of integrating faster per RAF.
        remainder += elapsed
        while (remainder >= frame - 1e-6) {
          integrate(simulation, velocity, t)
          remainder = Math.max(0, remainder - frame)
        }
        const next = { ...simulation }, nextVelocity = { ...velocity }
        integrate(next, nextVelocity, t)
        const part = remainder / frame
        for (const key of keys) {
          c[key] = simulation[key] + (next[key] - simulation[key]) * part
          v[key] = velocity[key] + (nextVelocity[key] - velocity[key]) * part
          if (Math.abs(t[key] - c[key]) < 0.05 && Math.abs(v[key]) < 0.05) {
            c[key] = t[key]
            v[key] = 0
          }
        }
        node.style.transform = `translate(${c.x}px, ${c.y}px)`
        node.style.width = `${c.width}px`
        node.style.height = `${c.height}px`
      }
      const c = cur.current
      const v = vel.current
      const settled = !t || !node || (c !== null && v.x === 0 && v.y === 0 && v.width === 0 && v.height === 0 && c.x === t.x && c.y === t.y && c.width === t.width && c.height === t.height)
      running = !settled
      if (running) id = requestAnimationFrame(step)
    }
    wake.current = () => {
      if (reduced || !target.current || !cur.current) {
        // Initial placement and reappearance are layout, not spring motion.
        // A paused host must not need Step just to reveal the first target.
        cancelAnimationFrame(id)
        running = false
        step()
        return
      }
      if (running || keys.every(key => cur.current![key] === target.current![key] && vel.current[key] === 0)) return
      running = true
      previous = performance.now()
      id = requestAnimationFrame(step)
    }
    wake.current()
    return () => {
      running = false
      cancelAnimationFrame(id)
      wake.current = () => {}
    }
  }, [stiffness, reduced])
  useLayoutEffect(() => wake.current(), [to?.x, to?.y, to?.width, to?.height, !to])
  return (
    <div {...rest} ref={el} className={`ss-follow${className ? ` ${className}` : ''}`} data-show={to ? true : undefined} style={{ ...style, ...(reduced ? { transition: 'none' } : null) }}>
      {children}
    </div>
  )
}

/**
 * Which cell a value falls in, sticky at the borders: it only changes once
 * the value is `hysteresis` of a cell past the edge, so a drag along a border
 * doesn't flicker between two cells.
 */
export function cellOf(value: number, size: number, prev: number | null, hysteresis = 0.2) {
  const raw = Math.floor(value / size)
  if (prev === null || raw === prev) return raw
  const edge = raw > prev ? (prev + 1) * size : prev * size
  return Math.abs(value - edge) > size * hysteresis ? raw : prev
}
