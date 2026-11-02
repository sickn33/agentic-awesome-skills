import { useState, type ReactNode } from 'react'
import { Collapse, Fly, Roll, Stage, type Act, type Rect } from '../kit'
import { MacPointer } from '../kit/cursors'
import './contrasts.css'
import { RelationshipComparison, relationshipLessons } from './relationships'
import { ContinuityComparison, continuityLessons } from './continuity'
import { TextComparison, textLessons } from './text-settle'
import { CompositionComparison, compositionLessons } from './composition'
import { EdgeComparison, edgeLessons } from './edges'
import { SceneComparison, sceneLessons } from './scenes'
import { StyleComparison, styleLessons } from './style'
import { DetailComparison, detailLessons } from './details'
import { ChoreographyComparison, choreographyLessons } from '../examples/choreography'

type State = { done: boolean; pressed: boolean; phase: 'start' | 'change' | 'followup'; count: 0 | 1 | 2 | 3 }
type Kind = 'label' | 'press' | 'space' | 'identity' | 'exit' | 'interrupt' | 'handoff' | 'reset'
const initial: State = { done: false, pressed: false, phase: 'start', count: 0 }
const poster: State = { ...initial, done: true, phase: 'followup' }

// One Stage owns both halves: the input, result and hold happen on the same
// frame. These stationary pointers show the same comparison input twice;
// an ordinary product demo uses Stage's cursor and a.click instead.
async function script(a: Act<State>) {
  await a.wait(1100)
  for (const done of [true, false]) {
    await a.set({ pressed: true })
    await a.wait(180)
    await a.set({ pressed: false, done })
    await a.wait(1800)
  }
}

async function exitScript(a: Act<State>) {
  await a.wait(1100)
  await a.set({ pressed: true })
  await a.wait(180)
  await a.set({ pressed: false, phase: 'change' })
  await a.wait(400)
  await a.set({ phase: 'followup' })
}

async function interruptScript(a: Act<State>) {
  await a.wait(1100)
  await a.set({ phase: 'change' }) // Month
  await a.wait(200) // A second choice before the 600ms move finishes
  await a.set({ phase: 'followup' }) // Week
}

async function handoffScript(a: Act<State>) {
  await a.wait(1100)
  await a.set({ phase: 'change' })
  await a.wait(650) // The 600ms flyer rests before the destination takes over
  await a.set({ phase: 'followup' })
}

async function resetScript(a: Act<State>) {
  await a.wait(900)
  for (const count of [1, 2, 3] as const) {
    await a.set({ count })
    await a.wait(500)
  }
  await a.wait(1000)
  await a.set({ pressed: true })
  await a.wait(180)
  await a.set({ pressed: false, phase: 'change' })
  await a.wait(250)
  await a.set({ count: 0, phase: 'followup' })
}

const scripts: Partial<Record<Kind, (a: Act<State>) => Promise<void>>> = {
  exit: exitScript, interrupt: interruptScript, handoff: handoffScript, reset: resetScript,
}

const cases: { kind: Kind; title: string; note: string; bad: string; good: string }[] = [
  { kind: 'label', title: 'Labels that cut', note: 'Watch the button’s words change in both directions. The endpoints match; the handoff is different.', bad: 'Changes instantly', good: 'Old label exits, new label enters' },
  { kind: 'press', title: 'A press with no response', note: 'Watch the button while the pointer presses, before “Saved” appears. Both receive the same input.', bad: 'No response to the press', good: 'Responds before the result' },
  { kind: 'space', title: 'A new row that jolts its neighbors', note: 'Follow the delivery line below the note as it opens and closes. Both make exactly the same room.', bad: 'New row makes the next line jump', good: 'New row carries the next line with it' },
  { kind: 'identity', title: 'An icon that loses its identity', note: 'Watch the plus become a close icon and return. The strokes and endpoints are identical in both panels.', bad: 'Icon is replaced', good: 'Same strokes rotate into the next shape' },
  { kind: 'exit', title: 'A message that skips its exit', note: 'Watch “Link copied” when the close control is pressed. Both dismiss it; only one lets the exit finish.', bad: 'Removed on the first frame', good: 'Fades out before it is removed' },
  { kind: 'interrupt', title: 'A second choice restarts the motion', note: 'Month is selected, then Week before the highlight arrives. Follow where the highlight starts its second move.', bad: 'Restarts from Day', good: 'Continues from its current position' },
  { kind: 'handoff', title: 'An object jumps when it lands', note: 'Watch the avatar at the end of its flight. Measuring its padded slot puts the landing four pixels away from the avatar.', bad: 'Lands on the slot, then jumps inward', good: 'Lands on the measured avatar' },
  { kind: 'reset', title: 'A loop erases the work', note: 'Three files accumulate, then clear at the same moment. Look for the action that explains why they disappear.', bad: 'Files clear without an action', good: 'A Clear press explains the reset' },
]

