import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DocsCodeBlock from '../components/DocsCodeBlock';
import DocsSearch from '../components/DocsSearch';
import { loadGuide } from '../utils/docsContent';
import docs from '../data/docs.json';
import socialGuides from '../data/docs-social.json';
import { usePageMeta } from '../hooks/usePageMeta';
import { docsUrl } from '../utils/docs';
import { getSkillHeadings, remarkSkillHeadings } from '../utils/skillMarkdown';
import NotFound from './NotFound';
import './Docs.css';

const groups = [...new Set(docs.map((doc) => doc.group))];

export default function Docs() {
  const { slug } = useParams();
  const { hash, pathname } = useLocation();
  const [query, setQuery] = useState('');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const doc = docs.find((entry) => entry.slug === slug);
  const metadata = doc ? __DOCS_METADATA__[doc.slug] : undefined;
  const canonical = `https://aaskills.tech/docs/${doc ? `${doc.slug}/` : ''}`;
  const [loaded, setLoaded] = useState<{ slug: string; content: string }>();
  const [failedSlug, setFailedSlug] = useState('');
  const [attempt, setAttempt] = useState(0);
  const content = loaded && loaded.slug === slug ? loaded.content : '';
  const previousPath = useRef(pathname);
  const focusAfterNavigation = useRef(false);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      focusAfterNavigation.current = true;
    }
    if (focusAfterNavigation.current && (!doc || content)) {
      document.getElementById('docs-content')?.focus({ preventScroll: true });
      focusAfterNavigation.current = false;
    }
  }, [pathname, doc, content]);
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    loadGuide(doc.slug).then(
      (text) => { if (!cancelled) setLoaded({ slug: doc.slug, content: text }); },
      () => { if (!cancelled) setFailedSlug(doc.slug); },
    );
    return () => { cancelled = true; };
  }, [doc, attempt]);
  const outline = useMemo(() => getSkillHeadings(content || ''), [content]);
  const [activeHeading, setActiveHeading] = useState('');
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = outline[0]?.id || '';
        for (const heading of outline) {
          const element = document.getElementById(heading.id);
          if (element && element.getBoundingClientRect().top <= 140) current = heading.id;
        }
        if (outline.length && window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
          current = outline[outline.length - 1].id;
        }
        setActiveHeading(current);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [outline]);
  const index = docs.findIndex((entry) => entry.slug === slug);
  const missing = Boolean(slug && !doc);
  usePageMeta({
    title: `${missing ? 'Page not found' : doc?.title || 'Documentation'} | Agentic Awesome Skills`,
    description: doc ? `${doc.title}: guides and reference for Agentic Awesome Skills.` : 'Learn AAS Core, install skills, configure integrations, and follow practical workflows.',
    canonicalPath: slug ? `/docs/${slug}/` : '/docs/',
    ogImage: doc && socialGuides.includes(doc.slug) ? `social/docs/${doc.slug}.png` : undefined,
    robots: missing ? 'noindex, follow' : 'index, follow',
    jsonLd: missing ? [] : [{
      '@context': 'https://schema.org',
      '@type': doc ? ['WebPage', 'TechArticle'] : 'WebPage',
      name: doc?.title || 'Documentation',
      headline: doc?.title || 'Documentation',
      url: canonical,
      mainEntityOfPage: canonical,
      ...(metadata ? { dateModified: metadata.modified, version: metadata.commit } : {}),
    }, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aaskills.tech/' },
        { '@type': 'ListItem', position: 2, name: 'Documentation', item: 'https://aaskills.tech/docs/' },
        ...(doc ? [{ '@type': 'ListItem', position: 3, name: doc.title, item: canonical }] : []),
      ],
    }],
  });
  useEffect(() => {
    if (hash) {
      try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); } catch { /* Invalid fragment. */ }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash, pathname, content]);
  if (missing) return <NotFound />;
  return (
    <div className="docs-page">
      <a className="docs-skip" href={`${pathname}#docs-content`}>Skip documentation navigation</a>
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
          {query.trim() ? <DocsSearch query={query} onNavigate={() => { setQuery(''); setNavigationOpen(false); }} /> : <nav aria-label="Documentation">
            <NavLink to="/docs/" end>Overview</NavLink>
            {groups.map((group) => {
              const entries = docs.filter((entry) => entry.group === group && `${entry.title} ${entry.group}`.toLowerCase().includes(query.toLowerCase()));
              return entries.length > 0 && <section key={group}><h2>{group}</h2>{entries.map((entry) => <NavLink key={entry.slug} to={`/docs/${entry.slug}/`}>{entry.title}</NavLink>)}</section>;
            })}
            {!docs.some((entry) => `${entry.title} ${entry.group}`.toLowerCase().includes(query.toLowerCase())) && <p role="status">No guides found.</p>}
          </nav>}
          </div>
        </aside>
        {doc ? <div className="docs-content" id="docs-content" tabIndex={-1}>
          <nav className="docs-breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/docs/">Documentation</Link><span aria-hidden="true">/</span><span aria-current="page">{doc.title}</span></nav>
          {metadata && <div className="docs-metadata">
            <span>Updated <time dateTime={metadata.modified}>{metadata.modified.slice(0, 10)}</time></span>
            <a href={`https://github.com/sickn33/agentic-awesome-skills/blob/${metadata.commit}/${metadata.sourcePath}`}>View source · {metadata.commit.slice(0, 7)}</a>
            <a href={`https://github.com/sickn33/agentic-awesome-skills/edit/main/${metadata.sourcePath}`}>Edit this page</a>
          </div>}
          {!content && (failedSlug === doc.slug
            ? <p role="alert">This guide could not load. <button type="button" onClick={() => { setFailedSlug(''); setAttempt(attempt + 1); }}>Retry guide</button></p>
            : <p role="status">Loading guide…</p>)}
          {outline.length > 0 && <details className="docs-outline" open><summary>On this page</summary><nav aria-label="On this page">{outline.map((heading) => <a key={heading.id} href={`${pathname}#${heading.id}`} aria-current={activeHeading === heading.id ? 'location' : undefined}>{heading.label}</a>)}</nav></details>}
          <article className="markdown-body">
            <Markdown remarkPlugins={[remarkGfm, remarkSkillHeadings]} rehypePlugins={[rehypeHighlight]} components={{ pre: ({ children, className }) => <DocsCodeBlock className={className}>{children}</DocsCodeBlock> }} urlTransform={(url, key) => docsUrl(url, doc.slug, key === 'src')}>{content}</Markdown>
          </article>
          <section className="docs-related" aria-label="Related guides"><h2>Continue exploring</h2>{docs.filter((entry) => entry.group === doc.group && entry.slug !== doc.slug).slice(0, 3).map((entry) => <Link key={entry.slug} to={`/docs/${entry.slug}/`}>{entry.title} →</Link>)}</section>
          <nav className="docs-pagination" aria-label="Adjacent guides">
            {index > 0 && <Link to={`/docs/${docs[index - 1].slug}/`}>← {docs[index - 1].title}</Link>}
            {index < docs.length - 1 && <Link to={`/docs/${docs[index + 1].slug}/`}>{docs[index + 1].title} →</Link>}
          </nav>
        </div> : <div className="docs-content" id="docs-content" tabIndex={-1}>
          <Link className="docs-start" to="/docs/getting-started/"><span>NEW TO AAS?</span><h2>Start with your first skill stack →</h2><p>Set up AAS Core and review the skills your agent selects for your project.</p></Link>
          <section className="docs-audiences" aria-label="Documentation by audience">
            <h2>Find your path</h2>
            <div className="docs-grid">
              <section><h3>Using AAS</h3><p>Install, discover skills, and build a reviewed stack.</p><Link to="/docs/getting-started/">User guides →</Link></section>
              <section><h3>Building skills</h3><p>Understand skill structure and contribution standards.</p><a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/docs/contributors/skill-anatomy.md">Developer documentation on GitHub ↗</a></section>
              <section><h3>Maintaining AAS</h3><p>Follow protected review, merge, and release procedures.</p><a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/.github/MAINTENANCE.md">Maintainer documentation on GitHub ↗</a></section>
              <section><h3>CLI and MCP reference</h3><p>Configure the local runtime and understand its supported contracts.</p><Link to="/docs/aas-core/">Core reference →</Link></section>
              <section><h3>Troubleshooting</h3><p>Resolve installation issues and find recovery instructions.</p><Link to="/docs/faq/">Help and frequently asked questions →</Link></section>
            </div>
          </section>
          <div className="docs-grid">{groups.map((group) => <section key={group}><h2>{group}</h2>{docs.filter((entry) => entry.group === group).map((entry) => <Link key={entry.slug} to={`/docs/${entry.slug}/`}>{entry.title}<span aria-hidden="true">↗</span></Link>)}</section>)}</div>
        </div>}
      </div>
    </div>
  );
}
