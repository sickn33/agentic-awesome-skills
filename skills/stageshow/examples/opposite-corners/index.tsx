import { Bubble, Stage, Text, Thread, type Act } from '../../kit'
import './corners.css'

// Copy and art in opposite corners: a bento tile whose words sit bottom-left
// and whose picture hangs from the top-right corner, off both those edges.
// Beats: the replies arrive one by one. Plays once; the still is the payoff.
//
// What makes the corners balance:
// - The copy takes one corner, the art the opposite one, and they never
//   overlap: a clear diagonal of ground runs between them.
// - The art runs off the two edges of its corner (top and right), so it
//   reads as part of something bigger; the copy keeps the tile's full inset
//   (24px) from its two edges. The crop takes the panel the thread sits in,
//   never a bubble's words: the bubbles keep a margin inside the visible
//   part of the panel.
// - The art is the product's own surface at true size, not a shrunken
//   screenshot: a thread of real bubbles, the newest nearest the copy.
// - One idea per tile: a title and a single line, no button.
//
// Real strings: the copy and the three messages.

type S = { n: number }

const MESSAGES = [
  { from: 'them', text: 'Is the Lisbon offsite still on?' },
  { from: 'me', text: 'Yes, flights are booked' },
  { from: 'them', text: 'Perfect, sending the agenda now' },
]

async function script(a: Act<S>) {
  await a.wait(500)
  for (let i = 1; i <= MESSAGES.length; i++) {
    a.put({ n: i })
    await a.wait(700)
  }
  await a.wait(2000)
}

export default function OppositeCorners() {
  return (
    <Stage width={400} height={400} compact={{ below: 400, width: 358, height: 358 }} initial={{ n: 0 }} poster={{ n: MESSAGES.length }} script={script} play="once" className="oc">
      {(s) => (
        <>
          <div className="oc-art">
            <Thread>
              {MESSAGES.slice(0, s.n).map((m) => (
                <Bubble key={m.text} from={m.from as 'me' | 'them'}>
                  {m.text}
                </Bubble>
              ))}
            </Thread>
          </div>
          <div className="oc-copy">
            <Text className="oc-title">Replies in one place</Text>
            <Text className="oc-line">Every channel lands in one inbox, threaded.</Text>
          </div>
        </>
      )}
    </Stage>
  )
}
