import { useId, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { useReducedMotion } from './reduced-motion'
import './chart.css'

// Charts drawn the way product dashboards draw them: a smooth line with a
// soft area and an end dot, or rounded bars. They draw in when shown and
// ease between values when the data changes.

export interface ChartProps {
  data: number[]
  kind?: 'line' | 'bars'
  width: number
  height: number
  /** Draws in when it turns true. */
  show?: boolean
  /** The soft fill under a line. */
  area?: boolean
  /** A dot on the last point. */
  dot?: boolean
  /** The value at the top of the chart. Defaults to the data's maximum. */
  max?: number
  className?: string
  style?: CSSProperties
}

/**
 * Where a Chart with these props draws each point, in its own pixels: a
 * line's points (the end dot sits on the last), or the top center of each
 * bar. For a tooltip, a marker or a hairline on a point, so nothing repeats
 * the chart's maths. Add the chart's offset in its container.
 */
export function chartPoints({ data, kind = 'line', width, height, dot = true, max }: Pick<ChartProps, 'data' | 'kind' | 'width' | 'height' | 'dot' | 'max'>) {
  const top = max ?? Math.max(...data, 1)
  const pad = kind === 'line' && dot ? 4 : 1
  const h = height - pad * 2
  if (kind === 'bars') {
    const gap = Math.max(2, Math.round(width / data.length / 4))
    const bw = (width - gap * (data.length - 1)) / data.length
    return data.map((v, i) => ({ x: i * (bw + gap) + bw / 2, y: height - Math.max(2, (v / top) * h) }))
  }
  return data.map((v, i) => ({ x: pad + (i / Math.max(1, data.length - 1)) * (width - pad * 2), y: pad + h - (v / top) * h }))
}

/** A smooth path through the points (Catmull-Rom as cubic Béziers), never overshooting the ends. */
function smooth(p: { x: number; y: number }[]) {
  if (!p.length) return ''
  let d = `M${p[0].x} ${p[0].y}`
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i]
    const b = p[i]
    const c = p[i + 1]
    const e = p[i + 2] ?? c
    d += `C${b.x + (c.x - a.x) / 6} ${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6} ${c.y - (e.y - b.y) / 6} ${c.x} ${c.y}`
  }
  return d
}

/**
 * The same curve as smooth(), sampled at a fixed number of points. A path
 * only eases into another with the same commands, so a line drawn from 8
 * points and one from 9 would swap in a frame while the dot traveled.
 * Sampling keeps every line the same shape of path, whatever the data's length.
 */
const SAMPLES = 48

/** The draw-in's timing: the same curve the rest of the kit's travel uses. */
const DRAW_MS = 1200
function ease(t: number) {
  // cubic-bezier(0.45, 0, 0.2, 1), solved for x by bisection
  const b = (a: number, c: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * c * u * u * (1 - u) + u ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2
    if (b(0.45, 0.2, m) < t) lo = m
    else hi = m
  }
  return b(0, 1, (lo + hi) / 2)
}

/** The curve's height at x, from its sampled points. */
function yAt(p: { x: number; y: number }[], x: number) {
  let i = 1
  while (i < p.length - 1 && p[i].x < x) i++
  const a = p[i - 1]
  const c = p[i]
  const t = c.x === a.x ? 0 : Math.max(0, Math.min(1, (x - a.x) / (c.x - a.x)))
  return a.y + (c.y - a.y) * t
}

function resample(p: { x: number; y: number }[]) {
  if (p.length < 2) return p
  const out: { x: number; y: number }[] = []
  for (let s = 0; s <= SAMPLES; s++) {
    const u = (s / SAMPLES) * (p.length - 1)
    const i = Math.min(Math.floor(u), p.length - 2)
    const t = u - i
    const a = p[i - 1] ?? p[i]
    const b = p[i]
    const c = p[i + 1]
    const e = p[i + 2] ?? c
    // The Bézier segment smooth() draws between b and c
    const c1 = { x: b.x + (c.x - a.x) / 6, y: b.y + (c.y - a.y) / 6 }
    const c2 = { x: c.x - (e.x - b.x) / 6, y: c.y - (e.y - b.y) / 6 }
    const m = 1 - t
    const k = (p0: number, p1: number, p2: number, p3: number) => m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3
    out.push({ x: k(b.x, c1.x, c2.x, c.x), y: k(b.y, c1.y, c2.y, c.y) })
  }
  return out
}

/**
 * A line or bar chart in a fixed box. A sparkline is a small line with no
 * area or dot. Values change by easing the shape (the line morphs, bars grow),
 * never by redrawing.
 */
