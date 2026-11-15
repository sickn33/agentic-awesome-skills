import { Archive, ChevronLeft, ChevronRight, Ellipsis, Megaphone, MessageSquare, ShoppingCart, User } from 'lucide-react'
import { Avatar, Bar, Collapse, Phone, Row, Stage, type Act } from '../../kit'
import './swipe.css'

// A mail app's swipe to archive, phone only. Beats: the finger presses a
// message, swipes it left with the archive action opening behind, lets go,
// and the row carries on off the screen at the speed the finger left it;
// then the gap closes and the next message moves up. Plays once; Replay is
// the reset.
//
// What makes the swipe read as one gesture, rather than harsh, paused half
// way or jolted into place:
// - The row is under the finger the whole way, 1:1, no lag, no rubber band.
// - The throw starts at the finger's own speed. The script measures the last
//   few samples of the drag and builds a curve whose first slope is that
//   speed, so there is no step at the hand-over and no pause.
// - The Archive mark rides the row's trailing edge, so it ends at the left
//   edge when the row is off, as Mail's does; the gap then closes in one ease
//   with the color solid, never fading through gray.
// - The kit's touch cursor presses first, then swipes, leaving its trail.
//
// Only the swiped message is unread: a blue dot on a placeholder row would
// be the heaviest mark on filler.
//
// Real strings: Inbox, Edit, the swiped message, the one that moves up into
// its place (so the last frame has words where the eye lands), Archive. The other rows are
// placeholder lines at a real message's line heights.

type S = { dx: number; throw: { ms: number; ease: string } | null; gone: boolean }

const initial: S = { dx: 0, throw: null, gone: false }

const PICK = 0

const MAIL = [
  { from: 'Northwind Air', time: '9:12', subject: 'Your trip to Lisbon', preview: 'Check-in opens 24 hours before departure. Your seat is 14A.', unread: true },
  { from: 'Jon Park', time: '8:30', subject: 'Re: pricing page', preview: 'Looks good to me. One note on the annual toggle copy.', unread: false },
  { from: 'Maya Chen', time: '9:41', subject: 'Launch checklist', preview: 'Two things left before Thursday: the pricing page and the press kit.', unread: false },
  { from: 'Ana Ruiz', time: 'Yesterday', subject: 'Q3 board deck', preview: 'Draft is in the shared folder, comments welcome by Friday.', unread: false },
  { from: 'Leo Sato', time: 'Yesterday', subject: 'Offsite dates', preview: 'Can everyone do the week of the 14th? Venue is holding it.', unread: false },
]

async function script(a: Act<S>) {
  await a.wait(900)

  // 1. Press the message on its right side, then swipe it left
  a.mark('swipe')
  const row = a.rect('row')
  const y = row.y + row.height * 0.5
  await a.move({ x: row.x + row.width * 0.8, y })
  await a.wait(250)
  const from = row.x + row.width * 0.8
  const samples: { x: number; t: number }[] = []
  await a.drag(
    { x: row.x + row.width * 0.22, y },
    (at) => {
      samples.push({ x: at.x, t: performance.now() })
      a.put({ dx: at.x - from })
    },
    // A swipe is flat: no carrying bow, the finger runs along the row
    { duration: 300, path: (t, a0, b0) => ({ x: a0.x + (b0.x - a0.x) * t, y: a0.y }) },
  )

  // 2. The finger lifts still moving; the row carries on at that speed
  a.mark('throw')
  const last = samples.slice(-4)
  const v = last.length > 1 ? Math.abs(last[last.length - 1]!.x - last[0]!.x) / Math.max(1, last[last.length - 1]!.t - last[0]!.t) : 1
  const dx = samples.length ? samples[samples.length - 1]!.x - from : 0
  const left = row.width + dx
  const ms = 300
  // A curve whose first slope is the finger's speed, easing out at the end
  const x1 = 0.25
  const y1 = Math.min(0.95, (x1 * v * ms) / left)
  a.put({ throw: { ms, ease: `cubic-bezier(${x1}, ${y1.toFixed(3)}, 0.35, 1)` }, dx: -row.width })
  await a.wait(ms)

  // 3. The gap closes and the next message moves up
  a.mark('close')
  a.put({ gone: true })
  await a.wait(1800)
  a.mark('done')
}

