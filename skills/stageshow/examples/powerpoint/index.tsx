import { useId, type CSSProperties } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Italic,
  LayoutDashboard,
  Layers,
  List,
  ListOrdered,
  Shapes,
  SquarePlus,
  Strikethrough,
  Underline,
  X,
} from 'lucide-react'
import { Bar, Stage, Text, Window, type Act, type Layout } from '../../kit'
import './pp.css'

// PowerPoint for Mac: pick slide 2 in the rail, it opens in the editor, open
// Designer and pick a suggested layout, and the slide restyles in place (the
// rail thumbnail follows). Cmd+Z undoes it, the pane closes, slide 1 is
// picked again, so the loop ends where it began.

type Design = 'plain' | 'split' | 'band' | 'overlay'
type S = { slide: 1 | 2; pane: boolean; design: Design; picked: number; ideas: boolean }

const initial: S = { slide: 1, pane: false, design: 'plain', picked: 0, ideas: false }
const poster: S = { slide: 2, pane: true, design: 'split', picked: 2, ideas: true }

// Geometry per layout, in design px. The slide is drawn at 640 × 360 and scaled.
const G = {
  wide: { w: 920, h: 540, win: { x: 30, y: 30, w: 860, h: 570 }, rail: 140, pane: 220, canvas: 350, thumb: 100, step: 70, idea: 188, pad: 24 },
  // Narrow, the window keeps its size and runs off the left: the slide rail
  // goes out of frame so the slide and Designer draw at true scale, not shrunk
  compact: { w: 358, h: 400, win: { x: -78, y: 20, w: 420, h: 432 }, rail: 72, pane: 150, canvas: 220, thumb: 48, step: 44, idea: 126, pad: 14 },
}

function fit(l: Layout, pane: boolean) {
  const g = G[l]
  const editor = g.win.w - g.rail - (pane ? g.pane : 0)
  const k = Math.min((editor - g.pad * 2) / 640, (g.canvas - g.pad * 2) / 360, l === 'wide' ? 0.8 : 0.5)
  // Compact with the pane open: top-align with the second rail thumbnail rather than land a few px off it.
  const y = l === 'compact' && pane ? 12 + g.step : (g.canvas - 360 * k) / 2
  return { k, x: (editor - 640 * k) / 2, y }
}

/* ---- The slide itself ---- */

type Box = [number, number, number, number]
const LOOK: Record<Design, { photo: Box; title: [number, number]; bullets: [number, number]; light: boolean; panel: number; shade: number; rule: boolean }> = {
  plain: { photo: [360, 112, 232, 174], title: [48, 40], bullets: [56, 128], light: false, panel: 0, shade: 0, rule: false },
  split: { photo: [0, 0, 300, 360], title: [336, 128], bullets: [340, 200], light: true, panel: 1, shade: 0, rule: true },
  band: { photo: [0, 0, 640, 188], title: [48, 216], bullets: [52, 280], light: false, panel: 0, shade: 0, rule: false },
  overlay: { photo: [0, 0, 640, 360], title: [48, 222], bullets: [52, 284], light: true, panel: 0, shade: 1, rule: false },
}

function Photo() {
  const id = useId().replace(/:/g, '')
  const sky = `${id}-sky`
  const sea = `${id}-sea`
  // A harbor at dusk: sky, sun, water, a far shore and a hill of rooftops.
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMinYMid slice" className="pp-photo-svg" aria-hidden>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2b58a" />
          <stop offset="0.55" stopColor="#f6d3ae" />
          <stop offset="1" stopColor="#f9e6cf" />
        </linearGradient>
        <linearGradient id={sea} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fa3b8" />
          <stop offset="1" stopColor="#3f6a84" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill={`url(#${sky})`} />
      <circle cx="430" cy="170" r="34" fill="#fbe9d2" />
      <path d="M0 200 C 120 186 220 192 320 196 S 520 184 640 194 L640 230 L0 230Z" fill="#b98f86" />
      <rect y="214" width="640" height="146" fill={`url(#${sea})`} />
      <path d="M0 260 C 80 236 150 226 230 232 C 280 236 300 252 320 360 L0 360Z" fill="#c97b5a" />
      <path d="M0 290 C 70 270 140 262 210 270 C 250 276 270 300 280 360 L0 360Z" fill="#a85f45" />
      <g fill="#f3e3cf">
        <rect x="40" y="262" width="22" height="16" rx="1" />
        <rect x="76" y="254" width="26" height="18" rx="1" />
        <rect x="118" y="250" width="20" height="16" rx="1" />
        <rect x="150" y="256" width="24" height="16" rx="1" />
        <rect x="24" y="296" width="28" height="18" rx="1" />
        <rect x="70" y="288" width="24" height="18" rx="1" />
        <rect x="112" y="284" width="30" height="18" rx="1" />
        <rect x="160" y="290" width="22" height="16" rx="1" />
      </g>
      <path d="M470 236 h40 l-6 8 h-30z" fill="#2f4f63" />
      <path d="M488 236 v-22 l14 20z" fill="#f9efe2" />
    </svg>
  )
}

