import { CircleX, GitBranch, Globe, LoaderCircle, Sparkles, WandSparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Stage } from '../kit'
import './style.css'

// Style pairs: the same deploys card twice. The good side is identical in
// every pair; each bad side carries one fault agents reach for, so a
// builder can match a fault in its own still to the pair that names it.

export const styleLessons = [
  { id: 'style-purple', title: 'Take the color from the product', note: 'The same deploys card. A purple-to-pink gradient, gradient text and a tinted card say “generated” before anything is read. Use the product’s own neutrals and one accent on the thing that matters.', bad: 'Purple gradient ground, gradient title, tinted everything', good: 'Product neutrals; the accent only on the live deploy' },
  { id: 'style-tiny', title: 'Set text at reading size', note: 'The same card. Shrinking type to fit more in reads as a wireframe at launch-page size. Rows at 13 to 14px with 11 to 12px metadata, and fewer of them.', bad: '9 to 10px text that only reads zoomed in', good: '14px names, 12px metadata' },
  { id: 'style-detail', title: 'Detail only the subject', note: 'The same card. A real name, branch, hash, author, duration and badge on every row makes every row the subject. Give real words to the row the story is about; the rest can be quiet.', bad: 'Every row carries six facts and a badge', good: 'One row in full; the others name and time' },
  { id: 'style-glow', title: 'Shadows sit, they don’t glow', note: 'The same card. Colored glows around the card, the button and the status read as a neon template. A real surface casts one soft neutral shadow.', bad: 'A colored glow on the card, button and dot', good: 'One neutral shadow under the card' },
  { id: 'style-caps', title: 'Write in sentence case', note: 'The same card. Tracked capitals on the heading, labels and button shout and slow reading. Keep capitals for what the product itself capitalizes.', bad: 'Capitals on the heading, labels and button', good: 'Sentence case everywhere' },
  { id: 'style-icons', title: 'Use an icon pack, not glyphs drawn on the fly', note: 'The same card. Glyphs drawn for the demo, in colored squircles, each a different hue, filled beside outlined, read as made up. Take the product’s own set, or one pack chosen on purpose (Lucide, Phosphor, SF Symbols), one stroke, one color. Draw an icon only when no pack has it.', bad: 'Invented glyphs in rainbow tiles', good: 'One set, one stroke, status in color only' },
  { id: 'style-onion', title: 'Color icons with an opaque ink', note: 'The same card. An icon colored with a translucent ink paints darker wherever its strokes cross or join: the onion-skin look of generated UI. Use one opaque color; for a lighter icon pick a lighter opaque gray. Shown at 2x.', bad: 'Translucent ink: darker where strokes cross', good: 'One opaque color per icon' },
  { id: 'style-sparkle', title: 'Name the AI action, don’t sparkle it', note: 'The same card with an action on the failed deploy. Sparkles, wands and gradient “AI” chips are the generic shorthand for any AI feature and say nothing about this one. Use the product’s own mark if it has one; otherwise a plain label that says what happens.', bad: 'Sparkles, a wand and a gradient AI chip', good: 'A plain action that says what it does' },
] as const

type Id = (typeof styleLessons)[number]['id']

type Deploy = { name: string; branch: string; hash: string; who: string; time: string; state: 'live' | 'building' | 'failed' }

const DEPLOYS: Deploy[] = [
  { name: 'Checkout redesign', branch: 'main', hash: '8f2c1a4', who: 'Maya Chen', time: 'Just now', state: 'live' },
  { name: 'Search speedup', branch: 'perf/search', hash: 'b41e09d', who: 'Jon Park', time: '12m ago', state: 'building' },
  { name: 'Pricing copy', branch: 'copy/pricing', hash: '3a7f6c2', who: 'Ana Ruiz', time: '1h ago', state: 'failed' },
]

const ICON: Record<Deploy['state'], LucideIcon> = { live: Globe, building: LoaderCircle, failed: CircleX }

/** Invented glyphs, the kind a builder draws when it has no set */
function MadeUp({ state }: { state: Deploy['state'] }) {
  const d = { live: 'M4 10.5 8 14l8-9', building: 'M10 3a7 7 0 1 1-6.2 3.8M3 3v4h4', failed: 'M10 2.5 18 17H2zM10 8v4M10 14.5v.5' }[state]
  const fill = state === 'failed'
  return (
    <span className="st-blob" data-state={state}>
      <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
        <path d={d} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={state === 'building' ? 3 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Card({ fault, ai }: { fault?: Id; ai?: 'bad' | 'good' }) {
  const caps = fault === 'style-caps'
  const detail = fault === 'style-detail'
  return (
    <div className="st-card" data-fault={fault}>
      <div className="st-head">
        <span className="st-title">{caps ? 'RECENT DEPLOYS' : 'Recent deploys'}</span>
        <span className="st-button">
          {fault === 'style-icons' && <MadeUp state="live" />}
          {caps ? 'DEPLOY' : 'Deploy'}
        </span>
      </div>
      {caps && <div className="st-eyebrow">PRODUCTION · 3 DEPLOYS</div>}
      {DEPLOYS.map((d, i) => {
        const Icon = ICON[d.state]
        const full = detail || i === 0
        return (
          <div className="st-row" key={d.name} data-state={d.state}>
            {fault === 'style-icons' ? <MadeUp state={d.state} /> : <span className="st-icon"><Icon size={16} strokeWidth={1.75} /></span>}
            <div className="st-text">
              <span className="st-name">{d.name}</span>
              {full ? (
                <span className="st-meta">
                  {detail ? (
                    <>
                      <GitBranch size={11} strokeWidth={2} /> {d.branch} · {d.hash} · {d.who} · 42s
                    </>
                  ) : caps ? (
                    `${d.branch.toUpperCase()} · ${d.who.toUpperCase()}`
                  ) : (
                    `${d.branch} · ${d.who}`
                  )}
                </span>
              ) : null}
            </div>
            {detail && <span className="st-badge" data-state={d.state}>{d.state}</span>}
            {ai && d.state === 'failed' ? (
              ai === 'bad' ? (
                <span className="st-ai" data-slop>
                  <WandSparkles size={12} strokeWidth={2} />
                  Ask AI
                  <Sparkles size={11} strokeWidth={2} />
                </span>
              ) : (
                <span className="st-ai">Explain failure</span>
              )
            ) : (
              <span className="st-time">{caps ? d.time.toUpperCase() : d.time}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function StyleComparison({ lessonId }: { lessonId: string }) {
  const lesson = styleLessons.find((item) => item.id === lessonId)
  if (!lesson) return null
  const height = 302
  return (
    <section className="cp-lesson">
      <header>
        <div>
          <h2>{lesson.title}</h2>
          <p>{lesson.note}</p>
        </div>
      </header>
      <Stage width={704} height={height} compact={{ below: 704, width: 340, height: height * 2 + 16 }} className="tc-stage">
        {() => (
          <div className="tc-pair st-pair" data-style={lesson.id}>
            {[false, true].map((good) => (
              <figure key={String(good)}>
                <div className="tc-visual" data-good={good || undefined}>
                  <Card fault={good || lesson.id === 'style-sparkle' ? undefined : lesson.id} ai={lesson.id === 'style-sparkle' ? (good ? 'good' : 'bad') : undefined} />
                </div>
                <figcaption>{good ? lesson.good : lesson.bad}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Stage>
    </section>
  )
}
