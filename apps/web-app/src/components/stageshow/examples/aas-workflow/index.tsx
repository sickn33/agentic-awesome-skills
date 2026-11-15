import { Stage } from '../../../../vendor/stageshow/kit/stage';
import { Window, Bar } from '../../../../vendor/stageshow/kit/window';
import { Row } from '../../../../vendor/stageshow/kit/parts/Row';
import type { Act } from '../../../../vendor/stageshow/kit/act';
import './workflow.css';
type S = { step: number };
async function script(a: Act<S>) {
  await a.wait(1800);
  a.mark('read');
  a.put({ step: 1 });
  await a.wait(2600);
  a.mark('apply');
  a.put({ step: 2 });
  await a.wait(2400);
  a.mark('review');
  a.put({ step: 3 });
  await a.wait(3600);
  a.mark('reset');
  a.put({ step: 4 });
  await a.wait(650);
  a.put({ step: 0 });
  await a.wait(650);
}
export default function Workflow() {
  return (
    <Stage
      width={640}
      height={440}
      compact={{ below: 600, width: 358, height: 358 }}
      initial={{ step: 0 }}
      poster={{ step: 3 }}
      script={script}
      play="loop"
      theme="dark"
      className="aw"
      tokens={{ '--ss-accent': '#64eee7', '--ss-font': 'Outfit, sans-serif' }}
    >
      {(s) => (
        <Window
          title="Your workspace"
          toolbar={<span className="aw-label">Agent</span>}
          className="aw-win"
          lights="grey"
        >
          <div className="aw-layout" data-step={s.step}>
            <aside className="aw-file">
              <div className="aw-file-name">
                <span aria-hidden="true">≡</span> SKILL.md
              </div>
              <div className="aw-paper">
                <span className="aw-paper-label">INSTRUCTIONS</span>
                <h3>How to work</h3>
                <div className="aw-method">
                  <strong>01 / Context</strong>
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="88%"
                  />
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="62%"
                  />
                </div>
                <div className="aw-method">
                  <strong>02 / Steps</strong>
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="80%"
                  />
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="93%"
                  />
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="58%"
                  />
                </div>
                <div className="aw-method">
                  <strong>03 / Checks</strong>
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="88%"
                  />
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="68%"
                  />
                </div>
              </div>
            </aside>
            <div className="aw-agent">
              <div className="aw-request">Use this skill for my task.</div>
              <div className="aw-attachment" data-on={s.step >= 1}>
                <span className="aw-file-icon" aria-hidden="true">
                  ≡
                </span>
                <span>SKILL.md</span>
                <span className="aw-check" aria-hidden="true">
                  ✓
                </span>
              </div>
              <div className="aw-progress">
                <Row
                  pad={6}
                  title="Read instructions"
                  lead={<span className="aw-dot" data-done={s.step >= 1} />}
                />
                <Row
                  pad={6}
                  title="Apply to your project"
                  lead={<span className="aw-dot" data-done={s.step >= 2} />}
                />
                <Row
                  pad={6}
                  title="Review changes"
                  lead={<span className="aw-dot" data-done={s.step >= 3} />}
                />
              </div>
              <div className="aw-diff" data-on={s.step >= 2} aria-hidden="true">
                <div className="aw-diff-line aw-removed">
                  <span>−</span>
                  <Bar
                    h={4}
                    style={{ background: 'currentColor', opacity: 0.25 }}
                    w="65%"
                  />
                </div>
                {[82, 60, 92, 70].map((w, i) => (
                  <div
                    key={i}
                    className="aw-diff-line"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <span>+</span>
                    <Bar
                      h={4}
                      style={{ background: 'currentColor', opacity: 0.35 }}
                      w={`${w}%`}
                    />
                  </div>
                ))}
              </div>
              <div className="aw-review" data-on={s.step >= 3}>
                Ready for your review<span aria-hidden="true">◉</span>
              </div>
            </div>
          </div>
        </Window>
      )}
    </Stage>
  );
}
