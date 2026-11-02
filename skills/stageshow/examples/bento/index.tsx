import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Avatar, Badge, Bar, BrandMark, Icon, Meter, Connector, Count, Stage, States, Text, Window, useReducedMotion } from '../../kit'
import type { Act, Layout, Rect } from '../../kit'
import { figma, notion, slack } from '../../assets/app-icons'
import './bento.css'

// The bar for a bento grid (references/bento.md): the features section of
// Kite, a spend management app for small teams. Five tiles, hero and strip.
//
// The tile list, written before any tile was built:
//
//   Tile          Span   Kind        The one thing                    Moves
//   Receipts      2 × 1  Hero UI     a receipt lands on its charge    the receipt drops in, Missing turns Matched
//   Close         1 × 1  Stat        "2 days", on the one dark tile   counts down from 9
//   Cards         1 × 1  Object      the card itself                  rises out of the crop
//   Approvals     1 × 1  Component   one request, Approve             the button presses and turns Approved
//   Coding        1 × 1  Diagram     three merchants, one account     the lines draw in
//
// One window in the whole grid (the hero's). Every neighbor is a different
// kind, across and down. Each picture is its own Stage at 1:1, pinned to its
// tile's bottom and cropped by the tile; the copy is page text beside it.
// Each tile plays one beat, once, as it scrolls in, 110ms after the tile
// before it in reading order.

const STEP = 110
const LEAD = 450

type Beat = { on: boolean }
const before: Beat = { on: false }
const after: Beat = { on: true }
const beat = (i: number) => async (a: Act<Beat>) => {
  await a.wait(LEAD + i * STEP)
  await a.set({ on: true })
}

function Tile({ area, title, children, picture, dark }: { area: string; title: ReactNode; children?: ReactNode; picture?: ReactNode; dark?: boolean }) {
  return (
    <section className={`kb-tile kb-tile--${area}`} data-dark={dark || undefined} data-crop>
      {title ? (
        <p className="kb-copy">
          {title} {children}
        </p>
      ) : (
        children
      )}
      {picture}
    </section>
  )
}

/* ---------------- Receipts (hero) ---------------- */

const ROWS = [
  { name: 74, who: 'A', amount: 44 },
  { real: true },
  { name: 58, who: 'J', amount: 38 },
  { name: 86, who: 'M', amount: 50 },
  { name: 64, who: 'A', amount: 42 },
]

function Receipt() {
  return (
    <span className="kb-receipt" aria-hidden>
      <Bar w={14} h={3} r={1.5} tone={4} />
      <Bar w={18} h={2} r={1} tone={3} />
      <Bar w={12} h={2} r={1} tone={3} />
      <Bar w={16} h={2} r={1} tone={3} />
    </span>
  )
}