function SlideArt({ n, design }: { n: number; design: Design }) {
  if (n === 1) {
    return (
      <div className="pp-slide" data-n="1">
        <span className="pp-s1-title">Team Offsite 2026</span>
        <span className="pp-s1-sub" />
      </div>
    )
  }
  if (n >= 3) {
    const rows = [
      [300, 240, 270],
      [260, 300, 200],
      [280, 220, 250],
      [240, 290, 230],
    ][(n - 3) % 4]
    return (
      <div className="pp-slide" data-n="other">
        <span className="pp-o-title" style={{ width: [260, 300, 220, 280][(n - 3) % 4] }} />
        {rows.map((w, i) => (
          <span key={i} className="pp-o-row" style={{ width: w }} />
        ))}
      </div>
    )
  }
  const L = LOOK[design]
  const [px, py, pw, ph] = L.photo
  return (
    <div className="pp-slide" data-light={L.light || undefined}>
      <div className="pp-panel" data-show={L.panel > 0 || undefined} />
      <div className="pp-photo" style={{ left: px, top: py, width: pw, height: ph }}>
        <Photo />
      </div>
      <div className="pp-shade" style={{ opacity: L.shade }} />
      <span className="pp-rule" data-show={L.rule || undefined} />
      <span className="pp-title" style={{ transform: `translate(${L.title[0]}px, ${L.title[1]}px)` }}>
        Lisbon, in May
      </span>
      <div className="pp-bullets" style={{ transform: `translate(${L.bullets[0]}px, ${L.bullets[1]}px)` }}>
        {[210, 168, 188].map((w, i) => (
          <span key={i} className="pp-bullet">
            <span className="pp-dot" />
            <span className="pp-line" style={{ width: w }} />
          </span>
        ))}
      </div>
    </div>
  )
}

/** A slide scaled into a box of the given width. */
function Mini({ n, design, width, style }: { n: number; design: Design; width: number; style?: CSSProperties }) {
  const k = width / 640
  return (
    <div className="pp-mini" style={{ width, height: 360 * k, ...style }}>
      <div style={{ transform: `scale(${k})`, transformOrigin: '0 0' }}>
        <SlideArt n={n} design={design} />
      </div>
    </div>
  )
}

/* ---- Chrome ---- */

const ICON = { size: 15, strokeWidth: 1.6 }

function Tabs({ layout }: { layout: Layout }) {
  const tabs = layout === 'wide' ? ['Home', 'Insert', 'Draw', 'Design', 'Transitions', 'Animations', 'Slide Show', 'Review', 'View'] : ['Home', 'Insert', 'Draw', 'Design']
  return (
    <div className="pp-tabs">
      {tabs.map((t, i) => (
        <span key={t} className="pp-tab" data-active={i === 0 || undefined}>
          {t}
        </span>
      ))}
      <span className="pp-spacer" />
      {layout === 'wide' && <Bar w={52} h={18} r={5} tone={2} />}
      <span className="pp-share">
        <Bar w={30} h={5} tone={1} className="pp-share-bar" />
      </span>
    </div>
  )
}

function Big({ icon, label }: { icon: React.ReactNode; label: number }) {
  return (
    <span className="pp-big">
      {icon}
      <Bar w={label} h={5} tone={3} />
    </span>
  )
}

function Ribbon({ layout, open }: { layout: Layout; open: boolean }) {
  const wide = layout === 'wide'
  return (
    <div className="pp-ribbon">
      <Big icon={<ClipboardPaste size={22} strokeWidth={1.4} />} label={24} />
      <Big icon={<SquarePlus size={22} strokeWidth={1.4} />} label={34} />
      <span className="pp-sep" />
      {wide ? (
        <span className="pp-group">
          <span className="pp-row">
            <span className="pp-field" style={{ width: 104 }}>
              <Bar w={52} h={5} tone={3} />
            </span>
            <span className="pp-field" style={{ width: 34 }}>
              <Bar w={12} h={5} tone={3} />
            </span>
          </span>
          <span className="pp-row pp-icons">
            <Bold {...ICON} />
            <Italic {...ICON} />
            <Underline {...ICON} />
            <Strikethrough {...ICON} />
          </span>
        </span>
      ) : (
        <span className="pp-group">
          <span className="pp-row pp-icons">
            <Bold {...ICON} />
            <Italic {...ICON} />
            <Underline {...ICON} />
          </span>
          <span className="pp-row pp-icons">
            <AlignLeft {...ICON} />
            <AlignCenter {...ICON} />
            <List {...ICON} />
          </span>
        </span>
      )}
      {wide && (
        <>
          <span className="pp-sep" />
          <span className="pp-group">
            <span className="pp-row pp-icons">
              <List {...ICON} />
              <ListOrdered {...ICON} />
            </span>
            <span className="pp-row pp-icons">
              <AlignLeft {...ICON} />
              <AlignCenter {...ICON} />
              <AlignRight {...ICON} />
              <AlignJustify {...ICON} />
            </span>
          </span>
          <span className="pp-sep" />
          <Big icon={<Shapes size={22} strokeWidth={1.4} />} label={30} />
          <Big icon={<Layers size={22} strokeWidth={1.4} />} label={32} />
        </>
      )}
      <span className="pp-spacer" />
      <span className="pp-sep" />
      <span className="pp-designer" data-target="designer" data-open={open || undefined}>
        <LayoutDashboard size={22} strokeWidth={1.5} className="pp-designer-icon" />
        <span className="pp-designer-label">Designer</span>
      </span>
    </div>
  )
}

