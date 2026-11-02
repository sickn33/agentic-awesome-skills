import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bell,
  Bookmark,
  ChevronDown,
  CircleHelp,
  Clock,
  Ellipsis,
  EllipsisVertical,
  Forward,
  Hash,
  Headphones,
  House,
  MessageSquareText,
  MessagesSquare,
  Mic,
  Plus,
  Search,
  SendHorizontal,
  Smile,
  SmilePlus,
  SquarePen,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Bar, Collapse, Stage, Text, Window, type Act } from '../../kit'
import './slack.css'

// Slack, in #design. Maya's message arrives, the user hovers it and taps 👀
// from the quick reactions, opens the thread and replies. Closing the thread
// leaves the reaction and reply summary in place until the host's Replay.
//
// Icons: Slack's own set isn't available, so Lucide is used on purpose: its
// rounded 1.75 stroke is the closest match to Slack's outline glyphs.

type S = {
  arrived: boolean
  reacted: boolean
  thread: boolean
  focus: boolean
  typing: boolean
  draft: string
  replied: boolean
}

const initial: S = { arrived: true, reacted: false, thread: false, focus: false, typing: false, draft: '', replied: false }

// Under reduced motion: the finished moment, reacted and replied in the open thread
const poster: S = { ...initial, arrived: true, reacted: true, thread: true, replied: true }

const MESSAGE = 'The new onboarding flow is ready for review. Can you take a look before standup?'
const REPLY = "On it, I'll leave notes in the file"
const REST = { x: 560, y: 250 }

async function script(a: Act<S>) {
  // Opens on the channel with Maya's message already in.
  await a.wait(1200)

  // Hover the message: the row lights up and its toolbar shows
  a.mark('hover')
  await a.move({ at: 'msg', x: 0.42, y: 0.55 })
  await a.wait(500)

  // 👀 from the quick reactions
  await a.move({ at: 'react-eyes', x: 0.82, y: 0.86 })
  await a.wait(220)
  a.mark('react')
  await a.click()
  await a.set({ reacted: true })
  await a.wait(1000)

  // Reply in thread
  await a.move({ at: 'reply-btn', x: 0.78, y: 0.82 })
  await a.wait(260)
  a.mark('thread')
  await a.click()
  await a.set({ thread: true })
  await a.wait(800)

  // Write the reply
  await a.move({ at: 'tbox', x: 0.62, y: 0.3 })
  await a.click()
  await a.set({ focus: true })
  await a.wait(350)
  await a.set({ typing: true })
  await a.type('draft', REPLY, { interval: 52 })
  await a.set({ typing: false })
  await a.wait(450)
  a.mark('send')
  await a.key('enter')
  await a.set({ draft: '', replied: true })
  await a.wait(500)
  // Step off the reply as it lands, so the pointer isn't parked on its words
  const box = a.rect('tbox')
  await a.move({ x: box.x + box.width * 0.7, y: box.y + box.height + 60 })
  await a.wait(1800)

  // Close the thread and hold the result. Replay is the explicit reset.
  a.mark('exit')
  await a.move({ at: 'tclose', x: 0.5, y: 0.5 })
  await a.wait(200)
  await a.click()
  await a.set({ thread: false, focus: false })
  await a.wait(500)
  await a.move(REST)
  await a.wait(1500)
  a.mark('done')
}

function I({ icon: Glyph, size = 16 }: { icon: LucideIcon; size?: number }) {
  return <Glyph size={size} strokeWidth={1.75} className="sl-i" aria-hidden />
}

/* ---- Pieces ---- */

function Face({ who, size = 36 }: { who: 'maya' | 'alex' | 'p1' | 'p2' | 'p3'; size?: number }) {
  const letter = { maya: 'M', alex: 'A', p1: 'J', p2: 'R', p3: 'T' }[who]
  return (
    <span className="sl-face" data-who={who} style={{ width: size, height: size, fontSize: Math.round(size * 0.42), borderRadius: Math.round(size * 0.22) }}>
      {letter}
    </span>
  )
}

function SideBar({ w, light }: { w: number; light?: boolean }) {
  // The sidebar is aubergine, so its placeholders are a light purple from the same family
  return <Bar w={w} h={6} style={{ background: light ? '#b192b3' : '#8c6a8e' }} />
}