function Ledger({ on, layout }: { on: boolean; layout: Layout }) {
  const wide = layout === 'wide'
  // Columns: merchant, name, receipt and status, amount, then filler the
  // tile crops. The status sits early in the row so it stays in view.
  const list = (
    <div className="kb-ledger">
      {ROWS.map((row, i) =>
        row.real ? (
          <div key={i} className="kb-row" data-real>
            <BrandMark name="Blue Bottle" size={26} />
            <Text className="kb-row-name">Blue Bottle</Text>
            <span className="kb-slot" data-on={on || undefined}>
              <Receipt />
              <States
                value={on ? 'matched' : 'missing'}
                align={wide ? 'start' : 'end'}
                className="kb-status"
                states={{
                  missing: <Badge tone="warning" className="kb-pill">No receipt</Badge>,
                  matched: (
                    <Badge tone="success" className="kb-pill" icon={<Icon name="check" size={12} />}>
                      Matched
                    </Badge>
                  ),
                }}
              />
            </span>
            <Text className="kb-row-amount">$18.40</Text>
            <span className="kb-row-rest">
              <Avatar name="Mara" size={20} />
              <Bar w={64} h={6} tone={2} />
            </span>
          </div>
        ) : (
          <div key={i} className="kb-row">
            <Bar w={26} h={26} r={7} tone={2} />
            <Bar w={row.name!} h={6} tone={3} />
            <span className="kb-slot">
              <Bar w={22} h={28} r={4} tone={1} />
              <Bar w={62} h={22} r={11} tone={1} />
            </span>
            <Bar w={row.amount!} h={6} tone={3} className="kb-row-amount" />
            <span className="kb-row-rest">
              <Bar w={20} h={20} r={10} tone={2} />
              <Bar w={56 + ((i * 13) % 20)} h={6} tone={2} />
            </span>
          </div>
        ),
      )}
    </div>
  )
  const toolbar = (
    <span className="kb-tools">
      <Bar w={54} h={24} r={7} tone={2} />
      <Bar w={24} h={24} r={7} tone={2} />
    </span>
  )
  if (!wide) return <Window title="Transactions" className="kb-window kb-window--compact" body={{ 'data-crop': '' }}>{list}</Window>
  return (
    <Window
      className="kb-window"
      body={{ 'data-crop': '' }}
      title="Transactions"
      toolbar={toolbar}
      sidebarWidth={156}
      sidebar={
        <nav className="kb-side">
          <span className="kb-logo" aria-hidden>
            <svg viewBox="0 0 16 16" width="12" height="12">
              <path d="M8 1.5 13 7 8 14.5 3 7Z" fill="currentColor" />
            </svg>
          </span>
          {[52, 70, 44, 58].map((w, i) => (
            <span key={i} className="kb-nav" data-active={i === 1 || undefined}>
              <Bar w={12} h={12} r={3} tone={i === 1 ? 4 : 2} />
              <Bar w={w} h={6} tone={i === 1 ? 4 : 2} />
            </span>
          ))}
        </nav>
      }
    >
      {list}
    </Window>
  )
}

// The tile owns the crop. Match its current width so an inner Stage never
// slices a window before the tile edge or shifts its content off the copy gutter.
function usePictureWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setWidth(Math.max(1, node.getBoundingClientRect().width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function Receipts() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="hero"
      title={<b>Every receipt, matched.</b>}
      picture={
        <div ref={picture} className="kb-picture kb-picture--hero">
          <Stage<Beat> width={width} height={width < 600 ? 300 : 286} initial={before} poster={after} play="once" script={beat(0)} className="kb-stage">
            {(s) => <Ledger on={s.on} layout={width < 600 ? 'compact' : 'wide'} />}
          </Stage>
        </div>
      }
    >
      Snap it or forward it, and Kite finds the charge it belongs to.
    </Tile>
  )
}

/* ---------------- Close (stat) ---------------- */

// Type, not a picture: page text in the tile, with one number that counts
// down once as the grid scrolls in.
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

function Close() {
  const reduced = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(LEAD + STEP)
  return (
    <Tile area="stat" dark title={null}>
      <div ref={ref} className="kb-stat">
        <span className="kb-stat-lead">Month-end close in</span>
        <span className="kb-stat-number">
          <Count value={seen || reduced ? 2 : 9} duration={1100} />
          <span className="kb-stat-unit"> days</span>
        </span>
        <span className="kb-stat-label">down from nine for the average team in its first quarter.</span>
      </div>
    </Tile>
  )
}

/* ---------------- Cards (object) ---------------- */

function Cards() {
  const goldId = useId()
  return (
    <Tile
      area="card"
      title={<b>A card for everyone.</b>}
      picture={
        <div className="kb-picture kb-picture--small">
          <Stage<Beat> width={360} height={206} initial={before} poster={after} play="once" script={beat(2)} className="kb-stage">
            {(s) => (
              <div className="kb-card" data-on={s.on || undefined}>
                <span className="kb-card-mark">
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
                    <path d="M8 1.5 13 7 8 14.5 3 7Z" fill="currentColor" />
                  </svg>
                  Kite
                </span>
                <svg className="kb-card-chip" viewBox="0 0 34 26" width="34" height="26" aria-hidden>
                  <defs>
                    <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#f3e2b0" />
                      <stop offset="0.5" stopColor="#d9bc78" />
                      <stop offset="1" stopColor="#b8954f" />
                    </linearGradient>
                  </defs>
                  <rect x="0.5" y="0.5" width="33" height="25" rx="4.5" fill={`url(#${goldId})`} stroke="#8f733a" strokeOpacity="0.6" />
                  <g fill="none" stroke="#8f733a" strokeOpacity="0.75" strokeWidth="0.8">
                    <path d="M0.5 9H11.5M0.5 17H11.5M22.5 9H33.5M22.5 17H33.5" />
                    <rect x="11.5" y="5.5" width="11" height="15" rx="2.5" />
                  </g>
                </svg>
                <span className="kb-card-name">Maya Chen</span>
                <span className="kb-card-last">•••• 2207</span>
              </div>
            )}
          </Stage>
        </div>
      }
    >
      Each with its own limit. No more reimbursements.
    </Tile>
  )
}

