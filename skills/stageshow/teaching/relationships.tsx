import { useState } from 'react'
import { Collapse, Roll, Stage, type Act } from '../kit'
import { MacPointer } from '../kit/cursors'
import './contrasts.css'
import './relationships.css'

type State = { active: boolean; pressed: boolean }
const initial: State = { active: false, pressed: false }
const poster: State = { active: true, pressed: false }

export const relationshipLessons = [
  { id: 'horizontal-insert', title: 'An insertion moves what follows', note: 'Watch “Design review” as the check appears and disappears. The check needs room, and the existing label should travel with that room.', bad: 'The label jumps sideways', good: 'The label follows the opening space' },
  { id: 'list-reflow', title: 'A new row carries the list', note: 'Follow Maya and Jon when Ana is added and removed. The new row arrives whole while the existing rows make room.', bad: 'Existing rows jump down and back', good: 'The list opens and closes around the row' },
  { id: 'adjacent-action', title: 'A control carries the next action', note: 'Watch Settings while the first button changes width. Its position belongs to the same motion as the button’s edge.', bad: 'Settings jumps to the new edge', good: 'Settings travels with the changing width' },
  { id: 'surface-resize', title: 'A popup resizes with its content', note: 'Watch the popup grow, return, then reverse before it finishes. The outline and content should belong to one continuous change.', bad: 'The outline jumps ahead of the content', good: 'The surface follows the same live motion' },
] as const

type LessonId = typeof relationshipLessons[number]['id']

async function change(a: Act<State>, active: boolean, press = 100) {
  await a.set({ pressed: true })
  await a.wait(press)
  await a.set({ pressed: false, active })
}

async function script(a: Act<State>) {
  await a.wait(1000)
  a.mark('insert')
  await change(a, true)
  await a.wait(1500)
  a.mark('remove')
  await change(a, false)
  await a.wait(1300)
}

async function surfaceScript(a: Act<State>) {
  await script(a)
  a.mark('interrupt-open')
  await change(a, true)
  await a.wait(40)
  a.mark('interrupt-return')
  await change(a, false, 40)
  await a.wait(1200)
}

function Check() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="m3 7 2.5 2.5L11 4" /></svg>
}

function Pointer({ pressed }: { pressed: boolean }) {
  return <span className="tc-pointer" data-pressed={pressed || undefined} aria-hidden><MacPointer /></span>
}

function Trigger({ state, label }: { state: State; label: string }) {
  return <div className="tr-trigger"><div className="tc-button" data-pressed={state.pressed || undefined}><Roll variant="fade">{label}</Roll></div><Pointer pressed={state.pressed} /></div>
}

function Horizontal({ state, good }: { state: State; good: boolean }) {
  return <div className="tr-inline" data-good={good || undefined} data-active={state.active || undefined}>
    <div className="tr-inline__line">
      <span className="tr-inline__slot"><span className="tr-inline__check"><Check /></span></span>
      <span className="tr-inline__label">Design review</span>
    </div>
    <Trigger state={state} label={state.active ? 'Undo' : 'Verify'} />
  </div>
}

function Person({ name, added = false }: { name: string; added?: boolean }) {
  return <div className="tr-person" data-added={added || undefined}><span className="tr-person__avatar">{name[0]}</span><span>{name}</span><span className="tr-person__role">Reviewer</span></div>
}

function List({ state, good }: { state: State; good: boolean }) {
  return <div className="tr-list" data-good={good || undefined}>
    <div className="tr-list__head"><span>Reviewers</span><Trigger state={state} label={state.active ? 'Remove Ana' : 'Add Ana'} /></div>
    <div className="tr-list__rows">
      <Collapse className="tr-list__insert" open={state.active} reveal="drop"><Person name="Ana" added /></Collapse>
      <Person name="Maya" /><Person name="Jon" />
    </div>
  </div>
}

function Actions({ state, good }: { state: State; good: boolean }) {
  return <div className="tr-actions" data-good={good || undefined}>
    <div className="tr-trigger"><div className="tc-button" data-pressed={state.pressed || undefined}><Roll variant="fade" align="start">{state.active ? 'Disconnect account' : 'Connect'}</Roll></div></div>
    <span className="tr-actions__next">Settings</span>
    {/* The input stays where it happened while the result changes size. */}
    <div className="tr-press-anchor" aria-hidden><div className="tc-button tr-press-measure">Connect</div><Pointer pressed={state.pressed} /></div>
  </div>
}

function Surface({ state, good }: { state: State; good: boolean }) {
  return <div className="tr-surface" data-good={good || undefined} data-active={state.active || undefined}>
    <div className="tr-popup">
      <span className="tr-popup__title">Link access</span>
      <span className="tr-popup__detail">Anyone with the link can view.</span>
    </div>
    <Trigger state={state} label={state.active ? 'Less detail' : 'More detail'} />
  </div>
}

function Scene({ id, state, good }: { id: LessonId; state: State; good: boolean }) {
  if (id === 'horizontal-insert') return <Horizontal state={state} good={good} />
  if (id === 'list-reflow') return <List state={state} good={good} />
  if (id === 'adjacent-action') return <Actions state={state} good={good} />
  return <Surface state={state} good={good} />
}

export function RelationshipComparison({ lessonId }: { lessonId: string }) {
  const [revision, replay] = useState(0)
  const lesson = relationshipLessons.find(item => item.id === lessonId)
  if (!lesson) return null
  const height = lesson.id === 'list-reflow' ? 226 : lesson.id === 'surface-resize' ? 198 : 150
  return <section className="tr-lesson">
    <header><div><h2>{lesson.title}</h2><p>{lesson.note}</p></div><button type="button" className="tc-replay" onClick={() => replay(value => value + 1)} aria-label={`Replay ${lesson.title.toLowerCase()}`}>Replay pair</button></header>
    <Stage<State> key={`${lesson.id}-${revision}`} width={704} height={height} compact={{ below: 704, width: 340, height: height * 2 + 16 }} initial={initial} poster={poster} script={lesson.id === 'surface-resize' ? surfaceScript : script} play="once" className="tc-stage">
      {state => <div className="tc-pair tr-pair" data-relationship={lesson.id}>{[false, true].map(good => <figure key={String(good)}>
        <div className="tc-visual"><Scene id={lesson.id} state={state} good={good} /></div>
        <figcaption>{good ? lesson.good : lesson.bad}</figcaption>
      </figure>)}</div>}
    </Stage>
  </section>
}
