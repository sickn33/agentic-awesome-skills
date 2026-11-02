import { useLayoutEffect, useRef, useState } from 'react'
import { Connector, Icon, Stage, States, type Act } from '../../kit'
import './composed.css'


// The compact output detours around the incoming routes. Keep this one path,
// rather than drawing separate segments simultaneously. Its arrow follows the
// real transition completion, including a paused host and reduced motion.
function UsageDelivery({ path, to, show }: { path: string; to: { x: number; y: number }; show: boolean }) {
  const line = useRef<SVGPathElement>(null), [arrived, setArrived] = useState(false)
  useLayoutEffect(() => {
    const element = line.current
    setArrived(false)
    if (!element || !show) return
    const check = () => { if (Math.abs(parseFloat(getComputedStyle(element).strokeDashoffset)) < .0001) setArrived(true) }
    const finish = (event: TransitionEvent) => { if (event.target === element && event.propertyName === 'stroke-dashoffset') check() }
    element.addEventListener('transitionend', finish); element.addEventListener('transitioncancel', finish); check()
    return () => { element.removeEventListener('transitionend', finish); element.removeEventListener('transitioncancel', finish) }
  }, [path, show])
  const arrow = `M${to.x+6} ${to.y-4}L${to.x} ${to.y}L${to.x+6} ${to.y+4}`
  return <svg className="ss-connector an-usage-delivery" data-show={show || undefined} data-arrived={show && arrived || undefined} aria-hidden><path ref={line} className="ss-connector__line" d={path} pathLength="1" /><path className="ss-connector__arrow" d={arrow} /></svg>
}

type Collection = { phase: number }
async function collectUsage(a: Act<Collection>) {
  a.mark('start'); await a.wait(850)
  await a.move({ at: 'sync-usage', x: .92, y: .85 }); await a.click()
  a.mark('collect'); await a.set({ phase: 1 })
  await a.move('usage-rest', { duration: 350 }); await a.wait(750)
  a.mark('post'); await a.set({ phase: 2 }); await a.wait(1100)
  a.mark('invoice'); await a.set({ phase: 3 })
  await a.wait(3050); a.mark('done')
  // The first invoice update is complete; its three live sources stay connected.
}

/** Three live usage sources feed one invoice; the junction is an aggregation,
 * not a fourth decorative service. The result waits for the final delivery. */
export function CollectionStudy({ width }: { width: number }) {
  const compact = width < 520
  const rows = [
    { name: 'API requests', meter: 'API calls', value: '24.8k', amount: '$124.00', colour: '#3478e5' },
    { name: 'Storage', meter: 'Storage', value: '18.2 GB', amount: '$18.20', colour: '#3478e5' },
    { name: 'Background jobs', meter: 'Jobs', value: '312', amount: '$46.80', colour: '#3478e5' },
  ]
  return <Stage width={width} height={compact ? 636 : 464} initial={{ phase: 0 }} poster={{ phase: 3 }} script={collectUsage} play="once" cursor={{ at: { x: 24, y: compact ? 378 : 440 } }} greys="cool" accent="#3478e5" className="an-study an-collection">
    {(s, rect) => {
      const sources = rows.map((_, i) => rect(`usage-source-${i}`)), invoice = rect('usage-invoice'), field = rect('usage-invoice-field')
      const junction = { x: sources[1].x + sources[1].width + 24, y: sources[1].y + sources[1].height / 2 }
      const destination = { x: invoice.x + invoice.width, y: field.y + field.height / 2 }
      const ready = sources.every(r => r.width > 0) && invoice.width > 0 && field.width > 0
      const outer = width - 16, radius = 6, direction = destination.y > junction.y ? 1 : -1
      const delivery = `M${junction.x} ${junction.y}H${outer-radius}Q${outer} ${junction.y} ${outer} ${junction.y+direction*radius}V${destination.y-direction*radius}Q${outer} ${destination.y} ${outer-radius} ${destination.y}H${destination.x}`
      return <div className="an-collection-scene" data-live={s.phase >= 1 || undefined}>
        <section className="an-usage-invoice" data-target="usage-invoice" style={compact ? { left: 16, top: 28, width: width - 52 } : { left: 28, top: 108, width: width - 252 }}>
          <header><strong>Invoice</strong><span>#0084 · October 2026</span></header>
          <div className="an-invoice-recipient"><span>Bill to</span><strong>Coast workspace</strong></div>
          <div className="an-invoice-balance">
            <div className="an-invoice-balance-head" data-target="usage-invoice-field"><span>Amount due</span><span className="an-invoice-live"><i className="an-invoice-status-dot" data-ready={s.phase === 3 || undefined} /><States align="start" value={s.phase === 3 ? 'ready' : 'waiting'} states={{ waiting: 'Awaiting usage', ready: 'Live usage' }} /></span></div>
            <div className="an-invoice-total"><States align="start" value={s.phase === 3 ? 'amount' : 'empty'} states={{ empty: '$0.00', amount: '$189.00' }} /></div>
          </div>
          <div className="an-invoice-lines">{rows.map(row => <div key={row.name}><span>{row.name}</span><States align="end" value={s.phase === 3 ? 'amount' : 'empty'} states={{ empty: '—', amount: row.amount }} /></div>)}</div>
        </section>
        <section className="an-usage-monitor" style={compact ? { left: 16, top: 400, width: Math.min(228, width - 92) } : { left: width - 278, top: 28, width: 228 }}>
          <header><strong>Usage</strong><span>October</span></header>
          <div className="an-usage-sources">{rows.map((row, i) => <div className="an-usage-source" data-target={`usage-source-${i}`} key={row.name}><span><i className="an-source-cue" style={{ background: row.colour }} />{row.meter}</span><strong>{row.value}</strong></div>)}</div>
          <div className="an-usage-sync" data-target="sync-usage" data-cursor="hand"><States value={s.phase === 0 ? 'idle' : s.phase < 3 ? 'busy' : 'done'} states={{ idle: 'Connect', busy: 'Connecting…', done: 'Connected' }} /></div>
        </section>
        {sources.map((source, i) => <Connector key={i} className={`an-usage-feed an-fine-dotted an-usage-feed--${i}`} from={{ x: source.x + source.width, y: source.y + source.height / 2 }} to={junction} route="h" radius={6} dashed dots="none" show={ready && s.phase >= 1} />)}
        <UsageDelivery path={delivery} to={destination} show={ready && s.phase >= 2} />
        <svg className="an-usage-junction" data-visible={ready && s.phase >= 2 || undefined} aria-hidden><circle cx={junction.x} cy={junction.y} r="3" /></svg>
        <span className="an-composed-rest" data-target="usage-rest" style={{ left: compact ? 16 : width - 74, top: compact ? 369 : 290 }} />
      </div>
    }}
  </Stage>
}