export default function SwipeDemo() {
  return (
    <Stage<S>
      width={400}
      height={480}
      compact={{ below: 400, width: 358, height: 480 }}
      initial={initial}
      poster={{ dx: 0, throw: null, gone: true }}
      script={script}
      play="once"
      cursor={{ at: { x: 330, y: 470 }, style: 'touch' }}
      className="sw"
    >
      {(s, rect, layout) => {
        // The row moves in screen points; the phone is drawn scaled
        const box = rect('row')
        const k = box.width ? box.width / 402 : 1
        const shift = s.dx / k
        const open = Math.max(0, -shift)
        return (
          <Phone width={layout === 'compact' ? 340 : 380} className="sw-phone">
            <div className="sw-app">
              <header className="sw-head">
                <div className="sw-bar-top">
                  <span className="sw-round"><ChevronLeft size={20} strokeWidth={2.25} /></span>
                  <span className="sw-round"><Ellipsis size={18} strokeWidth={2.25} /></span>
                </div>
                <div className="sw-title">Inbox</div>
                <div className="sw-cats">
                  <span className="sw-cat" data-on>
                    <User size={15} strokeWidth={2.25} />
                    Primary
                  </span>
                  <span className="sw-cat"><ShoppingCart size={16} strokeWidth={2} /></span>
                  <span className="sw-cat"><Megaphone size={16} strokeWidth={2} /></span>
                  <span className="sw-cat"><MessageSquare size={16} strokeWidth={2} /></span>
                </div>
              </header>
              <div className="sw-list">
                {MAIL.map((m, i) => {
                  const picked = i === PICK
                  const item = (
                    <div className="sw-cell" data-target={picked ? 'row' : undefined}>
                      {/* Only while the row is off its rest: at rest its antialiased edges would show a purple hairline */}
                      {picked && (s.dx !== 0 || s.throw) && <div className="sw-action" />}
                      <Row
                        pad={0}
                        className="sw-row"
                        unread={m.unread}
                        style={
                          picked
                            ? { transform: `translateX(${shift}px)`, transition: s.throw ? `transform ${s.throw.ms}ms ${s.throw.ease}` : 'none' }
                            : undefined
                        }
                        lead={picked || i === PICK + 1 ? <Avatar name={m.from} tone="ios" size={40} /> : <Avatar size={40} />}
                        title={picked || i === PICK + 1 ? m.from : <Bar w={FILL[i]!.from} h={11} r={5.5} tone={4} />}
                        meta={
                          picked || i === PICK + 1 ? (
                            <span className="sw-time">
                              {m.time}
                              <ChevronRight size={14} strokeWidth={2.25} />
                            </span>
                          ) : (
                            <Bar w={34} h={9} r={4.5} tone={2} />
                          )
                        }
                        subtitle={picked || i === PICK + 1 ? <span className="sw-subject">{m.subject}</span> : <Bar w={FILL[i]!.subject} h={9} r={4.5} tone={3} />}
                        preview={
                          picked || i === PICK + 1
                            ? m.preview
                            : FILL[i]!.preview.map((w, j) => (
                                <span className="sw-fill" key={j}>
                                  <Bar w={w} h={9} r={4.5} tone={2} />
                                </span>
                              ))
                        }
                      >
                        {picked && (
                          <span className="sw-action__mark" style={{ opacity: s.gone ? 0 : Math.min(1, open / 60), transition: s.gone ? 'opacity 120ms ease-out' : 'none' }}>
                            <Archive size={22} strokeWidth={2} />
                            Archive
                          </span>
                        )}
                      </Row>
                    </div>
                  )
                  return picked ? (
                    <Collapse key={m.from} open={!s.gone} solid>
                      {item}
                    </Collapse>
                  ) : (
                    <div key={m.from}>{item}</div>
                  )
                })}
              </div>
            </div>
          </Phone>
        )
      }}
    </Stage>
  )
}

// Placeholder rows: bars at a real message's line heights, so every row is
// the height a real one would be. Only the swiped message has words.
const FILL = [
  null,
  null,
  { from: 104, subject: 148, preview: [250, 170] },
  { from: 92, subject: 136, preview: [256, 180] },
  { from: 84, subject: 112, preview: [230, 140] },
]