export function Chart({ data, kind = 'line', width, height, show = true, area = true, dot = true, max, className, style }: ChartProps) {
  const reduced = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const drawRef = useRef<SVGGElement>(null)
  const wipeRef = useRef<SVGRectElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const samples = useRef<{ x: number; y: number }[]>([])
  const shown = useRef(false)
  // Draw-in: the dot leads and the line follows it. One timeline moves the
  // wipe's edge and puts the dot on the curve at that edge, every frame.
  useLayoutEffect(() => {
    const was = shown.current
    const g = drawRef.current
    shown.current = show && data.length > 1 && !!g
    if (!show || was || !g) return
    const c = dotRef.current
    const p = samples.current
    if (reduced || p.length < 2) return
    const x0 = p[0].x
    const x1 = p[p.length - 1].x
    const wipe = wipeRef.current
    if (!wipe) return
    // The clip is a rect in the chart's own units, so its edge is exactly the dot's x
    const at = (e: number) => {
      const x = x0 + (x1 - x0) * e
      wipe.setAttribute('width', `${x + 6}`)
      if (c) {
        c.style.setProperty('cx', `${x}px`)
        c.style.setProperty('cy', `${yAt(p, x)}px`)
      }
    }
    g.style.transition = 'opacity 0.15s ease'
    if (c) {
      c.style.transition = 'opacity 0.2s ease, transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)'
      c.style.opacity = '1'
      c.style.transform = 'none'
    }
    at(0)
    const t0 = performance.now()
    let drawing = true
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - t0) / DRAW_MS)
      at(ease(t))
      if (t < 1) raf = requestAnimationFrame(step)
      else done()
    })
    // Back to the stylesheet: the end state matches it, so nothing moves
    const done = () => {
      drawing = false
      wipe.setAttribute('width', `${width + 12}`)
      g.style.removeProperty('transition')
      if (c) for (const k of ['cx', 'cy', 'transition', 'opacity', 'transform']) c.style.removeProperty(k)
    }
    return () => {
      cancelAnimationFrame(raf)
      // An interrupted setup (including StrictMode's rehearsal) can draw
      // again. A completed draw does not replay when motion is restored.
      if (drawing) shown.current = false
      done()
    }
  }, [show, reduced, kind, width, data.length > 1]) // eslint-disable-line react-hooks/exhaustive-deps
  const top = max ?? Math.max(...data, 1)
  const pad = kind === 'line' && dot ? 4 : 1
  const h = height - pad * 2
  if (!data.length) return <svg className={`ss-chart${className ? ` ${className}` : ''}`} data-kind={kind} data-show={show || undefined} width={width} height={height} style={style} aria-hidden />
  if (kind === 'bars') {
    const gap = Math.max(2, Math.round(width / data.length / 4))
    const bw = (width - gap * (data.length - 1)) / data.length
    return (
      <svg className={`ss-chart${className ? ` ${className}` : ''}`} data-kind="bars" data-still={reduced || undefined} data-show={show || undefined} width={width} height={height} style={style} aria-hidden>
        {data.map((v, i) => {
          const bh = Math.max(2, (v / top) * h)
          return <rect key={i} className="ss-chart__bar" x={i * (bw + gap)} width={bw} rx={Math.min(2, bw / 2)} style={{ y: height - (show ? bh : 0), height: show ? bh : 0, transitionDelay: `${i * 22}ms` } as CSSProperties} />
        })}
      </svg>
    )
  }
  const pts = chartPoints({ data, kind, width, height, dot, max })
  const curve = resample(pts)
  samples.current = curve
  const line = smooth(curve)
  const fill = `${line}L${pts[pts.length - 1].x} ${height}L${pts[0].x} ${height}Z`
  const end = pts[pts.length - 1]
  return (
    <svg className={`ss-chart${className ? ` ${className}` : ''}`} data-kind="line" data-still={reduced || undefined} data-show={show || undefined} width={width} height={height} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ss-accent)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--ss-accent)" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-wipe`}>
          <rect ref={wipeRef} x={-6} y={-6} width={width + 12} height={height + 12} />
        </clipPath>
      </defs>
      {/* One wipe reveals the line and its fill together, so the fill never
          runs ahead of the line. d is also set as a style so a data change
          eases the shape */}
      <g ref={drawRef} className="ss-chart__draw" clipPath={`url(#${id}-wipe)`}>
        {area && pts.length > 1 && <path className="ss-chart__area" d={fill} style={{ d: `path("${fill}")` } as CSSProperties} fill={`url(#${id}-fill)`} />}
        <path className="ss-chart__line" d={line} style={{ d: `path("${line}")` } as CSSProperties} />
      </g>
      {dot && <circle ref={dotRef} className="ss-chart__dot" data-lead="" cx={end.x} cy={end.y} r={3.5} style={{ cx: end.x, cy: end.y } as CSSProperties} />}
    </svg>
  )
}
