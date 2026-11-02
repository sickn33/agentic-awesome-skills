import { type ReactNode } from 'react'
import {
  AppWindow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleArrowDown,
  Clock,
  Cloud,
  Columns3,
  Ellipsis,
  File,
  FileText,
  Folder,
  House,
  LayoutGrid,
  Maximize2,
  Monitor,
  Plus,
  Search,
  Share,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { Bar, Stage, Text, Window, type Act, type Layout, States } from '../../kit'
import './finder-glass.css'

// Finder in the Liquid Glass design (macOS Tahoe, 26), in column view, drawn
// from a real macOS 26 screenshot: a floating rounded sidebar panel inset in
// the window that holds the larger traffic lights, a toolbar with no bar of
// its own (separate glass buttons, each with its label under it, the icon and
// text mode), the path bar as one rounded capsule with a round + beside it,
// and columns split by hairlines.
//
// The story: in films, a click on japan slides its column in and the title
// follows; a click picks a photo in it; Space opens Quick Look out of its
// thumbnail and Space again zooms it back; a click on films in the first
// column closes the japan column, which is exactly where the loop began.
//
// Icons: Finder has no web icon pack, so lucide is used deliberately for its
// SF Symbols-like outlines (one family, one stroke).

type S = { lis: boolean; file: boolean; ql: boolean }

const initial: S = { lis: false, file: false, ql: false }

const FILE = 'Fuji.jpg'

type Geo = {
  win: { x: number; y: number; w: number; h: number }
  side: number
  /** The folders shown as columns, left to right: films, japan and before them, in wide, Documents */
  docs: boolean
  ql: { x: number; y: number; w: number }
}

const GEO: Record<Layout, Geo> = {
  wide: { win: { x: 40, y: 40, w: 780, h: 480 }, side: 196, docs: true, ql: { x: 328, y: 142, w: 270 } },
  compact: { win: { x: 20, y: 20, w: 460, h: 400 }, side: 132, docs: false, ql: { x: 20, y: 108, w: 232 } },
}

const QL_BAR = 38
const qlHeight = (w: number) => QL_BAR + Math.round((w * 3) / 4)

// Column rows: what each row is, and how long its placeholder name runs
type Kind = 'folder' | 'doc' | 'image'
type Row = { kind: Kind; name: number | string; target?: string }

const DOCUMENTS: Row[] = [
  { kind: 'folder', name: 74 },
  { kind: 'folder', name: 96 },
  { kind: 'folder', name: 'films', target: 'films' },
  { kind: 'folder', name: 62 },
  { kind: 'doc', name: 104 },
  { kind: 'doc', name: 82 },
  { kind: 'doc', name: 92 },
]

const FILMS: Row[] = [
  { kind: 'folder', name: 58 },
  { kind: 'folder', name: 'japan', target: 'japan' },
  { kind: 'folder', name: 72 },
  { kind: 'doc', name: 96 },
  { kind: 'doc', name: 80 },
  { kind: 'doc', name: 88 },
]

const LISBON: Row[] = [
  { kind: 'image', name: 70 },
  { kind: 'image', name: 88 },
  { kind: 'image', name: FILE, target: 'file' },
  { kind: 'image', name: 64 },
  { kind: 'image', name: 80 },
]

async function script(a: Act<S>) {
  await a.wait(700)

  // 1. Open japan: its column slides in and the title follows
  a.mark('folder')
  await a.click({ at: 'japan', x: 0.62, y: 0.6 })
  await a.set({ lis: true })
  await a.wait(900)

  // 2. Pick the photo in it
  a.mark('file')
  await a.click({ at: 'file', x: 0.66, y: 0.6 })
  await a.set({ file: true })
  await a.wait(600)

  // 3. Space: Quick Look zooms out of the thumbnail
  a.mark('open')
  await a.key('space')
  await a.set({ ql: true })
  await a.wait(2400)

  // 4. Space again: it zooms back into the row
  a.mark('close')
  await a.key('space')
  await a.set({ ql: false })
  await a.wait(800)

  // 5. Back to films: the japan column closes, as at the start
  a.mark('back')
  // (compact has no first column: Back does it, aimed at the back half)
  await a.click(a.layout === 'wide' ? { at: 'films', x: 0.66, y: 0.6 } : { at: 'back', x: 0.4, y: 0.56 })
  await a.set({ lis: false, file: false })
  await a.wait(1400)
}

export default function FinderGlassDemo() {
  return (
    <Stage<S>
      width={860}
      height={440}
      compact={{ below: 560, width: 400, height: 340 }}
      initial={initial}
      script={script}
      accent="#0a6de6"
      greys="cool"
      cursor={{ at: { wide: { at: 'films', x: 0.66, y: 0.6 }, compact: { at: 'back', x: 0.4, y: 0.56 } } }}
      className="fgl"
    >
      {(s, rect, layout) => {
        const g = GEO[layout]
        const wide = layout === 'wide'
        const qh = qlHeight(g.ql.w)
        // Quick Look closed sits on the thumbnail, shrunk to its width. It
        // zooms by layout, not transform, so its text lands without a hop
        const t = rect('thumb')
        const k = t.width ? t.width / g.ql.w : 0.05
        const box = s.ql
          ? { left: g.ql.x, top: g.ql.y, width: g.ql.w, height: qh, borderRadius: 18 }
          : { left: t.x, top: t.y + t.height / 2 - (qh * k) / 2, width: g.ql.w * k, height: qh * k, borderRadius: 18 * k }
        return (
          <>
            <Window
              className="fgl-window"
              style={{ left: g.win.x, top: g.win.y, width: g.win.w, height: g.win.h }}
              sidebarWidth={g.side}
              sidebarStyle="floating"
              lightsSize="large"
              barSize="tall"
              sidebar={<Sidebar />}
              lead={
                <span className="fgl-lead">
                  <Tool label="Back/Forward">
                    <span className="fgl-cap fgl-nav" data-target={wide ? undefined : 'back'}>
                      <ChevronLeft {...tb} />
                      <span className="fgl-nav__rule" />
                      <ChevronRight {...tb} className="fgl-off" />
                    </span>
                  </Tool>
                  <span className="fgl-heading">
                    <Names on={s.lis} />
                  </span>
                </span>
              }
              toolbar={
                wide ? (
                  <span className="fgl-tools">
                    <Tool label="View">
                      <span className="fgl-cap">
                        <Columns3 {...tb} />
                        <ChevronsUpDown size={11} strokeWidth={2} />
                      </span>
                    </Tool>
                    <Tool label="Group">
                      <span className="fgl-cap">
                        <LayoutGrid {...tb} />
                        <ChevronDown size={11} strokeWidth={2} />
                      </span>
                    </Tool>
                    <Tool label="Action">
                      <span className="fgl-round">
                        <Ellipsis {...tb} />
                      </span>
                    </Tool>
                    <Tool label="Share">
                      <span className="fgl-round">
                        <Share {...tb} />
                      </span>
                    </Tool>
                    <Tool label="Add Tags">
                      <span className="fgl-round">
                        <Tag {...tb} />
                      </span>
                    </Tool>
                    <Tool label="Search">
                      <span className="fgl-round">
                        <Search {...tb} />
                      </span>
                    </Tool>
                  </span>
                ) : undefined
              }
              body={{ className: 'fgl-body', 'data-crop': true }}
            >
              <div className="fgl-path">
                <span className="fgl-path__tab">
                  <Names on={s.lis} align="center" />
                </span>
                <span className="fgl-path__add">
                  <Plus size={14} strokeWidth={1.75} />
                </span>
              </div>
              <div className="fgl-cols" data-docs={g.docs || undefined}>
                {g.docs && (
                  <Column rows={DOCUMENTS} sel={{ films: s.lis ? 'quiet' : 'focus' }} />
                )}
                <Column rows={FILMS} sel={{ japan: s.lis ? (s.file ? 'quiet' : 'focus') : undefined }} />
                <Column rows={LISBON} sel={{ file: s.file ? 'focus' : undefined }} open={s.lis} />
              </div>
            </Window>

            <div className="fgl-ql" data-open={s.ql || undefined} style={box}>
              <div className="fgl-ql__bar" style={{ height: s.ql ? QL_BAR : QL_BAR * k }}>
                <span className="fgl-round fgl-ql__round">
                  <X size={14} strokeWidth={1.75} />
                </span>
                <span className="fgl-round fgl-ql__round">
                  <Maximize2 size={12} strokeWidth={1.75} />
                </span>
                <span className="fgl-ql__title">{FILE}</span>
                {g.ql.w >= 300 && <span className="fgl-cap fgl-ql__open">Open with Preview</span>}
                <span className="fgl-round fgl-ql__round">
                  <Share size={14} strokeWidth={1.75} />
                </span>
              </div>
              <Photo className="fgl-ql__photo" />
            </div>
          </>
        )
      }}
    </Stage>
  )
}

// Toolbar glyphs: one size and stroke in every glass button
const tb = { size: 16, strokeWidth: 1.6 }

/**
 * The folder's name in the title and the path bar: both names share one grid
 * cell and crossfade, so the box is already as wide as the longer one and
 * nothing beside it moves.
 */
function Names({ on, align = 'start' }: { on: boolean; align?: 'start' | 'center' }) {
  return <States className="fgl-names" value={on ? 'japan' : 'films'} align={align} states={{ films: 'films', japan: 'japan' }} />
}

/** A toolbar item in icon-and-text mode: the glass button, its label under it. */
function Tool({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="fgl-tool">
      {children}
      <span className="fgl-tool__label">{label}</span>
    </span>
  )
}

function Sidebar() {
  const ic = { size: 16, strokeWidth: 1.6 }
  const item = (icon: ReactNode, label: string, extra?: { current?: boolean; cloud?: boolean }) => (
    <div className="fgl-side__item" data-current={extra?.current || undefined}>
      <span className="fgl-side__icon">{icon}</span>
      <Text>{label}</Text>
      {extra?.cloud && <Cloud size={13} strokeWidth={1.6} className="fgl-side__cloud" />}
    </div>
  )
  return (
    <div className="fgl-side">
      {item(<Clock {...ic} />, 'Recents')}
      {item(<Users {...ic} />, 'Shared')}
      <Text className="fgl-side__label">Favorites</Text>
      {item(<AppWindow {...ic} />, 'Applications')}
      {item(<Folder {...ic} />, 'Studio')}
      {item(<CircleArrowDown {...ic} />, 'Downloads')}
      {item(<Monitor {...ic} />, 'Desktop', { cloud: true })}
      {item(<FileText {...ic} />, 'Documents', { current: true, cloud: true })}
      <Text className="fgl-side__label">Locations</Text>
      {item(<Cloud {...ic} />, 'iCloud Drive')}
      {item(<House {...ic} />, 'mayachen')}
    </div>
  )
}

type Sel = 'focus' | 'quiet' | undefined

/**
 * One column. `sel` maps a row's target to how it is selected: `focus` is the
 * blue of the column with the keyboard, `quiet` the gray capsule a column
 * keeps once focus has moved right. `open` brings the column in (it is always
 * mounted, so it leaves as it came).
 */
function Column({ rows, sel, open = true }: { rows: Row[]; sel: Record<string, Sel>; open?: boolean }) {
  return (
    <div className="fgl-col" data-open={open || undefined}>
      {rows.map((r, i) => {
        const state = r.target ? sel[r.target] : undefined
        return (
          <div key={i} className="fgl-row" data-sel={state} data-target={r.target}>
            <FileIcon kind={r.kind} thumb={r.target === 'file'} />
            {typeof r.name === 'string' ? <span className="fgl-row__name">{r.name}</span> : <Bar w={r.name} h={6} tone={3} />}
            {r.kind === 'folder' && <ChevronRight size={12} strokeWidth={2} className="fgl-row__chev" />}
          </div>
        )
      })}
    </div>
  )
}

function FileIcon({ kind, thumb }: { kind: Kind; thumb?: boolean }) {
  if (kind === 'folder') return <Folder size={15} strokeWidth={1.25} className="fgl-folder" />
  if (kind === 'doc') return <File size={15} strokeWidth={1.25} className="fgl-doc" />
  return (
    <span className="fgl-thumb" data-target={thumb ? 'thumb' : undefined}>
      <Photo alt={!thumb} />
    </span>
  )
}

// The same local photograph is shared by its thumbnail and Quick Look.
const PHOTO = new URL('../wikipedia/kawaguchiko.jpg', import.meta.url).href
const ALT_PHOTO = new URL('../wikipedia/fuji.jpg', import.meta.url).href
function Photo({ className, alt }: { className?: string; alt?: boolean }) {
  return <img className={`fgl-photo${className ? ` ${className}` : ''}`} src={alt ? ALT_PHOTO : PHOTO} alt="" draggable={false} />
}
