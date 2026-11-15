import { Bar, Connector, Roll, Stage, Text, Window, type Act } from '../../kit'
import './panel.css'

// A settings panel over the product it changes, with one annotation tying a
// setting to what it does. Beats: the cursor picks a new accent in the
// Branding panel; the checkout's Pay button takes the color; a leader draws
// from the accent row to the button. Plays once; the still is the payoff.
//
// What makes a panel-over-product picture read:
// - Two jobs, two weights. The checkout is the product, large, behind; the
//   panel is the tool, smaller, in front, straddling the checkout's right
//   edge over its empty margin, never over the form.
// - The panel and the thing it changes share one color change: the swatch,
//   the hex and the button move together, so the cause is plain before the
//   line arrives.
// - One leader, after the change: out of the panel's bottom edge under the
//   chosen swatch, down through empty ground, then into the button's right
//   edge, ending short of it. It never runs over the panel's or the form's
//   content. It explains which setting did that; a line per row would be a
//   diagram, not a picture.
// - Narrow, there is no clear path for a leader: the panel sits above the
//   checkout, over its chrome only, and the shared color carries the story.
//
// Real strings: the merchant, the amount, Pay, the panel's title and its two
// color rows.

type S = { accent: number; linked: boolean }

const ACCENTS = [
  { hex: '#2563EB', name: 'blue' },
  { hex: '#7C3AED', name: 'violet' },
  { hex: '#059669', name: 'green' },
  { hex: '#EA580C', name: 'orange' },
]

const initial: S = { accent: 0, linked: false }
const poster: S = { accent: 1, linked: true }

async function script(a: Act<S>) {
  await a.wait(1000)
  a.mark('pick')
  await a.click({ at: 'swatch-1', x: 0.5, y: 0.5 })
  a.put({ accent: 1 })
  await a.wait(500)
  a.mark('link')
  a.put({ linked: true })
  await a.move({ at: 'panel', x: 0.6, y: 1.15 })
  await a.wait(2600)
}

export default function PanelAnnotation() {
  return (
    <Stage width={640} height={440} compact={{ below: 600, width: 358, height: 600 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { x: 600, y: 410 } }} className="pa">
      {(s, rect, layout) => {
        const accent = ACCENTS[s.accent]!.hex
        const panel = rect('panel')
        const swatch = rect(`swatch-${s.accent}`)
        const pay = rect('pay')
        return (
          <>
            <Window url="checkout.northwind.co" className="pa-win">
              <div className="pa-checkout" style={{ ['--pa-accent' as string]: accent }}>
                <Text className="pa-merchant">Northwind</Text>
                <Text className="pa-amount">$60.00</Text>
                <div className="pa-fields">
                  <Bar w="100%" h={30} r={6} tone={1} />
                  <Bar w="100%" h={30} r={6} tone={1} />
                  <div className="pa-pair">
                    <Bar w="100%" h={30} r={6} tone={1} />
                    <Bar w="100%" h={30} r={6} tone={1} />
                  </div>
                </div>
                <span className="pa-pay" data-target="pay">Pay $60.00</span>
              </div>
            </Window>

            <section className="pa-panel" data-target="panel">
              <Text className="pa-title">Branding</Text>
              <Text className="pa-hint">How your brand shows on checkout</Text>
              <div className="pa-row">
                <Text className="pa-label">Brand color</Text>
                <span className="pa-value"><span className="pa-chip" style={{ background: '#111827' }} />#111827</span>
              </div>
              <div className="pa-row" data-target="accent-row">
                <Text className="pa-label">Accent color</Text>
                <span className="pa-value">
                  <span className="pa-chip" style={{ background: accent }} />
                  <Roll>{accent}</Roll>
                </span>
              </div>
              <div className="pa-swatches">
                {ACCENTS.map((c, i) => (
                  <span key={c.hex} className="pa-swatch" data-target={`swatch-${i}`} data-cursor="pointer" data-on={i === s.accent || undefined} style={{ background: c.hex }} />
                ))}
              </div>
              <div className="pa-row pa-row--quiet">
                <Bar w={64} h={8} r={4} tone={3} />
                <Bar w={72} h={22} r={6} tone={1} />
              </div>
            </section>

            {layout !== 'compact' && panel.width > 0 && pay.width > 0 && (
              <Connector show={s.linked} from={{ x: swatch.x + swatch.width / 2, y: panel.y + panel.height + 6 }} to={{ x: pay.x + pay.width + 6, y: pay.y + pay.height / 2 }} route="v" />
            )}
          </>
        )
      }}
    </Stage>
  )
}
