import { useState } from 'react';
import { Link } from 'react-router';
import { workflows } from '../data/workflows';
import { specializedPlugins } from '../data/specializedPlugins';

const paths = [
  { id: 'web', name: 'Build a website or app', workflow: 'ship-saas-mvp', pack: 'web-app', category: 'web-development' },
  { id: 'security', name: 'Review application security', workflow: 'security-audit-web-app', pack: 'aas-security-engineer', category: 'security' },
  { id: 'qa', name: 'Test a product', workflow: 'qa-browser-automation', pack: 'aas-qa-test-automation', category: 'testing' },
  { id: 'agents', name: 'Build an agent or MCP tool', workflow: 'build-ai-agent-system', pack: 'aas-agent-mcp-builder', category: 'ai-agents' },
  { id: 'automation', name: 'Automate repetitive work', workflow: '', pack: 'aas-automation-builder', category: 'automation' },
];
const agents = [{ id: 'codex-cli-skills', name: 'Codex' }, { id: 'claude-code-skills', name: 'Claude Code' }, { id: 'cursor-skills', name: 'Cursor' }, { id: 'gemini-cli-skills', name: 'Gemini CLI' }];

export function GuidedDiscovery({ onWorkflow }: { onWorkflow: (id: string) => void }): React.ReactElement {
  const [goal, setGoal] = useState(paths[0].id);
  const [agent, setAgent] = useState(agents[0].id);
  const [shown, setShown] = useState(false);
  const path = paths.find((entry) => entry.id === goal)!;
  const workflow = workflows.find((entry) => entry.id === path.workflow);
  const pack = specializedPlugins.find((entry) => entry.id === path.pack)!;
  return <details className="platform-panel guided-discovery" id="guided-discovery">
    <summary>Help me get started <span>Choose a goal and your agent</span></summary>
    <div className="platform-panel__body">
      <p>Explore editorial starting points. These choices do not select skills for you or certify compatibility.</p>
      <form className="guided-discovery__form" onSubmit={(event) => { event.preventDefault(); setShown(true); }}>
        <label>I want to<select value={goal} onChange={(event) => { setGoal(event.target.value); setShown(false); }}>{paths.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <label>My coding agent<select value={agent} onChange={(event) => { setAgent(event.target.value); setShown(false); }}>{agents.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <button type="submit">Show my starting points</button>
      </form>
      {shown && <section className="guided-discovery__result" aria-label="Your starting points">
        <h3>Your next steps</h3>
        <ol>
          <li><Link to={`/docs/${agent}/`}>Read the {agents.find((entry) => entry.id === agent)!.name} setup guide</Link></li>
          <li>Inspect <Link to={`/plugins/?pack=${pack.id}`}>{pack.name}</Link>: {pack.why}</li>
          {workflow && <li>Explore the <button className="platform-text-button" type="button" onClick={() => onWorkflow(workflow.id)}>{workflow.name}</button> workflow below, then review individual candidates.</li>}
          <li><Link to={`/core/?category=${path.category}`}>Browse the relevant catalog category</Link> and choose a few skills to compare.</li>
        </ol>
        <p>Your agent should inspect the instructions and select exact IDs for your project. Optional tools and services have their own requirements.</p>
      </section>}
    </div>
  </details>;
}
