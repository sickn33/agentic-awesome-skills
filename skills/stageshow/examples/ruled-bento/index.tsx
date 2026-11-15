import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Count, Icon, Meter, Prompt, Caret, Stage, States, Window, useReducedMotion } from '../../kit'
import type { Act, Layout } from '../../kit'
import './grid.css'

// A ruled bento on dark: the features section of Halite, an invented edge
// database. One rounded container, 1px rules between the cells, no gaps,
// mixed spans (2 + 1, then 1 + 2, then a full-width band), the way Linear,
// Framer and Raycast's developer page set theirs.
//
//   Tile      Span   Kind        The one thing                         Moves
//   Create    2 × 1  Hero UI     `halite create`, the only window      the migration bar fills, Ready prints
//   Reads     1 × 1  Stat        "4ms" at the median                   counts down from 120
//   Regions   1 × 1  Diagram     a primary and six replicas            the lines draw out, replicas light
//   Restore   2 × 1  Component   the restore scrubber                  the handle slides back past the bad drop
//   Drivers   3 × 1  Collection  ORM names, bleeding off both sides    the rows drift apart
//
// Two of five tiles are UI, one window. Across and down, no kind sits next
// to itself. Each picture is its own Stage at 1:1, pinned to its cell's
// bottom; the copy is page text. Each cell plays one beat, once, 110ms
// after the one before it in reading order.

const STEP = 110
const LEAD = 450

type Beat = { on: boolean; fill?: boolean }
const before: Beat = { on: false }
const after: Beat = { on: true, fill: true }
const beat = (i: number) => async (a: Act<Beat>) => {
  await a.wait(LEAD + i * STEP)
  await a.set({ on: true })
}

function Tile({ area, title, children, picture }: { area: string; title: ReactNode; children?: ReactNode; picture?: ReactNode }) {
  return (
    <section className={`rb-cell rb-cell--${area}`} data-crop>
      {title ? (
        <p className="rb-copy">
          {title} {children}
        </p>
      ) : (
        children
      )}
      {picture}
    </section>
  )
}

