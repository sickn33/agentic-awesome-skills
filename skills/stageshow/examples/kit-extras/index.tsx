import { Avatar, BrandMark, Chip, Expand, Icon, Menu, Meter, Stage, Swap, type Act, type IconName, type Rect } from '../../kit'
import type { ReactNode } from 'react'
import '../parts/parts.css'
import './extras.css'

// A second specimen sheet: Chip, Swap, Avatar rings, Meter tones, Menu
// hover, Expand, the solid glyphs and BrandMark. A catalog of how each
// behaves, not a composition to copy.

const LINES = ['Ship it on Friday.', 'Ship it on Friday, once QA has signed off on the release.']
const STRENGTH = [
  { v: 0.2, tone: 'danger' },
  { v: 0.5, tone: 'warning' },
  { v: 0.95, tone: 'success' },
] as const
const GLYPHS: IconName[] = ['lock', 'play', 'pause', 'heart', 'star', 'home', 'mail', 'bell', 'user', 'bolt']

type S = { chip: boolean; line: number; rings: number; strength: number; menu: boolean; open: boolean; card: Rect }
const REST = { wide: { x: 700, y: 430 }, compact: { x: 316, y: 1478 } }
const ZERO: Rect = { x: 0, y: 0, width: 0, height: 0 }
const initial: S = { chip: true, line: 0, rings: 0, strength: -1, menu: true, open: false, card: ZERO }
const POSTER: S = { ...initial, line: 1, rings: 2, strength: 2 }

async function script(a: Act<S>) {
  await a.set({ card: a.rect('card', { layout: true }) })
  await a.wait(600)
  a.mark('chip')
  await a.click('chip-x')
  await a.set({ chip: false })
  await a.wait(700)
  await a.set({ chip: true })
  a.mark('swap')
  await a.set({ line: 1 })
  await a.wait(900)
  a.mark('rings')
  await a.set({ rings: 1 })
  await a.wait(500)
  await a.set({ rings: 2 })
  a.mark('meter')
  for (const i of [0, 1, 2]) {
    await a.set({ strength: i })
    await a.wait(450)
  }
  a.mark('menu')
  for (const t of ['m0', 'm1', 'm2']) {
    await a.move(t)
    await a.wait(600)
  }
  a.mark('expand')
  await a.click('card')
  await a.set({ open: true })
  await a.wait(1400)
  await a.set({ open: false })
  await a.wait(800)
  await a.move(REST[a.layout])
  a.mark('exit')
  await a.set({ line: 0, rings: 0, strength: -1, card: ZERO })
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

export default function KitExtras() {
  return (
    <Stage<S> specimen width={760} height={460} compact={{ below: 600, width: 358, height: 1514 }} initial={initial} poster={POSTER} script={script} cursor={{ at: REST }} className="pt">
      {(s) => (
        <div className="kx-grid">
          <Tile name="Chip">
            <div className="kx-chips">
              <Chip show={s.chip} remove="chip-x" gap={6}>Pro</Chip>
              <Chip>Open</Chip>
            </div>
          </Tile>
          <Tile name="Swap">
            <p className="kx-para">
              <Swap id={s.line}>{LINES[s.line]}</Swap>
            </p>
          </Tile>
          <Tile name="Avatar ring">
            <div className="kx-row">
              <Avatar name="Maya" size={26} ring={s.rings >= 1 ? 'confirmed' : 'waiting'} />
              <Avatar name="Jon" size={26} ring={s.rings >= 2 ? 'confirmed' : 'waiting'} />
              <Avatar name="Ana" size={26} ring={s.rings >= 2 ? 'declined' : 'waiting'} />
            </div>
          </Tile>
          <Tile name="Meter tone">
            <Meter className="kx-meter" value={s.strength < 0 ? 0 : STRENGTH[s.strength].v} tone={s.strength < 0 ? 'danger' : STRENGTH[s.strength].tone} />
          </Tile>
          <Tile name="Menu hover">
            <div className="kx-menu">
              <Menu targets={['m0', 'm1', 'm2']} items={['Rename', 'Duplicate', 'Move to…']} />
            </div>
          </Tile>
          <Tile name="Expand" className="kx-tall">
            <div className="kx-screen">
              <div className="kx-list">
                <div className="kx-card kx-card--ghost" />
                <div className="kx-card" data-target="card" data-cursor="hand" />
                <div className="kx-card kx-card--ghost" />
              </div>
              <Expand open={s.open} from={s.card} radius={12} className="kx-expand">
                <div className="kx-art" />
                <div className="kx-detail">
                  <span className="kx-bar" style={{ width: '60%' }} />
                  <span className="kx-bar" style={{ width: '85%' }} />
                  <span className="kx-bar" style={{ width: '70%' }} />
                </div>
              </Expand>
            </div>
          </Tile>
          <Tile name="Icon filled" className="kx-wide">
            <div className="kx-glyphs">
              {GLYPHS.map((g) => (
                <Icon key={g} name={g} filled size={16} />
              ))}
            </div>
          </Tile>
          <Tile name="BrandMark">
            <div className="kx-row">
              <BrandMark brand="slack" />
              <BrandMark brand="notion" />
              <BrandMark brand="linear" />
            </div>
          </Tile>
        </div>
      )}
    </Stage>
  )
}
