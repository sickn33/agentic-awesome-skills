import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Phone, Stage, Window } from '../kit'
import './scenes.css'

export const sceneLessons = [
  { id: 'dashboard-phone', title: 'Compose the two-device story', note: 'A payment arrives on the dashboard and phone. Give each device a readable role; keep the amount and confirmation visible together.', bad: 'The phone hides the payment it is explaining', good: 'Dashboard and phone share the story without covering it' },
  { id: 'window-satellite', title: 'Place a satellite around the story', note: 'An export window and its finished package. The receipt can overlap the window, but the settings and export action still need their own space.', bad: 'The receipt sits over the settings and action', good: 'The receipt straddles a quiet edge of the window' },
  { id: 'window-focus', title: 'Choose one window to lead', note: 'Assets, resolved feedback and a release ready to publish. Use depth to keep the supporting windows present while the final action leads.', bad: 'Three active windows compete for attention', good: 'Supporting windows recede behind the publish step' },
  { id: 'colored-layers', title: 'Use the ground to frame the layers', note: 'A paid invoice and its upcoming bank deposit. The background can carry warmth without painting every surface and status the same color.', bad: 'Ground, invoice and deposit compete in one saturated field', good: 'A warm ground frames distinct, readable layers' },
  { id: 'material-contrast', title: 'Separate dark and light materials', note: 'A dark file workspace with a light document preview. Each material needs its own foreground, edge and depth against the surrounding scene.', bad: 'Inherited colors flatten the dark and light surfaces', good: 'Each surface keeps readable ink and a distinct boundary' },
  { id: 'story-crop', title: 'Crop to the action and payoff', note: 'A library with a launch package ready to download. Keep the useful part at reading size; the rest of the application can continue beyond the frame.', bad: 'The whole application becomes a thumbnail', good: 'A deliberate crop keeps the package and action readable' },
  { id: 'result-weight', title: 'Give the result the most weight', note: 'A file has just uploaded into a folder. Ask what the eye lands on first: it should be the file the story is about, not the list around it.', bad: 'The new file is one thin row in a long list', good: 'Fewer, larger rows; the new file is the heaviest thing in the frame' },
  { id: 'crop-filler', title: 'Crop filler, never the story', note: 'The same folder, run off the right edge. A crop may cut placeholder columns; it must leave every value the story depends on whole.', bad: 'The crop cuts the size the story ends on', good: 'The crop falls past the last value that matters' },
  { id: 'tile-lead', title: 'Give one tile the lead', note: 'Four features in a grid. Equal tiles with equal content read as a template; one hero tile and quieter neighbors give the eye a place to start.', bad: 'Four equal tiles, each a heading and bars', good: 'One hero tile with the product; the others a number, a sentence, a mark' },
] as const

type SceneId = typeof sceneLessons[number]['id']
type SceneProps = { good: boolean; compact: boolean }

function Mark({ kind = 'check' }: { kind?: 'check' | 'file' | 'arrow' | 'download' }) {
  const paths = { check: 'm4 10 4 4 8-8', file: 'M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 13h5', arrow: 'M3 10h14m-5-5 5 5-5 5', download: 'M10 2v10m-4-4 4 4 4-4M4 14v4h12v-4' }
  return <svg className="cs-mark" width="18" height="18" viewBox="0 0 20 20" aria-hidden><path d={paths[kind]} /></svg>
}

function Action({ children }: { children: string }) { return <span className="cs-action">{children}<Mark kind="arrow" /></span> }
function Status({ children }: { children: string }) { return <span className="cs-status"><Mark />{children}</span> }

