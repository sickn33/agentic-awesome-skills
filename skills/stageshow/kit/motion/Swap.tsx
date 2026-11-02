import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from '../reduced-motion'
import './Swap.css'

/**
 * Text (or anything) replaced in place: the old fades out, the new fades in,
 * and the box eases between their sizes so the lines around it move with it,
 * never snap. Key it on what changed: `<Swap id={step}>{text}</Swap>`.
 */
export function Swap({ id, children, duration = 450, className, style, ...rest }: { id: string | number; children: ReactNode; duration?: number; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  const reduced = useReducedMotion()
  const box = useRef<HTMLSpanElement>(null)
  const inner = useRef<HTMLSpanElement>(null)
  const [prev, setPrev] = useState<{ id: string | number; node: ReactNode; w?: number } | null>(null)
  // The id on screen, kept in state so a render React runs twice (Strict
  // Mode) still hands the old content to the fading copy
  const [shownId, setShownId] = useState(id)
  const last = useRef<ReactNode>(children)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  // True while a swap's size transition runs: measuring then would cancel it
  const swapping = useRef(false)
  swapping.current = !reduced && prev !== null
  if (shownId !== id) {
    // The old words keep the width they had, so they never rewrap as the box
    // narrows under them
    setPrev(reduced ? null : { id: shownId, node: last.current, w: size?.w })
    setShownId(id)
  }
  // The content last committed: written after commit, never during a render
  // React may repeat, so the fading copy always holds the old words
  useLayoutEffect(() => {
    last.current = children
  })
  // Measured on every change of id, and kept current after: a font or the
  // demo's own CSS arriving late changes the size without a swap
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    // Measured with the box at its natural size for one synchronous read: the
    // box still holds the old size, and longer text measured inside it would
    // be squeezed to the old width. Restored before the browser paints. The
    // observer skips while a swap runs: switching the transition off for the
    // read would cancel the height animation and snap the box to its end.
    const measure = (observed?: boolean) => {
      const b = box.current
      if (!b || (observed && swapping.current)) return
      const { width, height, transition } = b.style
      const own = { width: el.style.width, maxWidth: el.style.maxWidth }
      b.style.transition = 'none'
      b.style.width = ''
      b.style.height = ''
      el.style.width = ''
      el.style.maxWidth = ''
      // The exact used size, not offsetWidth: that rounds down, and a label
      // a fraction of a pixel wider than its box wraps onto two lines.
      // Computed style also ignores the stage's own scale
      const cs = getComputedStyle(el)
      const w = parseFloat(cs.width) || 0
      const h = parseFloat(cs.height) || 0
      el.style.width = own.width
      el.style.maxWidth = own.maxWidth
      b.style.width = width
      b.style.height = height
      void b.offsetWidth
      b.style.transition = transition
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(() => measure(true))
    ro.observe(el)
    return () => ro.disconnect()
  }, [id, reduced])
  useEffect(() => {
    if (!prev) return
    if (reduced) {
      setPrev(null)
      return
    }
    const t = setTimeout(() => setPrev(null), duration)
    return () => clearTimeout(t)
  }, [prev, duration, reduced])
  // Narrowing, the box waits while the old words fade, so they are never cut
  // by its edge mid-word; widening, it opens at once for the new ones
  const shrink = !!(prev && size && prev.w !== undefined && size.w < prev.w)
  // The soft edge is for words passing a moving edge: an image swapped for
  // one the same size keeps its own edges
  const resizing = !!(prev && size && prev.w !== undefined && size.w !== prev.w)
  return (
    <span {...rest} ref={box} className={`ss-swap${className ? ` ${className}` : ''}`} data-swapping={(!reduced && resizing) || undefined} style={{ width: size?.w, height: size?.h, transition: !reduced && prev ? `width ${duration}ms cubic-bezier(0.25, 0.8, 0.25, 1) ${shrink ? Math.round(duration * 0.5) : 0}ms, height ${duration}ms cubic-bezier(0.25, 0.8, 0.25, 1)` : 'none', ...style }}>
      {!reduced && prev && (
        <span key={`p${prev.id}`} className="ss-swap__out" style={{ animationDuration: `${duration * 0.5}ms`, width: prev.w, maxWidth: prev.w === undefined ? undefined : 'none' }}>
          {prev.node}
        </span>
      )}
      {/* While the box eases, the new words are already at their final width:
          capped by the old box they would wrap until it caught up. The box
          clips them sideways meanwhile */}
      <span key={`c${id}`} ref={inner} className="ss-swap__in" style={{ animationName: reduced ? 'none' : undefined, animationDuration: `${duration}ms`, ...(!reduced && prev && size ? { width: size.w, maxWidth: 'none' } : null) }}>
        {children}
      </span>
    </span>
  )
}
