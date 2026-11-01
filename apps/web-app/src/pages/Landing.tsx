import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../components/ui/Icon';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildLandingMeta } from '../utils/seo';
import stack from '../../../../docs/examples/workflows/mcp-contract/aas-stack.json';
import plan from '../../../../docs/examples/workflows/mcp-contract/plan.json';
import './Landing.css';

const stages = [
  { name: 'Goal', description: 'Your agent works on a goal' },
  { name: 'Agent selection', description: 'It chooses skill IDs from the catalog' },
  { name: 'Plan preview', description: 'Review the plan before changing anything' },
];
const featuredIds = ['mcp-builder', 'javascript-pro', 'invariant-guard'];
const additionalIds = stack.skills.map((skill) => skill.id).filter((id) => !featuredIds.includes(id));

export function Landing(): React.ReactElement {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#get-started' || hash === '#recorded-example') document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const [stage, setStage] = useState(2);
  const [showMore, setShowMore] = useState(false);
  const [artifact, setArtifact] = useState<'stack' | 'plan' | null>(null);
  usePageMeta(buildLandingMeta(typeof __CATALOG_COUNT__ === 'number' ? __CATALOG_COUNT__ : 0));
  return <div className="core-landing">
    <section className="core-intro" aria-labelledby="core-title">
      <p className="core-eyebrow">AI agent skills · CLI · MCP · Plugins</p>
      <h1 id="core-title">Agentic Awesome Skills</h1>
      <h2>Reusable skills for your AI coding agent.</h2>
      <p className="core-intro__lede">Explore {typeof __CATALOG_COUNT__ === 'number' ? __CATALOG_COUNT__.toLocaleString('en-US') : 'the catalog of'} reusable SKILL.md playbooks for Claude Code, Codex, Cursor and other coding agents. AAS Core lets your agent inspect the catalog, record its selection and preview a plan locally.</p>
      <div className="core-intro__actions">
        <Link className="core-primary" to="/core/">Explore the skill catalog <Icon name="arrowRight" size={22} /></Link>
        <a className="core-text-link" href="#get-started">Get started with Core <Icon name="arrowRight" size={20} /></a>
      </div>
    </section>

    <section className="core-example" id="recorded-example" aria-label="Recorded Core example">
      <header className="core-example__header"><span>Recorded example · Preview only</span><a href="https://github.com/sickn33/agentic-awesome-skills/tree/main/docs/examples/workflows/mcp-contract">View recorded project</a></header>
      <div className="core-example__stages" role="tablist" aria-label="Example stages">
        {stages.map((item, index) => <button key={item.name} id={`stage-${index}`} role="tab" type="button" aria-selected={stage === index} aria-controls="example-panel" tabIndex={stage === index ? 0 : -1} onClick={() => setStage(index)} onKeyDown={(event) => {
          let next: number;
          if (event.key === 'ArrowRight') next = (index + 1) % stages.length;
          else if (event.key === 'ArrowLeft') next = (index + stages.length - 1) % stages.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = stages.length - 1;
          else return;
          event.preventDefault(); setStage(next); document.getElementById(`stage-${next}`)?.focus();
        }}>
          <span className="core-stage-number">{index + 1}</span><span><strong>{item.name}</strong><span>{item.description}</span></span>
        </button>)}
      </div>
      <div className="core-example__content" id="example-panel" role="tabpanel" aria-labelledby={`stage-${stage}`}>
        {stage === 2 ? <div className="core-plan-summary">
          <div><h3>Goal</h3><p className="core-goal">Review an MCP contract</p></div>
          <Icon name="arrowRight" size={23} />
          <div><h3>Agent-selected skills</h3><ul className="core-skill-tags">{featuredIds.map((id) => <li key={id}><code>{id}</code></li>)}</ul><button className="core-more" type="button" aria-expanded={showMore} onClick={() => setShowMore(!showMore)}>{showMore ? 'Show fewer' : `+${additionalIds.length} more`}</button>{showMore && <ul className="core-additional-skills">{additionalIds.map((id) => <li key={id}><code>{id}</code></li>)}</ul>}</div>
          <Icon name="arrowRight" size={23} />
          <div><h3>Reviewable plan</h3><div className="core-artifacts"><button type="button" aria-expanded={artifact === 'stack'} onClick={() => setArtifact(artifact === 'stack' ? null : 'stack')}><Icon name="file" size={23} /><code>aas-stack.json</code><Icon name="arrowRight" size={17} /></button><button type="button" aria-expanded={artifact === 'plan'} onClick={() => setArtifact(artifact === 'plan' ? null : 'plan')}><Icon name="file" size={23} /><code>plan.json</code><Icon name="arrowRight" size={17} /></button><p><Icon name="info" size={20} /> Preview only</p></div></div>
        </div> : stage === 0 ? <div className="core-example__explanation"><h3>Review an MCP contract</h3><p>This recorded project uses a local read-only Node MCP catalog. Its constraints include an offline runtime, bounded inputs, and agent-owned selection.</p><p>The agent inspects the project and searches the catalog before deciding which skills to use.</p><Link to="/core/">Explore the skill catalog <Icon name="arrowRight" size={18} /></Link></div> : <div className="core-example__explanation"><h3>The agent chooses the exact IDs.</h3><p>Core records and validates this choice against its catalog. It does not choose the skills for the agent.</p><ul className="core-skill-tags">{stack.skills.map((skill) => <li key={skill.id}><code>{skill.id}</code></li>)}</ul><Link to="/docs/aas-core/#ask-the-agent-to-choose-the-stack">Read the selection workflow <Icon name="arrowRight" size={18} /></Link></div>}
        {artifact && stage === 2 && <div className="core-artifact-detail"><h4>{artifact === 'stack' ? 'Recorded stack manifest' : 'Recorded plan artifact'}</h4><p>Example catalog v{stack.catalog.version}. This is the original recorded artifact, not a new selection or live execution.</p><pre tabIndex={0}>{JSON.stringify(artifact === 'stack' ? stack : plan, null, 2)}</pre><Link to="/workbench/">Open the plan reviewer <Icon name="arrowRight" size={18} /></Link></div>}
      </div>
    </section>

    <section className="core-setup" id="get-started" aria-labelledby="core-setup-title">
      <div><p className="core-eyebrow">Get started</p><h2 id="core-setup-title">Start with your agent</h2><p>Set up your agent with AAS Core and start working with the skill catalog.</p></div>
      <Link className="core-setup-card" to="/docs/codex-cli-skills/"><span className="core-setup-icon"><Icon name="terminal" size={39} /></span><span><strong>Codex setup <Icon name="arrowRight" size={18} /></strong><span>Connect Codex to AAS Core using the local stdio MCP.</span></span></Link>
      <Link className="core-setup-card" to="/docs/claude-code-skills/"><span className="core-setup-icon"><img src={`${import.meta.env.BASE_URL}claude-setup-mark.png`} width={52} height={52} alt="" /></span><span><strong>Claude Code setup <Icon name="arrowRight" size={18} /></strong><span>Connect Claude Code to AAS Core using the local stdio MCP.</span></span></Link>
    </section>
    <div className="core-boundary"><p>Core validates and previews. Review the instructions and plan before any separate installation.</p><Link to="/docs/aas-core/">Core, CLI & MCP reference <Icon name="arrowRight" size={16} /></Link></div>
    <section className="core-video" aria-labelledby="core-video-title">
      <p className="core-eyebrow">AAS in 40 seconds</p>
      <h2 id="core-video-title">See AAS and AAS Core in action.</h2>
      <p>Discover reusable playbooks, agent-owned skill selection, and Core validation and plan previews.</p>
      <video controls playsInline preload="none" poster={`${import.meta.env.BASE_URL}videos/aas-introduction-v3-poster.jpg`} aria-label="AAS introduction video">
        <source src={`${import.meta.env.BASE_URL}videos/aas-introduction-v3.mp4`} type="video/mp4" />
        Your browser does not support HTML video.
      </video>
    </section>
    <section className="core-maintainer" aria-label="Project">
      <a href="https://github.com/sickn33" target="_blank" rel="noreferrer" className="core-maintainer__profile">
        <img src={`${import.meta.env.BASE_URL}maintainer-avatar.jpg`} alt="" width={40} height={40} loading="lazy" />
        <span><span className="core-maintainer__label">Maintained by</span><strong>@sickn33</strong></span>
      </a>
      <p>Open source: MIT code, CC BY 4.0 original content, with upstream notices preserved. Source PRs are welcome.</p>
      <a href="https://github.com/sickn33/agentic-awesome-skills" target="_blank" rel="noreferrer" className="core-text-link"><Icon name="star" size={16} /> Star on GitHub</a>
    </section>
  </div>;
}
export default Landing;
