import { Bar, Chart, Count, Stage, Swap, Window, type Act, type Layout } from '../../kit'
import './excel.css'

// Excel for Mac: select B2:B7, click AutoSum, the total lands in B8, the
// chart beside the table gains its data labels and total, then a click on
// B8 shows =SUM(B2:B7) in the formula bar. Cmd+Z undoes it and a click back
// on B2 returns to the opening frame.

const ROWS: [string, number][] = [
  ['North', 48200],
  ['South', 39850],
  ['East', 52410],
  ['West', 61730],
  ['Metro', 44960],
  ['Web', 37040],
]
const SUM = ROWS.reduce((n, [, v]) => n + v, 0) // 284,190
const SHARE = ROWS.map(([, v]) => Math.round((v / SUM) * 100))
const fmt = (n: number) => n.toLocaleString('en-US')

type S = {
  from: number // anchor row (the active cell)
  to: number // the row the selection reaches
  dragging: boolean
  total: boolean
  labels: boolean
  sum: number
}

const initial: S = { from: 2, to: 2, dragging: false, total: false, labels: false, sum: 0 }

// Geometry per layout. Columns: row header, A, B, then the rest.
const GEO = {
  wide: { rowHead: 34, a: 112, b: 104, col: 76, cols: 9, rows: 16, row: 22, head: 20, chart: { left: 330, top: 30, width: 344, height: 236 }, plot: { w: 268, h: 158 } },
  compact: { rowHead: 28, a: 70, b: 78, col: 64, cols: 4, rows: 13, row: 22, head: 20, chart: { left: 188, top: 26, width: 196, height: 176 }, plot: { w: 152, h: 88 } },
}

async function script(a: Act<S>) {
  await a.wait(500)

  // 1. Select the column: press on B2 and drag down to B7.
  await a.move({ at: 'b2', x: 0.42, y: 0.55 })
  await a.wait(250)
  const rowAt = (y: number) => {
    for (let r = 7; r >= 2; r--) if (y >= a.rect(`b${r}`).y) return r
    return 2
  }
  await a.drag({ at: 'b7', x: 0.42, y: 0.55 }, (at) => a.put({ to: rowAt(at.y), dragging: true }), { duration: 1000 })
  await a.set({ dragging: false })
  await a.wait(500)

  // 2. AutoSum: aim at the sigma, so the label stays readable.
  a.mark('autosum')
  await a.move({ at: 'autosum', x: 0.96, y: 0.7 })
  await a.wait(250)
  await a.click()
  await a.set({ total: true, sum: SUM })

  // 3. The chart picks it up: data labels stagger in as the total counts.
  await a.wait(300)
  await a.set({ labels: true })
  await a.wait(1100)

  // 4. Click the total to read its formula.
  a.mark('formula')
  await a.move({ at: 'b8', x: 0.3, y: 0.62 })
  await a.wait(150)
  await a.click()
  await a.set({ from: 8, to: 8 })
  await a.wait(2400)

  // Undo, then back to B2: the opening frame, caused on screen.
  a.mark('undo')
  await a.key('cmd+z')
  await a.set({ total: false, labels: false })
  await a.wait(500)
  await a.snap({ sum: 0 })
  await a.wait(400)
  await a.move({ at: 'b2', x: 0.35, y: 0.5 })
  await a.wait(120)
  await a.click()
  await a.set({ from: 2, to: 2 })
  await a.wait(900)
}

export default function ExcelDemo() {
  return (
    <Stage
      width={860}
      height={480}
      compact={{ below: 600, width: 420, height: 400 }}
      initial={initial}
      poster={{ ...initial, from: 8, to: 8, total: true, labels: true, sum: SUM }}
      script={script}
      cursor={{ at: { at: "b2", x: 0.35, y: 0.5 } }}
      keys={{ wide: 'bottom-right', compact: 'bottom-right' }}
      accent="#107c41"
      className="xl-stage"
    >
      {(s, _rect, layout) => <Excel s={s} layout={layout} />}
    </Stage>
  )
}

