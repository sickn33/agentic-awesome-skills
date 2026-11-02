import type { HTMLAttributes } from 'react'
import { useLook } from '../looks'
import './Pin.css'

export interface PinProps extends HTMLAttributes<HTMLSpanElement> {
  /** The commenter's initial. */
  name?: string
  src?: string
  size?: number
  /** Which corner is the point, the one that touches what the comment is about. */
  corner?: 'bl' | 'br' | 'tl' | 'tr'
  /** accent: the pin the story is about. ink: the others. */
  tone?: 'accent' | 'ink'
  /** The pin whose thread is open: a ring in its own color. */
  selected?: boolean
}

/**
 * A comment pin: one rounded square with a single square corner, the way
 * design tools draw them, with the face clipped to the same shape. Never a
 * disc with a corner stuck on. Position it yourself; the square corner is the
 * point, so place that corner on the thing the comment is about.
 */
export function Pin({ name = '', src, size = 24, corner = 'bl', tone = 'accent', selected, className, style, ...rest }: PinProps) {
  const { fidelity } = useLook()
  const plain = fidelity === 'minimal'
  return (
    <span
      {...rest}
      className={`ss-pin${className ? ` ${className}` : ''}`}
      data-corner={corner}
      data-tone={tone}
      data-selected={selected || undefined}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...style }}
    >
      <span className="ss-pin__face">{src && !plain ? <img src={src} alt="" /> : plain ? null : name.trim()[0]?.toUpperCase()}</span>
    </span>
  )
}
