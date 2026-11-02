import { Chart, Icon, Meter, Stage, Text, type Act } from '../../kit'
import './stacked.css'

// Stacked cards: a plan card over the usage chart it bills from, two
// components of one product at one width. Beats: the usage bar fills, then
// the chart's bars grow under it. Plays once; the still is the payoff.
//
// What makes a stack read as one object:
// - One width, one left edge, a small gap (12px). Different widths or a
//   stagger turns it into two things that happen to be near each other.
// - The top card is whole; the bottom one runs off the stage's bottom edge
//   (the chart's axis is filler). Nothing else is cut.
// - Centered on the stage with even gutters; the ground does nothing.
// - The two cards share one number: the meter's 4.2M of 5M is the chart's
//   total, so they read as cause and detail.
//
// Real strings: the plan, its price, the usage line, the chart's title.

type S = { on: boolean }

const BARS = [8, 12, 9, 15, 13, 18, 11, 17, 22, 16, 20, 26, 21, 29, 24, 31, 27, 34]

async function script(a: Act<S>) {
  await a.wait(500)
  a.put({ on: true })
  await a.wait(3000)
}

export default function StackedCards() {
  return (
    <Stage width={520} height={400} compact={{ below: 520, width: 358, height: 400 }} initial={{ on: false }} poster={{ on: true }} script={script} play="once" className="sk">
      {(s, _rect, layout) => (
        <div className="sk-stack">
          <section className="sk-card">
            <div className="sk-plan">
              <span className="sk-mark"><Icon name="bolt" size={14} /></span>
              <div className="sk-who">
                <Text className="sk-name">Pro plan</Text>
                <Text className="sk-sub">$49 per month</Text>
              </div>
            </div>
            <div className="sk-usage">
              <Text className="sk-label">API calls</Text>
              <Text className="sk-value">4.2M of 5M</Text>
            </div>
            <Meter value={s.on ? 0.84 : 0} />
          </section>
          <section className="sk-card">
            <Text className="sk-label">Calls, last 18 days</Text>
            <Chart kind="bars" className="sk-chart" data={BARS} width={layout === 'compact' ? 286 : 300} height={140} show={s.on} />
          </section>
        </div>
      )}
    </Stage>
  )
}
