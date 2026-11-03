import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MagnifyingGlass, Check, Copy, FolderOpen, GithubLogo } from '@phosphor-icons/react';
import { specializedPlugins } from '../data/specializedPlugins';
import { packJourneys, packTitles } from '../data/packJourneys';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildPluginsMeta, toIndexableRoutePath } from '../utils/seo';
import { releaseFileUrl } from '../utils/catalogRelease';
import './Plugins.css';

const categoryLabels: Record<string, string> = { build: 'Development', design: 'Design & content', data: 'Data', agents: 'AI & automation', quality: 'Quality & security', growth: 'Growth' };

export function Plugins() {
  const [params, setParams] = useSearchParams();
  const requestedPack = specializedPlugins.find(pack => pack.id === params.get('pack') || pack.aliases.some(alias => alias === params.get('pack')));
  const categoryId = params.get('work') === 'all' ? 'all' : packJourneys.find(item => item.id === params.get('work'))?.id || (requestedPack ? packJourneys.find(item => item.packs.includes(requestedPack.id))?.id : null) || 'build';
  const category = packJourneys.find(item => item.id === categoryId);
  const [query, setQuery] = useState('');
  const [copyState, setCopyState] = useState('');
  const idField = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => specializedPlugins.filter(pack => {
    if (category && !category.packs.includes(pack.id)) return false;
    const term = query.trim().toLowerCase();
    return !term || [packTitles[pack.id] || pack.name, pack.name, pack.id, ...pack.aliases, pack.why, ...pack.skills].some(text => text.toLowerCase().includes(term));
  }), [category, query]);
  const active = filtered.find(pack => pack.id === requestedPack?.id) || filtered[0];
  usePageMeta(buildPluginsMeta(specializedPlugins.length));

  function chooseCategory(id: string) {
    setQuery(''); setCopyState('');
    setParams({ work: id }, { replace: true, preventScrollReset: true });
  }
  function choosePack(id: string) {
    setCopyState(''); setParams({ work: categoryId, pack: id }, { replace: true, preventScrollReset: true });
    if (window.matchMedia?.('(max-width: 760px)').matches) {
      requestAnimationFrame(() => { document.getElementById('pack-detail-title')?.focus({ preventScroll: true }); document.getElementById('pack-detail')?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    }
  }
  async function copyId() {
    if (!active) return;
    try { await navigator.clipboard.writeText(active.id); setCopyState('Pack ID copied'); }
    catch { idField.current?.focus(); idField.current?.select(); setCopyState('Select and copy the pack ID.'); }
  }

  return <div className="packs-page brand-wrap">
    <header className="packs-intro">
      <div><h1>AAS Packs</h1><p>Install related skills as one pack.</p><a className="packs-primary" href="#pack-library">Explore the packs</a><span className="packs-total">{specializedPlugins.length} packs</span></div>
      <img src={`${import.meta.env.BASE_URL}illustrations/aas-packs.png`} width="1100" height="760" alt="Related SKILL.md manuals held together as one AAS pack."/>
    </header>
    <section className="packs-library" id="pack-library" aria-labelledby="packs-library-title">
      <header className="packs-library-heading"><h2 id="packs-library-title">Choose your work</h2><p>Browse packs and their included skills.</p></header>
      <div className="packs-categories" role="group" aria-label="Filter packs by work">
        {packJourneys.map(item => <button key={item.id} type="button" aria-pressed={categoryId === item.id} onClick={() => chooseCategory(item.id)}>{categoryLabels[item.id]}<span>{item.packs.length}</span></button>)}
        <button type="button" aria-pressed={categoryId === 'all'} onClick={() => chooseCategory('all')}>All packs<span>{specializedPlugins.length}</span></button>
      </div>
      <div className="packs-browser">
        <aside className="packs-index" aria-label="Available packs">
          <label className="packs-search"><MagnifyingGlass size={20} aria-hidden="true"/><input type="search" aria-label="Filter packs" placeholder="Find a pack" value={query} onChange={event => { setQuery(event.target.value); setCopyState(''); }}/></label>
          <p className="packs-results" role="status">{filtered.length} {filtered.length === 1 ? 'pack' : 'packs'}{category ? ` · ${categoryLabels[category.id]}` : ''}</p>
          <div className="packs-options">{filtered.map(pack => <button key={pack.id} type="button" aria-pressed={active?.id === pack.id} aria-controls="pack-detail" onClick={() => choosePack(pack.id)}><span>{packTitles[pack.id] || pack.name}</span><small>{pack.skills.length} skills</small>{active?.id === pack.id && <Check size={20} aria-hidden="true"/>}</button>)}</div>
          {filtered.length === 0 && <div className="packs-empty"><p>No packs match “{query}”.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></div>}
        </aside>
        {active ? <article className="packs-detail" id="pack-detail" key={active.id} aria-labelledby="pack-detail-title">
          <header className="packs-detail-cover"><div className="packs-detail-meta"><FolderOpen size={28} aria-hidden="true"/><span>{active.skills.length} skills in this pack</span></div><h2 id="pack-detail-title" tabIndex={-1}>{packTitles[active.id] || active.name}</h2><p>{active.why}</p><Link className="packs-primary" to="/docs/plugins/">Installation guide</Link></header>
          <div className="packs-detail-body">
            <section aria-labelledby="pack-contents-title"><h3 id="pack-contents-title">Included skills</h3><div className="packs-skills">{active.skills.map(id => <Link key={id} to={toIndexableRoutePath(`/skill/${encodeURIComponent(id)}`)}>{id}</Link>)}</div></section>
            <details className="packs-notes"><summary>Who it is for</summary><p>{active.audience}</p></details>
            <details className="packs-notes"><summary>A task to start with</summary>{active.defaultPrompts.map(prompt => <p key={prompt}>{prompt}</p>)}</details>
            {active.notFor.length > 0 && <details className="packs-notes"><summary>Scope & limits</summary><ul>{active.notFor.map(limit => <li key={limit}>{limit}</li>)}</ul></details>}
            <footer className="packs-install-info"><label htmlFor="pack-id">Pack ID</label><div className="packs-id-row"><input id="pack-id" ref={idField} value={active.id} readOnly/><button type="button" onClick={copyId} aria-label="Copy pack ID"><Copy size={20} aria-hidden="true"/></button></div><p aria-live="polite">{copyState}</p><a href={releaseFileUrl(`plugins/agentic-bundle-${active.id}`).replace('/blob/', '/tree/')} target="_blank" rel="noreferrer"><GithubLogo size={20} aria-hidden="true"/>View pack source</a></footer>
          </div>
        </article> : <div className="packs-no-selection"><FolderOpen size={48} aria-hidden="true"/><h2>Try another search</h2><p>Search by task, pack name or an included skill.</p><button className="packs-primary" onClick={() => { chooseCategory('all'); }}>See all packs</button></div>}
      </div>
    </section>
    <section className="packs-next"><div><h2>Need a different mix?</h2><p>Let your agent explore the full catalog with AAS Core and choose skills for your project.</p><Link className="packs-primary" to="/aas-core/">Explore AAS Core</Link></div><div><h3>Using your pack</h3><p>Install it in a compatible agent, then give the agent a task. External tools and services need their own setup.</p><Link className="packs-guide-link" to="/docs/plugins/">Read the installation guide</Link></div></section>
  </div>;
}
export default Plugins;
