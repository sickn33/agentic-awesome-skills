import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Connector, Follow, Icon, Stage, States, type Act, type Rect } from '../../kit'
import './annotations.css'
import { CollectionStudy, DetailStudy } from './composed'

const lakePhoto = new URL('../wikipedia/kawaguchiko.jpg', import.meta.url).href

const studies = [
  { id: 'collect', title: 'Usage into an invoice', note: 'Connect three usage sources to one invoice. Blue dots keep flowing after its first update; a matching shared delivery shows where those inputs meet.' },
  { id: 'detail', title: 'A payout and its detail', note: 'Select one payout. A dotted link opens its settlement; a quieter solid leader explains arrival without replacing the product view.' },
  { id: 'chart', title: 'A chart point', note: 'Select one result. The leader joins the measured point to its explanation, then leaves when the selection clears.' },
  { id: 'measure', title: 'Selection guides', note: 'Resize a card by its handle. Its guides and dimensions belong to the same box, including on the return drag.' },
  { id: 'flow', title: 'A request and its reply', note: 'Send a billing event. The solid request points out; the dashed acknowledgement returns only after the receipt arrives.' },
  { id: 'branch', title: 'A shared processing graph', note: 'Store one asset, then send it along a shared trunk to three jobs. Each branch meets its destination cleanly; Clear jobs dismisses the result.' },
  { id: 'stream', title: 'An ongoing event stream', note: 'Connect the feed once. A quiet route stays fixed while moving dashes show events arriving in the activity table; reduced motion keeps its direction visible.' },
  { id: 'follow', title: 'Following a layer', note: 'Arrange a selected layer. Its annotation travels and resizes with the object, then fades intact when selection clears.' },
] as const
type Study = typeof studies[number]['id']
const initialStudy = (): Study => {
  const value = typeof window === 'undefined' ? null : new URL(window.location.href).searchParams.get('annotation')
  return studies.find(study => study.id === value)?.id ?? 'collect'
}
const point = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })

type ChartState = { selected: boolean }
async function chartScript(a: Act<ChartState>) {
  a.mark('start'); await a.wait(650)
  await a.move('point'); await a.click(); a.mark('callout')
  await a.set({ selected: true }); await a.move('chart-rest', { duration: 360 }); await a.wait(2440)
  await a.click(); a.mark('clear')
  await a.set({ selected: false }); await a.wait(700); a.mark('done')
  await a.wait(700)
}
function ChartStudy({ width }: { width: number }) {
  return <Stage width={width} height={width < 480 ? 420 : 380} initial={{ selected: false }} poster={{ selected: true }} script={chartScript} cursor={{ at: { x: 25, y: 340 } }} greys="cool" accent="#5375c8" className={`an-study an-chart${width < 480 ? ' an-chart--compact' : ''}`}>
    {(s, rect) => {
      const p = rect('point'), note = rect('chart-note')
      return <>
        <section className="an-chart-panel" aria-label="API usage chart">
          <header className="an-product-head"><strong>API requests</strong><span>Last 7 days <Icon name="chevron-down" size={11} /></span></header>
          <div className="an-chart-total">8,642 <span>this week</span></div>
          <div className="an-chart-note" data-target="chart-note" data-visible={s.selected || undefined}><strong>Release v2</strong><span>1,840 requests</span></div>
          <div className="an-plot">
            <svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden>
              <path className="an-chart-grid" d="M0 25H400M0 70H400M0 115H400" />
              <path className="an-chart-area" d="M0 112L44 104L87 108L130 80L174 88L217 60L260 30L304 56L348 46L400 20V140H0Z" />
              <path className="an-chart-line" d="M0 112L44 104L87 108L130 80L174 88L217 60L260 30L304 56L348 46L400 20" />
            </svg>
            <span className="an-chart-point" data-target="point" data-cursor="hand" data-selected={s.selected || undefined} />
          </div>
          <div className="an-chart-axis"><span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span></div>
          <span className="an-chart-rest" data-target="chart-rest" />
        </section>
        {/* Meet the bottom edge vertically. A vertical-first elbow would
            finish horizontally along the note's border. */}
        <Connector className="an-chart-leader" from={point(p)} to={{ x: note.x + note.width / 2, y: note.y + note.height }} route="h" dots="none" show={s.selected && p.width > 0 && note.width > 0} />
      </>
    }}
  </Stage>
}

