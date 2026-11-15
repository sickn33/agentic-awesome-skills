import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from './Icon'
import './Chip.css'

/**
 * A filter chip with a remove x. It arrives by opening its own width (the
 * chips after it slide over rather than jump) and leaves the same way.
 * Name the x with `remove` so the cursor can click it.
 */
export function Chip({ show = true, remove, gap = 0, children, className, style, ...rest }: { show?: boolean; remove?: string; /** The row's own gap, so a removed chip takes no space at all. */ gap?: number; children: ReactNode; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  // Measured, so the slot opens to exactly the chip's width wherever it sits (a flex row would shrink a CSS-only version)
  const chip = useRef<HTMLSpanElement>(null)
  const [w, setW] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (chip.current) setW(chip.current.offsetWidth)
  }, [children])
  return (
    <span {...rest} className={`ss-chip-slot${className ? ` ${className}` : ''}`} data-show={show || undefined} style={{ width: show ? (w ?? 'auto') : 0, marginRight: show ? 0 : -gap, ...style }}>
      <span ref={chip} className="ss-chip" data-removable={remove !== undefined || undefined}>
        <span className="ss-chip__label">{children}</span>
        {remove !== undefined && (
          <span className="ss-chip__x" data-target={remove || undefined}>
            <Icon name="close" size={10} stroke={1.8} />
          </span>
        )}
      </span>
    </span>
  )
}
