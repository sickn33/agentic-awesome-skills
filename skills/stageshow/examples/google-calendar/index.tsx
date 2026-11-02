import { Bar, Field, Popover, Stage, Window, type Act, type Layout, BrandMark, Toast } from '../../kit'
import './gcal.css'

// Google Calendar, week view. Context: a quiet week with today marked.
// Action: drag across an empty Thursday afternoon, the quick-create popup
// opens, a title is typed and saved. Result: the event settles into the grid
// and the "Event saved" snackbar offers Undo, which is the loop's reset.

type S = {
  draft: { show: boolean; start: number; end: number }
  saved: boolean
  pop: { show: boolean; x: number; y: number }
  focused: boolean
  title: string
  snack: boolean
}

const initial: S = {
  draft: { show: false, start: 780, end: 810 },
  saved: false,
  pop: { show: false, x: -1000, y: 0 },
  focused: false,
  title: '',
  snack: false,
}

// Reduced motion shows the payoff: the event saved into the grid
const poster: S = { ...initial, draft: { show: true, start: 780, end: 870 }, saved: true, title: 'Design review' }

// Geometry per layout. Minutes are from midnight.
const GEO = {
  wide: { stage: { w: 800, h: 460 }, gutter: 36, hour: 44, from: 10 * 60, rows: 10, today: 4, popW: 352 },
  compact: { stage: { w: 400, h: 380 }, gutter: 16, hour: 40, from: 10 * 60, rows: 9, today: 0, popW: 220 },
} as const

const WEEK = [
  { d: 'SUN', n: 18 },
  { d: 'MON', n: 19 },
  { d: 'TUE', n: 20 },
  { d: 'WED', n: 21 },
  { d: 'THU', n: 22 },
  { d: 'FRI', n: 23 },
  { d: 'SAT', n: 24 },
]
// 4-day view starts on today, as Google Calendar's does
const FOUR = WEEK.slice(4).concat([{ d: 'SUN', n: 25 }])

// Existing events, by date: [date, start, end, bar widths]
const EVENTS: [number, number, number, number[]][] = [
  [19, 600, 660, [44, 28]],
  [20, 690, 750, [52, 30]],
  [20, 930, 990, [38, 26]],
  [21, 630, 690, [48, 24]],
  [22, 600, 645, [40]],
  [22, 960, 1050, [46, 28]],
  [23, 720, 780, [50, 30]],
  [24, 660, 720, [36, 24]],
  [25, 750, 810, [44, 26]],
]

const NOW = 11 * 60 + 20
const DAY = 22

const hourLabel = (m: number) => {
  const h = Math.floor(m / 60)
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`
}
const clock = (m: number, suffix = true) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  const t = `${h % 12 || 12}${min ? `:${String(min).padStart(2, '0')}` : ''}`
  return suffix ? `${t}${h < 12 ? 'am' : 'pm'}` : t
}
const range = (a: number, b: number) => {
  const samehalf = a < 720 === b < 720
  return `${samehalf ? clock(a, false) : clock(a)} – ${clock(b)}`
}
const clockFull = (m: number) => {
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`
}


async function script(a: Act<S>) {
  const g = GEO[a.layout]
  const col = a.rect('today-col')
  const y = (m: number) => col.y + ((m - g.from) / 60) * g.hour
  const snap = (py: number) => g.from + Math.round((((py - col.y) / g.hour) * 60) / 15) * 15

  await a.wait(700)

  // 1. Drag down Thursday afternoon, 1:00 to 2:30
  a.mark('drag')
  const from = { x: col.x + col.width * 0.8, y: y(780) + 3 }
  const to = { x: col.x + col.width * 0.8, y: y(870) - 2 }
  // Google Calendar keeps the arrow through the press and drag-creation.
  await a.move(from)
  await a.wait(250)
  await a.drag(
    to,
    (at) => {
      const end = Math.max(810, Math.min(870, snap(at.y + 6)))
      a.put({ draft: { show: true, start: 780, end } })
    },
    { duration: 900, cursor: 'preserve' },
  )
  await a.set({ draft: { show: true, start: 780, end: 870 } })
  await a.wait(200)

  // 2. The quick-create popup opens beside the new block
  a.mark('popup')
  const block = a.rect('draft')
  const pop = a.rect('popup', { layout: true })
  const px = a.layout === 'wide' ? block.x - 32 - pop.width : block.x + block.width + 8
  const py = Math.max(g.gutter, Math.min(block.y - 64, g.stage.h - g.gutter - (a.layout === 'wide' ? 8 : 0) - pop.height))
  await a.snap({ pop: { show: false, x: px, y: py } }, 'popup')
  await a.set({ pop: { show: true, x: px, y: py }, focused: true })
  await a.wait(500)

  // 3. Type a title
  await a.type('title', 'Design review', { interval: 70 })
  await a.wait(500)

  // 4. Save: the popup closes and the block settles into the grid
  a.mark('save')
  await a.move({ at: 'save', x: 0.82, y: 0.62 })
  await a.wait(250)
  await a.click()
  await a.set((s) => ({ pop: { ...s.pop, show: false }, focused: false, saved: true }))
  await a.wait(450)
  await a.set({ snack: true })
  await a.wait(2400)

  // 5. Undo, the caused reset
  a.mark('undo')
  await a.move({ at: 'undo', x: 0.9, y: 0.88 })
  await a.wait(300)
  await a.click()
  await a.set((s) => ({ draft: { ...s.draft, show: false }, snack: false }))
  await a.move('rest')
  await a.wait(600)
  await a.snap({ ...initial })
  await a.wait(300)
}

