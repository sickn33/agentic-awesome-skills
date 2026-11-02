import { Eye, Frame, Image as ImageIcon, MessageCircle, Minus, MousePointer2, PenTool, Pipette, Plus, Square, Type, X } from 'lucide-react'
import { Bar, Facepile, Follow, Popover, Stage, Text, Window, box, type Act, type Point, BrandMark } from '../../kit'
import './figma.css'

// Figma: select a button layer, drag its fill's hue in the color picker and
// watch the button change live, while Maya's cursor drifts around nearby.
// Loops by undoing the change (cmd+z) and deselecting.

type S = {
  hover: boolean
  selected: boolean
  picker: boolean
  hue: number
  dragging: boolean
  /** Maya's cursor; null is her resting spot */
  maya: Point | null
}

// The fill keeps its saturation and brightness; only the hue is dragged
const SAT = 0.66
const VAL = 0.97
const HUE_FROM = 252
const HUE_TO = 336

function hex(h: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return VAL - VAL * SAT * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Maya's cursor waypoints, in canvas fractions resolved against the canvas rect
const MAYA = {
  rest: { x: 0.8, y: 0.3 },
  a: { x: 0.86, y: 0.46 },
  b: { x: 0.74, y: 0.36 },
  c: { x: 0.6, y: 0.1 },
  d: { x: 0.47, y: 0.13 },
  e: { x: 0.62, y: 0.27 },
}

const initial: S = { hover: false, selected: false, picker: false, hue: HUE_FROM, dragging: false, maya: null }

function mayaAt(c: { x: number; y: number; width: number; height: number }, p: Point): Point {
  return { x: c.x + c.width * p.x, y: c.y + c.height * p.y }
}

async function script(a: Act<S>) {
  const maya = (p: Point) => a.set({ maya: mayaAt(a.rect('canvas'), p) })
  await a.wait(500)
  maya(MAYA.a)

  // 1. Select the button on the canvas
  a.mark('select')
  await a.move({ at: 'button', x: 0.82, y: 0.7 })
  await a.set({ hover: true })
  await a.wait(350)
  await a.click()
  await a.set({ hover: false, selected: true })
  maya(MAYA.b)
  await a.wait(900)

  // 2. Open its fill
  a.mark('fill')
  await a.move('fill-swatch')
  await a.wait(150)
  await a.click()
  await a.set({ picker: true })
  maya(MAYA.c)
  await a.wait(700)

  // 3. Drag the hue; the button follows live
  a.mark('drag')
  await a.move('hue-thumb')
  await a.wait(200)
  const track = a.rect('hue-track')
  const span = track.width - 12
  const end = { x: track.x + 6 + (span * HUE_TO) / 360, y: track.y + track.height / 2 }
  await a.drag(end, (at) => {
    const t = Math.max(0, Math.min(1, (at.x - track.x - 6) / span))
    a.put({ dragging: true, hue: Math.max(HUE_FROM, t * 360) })
  })
  await a.set({ dragging: false, hue: HUE_TO })
  maya(MAYA.d)
  await a.wait(900)

  // 4. Click away: the picker closes, the change holds
  a.mark('done')
  await a.click('blank')
  await a.set({ picker: false, selected: false })
  maya(MAYA.e)
  await a.wait(2200)

  // 5. Undo, so the loop starts where it began
  a.mark('undo')
  await a.key('cmd+z')
  await a.set({ hue: HUE_FROM })
  a.set({ maya: null })
  await a.wait(1600)
}

const LAYERS: { depth: number; icon: 'frame' | 'type' | 'image' | 'rect'; w: number; name?: string }[] = [
  { depth: 0, icon: 'frame', w: 46 },
  { depth: 1, icon: 'rect', w: 28 },
  { depth: 1, icon: 'frame', w: 36 },
  { depth: 2, icon: 'type', w: 52 },
  { depth: 2, icon: 'type', w: 40 },
  { depth: 2, icon: 'frame', w: 0, name: 'Button' },
  { depth: 2, icon: 'image', w: 34 },
  { depth: 0, icon: 'frame', w: 40 },
  { depth: 0, icon: 'frame', w: 50 },
  { depth: 0, icon: 'frame', w: 38 },
]

function LayerIcon({ kind }: { kind: (typeof LAYERS)[number]['icon'] }) {
  const p = { size: 13, strokeWidth: 1.6, className: 'fg-icon' }
  if (kind === 'type') return <Type {...p} />
  if (kind === 'image') return <ImageIcon {...p} />
  if (kind === 'rect') return <Square {...p} />
  return <Frame {...p} />
}

export default function FigmaDemo() {
  return (
    <Stage
      width={860}
      height={480}
      initial={initial}
      script={script}
      cursor={{ at: 'blank' }}
      compact={{ below: 600, width: 358, height: 440 }}
      accent="#0D99FF"
      className="fg"
    >
      {(s, rect, layout) => {
        const color = `#${hex(s.hue)}`
        const fill = rect('fill-row')
        const props = rect('props')
        // Wide: the picker sits beside the panel, lifted so its sliders stay in
        // view. Compact: there is no room beside it without covering the
        // button, so it opens over the panel, under the fill row.
        const picker =
          layout === 'compact'
            ? { left: props.x + 8, top: fill.y + fill.height + 6, width: props.width - 16 }
            : { left: props.x - 8 - 220, top: Math.min(fill.y - 10, 480 - 24 - 244), width: 220 }
        const btn = rect('button')
        return (
          <>
            <Window
              className="fg-window"
              data-layout={layout}
              lead={
                <span className="fg-tools">
                  <BrandMark brand="figma" tile={false} size={16} width={11} className="fg-mark" />
                  <span className="fg-tool" data-active>
                    <MousePointer2 size={14} strokeWidth={1.6} />
                  </span>
                  <span className="fg-tool">
                    <Frame size={14} strokeWidth={1.6} />
                  </span>
                  <span className="fg-tool">
                    <Square size={14} strokeWidth={1.6} />
                  </span>
                  <span className="fg-tool">
                    <PenTool size={14} strokeWidth={1.6} />
                  </span>
                  <span className="fg-tool">
                    <Type size={14} strokeWidth={1.6} />
                  </span>
                  {layout === 'wide' && (
                    <span className="fg-tool">
                      <MessageCircle size={14} strokeWidth={1.6} />
                    </span>
                  )}
                </span>
              }
              toolbar={
                <span className="fg-share-row">
                  <Facepile names={['Maya', 'Ana']} size={22} tones={['success', 'accent']} />
                  <span className="fg-share">Share</span>
                </span>
              }
            >
              <div className="fg-body">
                {layout === 'wide' && (
                  <aside className="fg-layers" data-crop>
                    <div className="fg-file">
                      <Text className="fg-file-name">Landing page</Text>
                      <Bar w={44} h={5} tone={3} />
                    </div>
                    <div className="fg-tabs">
                      <Bar w={34} h={6} tone={5} />
                      <Bar w={30} h={6} tone={3} />
                    </div>
                    <div className="fg-tree">
                      {LAYERS.map((l, i) => (
                        <div
                          key={i}
                          className="fg-layer"
                          data-depth={l.depth}
                          data-selected={(l.name && s.selected) || undefined}
                          data-parent={(i === 0 || i === 2) && s.selected ? true : undefined}
                          style={{ paddingLeft: 10 + l.depth * 14 }}
                        >
                          <LayerIcon kind={l.icon} />
                          {l.name ? <Text className="fg-layer-name">{l.name}</Text> : <Bar w={l.w} h={5} tone={l.depth === 0 ? 4 : 3} />}
                        </div>
                      ))}
                    </div>
                  </aside>
                )}

                <div className="fg-canvas" data-target="canvas" data-crop>
                  <div className="fg-frames">
                    <div className="fg-frame-wrap fg-desktop">
                      <Text className="fg-frame-label">Desktop</Text>
                      <div className="fg-frame">
                        <div className="fg-nav">
                          <Bar w={12} h={12} r={4} tone={5} />
                          <span className="fg-nav-links">
                            <Bar w={22} h={4} tone={3} />
                            <Bar w={18} h={4} tone={3} />
                            <Bar w={24} h={4} tone={3} />
                          </span>
                          <Bar w={30} h={12} r={6} tone={2} />
                        </div>
                        <div className="fg-hero">
                          <div className="fg-hero-copy">
                            <Bar w={118} h={9} r={3} tone={5} />
                            <Bar w={84} h={9} r={3} tone={5} />
                            <div className="fg-sub">
                              <Bar w={112} h={4} tone={3} />
                              <Bar w={90} h={4} tone={3} />
                            </div>
                            <div className="fg-buttons">
                              <span
                                className="fg-cta"
                                data-target="button"
                                data-dragging={s.dragging || undefined}
                                style={{ background: color }}
                              >
                                <span className="fg-cta-label" />
                              </span>
                              <Bar w={46} h={22} r={6} tone={2} />
                            </div>
                          </div>
                          <div className="fg-hero-art" data-crop>
                            <span className="fg-art-sun" />
                            <span className="fg-art-hill" />
                          </div>
                        </div>
                        <div className="fg-logos">
                          {[30, 24, 34, 26].map((w, i) => (
                            <Bar key={i} w={w} h={5} tone={2} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="fg-frame-wrap fg-mobile">
                      <Bar className="fg-frame-label-bar" w={30} h={5} tone={3} />
                      <div className="fg-frame">
                        <div className="fg-nav">
                          <Bar w={10} h={10} r={3} tone={5} />
                          <Bar w={12} h={4} tone={3} />
                        </div>
                        <Bar w={64} h={7} r={3} tone={5} />
                        <Bar w={48} h={7} r={3} tone={5} style={{ marginTop: 7 }} />
                        <div className="fg-sub">
                          <Bar w={70} h={4} tone={3} />
                          <Bar w={56} h={4} tone={3} />
                        </div>
                        <Bar w={52} h={18} r={5} tone={4} style={{ marginTop: 10 }} />
                        <div className="fg-mobile-art" />
                      </div>
                    </div>

                    <div className="fg-frame-wrap fg-row2">
                      <Bar className="fg-frame-label-bar" w={36} h={5} tone={3} />
                      <div className="fg-frame">
                        <Bar w={90} h={8} r={3} tone={5} />
                        <div className="fg-cards">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="fg-card" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="fg-blank" data-target="blank" />
                </div>

                <aside className="fg-props" data-target="props" data-crop>
                  <div className="fg-props-tabs">
                    <Bar w={34} h={6} tone={5} />
                    <Bar w={44} h={6} tone={3} />
                    <span className="fg-zoom">
                      <Bar w={22} h={5} tone={3} />
                    </span>
                  </div>
                  <div className="fg-props-body">
                    {/* Nothing selected: the page */}
                    <div className="fg-props-layer" data-show={!s.selected || undefined}>
                      <section className="fg-section">
                        <div className="fg-section-head">
                          <Bar w={28} h={6} tone={5} />
                        </div>
                        <div className="fg-row">
                          <span className="fg-field fg-field-wide">
                            <span className="fg-swatch" style={{ background: '#F5F5F5' }} />
                            <Bar w={44} h={5} tone={4} />
                            <Bar w={20} h={5} tone={3} style={{ marginLeft: 'auto' }} />
                          </span>
                        </div>
                      </section>
                      {[44, 36, 40].map((w, i) => (
                        <section key={i} className="fg-section">
                          <div className="fg-section-head">
                            <Bar w={w} h={6} tone={5} />
                            <Plus size={13} strokeWidth={1.6} className="fg-icon" />
                          </div>
                        </section>
                      ))}
                    </div>

                    {/* The button */}
                    <div className="fg-props-layer" data-show={s.selected || undefined}>
                      {layout === 'wide' && (
<section className="fg-section">
                        <div className="fg-section-head">
                          <Bar w={40} h={6} tone={5} />
                        </div>
                        <div className="fg-row fg-pair">
                          <span className="fg-field">
                            <Bar w={7} h={5} tone={3} />
                            <Bar w={26} h={5} tone={4} />
                          </span>
                          <span className="fg-field">
                            <Bar w={7} h={5} tone={3} />
                            <Bar w={20} h={5} tone={4} />
                          </span>
                        </div>
                        <div className="fg-row fg-pair">
                          <span className="fg-field">
                            <Bar w={7} h={5} tone={3} />
                            <Bar w={22} h={5} tone={4} />
                          </span>
                          <span className="fg-field">
                            <Bar w={7} h={5} tone={3} />
                            <Bar w={18} h={5} tone={4} />
                          </span>
                        </div>
                      </section>
                      )}
                      <section className="fg-section">
                        <div className="fg-section-head">
                          <Text className="fg-section-title">Fill</Text>
                          <Plus size={13} strokeWidth={1.6} className="fg-icon" />
                        </div>
                        <div className="fg-row" data-target="fill-row">
                          <span className="fg-field fg-field-wide" data-open={s.picker || undefined}>
                            <span className="fg-swatch" data-target="fill-swatch" style={{ background: color }} data-dragging={s.dragging || undefined} />
                            <span className="fg-hex">{hex(s.hue)}</span>
                            <Bar w={20} h={5} tone={3} style={{ marginLeft: 'auto' }} />
                          </span>
                          <Eye size={13} strokeWidth={1.6} className="fg-icon" />
                          <Minus size={13} strokeWidth={1.6} className="fg-icon" />
                        </div>
                      </section>
                      {[38, 42, 36].map((w, i) => (
                        <section key={i} className="fg-section">
                          <div className="fg-section-head">
                            <Bar w={w} h={6} tone={5} />
                            <Plus size={13} strokeWidth={1.6} className="fg-icon" />
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </Window>

            {/* Hover and selection on the canvas, from the measured button */}
            <div className="fg-hover" data-show={(s.hover && !s.selected) || undefined} style={box(btn)} />
            <div className="fg-select" data-show={s.selected || undefined} style={box(btn)}>
              <i data-c="tl" />
              <i data-c="tr" />
              <i data-c="bl" />
              <i data-c="br" />
            </div>

            {/* Maya, on the canvas with us */}
            <Follow className="fg-maya" to={{ ...(s.maya ?? mayaAt(rect('canvas'), MAYA.rest)), width: 0, height: 0 }} stiffness={0.012}>
              <svg width="16" height="17" viewBox="0 0 16 17" className="fg-maya-arrow" aria-hidden>
                <path d="M1.5 1.5 14 7.2l-5.6 1.6-2.3 5.6Z" />
              </svg>
              <span className="fg-maya-name">Maya</span>
            </Follow>

            {/* The color picker, beside the properties panel */}
            <Popover
              show={s.picker}
              origin="top right"
              className="fg-picker"
              data-layout={layout}
              style={picker}
            >
              <div className="fg-picker-head">
                <Bar w={40} h={6} tone={5} />
                <Bar w={42} h={6} tone={3} />
                <X size={13} strokeWidth={1.6} className="fg-icon fg-picker-x" />
              </div>
              <div className="fg-picker-body">
                <div className="fg-sv" data-crop style={{ ['--hue' as string]: `hsl(${s.hue} 100% 50%)` }}>
                  <span className="fg-sv-knob" style={{ left: `${SAT * 100}%`, top: `${(1 - VAL) * 100}%`, background: color }} />
                </div>
                <div className="fg-sliders">
                  <Pipette size={14} strokeWidth={1.6} className="fg-icon" />
                  <div className="fg-tracks">
                    <div className="fg-hue" data-target="hue-track">
                      <span className="fg-hue-thumb" data-target="hue-thumb" style={{ left: `calc(6px + (100% - 12px) * ${s.hue / 360})` }} />
                    </div>
                    <div className="fg-alpha" style={{ ['--c' as string]: color }}>
                      <span className="fg-hue-thumb" style={{ left: 'calc(100% - 6px)' }} />
                    </div>
                  </div>
                </div>
                <div className="fg-picker-hex">
                  <span className="fg-field fg-field-sm">
                    <Bar w={20} h={5} tone={4} />
                  </span>
                  <span className="fg-field fg-field-grow">
                    <span className="fg-hex">{hex(s.hue)}</span>
                    <Bar w={20} h={5} tone={3} style={{ marginLeft: 'auto' }} />
                  </span>
                </div>
              </div>
            </Popover>
          </>
        )
      }}
    </Stage>
  )
}