type MeasureState = { selected: boolean; width: number; height: number }
function MeasureStudy({ width }: { width: number }) {
  const compact = width < 480
  const start = { width: compact ? 168 : 256, height: compact ? 136 : 150 }
  const finish = { width: compact ? 188 : 304, height: compact ? 160 : 180 }
  const x = compact ? width < 330 ? 36 + (width - 288) / 2 : Math.max(36, Math.round((width - finish.width - 48) / 2)) : (width - finish.width) / 2 - 14
  const script = useMemo(() => async (a: Act<MeasureState>) => {
    a.mark('start'); await a.wait(650); await a.move('measure-card'); await a.click()
    await a.set({ selected: true }); await a.wait(500)
    await a.move('resize'); const from = a.center('resize'); a.mark('resize')
    await a.drag({ x: from.x + finish.width - start.width, y: from.y + finish.height - start.height }, (p, origin) => a.put({ width: start.width + p.x - origin.x, height: start.height + p.y - origin.y }), { duration: 1400 })
    await a.set(finish); await a.wait(2100)
    await a.move('resize'); const back = a.center('resize'); a.mark('restore')
    await a.drag({ x: back.x - finish.width + start.width, y: back.y - finish.height + start.height }, (p, origin) => a.put({ width: finish.width + p.x - origin.x, height: finish.height + p.y - origin.y }), { duration: 1400 })
    await a.set(start); await a.move('measure-rest'); await a.click()
    await a.set({ selected: false }); await a.wait(650); a.mark('done'); await a.wait(650)
  }, [compact])
  return <Stage key={compact ? 'compact' : 'wide'} width={width} height={compact ? 420 : 380} initial={{ selected: false, ...start }} poster={{ selected: true, ...finish }} script={script} cursor={{ at: { x: width - 30, y: 340 } }} greys="cool" accent="#6979c9" className={`an-study an-measure${width < 330 ? ' an-measure--narrow' : ''}`}>
    {s => <>
      <div className="an-canvas-panel"><header className="an-product-head"><strong>Board layout</strong><span>Project card</span></header><span className="an-canvas-rest" data-target="measure-rest" /></div>
      <div className="an-selection" data-selected={s.selected || undefined} style={{ left: x, top: compact ? 137 : 112, width: s.width, height: s.height }}>
        <div className="an-design-card" data-target="measure-card" data-cursor="hand"><div><span className="an-card-project">Website refresh</span><strong>Release checklist</strong></div><div className="an-card-completion"><strong>6<span> / 8</span></strong><span>tasks complete</span></div><div className="an-card-bottom"><div className="an-card-progress"><i /></div><footer><span>Design team</span><time>Oct 28</time></footer></div></div>
        <div className="an-selection-ring" /><span className="an-resize-handle" data-target="resize" data-cursor="crosshair" />
        <div className="an-width-guide"><span>{Math.round(s.width)} px</span></div>
        <div className="an-height-guide"><span>{Math.round(s.height)}</span></div>
        <span className="an-layer-label">Project</span>
      </div>
    </>}
  </Stage>
}

