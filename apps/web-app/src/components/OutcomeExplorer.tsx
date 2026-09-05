import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Skill } from '../types';
import { useSkillShortlist } from '../hooks/useSkillShortlist';
import { evidenceSignals, isDiscoveryCatalog, OUTCOME_PRESETS, rankForOutcome } from '../utils/outcomeDiscovery';
import { getSkillsIndexCandidateUrls } from '../utils/publicAssetUrls';
import { ShortlistReview } from './ShortlistReview';

interface Props { catalog?: Skill[]; onGoalChange?: (goal: string) => void }

function DiscoverySession({ catalog, onGoalChange }: Props): React.ReactElement {
  const [loaded, setLoaded] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(!catalog);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(6);
  const { ids, toggle, clear } = useSkillShortlist();
  const skills = catalog || loaded;
  const results = useMemo(() => rankForOutcome(skills, query), [skills, query]);

  useEffect(() => {
    if (catalog) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const urls = getSkillsIndexCandidateUrls({ baseUrl: import.meta.env.BASE_URL, origin: location.origin, pathname: location.pathname, documentBaseUrl: document.baseURI });
        let found: Skill[] | undefined;
        for (const url of urls) {
          try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) continue;
            const text = await response.text();
            if (text.length > 15_000_000) continue;
            const parsed: unknown = JSON.parse(text);
            if (isDiscoveryCatalog(parsed)) { found = parsed; break; }
          } catch { if (controller.signal.aborted) return; }
        }
        if (!found) throw new Error('The catalog could not be loaded. Your imported artifacts have not changed.');
        if (!controller.signal.aborted) setLoaded(found);
      } catch (cause) { if (!controller.signal.aborted) setError((cause as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void Promise.resolve().then(load);
    return () => controller.abort();
  }, [catalog, retry]);

  function search(value: string) { setQuery(value); setLimit(6); onGoalChange?.(value); }

  return <div className="outcome-content">
      {!catalog ? <p className="outcome-note">Discovery downloads the public catalog. Your goal and imported artifacts stay in this browser.</p> : null}
      {loading ? <p role="status">Loading public catalog…</p> : null}
      {error ? <div role="alert">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry catalog download</button></div> : null}
      {skills.length ? <>
        <div className="outcome-presets" aria-label="Example outcomes">{OUTCOME_PRESETS.map((preset) => <button type="button" key={preset.label} onClick={() => { setGoal(preset.goal); search(preset.goal); }}>{preset.label}</button>)}</div>
        <form className="outcome-form" onSubmit={(event) => { event.preventDefault(); search(goal); }}>
          <label htmlFor="outcome-goal">Describe your goal<textarea id="outcome-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={1000} rows={3} placeholder="For example: debug a React authentication error and add regression tests" /></label>
          <button type="submit" disabled={!goal.trim()}>Find relevant skills</button>
        </form>
        {query ? <div aria-live="polite"><h3>{results.length ? `Showing ${Math.min(limit, results.length)} of ${results.length} matching skills` : 'No clear matches for this goal'}</h3><p>Start with these candidates, then read their instructions to check they fit your task.</p><details className="outcome-method"><summary>How suggestions work</summary><p>Matches in skill names and tags weigh more than descriptions; distinctive terms weigh more than common ones. Suggestions match words, not complex constraints or proven effectiveness.</p></details>{!results.length ? <p>Try a specific tool, task or technique, or browse the full catalog below.</p> : null}</div> : <p>Choose an example or describe your goal. Nothing is selected automatically.</p>}
        <div className="outcome-results">{results.slice(0, limit).map(({ skill, matched, totalTerms }, index) => <article className="outcome-card" key={skill.id}>
          <p className="outcome-eyebrow">Candidate {index + 1} · matches {matched.length} of {totalTerms} goal terms</p><h3><Link to={`/skill/${encodeURIComponent(skill.id)}/`}>{skill.name}</Link></h3><p>{skill.description}</p>
          <p className="outcome-reason"><strong>Why it appears:</strong> {matched.join(', ')}</p>
          <details><summary>Evidence and gaps</summary><dl>{evidenceSignals(skill).map((signal) => <div key={signal.label}><dt>{signal.label}</dt><dd>{signal.value}</dd></div>)}</dl><p>These fields describe the author’s claims and setup requirements. They do not certify effectiveness. Read the complete skill before choosing it.</p></details>
          <button type="button" aria-label={`${ids.includes(skill.id) ? 'Remove from shortlist' : 'Add to shortlist'} ${skill.name}`} aria-pressed={ids.includes(skill.id)} onClick={() => toggle(skill.id)}>{ids.includes(skill.id) ? 'Remove from shortlist' : 'Add to shortlist'}</button>
        </article>)}</div>
        {results.length > limit ? <button type="button" onClick={() => setLimit((current) => current + 12)}>Show more candidates</button> : null}
        <p><Link to="/">Browse the complete catalog</Link> · All {skills.length.toLocaleString('en-US')} skills remain available regardless of metadata or this ranking.</p>
        {!catalog ? <ShortlistReview suggestedGoal={query} skills={skills.filter((skill) => ids.includes(skill.id))} onRemove={toggle} onClear={clear} /> : null}
      </> : null}
    </div>;
}

export default function OutcomeExplorer(props: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  return <section className="outcome-explorer" aria-labelledby="outcome-title">
    <div className="outcome-heading"><div><p className="outcome-eyebrow">Start with an outcome</p><h2 id="outcome-title">What do you want to get done?</h2><p>Find a starting point, compare requirements, and give your agent a focused brief.</p></div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? 'Close discovery' : 'Explore skills by outcome'}</button></div>
    {open ? <DiscoverySession {...props} /> : null}
  </section>;
}
