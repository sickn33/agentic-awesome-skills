import { Badge, Bar, Row, Stage, Text, Window } from '../../kit'
import './overlap.css'

// Overlapping windows: a checkout card in front of the dashboard it reports
// to. A still. The story is two views of one payment: the buyer's side in
// front, the merchant's behind.
//
// What makes an overlap read as placed, not dropped:
// - The front card crosses the back window's left edge and stops inside its
//   sidebar, a clear strip of sidebar showing before the table: it covers
//   filler, never the table. An edge that lands exactly on the sidebar's
//   line reads as an accident (near-tangent); either clear it like this or
//   overlap far enough to be plainly deliberate.
// - The front card is smaller and a level above: a stronger shadow, no
//   chrome. Only one surface has chrome; two sets of traffic lights fight.
// - The back window is pinned top and runs off the bottom, ending before
//   the stage's right edge so the payment's badge is whole; the card runs
//   off nothing. The eye reads front to back: pay, then paid.
// - The payment in the card is the top row of the table behind it, the one
//   real row in the merchant's list, so the two surfaces tell one event.
//
// Real strings: the card's product, price and button; the table's title,
// its top row and the badge. Everything else is placeholder.

const SIDEBAR = 150

export default function Overlap() {
  return (
    <Stage width={640} height={400} compact={{ below: 600, width: 358, height: 400 }} className="ov">
      {(_s, _rect, layout) => {
        const side = layout === 'compact' ? 120 : SIDEBAR
        return (
          <>
            <Window url="dashboard.northwind.co" className="ov-win" style={{ ['--ov-side' as string]: `${side}px` }}>
              <div className="ov-app">
                <aside className="ov-side">
                  <Bar w={22} h={22} r={6} tone={4} style={{ marginBottom: 14 }} />
                  {[64, 80, 56, 72, 60].map((w, i) => (
                    <Bar key={i} w={layout === 'compact' ? w * 0.7 : w} h={8} r={4} tone={i === 1 ? 4 : 2} />
                  ))}
                </aside>
                <main className="ov-main">
                  <Text className="ov-title">Payments</Text>
                  <Row
                    pad={0}
                    className="ov-row"
                    title={<Text className="ov-amount">$49.00</Text>}
                    subtitle={<Text className="ov-who">{layout === 'compact' ? 'Pro plan' : 'Pro plan, maya@lumen.studio'}</Text>}
                  >
                    {/* Narrow, the shorter word keeps the amount whole */}
                    <Badge tone="success">{layout === 'compact' ? 'Paid' : 'Succeeded'}</Badge>
                  </Row>
                  {[132, 108, 146, 96, 120].map((w, i) => (
                    <Row key={i} pad={0} className="ov-row" title={<Bar w={52} h={8} r={4} tone={3} />} subtitle={<Bar w={w} h={6} r={3} tone={2} />}>
                      <Bar w={58} h={16} r={8} tone={1} />
                    </Row>
                  ))}
                </main>
              </div>
            </Window>

            <section className="ov-card">
              <Text className="ov-product">Northwind Pro</Text>
              <span className="ov-price">
                <Text>$49.00</Text> <span className="ov-per">per month</span>
              </span>
              <div className="ov-fields">
                <Bar w="100%" h={30} r={6} tone={1} />
                <Bar w="100%" h={30} r={6} tone={1} />
              </div>
              <span className="ov-pay">Subscribe</span>
            </section>
          </>
        )
      }}
    </Stage>
  )
}
