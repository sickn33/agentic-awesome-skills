import { Avatar, Row, Stage } from '../kit'
import './contrasts.css'
import './composition.css'

export const compositionLessons = [
  { id: 'framing', title: 'Give the product room', note: 'The same exports window and status in a small frame. Protect the header and useful rows; let the window continue beyond a deliberate edge.', bad: 'Tight edges and a status over the content', good: 'Clear gutters and an intentional bottom crop' },
  { id: 'ui-anatomy', title: 'Make the UI read like a product', note: 'The same project, tasks and action. Type hierarchy and shared alignment make the relationships clear without adding decoration.', bad: 'Labels, metadata and actions compete', good: 'A clear heading and consistent reading columns' },
  { id: 'visual-restraint', title: 'Choose where emphasis belongs', note: 'The same plan details and action. When every edge and value is emphasized, the primary action loses its place.', bad: 'Borders, shadows and color on every part', good: 'Quiet details and one clear action' },
  { id: 'compact-reflow', title: 'Reflow a small composition', note: 'The same three tasks in a 300px slot. A smaller host needs a readable arrangement, not a miniature desktop table.', bad: 'The desktop table is scaled to half size', good: 'The same content reflows at readable sizes' },
  { id: 'edge-separation', title: 'Make edges feel deliberate', note: 'The same sync panel and confirmation. Nearly touching edges look accidental; a clear gap makes two surfaces easy to distinguish.', bad: 'The confirmation almost touches the panel', good: 'A deliberate gap separates the two surfaces' },
  { id: 'nested-spacing', title: 'Carry padding around every edge', note: 'The same preferences and action. Check the bottom and the corners as carefully as the space above the first label.', bad: 'The inner surface and action crowd the bottom', good: 'Each layer has a consistent inset' },
  { id: 'control-alignment', title: 'Fit the contents of a control', note: 'The same search field and actions. Shared content alignment balances labels and icons within their actual controls.', bad: 'Icons sit low and labels crowd the upper edge', good: 'Icons and labels share a balanced content row' },
  { id: 'content-density', title: 'Give whitespace a job', note: 'The same three appointments. Keep each time with its subject and separate the appointments, rather than spreading every line equally.', bad: 'Uniform gaps weaken the appointment groups', good: 'Tighter groups make the schedule easier to scan' },
  { id: 'surface-contrast', title: 'Keep the foreground readable', note: 'The same sharing controls on a tinted ground. A quiet surface still needs enough contrast for its text and available actions.', bad: 'Foreground, surface and ground blend together', good: 'Readable text and a distinct foreground surface' },
  { id: 'icon-consistency', title: 'Give icons a shared construction', note: 'The same three destinations. Similar boxes do not guarantee similar visual weight; compare the shapes, stroke and visible size.', bad: 'Mixed fill, stroke weight and visible size', good: 'One construction with balanced optical weight' },
  { id: 'decorative-noise', title: 'Let the information lead', note: 'The same activity report and chart. Gradients and glow can compete with a useful result even when the layout is orderly.', bad: 'Decorative effects compete with the report', good: 'The value and chart carry the emphasis' },
  { id: 'product-anatomy', title: 'Choose chrome that serves the task', note: 'The same document, permission and sharing action. Familiar browser shapes are misleading when the task is a small sharing panel.', bad: 'Browser chrome disguises a sharing task', good: 'Document, permission and action have clear roles' },
  { id: 'unread-gutter', title: 'Never push only the unread rows in', note: 'The same inbox with two unread messages. An unread dot must not move its row: pushing only unread rows in makes the column zigzag, and every read changes the layout. Hang the dot in the margin, as here, reserve a dot column on every row as Mail and Messages do, or put it by the time as Gmail does; follow the product.', bad: 'Unread rows push their avatar in; the column zigzags', good: 'Every avatar on one edge; the dot hangs in the margin' },
] as const

type LessonId = typeof compositionLessons[number]['id']
const EXPORTS = [['Campaign assets', '24 files'], ['Brand library', '18 files'], ['Product launch', '32 files'], ['Homepage', '8 files']]
const TASKS = [
  { name: 'Design review', owner: 'Maya', due: 'Today', status: 'Ready' },
  { name: 'Onboarding', owner: 'Jon', due: 'Tomorrow', status: 'In review' },
  { name: 'Billing audit', owner: 'Ana', due: 'Friday', status: 'Ready' },
]

function FileIcon() {
  return <svg className="cp-file" width="16" height="18" viewBox="0 0 16 18" aria-hidden><path d="M3 1.5h6l4 4v11H3zM9 1.5v4h4M5.5 9h5M5.5 12h5" /></svg>
}

function ExportWindow() {
  return <div className="cp-export-window">
    <div className="cp-window-bar"><span className="cp-window-dots" aria-hidden><i /><i /><i /></span><span>Exports</span></div>
    <div className="cp-export-heading"><strong>Recent exports</strong><span>This week</span></div>
    {EXPORTS.map(([name, count]) => <div className="cp-export-row" key={name}><FileIcon /><span>{name}<small>{count}</small></span><span className="cp-ready">Ready</span></div>)}
  </div>
}

