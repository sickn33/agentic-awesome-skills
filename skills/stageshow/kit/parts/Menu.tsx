import type { CSSProperties, ReactNode } from 'react'
import './Menu.css'

/** A menu: rows for a Popover. `value` is the highlighted row (hover or keyboard); give a row `data-target` to click it. `targets` names each item for the cursor; an item highlights while the cursor is over it, as a real menu does. */
export function Menu({ items, value, targets, className, style, ...rest }: { items: ReactNode[]; value?: number; targets?: (string | undefined)[]; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  return (
    <div {...rest} className={`ss-menu${className ? ` ${className}` : ''}`} style={style} role="menu">
      {items.map((item, i) => (
        <div key={i} className="ss-menu__item" data-active={i === value || undefined} data-target={targets?.[i]} role="menuitem">
          {item}
        </div>
      ))}
    </div>
  )
}