const IDEAS: Design[] = ['band', 'split', 'overlay']

/* ---- Script ---- */

async function script(a: Act<S>) {
  // Narrow, the rail is out of frame: the story starts on slide 2
  const t = a.rect('thumb-2')
  const rail = t.x + t.width > 0
  if (!rail) a.snap({ slide: 2 })
  await a.wait(700)
  a.mark('open')
  if (rail) {
    await a.click('thumb-2')
    await a.set({ slide: 2 })
    await a.wait(1000)
  }

  a.mark('designer')
  await a.click({ at: 'designer', x: 0.5, y: 0.3 })
  await a.set({ pane: true, ideas: true })
  await a.wait(1300)

  await a.move({ at: 'idea-2', x: 0.82, y: 0.78 })
  await a.wait(400)
  a.mark('pick')
  await a.click()
  await a.set({ design: 'split', picked: 2 })
  await a.wait(2800)

  a.mark('undo')
  await a.key('cmd+z')
  await a.set({ design: 'plain', picked: 0 })
  await a.wait(1200)
  await a.click('close')
  await a.set({ pane: false, ideas: false })
  await a.wait(900)
  if (rail) {
    await a.click('thumb-1')
    await a.set({ slide: 1 })
  }
  await a.wait(1200)
}

export default function PowerPointDemo() {
  return (
    <Stage
      width={G.wide.w}
      height={G.wide.h}
      compact={{ below: 600, width: G.compact.w, height: G.compact.h }}
      initial={initial}
      poster={poster}
      script={script}
      cursor={{ at: 'thumb-1' }}
      accent="#c43e1c"
      className="pp-stage"
    >
      {(s, _rect, layout) => {
        const g = G[layout]
        const f = fit(layout, s.pane)
        return (
          <Window title="Team Offsite" className="pp-window" data-layout={layout} style={{ left: g.win.x, top: g.win.y, width: g.win.w, height: g.win.h }}>
            <Tabs layout={layout} />
            <Ribbon layout={layout} open={s.pane} />
            <div className="pp-main">
              <aside className="pp-rail" style={{ width: g.rail }}>
                {[1, 2, 3, 4, 5, 6].map((n, i) => (
                  <div key={n} className="pp-thumb" style={{ top: 12 + i * g.step }}>
                    <span className="pp-num">{n}</span>
                    <div className="pp-thumb-box" data-target={`thumb-${n}`} data-selected={s.slide === n || undefined}>
                      <Mini n={n} design={n === 2 ? s.design : 'plain'} width={g.thumb} />
                    </div>
                  </div>
                ))}
              </aside>
              <div className="pp-work" data-crop>
                <div className="pp-canvas" data-crop style={{ height: g.canvas }}>
                  <div className="pp-fit" style={{ transform: `translate(${f.x}px, ${f.y}px) scale(${f.k})` }}>
                    {[1, 2].map((n) => (
                      <div key={n} className="pp-page" data-on={s.slide === n || undefined}>
                        <SlideArt n={n} design={n === 2 ? s.design : 'plain'} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pp-notes">
                  <Bar w={layout === 'wide' ? 96 : 64} h={5} tone={2} />
                </div>
                <div className="pp-status">
                  <Bar w={54} h={5} tone={3} />
                  <span className="pp-spacer" />
                  <Bar w={layout === 'wide' ? 120 : 60} h={5} tone={2} />
                </div>
                <aside className="pp-pane" data-open={s.pane || undefined} style={{ width: g.pane }}>
                  <div className="pp-pane-head">
                    <Text className="pp-pane-title">Designer</Text>
                    <span className="pp-close" data-target="close">
                      <X size={14} strokeWidth={1.8} />
                    </span>
                  </div>
                  {IDEAS.map((d, i) => (
                    <div
                      key={d}
                      className="pp-idea"
                      data-target={`idea-${i + 1}`}
                      data-show={s.ideas || undefined}
                      data-picked={s.picked === i + 1 || undefined}
                      style={{ '--d': s.ideas ? `${180 + i * 70}ms` : `${(2 - i) * 40}ms` } as CSSProperties}
                    >
                      <Mini n={2} design={d} width={g.idea} />
                    </div>
                  ))}
                </aside>
              </div>
            </div>
          </Window>
        )
      }}
    </Stage>
  )
}
