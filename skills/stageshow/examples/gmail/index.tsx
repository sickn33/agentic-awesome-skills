import { Avatar, Bar, BrandMark, Collapse, Roll, Stage, Text, Toast, Tooltip, Window, type Act } from '../../kit'
import './gmail.css'

// Gmail: the cursor hovers an email, the row's hover actions appear, it
// clicks Archive, the row folds away and "Conversation archived" slides up.
// The loop resets with a cause: Undo brings the row back.

type S = { tip: boolean; archived: boolean; toast: boolean }

const initial: S = { tip: false, archived: false, toast: false }

// Material Symbols paths (Gmail's own icon family), 24px grid
const M = {
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  search:
    'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  apps: 'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  inbox:
    'M19 3H4.99C3.88 3 3.01 3.89 3.01 5L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z',
  star: 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
  clock:
    'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  send: 'M4.01 6.03l7.51 3.22-7.52-1 .01-2.22m7.5 8.72L4 17.97v-2.22l7.51-1M2.01 3L2 10l15 2-15 2 .01 7L23 12 2.01 3z',
  draft:
    'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z',
  box: 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
  drop: 'M7 10l5 5 5-5z',
  refresh:
    'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  left: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  right: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  archive:
    'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm8.45-9h-2.9v3H8l4 4 4-4h-2.55z',
  trash: 'M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z',
  unread:
    'M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
} as const

function Sym({ d, size = 20 }: { d: keyof typeof M; size?: number }) {
  return (
    <svg className="gm-sym" viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d={M[d]} fill="currentColor" />
    </svg>
  )
}

// Rows around the story row: sender, subject and snippet widths vary
const ROWS: { unread?: boolean; s: number; t: number; n: number; d: number }[] = [
  { unread: true, s: 62, t: 74, n: 120, d: 34 },
  { unread: true, s: 0, t: 0, n: 0, d: 0 }, // the story row
  { unread: true, s: 54, t: 92, n: 86, d: 30 },
  { s: 70, t: 60, n: 132, d: 36 },
  { s: 48, t: 84, n: 104, d: 32 },
  { s: 66, t: 70, n: 118, d: 30 },
  { s: 58, t: 96, n: 92, d: 36 },
  { s: 72, t: 64, n: 110, d: 32 },
]

function Actions({ story }: { story?: boolean }) {
  return (
    <span className="gm-actions">
      <span className="gm-act" data-target={story ? 'archive' : undefined} data-cursor="hand">
        <Sym d="archive" size={17} />
      </span>
      <span className="gm-act" data-cursor="hand">
        <Sym d="trash" size={17} />
      </span>
      <span className="gm-act" data-cursor="hand">
        <Sym d="unread" size={17} />
      </span>
      <span className="gm-act" data-cursor="hand">
        <Sym d="clock" size={17} />
      </span>
    </span>
  )
}

function Row({ i, r }: { i: number; r: (typeof ROWS)[number] }) {
  const story = i === 1
  return (
    <div className="gm-row" data-target={story ? 'row' : `r${i}`} data-unread={r.unread || undefined}>
      <span className="gm-row__icons">
        <Sym d="box" size={16} />
        <Sym d="star" size={16} />
      </span>
      {story ? (
        <>
          <Text className="gm-row__from">Maya Chen</Text>
          <span className="gm-row__text">
            <Text className="gm-row__subject">Offsite plan, v2</Text>
            <span className="gm-row__dash">-</span>
            <Bar w={56} h={6} tone={2} className="gm-row__snippet" />
          </span>
          <Text className="gm-row__date">10:42 AM</Text>
        </>
      ) : (
        <>
          <span className="gm-row__from">
            <Bar w={r.s} h={6} tone={r.unread ? 5 : 4} />
          </span>
          <span className="gm-row__text">
            <Bar w={r.t} h={6} tone={r.unread ? 5 : 4} />
            <Bar w={r.n} h={6} tone={2} className="gm-row__snippet" />
          </span>
          <span className="gm-row__date">
            <Bar w={r.d} h={6} tone={r.unread ? 4 : 3} />
          </span>
        </>
      )}
      <Actions story={story} />
    </div>
  )
}