type FlowState = { step: number }
async function flowScript(a: Act<FlowState>) {
  a.mark('start'); await a.wait(650); await a.move({ at: 'send', x: .92, y: .85 }); await a.click()
  a.mark('request'); await a.set({ step: 1 })
  await a.move('flow-rest', { duration: 350 }); await a.wait(1050)
  a.mark('reply'); await a.set({ step: 2 }); await a.wait(1100)
  a.mark('acknowledged'); await a.set({ step: 3 }); await a.wait(2200)
  await a.move('clear-trace'); await a.click(); a.mark('clear')
  await a.set({ step: 0 }); await a.wait(750); a.mark('done'); await a.wait(650)
}
function FlowStudy({ width }: { width: number }) {
  const compact = width < 480
  return <Stage width={width} height={compact ? 496 : 330} initial={{ step: 0 }} poster={{ step: 3 }} script={flowScript} cursor={{ at: { x: 25, y: compact ? 360 : 270 } }} greys="cool" accent="#468575" className={`an-study an-flow${compact ? ' an-flow--compact' : ''}`}>
    {(s, rect) => {
      const a = rect('billing'), b = rect('workspace')
      const from = compact ? { x: a.x + a.width / 2 - 28, y: a.y + a.height } : { x: a.x + a.width, y: a.y + a.height / 2 - 18 }
      const to = compact ? { x: b.x + b.width / 2 - 28, y: b.y } : { x: b.x, y: b.y + b.height / 2 - 18 }
      const backFrom = compact ? { x: to.x + 56, y: to.y } : { x: to.x, y: to.y + 40 }
      const backTo = compact ? { x: from.x + 56, y: from.y } : { x: from.x, y: from.y + 40 }
      return <>
        <header className="an-flow-title"><strong>Webhook delivery</strong><span data-target="clear-trace" data-cursor="hand">Clear trace</span></header>
        <section className="an-flow-node an-flow-source" data-target="billing" style={compact ? { left: 32, top: 68, width: width - 64 } : { left: 32, top: 90, width: 220 }}>
          <div className="an-node-name"><strong>Invoice paid</strong><span className="an-event-kind">Event</span></div><code>invoice.paid</code>
          <div className="an-event-record"><span>Invoice <b>0084</b></span><strong>$189.00</strong></div>
          <footer className="an-event-footer"><span>Today, 14:32</span><div className="an-send" data-target="send" data-cursor="hand"><States value={String(s.step)} states={{ 0: 'Send event', 1: 'Sending…', 2: 'Awaiting reply', 3: 'Delivered' }} /></div></footer>
        </section>
        <section className="an-flow-node an-flow-destination" data-target="workspace" data-received={s.step >= 2 || undefined} style={compact ? { left: 32, top: 330, width: width - 64 } : { left: width - 196, top: 115, width: 164 }}>
          <div className="an-node-name"><Icon name="bell" size={13} /><strong>Activity</strong></div><span className="an-endpoint">Billing notifications</span>
          <div className="an-receipt"><States align="start" value={s.step >= 2 ? 'received' : 'waiting'} states={{ waiting: 'Waiting for event', received: 'Payment received' }} /></div><div className="an-receipt-amount" data-visible={s.step >= 2 || undefined}>$189.00 <span>Invoice 0084</span></div>
        </section>
        <Connector className="an-request" from={from} to={to} route="straight" show={s.step >= 1 && a.width > 0} arrow label="POST" labelAt={compact ? .37 : .5} />
        <Connector className="an-response" from={backFrom} to={backTo} route="straight" show={s.step >= 2 && b.width > 0} arrow dashed label="200 OK" labelAt={compact ? .37 : .5} />
        <span className="an-composed-rest" data-target="flow-rest" style={{ left: width - 34, top: compact ? 275 : 290 }} />
      </>
    }}
  </Stage>
}

type FollowState = { selected: boolean; arranged: boolean }
async function followScript(a: Act<FollowState>) {
  a.mark('start'); await a.wait(650); await a.move('layer'); await a.click()
  await a.set({ selected: true }); await a.wait(1000)
  await a.move('arrange'); await a.click(); a.mark('arrange')
  await a.set({ arranged: true }); await a.wait(2600)
  await a.move('restore'); await a.click(); a.mark('restore')
  await a.set({ arranged: false }); await a.wait(1400)
  await a.move('follow-rest'); await a.click(); a.mark('clear')
  await a.set({ selected: false }); await a.wait(650); a.mark('done'); await a.wait(650)
}
function FollowStudy({ width }: { width: number }) {
  const compact = width < 480
  const start = { x: compact ? 36 : 90, y: compact ? 181 : 164, width: compact ? 168 : 188, height: 110 }
  const end = { x: compact ? width - 228 : width - 302, y: compact ? 224 : 176, width: compact ? 192 : 242, height: compact ? 128 : 142 }
  return <Stage width={width} height={compact ? 420 : 380} initial={{ selected: false, arranged: false }} poster={{ selected: true, arranged: true }} script={followScript} cursor={{ at: { x: width - 25, y: 362 } }} greys="cool" accent="#6c7bb7" className="an-study an-follow">
    {s => <>
      <div className="an-canvas-panel"><header className="an-product-head"><strong>Travel board</strong><div className="an-canvas-actions"><span data-target="arrange" data-cursor="hand">Arrange</span><span data-target="restore" data-cursor="hand">Reset</span></div></header><span className="an-canvas-rest" data-target="follow-rest" /></div>
      {/* Object, leader and note share Follow's changing coordinate space.
          Reading the destination rect for an independent line would detach it
          while Follow is still traveling toward that destination. */}
      <Follow to={s.arranged ? end : start} stiffness={.16} className="an-moving-layer">
        <div className="an-layer-art" data-target="layer" data-cursor="hand"><img src={lakePhoto} alt="Mount Fuji reflected in Lake Kawaguchi" draggable={false} /></div>
        <div className="an-follow-outline" data-visible={s.selected || undefined} />
        <div className="an-attached-note" data-visible={s.selected || undefined}><strong>Lake Kawaguchi</strong><span>Keep the reflection visible</span></div>
        <svg className="an-attached-leader" data-visible={s.selected || undefined} aria-hidden><path d="M.75 0V18" /><circle cx=".75" cy="18" r="2" /></svg>
      </Follow>
    </>}
  </Stage>
}


