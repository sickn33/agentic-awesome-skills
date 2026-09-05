import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { VirtuosoGrid } from 'react-virtuoso';
import { categoryFacet, matchCatalogSkill, searchMode, type SearchMode } from '../utils/catalogSearch';
import { SkillCard } from '../components/SkillCard';
import { ShortlistReview } from '../components/ShortlistReview';
import { Icon } from '../components/ui/Icon';
import { useSkills } from '../context/SkillContext';
import { seoLandingPages } from '../data/seoLandingPages';
import { usePageMeta } from '../hooks/usePageMeta';
import { useSkillShortlist } from '../hooks/useSkillShortlist';
import type { CategoryStats, SyncMessage } from '../types';
import { buildHomeMeta, getHomeFaqItems, toIndexableRoutePath } from '../utils/seo';

const conceptCards = [
  { title: 'AAS Core preview', body: 'The local boundary that validates an agent-selected skill stack and immutable plan preview.' },
  { title: 'Local MCP', body: 'The agent-facing tools for neutral catalog retrieval, inspection, composition, and stack comparison.' },
  { title: 'Catalog', body: 'The complete evidence-backed source the coding agent searches before selecting exact skills.' },
  { title: 'Workbench', body: 'A browser-local review surface for stack manifests and immutable plans.' },
  { title: 'Plugins', body: 'Focused distributions for users who prefer a packaged domain surface.' },
] as const;

const integrationGuides = [
  { name: 'Claude Code', href: 'https://github.com/sickn33/agentic-awesome-skills/blob/main/docs/users/claude-code-skills.md' },
  { name: 'Cursor', href: 'https://github.com/sickn33/agentic-awesome-skills/blob/main/docs/users/cursor-skills.md' },
  { name: 'Codex CLI', href: 'https://github.com/sickn33/agentic-awesome-skills/blob/main/docs/users/codex-cli-skills.md' },
  { name: 'Gemini CLI', href: 'https://github.com/sickn33/agentic-awesome-skills/blob/main/docs/users/gemini-cli-skills.md' },
  { name: 'Antigravity', href: 'https://github.com/sickn33/agentic-awesome-skills#choose-your-tool' },
] as const;

