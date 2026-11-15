import type { HTMLAttributes } from 'react'
import './Slot.css'

/**
 * A gap in a list that opens and closes, for moving a card between lists: the
 * source's slot closes behind the card as it's picked up, the destination's
 * opens (dashed) where it will land, and the card drops into it. `gap` is the
 * list's own gap, so a closed slot takes no space at all.
 */
export function Slot({ open, height, gap = 0, dashed, className, style, children, ...rest }: HTMLAttributes<HTMLDivElement> & { open: boolean; height: number; gap?: number; dashed?: boolean }) {
  return (
    <div
      {...rest}
      className={`ss-slot${className ? ` ${className}` : ''}`}
      data-open={open || undefined}
      data-dashed={dashed || undefined}
      style={{ height: open ? height : 0, marginTop: open ? 0 : -gap, ...style }}
    >
      <div className="ss-slot__clip">
        <div className="ss-slot__mark" style={{ height }} />
      </div>
      {children}
    </div>
  )
}
