import { AppWindow, ArrowLeft, BookOpen, Globe, Search, Calculator, Calendar, ChevronDown, ClipboardList, Folder, Image, Link, Music, Settings, Text as TextIcon, type LucideIcon } from 'lucide-react'
import { Bar, Collapse, Stage, Text, type Act, type Layout } from '../../kit'
import './raycast.css'

// Raycast over a blurred desktop. Type "clip", Clipboard History is the first
// result, Enter pushes the command, the list opens with its preview pane,
// Down moves to a copied color, Esc pops back to root search (the loop).

type S = { query: string; view: 'root' | 'clip'; sel: number }

const initial: S = { query: '', view: 'root', sel: 0 }

type Row = { id: string; icon: LucideIcon; tile: string; title: number; sub: number; acc: number }

// Root rows. Clipboard History is its own row; the rest are placeholders.
const ROWS: Row[] = [
  { id: 'r1', icon: Folder, tile: '#3d8bfd', title: 52, sub: 0, acc: 56 },
  { id: 'r2', icon: Calendar, tile: '#ff5f57', title: 64, sub: 40, acc: 50 },
  { id: 'r3', icon: Music, tile: '#fc3c64', title: 44, sub: 0, acc: 56 },
  { id: 'r4', icon: Settings, tile: '#8e8e93', title: 78, sub: 46, acc: 50 },
  { id: 'r5', icon: AppWindow, tile: '#5e5ce6', title: 58, sub: 0, acc: 56 },
  { id: 'r6', icon: Calculator, tile: '#ff9f0a', title: 70, sub: 0, acc: 50 },
  { id: 'r7', icon: Image, tile: '#30b0c7', title: 86, sub: 52, acc: 50 },
  { id: 'r8', icon: Folder, tile: '#3d8bfd', title: 66, sub: 0, acc: 56 },
]

// Which rows survive each query, in the order Raycast ranks them.
function shown(q: string): string[] {
  if (q === '') return ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']
  if (q === 'c') return ['ch', 'r2', 'r6', 'r3']
  if (q === 'cl') return ['ch', 'r6', 'r7']
  return ['ch', 'r7']
}

const FALLBACK = [
  { icon: Globe, tile: '#0a84ff', title: 92, acc: 50 },
  { icon: Search, tile: '#636366', title: 74, acc: 56 },
  { icon: BookOpen, tile: '#34c759', title: 60, acc: 50 },
]

type Entry = { kind: 'text' | 'color' | 'link' | 'image'; label?: string; w: number }
const ENTRIES: Entry[] = [
  { kind: 'text', label: 'Ship the new onboarding on Thursday', w: 0 },
  { kind: 'color', label: '#FF6363', w: 0 },
  { kind: 'link', w: 96 },
  { kind: 'text', w: 120 },
  { kind: 'image', w: 82 },
  { kind: 'text', w: 104 },
  { kind: 'link', w: 74 },
]

async function script(a: Act<S>) {
  await a.wait(1000)
  a.mark('type')
  await a.type('query', 'clip', { interval: 150 })
  await a.wait(900)
  a.mark('open')
  await a.key('enter')
  await a.set({ view: 'clip', sel: 0 })
  await a.wait(2200)
  a.mark('down')
  await a.key('down')
  await a.set({ sel: 1 })
  await a.wait(2400)
  a.mark('back')
  await a.key('esc')
  await a.set({ view: 'root', query: '', sel: 0 })
  await a.wait(1400)
}

function EntryIcon({ e }: { e: Entry }) {
  if (e.kind === 'color') return <span className="rc-swatch" />
  const I = e.kind === 'link' ? Link : e.kind === 'image' ? Image : TextIcon
  return <I className="rc-entry-icon" size={15} strokeWidth={1.75} />
}