type Detail = { phase: number; selected: boolean; clearing: boolean }
async function inspectPayout(a: Act<Detail>) {
  a.mark('start'); await a.wait(850)
  await a.move({ at: 'payout-row', x: .2, y: .5 }); await a.click()
  a.mark('link'); await a.set({ selected: true, phase: 1 })
  await a.move('payout-rest', { duration: 350 }); await a.wait(750)
  a.mark('detail'); await a.set({ phase: 2 }); await a.wait(920)
  a.mark('leader'); await a.set({ phase: 3 }); await a.wait(1100)
  a.mark('explanation'); await a.set({ phase: 4 }); await a.wait(2300)
  await a.move('clear-payout'); await a.click(); a.mark('clear')
  await a.set({ clearing: true }); await a.wait(400)
  await a.set({ selected: false, clearing: false, phase: 0 }); await a.wait(600); a.mark('done')
}

/** A linked record and a field explanation use different line treatments.
 * The payout list remains the main product view through the entire story. */
export function DetailStudy({ width }: { width: number }) {
  const compact = width < 520
  return <Stage width={width} height={compact ? 600 : 436} initial={{ phase: 0, selected: false, clearing: false }} poster={{ phase: 4, selected: true, clearing: false }} script={inspectPayout} play="once" cursor={{ at: { x: width - 24, y: compact ? 574 : 410 } }} greys="cool" accent="#326be6" className="an-study an-detail">
    {(s, rect) => {
      const row = rect('payout-row'), detail = rect('settlement-detail'), note = rect('arrival-note')
      const from = { x: row.x + row.width / 2, y: row.y + row.height }
      const to = compact ? { x: detail.x + detail.width / 2, y: detail.y } : { x: detail.x + detail.width, y: detail.y + detail.height - 34 }
      const leaderFrom = { x: detail.x + detail.width / 2, y: detail.y + detail.height }
      const leaderTo = { x: note.x + note.width / 2, y: note.y }
      const measured = row.width > 0 && detail.width > 0 && note.width > 0 && !s.clearing
      return <div className="an-detail-scene" data-transmitting={s.phase === 1 || undefined}>
        <section className="an-payout-panel" style={compact ? { left: 16, top: 28, width: width - 32 } : { left: 244, top: 28, width: width - 272 }}>
          <header><div><strong>Payouts</strong><span>Checking •0814</span></div><span data-target="clear-payout" data-cursor="hand">Clear detail</span></header>
          <div className="an-payout-columns"><span>Created</span><span>Amount</span></div>
          <div className="an-payout-row"><span>Oct 18 <small>Paid</small></span><strong>$740.00</strong></div>
          <div className="an-payout-row"><span>Oct 22 <small>Paid</small></span><strong>$920.00</strong></div>
          <div className="an-payout-row" data-target="payout-row" data-cursor="hand" data-selected={s.selected || undefined}><span>Today <small>Scheduled</small></span><strong>$1,284.60</strong></div>
        </section>
        <section className="an-settlement-detail" data-target="settlement-detail" data-visible={s.phase >= 2 && !s.clearing || undefined} style={compact ? { left: 32, top: 314, width: width - 64 } : { left: 28, top: 150, width: 224 }}>
          <header><span>Settlement</span><Icon name="check" size={12} /></header>
          <strong className="an-settlement-amount">$1,284.60</strong><span className="an-settlement-subtitle">Net to your account</span>
          <div className="an-settlement-breakdown"><div><span>Payments</span><span>$1,320.00</span></div><div><span>Fees</span><span>−$35.40</span></div></div>
        </section>
        <div className="an-arrival-note" data-target="arrival-note" data-visible={s.phase >= 4 && !s.clearing || undefined} style={compact ? { left: 32, top: 536, width: width - 64 } : { left: 28, top: 372, width: 224 }}><strong>Expected arrival</strong><span>Oct 27 · Checking •0814</span></div>
        <Connector className="an-record-link an-fine-dotted" from={from} to={to} route={compact ? 'straight' : 'v'} dots="end" dashed show={measured && s.phase >= 1} />
        <Connector className="an-detail-leader" from={leaderFrom} to={leaderTo} route="straight" dots="none" show={measured && s.phase >= 3} />
        <span className="an-composed-rest" data-target="payout-rest" style={{ left: width - 36, top: compact ? 280 : 350 }} />
      </div>
    }}
  </Stage>
}
