import type { CSSProperties, ReactNode } from 'react'
import type { Rect } from '../measure'
import './Tooltip.css'

/**
 * A small dark label naming the control under the cursor: centered on the
 * target's rect (from rect()), just below it or above it. It comes in fast
 * a few px (`gap`) from the target's side, as interface feedback does, and leaves
 * faster. Show it only while the cursor rests on the target; hide it on the
 * click. A tooltip names an icon; it never carries the story.
 */
export function Tooltip({ show, at, side = 'below', gap = 6, children, className, style, ...rest }: { show: boolean; at: Rect; side?: 'below' | 'above'; gap?: number; children: ReactNode; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  const x = at.x + at.width / 2
  const y = side === 'below' ? at.y + at.height + gap : at.y - gap
  return (
    <span {...rest} className={`ss-tooltip${className ? ` ${className}` : ''}`} data-show={(show && at.width > 0) || undefined} data-side={side} style={{ left: x, top: y, ...style }} role="tooltip">
      <span className="ss-tooltip__label">{children}</span>
    </span>
  )
}
