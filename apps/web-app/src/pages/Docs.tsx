import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import docs from '../data/docs.json';
import { usePageMeta } from '../hooks/usePageMeta';
import { docsUrl } from '../utils/docs';
import { getSkillHeadings, remarkSkillHeadings } from '../utils/skillMarkdown';
import NotFound from './NotFound';
import './Docs.css';

const sources = import.meta.glob('../../../../docs/users/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const groups = [...new Set(docs.map((doc) => doc.group))];

export default function Docs() {
  const { slug } = useParams();
  const { hash, pathname } = useLocation();
  const [query, setQuery] = useState('');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const doc = docs.find((entry) => entry.slug === slug);
  const content = doc ? sources[`../../../../docs/users/${doc.slug}.md`] : '';
  const outline = getSkillHeadings(content || '');
  const index = docs.findIndex((entry) => entry.slug === slug);
  const missing = Boolean(slug && (!doc || !content));
  usePageMeta({
    title: `${missing ? 'Page not found' : doc?.title || 'Documentation'} | Agentic Awesome Skills`,
    description: doc ? `${doc.title}: guides and reference for Agentic Awesome Skills.` : 'Learn AAS Core, install skills, configure integrations, and follow practical workflows.',
    canonicalPath: slug ? `/docs/${slug}/` : '/docs/',
    robots: missing ? 'noindex, follow' : 'index, follow',
  });
  useEffect(() => {
    if (hash) {
      try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); } catch { /* Invalid fragment. */ }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash, pathname]);
  if (slug && (!doc || !content)) return <NotFound />;
  return (
    <div className="docs-page">
      <header className="docs-header">
        <Link to="/docs/" className="docs-eyebrow">AAS / DOCUMENTATION</Link>
        {doc ? <p className="docs-title">{doc.title}</p> : <h1>A guide for every next step.</h1>}
        <p>{doc ? doc.group : 'Start with AAS Core, explore integrations, and put your skills to work.'}</p>
      </header>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <button className="docs-toggle" type="button" aria-expanded={navigationOpen} aria-controls="docs-navigation" onClick={() => setNavigationOpen(!navigationOpen)}>Browse documentation {navigationOpen ? '−' : '+'}</button>
          <div id="docs-navigation" className={`docs-navigation ${navigationOpen ? 'is-open' : ''}`}>
          <label htmlFor="docs-search">Find a guide</label>
          <input id="docs-search" type="search" placeholder="Search documentation" value={query} onChange={(event) => setQuery(event.target.value)} />
          <nav aria-label="Documentation">
            <NavLink to="/docs/" end>Overview</NavLink>
            {groups.map((group) => {
              const entries = docs.filter((entry) => entry.group === group && `${entry.title} ${entry.group}`.toLowerCase().includes(query.toLowerCase()));
              return entries.length > 0 && <section key={group}><h2>{group}</h2>{entries.map((entry) => <NavLink key={entry.slug} to={`/docs/${entry.slug}/`}>{entry.title}</NavLink>)}</section>;
            })}
            {!docs.some((entry) => `${entry.title} ${entry.group}`.toLowerCase().includes(query.toLowerCase())) && <p role="status">No guides found.</p>}
          </nav>
          </div>
        </aside>
        {doc ? <div className="docs-content">
          {outline.length > 0 && <details className="docs-outline"><summary>On this page</summary><nav aria-label="On this page">{outline.map((heading) => <a key={heading.id} href={`#${heading.id}`}>{heading.label}</a>)}</nav></details>}
          <article className="markdown-body">
            <Markdown remarkPlugins={[remarkGfm, remarkSkillHeadings]} urlTransform={(url, key) => docsUrl(url, doc.slug, key === 'src')}>{content}</Markdown>
          </article>
          <nav className="docs-pagination" aria-label="Adjacent guides">
            {index > 0 && <Link to={`/docs/${docs[index - 1].slug}/`}>← {docs[index - 1].title}</Link>}
            {index < docs.length - 1 && <Link to={`/docs/${docs[index + 1].slug}/`}>{docs[index + 1].title} →</Link>}
          </nav>
        </div> : <div className="docs-content">
          <Link className="docs-start" to="/docs/getting-started/"><span>NEW TO AAS?</span><h2>Start with your first skill stack →</h2><p>Set up AAS Core and review the skills your agent selects for your project.</p></Link>
          <div className="docs-grid">{groups.map((group) => <section key={group}><h2>{group}</h2>{docs.filter((entry) => entry.group === group).map((entry) => <Link key={entry.slug} to={`/docs/${entry.slug}/`}>{entry.title}<span aria-hidden="true">↗</span></Link>)}</section>)}</div>
        </div>}
      </div>
    </div>
  );
}