// Measure the tile, not the page: a wide page can still contain a narrow tile.
function usePictureWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setWidth(node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/* ---------------- Create (hero) ---------------- */

// The hero's one beat: the output prints, and the bar fills once its line is in
const create = async (a: Act<Beat>) => {
  await a.wait(LEAD)
  await a.set({ on: true })
  await a.wait(800)
  await a.set({ on: true, fill: true })
}

function Terminal({ on, fill, layout }: { on: boolean; fill?: boolean; layout: Layout }) {
  const wide = layout === 'wide'
  return (
    <Window chrome="terminal" lights="grey" title={wide ? 'demo — zsh' : undefined} className="rb-term" body={{ 'data-crop': '' }} data-on={on || undefined} data-fill={fill || undefined} data-layout={layout}>
      <div className="ss-term rb-term__body">
        <Prompt path="~/demo">halite create shop</Prompt>
        <div className="rb-out" style={{ ['--i' as string]: 0 }}>
          <span className="dim">Created</span> shop <span className="dim">in</span> iad1
        </div>
        <div className="rb-out rb-migrate" style={{ ['--i' as string]: 1 }}>
          <span className="dim">Migrating</span>
          <Meter className="rb-meter" value={fill ? 1 : 0} />
          <span className="rb-count">
            <Count value={fill ? 14 : 0} duration={1000} />
            <span className="dim">/14</span>
          </span>
        </div>
        <div className="rb-out rb-ready" style={{ ['--i' as string]: 2 }}>
          <span className="ok">✓</span> Ready <span className="dim">in 1.9s</span>
        </div>
        <div className="rb-out rb-url" style={{ ['--i' as string]: 3 }}>
          <span className="dim">{wide ? 'DATABASE_URL  ' : ''}</span>
          {wide ? 'halite://shop.demo.example' : 'halite://shop.demo…'}
        </div>
        <Prompt path="~/demo" className="rb-out" style={{ ['--i' as string]: 4 }}>
          <Caret />
        </Prompt>
      </div>
    </Window>
  )
}

function Create() {
  const [ref, width] = usePictureWidth()
  return (
    <Tile
      area="hero"
      title={<b>A database in one command.</b>}
      picture={
        <div ref={ref} className="rb-picture rb-picture--hero" style={{ ['--rb-picture-width' as string]: `${width}px` }}>
          <Stage<Beat> width={width} height={300} theme="dark" initial={before} poster={after} play="once" script={create} className="rb-stage">
            {(s) => <Terminal on={s.on} fill={s.fill} layout={width < 600 ? 'compact' : 'wide'} />}
          </Stage>
        </div>
      }
    >
      Halite provisions it, runs your migrations and hands back a URL.
    </Tile>
  )
}

/* ---------------- Reads (stat) ---------------- */

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

function Reads() {
  const reduced = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(LEAD + STEP)
  return (
    <Tile area="stat" title={null}>
      <div ref={ref} className="rb-stat">
        <span className="rb-stat-lead">
          <Icon name="bolt" filled size={16} className="rb-bolt" />
          Reads in
        </span>
        <span className="rb-stat-number">
          <Count value={seen || reduced ? 4 : 0} duration={1300} />
          <span className="rb-stat-unit">ms</span>
        </span>
        <span className="rb-stat-label">at the median, from the replica nearest each user.</span>
      </div>
    </Tile>
  )
}

/* ---------------- Regions (diagram) ---------------- */

// Rough world positions on a 380 × 236 stage, the primary in Virginia
// Every pill stays inside x 46 to 334, the part the narrowest cell shows
const PRIMARY = { id: 'iad1', x: 124, y: 96 }
const REPLICAS = [
  { id: 'sfo1', x: 62, y: 58 },
  { id: 'gru1', x: 148, y: 196 },
  { id: 'lhr1', x: 196, y: 40 },
  { id: 'fra1', x: 232, y: 86 },
  { id: 'sin1', x: 270, y: 146 },
  { id: 'syd1', x: 286, y: 204 },
]

function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  // A gentle bow above the straight line, more for longer runs
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  return `M${a.x} ${a.y} Q${mx} ${my - d * 0.22} ${b.x} ${b.y}`
}

function Regions() {
  const [ref, width] = usePictureWidth()
  // Keep the region names native-size while moving their points inward.
  const point = (p: typeof PRIMARY) => ({ ...p, x: width < 360 ? 38 + (p.x - 62) / 224 * (width - 106) : p.x + (width - 380) / 2 })
  const primary = point(PRIMARY)
  const replicas = REPLICAS.map(point)
  return (
    <Tile
      area="map"
      title={<b>Replicas near every user.</b>}
      picture={
        <div ref={ref} className="rb-picture rb-picture--map">
          <Stage<Beat> width={width} height={236} theme="dark" initial={before} poster={after} play="once" script={beat(2)} className="rb-stage">
            {(s) => (
              <div className="rb-map" data-on={s.on || undefined}>
                <svg className="rb-map__lines" width={width} height={236} aria-hidden>
                  {replicas.map((r, i) => (
                    <g key={r.id} style={{ ['--i' as string]: i }}>
                      <path d={arc(primary, r)} className="rb-arc" />
                      <path d={arc(primary, r)} className="rb-arc rb-arc--lit" pathLength={1} />
                    </g>
                  ))}
                </svg>
                <span className="rb-node" data-primary style={{ left: primary.x, top: primary.y }}>
                  <span className="rb-node__dot" />
                  {PRIMARY.id}
                </span>
                {replicas.map((r, i) => (
                  <span key={r.id} className="rb-node" style={{ left: r.x, top: r.y, ['--i' as string]: i }}>
                    <span className="rb-node__dot" />
                    {r.id}
                  </span>
                ))}
              </div>
            )}
          </Stage>
        </div>
      }
    >
      Reads never cross an ocean.
    </Tile>
  )
}

/* ---------------- Restore (component) ---------------- */

