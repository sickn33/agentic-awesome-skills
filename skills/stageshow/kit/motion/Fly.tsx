import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '../reduced-motion'
import type { Rect } from '../measure'
import { warn } from '../util'
import './Fly.css'

export interface FlyProps {
  /** Where it starts and where it lands, in stage pixels (from `rect()`): the source element's own rect and the landing element's own rect, never a slot or wrapper around them. */
  from: Rect
  to: Rect
  /** False waits at `from`, hidden; true shows it there and flies to `to`. Hide the source in the same set that turns it true. */
  go: boolean
  /** Shown while it waits at `from`: the thing being carried (under the cursor, before it flies), or a chip budding off a value, which grows out of it (it scales up from the source as it fades in) rather than popping in whole. Off by default, so it never doubles the element it leaves. */
  held?: boolean
  /** ms for the flight. Default 750. */
  duration?: number
  children: ReactNode
  className?: string
}

/**
 * Carries one element from one place to another along a soft arc: an avatar
 * into an assignee slot, a file into a folder. It lifts a little on the way
 * and is back to its final size before it lands, decelerating into place with
 * no bounce. It is hidden until `go` (unless `held`): hide the source in the
 * set that turns `go` on. Render the real element at `to` only once it has
 * landed, in the same set that hides this one (unmount it, or snap `go` back
 * to false, which hides it), so it reads as one object.
 *
 * The flyer is scaled from the `from` box to the `to` box, and its child is
 * stretched to fill `from`, so draw the child at the start size. A child of a
 * different shape, or a `to` taken from a slot rather than the element that
 * lands, changes size in flight and snaps on the handoff (film.mjs: `fly size`).
 */
export function Fly({ from: liveFrom, to: liveTo, go, held: shownAtRest = false, duration = 750, children, className }: FlyProps) {
  const reduced = useReducedMotion()
  // Both ends are fixed at take-off. Measured live, they move under the flight
  // (a closing menu scales the start away) and every change restarts the
  // transition: a creep near the end, then a jump when the real one appears.
  const held = useRef<{ from: Rect; to: Rect } | null>(null)
  if (!go) held.current = null
  else if (!held.current) held.current = { from: liveFrom, to: liveTo }
  const { from: start, to } = held.current ?? { from: liveFrom, to: liveTo }
  // An empty start (nothing measured yet) takes the landing size, so the
  // flyer never grows from a point
  const from = start.width ? start : { ...start, width: to.width || 1, height: to.height || 1 }
  const at = go ? to : from
  const ms = reduced ? 0 : duration
  const sx = at.width / (from.width || 1)
  // A child that doesn't fill the start box takes off or lands at the wrong size
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = body.current?.firstElementChild as HTMLElement | null
    if (!el || !start.width) return
    if (Math.abs(el.offsetWidth - from.width) > 1 || Math.abs(el.offsetHeight - from.height) > 1)
      warn(`Fly: the child is ${el.offsetWidth}×${el.offsetHeight} but takes off from ${Math.round(from.width)}×${Math.round(from.height)}. Draw it at the start size, and pass the landing element's own rect as \`to\`.`)
  }, [from.width, from.height, start.width])
  return (
    // Horizontal and vertical travel on slightly different curves make a gentle
    // arc. Far apart curves (a fast-out x) read as a skid sideways, then a drop.
    <div
      className={`ss-fly${className ? ` ${className}` : ''}`}
      data-go={go || undefined}
      data-held={shownAtRest || undefined}
      style={{
        visibility: go || shownAtRest ? undefined : 'hidden',
        left: from.x,
        top: from.y,
        width: from.width,
        height: from.height,
        transform: `translateX(${at.x - from.x}px)`,
        // Two tracks make the arc: x on a plain ease, y and scale on a softer
        // start and a long settle, so a thumbnail growing into a card reads as
        // one smooth swell, not a lurch
        transition: `transform ${ms}ms cubic-bezier(0.35, 0, 0.2, 1)`,
      }}
    >
      <div
        style={{
          transform: `translateY(${at.y - from.y}px) scale(${sx})`,
          transformOrigin: '0 0',
          transition: `transform ${ms}ms cubic-bezier(0.3, 0.6, 0.15, 1)`,
        }}
      >
        <div ref={body} className="ss-fly__lift" style={go ? { animationDuration: `${ms}ms` } : undefined}>
          {children}
        </div>
      </div>
    </div>
  )
}