function Framing({ good }: { good: boolean }) {
  return <div className="cp-frame" data-good={good || undefined}>
    <ExportWindow />
    <div className="cp-export-status"><span className="cp-status-dot" />Export complete<small>24 files saved</small></div>
  </div>
}

function Anatomy({ good }: { good: boolean }) {
  return <div className="cp-anatomy" data-good={good || undefined}>
    <div className="cp-project-head"><span className="cp-project-icon"><FileIcon /></span><div><h3>Release checklist</h3><p>Due Friday · 4 tasks</p></div></div>
    <div className="cp-project-rows"><div><span>Review copy</span><small>Ready</small></div><div><span>Test mobile</span><small>In review</small></div></div>
    <div className="cp-project-foot"><span>2 tasks remaining</span><span className="cp-action">Open project</span></div>
  </div>
}

function Restraint({ good }: { good: boolean }) {
  return <div className="cp-plan" data-good={good || undefined}>
    <div className="cp-plan-head"><h3>Starter plan</h3><span className="cp-plan-badge">Active</span></div>
    <div className="cp-plan-price"><strong>$24</strong><span>/ month</span></div>
    <div className="cp-plan-seats"><span>Team seats</span><span>3 of 5 seats</span></div>
    <span className="cp-action">Manage plan</span>
  </div>
}

function Compact({ good }: { good: boolean }) {
  return <div className="cp-tasks" data-good={good || undefined}>
    <div className="cp-task-design">
      <div className="cp-task-head"><h3>Project tasks</h3><span>3 open</span></div>
      <div className="cp-task-columns"><span>Task</span><span>Owner</span><span>Due</span><span>Status</span></div>
      {TASKS.map(task => <div className="cp-task-row" key={task.name}><span className="cp-task-name">{task.name}</span><span className="cp-task-owner">{task.owner}</span><span className="cp-task-due">{task.due}</span><span className="cp-task-status">{task.status}</span></div>)}
    </div>
  </div>
}

type SymbolName = 'check' | 'search' | 'download' | 'arrow' | 'folder' | 'inbox' | 'archive' | 'link' | 'chevron'
function Symbol({ name, className = '' }: { name: SymbolName; className?: string }) {
  const paths: Record<SymbolName, string> = {
    check: 'm4.5 10 3.5 3.5 7.5-7.5',
    search: 'M14 8.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-1.5 4 4 4',
    download: 'M10 3v9m-3-3 3 3 3-3M4 13v4h12v-4',
    arrow: 'M4 10h12m-5-5 5 5-5 5',
    folder: 'M2.5 5.5h6l2 2h7v9h-15z',
    inbox: 'M3 4h14v12H3V4Zm0 7h4l1.5 2h3l1.5-2h4',
    archive: 'M3 3.5h14v4H3zM4.5 7.5v9h11v-9M8 11h4',
    link: 'm8 12 4-4M7 13H5a3 3 0 0 1 0-6h3m4 0h3a3 3 0 0 1 0 6h-2',
    chevron: 'm6 8 4 4 4-4',
  }
  return <svg className={`cp-symbol ${className}`} width="18" height="18" viewBox="0 0 20 20" aria-hidden><path d={paths[name]} /></svg>
}

function EdgeSeparation({ good }: { good: boolean }) {
  return <div className="cp-edges" data-good={good || undefined}>
    <div className="cp-sync-panel"><h3>Workspace sync</h3><div><span>Design library</span><small>Up to date</small></div><div><span>Brand assets</span><small>2 min ago</small></div></div>
    <div className="cp-sync-status"><Symbol name="check" /><span>All files synced</span></div>
  </div>
}

function NestedSpacing({ good }: { good: boolean }) {
  return <div className="cp-nesting" data-good={good || undefined}><div className="cp-preferences">
    <h3>Weekly summary</h3><div className="cp-preference-row"><span>Send by email</span><span className="cp-toggle"><i /></span></div>
    <div className="cp-preference-row"><span>Every Monday</span><small>9:00 AM</small></div><span className="cp-action">Save preferences</span>
  </div></div>
}

function ControlAlignment({ good }: { good: boolean }) {
  return <div className="cp-controls-study" data-good={good || undefined}>
    <h3>Project files</h3><div className="cp-search-control"><Symbol name="search" /><span>Search files</span></div>
    <div className="cp-control-actions"><span className="cp-export-control"><Symbol name="download" /><span>Export files</span></span><span className="cp-preview-control"><span>Preview</span><Symbol name="arrow" /></span></div>
  </div>
}