type BranchState = { phase: number; clearing: boolean }
async function branchScript(a: Act<BranchState>) {
  a.mark('start'); await a.wait(650); await a.move({ at: 'process-asset', x: .92, y: .85 }); await a.click()
  a.mark('upload'); await a.set({ phase: 1 })
  await a.move('graph-rest', { duration: 350 }); await a.wait(750)
  a.mark('spine'); await a.set({ phase: 2 }); await a.wait(1100)
  a.mark('branches'); await a.set({ phase: 3 }); await a.wait(1100)
  a.mark('ready'); await a.set({ phase: 4 }); await a.wait(2300)
  await a.move('clear-jobs'); await a.click(); a.mark('clear')
  await a.set({ clearing: true }); await a.wait(350)
  await a.set({ phase: 0, clearing: false }); await a.wait(700); a.mark('done'); await a.wait(650)
}
function BranchStudy({ width }: { width: number }) {
  const compact = width < 520
  const names = ['Preview', 'Search', 'Archive']
  return <Stage width={width} height={compact ? 340 : 320} initial={{ phase: 0, clearing: false }} poster={{ phase: 4, clearing: false }} script={branchScript} cursor={{ at: { x: 25, y: compact ? 312 : 292 } }} greys="cool" accent="#8659cc" className="an-study an-branch">
    {(s, rect) => {
      const source = rect('asset-source'), outputs = names.map((_, i) => rect(`asset-output-${i}`))
      const ports = outputs.map(r => compact ? { x: r.x + r.width / 2, y: r.y } : { x: r.x, y: r.y + r.height / 2 })
      const start = compact ? { x: source.x + source.width / 2, y: source.y + source.height } : { x: source.x + source.width, y: source.y + source.height / 2 }
      const junction = compact ? { x: start.x, y: 216 } : { x: width - 278, y: ports[1].y }
      const ends = compact ? ports.map(p => ({ x: p.x, y: junction.y })) : ports.map(p => ({ x: junction.x, y: p.y }))
      const measured = source.width > 0 && outputs.every(r => r.width > 0) && !s.clearing
      return <>
        <header className="an-flow-title"><strong>Asset processing</strong><span data-target="clear-jobs" data-cursor="hand">Clear jobs</span></header>
        <section className="an-asset-source" data-target="asset-source" style={compact ? { left: (width - 180) / 2, top: 76, width: 180, height: 100 } : { left: 34, top: 110, width: 180, height: 100 }}>
          <div className="an-asset-file"><Icon name="file" size={22} className="an-file-preview" /><div><strong>cover.jpg</strong><span>2.4 MB · Image</span></div></div>
          <div className="an-asset-action" data-target="process-asset" data-cursor="hand"><States value={s.phase === 0 ? 'idle' : s.phase === 1 ? 'storing' : 'stored'} states={{ idle: 'Process file', storing: 'Storing…', stored: 'Stored' }} /></div>
        </section>
        {names.map((name, i) => <section className="an-asset-output" key={name} data-compact={compact || undefined} data-ready={s.phase >= (i === 1 ? 3 : 4) || undefined} aria-label={`${name}: ${s.phase >= (i === 1 ? 3 : 4) ? 'ready' : 'waiting'}`} style={compact ? { left: 16 + i * (width - 104) / 2, top: 254, width: 72, height: 48 } : { left: width - 214, top: 64 + i * 80, width: 180, height: 48 }}>
          <strong className="an-job-pill" data-target={`asset-output-${i}`}><span>{name}</span><span className="an-job-mark"><Icon name="check" size={12} className="an-job-check" /></span></strong>
        </section>)}
        {/* Travel reaches the center first. Two non-overlapping spine halves
            grow out from there; outer branches wait for those arrivals.
            Connector owns each endpoint marker's actual arrival timing. */}
        <Connector className="an-asset-trunk" from={start} to={junction} route="straight" show={measured && s.phase >= 1} />
        {[0, 2].map(i => <Connector key={i} className={`an-asset-spine an-asset-spine--${i}`} from={junction} to={ends[i]} route="straight" show={measured && s.phase >= 2} />)}
        {ports.map((port, i) => <Connector key={i} className={`an-asset-branch an-asset-branch--${i}`} from={ends[i]} to={port} route="straight" arrow show={measured && s.phase >= (i === 1 ? 2 : 3)} />)}
        <span className="an-composed-rest" data-target="graph-rest" style={{ left: 24, top: compact ? 188 : 256 }} />
      </>
    }}
  </Stage>
}

