import { Box, ChevronDown, CircleDashed, Folder, Inbox, IterationCcw, Layers, ListFilter, Search, SignalHigh, SlidersHorizontal, SquarePen, Tag, UserRound, UserRoundCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, Bar, Camera, Collapse, Field, Popover, Stage, Text, Window, type Act, type Layout, type Rect } from '../../kit'
import './linear.css'

// Linear, light, in its desktop window (860 wide), as it looks after the
// 2026 refresh: grayscale chrome, a dimmed sidebar, compact rounded tabs.
// Color stays only on Linear's own content marks (status circles, label
// dots, avatars) and the accent on the one avatar the story lands. The issue list is the
// context; Cmd+K opens the command menu over it, "assign" filters it, the
// user picks "Assign to me", and ENG-142's row takes their avatar while its
// status turns from Todo to In Progress. Cmd+Z undoes it, so the loop closes
// with a caused reset.
//
// Real strings: the team, the view, ENG-142 and its title, the command menu
// (its rows are what the typing filters, so they must be words), and what is
// typed. Every other row is placeholder lines around Linear's own signature
// marks: priority bars, status circles, avatars.
//
// Icons: Linear ships no public icon pack, so the nav and command glyphs are
// lucide-react (installed here), chosen for its thin, even line, which is
// close to Linear's own. The status circles and priority bars are Linear's
// own geometry, drawn from circles and rects, because they are its content.

type S = {
  focus: boolean
  open: boolean
  query: string
  hoverMe: boolean
  assigned: boolean
  zoom: Rect | null
}

const initial: S = { focus: false, open: false, query: '', hoverMe: false, assigned: false, zoom: null }

type Status = 'backlog' | 'todo' | 'progress' | 'done'
type Row = { status: Status; pri: 0 | 1 | 2 | 3 | 4; id: number; title: number; label?: number; who?: string; date: number }

const ROWS: Row[] = [
  { status: 'progress', pri: 4, id: 44, title: 210, label: 34, who: 'Mara', date: 30 },
  { status: 'progress', pri: 2, id: 40, title: 168, who: 'Theo', date: 26 },
  { status: 'todo', pri: 3, id: 0, title: 0, label: 30, date: 30 }, // ENG-142
  { status: 'todo', pri: 2, id: 42, title: 236, who: 'Ines', date: 28 },
  { status: 'todo', pri: 1, id: 38, title: 150, label: 40, date: 30 },
  { status: 'backlog', pri: 0, id: 44, title: 192, who: 'Mara', date: 24 },
  { status: 'backlog', pri: 2, id: 40, title: 128, date: 30 },
  { status: 'backlog', pri: 3, id: 42, title: 178, who: 'Theo', date: 28 },
  { status: 'done', pri: 1, id: 38, title: 204, date: 26 },
  { status: 'done', pri: 2, id: 44, title: 140, who: 'Ines', date: 30 },
  { status: 'done', pri: 0, id: 40, title: 186, who: 'Mara', date: 28 },
  { status: 'done', pri: 3, id: 42, title: 122, date: 24 },
]

const COMMANDS: { label: string; key: string; icon: ReactNode; target?: string }[] = [
  { label: 'Change status…', key: 'S', icon: <CircleDashed size={15} strokeWidth={1.6} /> },
  { label: 'Assign to…', key: 'A', icon: <UserRound size={15} strokeWidth={1.6} /> },
  { label: 'Assign to me', key: 'I', icon: <UserRoundCheck size={15} strokeWidth={1.6} />, target: 'me' },
  { label: 'Change priority…', key: 'P', icon: <SignalHigh size={15} strokeWidth={1.6} /> },
  { label: 'Add labels…', key: 'L', icon: <Tag size={15} strokeWidth={1.6} /> },
]

const REST = { at: 'rest', x: 0.64, y: 0.5 }

