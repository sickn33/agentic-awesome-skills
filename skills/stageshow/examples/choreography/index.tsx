import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon, Stage, type Act } from '../../kit'
import './choreography.css'

type Locale = { country: string; currency: string; price: string; method: string; fields: { label: string; value: string; half?: boolean }[] }
const locales: Locale[] = [
  { country: 'United States', currency: 'USD', price: '$38.00', method: 'Card', fields: [
    { label: 'Name', value: 'Alex Morgan' }, { label: 'Street address', value: '24 Maple Avenue' }, { label: 'City', value: 'Portland', half: true }, { label: 'ZIP code', value: '97205', half: true },
  ] },
  { country: 'Germany', currency: 'EUR', price: '€35.00', method: 'Bank transfer', fields: [
    { label: 'Name', value: 'Alex Morgan' }, { label: 'Street and number', value: 'Lindenstraße 18' }, { label: 'Postcode', value: '10115', half: true }, { label: 'City', value: 'Berlin', half: true },
  ] },
  { country: 'Canada', currency: 'CAD', price: 'CA$52.00', method: 'Card', fields: [
    { label: 'Name', value: 'Alex Morgan' }, { label: 'Street address', value: '18 Cedar Lane' }, { label: 'City', value: 'Victoria', half: true }, { label: 'Province', value: 'BC', half: true }, { label: 'Postal code', value: 'V8V 1A1' },
  ] },
]

type State = { locale: number }
const initial: State = { locale: 0 }
const poster: State = { locale: 2 }

// Starts overlap. The currency identifies the change before the dependent
// price, payment method and address respond. The final destination holds.
export async function localeSequence(a: Act<State>) {
  await a.wait(1600)
  a.mark('germany')
  await a.set({ locale: 1 })
  await a.wait(3300)
  a.mark('canada')
  await a.set({ locale: 2 })
  await a.wait(2900)
}

function useWidth(initialWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(initialWidth)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => { if (node.clientWidth) setWidth(node.clientWidth) }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function Bank() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" aria-hidden><path d="m2 4 5-2 5 2v1H2ZM3.5 6.5v3M7 6.5v3M10.5 6.5v3M2 11.5h10" /></svg>
}

function Price({ locale }: State) {
  return <span className="cy-roll cy-price" aria-label={locales[locale].price}><span className="cy-vertical-track" aria-hidden>{locales.map(item => <span className="cy-roll-row" key={item.country}>{item.price}</span>)}</span></span>
}

function Checkout({ locale, width, good = true, top = 24, wide = false }: State & { width: number; good?: boolean; top?: number; wide?: boolean }) {
  return <div className="cy-checkout" data-coordinated={good || undefined} data-locale={locale} data-layout={wide ? 'wide' : 'compact'}
    style={{ width: width - 32, height: 420, left: 16, top, '--cy-index': locale } as CSSProperties}>
    <aside className="cy-order">
      <span className="cy-summary-heading">Order summary</span>
      <span className="cy-notebook" aria-hidden><i /><b>FIELD<br />JOURNAL</b></span>
      <div className="cy-product"><strong>Field journal</strong><span>Olive · dotted pages</span><span className="cy-quantity">Quantity 1</span></div>
      <div className="cy-total"><span>Total</span><Price locale={locale} /></div>
    </aside>
    <div className="cy-body">
      <div className="cy-form-heading">Delivery details</div>
      <div className="cy-locale"><span>Ship to</span><span className="cy-roll cy-currency" aria-label={`${locales[locale].country}, ${locales[locale].currency}`}><span className="cy-vertical-track" aria-hidden>{locales.map(item => <span className="cy-roll-row" key={item.country}>{item.country}<b>·</b>{item.currency}</span>)}</span></span></div>
      <div className="cy-method">
        <span className="cy-label">Payment method</span>
        <div className="cy-method-control">
          <span className="cy-roll cy-method-icon"><span className="cy-vertical-track" aria-hidden>{locales.map(item => <span className="cy-roll-row" key={item.country}>{item.method === 'Card' ? <Icon name="card" size={14} /> : <Bank />}</span>)}</span></span>
          <span className="cy-roll cy-method-name" aria-label={locales[locale].method}><span className="cy-vertical-track" aria-hidden>{locales.map(item => <span className="cy-roll-row" key={item.country}>{item.method}</span>)}</span></span>
          <Icon name="chevron-down" size={12} />
        </div>
      </div>
      <div className="cy-address-viewport" data-crop>
        <div className="cy-address-track">{locales.map((item, index) => <div className="cy-address" key={item.country} aria-hidden={index !== locale}>
          {item.fields.map(field => <div className="cy-field" key={field.label} data-half={field.half || undefined}><span className="cy-label">{field.label}</span><span className="cy-field-value">{field.value}</span></div>)}
        </div>)}</div>
      </div>
      <div className="cy-footer">
        <div className="cy-pay"><span className="cy-roll cy-pay-label" aria-label={`Pay ${locales[locale].price}`}><span className="cy-vertical-track" aria-hidden>{locales.map(item => <span className="cy-roll-row" key={item.country}>Pay {item.price}</span>)}</span></span><Icon name="lock" size={12} /></div>
        <span>Shipping included</span>
      </div>
    </div>
  </div>
}

export const choreographyLessons = [{
  id: 'dependent-starts', title: 'Related changes overlap', note: 'The same checkout, curve and duration. On the right, currency leads price, then payment method and address. Watch the outer frame and Pay button stay in place.', bad: 'Every layer starts together', good: 'Dependent responses overlap',
}] as const

export function ChoreographyComparison({ lessonId = 'dependent-starts' }: { lessonId?: string }) {
  const [ref, width] = useWidth(704)
  const [revision, replay] = useState(0)
  if (lessonId !== 'dependent-starts') return null
  const stacked = width < 620
  const cell = stacked ? width : (width - 24) / 2
  return <section className="cy-comparison">
    <header><div><h2>{choreographyLessons[0].title}</h2><p>{choreographyLessons[0].note}</p></div><button type="button" className="tc-replay" onClick={() => replay(value => value + 1)}>Replay pair</button></header>
    <div ref={ref} className="cy-pair-host"><Stage<State> key={revision} width={width} height={stacked ? 976 : 476} initial={initial} poster={poster} play="once" script={localeSequence}>
      {state => <div className="cy-pair">{[false, true].map((good, i) => <div key={String(good)} className="cy-pair-cell" style={{ width: cell, left: stacked ? 0 : i * (cell + 24), top: stacked ? i * 500 : 0 }}>
        <span className="cy-pair-label">{good ? choreographyLessons[0].good : choreographyLessons[0].bad}</span><Checkout {...state} width={cell} good={good} top={40} />
      </div>)}</div>}
    </Stage></div>
  </section>
}

export default function Choreography() {
  const [ref, width] = useWidth(288)
  return <div ref={ref} className="cy-demo"><Stage<State> width={width} height={468} initial={initial} poster={poster} play="once" script={localeSequence}>
    {state => <div className="cy-scene"><Checkout {...state} width={width} wide={width >= 560} /></div>}
  </Stage></div>
}
