import { Badge, Bar, Camera, Chart, Code, Field, Segmented, Scroll, Slot, Stage, Tabs, Toggle, type Act, type Rect } from '../../kit'
import type { ReactNode } from 'react'
import './controls.css'

// A specimen sheet for the controls, Code, Chart, Slot, scrolling and the
// camera, one tile each. A catalog, not a composition: for framing, copy the
// gold examples (hero-demo, static-card, story, payout-flow).

const DATA = [12, 18, 15, 24, 22, 31, 28, 36]
const MORE = [12, 18, 15, 24, 22, 31, 34, 44]
const DIFF = [
  { text: 'function load(id) {' },
  { text: '  let r = fetch(id)', kind: 'del' as const },
  { text: '  let r = cache.get(id)', kind: 'add' as const },
  { text: '  return r.json()' },
  { text: '}' },
]
const ROWS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Vandelay', 'Stark', 'Wayne']

type S = {
  email: string
  focus: boolean
  seg: number
  on: boolean
  tab: number
  lines: number
  data: number[]
  carry: { x: number; y: number; w: number; settle?: boolean } | null
  moved: boolean
  leaving: boolean
  focusTile: Rect | null
}

const initial: S = { email: '', focus: false, seg: 0, on: false, tab: 0, lines: 0, data: DATA, carry: null, moved: false, leaving: false, focusTile: null }
const POSTER: S = { ...initial, email: 'ada@acme.dev', seg: 1, on: true, tab: 1, lines: 5, data: MORE, moved: true }

async function script(a: Act<S>) {
  await a.wait(500)
  a.mark('field')
  await a.click('email')
  await a.set({ focus: true })
  await a.type('email', 'ada@acme.dev')
  await a.wait(300)

  a.mark('controls')
  // Pressed beside the word, never on it
  await a.click({ at: 'seg-1', x: 0.84, y: 0.7 })
  await a.set({ seg: 1, focus: false })
  await a.click('toggle')
  await a.set({ on: true })
  await a.click('tab-1')
  await a.set({ tab: 1 })

  a.mark('code')
  a.move('rest')
  for (let i = 1; i <= DIFF.length; i++) {
    a.put({ lines: i })
    await a.wait(140)
  }
  await a.set({ data: MORE })
  await a.wait(600)

  a.mark('slot')
  // Picked up off center, as a hand does; the grab offset comes from the
  // same fractions, so the card never jumps under the hand
  const GRAB = { x: 0.72, y: 0.24 }
  await a.move({ at: 'card', ...GRAB })
  const card = a.rect('card')
  // Aim at where the card will sit once the slot has opened (the column's
  // first place), not at the slot itself, which is still opening mid-drag
  const col = a.rect('col-b')
  const end = { x: col.x + 6, y: col.y + 6 }
  const grab = { x: card.width * GRAB.x, y: card.height * GRAB.y }
  await a.drag({ x: end.x + grab.x, y: end.y + grab.y }, (at) => {
    a.put({ carry: { x: at.x - grab.x, y: at.y - grab.y, w: card.width } })
  })
  // Settle the tilt and lift in place, then swap in the real card, unmoved
  await a.set({ carry: { ...end, w: card.width, settle: true } })
  await a.wait(220)
  await a.set({ carry: null, moved: true })
  await a.wait(400)

  a.mark('scroll')
  await a.scroll('list', 'row-5')
  await a.wait(500)

  a.mark('camera')
  await a.move('rest')
  await a.set({ focusTile: a.rect(a.layout === 'compact' ? 'code-detail' : 't-code', { layout: true }) })
  await a.wait(2200)
  await a.set({ focusTile: null })
  await a.wait(1400)

  a.mark('exit')
  // Undo on screen, never at the seam: the list scrolls back, the card fades
  // out of B as its slot closes and back into A as that one opens
  await a.scroll('list', 0)
  await a.set({ leaving: true })
  await a.wait(220)
  await a.set({ ...initial, data: DATA })
  await a.move('rest')
  await a.wait(900)
}

function Tile({ name, target, children }: { name: string; target?: string; children: ReactNode }) {
  return (
    <div className="ct-tile" data-target={target}>
      <span className="ct-name">{name}</span>
      <div className="ct-body">{children}</div>
    </div>
  )
}

function Card({ ghost }: { ghost?: boolean }) {
  return (
    <div className="ct-card" data-ghost={ghost || undefined}>
      <Bar w="72%" h={6} tone={4} />
      <Badge tone="accent">Review</Badge>
    </div>
  )
}

export default function Controls() {
  return (
    <Stage<S> specimen width={760} height={460} compact={{ below: 600, width: 358, height: 1312 }} initial={initial} poster={POSTER} script={script} cursor={{ at: 'rest', style: 'arrow', ripple: true }} className="ct">
      {(s, _, layout) => (
        <>
          <Camera focus={s.focusTile} pad={layout === 'compact' ? 24 : 32}>
            <div className="ct-grid">
              <Tile name="Field">
                <Field label="Email" value={s.email} placeholder="you@company.com" focused={s.focus} status={s.email.endsWith('.dev') ? 'valid' : undefined} box={{ 'data-target': 'email' }} className="ct-field" />
              </Tile>

              <Tile name="Segmented, Toggle, Tabs">
                <Segmented items={['Monthly', 'Yearly']} value={s.seg} targets={['seg-0', 'seg-1']} />
                <div className="ct-switch">
                  <span>Auto-renew</span>
                  <Toggle on={s.on} data-target="toggle" data-cursor="hand" />
                </div>
                <Tabs items={['Overview', 'Usage', 'Billing']} value={s.tab} targets={['tab-0', 'tab-1', 'tab-2']} />
              </Tile>

              <Tile name="Code" target="t-code">
                <div className="ct-code-focus" data-target="code-detail">
                  <Code lines={DIFF} start={12} count={s.lines} className="ct-code" />
                </div>
              </Tile>

              <Tile name="Chart">
                <Chart data={s.data} width={190} height={64} />
                <Chart data={s.data} kind="bars" width={190} height={34} />
              </Tile>

              <Tile name="Slot">
                <div className="ct-cols">
                  <div className="ct-col">
                    <Slot open={!s.moved && !s.carry} height={50} gap={6}>
                      {!s.moved && !s.carry && (
                        <div data-target="card" data-cursor="open" className="ct-fade-in">
                          <Card />
                        </div>
                      )}
                    </Slot>
                    <Bar w="100%" h={50} r={8} tone={1} />
                  </div>
                  <div className="ct-col" data-target="col-b">
                    <Slot open={!!s.carry || s.moved} height={50} gap={6} dashed={!!s.carry} data-target="dropzone">
                      {s.moved && (
                        <div className="ct-fade" data-out={s.leaving || undefined}>
                          <Card />
                        </div>
                      )}
                    </Slot>
                    <Bar w="100%" h={50} r={8} tone={1} />
                  </div>
                </div>
              </Tile>

              <Tile name="Scroll">
                <Scroll name="list" className="ct-list">
                  {ROWS.map((r, i) => (
                    <div key={r} className="ct-row" data-target={`row-${i}`}>
                      <Bar w={14} h={14} r={7} tone={2} />
                      {r}
                    </div>
                  ))}
                </Scroll>
              </Tile>
            </div>
            {s.carry && (
              <div className="ct-carry" data-settle={s.carry.settle || undefined} style={{ left: s.carry.x, top: s.carry.y, width: s.carry.w }}>
                <Card />
              </div>
            )}
          </Camera>
          <span className="ct-rest" data-target="rest" />
        </>
      )}
    </Stage>
  )
}