// Write activity per minute, 13:00 to 14:40: varied, with a quiet lunch dip
const WRITES = Array.from({ length: 50 }, (_, i) => {
  const base = 0.38 + 0.3 * Math.sin(i * 0.37) * Math.cos(i * 0.11) + 0.18 * Math.sin(i * 1.7)
  const dip = i > 14 && i < 22 ? 0.45 : 1
  return Math.max(0.12, Math.min(1, base * dip + 0.12))
})
// Two minutes a bar from 13:00: the handle stops at 14:02, the table went at 14:04
const DROP = 31

function Restore() {
  const [ref, width] = usePictureWidth()
  const layout = width < 600 ? 'compact' : 'wide'
  return (
    <Tile
      area="restore"
      title={<b>Undo the bad migration.</b>}
      picture={
        <div ref={ref} className="rb-picture rb-picture--restore">
          <Stage<Beat> width={width} height={layout === 'compact' ? 236 : 216} theme="dark" initial={before} poster={after} play="once" script={beat(3)} className="rb-stage">
            {(s) => {
              const wide = layout === 'wide'
              const bars = wide ? WRITES : WRITES.slice(22, 46)
              const drop = wide ? DROP : DROP - 22
              return (
                <div className="rb-restore" data-on={s.on || undefined} data-layout={layout}>
                  <div className="rb-restore__head">
                    <span className="rb-restore__label">Restore shop to</span>
                    <States
                      value={s.on ? 'then' : 'now'}
                      align="start"
                      className="rb-restore__time"
                      states={{ now: 'Now', then: '14:02:59' }}
                    />
                  </div>
                  <div className="rb-track" style={{ ['--n' as string]: bars.length, ['--drop' as string]: drop }}>
                    {bars.map((h, i) => (
                      <span key={i} className="rb-track__bar" data-after={i >= drop || undefined} style={{ height: `${Math.round(h * 100)}%` }} />
                    ))}
                    <span className="rb-event">
                      <span className="rb-event__tag">DROP TABLE carts</span>
                    </span>
                    <span className="rb-handle" />
                  </div>
                  <div className="rb-axis" style={{ ['--n' as string]: bars.length }}>
                    {(wide ? [['13:00', 0], ['13:30', 15], ['14:00', 30]] : [['13:50', 3], ['14:10', 13]]).map(([t, at]) => (
                      <span key={t} style={{ ['--at' as string]: at }}>{t}</span>
                    ))}
                  </div>
                </div>
              )
            }}
          </Stage>
        </div>
      }
    >
      Rewind to any second in the last 30 days.
    </Tile>
  )
}

/* ---------------- Drivers (collection) ---------------- */

const ROWS = [
  ['ecto', 'prisma', 'drizzle', 'kysely', 'sqlalchemy', 'gorm', 'diesel', 'sequelize', 'typeorm', 'exposed'],
  ['knex', 'active record', 'sqlx', 'django', 'jooq', 'ent', 'mikro-orm', 'hibernate', 'pgx', 'slonik'],
  ['dapper', 'peewee', 'objection', 'bun', 'sqlc', 'psycopg', 'tortoise', 'doctrine', 'ebean', 'room'],
]

function Drivers() {
  return (
    <Tile
      area="orm"
      title={<b>Bring your ORM.</b>}
      picture={
        <div className="rb-picture rb-picture--orm">
          <Stage<Beat> width={1200} height={150} theme="dark" initial={before} poster={after} play="once" script={beat(4)} className="rb-stage">
            {(s) => (
              <div className="rb-rows" data-on={s.on || undefined}>
                {ROWS.map((row, r) => (
                  <div key={r} className="rb-row" style={{ ['--dir' as string]: r % 2 ? 1 : -1, ['--off' as string]: `${[-40, -96, -12][r]}px` }}>
                    {row.map((name) => (
                      <span key={name} className="rb-chip">
                        {name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Stage>
        </div>
      }
    >
      Halite speaks the Postgres wire protocol, so your driver already works.
    </Tile>
  )
}

export default function RuledBento() {
  return (
    <div className="ruled-bento">
      <div className="rb-grid">
        <Create />
        <Reads />
        <Regions />
        <Restore />
        <Drivers />
      </div>
    </div>
  )
}
