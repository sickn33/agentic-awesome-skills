import type { HTMLAttributes } from 'react'
import './Toggle.css'

/** A switch. The knob slides and the track takes the accent when on. */
export function Toggle({ on, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { on: boolean }) {
  return (
    <span {...rest} className={`ss-toggle${className ? ` ${className}` : ''}`} data-on={on || undefined} role="switch" aria-checked={on}>
      <span className="ss-toggle__knob" />
    </span>
  )
}
