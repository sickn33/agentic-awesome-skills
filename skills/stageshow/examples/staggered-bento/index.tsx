import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Count, Icon, Phone, Stage, useReducedMotion } from '../../kit'
import type { Act } from '../../kit'
import './grid.css'

// A staggered pair, light: the features section of Wayline, an invented
// travel journal for iPhone. Two columns of rounded tiles, tall and short
// alternating so no row lines up across the columns (Apple's MacBook grid).
//
//   Tile       Column  Size   Kind        The one thing                       Moves
//   Coast      left    tall   Picture     a blue-and-white tile pattern     (still)
//   Private    right   short  Statement   one sentence, a blue lock           (still)
//   Distance   left    short  Stat        "38,604 km" this year                counts up
//   Voice      right   short  Component   the voice-note recorder              the waveform rises
//   Book       left    short  Object      the printed, clothbound trip         rises into the crop
//   Day        right   tall   Hero UI     one phone, one day's page            the route draws
//
// One phone and no window: two of six tiles are UI. The coast is the one
// tile with its own ground. Across and down, no kind sits next to itself.
// Each picture is its own Stage at 1:1, pinned to its tile's bottom. The
// coast holds still; each tile that moves plays one beat, once, 110ms after
// the one before it in reading order.

const STEP = 110
const LEAD = 450

type Beat = { on: boolean }
const before: Beat = { on: false }
const after: Beat = { on: true }
const beat = (i: number) => async (a: Act<Beat>) => {
  await a.wait(LEAD + i * STEP)
  await a.set({ on: true })
}

function Tile({ area, title, children, picture, photo }: { area: string; title: ReactNode; children?: ReactNode; picture?: ReactNode; photo?: boolean }) {
  return (
    <section className={`sg-tile sg-tile--${area}`} data-photo={photo || undefined} data-crop>
      {picture}
      {title ? (
        <p className="sg-copy">
          {title} {children}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

function useInView<T extends Element>(delay: number) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let t = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      t = window.setTimeout(() => setSeen(true), delay)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [delay])
  return [ref, seen] as const
}

function usePictureWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 340, gutter: 26 })
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setSize({ width: node.clientWidth, gutter: parseFloat(getComputedStyle(node).getPropertyValue('--pad')) })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

/* ---------------- Coast (the hero picture) ---------------- */

// One still, a blue-and-white tile pattern: a different visual role from
// every neighboring tile, with no external image or asset dependency.
function Coast() {
  return (
    <Tile
      area="coast"
      photo
      title={<b>Every trip, written up for you.</b>}
      picture={
        <>
        <div className="sg-picture sg-picture--coast" data-art="azulejo">
          <Stage width={600} height={600} className="sg-stage">
            {() => (
              <div className="sg-art">
                <Azulejo />
              </div>
            )}
          </Stage>
        </div>
        </>
      }
    >
      Wayline turns your photos into a journal, a page a day.
    </Tile>
  )
}

/* Azulejo: one tile drawn once and repeated by an SVG pattern. The motif is
   the classic lattice of lenses: arcs of circles centered on the tile corners,
   meeting in a cross at each tile's center, so the joins across the grout
   make one continuous net. A cobalt field above, a frieze, then the field
   of tiles running off the bottom and sides. */
const AZ = { blue: '#1f3f8f', wash: '#8ea5d4', white: '#f6f3ec', grout: '#d3d9e5' }
const T = 80
// A lens from (0,-L) to (0,L), half-width w: both arcs share radius r
const lens = (L: number, w: number) => {
  const r = (L * L + w * w) / (2 * w)
  return `M0 ${-L} A${r} ${r} 0 0 1 0 ${L} A${r} ${r} 0 0 1 0 ${-L} Z`
}
const CORNERS = [[0, 0], [T, 0], [0, T], [T, T]]

