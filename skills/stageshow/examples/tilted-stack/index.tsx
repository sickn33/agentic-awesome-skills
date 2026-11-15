import { Bar, Stage, Text } from '../../kit'
import './tilted.css'

// A loose tilted stack: three receipts dropped on a desk, the newest on top.
// A still. Tilt is the exception in faux UI, not a default: it earns its
// place here because the story is a pile of paper (things gathered, not a
// screen), and a straight stack would read as a list.
//
// What keeps a tilted stack from looking accidental:
// - Small angles, alternating: about -6, 4 and -2 degrees. Past 8 the type
//   on the top card stops reading as level.
// - The top card is the straightest and the only one with words; the cards
//   under it show a third or less, and that part is filler.
// - Each card turns about its own center and is offset a little (12 to 20px),
//   so the corners fan out unevenly, the way paper lands.
// - The stack sits on the stage's center line with room on every side; the
//   stage cuts nothing.
//
// Real strings: the top receipt's merchant, items and total.

export default function TiltedStack() {
  return (
    <Stage width={480} height={360} compact={{ below: 480, width: 358, height: 340 }} className="ts">
      {() => (
        <div className="ts-pile">
          <section className="ts-card ts-card--back">
            <Bar w={90} h={9} r={4.5} tone={3} />
            <Bar w={130} h={7} r={3.5} tone={2} />
            <Bar w={110} h={7} r={3.5} tone={2} />
          </section>
          <section className="ts-card ts-card--mid">
            <Bar w={110} h={9} r={4.5} tone={3} />
            <Bar w={150} h={7} r={3.5} tone={2} />
            <Bar w={120} h={7} r={3.5} tone={2} />
          </section>
          <section className="ts-card ts-card--top">
            <Text className="ts-merchant">Lumen Coffee</Text>
            <Text className="ts-date">Oct 28, 9:14 AM</Text>
            <div className="ts-items">
              <div className="ts-item"><Text>Flat white</Text><Text>$4.50</Text></div>
              <div className="ts-item"><Text>Almond croissant</Text><Text>$3.75</Text></div>
            </div>
            <div className="ts-total"><Text>Total</Text><Text>$8.25</Text></div>
          </section>
        </div>
      )}
    </Stage>
  )
}