function Excel({ s, layout }: { s: S; layout: Layout }) {
  const g = GEO[layout]
  const compact = layout === 'compact'
  const top = Math.min(s.from, s.to)
  const bottom = Math.max(s.from, s.to)
  const inSel = (r: number) => r >= top && r <= bottom
  const multi = bottom > top
  const name = s.dragging && multi ? `${bottom - top + 1}R x 1C` : `B${s.from}`
  const formula = s.from === 8 ? (s.total ? '=SUM(B2:B7)' : '') : s.from >= 2 && s.from <= 7 ? String(ROWS[s.from - 2][1]) : ''
  const letters = ['A', 'B', ...'CDEFGHIJK'.slice(0, g.cols).split('')]
  const widths = [g.a, g.b, ...Array(g.cols).fill(g.col)]

  return (
    <Window
      className="xl-window"
      data-layout={layout}
      lead={
        <span className="xl-quick">
          <span className="xl-autosave">
            AutoSave
            <span className="xl-switch" />
          </span>
          {!compact && [0, 1, 2, 3].map((i) => <Bar key={i} w={14} h={14} r={3} tone={3} />)}
        </span>
      }
      toolbar={
        <>
          <span className="xl-doc">Q3 Sales</span>
          {!compact && (
            <span className="xl-search">
              <Bar w={10} h={10} r={5} tone={3} />
              <Bar w={90} h={5} tone={2} />
            </span>
          )}
        </>
      }
    >
      {/* Ribbon tabs */}
      <div className="xl-tabs">
        {(compact ? ['Home', 'Insert', 'Draw', 'Formulas', 'Data'] : ['Home', 'Insert', 'Draw', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate']).map((t, i) => (
          <span key={t} className="xl-tab" data-active={i === 0 || undefined}>
            {t}
          </span>
        ))}
      </div>

      {/* Ribbon */}
      <div className="xl-ribbon" data-crop>
        <div className="xl-group">
          <span className="xl-big">
            <Bar w={24} h={24} r={4} tone={3} />
            <span className="xl-big-label">Paste</span>
          </span>
          <span className="xl-stack">
            <Bar w={14} h={14} r={3} tone={2} />
            <Bar w={14} h={14} r={3} tone={2} />
          </span>
        </div>
        <div className="xl-group xl-font">
          <span className="xl-row">
            <span className="xl-field" style={{ width: compact ? 104 : 112 }}>
              Aptos Narrow<Caret />
            </span>
            <span className="xl-field" style={{ width: 40 }}>
              12<Caret />
            </span>
          </span>
          <span className="xl-row">
            <span className="xl-glyph" style={{ fontWeight: 700 }}>B</span>
            <span className="xl-glyph" style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>I</span>
            <span className="xl-glyph" style={{ textDecoration: 'underline' }}>U</span>
            {!compact && (
              <>
                <span className="xl-sep" />
                <Bar w={14} h={14} r={3} tone={2} />
                <Bar w={14} h={14} r={3} tone={2} />
                <Bar w={14} h={14} r={3} tone={2} />
              </>
            )}
          </span>
        </div>
        {!compact && (
          <>
            <div className="xl-group xl-grid2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Bar key={i} w={14} h={14} r={3} tone={2} />
              ))}
            </div>
            <div className="xl-group xl-font">
              <span className="xl-row">
                <span className="xl-field" style={{ width: 92 }}>
                  General<Caret />
                </span>
              </span>
              <span className="xl-row">
                {[0, 1, 2, 3].map((i) => (
                  <Bar key={i} w={14} h={14} r={3} tone={2} />
                ))}
              </span>
            </div>
            <div className="xl-group">
              {[52, 44, 40].map((w, i) => (
                <span key={i} className="xl-big">
                  <Bar w={22} h={22} r={4} tone={2} />
                  <Bar w={w} h={5} tone={2} />
                </span>
              ))}
            </div>
          </>
        )}
        <div className="xl-group xl-editing">
          <span className="xl-autosum" data-target="autosum">
            <span className="xl-sigma">Σ</span>
            <span>AutoSum</span>
            <Caret />
          </span>
          <span className="xl-row xl-quiet">
            <Bar w={12} h={12} r={3} tone={2} />
            <Bar w={30} h={5} tone={2} />
          </span>
          {!compact && (
          <span className="xl-row xl-quiet">
            <Bar w={12} h={12} r={3} tone={2} />
            <Bar w={36} h={5} tone={2} />
          </span>
          )}
        </div>
      </div>

      {/* Formula bar */}
      <div className="xl-fbar">
        <span className="xl-name" data-target="namebox">
          <span>{name}</span>
          <Caret />
        </span>
        <span className="xl-fx-icons">
          <span className="xl-x">✕</span>
          <span className="xl-x">✓</span>
          <span className="xl-fx">fx</span>
        </span>
        <span className="xl-formula" data-target="formula">
          <Swap id={formula || 'empty'} duration={260}>
            {formula || ' '}
          </Swap>
        </span>
      </div>

      {/* The sheet */}
      <div className="xl-sheet" data-crop data-cursor="crosshair" style={{ gridTemplateColumns: `${g.rowHead}px ${widths.map((w) => `${w}px`).join(' ')}`, gridAutoRows: g.row, gridTemplateRows: `${g.head}px` }}>
        <div className="xl-corner" />
        {letters.map((l) => (
          <div key={l} className="xl-colhead" data-sel={l === 'B' || undefined}>
            {l}
          </div>
        ))}
        {Array.from({ length: g.rows }, (_, i) => {
          const r = i + 1
          return (
            <Row key={r} r={r} n={letters.length} sel={inSel(r)} active={s.from === r} total={s.total} />
          )
        })}

        {/* The selection: one green frame with the fill handle, gliding as Excel's cell cursor does */}
        <div
          className="xl-selection"
          style={{ left: g.rowHead + g.a - 1, width: g.b + 1, top: g.head + (top - 1) * g.row - 1, height: (bottom - top + 1) * g.row + 1 }}
        >
          <span className="xl-handle" />
        </div>

        <ChartObject s={s} g={g} />
      </div>
    </Window>
  )
}

