import { Fragment, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import Markdown from 'react-markdown';
import { GithubLogo } from '@phosphor-icons/react';
import remarkGfm from 'remark-gfm';
import archive from '../data/releases.json';
import { usePageMeta } from '../hooks/usePageMeta';
import './Changelog.css';
import { releasePresentation } from '../utils/releasePresentation';
declare const __AAS_RELEASE_ENTRIES__: typeof archive.releases;
const releaseEntries = typeof __AAS_RELEASE_ENTRIES__ === 'undefined' ? [] : __AAS_RELEASE_ENTRIES__;
const releases = [...releaseEntries, ...archive.releases].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export default function Changelog() {
  usePageMeta({ title: 'Changelog | AAS', description: 'Browse AAS release notes, from the first version to today.', canonicalPath: '/changelog/', jsonLd: (url: string) => ({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Changelog', url }) });
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [limit, setLimit] = useState(30);
  const [browseOpen, setBrowseOpen] = useState(false);
  const requested = params.get('version');
  const selected = releases.find(r => r.tag === requested) || releases[0];
  const presentation = releasePresentation(selected);
  const selectedIndex = releases.findIndex(r => r.id === selected.id);
  function openRelease() { setBrowseOpen(false); requestAnimationFrame(() => document.getElementById('release-detail')?.scrollIntoView?.({ block: 'start' })); }
  const years = [...new Set(releases.map(r => r.publishedAt.slice(0, 4)))];
  const matches = useMemo(() => releases.filter(r => (year === 'all' || r.publishedAt.startsWith(year)) && `${r.tag} ${r.name} ${r.body}`.toLowerCase().includes(query.toLowerCase().trim())), [query, year]);
  return <div className="changelog-page brand-wrap">
    <header className="changelog-heading"><div><h1>Changelog</h1><p>AAS releases, from the first version to today.</p></div><a className="changelog-github" href="https://github.com/sickn33/agentic-awesome-skills/releases"><GithubLogo size={24} aria-hidden="true"/><span>GitHub releases<small>{releases.length} published versions</small></span></a></header>
    <div className="changelog-layout"><aside className="release-browser" aria-label="Browse releases">
      <button className="release-mobile-toggle" type="button" aria-expanded={browseOpen} aria-controls="release-browser-fields" onClick={() => setBrowseOpen(value => !value)}>Browse {releases.length} releases <span aria-hidden="true">{browseOpen ? '−' : '+'}</span></button><div id="release-browser-fields" className="release-browser-fields" data-open={browseOpen}><label htmlFor="release-search">Search releases</label><input id="release-search" type="search" placeholder="Version, skill or change" value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }}/>
      <div className="release-filters"><label htmlFor="release-year">Year</label><select id="release-year" value={year} onChange={e => {setYear(e.target.value); setLimit(30);}}><option value="all">All years</option>{years.map(y => <option key={y}>{y}</option>)}</select><span role="status">{matches.length} releases</span></div>
      <nav className="release-list" aria-label="Release versions">{matches.slice(0,limit).map((r,index) => <Fragment key={r.id}>{(index === 0 || matches[index-1].publishedAt.slice(0,7) !== r.publishedAt.slice(0,7)) && <div className="release-month">{new Date(r.publishedAt).toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'})}</div>}<Link onClick={openRelease} preventScrollReset to={`?version=${encodeURIComponent(r.tag)}`} aria-current={selected.id===r.id ? 'page' : undefined}><span>{r.tag}{r.prerelease && <small>Pre-release</small>}<time dateTime={r.publishedAt}>{new Date(r.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}</time></span>{releasePresentation(r).title !== r.tag && <div className="release-list-name">{releasePresentation(r).title}</div>}</Link></Fragment>)}{matches.length === 0 && <div className="release-empty"><p>No releases found.</p><button onClick={() => {setQuery(''); setYear('all'); setLimit(30);}}>Clear filters</button></div>}{matches.length > limit && <button type="button" onClick={() => setLimit(n => n+30)}>Show older releases ({matches.length-limit})</button>}</nav>
      <small className="release-sync">GitHub archive synced {formatDate(archive.fetchedAt)}</small></div>
    </aside>
    <article className="release-detail" id="release-detail" key={selected.id} aria-label={`Release ${selected.tag}`}>
      {requested && requested !== selected.tag && <p role="status" className="release-missing">Version not found. Showing the latest release.</p>}
      <header className="release-cover">
        <div className="release-meta"><span className="release-version">{selected.tag}</span><span className="release-status">{selected.prerelease ? 'Pre-release' : selected.id===releases.find(r=>!r.prerelease)?.id ? 'Latest release' : 'Release'}</span></div>
        <div className="release-title"><h2>{presentation.title}</h2></div>
        <div className="release-cover-bottom"><time dateTime={selected.publishedAt}>{formatDate(selected.publishedAt)}</time><a className="release-source" href={selected.url}><GithubLogo size={20} aria-hidden="true"/>View on GitHub</a></div>
      </header>
      <div className="release-notes"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{ h1: props => <h3>{props.children}</h3>, h2: props => <h3>{props.children}</h3>, img: props => <a href={props.src}>{props.alt || 'View image on GitHub'}</a>, a: props => <a {...props} href={props.href?.startsWith('/') ? `https://github.com${props.href}` : props.href} /> }}>{presentation.body || 'No release notes were provided for this version.'}</Markdown></div>
      <nav className="release-adjacent" aria-label="Adjacent releases">{selectedIndex > 0 && <Link preventScrollReset onClick={openRelease} to={`?version=${encodeURIComponent(releases[selectedIndex-1].tag)}`}><span>Newer release</span>{' '}<strong>{releases[selectedIndex-1].tag}</strong></Link>}{selectedIndex < releases.length-1 && <Link preventScrollReset onClick={openRelease} to={`?version=${encodeURIComponent(releases[selectedIndex+1].tag)}`}><span>Older release</span>{' '}<strong>{releases[selectedIndex+1].tag}</strong></Link>}</nav>
    </article></div>
  </div>;
}