function Sidebar() {
  return (
    <aside className="sl-side">
      <div className="sl-side__head">
        <Text className="sl-side__ws">Northwind</Text>
        <I icon={ChevronDown} size={14} />
        <span className="sl-grow" />
        <span className="sl-side__compose">
          <I icon={SquarePen} size={15} />
        </span>
      </div>
      <div className="sl-side__list">
        {[46, 58].map((w, i) => (
          <div key={i} className="sl-side__row">
            <span className="sl-side__glyph" />
            <SideBar w={w} />
          </div>
        ))}
        <div className="sl-side__section">
          <I icon={ChevronDown} size={12} />
          <SideBar w={52} light />
        </div>
        <div className="sl-side__row">
          <I icon={Hash} size={14} />
          <SideBar w={44} />
        </div>
        <div className="sl-side__row" data-active>
          <I icon={Hash} size={14} />
          <Text className="sl-side__name">design</Text>
        </div>
        {[60, 38].map((w, i) => (
          <div key={i} className="sl-side__row">
            <I icon={Hash} size={14} />
            <SideBar w={w} />
          </div>
        ))}
        <div className="sl-side__section">
          <I icon={ChevronDown} size={12} />
          <SideBar w={74} light />
        </div>
        {(['p1', 'maya', 'p3'] as const).map((who, i) => (
          <div key={who} className="sl-side__row">
            <Face who={who} size={18} />
            <SideBar w={[54, 66, 48][i]} />
          </div>
        ))}
      </div>
    </aside>
  )
}

function Rail() {
  const items: { icon: LucideIcon; label: string; active?: boolean }[] = [
    { icon: House, label: 'Home', active: true },
    { icon: MessagesSquare, label: 'DMs' },
    { icon: Bell, label: 'Activity' },
    { icon: Ellipsis, label: 'More' },
  ]
  return (
    <nav className="sl-rail">
      <span className="sl-rail__ws">N</span>
      {items.map((it) => (
        <span key={it.label} className="sl-rail__item" data-active={it.active || undefined}>
          <span className="sl-rail__btn">
            <I icon={it.icon} size={18} />
          </span>
          <Text className="sl-rail__label">{it.label}</Text>
        </span>
      ))}
      <span className="sl-grow" />
      <span className="sl-rail__plus">
        <I icon={Plus} size={16} />
      </span>
      <span className="sl-rail__me">
        <Face who="alex" size={32} />
        <span className="sl-rail__status" />
      </span>
    </nav>
  )
}

