import type { HTMLAttributes, ReactNode } from 'react'
import './Badge.css'

/**
 * A small status pill. `dot` adds a status dot before the label; `icon` puts
 * a glyph there instead (a tick on Matched), beside the label rather than in
 * it, so the label's trimmed box still centers the words on their ink.
 */
export function Badge({ tone = 'neutral', dot, icon, children, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning'; dot?: boolean; icon?: ReactNode }) {
  return (
    <span {...rest} className={`ss-badge${className ? ` ${className}` : ''}`} data-tone={tone} data-lead={dot || icon ? '' : undefined}>
      {dot && <span className="ss-badge__dot" />}
      {icon}
      <span className="ss-badge__label">{children}</span>
    </span>
  )
}
