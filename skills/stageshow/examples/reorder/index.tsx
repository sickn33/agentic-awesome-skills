import { Bar, Check, Icon, Row, Stage, Text, Window, type Act } from '../../kit'
import './reorder.css'

// Drag to reorder: a launch checklist. Beats: the cursor takes the fourth
// item by its grip, lifts it, carries it up; the rows it passes make room;
// it drops into second place. Plays once; the still is the payoff.
//
// What makes a reorder read as one gesture:
// - Every row sits at its slot by a transform, never by the list's flow, so
//   rows move by gliding, and the lifted row can be anywhere without the
//   others reflowing under it.
// - The lifted row follows the cursor 1:1 (no transition while dragging),
//   scaled up a touch with a lift shadow; the rows it passes glide a slot to
//   make room as its middle crosses theirs.
// - On release it glides from where the hand left it into its slot; it never
//   jumps to the slot first.
// - Only the moved item and the item it passes say anything; the rest are
//   placeholder rows with the same anatomy.
//
// Real strings: the title and the two items that trade places.

const H = 48
const ITEMS = [
  { id: 'a', label: null, w: 150 },
  { id: 'b', label: 'Write the changelog', w: 0 },
  { id: 'c', label: null, w: 120 },
  { id: 'd', label: 'Record the demo video', w: 0 },
  { id: 'e', label: null, w: 136 },
]

type S = { order: string[]; lifted: string | null; dy: number }

const initial: S = { order: ['a', 'b', 'c', 'd', 'e'], lifted: null, dy: 0 }
const poster: S = { order: ['a', 'd', 'b', 'c', 'e'], lifted: null, dy: 0 }

async function script(a: Act<S>) {
  await a.wait(800)
  a.mark('grab')
  const grip = a.rect('grip-d')
  const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }
  await a.move(from)
  await a.wait(200)
  let order = initial.order
  await a.drag(
    { x: from.x + 6, y: from.y - 2 * H },
    (at) => {
      const dy = at.y - from.y
      // The lifted row's middle decides its slot
      const slot = Math.max(0, Math.min(4, Math.round((3 * H + dy) / H)))
      const rest = initial.order.filter((id) => id !== 'd')
      order = [...rest.slice(0, slot), 'd', ...rest.slice(slot)]
      a.put({ lifted: 'd', dy, order })
    },
    { duration: 900 },
  )
  a.mark('drop')
  a.put({ lifted: null, dy: 0, order })
  await a.wait(400)
  await a.move({ x: from.x + 70, y: from.y + 40 })
  await a.wait(2200)
}

export default function Reorder() {
  return (
    <Stage width={520} height={360} compact={{ below: 520, width: 358, height: 380 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { x: 480, y: 330 } }} className="ro">
      {(s) => (
        <Window title="Launch checklist" className="ro-win">
          <div className="ro-list" style={{ height: ITEMS.length * H }}>
            {ITEMS.map((item) => {
              const slot = s.order.indexOf(item.id)
              const lifted = s.lifted === item.id
              // The lifted row rides the cursor from where it started
              const y = lifted ? initial.order.indexOf(item.id) * H + s.dy : slot * H
              return (
                <div key={item.id} className="ro-slot" data-lifted={lifted || undefined} style={{ transform: `translateY(${y}px)` }}>
                  <Row
                    pad={10}
                    className="ro-row"
                    lead={<Check on={false} />}
                    title={item.label ? <Text className="ro-label">{item.label}</Text> : <Bar w={item.w} h={8} r={4} tone={3} />}
                  >
                    <span className="ro-grip" data-target={`grip-${item.id}`} data-cursor="grab">
                      <Icon name="grip" size={16} />
                    </span>
                  </Row>
                </div>
              )
            })}
          </div>
        </Window>
      )}
    </Stage>
  )
}
