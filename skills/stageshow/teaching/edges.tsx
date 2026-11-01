import { useState } from 'react'
import { Stage, type Act } from '../kit'
import './edges.css'

type State = { changed: boolean; offset: 0 | 45 | 64; moving: boolean; started: boolean }
const initial: State = { changed: false, offset: 0, moving: false, started: false }
export const edgeLessons = [
  { id: 'label-boundary', title: 'A label hits a hard edge', note: 'Watch the letter shapes at the top and bottom of the button’s label slot. The boundary should soften the moving text, while resting text stays sharp.', bad: 'Letters are sliced by the slot', good: 'Letters soften as they reach the edge' },
  { id: 'viewport-edge', title: 'Scrolling content meets the edge', note: 'Both lists start with three whole rows. After scrolling begins, the softened edges indicate content above or below; they clear when no content remains hidden there.', bad: 'Rows meet an abrupt clipping edge', good: 'Only the concealed edges are softened' },
] as const

async function labels(a: Act<State>) {
  await a.wait(1200)
  await a.set({ changed: true })
  await a.wait(2000)
  await a.set({ changed: false })
}
async function scrolling(a: Act<State>) {
  await a.wait(1200)
  await a.set({ offset: 45, moving: true, started: true })
  await a.wait(900)
  await a.set({ moving: false })
  await a.wait(800)
  await a.set({ offset: 64, moving: true })
  await a.wait(900)
  await a.set({ moving: false })
  await a.wait(1200)
  await a.set({ offset: 0, moving: true })
  await a.wait(900)
  await a.set({ moving: false })
}
function LabelSlot({ state, good }: { state: State; good: boolean }) {
  return <div className="ed-button" data-good={good || undefined} data-changed={state.changed || undefined}>
    <span className="ed-label-window"><span className="ed-label-track"><span>Upload file</span><span>Uploaded</span></span></span>
  </div>
}
function Viewport({ state, good }: { state: State; good: boolean }) {
  const top = state.started && (state.offset > 0 || state.moving)
  const bottom = state.started && (state.offset < 64 || state.moving) && (state.offset > 0 || state.moving)
  return <div className="ed-files" data-good={good || undefined}>
    <div className="ed-files-heading">Project files<span>5 files</span></div>
    <div className="ed-viewport" data-top={top || undefined} data-bottom={bottom || undefined}>
      <div className="ed-file-track" style={{ transform: `translate3d(0, ${-state.offset}px, 0)` }}>
        {['Brief.pdf', 'Wireframes.fig', 'Review.md', 'Prototype.fig', 'Notes.txt'].map((file, i) => <div className="ed-file" key={file}><span>{file}</span><span>{[24, 182, 4, 96, 2][i]} KB</span></div>)}
      </div>
    </div>
  </div>
}
export function EdgeComparison({ lessonId }: { lessonId: string }) {
  const [revision, replay] = useState(0)
  const lesson = edgeLessons.find(item => item.id === lessonId)!
  const viewport = lesson.id === 'viewport-edge'
  const height = viewport ? 218 : 150
  return <section>
    <header><div><h2>{lesson.title}</h2><p>{lesson.note}</p></div><button className="tc-replay" type="button" onClick={() => replay(n => n + 1)}>Replay pair</button></header>
    <Stage<State> key={revision} width={704} height={height} compact={{ below: 704, width: 340, height: height * 2 + 16 }} initial={initial} poster={{ ...initial, changed: true }} script={viewport ? scrolling : labels} play="once" className="tc-stage">
      {state => <div className="tc-pair ed-pair" data-viewport={viewport || undefined}>{[false, true].map(good => <figure key={String(good)}><div className="tc-visual">{viewport ? <Viewport state={state} good={good} /> : <LabelSlot state={state} good={good} />}</div><figcaption>{good ? lesson.good : lesson.bad}</figcaption></figure>)}</div>}
    </Stage>
  </section>
}
