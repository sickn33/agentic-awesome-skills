import { Bar, Row, Stage, States, Text, Toggle, Window, type Act } from '../../kit'
import './close.css'

// A close-up: one setting, drawn at 1.4 times true size and cropped hard, for
// a feature card about a single control. Beats: the cursor clicks the toggle,
// it turns on, the line under it changes to say what that did. Plays once;
// the still is the payoff.
//
// What makes a close-up read as a close-up, not a small screen:
// - The whole window is scaled, chrome and all, not the control alone: the
//   traffic lights and the title bar at the top left say this is a crop of a
//   real window. A bare toggle at twice its size reads as an icon.
// - The window runs off the bottom only. The subject row is whole across,
//   label and toggle: a close-up that crops its own control has lost the
//   point. The row above and below it are context.
// - The cursor is the large style, so it matches the zoom; a true-size arrow
//   on a 1.4x window reads as a speck.
// - One real row. Its neighbors keep their anatomy as placeholder lines and
//   toggles that stay off: an accent on filler would be the heaviest mark in
//   the frame on a row with no words.
//
// Real strings: the window title, the setting, its two descriptions.

type S = { on: boolean }

const initial: S = { on: false }
const poster: S = { on: true }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark('click')
  await a.click({ at: 'toggle', x: 0.5, y: 0.5 })
  a.put({ on: true })
  // Off the knob, so the payoff isn't under the pointer
  await a.wait(500)
  await a.move({ at: 'toggle', x: 0.5, y: 2.6 })
  await a.wait(2100)
}

export default function CloseUp() {
  return (
    <Stage width={400} height={300} compact={{ below: 400, width: 358, height: 300 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { x: 330, y: 270 }, style: 'large' }} className="cu">
      {(s) => (
        <div className="cu-zoom">
          <Window title="Security" className="cu-win">
            <div className="cu-list">
              <Row pad={0} className="cu-row" title={<Bar w={96} h={8} r={4} tone={3} />} subtitle={<Bar w={150} h={7} r={3.5} tone={2} />}>
                <Toggle on={false} />
              </Row>
              <Row
                pad={0}
                className="cu-row"
                title={<Text className="cu-title">Two-factor authentication</Text>}
                subtitle={
                  <States
                    value={s.on ? 'on' : 'off'}
                    align="start"
                    states={{
                      off: <Text className="cu-sub">Ask for a code at sign in</Text>,
                      on: <Text className="cu-sub">On for every sign in</Text>,
                    }}
                  />
                }
              >
                <Toggle on={s.on} data-target="toggle" data-cursor="pointer" />
              </Row>
              <Row pad={0} className="cu-row" title={<Bar w={120} h={8} r={4} tone={3} />} subtitle={<Bar w={104} h={7} r={3.5} tone={2} />}>
                <Toggle on={false} />
              </Row>
            </div>
          </Window>
        </div>
      )}
    </Stage>
  )
}
