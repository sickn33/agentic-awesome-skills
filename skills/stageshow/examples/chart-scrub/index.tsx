import { useRef } from 'react'
import { Chart, Roll, Stage, Window, chartPoints, type Act } from '../../kit'
import './scrub.css'

// Scrubbing a chart: the pointer runs along a revenue line and the headline
// reads out each day it passes. Beats: the pointer comes onto the chart, a
// hairline and a dot pick up the nearest day, the headline's label and value
// change to that day, the pointer runs right to the peak and rests; then it
// leaves and the headline returns to the total. Loops.
//
// What makes a scrub read as one gesture:
// - The headline is the readout. No tooltip box over the line: the value
//   that is already the biggest thing on the card changes, so the eye stays
//   where it already was.
// - Only the digits that change roll, and they roll quickly (UI feedback,
//   not a story beat): $4,920 to $5,240 holds the "$" and moves the rest.
// - One stroke. The pointer runs the line in a single eased move (a path
//   along the points, not hop after hop), and the day under it updates as it
//   goes; a run of short moves reads as stuttering.
// - The readout is discrete, the motion is not: the value is always a real
//   day (the nearest one), while the hairline sits at the pointer and the
//   dot rides the drawn curve under it, read off the line's own path. A dot
//   snapping day to day trails the hand.
// - Over a plot the pointer is a crosshair, as charting apps show it.
// - The day under the pointer is the only thing that's emphasized. The line
//   doesn't dim; the axis doesn't move.
//
// Real strings: the card's title, the range, the day names, every value.

type S = { day: number | null; x: number | null }

const DAYS = [3240, 3610, 3480, 4120, 3950, 4630, 4410, 5240, 4920, 5810, 5530, 6320, 6050, 6890]
const NAMES = ['Oct 15', 'Oct 16', 'Oct 17', 'Oct 18', 'Oct 19', 'Oct 20', 'Oct 21', 'Oct 22', 'Oct 23', 'Oct 24', 'Oct 25', 'Oct 26', 'Oct 27', 'Oct 28']
const TOTAL = DAYS.reduce((n, d) => n + d, 0)
const money = (n: number) => `$${n.toLocaleString('en-US')}`

const W = { wide: 492, compact: 280 }
const H = 150

async function script(a: Act<S>) {
  await a.wait(900)
  const box = a.rect('plot')
  const pts = chartPoints({ data: DAYS, width: box.width, height: H, dot: false })
  const at = (i: number) => ({ x: box.x + pts[i]!.x, y: box.y + pts[i]!.y + 18 })
  // Onto the line a third of the way along, then a steady run to the peak
  a.mark('hover')
  await a.move(at(4), { duration: 700 })
  a.put({ day: 4, x: pts[4]!.x })
  await a.wait(700)
  a.mark('scrub')
  // One eased stroke, straight as a hand runs, from day 4 to the last. The
  // hairline follows the pointer; the readout is the day nearest it
  await a.move(at(DAYS.length - 1), {
    duration: 1500,
    path: (e, from, to) => ({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }),
    onMove: (pt) => {
      const x = Math.max(0, Math.min(box.width, pt.x - box.x))
      let near = 0
      for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i]!.x - x) < Math.abs(pts[near]!.x - x)) near = i
      a.put({ day: near, x })
    },
  })
  await a.wait(1900)
  // Off the chart: the headline returns to the total
  a.mark('leave')
  // The readout lets go as the pointer crosses the plot's edge; the hairline
  // and dot fade where they were, rather than jumping as they go
  let gone = false
  await a.move({ x: box.x + box.width + 40, y: box.y + box.height + 60 }, {
    duration: 600,
    onMove: (pt) => {
      if (!gone && (pt.x > box.x + box.width || pt.y > box.y + box.height)) {
        gone = true
        a.put({ day: null })
      }
    },
  })
  await a.wait(1600)
}

// The y of the drawn line at x: a short search along the path's length
function yOn(path: SVGPathElement | null | undefined, x: number) {
  if (!path) return null
  let lo = 0
  let hi = path.getTotalLength()
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (path.getPointAtLength(mid).x < x) lo = mid
    else hi = mid
  }
  return path.getPointAtLength(hi).y
}

export default function ChartScrub() {
  const plot = useRef<HTMLDivElement>(null)
  return (
    <Stage<S> width={640} height={400} compact={{ below: 640, width: 358, height: 400 }} initial={{ day: null, x: null }} poster={{ day: 13, x: null }} script={script} cursor={{ at: { x: 560, y: 360 } }} className="cs">
      {(s, _rect, layout) => {
        const w = layout === 'compact' ? W.compact : W.wide
        const pts = chartPoints({ data: DAYS, width: w, height: H, dot: false })
        // The hairline at the pointer (or on the day, for the still); the dot
        // on the curve beneath it
        const hx = s.x ?? (s.day === null ? null : pts[s.day]!.x)
        const on = s.day !== null
        const hy = hx === null ? null : (yOn(plot.current?.querySelector<SVGPathElement>('.ss-chart__line'), hx) ?? pts[s.day ?? 0]!.y)
        const p = hx === null || hy === null ? null : { x: hx, y: hy }
        return (
          <Window title="Revenue" className="cs-win">
            <div className="cs-body">
              <div className="cs-head">
                <div className="cs-label">
                  <Roll variant="fade">{s.day === null ? 'Last 14 days' : NAMES[s.day]!}</Roll>
                </div>
                <div className="cs-value">
                  <Roll stagger={25}>{money(s.day === null ? TOTAL : DAYS[s.day]!)}</Roll>
                </div>
              </div>
              <div ref={plot} className="cs-plot" data-target="plot" data-cursor="crosshair" style={{ width: w, height: H }}>
                <Chart data={DAYS} width={w} height={H} dot={false} />
                <span className="cs-hair" data-on={p && on ? '' : undefined} style={p ? { left: p.x } : undefined} />
                <span className="cs-dot" data-on={p && on ? '' : undefined} style={p ? { left: p.x, top: p.y } : undefined} />
              </div>
              <div className="cs-axis" style={{ width: w }}>
                <span>Oct 15</span>
                <span>Oct 28</span>
              </div>
            </div>
          </Window>
        )
      }}
    </Stage>
  )
}