function Azulejo() {
  const tileId = useId()
  const friezeId = useId()
  const P = 300 // the field's top edge, on a row of tile corners
  const F = 40 // the frieze: a row of half tiles
  return (
    <svg className="sg-art__svg" viewBox="0 0 600 600" width="600" height="600" aria-hidden>
      <defs>
        <pattern id={tileId} width={T} height={T} patternUnits="userSpaceOnUse" x={300 - T / 2} y={P}>
          <rect width={T} height={T} fill={AZ.grout} />
          <rect x="0.6" y="0.6" width={T - 1.2} height={T - 1.2} rx="1" fill={AZ.white} />
          {/* the net: a lens on each edge, center to center across the joint */}
          {[[T / 2, 0, 0], [T, T / 2, 90], [T / 2, T, 0], [0, T / 2, 90]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d={lens(T / 2, 10)} fill={AZ.blue} />
              <path d={lens(T / 2 - 13, 3.5)} fill={AZ.wash} />
            </g>
          ))}
          {/* the boss where the lenses cross */}
          <circle cx={T / 2} cy={T / 2} r="10" fill={AZ.blue} />
          <circle cx={T / 2} cy={T / 2} r="5.5" fill={AZ.white} />
          <circle cx={T / 2} cy={T / 2} r="2.25" fill={AZ.blue} />
          {/* a four-petal flower on every corner, completed by four tiles */}
          {CORNERS.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[45, 135, 225, 315].map((d) => (
                <path key={d} d={lens(9, 4.5)} transform={`rotate(${d}) translate(0 -12)`} fill={AZ.blue} />
              ))}
              <circle r="3" fill={AZ.wash} />
            </g>
          ))}
        </pattern>
        <pattern id={friezeId} width={T} height={F} patternUnits="userSpaceOnUse" x={300} y={P - F}>
          <rect width={T} height={F} fill={AZ.grout} />
          <rect x="0.6" y="0.6" width={T - 1.2} height={F - 1.2} rx="1" fill={AZ.white} />
          <rect y="0" width={T} height="5" fill={AZ.blue} />
          <rect y={F - 5} width={T} height="5" fill={AZ.blue} />
          <g transform={`translate(${T / 2} ${F / 2}) rotate(90)`}>
            <path d={lens(T / 2, 7)} fill={AZ.blue} />
            <path d={lens(T / 2 - 13, 2.5)} fill={AZ.wash} />
          </g>
          {[0, T].map((x) => (
            <g key={x}>
              <circle cx={x} cy={F / 2} r="7" fill={AZ.blue} />
              <circle cx={x} cy={F / 2} r="3" fill={AZ.white} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="600" height="600" fill={AZ.blue} />
      <rect y={P - F} width="600" height={F} fill={`url(#${friezeId})`} />
      <rect y={P} width="600" height={600 - P} fill={`url(#${tileId})`} />
    </svg>
  )
}

/* ---------------- Private (statement) ---------------- */

function Private() {
  return (
    <Tile area="private" title={null}>
      <div className="sg-statement">
        <Icon name="lock" filled size={30} className="sg-lock" />
        <p className="sg-statement__text">
          <b>Private by design.</b> Your journal stays on your iPhone.
        </p>
      </div>
    </Tile>
  )
}

/* ---------------- Distance (stat) ---------------- */

function Distance() {
  const reduced = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(LEAD + 2 * STEP)
  return (
    <Tile area="stat" title={null}>
      <div ref={ref} className="sg-stat">
        <span className="sg-stat-lead">This year you went</span>
        <span className="sg-stat-number">
          <span className="sg-stat-value">
            <span className="sg-stat-sizer" aria-hidden>38,604</span>
            <Count value={seen || reduced ? 38604 : 0} duration={1600} />
          </span>
          <span className="sg-stat-unit">km</span>
        </span>
        <span className="sg-stat-label">measured from where your photos were taken.</span>
      </div>
    </Tile>
  )
}

/* ---------------- Voice (component) ---------------- */

const WAVE = Array.from({ length: 30 }, (_, i) => {
  const v = 0.3 + 0.45 * Math.abs(Math.sin(i * 0.55)) * (0.6 + 0.4 * Math.cos(i * 0.23)) + 0.2 * Math.abs(Math.sin(i * 1.9))
  return Math.min(1, v)
})

function Voice() {
  const [ref, { width }] = usePictureWidth()
  return (
    <Tile
      area="voice"
      title={<b>Say it instead.</b>}
      picture={
        <div ref={ref} className="sg-picture sg-picture--small">
          <Stage<Beat> width={width} height={206} initial={before} poster={after} play="once" script={beat(3)} className="sg-stage">
            {(s) => (
              <div className="sg-note" data-on={s.on || undefined}>
              <div className="sg-recorder">
                <span className="sg-rec" aria-hidden>
                  <span className="sg-rec__stop" />
                </span>
                <span className="sg-wave" aria-hidden>
                  {WAVE.map((h, i) => (
                    <span key={i} className="sg-wave__bar" style={{ ['--h' as string]: h, ['--i' as string]: i }} />
                  ))}
                </span>
                <span className="sg-rec__time">
                  0:<Count value={s.on ? 14 : 0} duration={1400} format={(n) => String(Math.round(n)).padStart(2, '0')} />
                </span>
              </div>
              <p className="sg-transcript">“Fog all morning, then the whole coast at once.”</p>
              <div className="sg-transcript-rest">
                <span style={{ width: '88%' }} />
                <span style={{ width: '64%' }} />
              </div>
              </div>
            )}
          </Stage>
        </div>
      }
    >
      Voice notes become the day’s words.
    </Tile>
  )
}

/* ---------------- Book (object) ---------------- */

function Book() {
  const [ref, { width }] = usePictureWidth()
  return (
    <Tile
      area="book"
      title={<b>Print the trip.</b>}
      picture={
        <div ref={ref} className="sg-picture sg-picture--small">
          <Stage<Beat> width={width} height={190} initial={before} poster={after} play="once" script={beat(4)} className="sg-stage">
            {(s) => (
              <div className="sg-books" data-on={s.on || undefined}>
                <span className="sg-book sg-book--back" aria-hidden />
                <span className="sg-book sg-book--front">
                  <span className="sg-book__spine" aria-hidden />
                  <span className="sg-book__title">Portugal</span>
                  <span className="sg-book__by">Maya Chen · 2026</span>
                </span>
              </div>
            )}
          </Stage>
        </div>
      }
    >
      Clothbound, at your door in a week.
    </Tile>
  )
}

/* ---------------- Day (hero UI: the one phone) ---------------- */

function Day() {
  const [ref, { width, gutter }] = usePictureWidth()
  return (
    <Tile
      area="day"
      title={<b>A page for every day.</b>}
      picture={
        <div ref={ref} className="sg-picture sg-picture--phone">
          <Stage<Beat> width={width} height={400} initial={before} poster={after} play="once" script={beat(5)} className="sg-stage">
            {(s) => (
              // Centered in its tile: the one device in the grid stands in
              // the middle of its card, running off the bottom
              <Phone width={Math.min(276, width - gutter * 2)} className="sg-phone" style={{ left: (width - Math.min(276, width - gutter * 2)) / 2 }} data-on={s.on || undefined}>
                <div className="sg-page">
                  <div className="sg-page__head">
                    <span className="sg-page__eyebrow">Day 2 · Tuesday</span>
                    <span className="sg-page__title">Sintra</span>
                  </div>
                  <div className="sg-mapcard">
                    {/* Fills the card at the page width, so its edge lines up with the photos under it */}
                    <svg viewBox="0 0 345 190" width="100%" height="190" preserveAspectRatio="xMidYMid slice" aria-hidden>
                      <rect width="345" height="190" fill="#eef0e6" />
                      <path d="M0 150 C60 140 110 160 170 150 C230 140 290 120 345 128 L345 190 L0 190 Z" fill="#cfe1ea" />
                      <path d="M30 0 C60 40 70 90 130 110 M200 0 C190 50 230 80 300 90 M0 70 C80 60 160 80 345 60" stroke="#ffffff" strokeWidth="5" fill="none" />
                      <path d="M120 20 C150 30 170 26 190 40" stroke="#dfe3d4" strokeWidth="14" strokeLinecap="round" fill="none" />
                      <path className="sg-route" d="M60 120 C90 100 104 72 140 70 C176 68 186 104 220 98 C252 92 258 52 290 44" pathLength={1} stroke="#f2643b" strokeWidth="4" strokeLinecap="round" fill="none" />
                      <circle cx="60" cy="120" r="7" fill="#fff" stroke="#f2643b" strokeWidth="3" />
                      <circle className="sg-route__end" cx="290" cy="44" r="7" fill="#f2643b" stroke="#fff" strokeWidth="3" />
                    </svg>
                  </div>
                  <div className="sg-thumbs">
                    <span className="sg-thumb sg-thumb--a" />
                    <span className="sg-thumb sg-thumb--b" />
                    <span className="sg-thumb sg-thumb--c" />
                  </div>
                  <div className="sg-lines">
                    <span style={{ width: '92%' }} />
                    <span style={{ width: '84%' }} />
                    <span style={{ width: '58%' }} />
                  </div>
                </div>
              </Phone>
            )}
          </Stage>
        </div>
      }
    >
      Route, photos and notes, laid out for you.
    </Tile>
  )
}

export default function StaggeredBento() {
  return (
    <div className="staggered-bento">
      <div className="sg-grid">
        <div className="sg-col">
          <Coast />
          <Distance />
          <Book />
        </div>
        <div className="sg-col">
          <Private />
          <Voice />
          <Day />
        </div>
      </div>
    </div>
  )
}
