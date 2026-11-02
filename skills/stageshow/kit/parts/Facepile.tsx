import type { CSSProperties } from 'react'
import { Avatar, type AvatarProps } from './Avatar'
import './Facepile.css'

/**
 * Overlapping avatars, each one cut out where the next sits on it: a real
 * gap, so whatever is behind shows through (a toolbar, a row that turns
 * active), never a ring painted in a color that only matches one background.
 * Each face takes a muted color of its own (`tone="person"`), so three gray
 * discs with sliced letters never read as one blob.
 */
export function Facepile({ names, size = 22, overlap = 6, gap = 2, tones, className, style, ...rest }: { names: string[]; size?: number; overlap?: number; gap?: number; tones?: AvatarProps['tone'][]; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  const r = size / 2
  // Center of the next avatar, measured from this one's left edge
  const next = size - overlap + r
  const mask = `radial-gradient(circle at ${next}px 50%, transparent ${r + gap}px, #000 ${r + gap + 0.5}px)`
  return (
    <span {...rest} className={`ss-facepile${className ? ` ${className}` : ''}`} style={{ ['--ss-overlap' as string]: `${-overlap}px`, ...style }}>
      {names.map((n, i) => (
        <span key={i} className="ss-facepile__face" style={i < names.length - 1 ? { WebkitMaskImage: mask, maskImage: mask } : undefined}>
          <Avatar name={n} size={size} tone={tones?.[i] ?? 'person'} />
        </span>
      ))}
    </span>
  )
}
