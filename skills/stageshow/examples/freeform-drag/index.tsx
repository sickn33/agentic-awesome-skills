import { Stage, Window, Bar, Avatar, cellOf, type Act, type Point, type Rect } from '../../kit'
import './drag.css'

// Freeform drag with a drop target. The card follows the cursor exactly; the
// dashed slot shows where it will land. As in real calendars, the slot never
// travels: it appears in the landing cell, jumps straight to the next cell
// when that changes, and is hidden while the card is still over its own cell.
// Anything that slides after the card reads as a second object chasing it.
// cellOf makes cell borders sticky, so a drag along a border doesn't flicker.

const COLS = 4
const ROWS = 6
const COL_W = 104
const ROW_H = 40
const START = { col: 1, row: 3 }
const END = { col: 2, row: 1 }

type Cell = { col: number; row: number }
type S = { cell: Cell; lifted: boolean; at: Point | null; target: Cell | null }

const cellRect = (grid: Rect, c: Cell): Rect => ({
  x: grid.x + c.col * COL_W + 3,
  y: grid.y + c.row * ROW_H + 2,
  width: COL_W - 6,
  height: ROW_H * 2 - 4,
})

async function move(a: Act<S>, from: Cell, to: Cell) {
  const grid = a.rect('grid', { layout: true })
  const card = cellRect(grid, from)
  const grab = { x: card.x + card.width * 0.35, y: card.y + 22 }
  await a.move(grab)
  const dest = cellRect(grid, to)
  let prev: Cell = from
  await a.drag(
    { x: dest.x + (grab.x - card.x), y: dest.y + (grab.y - card.y) },
    (p) => {
      const at = { x: p.x - (grab.x - card.x), y: p.y - (grab.y - card.y) }
      // The card's center decides the cell, with sticky borders
      const col = cellOf(at.x + card.width / 2 - grid.x, COL_W, prev.col)
      const row = cellOf(at.y + ROW_H / 2 - grid.y, ROW_H, prev.row)
      prev = { col: Math.max(0, Math.min(COLS - 1, col)), row: Math.max(0, Math.min(ROWS - 2, row)) }
      // drag() has pressed and closed the hand before its first callback.
      // Pick up and move in that same frame, never while the hand is open.
      a.put({ lifted: true, at, target: prev })
    },
    { duration: 1100 },
  )
  await a.set({ lifted: false, at: null, target: null, cell: prev })
}

const script = async (a: Act<S>) => {
  await a.wait(500)
  await move(a, START, END)
  await a.wait(1200)
  // Back again: a caused reset, and a second diagonal in the other direction
  await move(a, END, START)
  await a.move('rest')
  await a.wait(600)
}

// Friday runs off the window's right edge, so the grid never stops short
const DAYS = ['Mon 20', 'Tue 21', 'Wed 22', 'Thu 23', 'Fri 24']
const HOURS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM']
const BUSY: [number, number, number][] = [
  [0, 0, 2],
  [3, 1, 1],
  [0, 4, 1],
  [3, 3, 2],
]

export default function FreeformDrag() {
  return (
    <Stage<S>
      width={560}
      height={340}
      compact={{ below: 500, width: 358, height: 340 }}
      initial={{ cell: START, lifted: false, at: null, target: null }}
      poster={{ cell: END, lifted: false, at: null, target: null }}
      script={script}
      cursor={{ at: 'rest' }}
      className="fd"
    >
      {(s, rect, layout) => {
        const grid = rect('grid')
        const card = s.at ? { ...cellRect(grid, s.cell), x: s.at.x, y: s.at.y } : cellRect(grid, s.cell)
        return (
          <>
            <Window title="Calendar" className="fd-window">
              <div className="fd-head">
                {DAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="fd-body">
                <div className="fd-hours">
                  {HOURS.map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </div>
                <div className="fd-grid" data-target="grid">
                  {BUSY.map(([c, r, span], i) => (
                    <span key={i} className="fd-busy" style={{ left: c * COL_W + 3, top: r * ROW_H + 2, width: COL_W - 6, height: span * ROW_H - 4 }}>
                      <Bar w={40 + ((i * 17) % 24)} h={5} tone={3} />
                    </span>
                  ))}
                </div>
              </div>
            </Window>
            {(() => {
              const show = s.target && grid.width && (s.target.col !== s.cell.col || s.target.row !== s.cell.row)
              const r = cellRect(grid, show ? s.target! : s.cell)
              return <div className="fd-target" data-show={show || undefined} style={{ transform: `translate(${r.x}px, ${r.y}px)`, width: r.width, height: r.height }} />
            })()}
            <div
              className="fd-card"
              data-target="meeting"
              data-cursor="open"
              data-lifted={s.lifted || undefined}
              data-dragging={s.at ? true : undefined}
              style={{ translate: `${card.x}px ${card.y}px`, width: card.width, height: card.height, transformOrigin: '35% 22px' }}
            >
              <span className="fd-card__title">Design review</span>
              <span className="fd-card__people">
                <Avatar name="M" size={16} />
                <Avatar name="J" size={16} />
              </span>
            </div>
            <span data-target="rest" style={{ position: 'absolute', left: layout === 'compact' ? 330 : 500, top: 300 }} />
          </>
        )
      }}
    </Stage>
  )
}
