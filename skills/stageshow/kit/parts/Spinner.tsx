import type { CSSProperties } from 'react'
import './Spinner.css'

/** A pending indicator: a thin arc turning, in the current color. Holds still under reduced motion. Swap it for a `Check` when the thing finishes. */
export function Spinner({ size = 14, className, style, ...rest }: { size?: number; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  return (
    <svg {...rest} className={`ss-spinner${className ? ` ${className}` : ''}`} viewBox="0 0 16 16" width={size} height={size} style={style} aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
      <path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
