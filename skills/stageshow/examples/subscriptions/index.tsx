import { Avatar, Bar, Chart, Collapse, Count, Fly, Roll, Spinner, Stage, States, Window, type Act, type Rect } from '../../kit'
import './subs.css'

// A system story, no cursor. A customer subscribes on a checkout, the price
// rides into the company's billing dashboard as the new row's amount, and MRR
// rolls up. It happens twice, then the scene changes to a second company and
// happens once more: a different business on the same product, which is also
// how the loop resets without rewinding. The checkout and the window are the
// two places; the chip is the only thing that travels between them.

type Pulse = { name: string; initial: string; plan: string; price: number }
type Scene = { org: string; tile: string; mrr: number; history: number[]; pulses: Pulse[] }

const SCENES: Scene[] = [
  {
    org: 'Northwind',
    tile: 'N',
    mrr: 48210,
    history: [31, 33, 32, 36, 38, 37, 41, 44, 43, 46, 48.2],
    pulses: [
      { name: 'Maya Lin', initial: 'M', plan: 'Pro', price: 49 },
      { name: 'Studio Kite', initial: 'S', plan: 'Team', price: 99 },
    ],
  },
  {
    org: 'Brightside',
    tile: 'B',
    mrr: 12480,
    history: [6, 6.4, 7.1, 7, 8.2, 8.8, 9.1, 10.4, 10.9, 11.6, 12.48],
    pulses: [{ name: 'Leo Park', initial: 'L', plan: 'Plus', price: 29 }],
  },
]

type Pay = 'idle' | 'busy' | 'paid' | 'done'
type S = {
  scene: number
  // per scene: rows opened, rows landed, which pulse the checkout shows, its button
  open: [number, number]
  landed: [number, number]
  k: [number, number]
  pay: [Pay, Pay]
  fly: null | { scene: number; i: number; from: Rect; to: Rect; go: boolean }
}

const START: S = { scene: 0, open: [0, 0], landed: [0, 0], k: [0, 0], pay: ['idle', 'idle'], fly: null }
const POSTER: S = { ...START, open: [2, 0], landed: [2, 0], k: [1, 0], pay: ['done', 'idle'] }

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
const set2 = <T,>(pair: [T, T], i: number, v: T): [T, T] => (i === 0 ? [v, pair[1]] : [pair[0], v])

async function pulse(a: Act<S>, sc: number, i: number) {
  await a.set((s) => ({ pay: set2(s.pay, sc, 'busy') }))
  await a.wait(700)
  // Paid: the chip lifts off the button at once and the new row's space opens
  // under it while it travels. Where it lands is the top of the list as it is
  // now (the new row opens there), at the right edge where amounts sit.
  const list = a.rect(`list-${sc}`, { layout: true })
  const row = a.rect(`row-${sc}-${i}`, { layout: true })
  const pill = a.rect(`pill-${sc}-${i}`, { layout: true })
  const b = a.rect(`pay-${sc}`, { layout: true })
  const size = { width: pill.width, height: pill.height }
  // The row keeps its full layout height inside Collapse. Measure the pill's
  // actual inset, including the row's border, so the handoff has no half-pixel hop.
  const to = { ...pill, y: list.y + pill.y - row.y }
  const from = { x: b.x + b.width / 2 - pill.width / 2, y: b.y + b.height / 2 - pill.height / 2, ...size }
  await a.set((s) => ({ pay: set2(s.pay, sc, 'paid'), fly: { scene: sc, i, from, to, go: false } }))
  // The chip buds off the button before it sets off
  await a.wait(200)
  await a.set((s) => ({ open: set2(s.open, sc, i + 1), fly: { ...s.fly!, go: true } }))
  await a.wait(900)
  // Landed: the real pill takes over in the same frame the chip goes
  await a.set((s) => ({ fly: null, landed: set2(s.landed, sc, i + 1), pay: set2(s.pay, sc, 'done') }))
}

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark('first')
  await pulse(a, 0, 0)
  await a.wait(700)
  // The checkout moves on to the next customer: only the plan and price change
  await a.set((s) => ({ pay: set2(s.pay, 0, 'idle'), k: set2(s.k, 0, 1) }))
  await a.wait(1000)
  a.mark('second')
  await pulse(a, 0, 1)
  await a.wait(2000)

  a.mark('scene')
  await a.set({ scene: 1 })
  await a.wait(700)
  // Northwind resets while it's out of sight
  await a.snap((s) => ({ open: set2(s.open, 0, 0), landed: set2(s.landed, 0, 0), k: set2(s.k, 0, 0), pay: set2(s.pay, 0, 'idle') }))
  await a.wait(500)
  await pulse(a, 1, 0)
  await a.wait(2000)

  await a.set({ scene: 0 })
  await a.wait(700)
  await a.snap((s) => ({ open: set2(s.open, 1, 0), landed: set2(s.landed, 1, 0), pay: set2(s.pay, 1, 'idle') }))
  await a.wait(300)
}