function Row({ r, n, sel, active, total }: { r: number; n: number; sel: boolean; active: boolean; total: boolean }) {
  const data = r >= 2 && r <= 7 ? ROWS[r - 2] : null
  let a: React.ReactNode = null
  let b: React.ReactNode = null
  if (r === 1) {
    a = <span className="xl-bold">Region</span>
    b = <span className="xl-bold">Q3 Sales</span>
  } else if (data) {
    a = data[0]
    b = fmt(data[1])
  } else if (r === 8) {
    a = <span className="xl-bold">Total</span>
    b = (
      <span className="xl-total" data-show={total || undefined}>
        {fmt(SUM)}
      </span>
    )
  }
  return (
    <>
      <div className="xl-rowhead" data-sel={sel || undefined}>
        {r}
      </div>
      <div className="xl-cell" data-row={r === 1 || undefined}>{a}</div>
      <div className="xl-cell xl-num" data-target={`b${r}`} data-row={r === 1 || undefined} data-sel={(sel && !active) || undefined}>
        {b}
      </div>
      {Array.from({ length: n - 2 }, (_, i) => (
        <div key={i} className="xl-cell" />
      ))}
    </>
  )
}

function ChartObject({ s, g }: { s: S; g: (typeof GEO)['wide'] }) {
  const { w, h } = g.plot
  const n = ROWS.length
  const gap = Math.max(2, Math.round(w / n / 4))
  const bw = (w - gap * (n - 1)) / n
  const MAX = 80000
  const ticks = [0, 20000, 40000, 60000, 80000]
  return (
    <div className="xl-chart" data-cursor="pointer" style={{ left: g.chart.left, top: g.chart.top, width: g.chart.width, height: g.chart.height }}>
      <div className="xl-chart-head">
        <span className="xl-chart-title">Q3 Sales by Region</span>
        <span className="xl-chart-total" data-show={s.total || undefined}>
          Total <span className="xl-chart-value">
            {/* Reserve the final formatted width so the label stays still as digits arrive. */}
            <span className="xl-chart-value-size" aria-hidden>{fmt(SUM)}</span>
            <Count value={s.sum} duration={900} />
          </span>
        </span>
      </div>
      <div className="xl-plot" style={{ height: h }}>
        <div className="xl-axis">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: (t / MAX) * (h - 2) + 1 }}>
              {t === 0 ? '0' : `${t / 1000}k`}
            </span>
          ))}
        </div>
        <div className="xl-bars" style={{ width: w, height: h }}>
          {ticks.map((t) => (
            <span key={t} className="xl-gridline" style={{ bottom: (t / MAX) * (h - 2) + 1 }} />
          ))}
          <Chart kind="bars" data={ROWS.map(([, v]) => v)} max={MAX} width={w} height={h} show className="xl-chart-svg" />
          {ROWS.map(([, v], i) => (
            <span
              key={i}
              className="xl-label"
              data-show={s.labels || undefined}
              style={{ left: i * (bw + gap) + bw / 2, bottom: (v / MAX) * (h - 2) + 4, transitionDelay: s.labels ? `${i * 60}ms` : `${(n - 1 - i) * 40}ms` }}
            >
              {SHARE[i]}%
            </span>
          ))}
        </div>
      </div>
      <div className="xl-cats" style={{ width: w }}>
        {ROWS.map(([name], i) => (
          <span key={name} style={{ left: i * (bw + gap) + bw / 2 }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

function Caret() {
  return (
    <svg className="xl-caret" width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
