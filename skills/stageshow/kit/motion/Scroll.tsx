import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { thumb } from '../measure'
import './Scroll.css'

/**
 * A scrolling area with a scrollbar, driven by `a.scroll(name, to)`. The bar
 * is macOS's overlay bar: hidden at rest, shown while the content moves, fading
 * once it stops. `bar="always"` keeps it visible (Windows, or a still that
 * needs to say "this scrolls"). Rows cut at an edge soften once it has scrolled.
 */
export function Scroll({ name, bar = 'overlay', className, style, children, ...rest }: { name: string; bar?: 'overlay' | 'always' | 'none'; className?: string; style?: CSSProperties; children: ReactNode } & Record<`data-${string}`, unknown>) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (ref.current) thumb(ref.current)
  })
  return (
    <div {...rest} className={`ss-scroller${className ? ` ${className}` : ''}`} data-bar={bar} style={style}>
      <div ref={ref} className="ss-scroll" data-target={name}>
        {children}
      </div>
      {bar !== 'none' && <span className="ss-scroller__thumb" />}
    </div>
  )
}