function Checkout({ sc, s }: { sc: number; s: S }) {
  const scene = SCENES[sc]
  const p = scene.pulses[s.k[sc]]
  return (
    <section className="sb-checkout" data-in={s.scene === sc || undefined}>
      <div className="sb-checkout__head">
        <span className="sb-tile" data-scene={sc}>
          {scene.tile}
        </span>
        <span className="sb-strong">
          {scene.org} <Roll variant="fade">{p.plan}</Roll>
        </span>
      </div>
      <div className="sb-price">
        <Roll>{`$${p.price}`}</Roll>
        <span className="sb-muted">per month</span>
      </div>
      <div className="sb-fields">
        <div className="sb-field">
          <Bar w={sc === 0 ? 96 : 82} h={5} tone={3} />
        </div>
        <div className="sb-field">
          <Bar w={22} h={12} r={3} tone={2} />
          <Bar w={70} h={5} tone={3} />
        </div>
      </div>
      <div className="sb-pay" data-target={`pay-${sc}`} data-state={s.pay[sc]}>
        <States
          value={s.pay[sc]}
          states={{
            idle: 'Subscribe',
            busy: <Spinner size={14} />,
            // The amount is the feedback while it leaves the button. Showing
            // the success label underneath would put two messages in one place.
            paid: null,
            done: (
              <span className="sb-done">
                <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
                  <path d="M3.5 8.5 6.5 11.5 12.5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Subscribed
              </span>
            ),
          }}
        />
      </div>
    </section>
  )
}

// Filler rows that were there before the story: they keep their place below
const OLD = [
  { name: 62, amount: 34 },
  { name: 78, amount: 40 },
  { name: 54, amount: 34 },
  { name: 70, amount: 40 },
]

function Dashboard({ sc, s, compact }: { sc: number; s: S; compact: boolean }) {
  const scene = SCENES[sc]
  const added = scene.pulses.slice(0, s.landed[sc]).reduce((t, p) => t + p.price, 0)
  const mrr = scene.mrr + added
  const data = [...scene.history.slice(0, -1), mrr / 1000]
  return (
    <div className="sb-scene" data-on={s.scene === sc || undefined} aria-hidden={s.scene !== sc || undefined}>
      <aside className="sb-side">
        <div className="sb-org">
          <span className="sb-tile" data-scene={sc}>
            {scene.tile}
          </span>
          <span className="sb-strong">{scene.org}</span>
        </div>
        {[46, 58, 40, 52].map((w, i) => (
          <div key={i} className="sb-nav" data-on={i === 1 || undefined}>
            <Bar w={10} h={10} r={3} tone={i === 1 ? 4 : 3} />
            <Bar w={w} h={5} tone={i === 1 ? 4 : 2} />
          </div>
        ))}
      </aside>
      <main className="sb-main">
        <div className="sb-head">
          <span className="sb-title">
            {/* Compact drops the sidebar, so the company moves up beside the title */}
            <span className="sb-tile sb-head-tile" data-scene={sc}>
              {scene.tile}
            </span>
            Subscriptions
          </span>
          <Bar w={56} h={22} r={6} tone={2} />
        </div>
        <div className="sb-mrr">
          <div className="sb-mrr__text">
            <span className="sb-muted">MRR</span>
            <Count className="sb-mrr__value" value={mrr} duration={900} format={money} />
          </div>
          <Chart data={data} width={compact ? 110 : 190} height={52} className="sb-chart" />
        </div>
        <div className="sb-list" data-target={`list-${sc}`}>
          {/* Newest first: each new subscriber opens at the top and pushes the rest down */}
          {scene.pulses
            .map((p, i) => ({ p, i }))
            .reverse()
            .map(({ p, i }) => (
              <Collapse key={p.name} open={s.open[sc] > i} reveal="clip">
                <div className="sb-row" data-target={`row-${sc}-${i}`} data-landed={s.landed[sc] > i || undefined}>
                  <Avatar name={p.name} size={22} className="sb-av" data-scene={sc} data-i={i} style={{ background: undefined, color: undefined }} />
                  <span className="sb-name">{p.name}</span>
                  <span className="sb-plan">{p.plan}</span>
                  <span className="sb-pill" data-target={`pill-${sc}-${i}`}>
                    +${p.price}
                  </span>
                </div>
              </Collapse>
            ))}
          {OLD.map((r, i) => (
            <div key={i} className="sb-row sb-row--old">
              <Bar w={22} h={22} r={11} tone={2} />
              <Bar w={r.name} h={5} tone={3} />
              <Bar w={r.amount} h={5} tone={2} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function Subscriptions() {
  return (
    <Stage<S> width={720} height={440} compact={{ below: 600, width: 358, height: 460 }} initial={START} poster={POSTER} script={script} className="sb">
      {(s, _rect, layout) => (
        <>
          <div className="sb-wash" />
          <Window url="dashboard.tally.com/subscriptions" className="sb-window">
            <div className="sb-scenes">
              <Dashboard sc={0} s={s} compact={layout === 'compact'} />
              <Dashboard sc={1} s={s} compact={layout === 'compact'} />
            </div>
          </Window>
          <Checkout sc={0} s={s} />
          <Checkout sc={1} s={s} />
          {s.fly && (
            <Fly from={s.fly.from} to={s.fly.to} go={s.fly.go} held duration={900}>
              <span className="sb-pill sb-pill--chip">+${SCENES[s.fly.scene].pulses[s.fly.i].price}</span>
            </Fly>
          )}
        </>
      )}
    </Stage>
  )
}
