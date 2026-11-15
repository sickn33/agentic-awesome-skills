import { useRef, useState } from 'react'
import { Roll, Stage, type Act } from '../kit'
import { MacPointer } from '../kit/cursors'
import { Cursor } from '../kit/cursor'
import './continuity.css'

type State = { pressed: boolean; gripped: boolean; moved: boolean; settled: boolean; phase: 'idle' | 'pending' | 'done' }
const initial: State = { pressed: false, gripped: false, moved: false, settled: false, phase: 'idle' }
export const continuityLessons = [
  { id: 'drag-offset', title: 'Grabbing an object moves it', note: 'The pointer grabs the right side of the file. Follow that exact point through the drag and release.', bad: 'Snaps its center under the pointer', good: 'Keeps the point that was grabbed' },
  { id: 'spinner-start', title: 'A spinner arrives stopped', note: 'Watch the first moment of the saving state. Feedback should already be moving as it appears.', bad: 'Appears, waits, then starts spinning', good: 'Already spinning as it appears' },
] as const

async function drag(a: Act<State>) {
  await a.wait(1100)
  a.put({ pressed: true })
  await a.wait(60)
  a.put({ gripped: true })
  await a.wait(70)
  a.put({ pressed: false })
  await a.wait(120)
  a.put({ moved: true })
  await a.wait(1000)
  a.put({ gripped: false })
}
async function pending(a: Act<State>) {
  await a.wait(1100)
  await a.set({ pressed: true })
  await a.wait(180)
  await a.set({ pressed: false, phase: 'pending' })
  await a.wait(1700)
  await a.set({ phase: 'done' })
  await a.wait(220)
  await a.set({ settled: true })
}

function Drag({ state, good }: { state: State; good: boolean }) {
  const cursor = useRef<HTMLDivElement>(null)
  return <div className="ci-drag" data-good={good || undefined} data-pressed={state.pressed || undefined} data-gripped={state.gripped || undefined} data-moved={state.moved || undefined}>
    <div className="ci-drag__travel"><div className="ci-file"><svg width="12" height="14" viewBox="0 0 12 14" aria-hidden><path d="M2 1h5l3 3v9H2zM7 1v3h3" /></svg>Draft</div></div>
    <span className="ci-drag__pointer" aria-hidden><Cursor cursorRef={cursor} kind={state.gripped ? 'grab' : 'open'} /></span>
  </div>
}
function Pending({ state, good }: { state: State; good: boolean }) {
  return <div className="ci-save" data-good={good || undefined} data-phase={state.phase} data-pressed={state.pressed || undefined} data-settled={state.settled || undefined}>
    <div className="tc-button">
      <span className="ci-save__status" aria-hidden>
        <svg className="ci-save-icon" width="14" height="14" viewBox="0 0 14 14"><path d="M3 2h7l2 2v8H2V2zM4 2v4h6V2M4 12V8h6v4" /></svg>
        <svg className="ci-spinner" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" /><path d="M7 2a5 5 0 0 1 5 5" /></svg>
        <svg className="ci-check" width="14" height="14" viewBox="0 0 14 14"><path d="m3 7 2.5 2.5L11 4" /></svg>
      </span>
      <span className="ci-save__label"><Roll variant="fade">{state.phase === 'idle' ? 'Save' : state.phase === 'pending' ? 'Saving' : 'Saved'}</Roll></span>
    </div>
    <span className="ci-save__pointer" aria-hidden><MacPointer /></span>
  </div>
}

export function ContinuityComparison({ lessonId }: { lessonId: string }) {
  const [revision, replay] = useState(0)
  const lesson = continuityLessons.find(item => item.id === lessonId)!
  const isDrag = lesson.id === 'drag-offset'
  return <section className="ci-lesson">
    <header><div><h2>{lesson.title}</h2><p>{lesson.note}</p></div><button className="tc-replay" type="button" onClick={() => replay(n => n + 1)}>Replay pair</button></header>
    <Stage<State> key={`${lessonId}-${revision}`} width={704} height={150} compact={{ below: 704, width: 340, height: 316 }} initial={initial} poster={{ pressed: false, gripped: false, moved: true, settled: true, phase: 'done' }} script={isDrag ? drag : pending} play="once" className="tc-stage">
      {state => <div className="tc-pair">{[false, true].map(good => <figure key={String(good)}><div className="tc-visual">{isDrag ? <Drag state={state} good={good} /> : <Pending state={state} good={good} />}</div><figcaption>{good ? lesson.good : lesson.bad}</figcaption></figure>)}</div>}
    </Stage>
  </section>
}
