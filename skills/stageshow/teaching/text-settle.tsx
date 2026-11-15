import { useState } from 'react'
import { Stage, States, type Act } from '../kit'
import './text-settle.css'

type State = { added: boolean }
const labels = { empty: 'Add a note', added: 'Note added' }
export const textLessons = [{
  id: 'text-settle', title: 'Text shifts as the transition finishes',
  note: 'Watch the label and “Optional” as the old words finish fading. Hidden text can still move the line’s baseline.',
  bad: 'A hidden label changes the baseline', good: 'Travel stays separate from layout',
}] as const

async function sequence(a: Act<State>) {
  await a.wait(1300)
  await a.set({ added: true })
  await a.wait(2000)
  await a.set({ added: false })
  await a.wait(1400)
}

// A real failure mode: margin travel on an overlapping inline-grid item
// contributes to the shared baseline even after that item becomes invisible.
// Keep this reproduction local; corrected scenes use the shared States part.
function UnstableLabel({ added }: State) {
  return <span className="ts-unstable">{Object.entries(labels).map(([key, text]) =>
    <span className="ts-unstable__item" key={key} data-on={(added ? 'added' : 'empty') === key || undefined} aria-hidden={(added ? 'added' : 'empty') !== key || undefined}>{text}</span>
  )}</span>
}

export function TextComparison() {
  const [revision, replay] = useState(0)
  const lesson = textLessons[0]
  return <section className="ts-lesson">
    <header><div><h2>{lesson.title}</h2><p>{lesson.note}</p></div><button className="tc-replay" type="button" onClick={() => replay(n => n + 1)}>Replay pair</button></header>
    <Stage<State> key={revision} width={704} height={150} compact={{ below: 704, width: 340, height: 316 }} initial={{ added: false }} poster={{ added: true }} script={sequence} play="once" className="tc-stage">
      {state => <div className="tc-pair">{[false, true].map(good => <figure key={String(good)}>
        <div className="tc-visual"><div className="ts-line" data-good={good || undefined}>
          <span className="ts-label">{good ? <States value={state.added ? 'added' : 'empty'} states={labels} align="start" /> : <UnstableLabel {...state} />}</span>
          <span className="ts-secondary">Optional</span>
        </div></div><figcaption>{good ? lesson.good : lesson.bad}</figcaption>
      </figure>)}</div>}
    </Stage>
  </section>
}