const STREAM_REVEAL_MS = 700
type StreamState = { connected: boolean; receiving: boolean }
async function streamScript(a: Act<StreamState>) {
  a.mark('start'); await a.wait(800); await a.move({ at: 'connect-stream', x: .92, y: .85 }); await a.click()
  a.mark('connected'); await a.set({ connected: true })
  await a.move('stream-rest', { duration: 350 }); await a.wait(STREAM_REVEAL_MS + 100 - 350)
  a.mark('live'); await a.set({ receiving: true }); await a.wait(800)
  await a.wait(2250)
  // The connection stays open. Only the line's phase continues; there is no
  // polling script or invisible reset of the successful connection.
  await a.wait(800); a.mark('done')
}
function StreamStudy({ width }: { width: number }) {
  const compact = width < 520
  const revealId = `an-stream-${useId().replace(/:/g, '')}`
  return <Stage width={width} height={compact ? 504 : 330} initial={{ connected: false, receiving: false }} poster={{ connected: true, receiving: true }} script={streamScript} play="once" cursor={{ at: { x: 25, y: compact ? 356 : 270 } }} greys="cool" accent="#0d9488" className={`an-study an-stream${compact ? ' an-stream--compact' : ''}`}>
    {(s, rect) => {
      const a = rect('stream-source'), b = rect('stream-destination')
      const from = compact ? { x: a.x + a.width / 2, y: a.y + a.height } : { x: a.x + a.width, y: a.y + a.height / 2 }
      const to = compact ? { x: b.x + b.width / 2, y: b.y } : { x: b.x, y: from.y }
      const path = `M${from.x} ${from.y}L${to.x} ${to.y}`
      const arrow = compact ? `M${to.x - 3.5} ${to.y - 5}L${to.x} ${to.y}L${to.x + 3.5} ${to.y - 5}` : `M${to.x - 5} ${to.y - 3.5}L${to.x} ${to.y}L${to.x - 5} ${to.y + 3.5}`
      return <>
        <header className="an-flow-title"><strong>Event stream</strong><span className="an-stream-status" data-live={s.receiving || undefined}><i /><States align="start" value={s.receiving ? 'live' : s.connected ? 'opening' : 'idle'} states={{ idle: 'Offline', opening: 'Connecting', live: 'Live' }} /></span></header>
        <section className="an-stream-node an-stream-source" data-target="stream-source" style={compact ? { left: 32, top: 68, width: width - 64 } : { left: 32, top: 123, width: 160 }}>
          <div className="an-stream-source-title"><span className="an-stream-source-icon"><Icon name="bolt" size={16} /></span><div><strong>Checkout</strong><span>Production</span></div></div>
          <div className="an-stream-connect" data-target="connect-stream" data-cursor="hand"><States value={s.receiving ? 'live' : s.connected ? 'opening' : 'idle'} states={{ idle: 'Connect stream', opening: 'Connecting…', live: 'Connected' }} /></div>
        </section>
        <section className="an-stream-warehouse" data-target="stream-destination" style={compact ? { left: 32, top: 266, width: width - 64 } : { left: width - 276, top: 80, width: 244 }}>
          <header><strong>Events</strong><span>Live feed</span></header>
          <div className="an-stream-columns"><span>Event</span><span>Time</span></div>
          <div className="an-stream-record" data-visible={s.receiving || undefined}><span><i /><States align="start" value={s.receiving ? 'live' : 'idle'} states={{ idle: 'Checkout started', live: 'Checkout completed' }} /></span><time><States align="end" value={s.receiving ? 'live' : 'idle'} states={{ idle: '14:31', live: '14:32' }} /></time></div>
          <div className="an-stream-history"><span>Customer created</span><time>14:31</time></div>
          <div className="an-stream-history"><span>Session started</span><time>14:31</time></div>
          <footer className="an-stream-receiving" data-live={s.receiving || undefined}><i /><States align="start" value={s.receiving ? 'live' : s.connected ? 'opening' : 'idle'} states={{ idle: 'Stream disconnected', opening: 'Opening route', live: 'Receiving events' }} /></footer>
        </section>
        <svg className="an-stream-route" data-active={s.connected || undefined} data-arrived={s.receiving || undefined} data-ready={a.width > 0 && b.width > 0 || undefined} style={{ '--an-stream-reveal-duration': `${STREAM_REVEAL_MS}ms` } as CSSProperties} aria-hidden>
          <defs><mask id={revealId} maskUnits="userSpaceOnUse"><path className="an-stream-reveal" d={path} pathLength="1" /></mask></defs>
          <path className="an-stream-underlay" d={path} />
          <path className="an-stream-phase" d={path} mask={`url(#${revealId})`} />
          <path className="an-stream-arrow" d={arrow} />
        </svg>
        <span className="an-stream-rate" data-visible={s.receiving || undefined} style={compact ? { left: from.x + 12, top: (from.y + to.y) / 2 - 8 } : { left: (from.x + to.x) / 2, top: from.y - 26, transform: 'translateX(-50%)' }}>1.2k / sec</span>
        <span className="an-stream-rest" data-target="stream-rest" style={{ left: width - 34, top: compact ? 215 : 290 }} />
      </>
    }}
  </Stage>
}

