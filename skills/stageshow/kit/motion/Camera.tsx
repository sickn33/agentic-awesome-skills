import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../reduced-motion'
import type { Rect } from '../measure'
import { css, type Bezier, type EaseName } from '../ease'
import './Camera.css'

/**
 * Moves the view in on part of the scene and back out, pushing in on a
 * detail. Wrap the scene in it and set `focus` to a rect in
 * stage pixels, measured with `a.rect(name, { layout: true })` (the layout
 * rect, so the zoom itself never feeds back in); null shows everything. The
 * view never leaves the scene's edges. Keep the cursor still while the camera
 * moves, or put it where it is going only once it has settled. The view is
 * its own frame: zoomed in, its edges feather so the scene passes under a
 * soft edge instead of running hard into the stage's (`feather`, in px).
 * Everything inside moves with the zoom, and `a.rect()` of a target inside
 * reports where it is on screen now; give the cursor's rest point in stage
 * pixels, outside the Camera, or it lands somewhere else once zoomed.
 * `ease` takes a named curve from kit/ease.ts ('house' for a video-paced move).
 */
export function Camera({ focus, pad = 32, max = 2, duration = 1100, feather = 28, ease: curve = 'camera', children, className }: { focus: Rect | null; pad?: number; max?: number; duration?: number; feather?: number; ease?: EaseName | Bezier; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const reduced = useReducedMotion()
  // Followed, not read once: a Stage switching to its compact design (or any
  // resize) changes the frame the zoom is worked out in
  useLayoutEffect(() => {
    const p = ref.current?.parentElement?.parentElement
    if (!p) return
    const read = () => setSize((was) => (was.w === p.offsetWidth && was.h === p.offsetHeight ? was : { w: p.offsetWidth, h: p.offsetHeight }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(p)
    return () => ro.disconnect()
  }, [])
  let transform = 'none'
  if (focus && size.w) {
    const s = Math.max(1, Math.min(max, size.w / (focus.width + pad * 2), size.h / (focus.height + pad * 2)))
    const tx = Math.min(0, Math.max(size.w - size.w * s, size.w / 2 - (focus.x + focus.width / 2) * s))
    const ty = Math.min(0, Math.max(size.h - size.h * s, size.h / 2 - (focus.y + focus.height / 2) * s))
    transform = `translate(${tx}px, ${ty}px) scale(${s})`
  }
  const ease = `${reduced ? 0 : duration}ms ${css(curve)}`
  return (
    <div className="ss-camera-view" data-zoomed={transform === 'none' ? undefined : true} data-focus={transform === 'none' || !focus ? undefined : `${focus.x},${focus.y},${focus.width},${focus.height}`} data-feather={feather} style={{ ['--ss-feather' as string]: `${transform === 'none' ? 0 : feather}px`, transition: `--ss-feather ${ease}` }}>
      <div ref={ref} className={`ss-camera${className ? ` ${className}` : ''}`} style={{ transform, transition: `transform ${ease}` }}>
        {children}
      </div>
    </div>
  )
}
