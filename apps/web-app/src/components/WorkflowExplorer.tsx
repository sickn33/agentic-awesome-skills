import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Skill } from '../types';
import { filterWorkflows, workflowSkillIds, workflows, type Workflow } from '../data/workflows';
import { toIndexableRoutePath } from '../utils/seo';

interface Props {
  catalog: Skill[];
  shortlistIds: string[];
  onToggleShortlist: (skillId: string) => void;
}

function WorkflowCard({ workflow, catalog, shortlistIds, onToggleShortlist }: Props & { workflow: Workflow }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(catalog.map((skill) => [skill.id, skill])), [catalog]);
  const ids = workflowSkillIds(workflow);
  const missingIds = ids.filter((id) => !byId.has(id));
  const unselectedIds = ids.filter((id) => !shortlistIds.includes(id) && byId.has(id));

  return (
    <article className="workflow-card">
      <header className="workflow-card__header">
        <div>
          <p className="workflow-card__eyebrow">{workflow.category} · {workflow.steps.length} phases</p>
          <h3>{workflow.name}</h3>
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide workflow' : 'View workflow'}
        </button>
      </header>
      <p>{workflow.description}</p>
      <div className="workflow-card__meta">
        <span>{ids.length} candidate skills</span>
        {workflow.relatedBundles.length ? <span>Bundles: {workflow.relatedBundles.join(', ')}</span> : null}
      </div>
      {open ? (
        <div className="workflow-card__detail">
          <div className="workflow-card__actions">
            <button
              type="button"
              onClick={() => unselectedIds.forEach(onToggleShortlist)}
              disabled={!unselectedIds.length}
            >
              {unselectedIds.length ? `Add ${unselectedIds.length} skills to shortlist` : 'All skills shortlisted'}
            </button>
            <span>{shortlistIds.filter((id) => ids.includes(id)).length} of {ids.length} shortlisted</span>
          </div>
          <ol className="workflow-card__steps">
            {workflow.steps.map((step, index) => (
              <li key={`${workflow.id}-${step.title}`}>
                <div>
                  <p className="workflow-card__step-label">Phase {index + 1}</p>
                  <h4>{step.title}</h4>
                  <p>{step.goal}</p>
                  {step.notes ? <p className="workflow-card__notes">{step.notes}</p> : null}
                </div>
                <ul>
                  {step.recommendedSkills.map((id) => {
                    const skill = byId.get(id);
                    return (
                      <li key={id}>
                        {skill ? <Link to={toIndexableRoutePath(`/skill/${encodeURIComponent(id)}`)}>@{id}</Link> : <code>@{id}</code>}
                        {skill ? <button type="button" aria-pressed={shortlistIds.includes(id)} onClick={() => onToggleShortlist(id)}>{shortlistIds.includes(id) ? 'Shortlisted' : 'Add'}</button> : null}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
          {missingIds.length ? <p className="workflow-card__warning">{missingIds.length} referenced skill IDs are not in the published catalog.</p> : null}
          <p className="workflow-card__note">This is a curated starting path. Review the complete skill instructions and let your agent compare the candidates before creating an AAS Core stack.</p>
        </div>
      ) : null}
    </article>
  );
}

export function WorkflowExplorer({ catalog, shortlistIds, onToggleShortlist }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const visibleWorkflows = useMemo(() => filterWorkflows(workflows, query), [query]);

  return (
    <section className="workflow-explorer" aria-labelledby="workflow-explorer-title">
      <div className="workflow-explorer__heading">
        <div>
          <p className="workflow-explorer__eyebrow">Curated execution paths</p>
          <h2 id="workflow-explorer-title">Start with a workflow, then choose the skills.</h2>
          <p>Use an ordered path when the hard part is knowing what to do first. Every candidate remains visible and reviewable before it reaches your shortlist.</p>
        </div>
        <label>
          <span className="sr-only">Search workflows</span>
          <input type="search" aria-label="Search workflows" placeholder="Search workflows" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <p className="workflow-explorer__count" role="status">{visibleWorkflows.length} of {workflows.length} workflows</p>
      {visibleWorkflows.length ? (
        <div className="workflow-explorer__grid">
          {visibleWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} catalog={catalog} shortlistIds={shortlistIds} onToggleShortlist={onToggleShortlist} />)}
        </div>
      ) : <p className="workflow-explorer__empty">No workflows match “{query}”. Try a product, security, testing, architecture, or agent goal.</p>}
    </section>
  );
}

export default WorkflowExplorer;
