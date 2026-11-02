import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, File, Folder, LayoutGrid, List, Search, Share } from 'lucide-react'
import { Bar, Collapse, Count, Stage, States, Window, type Act, type Layout, type Point, Meter } from '../../kit'
import './upload.css'

// A file storage app, list view. A PDF sits on the desktop beside the
// Projects window. The user drags it in: the drag image rides with the arrow,
// the list lights up under it, and on the drop an upload row opens at the top
// (newest first). Its bar fills while the size counts up, then the row settles
// into an ordinary file row: Just now, 4.2 MB. Cmd+Z takes the upload back,
// which is exactly where the loop began.
//
// The upload is the story, so it gets the room: no sidebar, rows at reading
// size, and a list short enough that the new row is a tenth of the window, not
// a sliver at the top of a long one. Everything else is placeholder bars. The
// desktop strip holds the file at the start and the keycaps at the end.

type Ghost = { on: boolean; dropped: boolean; off: Point; at: Point }
type S = { up: boolean; mb: number; done: boolean; ghost: Ghost }

const initial: S = { up: false, mb: 0, done: false, ghost: { on: false, dropped: false, off: { x: 0, y: 0 }, at: { x: 0, y: 0 } } }

const FILE = 'Launch deck.pdf'
const MB = 4.2

type Geo = {
  win: { x: number; y: number; w: number; h: number }
  rows: number
  cols: string
  desk: { x: number; y: number }
}

// Wide: one gutter (40) above the window and left of the file; the window
// runs off the right and bottom, its Size column still whole in the crop.
// Compact: the file sits above the window, which runs off the bottom only
// with equal side gutters, so all three columns stay whole.
const GEO: Record<Layout, Geo> = {
  wide: { win: { x: 184, y: 40, w: 620, h: 420 }, rows: 9, cols: 'minmax(0, 1fr) 132px 118px', desk: { x: 40, y: 124 } },
  compact: { win: { x: 24, y: 120, w: 352, h: 300 }, rows: 6, cols: 'minmax(0, 1fr) 92px 76px', desk: { x: 20, y: 18 } },
}

type Kind = 'folder' | 'doc'
const ROWS: { kind: Kind; name: number; date: number; size: number }[] = [
  { kind: 'folder', name: 96, date: 84, size: 16 },
  { kind: 'doc', name: 132, date: 76, size: 40 },
  { kind: 'doc', name: 104, date: 88, size: 34 },
  { kind: 'folder', name: 80, date: 80, size: 16 },
  { kind: 'doc', name: 120, date: 72, size: 44 },
  { kind: 'doc', name: 92, date: 86, size: 36 },
  { kind: 'folder', name: 112, date: 78, size: 16 },
  { kind: 'doc', name: 100, date: 74, size: 38 },
  { kind: 'doc', name: 126, date: 82, size: 42 },
]

async function script(a: Act<S>) {
  await a.wait(600)

  // 1. Pick the PDF up off the desktop by its icon
  a.mark('grab')
  const icon = a.rect('desk-icon')
  const file = a.rect('desk-file')
  const grab = { x: icon.x + icon.width / 2, y: icon.y + icon.height * 0.55 }
  await a.move(grab)
  await a.wait(240)
  const off = { x: grab.x - file.x, y: grab.y - file.y }

  // 2. Carry it into the window; the list lights up under it
  a.mark('drag')
  const list = a.rect('drop')
  await a.drag({ x: list.x + list.width * 0.36, y: list.y + list.height * 0.32 }, (at) => {
    a.put({ ghost: { on: true, dropped: false, off, at } })
  }, { duration: 1300, cursor: 'preserve' })

  // 3. Drop: the upload row opens at the top, its bar fills and the size
  //    counts up with it
  a.mark('drop')
  await a.set((s) => ({ up: true, ghost: { ...s.ghost, dropped: true } }))
  await a.wait(500)
  for (const [mb, ms] of [[1.1, 650], [2.3, 650], [3.4, 650], [MB, 600]] as const) {
    await a.set({ mb })
    await a.wait(ms)
  }

  // 4. Uploaded: the bar gives way to Just now and the tint fades
  a.mark('done')
  await a.set({ done: true })
  await a.wait(2400)

  // 5. Cmd+Z takes the upload back; the row closes: back to the start
  a.mark('undo')
  await a.key('cmd+z')
  await a.set({ up: false, ghost: initial.ghost })
  await a.wait(600)
  await a.snap({ mb: 0, done: false })
  await a.wait(300)
}