/* ---- Material icons (the product's set), 24 grid ---- */

const MI = {
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  left: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  right: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  search:
    'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  help:
    'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
  apps: 'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
  drop: 'M7 10l5 5 5-5z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  handle: 'M20 9H4v2h16V9zM4 15h16v-2H4v2z',
  schedule:
    'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  people:
    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  event:
    'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
} as const

function MIcon({ name, size = 20, className }: { name: keyof typeof MI; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`gc-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <path d={MI[name]} fill="currentColor" />
    </svg>
  )
}

function MiniMonth() {
  const days: { n: number; out?: boolean }[] = [27, 28, 29, 30].map((n) => ({ n, out: true }))
  for (let n = 1; n <= 31; n++) days.push({ n })
  return (
    <div className="gc-mini">
      <div className="gc-mini-head">
        <span>October 2026</span>
        <span className="gc-mini-nav">
          <MIcon name="left" size={16} />
          <MIcon name="right" size={16} />
        </span>
      </div>
      <div className="gc-mini-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={`h${i}`} className="gc-mini-dow">
            {d}
          </span>
        ))}
        {days.map((d, i) => (
          <span key={i} className="gc-mini-day" data-out={d.out || undefined} data-today={(!d.out && d.n === DAY) || undefined}>
            {d.n}
          </span>
        ))}
      </div>
    </div>
  )
}

function Header({ layout }: { layout: Layout }) {
  const wide = layout === 'wide'
  return (
    <header className="gc-header">
      <div className="gc-brand">
        <span className="gc-iconbtn">
          <MIcon name="menu" />
        </span>
        <BrandMark brand="google-calendar" tile={false} size={26} className="gc-mark" />
        {wide && <span className="gc-brand-name">Calendar</span>}
      </div>
      <span className="gc-today">Today</span>
      <span className="gc-arrows">
        <span className="gc-iconbtn sm">
          <MIcon name="left" />
        </span>
        <span className="gc-iconbtn sm">
          <MIcon name="right" />
        </span>
      </span>
      <span className="gc-month">October 2026</span>
      {wide && (
        <span className="gc-tools">
          <span className="gc-iconbtn">
            <MIcon name="search" />
          </span>
          <span className="gc-iconbtn">
            <MIcon name="help" />
          </span>
          <span className="gc-view">
            Week
            <MIcon name="drop" size={18} />
          </span>
          <span className="gc-switch">
            <span>
              <MIcon name="event" size={18} />
            </span>
            <span>
              <MIcon name="check" size={18} />
            </span>
          </span>
          <span className="gc-iconbtn">
            <MIcon name="apps" />
          </span>
          <span className="gc-avatar" />
        </span>
      )}
    </header>
  )
}

function Sidebar() {
  return (
    <aside className="gc-side">
      <span className="gc-create">
        <MIcon name="add" size={22} className="gc-create-plus" />
        Create
        <MIcon name="drop" size={18} />
      </span>
      <MiniMonth />
      <div className="gc-cals">
        <div className="gc-cals-head">
          <Bar w={72} h={6} tone={4} />
        </div>
        {[
          ['#039be5', 70],
          ['#33b679', 54],
          ['#8e24aa', 62],
        ].map(([c, w], i) => (
          <div key={i} className="gc-cal">
            <span className="gc-check" style={{ background: c as string }} />
            <Bar w={w as number} h={6} tone={3} />
          </div>
        ))}
      </div>
    </aside>
  )
}

function Grid({ s, layout }: { s: S; layout: Layout }) {
  const g = GEO[layout]
  const days = layout === 'wide' ? WEEK : FOUR
  const top = (m: number) => ((m - g.from) / 60) * g.hour
  const hours = Array.from({ length: g.rows }, (_, i) => g.from + i * 60)
  const dur = s.draft.end - s.draft.start
  const label = s.title || '(No title)'
  return (
    <section className="gc-panel" style={{ ['--days' as string]: days.length, ['--hour' as string]: `${g.hour}px` }}>
      <div className="gc-dayhead">
        <span className="gc-tz">GMT-07</span>
        {days.map((d) => (
          <span key={d.n} className="gc-dayname" data-today={d.n === DAY || undefined}>
            <span className="gc-dow">{d.d}</span>
            <span className="gc-date">{d.n}</span>
          </span>
        ))}
      </div>
      <div className="gc-body" data-crop>
        <div className="gc-gutter">
          {hours.map((m, i) => (
            <span key={m} className="gc-hour" style={{ top: i * g.hour }}>
              {i > 0 && hourLabel(m)}
            </span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d.n} className="gc-col" data-target={d.n === DAY ? 'today-col' : undefined}>
            {EVENTS.filter((e) => e[0] === d.n).map(([, a, b, bars], i) => (
              <div key={i} className="gc-event" data-past={d.n < DAY || (d.n === DAY && b <= NOW) || undefined} style={{ top: top(a) + 1, height: top(b) - top(a) - 2 }}>
                {bars.map((w, j) => (
                  <Bar key={j} w={w} h={5} className="gc-event-bar" data-sub={j > 0 || undefined} />
                ))}
              </div>
            ))}
            {d.n === DAY + 1 && <span className="gc-rest" data-target="rest" style={{ top: top(14 * 60 + 20) }} />}
            {d.n === DAY && (
              <>
                <span className="gc-now" style={{ top: top(NOW) }} />
                <div
                  className="gc-draft"
                  data-target="draft"
                  data-show={s.draft.show || undefined}
                  data-saved={s.saved || undefined}
                  data-short={dur <= 30 || undefined}
                  data-crop
                  style={{ top: top(s.draft.start) + 1, height: top(s.draft.end) - top(s.draft.start) - 2 }}
                >
                  <span className="gc-draft-title">{label}</span>
                  <span className="gc-draft-time">{range(s.draft.start, s.draft.end)}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickCreate({ s, layout }: { s: S; layout: Layout }) {
  const wide = layout === 'wide'
  return (
    <Popover
      show={s.pop.show}
      origin={wide ? 'right center' : 'left center'}
      className="gc-pop"
      data-target="popup"
      data-layout={layout}
      style={{ left: s.pop.x, top: s.pop.y, width: GEO[layout].popW }}
    >
      <div className="gc-pop-top">
        <MIcon name="handle" size={18} />
        <span className="gc-iconbtn sm">
          <MIcon name="close" size={18} />
        </span>
      </div>
      <div className="gc-pop-indent">
        <Field className="gc-title" value={s.title} placeholder="Add title" focused={s.focused} box={{ 'data-target': 'title' }} />
        <div className="gc-kinds">
          <span className="gc-kind" data-on>
            Event
          </span>
          <span className="gc-kind">Task</span>
        </div>
      </div>
      <div className="gc-pop-row">
        <MIcon name="schedule" />
        <div className="gc-pop-time">
          <span>
            {wide ? 'Thursday, October 22' : 'Thu, Oct 22'}
            <span className="gc-dot">·</span>
            {wide ? `${clockFull(s.draft.start)} – ${clockFull(s.draft.end)}` : range(s.draft.start, s.draft.end)}
          </span>
          <Bar w={wide ? 116 : 84} h={5} tone={3} />
        </div>
      </div>
      {wide && (
        <div className="gc-pop-row">
          <MIcon name="people" />
          <Bar w={64} h={6} tone={3} />
        </div>
      )}
      <div className="gc-pop-row">
        <MIcon name="event" />
        <Bar w={wide ? 78 : 60} h={6} tone={3} />
        <span className="gc-caldot" />
      </div>
      <div className="gc-pop-foot">
        {wide && <span className="gc-more">More options</span>}
        <span className="gc-save" data-target="save" data-cursor="hand">
          Save
        </span>
      </div>
    </Popover>
  )
}

export default function GoogleCalendar() {
  return (
    <Stage
      width={GEO.wide.stage.w}
      height={GEO.wide.stage.h}
      compact={{ below: 560, width: GEO.compact.stage.w, height: GEO.compact.stage.h }}
      initial={initial}
      poster={poster}
      script={script}
      accent="#0b57d0"
      cursor={{ at: 'rest' }}
      className="gc-stage"
    >
      {(s, _rect, layout) => (
        <>
          <Window url="calendar.google.com/calendar/u/0/r/week" urlShape="pill" className="gc-window" data-layout={layout}>
            <div className="gc-app">
              <Header layout={layout} />
              <div className="gc-main">
                {layout === 'wide' && <Sidebar />}
                <Grid s={s} layout={layout} />
              </div>
            </div>
          </Window>
          <QuickCreate s={s} layout={layout} />
          <Toast
            show={s.snack}
            className={`gc-snack${layout === 'compact' ? ' gc-snack--compact' : ''}`}
            action={
              <span className="gc-undo" data-target="undo" data-cursor="hand">
                Undo
              </span>
            }
          >
            Event saved
          </Toast>
        </>
      )}
    </Stage>
  )
}
