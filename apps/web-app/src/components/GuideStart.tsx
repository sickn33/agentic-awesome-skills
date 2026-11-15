import DocsSearch from './DocsSearch';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MagnifyingGlass, Terminal } from '@phosphor-icons/react';
import docs from '../data/docs.json';
import './GuideStart.css';

const agents = [
  { name: 'Codex', logo: 'openai', slug: 'codex-cli-skills' },
  { name: 'Claude Code', logo: 'claude', slug: 'claude-code-skills' },
  { name: 'Cursor', logo: 'cursor', slug: 'cursor-skills' },
  { name: 'T3 Code', logo: 't3', slug: 'getting-started', general: true },
  { name: 'Antigravity', logo: 'antigravity', slug: 'getting-started', general: true },
  { name: 'Other agent', slug: 'getting-started', general: true },
];
const groups = [...new Set(docs.map(doc => doc.group))];
export function GuideStart() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All topics');
  const results = useMemo(() => docs.filter(doc => (group === 'All topics' || doc.group === group) && `${doc.title} ${doc.group}`.toLowerCase().includes(query.trim().toLowerCase())), [group, query]);
  return <div className="guides-hub brand-wrap">
    <header className="guides-intro"><h1>AAS Guides</h1><p>Setup, usage and reference.</p></header>
    <section className="guides-start" aria-labelledby="guides-start-title">
      <div className="guides-first"><h2 id="guides-start-title">New to AAS?</h2><p>Install AAS and try your first task.</p><Link className="guides-button" to="/docs/getting-started/">Getting started</Link></div>
      <div className="guides-shortcuts"><Link to="/docs/aas-core/"><strong>Connect AAS Core</strong>{' '}<span>Let your agent find skills for your project</span></Link><Link to="/docs/plugins/"><strong>Install a pack</strong>{' '}<span>Add a collection of related skills</span></Link><Link to="/docs/usage/"><strong>Use your skills</strong>{' '}<span>Give your agent instructions and review the work</span></Link></div>
    </section>
    <section className="guides-setup" aria-labelledby="guides-setup-title"><div className="guides-section-heading"><h2 id="guides-setup-title">Set up your agent</h2><Link to="/docs/local-config/">Local configuration</Link></div><div className="guides-agents">{agents.map(agent => <Link key={agent.name} to={`/docs/${agent.slug}/`}>{agent.logo ? <img src={`${import.meta.env.BASE_URL}agents/${agent.logo}.svg`} width="32" height="32" alt=""/> : <Terminal size={32} aria-hidden="true"/>}<span><strong>{agent.name}</strong>{' '}<small>{agent.general ? 'General setup' : 'Setup guide'}</small></span></Link>)}</div><p className="guides-setup-note">T3 Code and Antigravity use the general guide. Check your app’s supported skill format.</p></section>
    <section className="guides-library" aria-labelledby="guides-library-title"><div className="guides-section-heading"><h2 id="guides-library-title">All guides</h2></div><div className="guides-filters"><label className="guides-search"><MagnifyingGlass size={20} aria-hidden="true"/><input type="search" aria-label="Find a guide" placeholder="Find a guide" value={query} onChange={event => setQuery(event.target.value)}/></label><label className="guides-topic">Topic<select value={group} onChange={event => setGroup(event.target.value)}>{['All topics', ...groups].map(item => <option key={item}>{item}</option>)}</select></label></div><p className="guides-result-count" role="status">{results.length} {results.length === 1 ? 'guide' : 'guides'}{query.trim() && ` matching “${query.trim()}”`}</p>{query.trim() && <DocsSearch query={query} onNavigate={() => setQuery('')} />}<nav className="guides-directory" aria-label="Documentation">{groups.map(item => {const entries = results.filter(doc => doc.group === item); return entries.length > 0 && <section key={item}><h3>{item}</h3>{entries.map(doc => <Link key={doc.slug} to={`/docs/${doc.slug}/`}>{doc.title}</Link>)}</section>;})}</nav>{results.length === 0 && <div className="guides-empty"><h3>No guides found</h3><p>Try a different title or topic.</p><button className="guides-button" onClick={() => {setQuery(''); setGroup('All topics');}}>Clear filters</button></div>}</section>
    <aside className="guides-help"><h2>Something not working?</h2><div><Link to="/docs/agent-overload-recovery/">Too many skills loaded</Link><Link to="/docs/windows-truncation-recovery/">Windows recovery</Link><Link to="/docs/faq/">Common questions</Link></div></aside>
  </div>;
}