function DashboardPhone({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-device" data-good={good || undefined} data-compact={compact || undefined}>
    <Window title="Payments" lights="grey" className="cs-device-window">
      <div className="cs-dashboard"><div className="cs-eyebrow">This month</div><h3>$12,480<span>received</span></h3><div className="cs-mini-chart" aria-label="Payments grew over the last five days">{[26, 42, 36, 57, 72].map((v, i) => <i key={i} style={{ height: v }} />)}</div><div className="cs-payment-row"><div>Fable Studio<small>Invoice 1042</small></div><strong>$2,400</strong></div><Status>Payment received</Status></div>
    </Window>
    <Phone width={228} frame="silver" className="cs-device-phone">
      <div className="cs-phone-app"><h3>Payments</h3><p>Today</p><div className="cs-phone-payment"><span className="cs-phone-check"><Mark /></span><h4>Payment received</h4><strong>$2,400</strong><p>Fable Studio · Invoice 1042</p></div><div className="cs-phone-link">View payment <Mark kind="arrow" /></div></div>
    </Phone>
  </div>
}

function WindowSatellite({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-export" data-good={good || undefined} data-compact={compact || undefined}>
    <Window title="Asset export" lights="grey" className="cs-export-window"><div className="cs-export-content"><div><h3>Campaign assets</h3><p>24 assets selected</p></div><div className="cs-export-settings"><span>Format<strong>PNG</strong></span><span>Resolution<strong>2× original</strong></span></div><Action>Export package</Action></div><div className="cs-export-preview" aria-hidden><i /><i /><i /></div></Window>
    <div className="cs-export-receipt"><span className="cs-receipt-icon"><Mark kind="download" /></span><div><h3>Package ready</h3><p>Campaign-assets.zip</p><span>24 files · 18.6 MB</span></div><Status>Saved to downloads</Status></div>
  </div>
}

function WindowFocus({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-focus" data-good={good || undefined} data-compact={compact || undefined}>
    <Window title="Assets" lights="grey" className="cs-focus-assets"><div className="cs-back-content"><Status>24 assets ready</Status><div className="cs-file-tiles" aria-hidden><i /><i /><i /></div></div></Window>
    <Window title="Feedback" lights="grey" className="cs-focus-feedback"><div className="cs-back-content"><Status>All comments resolved</Status><p>Reviewed by Maya and Jon</p></div></Window>
    <Window title="Publish" lights="grey" className="cs-focus-publish"><div className="cs-publish-content"><h3>Ready to launch</h3><p>Homepage · Summer release</p><div className="cs-publish-checks"><Status>Assets approved</Status><Status>Feedback resolved</Status></div><Action>Publish release</Action></div></Window>
  </div>
}

function ColoredLayers({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-color" data-good={good || undefined} data-compact={compact || undefined}>
    <div className="cs-invoice"><div className="cs-invoice-head"><span>Invoice 1042</span><Status>Paid</Status></div><h3>Studio Lake</h3><p>Design retainer · June</p><div className="cs-invoice-total">$840.00</div><div className="cs-invoice-detail"><span>Design services</span><span>$800.00</span></div><div className="cs-invoice-detail"><span>Tax</span><span>$40.00</span></div><div className="cs-invoice-paid"><Mark />Paid June 12</div></div>
    <div className="cs-deposit"><span className="cs-eyebrow">Bank deposit</span><h3>$840.00</h3><p>Arriving tomorrow</p><div><span>Checking ··2048</span><Mark kind="arrow" /></div></div>
  </div>
}

function MaterialContrast({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-material" data-good={good || undefined} data-compact={compact || undefined}>
    <Window title="Workspace files" lights="grey" className="cs-files-window"><div className="cs-files-content"><h3>Launch assets</h3><p>Shared with the product team</p><div className="cs-file-row" data-selected><Mark kind="file" /><div>Launch brief<small>Updated today</small></div><span>PDF</span></div><div className="cs-file-row"><Mark kind="file" /><div>Brand guidelines<small>Updated yesterday</small></div><span>PDF</span></div></div></Window>
    <div className="cs-document-preview"><div className="cs-preview-meta"><span>Document preview</span><span>1 / 4</span></div><h3>Launch brief</h3><p>A simpler way to work together.</p><div className="cs-doc-rule" /><h4>The release</h4><p>Shared projects, clear ownership, and one place for feedback.</p><div className="cs-preview-foot"><span>Ready for review</span><Mark kind="arrow" /></div></div>
  </div>
}

function LibraryApp() {
  return <Window title="Asset library" toolbar={<span />} lights="grey" className="cs-library-window"><div className="cs-library-shell"><aside><strong>Workspace</strong><span>Overview</span><span data-active>Assets</span><span>Activity</span><span>Settings</span></aside><div className="cs-library-main"><div className="cs-eyebrow">Campaign launch</div><h3>Launch package</h3><p>Everything your team needs to publish.</p><div className="cs-bundle"><span className="cs-bundle-icon"><Mark kind="file" /></span><div><strong>Summer release</strong><span>24 assets · 18.6 MB</span></div></div><Status>All 24 assets ready</Status><Action>Download package</Action></div><div className="cs-library-context" aria-hidden><i /><i /><i /><i /><i /><i /></div></div></Window>
}

function StoryCrop({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-crop" data-good={good || undefined} data-compact={compact || undefined}><LibraryApp /></div>
}

const FOLDER = [96, 132, 104, 80, 120, 92, 112, 100, 126, 88, 116, 98, 108, 84]

function FileList({ rows, big }: { rows: number; big: boolean }) {
  return <div className="cs-files-list" data-big={big || undefined}>
    <div className="cs-fl-head"><span>Name</span><span>Modified</span><span>Size</span></div>
    <div className="cs-fl-row" data-new><span className="cs-fl-name"><Mark kind="file" />Launch deck.pdf</span><span>Just now</span><span>4.2 MB</span></div>
    {FOLDER.slice(0, rows).map((w, i) => <div className="cs-fl-row" key={i}><span className="cs-fl-name"><Mark kind="file" /><i style={{ width: big ? w : w * 0.8 }} /></span><span><i style={{ width: 54 + (i % 3) * 8 }} /></span><span><i style={{ width: 26 + (i % 4) * 5 }} /></span></div>)}
  </div>
}

function ResultWeight({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-upload" data-good={good || undefined} data-compact={compact || undefined}>
    <Window title="Projects" lights="grey" className="cs-upload-window"><FileList rows={good ? 8 : 14} big={good} /></Window>
  </div>
}

function CropFiller({ good, compact }: SceneProps) {
  return <div className="cs-scene cs-upload cs-cropcut" data-good={good || undefined} data-compact={compact || undefined}>
    <Window title="Projects" lights="grey" className="cs-upload-window"><FileList rows={8} big /></Window>
  </div>
}

function TileLead({ good, compact }: SceneProps) {
  const tile = (title: string, body: JSX.Element, cls = '') => <div className={`cs-tile ${cls}`}><h3>{title}</h3>{body}</div>
  const bars = <div className="cs-tile-bars"><i /><i /><i /></div>
  if (!good) return <div className="cs-scene cs-tiles" data-compact={compact || undefined}>
    {tile('Write together', bars)}{tile('Find anything', bars)}{tile('Works offline', bars)}{tile('Connects your tools', bars)}
  </div>
  return <div className="cs-scene cs-tiles" data-good data-compact={compact || undefined}>
    {tile('Write together', <Window title="Q3 plan" lights="grey" className="cs-tile-window"><div className="cs-tile-doc"><strong>Beta opens to every team on May 14.</strong><span className="cs-tile-caret">Priya</span><div className="cs-tile-bars"><i /><i /></div></div></Window>, 'cs-tile-hero')}
    {tile('Find anything', <div className="cs-tile-big">0.2s</div>)}
    {tile('Works offline', <p>Edits on the plane merge when you land.</p>)}
    {tile('Connects your tools', <div className="cs-tile-marks"><i /><i /><i /></div>)}
  </div>
}

function Scene({ id, ...props }: SceneProps & { id: SceneId }) {
  if (id === 'result-weight') return <ResultWeight {...props} />
  if (id === 'crop-filler') return <CropFiller {...props} />
  if (id === 'tile-lead') return <TileLead {...props} />
  if (id === 'dashboard-phone') return <DashboardPhone {...props} />
  if (id === 'window-satellite') return <WindowSatellite {...props} />
  if (id === 'window-focus') return <WindowFocus {...props} />
  if (id === 'colored-layers') return <ColoredLayers {...props} />
  if (id === 'material-contrast') return <MaterialContrast {...props} />
  return <StoryCrop {...props} />
}

function SceneFrame({ id, good }: { id: SceneId; good: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [compactWidth, setCompactWidth] = useState(340)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setCompactWidth(Math.min(340, Math.max(280, Math.floor(element.getBoundingClientRect().width))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="cs-frame" data-narrow={compactWidth < 320 || undefined} style={{ '--cs-width': `${compactWidth}px` } as CSSProperties}>
    <Stage width={540} height={420} compact={{ below: 520, width: compactWidth, height: 520 }} className="cs-stage">{(_s, _r, layout) => <Scene id={id} good={good} compact={layout === 'compact'} />}</Stage>
  </div>
}

export function SceneComparison({ lessonId }: { lessonId: string }) {
  const lesson = sceneLessons.find(item => item.id === lessonId)
  if (!lesson) return null
  return <section className="cs-lesson"><header><div><h2>{lesson.title}</h2><p>{lesson.note}</p></div></header><div className="cs-pair">{[false, true].map(good => <figure className="cs-figure" key={String(good)}>
    <div className="cs-side-label">{good ? 'Considered composition' : 'Composition problem'}</div>
    <SceneFrame id={lesson.id} good={good} />
    <figcaption>{good ? lesson.good : lesson.bad}</figcaption>
  </figure>)}</div></section>
}
