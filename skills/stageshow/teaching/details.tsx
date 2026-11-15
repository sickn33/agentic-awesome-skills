import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, Ellipsis } from 'lucide-react'
import { Stage, type Act } from '../kit'
import './details.css'

// Detail pairs: small scenes where one choice decides whether the demo looks
// made or real. Four move (a swipe's throw, a reaction, a chart drawing
// on, a label pinned to its chevron); two are stills (a top bar, copy length).

export const detailLessons = [
  { id: 'detail-throw', title: 'Throw a swipe at the finger’s speed', note: 'The same row swiped left. Released, it should carry on at the speed the finger left it and the gap should close in one ease. A pause at the hand-over, an ease-in from rest or a gap that snaps shut each reads as harsh. See examples/swipe.', bad: 'Pauses at release, eases in from rest, gap snaps shut', good: 'Leaves at the finger’s speed, gap closes in one ease', motion: true },
  { id: 'detail-reaction', title: 'Draw a reaction as the app does', note: 'The same message getting a reaction. A drawn glyph in a disc over the bubble’s words, appearing in one frame, reads as made up. Use the real emoji in a small pill on the bubble’s lower corner, ringed in the ground so it sits on the edge, scaling in from the corner it hangs from.', bad: 'A drawn heart in a disc, over the words, in one frame', good: 'The emoji in a pill on the corner, scaling in', motion: true },
  { id: 'detail-chart', title: 'Draw a chart on from its start', note: 'The same revenue line arriving. Faded in whole, the line, area and end dot arrive as one flat picture and the trend is never seen. Draw the line left to right, let the area follow under it, and land the end dot when the line reaches it.', bad: 'Line, area and dot fade in together', good: 'Line draws on, area follows, dot lands last', motion: true },
  { id: 'detail-bar', title: 'Balance a top bar', note: 'The same inbox. A bar with one control and an empty side reads as unfinished. Give it what the product puts there: Mail has a back button on the left. If the product has nothing, drop the bar rather than leave half of it.', bad: 'Only the more button, the left side empty', good: 'Back on the left, more on the right' },
  { id: 'detail-copy', title: 'Choose copy that fits', note: 'The same invite. An email that truncates in its chip, a name that wraps and labels of uneven length make the scene look broken. Unless the brief fixes them, pick names, emails and values whose length suits the layout.', bad: 'Truncated email, wrapped name, ragged labels', good: 'Short real names and an email that fits' },
  { id: 'detail-pin', title: 'Pin a changing label to its icon', note: 'The same role picker as its value changes. A picker at the end of a row is anchored at its chevron: the label sits against it and grows away from it, so the chevron never moves and the gap never changes. Held in a fixed slot instead, the label starts at the slot’s left and the space before the chevron grows and shrinks with every value.', bad: 'Label at the slot’s left, the gap to the chevron changing', good: 'Label against the chevron, growing left', motion: true },
] as const

type Id = (typeof detailLessons)[number]['id']
type S = { phase: number; role: number }

const ROLES = ['Can view', 'Can edit', 'Full access']

async function throwScript(a: Act<S>) {
  await a.wait(700)
  a.put({ phase: 1 }) // the drag
  await a.wait(320)
  a.put({ phase: 2 }) // released
  await a.wait(700)
  a.put({ phase: 3 }) // gap closes
  await a.wait(1800)
  a.snap({ phase: 0 })
}

async function stepScript(a: Act<S>) {
  await a.wait(800)
  a.put({ phase: 1 })
  await a.wait(2600)
  a.snap({ phase: 0 })
}

async function roleScript(a: Act<S>) {
  for (let i = 1; i <= ROLES.length; i++) {
    await a.wait(1300)
    a.put({ role: i % ROLES.length })
  }
}

const SCRIPT: Partial<Record<Id, (a: Act<S>) => Promise<void>>> = { 'detail-throw': throwScript, 'detail-reaction': stepScript, 'detail-chart': stepScript, 'detail-pin': roleScript }