async function script(a: Act<S>) {
  const compact = a.layout === 'compact'
  await a.wait(900)

  // 1. Context: the pointer comes to rest on ENG-142, which takes focus
  a.mark('focus')
  await a.move({ at: 'row', x: compact ? 0.86 : 0.7, y: 0.6 })
  await a.set({ focus: true })
  await a.wait(700)

  // 2. Cmd+K opens the command menu on that issue
  a.mark('open')
  await a.key('cmd+k')
  await a.set({ open: true })
  await a.wait(800)

  // 3. Type "assign": the menu narrows to the two assign commands
  a.mark('type')
  await a.type('query', 'assign', { interval: 95 })
  await a.wait(700)

  // 4. Pick yourself
  a.mark('pick')
  await a.move({ at: 'me', x: 0.62, y: 0.55 })
  await a.set({ hoverMe: true })
  await a.wait(350)
  await a.click()
  await a.wait(120)
  await a.set({ open: false })
  // Step the pointer off the row so it doesn't sit over the change
  await a.move({ at: 'rest', x: compact ? 0.5 : 0.42, y: 0.5 })

  // 5. The camera comes in on the row (the change is two 16px marks in a
  // 920px scene), then the row updates: avatar in, Todo -> In Progress
  a.mark('result')
  if (!compact) {
    const who = a.rect('who142', { layout: true })
    const row = a.rect('row', { layout: true })
    await a.set({ zoom: { x: row.x, y: row.y, width: who.x + who.width + 12 - row.x, height: row.height } })
    await a.wait(900)
  }
  await a.set({ assigned: true })
  await a.wait(2200)
  if (!compact) {
    await a.set({ zoom: null })
    await a.wait(1100)
  }

  // Undo, the way Linear does it, then let go of the row
  a.mark('undo')
  await a.key('cmd+z')
  await a.set({ assigned: false })
  await a.wait(900)
  await a.snap({ query: '', hoverMe: false })
  await a.move(REST)
  await a.set({ focus: false })
  await a.wait(900)
}

function Priority({ level }: { level: Row['pri'] }) {
  if (level === 0) {
    return (
      <svg className="ln-pri" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        {[2, 6, 10].map((x) => <rect key={x} x={x - 0.75} y="6.25" width="2.5" height="1.5" rx="0.5" />)}
      </svg>
    )
  }
  if (level === 4) {
    return (
      <svg className="ln-pri" data-urgent width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <rect x="1" y="1" width="12" height="12" rx="3" />
        <rect className="ln-pri__mark" x="6.25" y="3.5" width="1.5" height="4.5" rx="0.75" />
        <rect className="ln-pri__mark" x="6.25" y="9.25" width="1.5" height="1.5" rx="0.75" />
      </svg>
    )
  }
  return (
    <svg className="ln-pri" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1.5 + i * 4} y={8 - i * 3} width="3" height={4 + i * 3} rx="1" data-on={i < level || undefined} />
      ))}
    </svg>
  )
}

