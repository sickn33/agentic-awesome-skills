import { Bar, Check, Connector, Icon, LockScreen, Menu, Meter, Notification, Phone, WALLPAPER, Popover, Spinner, Stage, States, Stream, type Act } from '../../kit'
import { testFlight } from '../../assets/app-icons'
import type { ReactNode } from 'react'
import './parts.css'

// A specimen sheet for the kit's newer parts, one tile each, playing in turn.
// It is a catalog, not a composition: for framing, copy the gold examples
// (hero-demo, static-card, story, payout-flow), not this layout.

const REWRITE = 'Ship faster with a preview for every branch.'
const CHANGED = new Set([3, 4, 5])

type S = {
  button: 'idle' | 'busy' | 'done'
  check: 'idle' | 'pending' | 'done'
  meter: number
  words: number
  marks: boolean
  steps: number
  menu: boolean
  item: number
  note: boolean
}

const initial: S = { button: 'idle', check: 'idle', meter: 0.25, words: 0, marks: false, steps: 0, menu: false, item: -1, note: false }
const POSTER: S = { button: 'done', check: 'done', meter: 0.8, words: 99, marks: true, steps: 2, menu: true, item: 1, note: true }

async function script(a: Act<S>) {
  await a.wait(600)
  a.mark('states')
  await a.click('deploy')
  await a.set({ button: 'busy', check: 'pending' })
  await a.wait(1300)
  await a.set({ button: 'done', check: 'done', meter: 0.8 })
  await a.wait(500)

  a.mark('stream')
  a.move('rest')
  for (let i = 1; i <= REWRITE.split(' ').length; i++) {
    a.put({ words: i })
    await a.wait(90)
  }
  await a.wait(300)
  await a.set({ marks: true })
  await a.wait(400)

  a.mark('connector')
  await a.set({ steps: 1 })
  await a.wait(1000)
  await a.set({ steps: 2 })
  await a.wait(500)

  a.mark('menu')
  await a.click('row', { right: true })
  await a.set({ menu: true })
  await a.wait(350)
  for (const i of [0, 1, 2]) {
    a.put({ item: i })
    await a.wait(280)
  }
  await a.click()
  await a.set({ menu: false, note: true })
  a.move('rest')
  await a.wait(2600)

  a.mark('exit')
  await a.set(initial)
  await a.wait(1000)
}

function Tile({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  return (
    <div className={`pt-tile${className ? ` ${className}` : ''}`}>
      <span className="pt-name">{name}</span>
      <div className="pt-body">{children}</div>
    </div>
  )
}

export default function Parts() {
  return (
    <Stage<S> specimen width={760} height={460} compact={{ below: 600, width: 358, height: 1532 }} initial={initial} poster={POSTER} script={script} cursor={{ at: 'rest' }} className="pt">
      {(s, rect, layout) => {
        const srv = rect('srv')
        const ep = rect('ep')
        const row = rect('row')
        const y = srv.y + srv.height / 2
        return (
          <>
            <div className="pt-grid">
              <Tile name="States" className="pt-a">
                <span className="pt-button" data-target="deploy" data-cursor="hand" data-state={s.button}>
                  <States
                    value={s.button}
                    states={{
                      idle: <>Deploy</>,
                      busy: (
                        <>
                          <Spinner size={13} />
                          Deploying
                        </>
                      ),
                      done: (
                        <>
                          <Icon name="check" size={13} stroke={2} />
                          Deployed
                        </>
                      ),
                    }}
                  />
                </span>
              </Tile>

              <Tile name="Check, Meter" className="pt-b">
                <div className="pt-status">
                  <Check on={s.check === 'done'} pending={s.check === 'pending'} size={18} />
                  <span>storefront</span>
                </div>
                <Meter value={s.meter} className="pt-meter" />
              </Tile>

              <Tile name="Stream" className="pt-c">
                <p className="pt-copy">
                  <Stream text={REWRITE} count={s.words} mark={(_, i) => s.marks && CHANGED.has(i)} />
                </p>
                <span className="pt-rest" data-target="rest" />
              </Tile>

              <Tile name="Connector" className="pt-d">
                <div className="pt-ends">
                  <span className="pt-end" data-target="srv">
                    <Bar w={34} h={6} tone={4} />
                  </span>
                  <span className="pt-end" data-target="ep">
                    <Bar w={34} h={6} tone={4} />
                  </span>
                </div>
              </Tile>

              <Tile name="Popover, Menu" className="pt-e">
                <div className="pt-rows">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="pt-row" data-target={i === 0 ? 'row' : undefined} data-on={(i === 0 && s.menu) || undefined}>
                      <Bar w={14} h={14} r={4} tone={2} />
                      <Bar w={[120, 90, 104][i]} h={6} />
                    </div>
                  ))}
                </div>
              </Tile>

              <Tile name="LockScreen satellite" className="pt-f">
                <Phone width={layout === 'compact' ? 280 : 150} dark wallpaper={WALLPAPER}>
                  <LockScreen size="satellite" stack="top">
                    <Notification
                      data-show={s.note || undefined}
                      className="pt-note"
                      icon={<img src={testFlight} alt="" />}
                      title="Promoted"
                      body="storefront is live with this build."
                    />
                  </LockScreen>
                </Phone>
              </Tile>
            </div>

            <Connector from={{ x: srv.x + srv.width, y: y - 6 }} to={{ x: ep.x, y: y - 6 }} route="straight" show={s.steps >= 1} arrow />
            <Connector from={{ x: ep.x, y: y + 6 }} to={{ x: srv.x + srv.width, y: y + 6 }} route="straight" show={s.steps >= 2} arrow dashed />

            <Popover show={s.menu} className="pt-menu" style={{ left: row.x + 64, top: row.y + row.height + 4 }}>
              <Menu items={['Redeploy', 'Copy URL', 'Promote']} value={s.item} />
            </Popover>
          </>
        )
      }}
    </Stage>
  )
}