function Throw({ s, good }: { s: S; good: boolean }) {
  return (
    <div className="dt-list" data-phase={s.phase} data-good={good || undefined}>
      <div className="dt-slot">
        <div className="dt-action">Archive</div>
        <div className="dt-row">
          <span className="dt-av">N</span>
          <span className="dt-lines"><b>Northwind Air</b><span>Your trip to Lisbon</span></span>
        </div>
      </div>
      <div className="dt-row dt-row--next">
        <span className="dt-av dt-av--jp">J</span>
        <span className="dt-lines"><b>Jon Park</b><span>Re: pricing page</span></span>
      </div>
      <div className="dt-row dt-row--fill"><span className="dt-av dt-av--fill" /><span className="dt-lines"><i style={{ width: 92 }} /><i style={{ width: 140 }} /></span></div>
    </div>
  )
}

function Reaction({ s, good }: { s: S; good: boolean }) {
  return (
    <div className="dr-thread" data-on={s.phase || undefined} data-good={good || undefined}>
      <div className="dr-bubble dr-bubble--them">Landed! The view from the hotel is unreal</div>
      <div className="dr-bubble dr-bubble--me">
        Send photos
        {good ? (
          <span className="dr-pill"><Emoji char="😍" /></span>
        ) : (
          <span className="dr-disc"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M6 10.2 1.6 6A2.6 2.6 0 0 1 6 2.6 2.6 2.6 0 0 1 10.4 6Z" fill="#fff" /></svg></span>
        )}
      </div>
    </div>
  )
}

const POINTS = [62, 58, 64, 55, 60, 48, 52, 40, 44, 34, 38, 26, 30, 18]
const LINE = POINTS.map((y, i) => `${i ? 'L' : 'M'}${8 + i * 20},${y}`).join(' ')
const AREA = `${LINE} L${8 + 13 * 20},86 L8,86 Z`