export default function Annotations() {
  const [selected, choose] = useState<Study>(initialStudy), [revision, replay] = useState(0), [width, setWidth] = useState<number | null>(null)
  const host = useRef<HTMLDivElement>(null), id = useId()
  const selectStudy = (value: Study) => {
    choose(value)
    const url = new URL(location.href)
    url.searchParams.set('annotation', value)
    history.replaceState(null, '', url)
    if (parent !== window) parent.postMessage({ type: 'stageshow:status', annotation: value }, location.origin)
  }
  useLayoutEffect(() => {
    const node = host.current
    if (!node) return
    const read = () => setWidth(Math.min(600, Math.floor(node.getBoundingClientRect().width)))
    read(); const observer = new ResizeObserver(read); observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const active = studies.find(study => study.id === selected)!
  return <div className="an-gallery" ref={host}>
    <div className="an-picker"><label htmlFor={id}>Study</label><select id={id} value={selected} onChange={event => selectStudy(event.target.value as Study)}>{studies.map(study => <option key={study.id} value={study.id}>{study.title}</option>)}</select><button type="button" onClick={() => replay(value => value + 1)} aria-label="Replay annotation study"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3.2 4.3A4.5 4.5 0 1 1 2.6 8M3.2 1.8v2.8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
    <div key={`${selected}-${revision}`} className="an-scene" data-annotation={selected}>
      {width !== null && (selected === 'collect' ? <CollectionStudy width={width} /> : selected === 'detail' ? <DetailStudy width={width} /> : selected === 'chart' ? <ChartStudy width={width} /> : selected === 'measure' ? <MeasureStudy width={width} /> : selected === 'flow' ? <FlowStudy width={width} /> : selected === 'branch' ? <BranchStudy width={width} /> : selected === 'stream' ? <StreamStudy width={width} /> : <FollowStudy width={width} />)}
    </div>
    <p className="an-description">{active.note}</p>
  </div>
}