function Density({ good }: { good: boolean }) {
  const appointments = [['9:30 AM', 'Design review', 'Maya and Jon'], ['11:00 AM', 'Customer call', 'Ana · 30 minutes'], ['2:00 PM', 'Planning', 'Product team']]
  return <div className="cp-density" data-good={good || undefined}><div className="cp-density-head"><h3>Today</h3><span>Wednesday, 14 May</span></div>
    {appointments.map(([time, title, people]) => <div className="cp-appointment" key={time}><time>{time}</time><div><strong>{title}</strong><small>{people}</small></div></div>)}
  </div>
}

function Contrast({ good }: { good: boolean }) {
  return <div className="cp-contrast-ground" data-good={good || undefined}><div className="cp-contrast-panel">
    <h3>Share document</h3><p>Launch brief</p><div className="cp-access-row"><span>Anyone with the link</span><span>Can view</span></div><span className="cp-action"><Symbol name="link" />Copy link</span>
  </div></div>
}

function IconConsistency({ good }: { good: boolean }) {
  const items: { icon: SymbolName; title: string; count: string }[] = [{ icon: 'inbox', title: 'Inbox', count: '4' }, { icon: 'folder', title: 'Project files', count: '24' }, { icon: 'archive', title: 'Archive', count: '12' }]
  return <div className="cp-icon-list" data-good={good || undefined}><h3>Workspace</h3>{items.map(item => <div className="cp-icon-row" key={item.icon}><span className={`cp-icon-slot cp-icon-${item.icon}`}><Symbol name={item.icon} /></span><span>{item.title}</span><small>{item.count}</small></div>)}</div>
}

function Decoration({ good }: { good: boolean }) {
  return <div className="cp-decoration" data-good={good || undefined}><h3>Weekly activity</h3><div className="cp-activity-total"><strong>124</strong><span>tasks completed</span></div><p>18 more than last week</p>
    <div className="cp-activity-chart" aria-label="Daily tasks: Monday 20, Tuesday 26, Wednesday 18, Thursday 28, Friday 32">{[20, 26, 18, 28, 32].map((value, i) => <div key={i}><i style={{ height: value * 1.3 }} /><span>{['M', 'T', 'W', 'T', 'F'][i]}</span></div>)}</div><span className="cp-report-link">View report <Symbol name="arrow" /></span>
  </div>
}

function ProductAnatomy({ good }: { good: boolean }) {
  return <div className="cp-product" data-good={good || undefined}>
    <div className="cp-product-top"><span className="cp-window-dots" aria-hidden><i /><i /><i /></span><h3>Share handoff</h3></div>
    <div className="cp-document"><FileIcon /><span>Launch brief</span></div>
    <div className="cp-permission"><span>Anyone with the link</span><span>Can view <Symbol name="chevron" /></span></div>
    <div className="cp-product-footer"><span className="cp-action"><Symbol name="link" />Copy link</span></div>
  </div>
}

const INBOX = [['Maya Chen', 'Launch checklist', true], ['Jon Park', 'Re: pricing page', false], ['Ana Ruiz', 'Q3 board deck', true]] as const

function UnreadGutter({ good }: { good: boolean }) {
  return <div className="cp-inbox" data-shove={!good || undefined}>
    <h3>Inbox</h3>
    {INBOX.map(([name, subject, unread]) => <Row key={name} lead={<Avatar name={name} size={28} />} title={name} subtitle={subject} meta="9:41" unread={unread} />)}
  </div>
}

function Study({ id, good }: { id: LessonId; good: boolean }) {
  if (id === 'unread-gutter') return <UnreadGutter good={good} />
  if (id === 'framing') return <Framing good={good} />
  if (id === 'ui-anatomy') return <Anatomy good={good} />
  if (id === 'visual-restraint') return <Restraint good={good} />
  if (id === 'compact-reflow') return <Compact good={good} />
  if (id === 'edge-separation') return <EdgeSeparation good={good} />
  if (id === 'nested-spacing') return <NestedSpacing good={good} />
  if (id === 'control-alignment') return <ControlAlignment good={good} />
  if (id === 'content-density') return <Density good={good} />
  if (id === 'surface-contrast') return <Contrast good={good} />
  if (id === 'icon-consistency') return <IconConsistency good={good} />
  if (id === 'decorative-noise') return <Decoration good={good} />
  return <ProductAnatomy good={good} />
}

export function CompositionComparison({ lessonId }: { lessonId: string }) {
  const lesson = compositionLessons.find(item => item.id === lessonId)
  if (!lesson) return null
  const height = 302
  return <section className="cp-lesson">
    <header><div><h2>{lesson.title}</h2><p>{lesson.note}</p></div></header>
    <Stage width={704} height={height} compact={{ below: 704, width: 340, height: height * 2 + 16 }} className="tc-stage">
      {() => <div className="tc-pair cp-pair" data-composition={lesson.id}>{[false, true].map(good => <figure key={String(good)}>
        <div className="tc-visual"><Study id={lesson.id} good={good} /></div>
        <figcaption>{good ? lesson.good : lesson.bad}</figcaption>
      </figure>)}</div>}
    </Stage>
  </section>
}
