import { useState } from 'react';
import { InstallationHandoff } from './InstallationHandoff';
import { Link } from 'react-router';
import type { Skill } from '../types';
import { SkillRequirements } from './SkillRequirements';
import { buildShortlistBrief, type BriefTarget } from '../utils/shortlistBrief';
import { catalogVersion } from '../utils/catalogRelease';

interface Props {
  skills: Skill[];
  onRemove: (id: string) => void;
  onClear: () => void;
  suggestedGoal?: string;
}

export function ShortlistReview({ skills, onRemove, onClear, suggestedGoal }: Props): React.ReactElement {
  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState<BriefTarget>('codex:project');
  const [message, setMessage] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const ids = skills.map((skill) => skill.id);
  const brief = buildShortlistBrief(ids, goal, target);

  async function copy(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      setMessage(success);
    } catch {
      setCopyFailed(true);
      setMessage('Clipboard unavailable. Select and copy the text from the brief preview below.');
    }
  }

  return (
    <section className="shortlist-review" aria-labelledby="shortlist-title">
      <div className="catalog-shortlist">
        <div>
          <p>Browser-local shortlist</p>
          <h2 id="shortlist-title">Compare skills before you choose.</h2>
          <span>{skills.length} selected · catalog v{catalogVersion}</span>
        </div>
        {skills.length ? (
          <div className="catalog-shortlist__actions">
            <button type="button" aria-label="Copy exact IDs" onClick={() => void copy(ids.join('\n'), 'Canonical skill IDs copied to your clipboard.')}>{message.startsWith('Canonical skill IDs copied') ? 'IDs copied' : 'Copy exact IDs'}</button>
            <button type="button" onClick={() => { onClear(); setMessage(''); setCopyFailed(false); }}>Clear shortlist</button>
          </div>
        ) : <p>Add skills from the catalog, compare their requirements, then give your agent a focused brief.</p>}
      </div>
      {message ? <p role="status" className="shortlist-review__status">{message}</p> : null}
      {skills.length ? (
        <details className="shortlist-review__details" open={copyFailed || undefined}>
          <summary>Compare {skills.length} selected {skills.length === 1 ? 'skill' : 'skills'} and prepare an agent brief</summary>
          <div className="shortlist-review__table" tabIndex={0} role="region" aria-label="Selected skills comparison">
            <table>
              <thead><tr><th scope="col">Skill</th><th scope="col">Purpose</th><th scope="col">Requirements and provenance</th></tr></thead>
              <tbody>{skills.map((skill) => (
                <tr key={skill.id}>
                  <th scope="row">
                    <Link to={`/skill/${encodeURIComponent(skill.id)}/`}>{skill.id}</Link>
                    <button type="button" aria-label={`Remove ${skill.id}`} onClick={() => onRemove(skill.id)}>Remove</button>
                  </th>
                  <td>{skill.description}</td>
                  <td><SkillRequirements skill={skill} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="shortlist-review__note">Metadata describes the catalog record. Plugin packaging does not determine whether an agent can select a skill; inspect its full instructions before use.</p>
          <InstallationHandoff ids={ids} version={catalogVersion} />
          <div className="shortlist-review__brief">
            <label htmlFor="shortlist-goal">What do you want to accomplish?
              <textarea id="shortlist-goal" rows={3} value={goal} placeholder="Describe the outcome and constraints for your project" onChange={(event) => { setGoal(event.target.value); setMessage(''); }} />
            </label>
            {suggestedGoal && suggestedGoal !== goal ? <button type="button" onClick={() => { setGoal(suggestedGoal); setMessage('Discovery goal added to the brief.'); }}>Use discovery goal in brief</button> : null}
            <label htmlFor="shortlist-target">Target
              <select id="shortlist-target" value={target} onChange={(event) => { setTarget(event.target.value as BriefTarget); setMessage(''); }}>
                <option value="codex:project">Codex · this project</option>
                <option value="claude:project">Claude · this project</option>
              </select>
            </label>
            <p>Your goal stays in this page until you copy it. Only shortlisted IDs are saved in this browser.</p>
            <div className="catalog-shortlist__actions">
              <button type="button" aria-label="Copy agent brief" disabled={!goal.trim()} onClick={() => void copy(brief, 'Agent brief copied. Paste it into your coding agent to start the review.')}>{message.startsWith('Agent brief copied') ? 'Brief copied' : 'Copy agent brief'}</button>
              <Link to="/workbench/">Review the resulting stack and plan</Link>
            </div>
            <details open={copyFailed || undefined}>
              <summary>Preview the brief</summary>
              <textarea aria-label="Agent brief preview" readOnly rows={12} value={brief} />
            </details>
          </div>
        </details>
      ) : null}
    </section>
  );
}
