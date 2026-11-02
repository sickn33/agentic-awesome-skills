import type { CSSProperties } from 'react'
import './Meter.css'

/**
 * A usage bar that fills to `value` (0 to 1) with an accent gradient. `tone`
 * recolors the fill (a password meter going danger, warning, success); the
 * color eases as the fill moves.
 */
export function Meter({ value, tone = 'accent', className, style, ...rest }: { value: number; tone?: 'accent' | 'danger' | 'warning' | 'success' | 'ink'; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  return (
    <span {...rest} className={`ss-meter${className ? ` ${className}` : ''}`} data-tone={tone} style={style}>
      {/* Revealed with clip-path rather than width, so nothing re-lays out and the end stays round */}
      <span className="ss-meter__fill" style={{ clipPath: `inset(0 ${(1 - Math.max(0, Math.min(1, value))) * 100}% 0 0 round 3px)` }} />
    </span>
  )
}