const syncFeatureEnabled = (
  (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_ENABLE_SKILLS_SYNC === 'true'
);

function labelCategory(category: string): string {
  if (category === 'all') return 'All categories';
  return category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitialFilter(searchParams: URLSearchParams, key: string, fallback: string): string {
  return searchParams.get(key)?.trim() || fallback;
}

/** Keep a ref pointing at the latest committed value without writing during render. */
function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

const isMacLike =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '',
  );
const searchShortcutHint = isMacLike ? '⌘K' : 'Ctrl K';

export function Home(): React.ReactElement {
  const { skills, stars, loading, error, refreshSkills } = useSkills();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => getInitialFilter(searchParams, 'q', ''));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getInitialFilter(searchParams, 'q', ''));
  const [categoryFilter, setCategoryFilter] = useState(() => categoryFacet(getInitialFilter(searchParams, 'category', 'all')));
  const [matchMode, setMatchMode] = useState<SearchMode>(() => searchMode(searchParams.get('match')));
  const [requiredTerms, setRequiredTerms] = useState(() => getInitialFilter(searchParams, 'required', ''));
  const [riskFilter, setRiskFilter] = useState(() => getInitialFilter(searchParams, 'risk', 'all'));
  const [sourceFilter, setSourceFilter] = useState(() => getInitialFilter(searchParams, 'source', 'all'));
  const [scopeFilter, setScopeFilter] = useState(() => getInitialFilter(searchParams, 'scope', 'all'));
  const [sortBy, setSortBy] = useState(() => getInitialFilter(searchParams, 'sort', 'default'));
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<SyncMessage | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { ids: shortlistIds, toggle: toggleShortlist, clear: clearShortlist } = useSkillShortlist();
  // Set right before writing the URL ourselves so the URL->state listener below
  // can tell its own writes apart from browser navigation (back/forward) and
  // restore filters from the URL instead of letting them get overwritten back.
  const skipNextUrlSyncRef = useRef(false);
  // Latest committed URL. The state->URL effect compares against this ref
  // instead of subscribing to searchParams, so it never re-fires on
  // back/forward navigation and overwrites the restored URL with stale state.
  const searchParamsRef = useLatest(searchParams);
  // setSearchParams is not referentially stable in react-router v8 (it is
  // rebuilt whenever location.search changes), so holding it in a ref keeps the
  // state->URL effect from re-running on every navigation.
  const setSearchParamsRef = useLatest(setSearchParams);

  usePageMeta(buildHomeMeta(skills.length));

  const faqItems = getHomeFaqItems(skills.length);
  const catalogCountLabel = skills.length > 0 ? skills.length.toLocaleString('en-US') : '1,900+';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  // State -> URL: keep the address bar shareable/bookmarkable as the user
  // changes filters. Uses replace so typing in search does not pollute history.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (matchMode !== 'all') next.set('match', matchMode);
    if (requiredTerms) next.set('required', requiredTerms);
    if (categoryFilter !== 'all') next.set('category', categoryFilter);
    if (riskFilter !== 'all') next.set('risk', riskFilter);
    if (sourceFilter !== 'all') next.set('source', sourceFilter);
    if (scopeFilter !== 'all') next.set('scope', scopeFilter);
    if (sortBy !== 'default') next.set('sort', sortBy);
    if (next.toString() !== searchParamsRef.current.toString()) {
      skipNextUrlSyncRef.current = true;
      setSearchParamsRef.current(next, { replace: true });
    }
  }, [categoryFilter, matchMode, requiredTerms, riskFilter, scopeFilter, search, searchParamsRef, setSearchParamsRef, sortBy, sourceFilter]);

  // URL -> State: restore filters after browser back/forward navigation or a
  // manual address-bar edit. Without this, the state->URL effect would
  // immediately overwrite the restored URL with the stale in-memory filters.
  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false;
      return;
    }
    const nextSearch = getInitialFilter(searchParams, 'q', '');
    setSearch(nextSearch);
    setDebouncedSearch(nextSearch); // avoid a 300ms unfiltered flash on load/nav
    setCategoryFilter(categoryFacet(getInitialFilter(searchParams, 'category', 'all')));
    setMatchMode(searchMode(searchParams.get('match')));
    setRequiredTerms(getInitialFilter(searchParams, 'required', ''));
    setRiskFilter(getInitialFilter(searchParams, 'risk', 'all'));
    setSourceFilter(getInitialFilter(searchParams, 'source', 'all'));
    setScopeFilter(getInitialFilter(searchParams, 'scope', 'all'));
    setSortBy(getInitialFilter(searchParams, 'sort', 'default'));
  }, [searchParams]);

  const searchMatches = useMemo(() => new Map(skills.map((skill) => [skill.id, matchCatalogSkill(skill, debouncedSearch, matchMode, requiredTerms)])), [skills, debouncedSearch, matchMode, requiredTerms]);

  const filteredSkills = useMemo(() => {
    let result = [...skills];
    result = result.filter((skill) => searchMatches.get(skill.id)?.matches);
    if (categoryFilter !== 'all') result = result.filter((skill) => categoryFacet(skill.category) === categoryFilter);
    if (riskFilter !== 'all') result = result.filter((skill) => (skill.risk || 'unknown') === riskFilter);
    if (sourceFilter !== 'all') result = result.filter((skill) => (skill.source_type || 'community') === sourceFilter);
    if (scopeFilter === 'shortlist') result = result.filter((skill) => shortlistIds.includes(skill.id));
    if (sortBy === 'stars') result.sort((a, b) => (stars[b.id] || 0) - (stars[a.id] || 0));
    if (sortBy === 'newest') result.sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));
    if (sortBy === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [categoryFilter, searchMatches, riskFilter, scopeFilter, shortlistIds, skills, sortBy, sourceFilter, stars]);

  const { categories, categoryStats } = useMemo(() => {
    const stats: CategoryStats = Object.create(null);
    skills.forEach((skill) => { const category = categoryFacet(skill.category); stats[category] = (stats[category] || 0) + 1; });
    const ordered = Object.keys(stats)
      .filter((category) => category !== 'uncategorized')
      .sort((a, b) => stats[b] - stats[a]);
    if (stats.uncategorized) ordered.push('uncategorized');
    return { categories: ['all', ...ordered], categoryStats: stats };
  }, [skills]);

  const catalogHealth = useMemo(() => {
    const latest = skills.reduce<string | null>((current, skill) => !current || (skill.date_added || '') > current ? skill.date_added || null : current, null);
    const documented = skills.filter((skill) => skill.tags && skill.tags.length > 0).length;
    return { latest, documented };
  }, [skills]);

  const shortlistSkills = useMemo(() => skills.filter((skill) => shortlistIds.includes(skill.id)), [shortlistIds, skills]);

  const clearFilters = () => {
    setSearch('');
    setRequiredTerms('');
    setMatchMode('all');
    setCategoryFilter('all');
    setRiskFilter('all');
    setSourceFilter('all');
    setScopeFilter('all');
    setSortBy('default');
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const response = await fetch('/api/refresh-skills', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSyncMsg(data.upToDate
          ? { type: 'info', text: 'Skills are already up to date.' }
          : { type: 'success', text: `Synced ${data.count} skills.` });
        if (!data.upToDate) await refreshSkills();
      } else {
        setSyncMsg({ type: 'error', text: String(data.error) });
      }
    } catch {
      setSyncMsg({ type: 'error', text: 'Network error' });
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  return (
    <div className="catalog-layout">
      <aside className="catalog-rail" aria-label="Skill categories">
        <p className="catalog-rail__label">Browse</p>
        <nav>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={categoryFilter === category ? 'is-active' : ''}
              aria-pressed={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            >
              <span>{labelCategory(category)}</span>
              <span>{category === 'all' ? skills.length : categoryStats[category] || 0}</span>
            </button>
          ))}
        </nav>
        <Link to={toIndexableRoutePath('/workbench')} className="catalog-rail__workbench">
          <Icon name="fileCode" size={17} />
          AAS Core Workbench
        </Link>
      </aside>

      <div className="catalog-content">
        <section className="catalog-hero">
          <h1>AAS Core: agent-first skill stacks for Codex, Claude Code, and compatible clients</h1>
          <p><strong>Search. Choose. Validate. Preview.</strong></p>
          <p>Let your coding agent choose exact IDs, preserve its project profile in <code>aas-stack.json</code>, and preview an immutable plan without target writes, backed by {catalogCountLabel} cataloged skills.</p>

          <label className="catalog-search">
            <span className="sr-only">Search skills</span>
            <Icon name="search" size={23} />
            <input
              type="search"
              aria-label="Search skills"
              placeholder="Search skills, tools, or workflows"
              maxLength={256}
              value={search}
              ref={searchInputRef}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>{searchShortcutHint}</kbd>
          </label>

          <div className="catalog-search-options">
            <label>Match
              <select aria-label="Search matching" value={matchMode} onChange={(event) => setMatchMode(searchMode(event.target.value))}>
                <option value="all">All words</option>
                <option value="any">Any word</option>
                <option value="fuzzy">Approximate</option>
              </select>
            </label>
            <label>Must also include
              <input aria-label="Required search terms" type="text" value={requiredTerms} maxLength={1024} placeholder="e.g. postgres" onChange={(event) => setRequiredTerms(event.target.value)} />
            </label>
          </div>
          <p className="catalog-note">{matchMode === 'fuzzy' ? 'Approximate matching allows gaps between letters. Required terms still match whole words.' : 'Match whole words and known aliases across names, descriptions, categories, and tags.'} Results keep catalog order unless you choose another sort.</p>

          <div className="catalog-mobile-categories" aria-label="Quick category filters">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category}
                type="button"
                className={categoryFilter === category ? 'is-active' : ''}
                onClick={() => setCategoryFilter(category)}
              >
                {labelCategory(category)}
              </button>
            ))}
          </div>

          <div className="catalog-toolbar">
            <div>
              <label>
                <span className="sr-only">Filter by category</span>
                <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {labelCategory(category)}{category === 'all' ? '' : ` (${categoryStats[category] || 0})`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by risk</span>
                <select aria-label="Filter by risk" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                  <option value="all">All risk levels</option>
                  <option value="safe">Safe</option>
                  <option value="none">None</option>
                  <option value="unknown">Unknown</option>
                  <option value="critical">Critical</option>
                  <option value="offensive">Offensive</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by source</span>
                <select aria-label="Filter by source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="all">All sources</option>
                  <option value="official">Official</option>
                  <option value="community">Community</option>
                  <option value="self">Self</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by shortlist</span>
                <select aria-label="Filter by shortlist" value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}>
                  <option value="all">Full catalog</option>
                  <option value="shortlist">My shortlist ({shortlistIds.length})</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Sort skills</span>
                <select aria-label="Sort skills" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="default">Catalog order</option>
                  <option value="stars">Community saves</option>
                  <option value="newest">Newest</option>
                  <option value="az">A to Z</option>
                </select>
              </label>
            </div>
            <Link to={toIndexableRoutePath('/workbench')}>Review an AAS Core stack <Icon name="arrowRight" size={16} /></Link>
          </div>
        </section>

        <ShortlistReview skills={shortlistSkills} onRemove={toggleShortlist} onClear={clearShortlist} />

        <section className="catalog-results" aria-labelledby="catalog-results-title">
          <header>
            <div>
              <h2 id="catalog-results-title">{filteredSkills.length.toLocaleString('en-US')} skills</h2>
              <p>Inspect evidence, select exact IDs, and preview before writing.</p>
            </div>
            {syncFeatureEnabled ? (
              <button type="button" onClick={() => void handleSync()} disabled={syncing}>
                <Icon name="refresh" size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync skills'}
              </button>
            ) : <span className="catalog-mode">Public catalog mode</span>}
          </header>

          {!syncFeatureEnabled && (
            <p className="catalog-note">Catalog sync is a maintainer-only workflow; this public view shows the last published catalog.</p>
          )}
          {syncMsg && <p className={`catalog-message catalog-message--${syncMsg.type}`}>{syncMsg.text}</p>}

          {loading ? (
            <div data-testid="loader" className="catalog-loading" aria-label="Loading skills">
              {[...Array(5)].map((_, index) => <div key={index} />)}
            </div>
          ) : error && skills.length === 0 ? (
            <div className="catalog-empty">
              <Icon name="alertCircle" size={28} />
              <h3>Unable to load skills</h3>
              <p>{error}</p>
              <button type="button" onClick={() => void refreshSkills()}>Retry loading catalog</button>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="catalog-empty">
              <Icon name="search" size={28} />
              <h3>No skills found</h3>
              <p>Try a broader search or another category.</p>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <VirtuosoGrid
              useWindowScroll
              totalCount={filteredSkills.length}
              listClassName="catalog-result-list"
              itemContent={(index) => {
                const skill = filteredSkills[index];
                return <SkillCard key={skill.id} skill={skill} starCount={stars[skill.id] || 0} matchExplanation={searchMatches.get(skill.id)?.explanation} shortlisted={shortlistIds.includes(skill.id)} onToggleShortlist={toggleShortlist} />;
              }}
            />
          )}
        </section>

        <section className="catalog-health" aria-labelledby="catalog-health-title">
          <div><p>Catalog health</p><h2 id="catalog-health-title">A quick view of the library you are choosing from.</h2></div>
          <dl>
            <div><dt>Cataloged skills</dt><dd>{skills.length.toLocaleString('en-US')}</dd></div>
            <div><dt>Categories</dt><dd>{Math.max(categories.length - 1, 0)}</dd></div>
            <div><dt>Tagged for discovery</dt><dd>{skills.length ? Math.round((catalogHealth.documented / skills.length) * 100) : 0}%</dd></div>
            <div><dt>Latest addition</dt><dd>{catalogHealth.latest || 'Not recorded'}</dd></div>
          </dl>
          <p>Search and shortlist stay in this browser. Check each skill's setup, source, and instructions before using it.</p>
        </section>

        <section className="catalog-support" aria-label="Catalog guides">
          <div className="catalog-support__intro">
            <h2>How AAS Core uses the catalog</h2>
            <p>The coding agent chooses from catalog evidence; the local MCP validates the selection, the CLI persists and plans it, and Workbench reviews the resulting artifacts.</p>
          </div>
          <div className="catalog-support__concepts">
            {conceptCards.map((card) => (
              <article key={card.title}><h3>{card.title}</h3><p>{card.body}</p></article>
            ))}
          </div>
          <div className="catalog-support__columns">
            <div>
              <h2>Runtime guides</h2>
              <nav>{integrationGuides.map((guide) => <a key={guide.name} href={guide.href} target="_blank" rel="noreferrer">{guide.name}<Icon name="arrowRight" size={14} /></a>)}</nav>
            </div>
            <div>
              <h2>Search topics</h2>
              <nav>{seoLandingPages.map((page) => <Link key={page.slug} to={toIndexableRoutePath(`/topics/${page.slug}`)}>{page.h1}<Icon name="arrowRight" size={14} /></Link>)}</nav>
            </div>
          </div>
          <div className="catalog-faq">
            <h2>Quick FAQ</h2>
            {faqItems.map((item) => (
              <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
