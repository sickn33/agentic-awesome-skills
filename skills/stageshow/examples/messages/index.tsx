import { Stage, Phone, Thread, Bubble, Stamp, Receipt, type Act, Avatar } from '../../kit'
import './messages.css'

// A conversation at true iOS size: your reply is typed into the composer and
// sent, the bubble forming out of the field's words; the receipt turns to
// Read, they start typing, and the dots grow into their reply. The new
// conversation holds once complete; the host can explicitly replay it.

type S = { draft: string; sent: boolean; delivered: boolean; read: boolean; typing: boolean; reply: boolean }
const initial: S = { draft: '', sent: false, delivered: false, read: false, typing: false, reply: false }
// Reduced motion shows the whole exchange
const poster: S = { ...initial, sent: true, delivered: true, read: true, reply: true }
const MINE = 'Yes! See you at 7'

async function script(a: Act<S>) {
  await a.wait(700)
  await a.click('compose')
  await a.type('draft', MINE, { interval: 60 })
  await a.wait(450)
  await a.click('send')
  // Clear the field in the same update that adds the bubble: the words lift out of it
  await a.set({ sent: true, draft: '' })
  await a.wait(600)
  await a.set({ delivered: true })
  await a.wait(900)
  await a.set({ read: true })
  await a.wait(700)
  await a.set({ typing: true })
  await a.wait(1600)
  await a.set({ typing: false, reply: true })
  await a.wait(2600)
}

function ArrowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 13V3.5M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Messages() {
  return (
    <Stage width={420} height={340} compact={{ below: 420, width: 358, height: 340 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: 'compose', style: 'touch' }} className="ms">
      {(s) => (
        <Phone width={326} className="ms-phone">
          <div className="ms-head">
            <Avatar name="Maya" tone="ios" size={52} className="ms-avatar" />
            <span className="ms-name">Maya</span>
          </div>
          <Thread className="ms-thread">
            <Stamp>Today 9:38</Stamp>
            <Bubble from="them">Are we still on for tonight?</Bubble>
            <Bubble from="them">I booked the place on 5th</Bubble>
            {s.sent && (
              <Bubble from="me" source="draft">
                {MINE}
              </Bubble>
            )}
            <Receipt show={s.delivered}>{s.read ? 'Read 9:41' : 'Delivered'}</Receipt>
            {(s.typing || s.reply) && (
              <Bubble from="them" typing={s.typing}>
                Perfect, I'll grab us a table by the window
              </Bubble>
            )}
          </Thread>
          <div className="ms-compose">
            <span className="ms-plus" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="ms-field" data-target="compose">
              <span className="ms-field__text" data-target="draft">
                {s.draft}
                {s.draft && <i className="ms-caret" data-snap />}
              </span>
              <span className="ms-field__ph" data-hide={s.draft ? '' : undefined}>
                iMessage
              </span>
              <span className="ms-send" data-target="send" data-show={s.draft ? '' : undefined}>
                <ArrowUp />
              </span>
            </span>
          </div>
        </Phone>
      )}
    </Stage>
  )
}