function Older({ who, name, lines }: { who: 'p1' | 'p2'; name: number; lines: number[] }) {
  return (
    <div className="sl-msg">
      <Face who={who} />
      <div className="sl-msg__body">
        <div className="sl-msg__meta sl-msg__meta--bars">
          <Bar w={name} h={7} tone={4} />
          <Bar w={34} h={5} tone={2} />
        </div>
        <div className="sl-msg__lines">
          {lines.map((w, i) => (
            <Bar key={i} w={w} h={6} tone={2} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Reaction({ mine }: { mine?: boolean }) {
  return (
    <span className="sl-react" data-mine={mine || undefined}>
      <span className="sl-react__emoji">👀</span>
      <span className="sl-react__count">1</span>
    </span>
  )
}

function HoverBar() {
  const quick = ['✅', '👀', '🙌']
  return (
    <div className="sl-hover">
      {quick.map((e) => (
        <span key={e} className="sl-hover__btn sl-hover__emoji" data-target={e === '👀' ? 'react-eyes' : undefined}>
          {e}
        </span>
      ))}
      <span className="sl-hover__div" />
      <span className="sl-hover__btn">
        <I icon={SmilePlus} />
      </span>
      <span className="sl-hover__btn" data-target="reply-btn">
        <I icon={MessageSquareText} />
      </span>
      <span className="sl-hover__btn">
        <I icon={Forward} />
      </span>
      <span className="sl-hover__btn">
        <I icon={Bookmark} />
      </span>
      <span className="sl-hover__btn">
        <I icon={EllipsisVertical} />
      </span>
    </div>
  )
}

function Composer({ placeholder, draft = '', focus, typing, target }: { placeholder: string; draft?: string; focus?: boolean; typing?: boolean; target?: string }) {
  return (
    <div className="sl-compose" data-focus={focus || undefined} data-target={target} data-cursor={target ? 'ibeam' : undefined}>
      <div className="sl-compose__text">
        <span className="sl-compose__placeholder" data-hide={draft.length > 0 || undefined}>
          {placeholder}
        </span>
        <span className="sl-compose__draft">{draft}</span>
        <span className="sl-caret" data-show={focus || undefined} data-typing={typing || undefined} />
      </div>
      <div className="sl-compose__tools">
        <span className="sl-compose__round">
          <I icon={Plus} size={14} />
        </span>
        <I icon={Type} size={15} />
        <I icon={Smile} size={15} />
        <I icon={AtSign} size={15} />
        <span className="sl-compose__sep" />
        <I icon={Mic} size={15} />
        <span className="sl-grow" />
        <span className="sl-compose__send" data-ready={draft.length > 0 || undefined}>
          <I icon={SendHorizontal} size={14} />
        </span>
      </div>
    </div>
  )
}

/* ---- Scene ---- */

export default function SlackDemo() {
  return (
    <Stage width={940} height={540} compact={{ below: 600, width: 440, height: 440 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: REST }} className="sl" keys="bottom">
      {(s) => (
        <Window
          className="sl-win"
          lead={
            <>
              <span className="sl-top__nav">
                <I icon={ArrowLeft} size={15} />
                <I icon={ArrowRight} size={15} />
                <I icon={Clock} size={15} />
              </span>
              <span className="sl-top__search">
                <I icon={Search} size={13} />
                <Text>Search Northwind</Text>
              </span>
            </>
          }
          toolbar={
            <span className="sl-top__help">
              <I icon={CircleHelp} size={15} />
            </span>
          }
        >
          <div className="sl-body">
            <Rail />
            <div className="sl-panel">
              <Sidebar />

              <section className="sl-channel" data-thread={s.thread || undefined}>
                <header className="sl-channel__head">
                  <span className="sl-channel__title">
                    <I icon={Hash} size={16} />
                    <Text>design</Text>
                    <I icon={ChevronDown} size={14} />
                  </span>
                  <span className="sl-grow" />
                  <span className="sl-members">
                    <span className="sl-members__faces">
                      <Face who="p1" size={20} />
                      <Face who="maya" size={20} />
                      <Face who="p2" size={20} />
                    </span>
                    <span className="sl-members__count">12</span>
                  </span>
                  <span className="sl-headbtn">
                    <I icon={Headphones} size={15} />
                  </span>
                </header>
                <div className="sl-tabs">
                  <span className="sl-tab" data-active>
                    <I icon={MessageSquareText} size={14} />
                    <Text>Messages</Text>
                  </span>
                  <span className="sl-tab">
                    <span className="sl-tab__glyph" />
                    <Bar w={40} h={6} tone={2} />
                  </span>
                  <span className="sl-tab sl-tab--plus">
                    <I icon={Plus} size={14} />
                  </span>
                </div>

                <div className="sl-feed" data-crop>
                  <div className="sl-divider">
                    <span className="sl-divider__pill">
                      <Bar w={46} h={6} tone={3} />
                    </span>
                  </div>
                  <Older who="p1" name={74} lines={[196]} />
                  <Older who="p2" name={58} lines={[142]} />
                  <Collapse open={s.arrived} className="sl-live">
                    <div className="sl-row" data-target="msg">
                    <div className="sl-msg sl-msg--live">
                      <Face who="maya" />
                      <div className="sl-msg__body">
                        <div className="sl-msg__meta">
                          <Text className="sl-msg__name">Maya Chen</Text>
                          <Text className="sl-msg__time">10:42 AM</Text>
                        </div>
                        <p className="sl-msg__text">{MESSAGE}</p>
                        <Collapse open={s.reacted}>
                          <div className="sl-msg__reacts">
                            <Reaction mine />
                          </div>
                        </Collapse>
                        <Collapse open={s.replied}>
                          <div className="sl-replies">
                            <Face who="alex" size={20} />
                            <Text className="sl-replies__link">1 reply</Text>
                            <Text className="sl-replies__when">Last reply just now</Text>
                          </div>
                        </Collapse>
                      </div>
                    </div>
                      <HoverBar />
                    </div>
                  </Collapse>
                </div>

                <div className="sl-channel__compose">
                  <Composer placeholder="Message #design" />
                </div>
              </section>

              <div className="sl-thread-wrap" data-open={s.thread || undefined} data-crop>
                <aside className="sl-thread">
                  <header className="sl-thread__head">
                    <Text className="sl-thread__title">Thread</Text>
                    <span className="sl-thread__where">
                      <I icon={Hash} size={12} />
                      <Text>design</Text>
                    </span>
                    <span className="sl-grow" />
                    <span className="sl-headbtn" data-target="tclose">
                      <I icon={X} size={15} />
                    </span>
                  </header>
                  <div className="sl-thread__body">
                    <div className="sl-msg sl-msg--thread">
                      <Face who="maya" />
                      <div className="sl-msg__body">
                        <div className="sl-msg__meta">
                          <Text className="sl-msg__name">Maya Chen</Text>
                          <Text className="sl-msg__time">10:42 AM</Text>
                        </div>
                        <p className="sl-msg__text">{MESSAGE}</p>
                        <div className="sl-msg__reacts">
                          <Reaction mine />
                        </div>
                      </div>
                    </div>
                    <Collapse open={s.replied}>
                      <div className="sl-thread__count">
                        <Text>1 reply</Text>
                        <span className="sl-thread__rule" />
                      </div>
                      <div className="sl-msg sl-msg--thread">
                        <Face who="alex" />
                        <div className="sl-msg__body">
                          <div className="sl-msg__meta">
                            <Text className="sl-msg__name">Alex Rivera</Text>
                            <Text className="sl-msg__time">10:43 AM</Text>
                          </div>
                          <p className="sl-msg__text">{REPLY}</p>
                        </div>
                      </div>
                    </Collapse>
                    <div className="sl-thread__compose">
                      <Composer placeholder="Reply…" draft={s.draft} focus={s.focus} typing={s.typing} target="tbox" />
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </Window>
      )}
    </Stage>
  )
}