/* ---------------- Approvals (component) ---------------- */

function Approvals() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="approve"
      title={<b>Approve in one tap.</b>}
      picture={
        <div ref={picture} className="kb-picture kb-picture--aligned">
          <Stage<Beat> width={width} height={206} initial={before} poster={after} play="once" script={beat(3)} className="kb-stage">
            {(s) => (
              <div className="kb-request">
                <div className="kb-request-who">
                  <Avatar name="Jon" size={36} tone="accent" />
                  <span className="kb-request-text">
                    <Text className="kb-request-name">Jon Park</Text>
                    <Text className="kb-request-what">Figma, 3 seats</Text>
                  </span>
                  <Text className="kb-request-amount">$45</Text>
                </div>
                <div className="kb-request-actions">
                  <span className="kb-btn">Decline</span>
                  <span className="kb-btn kb-btn--primary" data-on={s.on || undefined}>
                    <States
                      value={s.on ? 'done' : 'ask'}
                      states={{
                        ask: 'Approve',
                        done: (
                          <>
                            <Icon name="check" size={14} /> Approved
                          </>
                        ),
                      }}
                    />
                  </span>
                </div>
                <div className="kb-request-budget">
                  <Bar w={86} h={6} tone={3} />
                  <Meter value={0.62} className="kb-meter" />
                </div>
              </div>
            )}
          </Stage>
        </div>
      }
    >
      Requests go straight to whoever owns the budget.
    </Tile>
  )
}

/* ---------------- Coding (diagram) ---------------- */

// Real app icons, from the apps themselves (assets/app-icons.ts)
const MERCHANTS = [
  { name: 'Figma', icon: figma },
  { name: 'Slack', icon: slack },
  { name: 'Notion', icon: notion },
]

function Coding() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="code"
      title={<b>Coded as it happens.</b>}
      picture={
        <div ref={picture} className="kb-picture kb-picture--aligned">
          <Stage<Beat> width={width} height={206} initial={before} poster={after} play="once" script={beat(4)} className="kb-stage">
            {(s, rect) => {
              const right = (r: Rect) => ({ x: r.x + r.width, y: r.y + r.height / 2 })
              const left = (r: Rect) => ({ x: r.x, y: r.y + r.height / 2 })
              const to = rect('account')
              return (
                <>
                  <div className="kb-merchants">
                    {MERCHANTS.map((m) => (
                      <span key={m.name} className="kb-merchant" data-target={`m-${m.name}`}>
                        <img className="kb-merchant-icon" src={m.icon} alt="" />
                        <Text>{m.name}</Text>
                      </span>
                    ))}
                  </div>
                  <span className="kb-account" data-target="account" data-on={s.on || undefined}>
                    <span className="kb-account-code">6100</span>
                    <Text>Software</Text>
                  </span>
                  {to &&
                    MERCHANTS.map((m, i) => {
                      const from = rect(`m-${m.name}`)
                      return from ? <Connector key={m.name} from={right(from)} to={left(to)} route="step" show={s.on} className={`kb-line kb-line--${i}`} /> : null
                    })}
                </>
              )
            }}
          </Stage>
        </div>
      }
    >
      Every charge lands in the right account, no spreadsheet.
    </Tile>
  )
}

export default function Bento() {
  return (
    <div className="kite-bento">
      <div className="kb-grid">
        <Receipts />
        <Close />
        <Cards />
        <Approvals />
        <Coding />
      </div>
    </div>
  )
}
