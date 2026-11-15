import type { HTMLAttributes } from 'react'
import './Check.css'

/**
 * A status circle. `pending` turns an arc inside the ring; `on` fills the
 * circle from its center and then draws the tick. Pending hands over to done
 * in one mark, never a spinner fading out over a fill fading in. The tick
 * fades out intact rather than undrawing.
 */
export function Check({ on, pending, size = 16, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { on: boolean; pending?: boolean; size?: number }) {
  return (
    <span {...rest} className={`ss-check${className ? ` ${className}` : ''}`} data-on={on || undefined} data-pending={(pending && !on) || undefined} style={{ width: size, height: size, ...rest.style }}>
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
        <circle className="ss-check__ring" cx="8" cy="8" r="7.25" />
        <circle className="ss-check__arc" cx="8" cy="8" r="7.25" pathLength={1} />
        <circle className="ss-check__fill" cx="8" cy="8" r="8" />
        <path className="ss-check__tick" d="M4.5 8.2 7 10.6l4.6-5" pathLength={1} />
      </svg>
    </span>
  )
}