function Root({ s }: { s: S }) {
  const vis = shown(s.query)
  const first = vis[0]
  return (
    <div className="rc-page rc-root" data-show={s.view === 'root' || undefined}>
      <div className="rc-search">
        <span className="rc-input">
          {s.query && <span className="rc-query">{s.query}</span>}
          <span key={s.query} className="rc-caret" />
          <span className="rc-placeholder" data-hidden={!!s.query || undefined}>
            Search for apps and commands...
          </span>
        </span>
      </div>
      <div className="rc-list">
        <div className="rc-section">
          <span className="rc-heads">
            <Text className="rc-head" data-show={!s.query || undefined}>Suggestions</Text>
            <Text className="rc-head" data-show={!!s.query || undefined}>Results</Text>
          </span>
        </div>
        <Collapse className="rc-filter" open={vis.includes('ch')}>
            <div className="rc-row" data-selected={first === 'ch' || undefined}>
              <span className="rc-tile" style={{ background: '#ff6363' }}>
                <ClipboardList size={13} strokeWidth={2.25} />
              </span>
              <Text className="rc-title">Clipboard History</Text>
              <Text className="rc-sub">Raycast</Text>
              <span className="rc-spacer" />
              <Text className="rc-acc">Command</Text>
            </div>
        </Collapse>
        {ROWS.map((r) => {
          const I = r.icon
          return (
            <Collapse key={r.id} className="rc-filter" open={vis.includes(r.id)}>
                <div className="rc-row" data-selected={first === r.id || undefined}>
                  <span className="rc-tile" style={{ background: r.tile }}>
                    <I size={13} strokeWidth={2.25} />
                  </span>
                  <Bar w={r.title} h={7} tone={5} />
                  {r.sub > 0 && <Bar w={r.sub} h={7} tone={3} />}
                  <span className="rc-spacer" />
                  <Bar w={r.acc} h={6} tone={3} />
                </div>
            </Collapse>
          )
        })}
        <Collapse className="rc-filter" open={!!s.query}>
          <div className="rc-section">
            <span className="rc-heads">
              <Text className="rc-head" data-show>{`Use "${s.query || 'clip'}" with...`}</Text>
            </span>
          </div>
          {FALLBACK.map((f, i) => {
            const I = f.icon
            return (
              <div key={i} className="rc-row">
                <span className="rc-tile" style={{ background: f.tile }}>
                  <I size={13} strokeWidth={2.25} />
                </span>
                <Bar w={f.title} h={7} tone={5} />
                <span className="rc-spacer" />
                <Bar w={f.acc} h={6} tone={3} />
              </div>
            )
          })}
        </Collapse>
      </div>
    </div>
  )
}

function Clip({ s, layout }: { s: S; layout: Layout }) {
  const compact = layout === 'compact'
  return (
    <div className="rc-page rc-clip" data-show={s.view === 'clip' || undefined}>
      <div className="rc-search">
        <span className="rc-back">
          <ArrowLeft size={14} strokeWidth={2} />
        </span>
        <span className="rc-input">
          <span className="rc-caret" />
          <span className="rc-placeholder">Type to filter entries...</span>
        </span>
        <span className="rc-dropdown">
          <Text>All Types</Text>
          <ChevronDown size={13} strokeWidth={2} />
        </span>
      </div>
      <div className="rc-split">
        <div className="rc-entries">
          <div className="rc-section">
            <Text>Today</Text>
          </div>
          {ENTRIES.map((e, i) => (
            <div key={i} className="rc-row rc-entry" data-selected={s.sel === i || undefined}>
              <EntryIcon e={e} />
              {e.label ? <Text className="rc-title rc-clamp">{e.label}</Text> : <Bar w={compact ? Math.round(e.w * 0.7) : e.w} h={7} tone={4} />}
            </div>
          ))}
        </div>
        <div className="rc-preview">
          <div className="rc-preview-top">
            <div className="rc-layer" data-show={s.sel === 0 || undefined}>
              <Text className="rc-preview-text" wrap>
                Ship the new onboarding on Thursday
              </Text>
            </div>
            <div className="rc-layer rc-layer-color" data-show={s.sel === 1 || undefined}>
              <span className="rc-big-swatch" />
              <Text className="rc-preview-text">#FF6363</Text>
            </div>
          </div>
          <div className="rc-info">
            <Text className="rc-info-head">Information</Text>
            {[
              [58, 46, 52],
              [70, 34, 28],
              [44, 60, 66],
              [62, 52, 40],
            ].map(([l, v0, v1], i) => (
              <div key={i} className="rc-info-row">
                <Bar w={l} h={6} tone={3} />
                <span className="rc-info-val">
                  <Bar className="rc-v" data-show={s.sel === 0 || undefined} w={v0} h={6} tone={4} />
                  <Bar className="rc-v" data-show={s.sel === 1 || undefined} w={v1} h={6} tone={4} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RaycastDemo() {
  return (
    <Stage width={760} height={440} compact={{ below: 560, width: 400, height: 380 }} initial={initial} script={script} theme="dark" keys="bottom" className="rc-stage">
      {(s, _rect, layout) => (
        <div className="rc-desktop" data-layout={layout}>
          <div className="rc-wallpaper" />
          <div className="rc-menubar">
            <span className="rc-menubar-left">
              <Bar w={34} h={7} tone={5} />
              <Bar w={22} h={6} tone={4} />
              <Bar w={26} h={6} tone={4} />
              <Bar w={30} h={6} tone={4} />
            </span>
            <span className="rc-menubar-right">
              <Bar w={14} h={10} r={3} tone={4} />
              <Bar w={14} h={10} r={3} tone={4} />
              <Bar w={14} h={10} r={3} tone={4} />
              <Bar w={58} h={6} tone={5} />
            </span>
          </div>
          <div className="rc-window">
            <Root s={s} />
            <Clip s={s} layout={layout} />
            <div className="rc-actions">
              <span className="rc-mark" />
              <span className="rc-spacer" />
              <Bar w={78} h={6} tone={3} />
              <span className="rc-actions-sep" />
              <Bar w={52} h={6} tone={3} />
            </div>
          </div>
        </div>
      )}
    </Stage>
  )
}