function Nav({ count }: { count: string }) {
  const rest: [keyof typeof M, number][] = [
    ['star', 44],
    ['clock', 50],
    ['send', 30],
    ['draft', 40],
  ]
  return (
    <nav className="gm-nav" data-target="nav">
      <span className="gm-compose">
        <Sym d="edit" size={18} />
        <Text className="gm-compose__label">Compose</Text>
      </span>
      <span className="gm-item" data-active>
        <Sym d="inbox" size={17} />
        <Text className="gm-item__label">Inbox</Text>
        <span className="gm-item__count">
          <Roll>{count}</Roll>
        </span>
      </span>
      {rest.map(([icon, w]) => (
        <span key={icon} className="gm-item">
          <Sym d={icon} size={17} />
          <Bar w={w} h={6} tone={4} />
        </span>
      ))}
    </nav>
  )
}

async function script(a: Act<S>) {
  await a.wait(700)

  // 1. Hover the email: the row lifts and its actions replace the date
  a.mark('hover')
  await a.move({ at: 'row', x: 0.5, y: 0.55 })
  await a.wait(900)

  // 2. Over to Archive; its tooltip names it
  await a.move({ at: 'archive', x: 0.6, y: 0.62 })
  await a.wait(350)
  await a.set({ tip: true })
  await a.wait(700)

  // 3. Click: the row folds away, the count drops, the toast rises in
  a.mark('archive')
  const at = a.center('archive')
  await a.click()
  await a.set({ tip: false, archived: true })
  await a.wait(320)
  await a.set({ toast: true })
  // The next email slides up under the still pointer and picks up the hover
  await a.wait(280)
  const next = a.rect('r2')
  await a.move({ at: 'r2', x: (at.x + 1 - next.x) / next.width, y: 0.62 }, { duration: 160 })
  await a.wait(1800)

  // 4. Undo: the toast leaves and the email folds back in
  a.mark('undo')
  await a.click({ at: 'undo', x: 0.92, y: 0.86 })
  await a.set({ toast: false, archived: false })
  await a.wait(1400)
  await a.move(REST)
  await a.wait(400)
}

const REST = { at: 'nav', x: 0.55, y: 0.6 }

export default function GmailArchive() {
  return (
    <Stage
      width={760}
      height={420}
      compact={{ below: 560, width: 440, height: 348 }}
      initial={initial}
      script={script}
      cursor={{ at: REST }}
      accent="#0b57d0"
      className="gm"
    >
      {(s, rect, layout) => {
        const tip = rect('archive')
        return (
          <>
            <Window url="mail.google.com/mail/u/0/#inbox" urlShape="pill" className="gm-window" data-layout={layout}>
              <header className="gm-head">
                <span className="gm-head__brand">
                  <span className="gm-round">
                    <Sym d="menu" size={20} />
                  </span>
                  <BrandMark brand="gmail" tile={false} size={22} width={29} className="gm-mark" />
                  <span className="gm-wordmark">Gmail</span>
                </span>
                <span className="gm-search">
                  <Sym d="search" size={18} />
                  <Text className="gm-search__hint">Search mail</Text>
                  <span className="gm-search__tune">
                    <Sym d="tune" size={18} />
                  </span>
                </span>
                <span className="gm-head__end">
                  <span className="gm-round">
                    <Sym d="apps" size={18} />
                  </span>
                  <Avatar name="Maya" size={26} className="gm-avatar" />
                </span>
              </header>

              <div className="gm-main">
                <Nav count={s.archived ? '11' : '12'} />
                <section className="gm-panel" data-crop>
                  <div className="gm-tools">
                    <span className="gm-tools__group">
                      <Sym d="box" size={16} />
                      <span className="gm-tools__drop">
                        <Sym d="drop" size={14} />
                      </span>
                      <Sym d="refresh" size={17} />
                      <Sym d="more" size={17} />
                    </span>
                    <span className="gm-tools__pager">
                      <Bar w={58} h={6} tone={3} />
                      <Sym d="left" size={17} />
                      <Sym d="right" size={17} />
                    </span>
                  </div>
                  <div className="gm-list">
                    {ROWS.map((r, i) =>
                      i === 1 ? (
                        <Collapse key={i} open={!s.archived} className="gm-fold">
                          <Row i={i} r={r} />
                        </Collapse>
                      ) : (
                        <Row key={i} i={i} r={r} />
                      ),
                    )}
                  </div>
                </section>
              </div>
            </Window>

            <Tooltip show={s.tip} at={tip} className="gm-tip">
              Archive
            </Tooltip>

            <Toast
              show={s.toast}
              className="gm-toast"
              action={
                <span className="gm-toast__actions">
                  <span className="gm-toast__undo" data-target="undo" data-cursor="hand">
                    Undo
                  </span>
                  <span className="gm-toast__x">
                    <Sym d="close" size={16} />
                  </span>
                </span>
              }
            >
              Conversation archived.
            </Toast>
          </>
        )
      }}
    </Stage>
  )
}
