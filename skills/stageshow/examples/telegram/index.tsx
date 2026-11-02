import { Avatar, Stage, Phone, Thread, Bubble, Stamp, type Act } from '../../kit'
import './telegram.css'

// Telegram on an iPhone, the current iOS app: floating glass header (back,
// a pill with the name and status, the avatar), the default green wallpaper
// with its doodle pattern, white and pale green bubbles with the time and
// ticks inside them, and the composer (attach, field, mic or send).
//
// The phone is cropped by the stage's top: the composer and the newest
// messages are the story, so they stay in view and the header runs off.
//
// Four beats:
//   1. Context: Nika asks about a sunrise hike, with a photo of the destination.
//   2. The reply is typed and sent; it forms out of the field, a clock in its
//      corner while it sends.
//   3. The clock becomes one tick (sent), then a second tick draws in (read).
//   4. Nika answers with a big animated emoji, the way Telegram shows a lone
//      emoji: no bubble, just the emoji.
// Hold the completed conversation. Replay is the explicit reset; sent
// messages do not disappear from the live thread on their own.
//
// Real strings: the date pills, the messages, the typed reply, the times.

type Tick = 'clock' | 'sent' | 'read'
type S = { draft: string; sent: boolean; tick: Tick; reply: boolean }

const initial: S = { draft: '', sent: false, tick: 'clock', reply: false }
const poster: S = { ...initial, sent: true, tick: 'read', reply: true }

const MINE = "I'm in, I'll bring coffee"
// Where the touch rests between taps, in stage pixels (below the composer)
const REST = { x: 300, y: 470 }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark('type')
  await a.type('draft', MINE, { interval: 70 })
  await a.wait(250)
  a.mark('send')
  await a.click({ at: 'send', x: 0.5, y: 0.5 })
  await a.set({ sent: true, draft: '' })
  await a.wait(650)
  await a.set({ tick: 'sent' })
  await a.wait(1000)
  a.mark('read')
  await a.set({ tick: 'read' })
  await a.wait(1500)
  a.mark('reply')
  await a.set({ reply: true })
  await a.wait(3000)
  a.mark('done')
}

/** Telegram's ticks: a clock while sending, one tick sent, two read. */
function Ticks({ state }: { state: Tick }) {
  return (
    <svg className="tg-ticks" data-state={state} viewBox="0 0 17 11" width="17" height="11" aria-hidden>
      <g className="tg-ticks__clock">
        <circle cx="6" cy="5.5" r="4.6" />
        <path d="M6 3v2.7l1.7 1" />
      </g>
      <path className="tg-ticks__one" pathLength={1} d="M1.2 5.9 4.1 8.8 10.4 1.6" />
      <path className="tg-ticks__two" pathLength={1} d="M7.4 8.1 8.1 8.8 14.4 1.6" />
    </svg>
  )
}

function Meta({ time, tick }: { time: string; tick?: Tick }) {
  return (
    <span className="tg-meta">
      {time}
      {tick && <Ticks state={tick} />}
    </span>
  )
}

/** Local CC0 photograph shared with the Wikipedia study. */
function Trail() {
  return <img className="tg-photo__img" src={new URL('../wikipedia/kawaguchiko.jpg', import.meta.url).href} width={252} height={168} alt="Mount Fuji above Lake Kawaguchi" />
}

function Back() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M14.5 5 7.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Clip() {
  return (
    <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden>
      <path
        d="M19.6 11.4 12 19a5 5 0 0 1-7.1-7.1l8-8a3.4 3.4 0 0 1 4.8 4.8l-7.9 7.9a1.7 1.7 0 0 1-2.4-2.4l7.2-7.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Mic() {
  return (
    <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden>
      <rect x="8.6" y="2.6" width="6.8" height="12" rx="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.4 11a6.6 6.6 0 0 0 13.2 0M12 17.6v3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function Sticker() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        d="M20.6 12.6A8.6 8.6 0 1 1 11.4 3.4c5 0 9.2 4.2 9.2 9.2Zm0 0c-4.6 0-8 3.4-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10.4" r="1.15" fill="currentColor" />
      <circle cx="14" cy="10.4" r="1.15" fill="currentColor" />
    </svg>
  )
}

function Send() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M12 19V5.6M6 11.2 12 5.2l6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Telegram() {
  return (
    <Stage<S> width={400} height={520} initial={initial} poster={poster} script={script} play="once" cursor={{ at: REST, style: 'touch' }} className="tg">
      {(s) => {
        return (
          <Phone width={340} className="tg-phone">
            <div className="tg-paper" aria-hidden />
            <header className="tg-head">
              <span className="tg-glass tg-back">
                <Back />
              </span>
              <span className="tg-glass tg-title">
                <span className="tg-name">Nika</span>
                <span className="tg-status">online</span>
              </span>
              <Avatar name="Nika" size={48} className="tg-avatar" style={{ background: 'linear-gradient(#f5a26b, #e9655e)' }} />
            </header>

            <Thread className="tg-thread">
              <Stamp className="tg-date">Yesterday</Stamp>
              <Bubble from="them">
                Did the new boots come?
                <Meta time="21:04" />
              </Bubble>
              <Bubble from="me">
                Yes! Breaking them in
                <Meta time="21:10" tick="read" />
              </Bubble>
              <Stamp className="tg-date">Today</Stamp>
              <Bubble from="them">
                Free this weekend?
                <Meta time="8:12" />
              </Bubble>
              <Bubble from="me">
                Should be, why?
                <Meta time="8:20" tick="read" />
              </Bubble>
              <Bubble from="them" className="tg-photo">
                <Trail />
                <span className="tg-photo__time">9:38</span>
              </Bubble>
              <Bubble from="them">
                Sunrise hike on Saturday?
                <Meta time="9:38" />
              </Bubble>
              {s.sent && (
                <Bubble from="me" source="draft">
                  {MINE}
                  <Meta time="9:41" tick={s.tick} />
                </Bubble>
              )}
              {s.reply && (
                <Bubble from="them" className="tg-big">
                  <span className="tg-emoji">🙌</span>
                  <span className="tg-big__time">9:42</span>
                </Bubble>
              )}
            </Thread>

            <div className="tg-compose">
              <span className="tg-glass tg-round">
                <Clip />
              </span>
              <span className="tg-glass tg-field">
                <span className="tg-field__text" data-target="draft">
                  {s.draft}
                  {s.draft && <i className="tg-caret" />}
                </span>
                <span className="tg-field__ph" data-hide={s.draft ? '' : undefined}>
                  Message
                </span>
                <span className="tg-field__icon">
                  <Sticker />
                </span>
              </span>
              <span className="tg-action">
                <span className="tg-glass tg-round tg-mic" data-off={s.draft ? '' : undefined}>
                  <Mic />
                </span>
                <span className="tg-send" data-on={s.draft ? '' : undefined} data-target="send">
                  <Send />
                </span>
              </span>
            </div>
          </Phone>
        )
      }}
    </Stage>
  )
}
