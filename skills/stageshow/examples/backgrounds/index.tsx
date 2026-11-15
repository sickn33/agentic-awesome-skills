import { useLayoutEffect, useRef, useState } from 'react'
import { Icon, Stage } from '../../kit'
import './backgrounds.css'

// The object stays constant so the ground's contribution is easy to see.
// These are authored examples, not a fixed set of themes or presets.
const studies = [
  { id: 'diagonal', title: 'Diagonal gradient', note: 'Violet moves through pink into coral. A white surface keeps the content quiet.' },
  { id: 'radial', title: 'Radial light', note: 'A broad yellow light meets orange and rose at the edges, without a glow around the card.' },
  { id: 'mesh', title: 'Blended color fields', note: 'Mint, blue and violet meet in large fields. Their lightness changes gradually behind the UI.' },
  { id: 'night', title: 'Color on dark', note: 'Teal and magenta light sit at opposite edges. The clear foreground holds its contrast.' },
  { id: 'bands', title: 'Bands and glass', note: 'Broad ink-blue and cobalt bands leave a narrow pale edge. Their tint stays visible through the glass.' },
  { id: 'spectrum', title: 'Multicolor sweep', note: 'A wide sweep connects cool and warm hues. The card supplies one stable reading area.' },
  { id: 'tint', title: 'Tint', note: 'Lavender gives a white surface enough separation without a heavy shadow.' },
  { id: 'field', title: 'Two color fields', note: 'A warm band and a cool field meet behind the card, away from its content.' },
  { id: 'dots', title: 'Dot grid', note: 'A fine dot grid, fading out toward the edges, gives a canvas feel. The dots stay lighter than any line in the card.' },
  { id: 'halftone', title: 'Halftone', note: 'Dots grow toward one corner and vanish toward the card, so the texture frames the UI rather than sitting under it.' },
  { id: 'blueprint', title: 'Blueprint', note: 'Major and minor rules on deep blue. Two weights of line give scale; the white card is the only solid thing.' },
  { id: 'grain', title: 'Grain', note: 'A soft two-color gradient with fine grain over it, so the color reads as a material, not a screen fill.' },
  { id: 'conic', title: 'Conic sweep', note: 'Color turns around a point off the card’s corner. The sweep gives direction without a hard band.' },
  { id: 'stripes', title: 'Fine stripes', note: 'Hairline diagonals on a pale ground: texture you feel more than see, quieter than the card’s own divider.' },
  { id: 'light', title: 'Soft light', note: 'Sage, peach and cream share a light value, with a calm center for the UI.' },
  { id: 'grid', title: 'Grid', note: 'Fine blue rules establish scale. Their contrast stays below the product’s.' },
  { id: 'architecture', title: 'Architectural lines', note: 'A few precise edges give the scene direction without filling every gap.' },
  { id: 'dark', title: 'Dark material', note: 'A lifted graphite surface separates from the ground through value and edge light.' },
  { id: 'paper', title: 'Warm paper', note: 'Low contrast fibers and a warm shadow support a quiet, tangible surface.' },
  { id: 'graphic', title: 'Graphic geometry', note: 'Ink, ochre and pale blue frame the object with deliberate, substantial crops.' },
] as const

function Digest() {
  return <div className="bg-digest">
    <div className="bg-digest-heading"><span className="bg-digest-icon"><Icon name="calendar" size={18} /></span><div><strong>Weekly digest</strong><span>Every Friday at 09:00</span></div></div>
    <div className="bg-digest-recipient"><span>Recipients</span><strong>Design team <span className="bg-digest-count">6</span></strong></div>
    <div className="bg-digest-footer"><span><i /> Scheduled</span><span className="bg-digest-button">Preview<Icon name="chevron-right" size={13} /></span></div>
  </div>
}

// A real halftone: one dot per cell on a 10px grid, each sized by its distance
// from the top right corner, down to nothing before it reaches the card
function Halftone() {
  const dots: { x: number; y: number; r: number }[] = []
  for (let y = 5; y < 252; y += 10) for (let x = 5; x < 400; x += 10) {
    const d = Math.hypot(400 - x, y) / 260
    const r = 3.4 * (1 - d) ** 1.4
    if (r > 0.35) dots.push({ x, y, r })
  }
  return <svg className="bg-halftone" width="100%" height="100%" viewBox="0 0 400 252" preserveAspectRatio="xMaxYMin slice" aria-hidden>
    {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
  </svg>
}

function Study({ study }: { study: typeof studies[number] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(288)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setWidth(node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <article className="bg-study" data-study={study.id}>
    <div ref={ref} className="bg-picture">
      <Stage specimen width={width} height={252} theme={study.id === 'dark' ? 'dark' : 'light'}>
        {() => <div className={`bg-ground bg-ground--${study.id}`} data-crop>
          {study.id === 'architecture' && <svg className="bg-lines" width="100%" height="100%" viewBox="0 0 400 252" preserveAspectRatio="xMidYMid slice" aria-hidden><path d="M-40 204 114 50H390V-30M-16 228 138 74H414M8 252 162 98H438" /><path d="M114 50v202M390 50 276 164H0" /></svg>}
          {study.id === 'graphic' && <div className="bg-geometry" aria-hidden><span /><i /></div>}
          {study.id === 'halftone' && <Halftone />}
          {study.id === 'grain' && <svg className="bg-grain" width="100%" height="100%" aria-hidden><filter id="bg-grain"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" /></filter><rect width="100%" height="100%" filter="url(#bg-grain)" /></svg>}
          <Digest />
        </div>}
      </Stage>
    </div>
    <h2>{study.title}</h2><p>{study.note}</p>
  </article>
}

export default function Backgrounds() {
  return <div className="bg-gallery">
    <header className="bg-intro"><h1>Backgrounds</h1><p>The same interface on twenty different grounds.</p></header>
    <div className="bg-grid">{studies.map(study => <Study key={study.id} study={study} />)}</div>
  </div>
}