// Linear's status circles. Todo and In Progress are one object: the ring
// recolors and the pie inside sweeps to half.
function StatusIcon({ status }: { status: Status }) {
  if (status === 'backlog') {
    return (
      <svg className="ln-status" data-status="backlog" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <circle cx="7" cy="7" r="5.5" fill="none" strokeWidth="1.5" strokeDasharray="2.1 1.5" />
      </svg>
    )
  }
  if (status === 'done') {
    return (
      <svg className="ln-status" data-status="done" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <circle cx="7" cy="7" r="6.25" />
        <path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="ln-status" data-status={status} width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle className="ln-status__ring" cx="7" cy="7" r="5.5" fill="none" strokeWidth="1.5" />
      <circle className="ln-status__pie" cx="7" cy="7" r="1.75" fill="none" strokeWidth="3.5" pathLength={100} transform="rotate(-90 7 7)" />
    </svg>
  )
}

function Unassigned() {
  return (
    <svg className="ln-unassigned" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="8" fill="none" strokeWidth="1.2" strokeDasharray="2 1.6" />
      <circle cx="9" cy="7.2" r="2.1" />
      <path d="M5.4 13.1a3.9 3.9 0 0 1 7.2 0z" />
    </svg>
  )
}

function IssueRow({ r, i, s, compact }: { r: Row; i: number; s: S; compact: boolean }) {
  const target = i === 2
  const status: Status = target && s.assigned ? 'progress' : r.status
  const icon = <StatusIcon status={status} />
  return (
    <div className="ln-row" data-target={target ? 'row' : i === 6 ? 'rest' : undefined} data-focus={(target && s.focus) || undefined}>
      <Priority level={r.pri} />
      <span className="ln-id">{target ? <Text tone={2}>ENG-142</Text> : <Bar w={r.id} h={5} tone={2} />}</span>
      {target ? <span className="ln-st" data-target="st142">{icon}</span> : icon}
      <span className="ln-title">{target ? <Text className="ln-title__text">Fix login redirect loop</Text> : <Bar w={compact ? Math.min(r.title, 150) : r.title} h={6} tone={3} />}</span>
      {!compact && (
        <span className="ln-labels">
          {r.label && (
            <span className="ln-chip">
              <span className="ln-chip__dot" data-tone={i % 3} />
              <Bar w={r.label} h={5} tone={3} />
            </span>
          )}
        </span>
      )}
      <span className="ln-who">
        {target ? (
          <span className="ln-who__swap" data-target="who142" data-assigned={s.assigned || undefined}>
            <Unassigned />
            <Avatar name="Maya" size={18} tone="accent" className="ln-who__me" style={{ fontSize: 9.5 }} />
          </span>
        ) : r.who ? (
          <Avatar name={r.who} size={18} className="ln-avatar" data-face={i % 3} style={{ fontSize: 9.5 }} />
        ) : (
          <Unassigned />
        )}
      </span>
      {!compact && (
        <span className="ln-date">
          <Bar w={r.date} h={5} tone={2} />
        </span>
      )}
    </div>
  )
}

function Sidebar() {
  const nav = (icon: ReactNode, w: number, active?: boolean) => (
    <div className="ln-nav" data-active={active || undefined}>
      {icon}
      <Bar w={w} h={5} tone={active ? 4 : 3} />
    </div>
  )
  return (
    <div className="ln-side">
      <div className="ln-workspace">
        <span className="ln-workspace__tile">A</span>
        <Bar w={46} h={6} tone={4} />
        <ChevronDown size={12} strokeWidth={1.8} className="ln-icon" />
        <span className="ss-window__spacer" />
        <Search size={14} strokeWidth={1.7} className="ln-icon" />
        <span className="ln-compose">
          <SquarePen size={13} strokeWidth={1.7} className="ln-icon" />
        </span>
      </div>
      <div className="ln-group">
        {nav(<Inbox size={14} strokeWidth={1.7} className="ln-icon" />, 34)}
        {nav(<UserRound size={14} strokeWidth={1.7} className="ln-icon" />, 52)}
      </div>
      <div className="ln-group">
        <div className="ln-section"><Bar w={58} h={5} tone={2} /></div>
        <div className="ln-nav ln-team">
          <span className="ln-team__tile">E</span>
          <Text className="ln-team__name">Engineering</Text>
          <ChevronDown size={11} strokeWidth={1.8} className="ln-icon" />
        </div>
        <div className="ln-sub">
          <div className="ln-nav" data-active>
            <Layers size={14} strokeWidth={1.7} className="ln-icon ln-icon--on" />
            <Text className="ln-nav__label">Issues</Text>
          </div>
          {nav(<IterationCcw size={14} strokeWidth={1.7} className="ln-icon" />, 38)}
          {nav(<Box size={14} strokeWidth={1.7} className="ln-icon" />, 46)}
        </div>
      </div>
      <div className="ln-group">
        <div className="ln-section"><Bar w={44} h={5} tone={2} /></div>
        {nav(<Folder size={14} strokeWidth={1.7} className="ln-icon" />, 56)}
        {nav(<Folder size={14} strokeWidth={1.7} className="ln-icon" />, 42)}
      </div>
    </div>
  )
}

function Scene({ s, layout }: { s: S; layout: Layout }) {
  const compact = layout === 'compact'
  const q = s.query.toLowerCase()
  const lead = (
    <div className="ln-crumbs">
      {compact && <span className="ln-team__tile">E</span>}
      <Text className="ln-crumbs__team">{compact ? 'Issues' : 'Engineering'}</Text>
      {!compact && (
        <div className="ln-tabs">
          <span className="ln-tab" data-active>
            <Text>All issues</Text>
          </span>
          <span className="ln-tab"><Bar w={34} h={5} tone={3} /></span>
          <span className="ln-tab"><Bar w={42} h={5} tone={3} /></span>
        </div>
      )}
    </div>
  )
  const toolbar = (
    <div className="ln-tools">
      <span className="ln-tool"><ListFilter size={14} strokeWidth={1.7} className="ln-icon" /></span>
      <span className="ln-tool ln-tool--display">
        <SlidersHorizontal size={13} strokeWidth={1.7} className="ln-icon" />
        {!compact && <Bar w={36} h={5} tone={3} />}
      </span>
    </div>
  )
  const list = (
    <div className="ln-list">
      {ROWS.map((r, i) => (
        <IssueRow key={i} r={r} i={i} s={s} compact={compact} />
      ))}
    </div>
  )
  const props = { lead, toolbar, className: 'ln-window', body: { className: 'ln-body', 'data-crop': true } }
  return (
    <Camera focus={s.zoom} max={1.6} pad={20} feather={44}>
      {compact ? (
        <Window {...props}>{list}</Window>
      ) : (
        <Window {...props} sidebar={<Sidebar />} sidebarWidth={212}>
          {list}
        </Window>
      )}

      <div className="ln-scrim" data-show={s.open || undefined} />
      <Popover show={s.open} origin="top center" className="ln-cmd">
        <div className="ln-cmd__context">
          <span className="ln-cmd__chip">
            <Text>ENG-142</Text>
            <Text className="ln-cmd__chip-title">Fix login redirect loop</Text>
          </span>
        </div>
        <Field value={s.query} placeholder="Type a command or search…" focused={s.open} className="ln-cmd__field" box={{ 'data-cursor': 'pointer' }} />
        <div className="ln-cmd__list">
          {/* Compact keeps the first three, so the menu clears the keycaps */}
          {(compact ? COMMANDS.slice(0, 3) : COMMANDS).map((c, i) => {
            const match = !q || c.label.toLowerCase().includes(q)
            const firstMatch = COMMANDS.findIndex((x) => !q || x.label.toLowerCase().includes(q))
            const active = s.hoverMe ? c.target === 'me' : i === firstMatch
            return (
              <Collapse key={c.label} open={match}>
                <div className="ln-cmd__item" data-target={c.target} data-active={active || undefined}>
                  <span className="ln-cmd__icon">{c.icon}</span>
                  <Text className="ln-cmd__label">{c.label}</Text>
                  <span className="ln-cmd__key">{c.key}</span>
                </div>
              </Collapse>
            )
          })}
        </div>
      </Popover>
    </Camera>
  )
}

export default function LinearDemo() {
  return (
    <Stage
      width={920}
      height={470}
      compact={{ below: 600, width: 420, height: 340 }}
      accent="#5e6ad2"
      initial={initial}
      poster={{ ...initial, focus: true, assigned: true }}
      script={script}
      cursor={{ at: REST }}
      className="ln-stage"
    >
      {(s, _rect, layout) => <Scene s={s} layout={layout} />}
    </Stage>
  )
}