const handoffTarget = (good: boolean, part: 'source' | 'destination' | 'slot') => `handoff-${good ? 'good' : 'bad'}-${part}`
const FILES = ['Draft.pdf', 'Notes.txt', 'Plan.md']

function ExitScene({ good, state }: { good: boolean; state: State }) {
  const mounted = state.phase !== 'followup' && (good || state.phase !== 'change')
  return <div className="tc-exit">
    {mounted && <div className="tc-toast" data-leaving={state.phase === 'change' || undefined}>
      <span>Link copied</span>
      <span className="tc-dismiss" data-pressed={state.pressed || undefined}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="m3 3 6 6M9 3 3 9" /></svg></span>
    </div>}
    <span className="tc-pointer" data-pressed={state.pressed || undefined} data-hidden={state.phase === 'followup' || undefined} aria-hidden><MacPointer /></span>
  </div>
}

function InterruptScene({ good, state }: { good: boolean; state: State }) {
  const selected = state.phase === 'start' ? 0 : state.phase === 'change' ? 2 : 1
  return <div className="tc-tabs">
    {/* Re-keying an entrance animation is the deliberate failure. The
        corrected highlight stays mounted and CSS retargets its live position. */}
    <span key={good ? 'persistent' : state.phase} className="tc-tabs__highlight" data-restart={!good || undefined} style={{ transform: `translateX(${selected * 100}%)` }} />
    {['Day', 'Week', 'Month'].map((label, i) => <span className="tc-tabs__label" key={label} data-selected={i === selected || undefined}>{label}</span>)}
  </div>
}

function HandoffScene({ good, state }: { good: boolean; state: State }) {
  return <div className="tc-handoff">
    <span className="tc-avatar" data-target={handoffTarget(good, 'source')} data-hidden={state.phase !== 'start' || undefined}>AT</span>
    <div className="tc-assignee"><span className="tc-avatar-slot" data-target={handoffTarget(good, 'slot')}><span className="tc-avatar" data-target={handoffTarget(good, 'destination')} data-hidden={state.phase !== 'followup' || undefined}>AT</span></span><span>Assignee</span></div>
  </div>
}

function HandoffFlights({ state, rect }: { state: State; rect: (target: string) => Rect }) {
  if (state.phase === 'followup') return null
  return <>{[false, true].map(good => {
    const destination = rect(handoffTarget(good, 'destination'))
    const slot = rect(handoffTarget(good, 'slot'))
    // Deliberately mix the wrapper's origin with the avatar's size on the
    // flawed side. The corrected side uses the actual destination throughout.
    const to = good ? destination : { ...destination, x: slot.x, y: slot.y }
    return <Fly key={String(good)} from={rect(handoffTarget(good, 'source'))} to={to} go={state.phase === 'change'} duration={600}><span className="tc-avatar">AT</span></Fly>
  })}</>
}

function ResetScene({ good, state }: { good: boolean; state: State }) {
  return <div className="tc-reset" data-good={good || undefined}>
    <div className="tc-reset__head"><span><Roll>{`${state.count} ${state.count === 1 ? 'file' : 'files'}`}</Roll></span><Action state={state} good={good} kind="reset">Clear</Action></div>
    <div className="tc-files" data-clearing={state.phase === 'change' || undefined}>
      {state.count === 0 ? <span className="tc-files__empty">No files yet</span> : FILES.slice(0, state.count).map(file => <span className="tc-file" key={file}><svg width="14" height="16" viewBox="0 0 14 16" aria-hidden><path d="M3 1.5h5l3 3v10H3zM8 1.5v3h3" /></svg>{file}</span>)}
    </div>
  </div>
}

function Action({ state, good, kind, children, icon = false }: { state: State; good: boolean; kind: Kind; children: ReactNode; icon?: boolean }) {
  return <div className={`tc-action${icon ? ' tc-action--icon' : ''}`}>
    <div className="tc-button" data-pressed={state.pressed && (good || (kind !== 'press' && kind !== 'reset')) || undefined}>{children}</div>
    <span className="tc-pointer" data-pressed={state.pressed || undefined} aria-hidden><MacPointer /></span>
  </div>
}

