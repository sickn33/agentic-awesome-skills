import { Stage, Bar, Check, Count, Roll, Connector, Icon, Swap, type Act } from '../../kit'
import './pace.css'

// A cursorless payout story played once as it scrolls into view.
// Things reveal, then move to make room for what comes next; groups stagger;
// a line ties the new card to the row it came from; the payoff is annotated.
// This scene uses long arrivals and overlapping beats. Other stories can
// need different timing; see references/choreography.md.

type S = { step: number; sent: boolean }
const START: S = { step: 0, sent: false }

const ROWS = [
  { amount: '$12,400.00', w: 54 },
  { amount: '$8,915.20', w: 46 },
  { amount: '$21,060.75', w: 60 },
  { amount: '$5,330.00', w: 40 },
]

const script = async (a: Act<S>) => {
  await a.wait(300)
  a.mark('reveal')
  a.put({ step: 1 }) // the balance rises in, centered, and counts up
  await a.wait(700)
  a.put({ step: 2 }) // payout rows stagger in under it
  await a.wait(1500)
  a.mark('move')
  a.put({ step: 3 }) // it slides aside as the payout card arrives
  await a.wait(1300)
  a.put({ step: 4 }) // the line draws from the row to the card
  await a.wait(1100)
  a.mark('send')
  a.put({ step: 5 }) // sending
  await a.wait(1300)
  a.put({ sent: true })
  await a.wait(500)
  a.put({ step: 6 }) // the annotation lands
}

export default function PayoutFlow() {
  return (
    <Stage<S> width={640} height={400} compact={{ below: 600, width: 358, height: 610 }} initial={START} play="once" poster={{ step: 6, sent: true }} script={script} className="sp">
      {(s, rect, layout) => {
        const compact = layout === 'compact'
        const row = rect('row-0')
        const card = rect('instant')
        return (
          <>
            <div className="sp-wash" />
            <section className="sp-balance" data-in={s.step >= 1 || undefined} data-aside={s.step >= 3 || undefined}>
              <span className="sp-muted">Available balance</span>
              <Count className="sp-total" value={s.step >= 1 ? 84210.5 : 0} duration={1400} format={money} />
              <Bar w={120} h={5} tone={2} />
              <div className="sp-head">
                <span className="sp-strong">Payouts</span>
                <Bar w={40} h={5} tone={2} />
              </div>
              {ROWS.map((r, i) => (
                <div
                  key={i}
                  className="sp-row"
                  data-target={`row-${i}`}
                  data-in={s.step >= 2 || undefined}
                  style={{ transitionDelay: s.step >= 2 ? `${i * 90}ms` : '0ms' }}
                >
                  <span className="sp-bank" />
                  <Bar w={r.w} h={5} tone={3} />
                  <span className="sp-amount">{r.amount}</span>
                  {/* The payout's own row settles when it sends, closing the loop with the line */}
                  <span className="sp-paid" data-pending={(i === 0 && !s.sent) || undefined}>
                    {i === 0 ? <Roll variant="fade">{s.sent ? 'Paid' : 'Pending'}</Roll> : 'Paid'}
                  </span>
                </div>
              ))}
            </section>

            {/* A full column beside the balance, top-aligned: no dead corners.
                Its contents build in a stagger once it has landed. */}
            <section className="sp-instant" data-target="instant" data-in={s.step >= 3 || undefined}>
              <div className="sp-instant__head" style={{ ['--i' as string]: 0 }}>
                <span className="sp-instant__mark">
                  <Icon name="bolt" size={14} filled />
                </span>
                <span className="sp-strong">Instant payout</span>
              </div>
              <div className="sp-instant__amount" style={{ ['--i' as string]: 1 }}>$12,400.00</div>
              <div className="sp-fields" style={{ ['--i' as string]: 2 }}>
                <div className="sp-field">
                  <span className="sp-muted">To</span>
                  <span className="sp-dest">
                    <span className="sp-bank sp-bank--sm" />
                    Chase ···· 4821
                  </span>
                </div>
                <div className="sp-field">
                  <span className="sp-muted">Fee</span>
                  <span>$124.00</span>
                </div>
              </div>
              {/* Each state is its own centered group, crossfading in place: nothing
                  ever re-centers or slides sideways between states */}
              <div className="sp-button" style={{ ['--i' as string]: 3 }} data-sent={s.sent || undefined}>
                <span className="sp-state" data-on={s.step < 5 || undefined}>
                  Pay out now
                </span>
                {/* Sending and Sent are one group: one Check turns pending, then
                    fills and draws its tick. The label is a Swap, so its box
                    eases to the new word and the group re-centers with it: a
                    box held at "Sending" would leave "Sent" off center */}
                <span className="sp-state" data-on={s.step >= 5 || undefined}>
                  <Check on={s.sent} pending={!s.sent} size={14} />
                  <Swap id={s.sent ? 'sent' : 'sending'}>{s.sent ? 'Sent' : 'Sending'}</Swap>
                </span>
              </div>
            </section>

            {row.width > 0 && card.width > 0 && (
              <Connector
                show={s.step >= 4}
                from={{ x: compact ? row.x - 6 : row.x + row.width + 6, y: row.y + row.height / 2 }}
                to={{ x: card.x, y: compact ? card.y + 24 : row.y + row.height / 2 }}
                route={compact ? 'v' : 'straight'}
              />
            )}

            <div className="sp-note" data-in={s.step >= 6 || undefined} style={{ left: card.x, top: card.y + card.height + 16 }}>
              Arrives in about 30 minutes
            </div>
          </>
        )
      }}
    </Stage>
  )
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
