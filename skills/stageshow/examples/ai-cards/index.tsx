import { Bar, Check, Collapse, Field, Stage, Text, Window, type Act } from '../../kit'
import './cards.css'

// An assistant that answers with cards you act on. Beats: asked for a flight,
// it asks which day with a multiple-choice card; a day is picked; it searches,
// then a card of three flights opens; one is picked and booked from the card,
// its button going busy, then Booked. Plays once; the still is the payoff.
//
// What makes interactive cards read:
// - A card is part of the answer, not a popup: it opens in the thread with
//   its own height (Collapse with a drop reveal) and the thread moves up as
//   one, the way the text above it did.
// - An answered question stays on the page as the record: the chosen option
//   keeps its fill and a check, the others go quiet. Nothing is removed, so
//   nothing below jumps.
// - The card's own button says what will happen with the choice ("Book for
//   £142"), then confirms on itself: busy, then Booked. No toast, no second
//   card. Every label sits in the button's one cell and crossfades, so
//   nothing in it moves sideways.
// - Every option has a fixed size from the start; a pick changes color and
//   a mark, never a width.
// - The earlier turn is placeholder: the eye lands on the cards.
//
// Real strings: the request, the assistant's two lines, the days, the three
// flights, the button.

const DAYS = ['Mon 13', 'Tue 14', 'Wed 15']
const FLIGHTS = [
  { dep: '07:10', arr: '09:55', line: 'Halcyon', price: 168 },
  { dep: '08:40', arr: '11:25', line: 'Northwind', price: 142 },
  { dep: '13:20', arr: '16:05', line: 'Aster', price: 155 },
]

type S = { day: number | null; phase: 'ask' | 'search' | 'flights'; pick: number | null; book: 'idle' | 'busy' | 'done' }

const initial: S = { day: null, phase: 'ask', pick: null, book: 'idle' }
const poster: S = { day: 1, phase: 'flights', pick: 1, book: 'done' }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark('day')
  await a.click({ at: 'day-1', x: 0.82, y: 0.7 })
  a.put({ day: 1 })
  await a.wait(500)
  a.mark('search')
  a.put({ phase: 'search' })
  await a.wait(1200)
  a.mark('flights')
  a.put({ phase: 'flights' })
  await a.wait(1100)
  a.mark('pick')
  await a.click({ at: 'flight-1', x: 0.4, y: 0.5 })
  a.put({ pick: 1 })
  await a.wait(650)
  a.mark('book')
  await a.click({ at: 'book', x: 0.72, y: 0.7 })
  a.put({ book: 'busy' })
  await a.wait(1200)
  a.mark('done')
  a.put({ book: 'done' })
  await a.move({ wide: { x: 612, y: 430 }, compact: { x: 330, y: 300 } })
  await a.wait(2600)
}

export default function AiCards() {
  return (
    <Stage width={640} height={540} compact={{ below: 600, width: 358, height: 600 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { x: 600, y: 520 } }} className="aic">
      {(s) => {
        const pick = s.pick === null ? null : FLIGHTS[s.pick]!
        return (
          <Window title="Assistant" className="aic-win">
            <div className="aic-body">
              <div className="aic-thread">
                {/* Earlier turns as placeholder: they fill the window
                    at the start and go up out of it as the cards open */}
                {[[130, '70%', '48%'], [150, '76%', '52%'], [190, '84%', '64%']].map(([q, a1, a2], i) => (
                  <div className="aic-past" key={i}>
                    <Bar w={q!} h={30} r={15} tone={1} className="aic-past-q" />
                    <Bar w={a1!} h={8} r={4} tone={2} />
                    <Bar w={a2!} h={8} r={4} tone={2} />
                  </div>
                ))}
                <div className="aic-q"><Text>Find me a flight to Lisbon next week</Text></div>
                <div className="aic-a">
                  <Text className="aic-line">Which day do you want to fly out?</Text>
                  <div className="aic-choices" data-answered={s.day !== null || undefined}>
                    {DAYS.map((d, i) => (
                      <span key={d} className="aic-choice" data-target={`day-${i}`} data-cursor="pointer" data-on={s.day === i || undefined}>
                        <span className="aic-choice__mark"><Check on={s.day === i} size={14} /></span>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Searching and the flights share one slot in the thread, so
                    the gap above them is the thread's one gap */}
                <div className="aic-reply">
                <Collapse open={s.phase === 'search'}>
                  <Text className="aic-thinking">Searching flights</Text>
                </Collapse>
                <Collapse open={s.phase === 'flights'} reveal="drop">
                  <div className="aic-a">
                    <Text className="aic-line">Three nonstops on Tuesday, all 2h 45m:</Text>
                    <div className="aic-card" data-booked={s.book === 'done' || undefined}>
                      {FLIGHTS.map((f, i) => (
                        <span key={f.dep} className="aic-flight" data-target={`flight-${i}`} data-cursor="pointer" data-on={s.pick === i || undefined}>
                          <span className="aic-radio" />
                          <span className="aic-flight__main">
                            <span className="aic-times">{f.dep} <span className="aic-arrow">→</span> {f.arr}</span>
                            <span className="aic-airline">{f.line} · LHR to LIS</span>
                          </span>
                          <span className="aic-price">£{f.price}</span>
                        </span>
                      ))}
                      <span className="aic-book" data-target="book" data-cursor="pointer" data-ready={pick ? '' : undefined} data-done={s.book === 'done' || undefined}>
                        <span className="aic-layer" data-on={!pick || undefined}>Choose a flight</span>
                        <span className="aic-layer" data-on={(pick && s.book === 'idle') || undefined}>Book for £{pick?.price ?? 142}</span>
                        <span className="aic-layer" data-on={s.book === 'busy' || undefined}><Check on={false} pending size={16} /></span>
                        <span className="aic-layer" data-on={s.book === 'done' || undefined}><Check on={s.book === 'done'} size={16} />Booked</span>
                      </span>
                    </div>
                  </div>
                </Collapse>
                </div>
              </div>
              <Field className="aic-composer" value="" placeholder="Ask anything" />
            </div>
          </Window>
        )
      }}
    </Stage>
  )
}