function Scene({ kind, good, state }: { kind: Kind; good: boolean; state: State }) {
  if (kind === 'exit') return <ExitScene good={good} state={state} />
  if (kind === 'interrupt') return <InterruptScene good={good} state={state} />
  if (kind === 'handoff') return <HandoffScene good={good} state={state} />
  if (kind === 'reset') return <ResetScene good={good} state={state} />
  const action = (children: ReactNode, icon = false) => <Action state={state} good={good} kind={kind} icon={icon}>{children}</Action>
  if (kind === 'label') return <div className="tc-card tc-label-card">
    {action(<span className="tc-label">{good ? <Roll variant="fade">{state.done ? 'Back to editor' : 'Open preview'}</Roll> : (state.done ? 'Back to editor' : 'Open preview')}</span>)}
  </div>
  if (kind === 'press') return <div className="tc-card tc-press-card">
    {action(<span className="tc-label"><Roll variant="fade">{state.done ? 'Saved' : 'Save changes'}</Roll></span>)}
  </div>
  if (kind === 'space') return <div className="tc-card tc-space-card" data-good={good || undefined}>
    <div className="tc-delivery-heading"><h3>Delivery</h3>{action(<Roll variant="fade">{state.done ? 'Hide note' : 'Add note'}</Roll>)}</div>
    <Collapse className="tc-note" open={state.done} reveal="drop"><p>Leave at reception.</p></Collapse>
    <div className="tc-delivery-line"><span>Standard shipping</span><span>Free</span></div>
  </div>
  return <div className="tc-card tc-identity-card" data-good={good || undefined} data-open={state.done || undefined}>
    {action(<svg key={good ? 'persistent' : String(state.done)} className="tc-glyph" width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M5 12H19M12 5V19" /></svg>, true)}
  </div>
}

function Comparison({ lesson }: { lesson: typeof cases[number] }) {
  const [revision, replay] = useState(0)
  const { kind, title, note, bad, good } = lesson
  const height = kind === 'space' ? 244 : kind === 'reset' ? 232 : 150
  const sequence = scripts[kind]
  return <section>
    <header><div><h2>{title}</h2><p>{note}</p></div><button className="tc-replay" type="button" onClick={() => replay(n => n + 1)} aria-label={`Replay ${title.toLowerCase()}`}>Replay pair</button></header>
    <Stage<State> key={revision} width={704} height={height} compact={{ below: 704, width: 340, height: height * 2 + 16 }} initial={initial} poster={kind === 'exit' ? initial : poster} script={sequence ?? script} play={sequence ? 'once' : 'loop'} className="tc-stage">
      {(state, rect) => <><div className="tc-pair" data-kind={kind}>{[false, true].map(corrected => <figure key={String(corrected)}>
        <div className="tc-visual"><Scene kind={kind} good={corrected} state={state} /></div>
        <figcaption>{corrected ? good : bad}</figcaption>
      </figure>)}</div>{kind === 'handoff' && <HandoffFlights state={state} rect={rect} />}</>}
    </Stage>
  </section>
}

export default function Contrasts() {
  const motionLessons = [...cases.map(lesson => ({ id: lesson.kind, title: lesson.title })), ...relationshipLessons, ...continuityLessons, ...textLessons, ...edgeLessons, ...choreographyLessons]
  const lessons = [...motionLessons, ...compositionLessons, ...sceneLessons, ...styleLessons, ...detailLessons]
  const [selected, select] = useState(() => {
    const value = typeof window === 'undefined' ? null : new URLSearchParams(location.search).get('lesson')
    return lessons.some(lesson => lesson.id === value) ? value! : 'label'
  })
  const choose = (value: string) => {
    select(value)
    const url = new URL(location.href)
    url.searchParams.set('lesson', value)
    history.replaceState(null, '', url)
    if (parent !== window) parent.postMessage({ type: 'stageshow:status', lesson: value }, location.origin)
  }
  const original = cases.find(lesson => lesson.kind === selected)
  return <div className="tc-lessons">
    <div className="tc-picker"><label htmlFor="comparison-principle">Principle</label><select id="comparison-principle" value={selected} onChange={event => choose(event.target.value)}><optgroup label="Motion">{motionLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</optgroup><optgroup label="UI details">{compositionLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</optgroup><optgroup label="Whole compositions">{sceneLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</optgroup><optgroup label="Style">{styleLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</optgroup><optgroup label="Details">{detailLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</optgroup></select></div>
    {original ? <Comparison key={selected} lesson={original} /> : choreographyLessons.some(lesson => lesson.id === selected) ? <ChoreographyComparison /> : relationshipLessons.some(lesson => lesson.id === selected) ? <RelationshipComparison key={selected} lessonId={selected} /> : selected === 'text-settle' ? <TextComparison /> : compositionLessons.some(lesson => lesson.id === selected) ? <CompositionComparison key={selected} lessonId={selected} /> : sceneLessons.some(lesson => lesson.id === selected) ? <SceneComparison key={selected} lessonId={selected} /> : styleLessons.some(lesson => lesson.id === selected) ? <StyleComparison key={selected} lessonId={selected} /> : detailLessons.some(lesson => lesson.id === selected) ? <DetailComparison key={selected} lessonId={selected} /> : edgeLessons.some(lesson => lesson.id === selected) ? <EdgeComparison key={selected} lessonId={selected} /> : <ContinuityComparison key={selected} lessonId={selected} />}
  </div>
}