function ChartDraw({ s, good }: { s: S; good: boolean }) {
  return (
    <div className="dc-card" data-on={s.phase || undefined} data-good={good || undefined}>
      <span className="dc-label">Revenue, 14 days</span>
      <span className="dc-value">$68,200</span>
      <svg className="dc-svg" width="276" height="90" viewBox="0 0 276 90" aria-hidden>
        <defs>
          <linearGradient id={`dc-fill-${good}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".18" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
          <clipPath id={`dc-clip-${good}`}><rect className="dc-wipe" x="0" y="0" width="276" height="90" /></clipPath>
        </defs>
        <path className="dc-area" d={AREA} fill={`url(#dc-fill-${good})`} clipPath={good ? `url(#dc-clip-${good})` : undefined} />
        <path className="dc-line" d={LINE} pathLength={1} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="dc-dot" cx={8 + 13 * 20} cy={18} r="3.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

function Bar({ good }: { good: boolean }) {
  return (
    <div className="db-screen">
      <div className="db-top">
        {good ? <span className="db-round"><ChevronLeft size={18} strokeWidth={2.25} /></span> : <span />}
        <span className="db-round"><Ellipsis size={16} strokeWidth={2.25} /></span>
      </div>
      <div className="db-title">Inbox</div>
      {[0, 1].map(i => (
        <div className="dt-row dt-row--fill" key={i}><span className="dt-av dt-av--fill" /><span className="dt-lines"><i style={{ width: [96, 80][i] }} /><i style={{ width: [150, 128][i] }} /></span></div>
      ))}
    </div>
  )
}

function Copy({ good }: { good: boolean }) {
  return (
    <div className="dy-card">
      <div className="dy-field">
        <span className="dy-chip">{good ? 'maya@northwind.com' : 'alexandra.whitfield@northwindlabs.com'}</span>
      </div>
      <div className="dy-people">
        {(good ? [['Jon Park', 'Owner'], ['Ana Ruiz', 'Editor']] : [['Bartholomew Featherstonehaugh', 'Owner'], ['Al', 'Editor with comment access']]).map(([n, r]) => (
          <div className="dy-person" key={n}>
            <span className="dt-av dt-av--fill" />
            <span className="dy-name">{n}</span>
            <span className="dy-role">{r}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pin({ s, good }: { s: S; good: boolean }) {
  return (
    <div className="dp-row">
      <span className="dp-who"><span className="dt-av dt-av--jp">J</span>Jon Park</span>
      <span className="dp-select" data-good={good || undefined}>
        {/* Every value stacked in one cell, crossfading: the cell is as
            wide as the longest, so nothing resizes or gets cut */}
        <span className="dp-labels">
          {ROLES.map((r, i) => <span key={r} className="dp-label" data-on={i === s.role || undefined}>{r}</span>)}
        </span>
        <ChevronDown size={14} strokeWidth={2} />
      </span>
    </div>
  )
}

export function DetailComparison({ lessonId }: { lessonId: string }) {
  const [revision, replay] = useState(0)
  const lesson = detailLessons.find(item => item.id === lessonId)
  if (!lesson) return null
  const id = lesson.id as Id
  const script = SCRIPT[id]
  const height = 252
  return (
    <section className="cp-lesson">
      <header>
        <div><h2>{lesson.title}</h2><p>{lesson.note}</p></div>
        {script && <button className="tc-replay" type="button" onClick={() => replay(n => n + 1)}>Replay pair</button>}
      </header>
      <Stage<S> key={`${id}-${revision}`} width={704} height={height + 50} compact={{ below: 704, width: 340, height: height * 2 + 116 }} initial={{ phase: 0, role: 0 }} poster={{ phase: 1, role: 0 }} script={script} className="tc-stage">
        {s => (
          <div className="tc-pair dd-pair">
            {[false, true].map(good => (
              <figure key={String(good)}>
                <div className="tc-visual dd-visual">
                  {id === 'detail-throw' ? <Throw s={s} good={good} /> : id === 'detail-reaction' ? <Reaction s={s} good={good} /> : id === 'detail-chart' ? <ChartDraw s={s} good={good} /> : id === 'detail-bar' ? <Bar good={good} /> : id === 'detail-copy' ? <Copy good={good} /> : <Pin s={s} good={good} />}
                </div>
                <figcaption>{good ? lesson.good : lesson.bad}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Stage>
    </section>
  )
}

// An emoji centered by its drawing, not its glyph box. Emoji fonts pad the
// glyph unevenly (Apple's sits off center in its box), by an amount that
// changes with the size and the screen. So the emoji is drawn to a canvas,
// cropped to its ink, and the crop is what the pill centers
function Emoji({ char, size = 15 }: { char: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState<[number, number]>([size, size])
  useLayoutEffect(() => {
    const out = ref.current
    if (!out) return
    const k = Math.max(2, Math.ceil(devicePixelRatio)) * 2
    const n = Math.ceil(size * 2 * k)
    const c = document.createElement('canvas')
    c.width = c.height = n
    const g = c.getContext('2d', { willReadFrequently: true })
    if (!g) return
    g.font = `${size * k}px ${getComputedStyle(out).fontFamily}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(char, n / 2, n / 2)
    const { data } = g.getImageData(0, 0, n, n)
    let x0 = n, x1 = -1, y0 = n, y1 = -1
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (data[(y * n + x) * 4 + 3]! > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    if (x1 < 0) return
    const w = x1 - x0 + 1, h = y1 - y0 + 1
    out.width = w
    out.height = h
    out.getContext('2d')!.drawImage(c, x0, y0, w, h, 0, 0, w, h)
    // Shown at an even whole-pixel size, so it sits the same whole number
    // of pixels from every side of an even-sized pill
    const side = Math.round(Math.max(w, h) / k / 2) * 2
    setBox([side * (w / Math.max(w, h)), side * (h / Math.max(w, h))])
  }, [char, size])
  return <canvas ref={ref} className="dr-emoji" role="img" aria-label={char} style={{ width: box[0], height: box[1] }} />
}
