import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from '../reduced-motion'
import './States.css'

/**
 * The states of one control stacked in one place and crossfaded: a button's
 * "Deploy", spinner and "Deployed"; a status's "Building" and "Ready". The
 * outgoing state is gone before the incoming one arrives, so they never
 * overlap, and the box holds the largest state, so nothing around it shifts.
 * Each state keeps the line box a plain label would have in that spot, so a
 * `Roll` or `Count` inside a state shows whole; give a small line under a
 * name its own line-height, as a subtitle would.
 *
 * Not for a label centered with an icon in a box that keeps its width (a
 * button's "Sending" then "Sent"): the held box leaves the shorter word off
 * center. Use `Swap` there, so the group re-centers as the label changes.
 */
export function States<K extends string>({ value, states, align = 'center', className, style, ...rest }: { value: K; states: Record<K, ReactNode>; /** Where a smaller state sits in the box: start for text in a row, center for a button's label, end for a right-aligned value. */ align?: 'start' | 'center' | 'end'; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  const reduced = useReducedMotion()
  return (
    <span {...rest} className={`ss-states${className ? ` ${className}` : ''}`} data-align={align} data-reduced={reduced || undefined} style={style}>
      {(Object.keys(states) as K[]).map((k) => (
        <span key={k} className="ss-states__item" data-on={k === value || undefined} aria-hidden={k !== value || undefined}>
          {states[k]}
        </span>
      ))}
    </span>
  )
}
