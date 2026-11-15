import { Stage } from '../../../../vendor/stageshow/kit/stage';
import { Window } from '../../../../vendor/stageshow/kit/window';
import { States } from '../../../../vendor/stageshow/kit/motion/States';
import { Stream } from '../../../../vendor/stageshow/kit/motion/Stream';
import { Row } from '../../../../vendor/stageshow/kit/parts/Row';
import type { Act } from '../../../../vendor/stageshow/kit/act';
import {
  Check,
  FileText,
  MagnifyingGlass as Search,
  FolderOpen,
  ListChecks,
} from '@phosphor-icons/react';
import './core.css';
type S = { step: number; words: number; reset: boolean };
const answer = 'Review this selection before using it.';
const count = answer.split(' ').length;
async function script(a: Act<S>) {
  await a.wait(1300);
  a.mark('search');
  a.put({ step: 1 });
  await a.wait(2100);
  a.mark('inspect');
  a.put({ step: 2 });
  await a.wait(2100);
  a.mark('selection');
  a.put({ step: 3 });
  for (let words = 1; words <= count; words++) {
    a.put({ words });
    await a.wait(55);
  }
  await a.wait(1200);
  a.mark('validate');
  a.put({ step: 4 });
  await a.wait(2900);
  a.mark('reset');
  a.put({ reset: true });
  await a.wait(600);
  a.put({ step: 0, words: 0 });
  await a.wait(200);
  a.put({ reset: false });
  await a.wait(500);
}
export default function CoreDemo() {
  return (
    <Stage
      width={680}
      height={460}
      compact={{ below: 560, width: 358, height: 358 }}
      initial={{ step: 0, words: 0, reset: false }}
      poster={{ step: 4, words: count, reset: false }}
      script={script}
      play="loop"
      theme="dark"
      className="cd"
      tokens={{ '--ss-accent': '#64eee7', '--ss-font': 'Outfit, sans-serif' }}
    >
      {(s) => (
        <Window
          title="Your coding agent"
          lights="grey"
          toolbar={<span className="cd-connected">AAS Core connected</span>}
          className="cd-window"
        >
          <div className="cd-body">
            <div className="cd-question">Find skills for this project.</div>
            <div className="cd-exchange" data-reset={s.reset}>
              <States
                value={s.step < 3 ? 'search' : 'result'}
                align="start"
                className="cd-states"
                states={{
                  search: (
                    <div className="cd-search">
                      <div className="cd-response-title">
                        Working with your project
                      </div>
                      <div className="cd-tools">
                        <Row
                          pad={12}
                          lead={<FolderOpen size={18} />}
                          title="Read project context"
                          meta={
                            <Check
                              size={16}
                              className={s.step >= 1 ? 'cd-done' : 'cd-pending'}
                            />
                          }
                        />
                        <Row
                          pad={12}
                          lead={<Search size={18} />}
                          title="Search the AAS catalog"
                          meta={
                            <Check
                              size={16}
                              className={s.step >= 2 ? 'cd-done' : 'cd-pending'}
                            />
                          }
                        />
                        <Row
                          pad={12}
                          lead={<ListChecks size={18} />}
                          title="Read and compare candidates"
                          meta={
                            <Check
                              size={16}
                              className={s.step >= 2 ? 'cd-done' : 'cd-pending'}
                            />
                          }
                        />
                      </div>
                      <p className="cd-note">
                        The agent chooses the skill IDs.
                      </p>
                    </div>
                  ),
                  result: (
                    <div className="cd-result">
                      <Stream
                        text={answer}
                        count={s.words}
                        className="cd-answer"
                      />
                      <div className="cd-file">
                        <div className="cd-file-head">
                          <FileText size={20} />
                          <span>aas-stack.json</span>
                          <span className="cd-file-count">7 skills</span>
                        </div>
                        <div className="cd-skill-ids">
                          <Row
                            className="cd-skill-row"
                            pad={0}
                            title={
                              <span className="cd-skill-name">mcp-builder</span>
                            }
                          />
                          <Row
                            className="cd-skill-row"
                            pad={0}
                            title={
                              <span className="cd-skill-name">
                                javascript-pro
                              </span>
                            }
                          />
                          <Row
                            className="cd-skill-row"
                            pad={0}
                            title={
                              <span className="cd-skill-name">
                                invariant-guard
                              </span>
                            }
                          />
                        </div>
                        <div className="cd-file-foot">
                          <span>+ 4 more IDs</span>
                          <span>Catalog pinned</span>
                        </div>
                      </div>
                      <div className="cd-validation">
                        <States
                          value={s.step === 4 ? 'done' : 'checking'}
                          align="start"
                          states={{
                            checking: <span>Core checks the selection</span>,
                            done: (
                              <span className="cd-done">
                                <Check size={16} /> Selection validated · ready
                                to review
                              </span>
                            ),
                          }}
                        />
                      </div>
                    </div>
                  ),
                }}
              />
            </div>
            <div className="cd-composer">Ask a follow-up</div>
          </div>
        </Window>
      )}
    </Stage>
  );
}
