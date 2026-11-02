import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './Tabs.css'

/**
 * A row of tabs with an underline that slides to the active one, measured,
 * so tabs can be any width. `targets` names each tab for the cursor.
 */
export function Tabs({ items, value, targets, className, style, ...rest }: { items: ReactNode[]; value: number; targets?: (string | undefined)[]; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  const row = useRef<HTMLDivElement>(null)
  const [bar, setBar] = useState({ x: 0, w: 0 })
  useLayoutEffect(() => {
    const el = row.current?.children[value + 1] as HTMLElement | undefined
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth })
  }, [value, items.length])
  return (
    <div {...rest} ref={row} className={`ss-tabs${className ? ` ${className}` : ''}`} style={style}>
      {/* A 1px line scaled to the tab's width: it slides on transform alone */}
      <span className="ss-tabs__bar" style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})` }} />
      {items.map((t, i) => (
        <span key={i} className="ss-tabs__tab" data-on={i === value || undefined} data-target={targets?.[i]}>
          {t}
        </span>
      ))}
    </div>
  )
}