export default function UploadDemo() {
  return (
    <Stage<S>
      width={760}
      height={420}
      compact={{ below: 560, width: 400, height: 340 }}
      initial={initial}
      script={script}
      accent="#0a6de6"
      keys={{ wide: 'bottom-left', compact: 'top' }}
      cursor={{ at: { at: 'drop', x: 0.36, y: 0.32 } }}
      className="up"
    >
      {(s, _rect, layout) => {
        const g = GEO[layout]
        const lifted = s.ghost.on && !s.ghost.dropped
        return (
          <>
            <div className="up-desk" data-target="desk-file" data-lifted={lifted || undefined} style={{ left: g.desk.x, top: g.desk.y }}>
              <span data-target="desk-icon">
                <PdfIcon />
              </span>
              <span className="up-desk__name">{FILE}</span>
            </div>

            <Window
              className="up-window"
              style={{ left: g.win.x, top: g.win.y, width: g.win.w, height: g.win.h }}
              lead={
                <span className="up-lead">
                  <span className="up-nav">
                    <ChevronLeft size={18} strokeWidth={1.75} />
                    <ChevronRight size={18} strokeWidth={1.75} className="up-nav-off" />
                  </span>
                  <span className="up-heading">Projects</span>
                </span>
              }
              toolbar={
                <span className="up-tools">
                  <span className="up-views">
                    <span className="up-view">
                      <LayoutGrid size={15} strokeWidth={1.75} />
                    </span>
                    <span className="up-view" data-on>
                      <List size={16} strokeWidth={1.75} />
                    </span>
                  </span>
                  <Share size={16} strokeWidth={1.75} />
                  <Search size={16} strokeWidth={1.75} />
                </span>
              }
              body={{ className: 'up-body', 'data-crop': true }}
            >
              <div className="up-list" data-compact={layout === 'compact' || undefined} style={{ ['--cols' as string]: g.cols }}>
                <div className="up-head">
                  <span>Name</span>
                  <span>{layout === 'wide' ? 'Date Modified' : 'Modified'}</span>
                  <span>Size</span>
                </div>
                <div className="up-rows" data-target="drop" data-drop>
                  <Collapse open={s.up}>
                    <UploadRow mb={s.mb} done={s.done} />
                  </Collapse>
                  {ROWS.slice(0, g.rows).map((r, i) => (
                    <Row key={i} r={r} k={layout === 'wide' ? 1 : 0.75} />
                  ))}
                </div>
              </div>
            </Window>

            <DragImage ghost={s.ghost}>
              <PdfIcon />
              <span className="up-drag__name">{FILE}</span>
            </DragImage>
          </>
        )
      }}
    </Stage>
  )
}

function UploadRow({ mb, done }: { mb: number; done: boolean }) {
  return (
    <div className="up-row up-new" data-done={done || undefined}>
      <span className="up-name">
        <PdfIcon small />
        <span className="up-name__text">{FILE}</span>
      </span>
      <States
        value={done ? 'done' : 'up'}
        align="start"
        states={{
          up: (
            <Meter className="up-track" value={mb / MB} />
          ),
          done: <span>Just now</span>,
        }}
      />
      <span className="up-size">
        <Count value={mb} duration={600} format={(n) => n.toFixed(1)} />
        {' MB'}
      </span>
    </div>
  )
}

function Row({ r, k }: { r: (typeof ROWS)[number]; k: number }) {
  return (
    <div className="up-row">
      <span className="up-name">
        {r.kind === 'folder' ? <Folder size={18} strokeWidth={1.25} className="up-folder" /> : <File size={18} strokeWidth={1.25} className="up-doc" />}
        <Bar w={Math.round(r.name * k)} h={7} tone={3} />
      </span>
      <Bar w={Math.round(r.date * k)} h={7} tone={2} />
      {r.kind === 'folder' ? <Bar w={r.size} h={2} tone={3} /> : <Bar w={r.size} h={7} tone={2} />}
    </div>
  )
}

/** A page with a folded corner and a red PDF band: the file being uploaded. */
function PdfIcon({ small }: { small?: boolean }) {
  return (
    <span className="up-pdf" data-small={small || undefined}>
      <span className="up-pdf__band">{small ? null : 'PDF'}</span>
    </span>
  )
}

/** The drag image follows the cursor on the drag's own frame callback, and
 *  lights whatever [data-drop] it is over. */
function DragImage({ ghost, children }: { ghost: Ghost; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const over = useRef<HTMLElement | null>(null)
  const following = ghost.on && !ghost.dropped
  const { x: ox, y: oy } = ghost.off
  const { x, y } = ghost.at
  useLayoutEffect(() => {
    const root = ref.current?.closest<HTMLElement>('.ss-stage')
    let next: HTMLElement | null = null
    if (following && root) {
      const box = root.getBoundingClientRect()
      const scale = box.width / root.offsetWidth || 1
      const hit = document.elementFromPoint(box.left + x * scale, box.top + y * scale)?.closest<HTMLElement>('[data-drop]') ?? null
      if (hit && root.contains(hit)) next = hit
    }
    if (next !== over.current) {
      over.current?.removeAttribute('data-over')
      next?.setAttribute('data-over', '')
      over.current = next
    }
  }, [following, x, y])
  useLayoutEffect(() => () => over.current?.removeAttribute('data-over'), [])
  return (
    <div ref={ref} className="up-drag" data-show={following || undefined} data-dropped={ghost.dropped || undefined} style={{ transform: `translate(${x - ox}px, ${y - oy}px)` }} aria-hidden>
      <div className="up-drag__inner" style={{ transformOrigin: `${ox}px ${oy}px` }}>
        {children}
      </div>
    </div>
  )
}
