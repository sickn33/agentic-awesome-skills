import { Check, Field, Stage, States, Text, Window, type Act } from '../../kit'
import './form.css'

// A sign-up form catching a mistake. Beats: an email is typed without its
// ending; the field turns to error and the line under it says why; the
// ending is typed and the field turns valid; Create account sends, and the
// button settles on done. Plays once; the still is the payoff.
//
// What makes validation read:
// - The message has a lane of its own under the field from the start: the
//   hint and the error swap in it (States), so the form never grows or
//   shifts when the error arrives.
// - The error is said by the ring and the line together, in the danger ink,
//   and it leaves the moment the value is fixed: the ring turns calm with a
//   check, the line goes back to the hint.
// - Nothing in the button moves sideways. It is full width, so every state
//   fits where it is: the idle label and the busy group (check and label)
//   are two layers in one place that crossfade, and inside the group the
//   check holds still while "Creating account" crossfades to "Account
//   created" beside it. Re-centering a group as its width eases slides the
//   icon and the words across the button for no reason.
//
// Real strings: the title, the labels, the typed email, the hint and the
// error, the button.

type S = { email: string; field: 'email' | 'none'; status: 'none' | 'error' | 'valid'; sending: boolean; done: boolean }

const initial: S = { email: '', field: 'email', status: 'none', sending: false, done: false }
const poster: S = { email: 'maya@northwind.co', field: 'none', status: 'valid', sending: true, done: true }

async function script(a: Act<S>) {
  await a.wait(700)
  a.mark('type')
  await a.type('email', 'maya@northwind', { interval: 55 })
  await a.wait(300)
  a.mark('error')
  a.put({ status: 'error' })
  await a.wait(1400)
  a.mark('fix')
  // Only the ending is typed: a.type would clear the field and start over
  for (const end of ['maya@northwind.', 'maya@northwind.c', 'maya@northwind.co']) {
    a.put({ email: end })
    await a.wait(110)
  }
  a.put({ status: 'valid' })
  await a.wait(700)
  a.mark('send')
  await a.click({ at: 'create', x: 0.5, y: 0.5 })
  a.put({ field: 'none', sending: true })
  await a.wait(1200)
  a.put({ done: true })
  await a.move({ at: 'create', x: 0.75, y: 1.9 })
  await a.wait(2400)
}

export default function FormError() {
  return (
    <Stage width={560} height={400} compact={{ below: 560, width: 358, height: 420 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { x: 520, y: 370 } }} className="fe">
      {(s) => (
        <Window url="app.northwind.co/signup" className="fe-win">
          <div className="fe-card">
            <Text className="fe-title">Create your account</Text>
            <div className="fe-group">
              <Field label="Work email" value={s.email} focused={s.field === 'email'} status={s.status === 'none' ? undefined : s.status} />
              <div className="fe-lane" data-tone={s.status === 'error' ? 'error' : undefined}>
                <States
                  value={s.status === 'error' ? 'error' : 'hint'}
                  align="start"
                  states={{
                    hint: <Text className="fe-msg">We'll send a link to confirm it</Text>,
                    error: <Text className="fe-msg fe-msg--error">Add the domain, like name@company.com</Text>,
                  }}
                />
              </div>
            </div>
            <div className="fe-group">
              <Field label="Password" value="northwind-2026" password />
              <div className="fe-lane" />
            </div>
            <span className="fe-button" data-target="create" data-cursor="pointer" data-done={s.done || undefined}>
              <span className="fe-layer fe-idle" data-on={!s.sending || undefined}>Create account</span>
              <span className="fe-layer fe-busy" data-on={s.sending || undefined}>
                <Check on={s.done} pending={s.sending && !s.done} size={14} />
                {/* Left-aligned in a cell as wide as the longer label: the
                    shorter sits 2px off center, which no eye sees */}
                <span className="fe-labels">
                  <span className="fe-label" data-on={!s.done || undefined}>Creating account</span>
                  <span className="fe-label" data-on={s.done || undefined}>Account created</span>
                </span>
              </span>
            </span>
          </div>
        </Window>
      )}
    </Stage>
  )
}
