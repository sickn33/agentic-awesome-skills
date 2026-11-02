import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { VirtuosoGrid } from 'react-virtuoso';
import { categoryFacet, matchCatalogSkill, searchMode, type SearchMode } from '../utils/catalogSearch';
import { CatalogNavigation } from '../components/CatalogNavigation';
import { CategoryRail } from '../components/CategoryRail';
import { GuidedDiscovery } from '../components/GuidedDiscovery';
import { SkillCollections } from '../components/SkillCollections';
import './CatalogExperience.css';
import { SkillCard } from '../components/SkillCard';
import { ShortlistReview } from '../components/ShortlistReview';
import OutcomeExplorer from '../components/OutcomeExplorer';
import WorkflowExplorer from '../components/WorkflowExplorer';
import { Icon } from '../components/ui/Icon';
import { useSkills } from '../context/SkillContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useSkillShortlist } from '../hooks/useSkillShortlist';
import type { CategoryStats, SyncMessage } from '../types';
import { buildHomeMeta, getHomeFaqItems, toIndexableRoutePath } from '../utils/seo';

const syncFeatureEnabled = (
  (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_ENABLE_SKILLS_SYNC === 'true'
);

const RISK_FILTERS = new Set(['all', 'safe', 'none', 'unknown', 'critical', 'offensive']);
const SOURCE_FILTERS = new Set(['all', 'official', 'community', 'self']);
const SCOPE_FILTERS = new Set(['all', 'shortlist']);
const VIEW_OPTIONS = new Set(['skills', 'workflows', 'collections']);
const SORT_OPTIONS = new Set(['default', 'stars', 'newest', 'az']);

function labelCategory(category: string): string {
  if (category === 'all') return 'All categories';
  return category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitialFilter(searchParams: URLSearchParams, key: string, fallback: string): string {
  return searchParams.get(key)?.trim() || fallback;
}

function getAllowedFilter(searchParams: URLSearchParams, key: string, allowed: ReadonlySet<string>, fallback: string): string {
  const value = getInitialFilter(searchParams, key, fallback);
  return allowed.has(value) ? value : fallback;
}

function getCategoryFilter(searchParams: URLSearchParams, categories: string[], hasCatalog: boolean): string {
  const value = categoryFacet(getInitialFilter(searchParams, 'category', 'all'));
  return !hasCatalog || value === 'all' || categories.includes(value) ? value : 'all';
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
  const { categories, categoryStats } = useMemo(() => {
    const stats: CategoryStats = Object.create(null);
    skills.forEach((skill) => { const category = categoryFacet(skill.category); stats[category] = (stats[category] || 0) + 1; });
    const ordered = Object.keys(stats)
      .filter((category) => category !== 'uncategorized')
      .sort((a, b) => stats[b] - stats[a]);
    if (stats.uncategorized) ordered.push('uncategorized');
    return { categories: ['all', ...ordered], categoryStats: stats };
  }, [skills]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => getAllowedFilter(searchParams, 'view', VIEW_OPTIONS, 'skills'));
  const [search, setSearch] = useState(() => getInitialFilter(searchParams, 'q', ''));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getInitialFilter(searchParams, 'q', ''));
  const [categoryFilter, setCategoryFilter] = useState(() => getCategoryFilter(searchParams, categories, skills.length > 0));
  const [matchMode, setMatchMode] = useState<SearchMode>(() => searchMode(searchParams.get('match')));
  const [requiredTerms, setRequiredTerms] = useState(() => getInitialFilter(searchParams, 'required', ''));
  const [riskFilter, setRiskFilter] = useState(() => getAllowedFilter(searchParams, 'risk', RISK_FILTERS, 'all'));
  const [sourceFilter, setSourceFilter] = useState(() => getAllowedFilter(searchParams, 'source', SOURCE_FILTERS, 'all'));
  const [scopeFilter, setScopeFilter] = useState(() => getAllowedFilter(searchParams, 'scope', SCOPE_FILTERS, 'all'));
  const [sortBy, setSortBy] = useState(() => getAllowedFilter(searchParams, 'sort', SORT_OPTIONS, 'default'));
  const [discoveryGoal, setDiscoveryGoal] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(() => matchMode !== 'all' || Boolean(requiredTerms) || riskFilter !== 'all' || sourceFilter !== 'all');
  const [workflowFocus, setWorkflowFocus] = useState('');
  const [activePanel, setActivePanel] = useState<'guided-discovery' | 'shortlist-review' | 'skill-collections' | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<SyncMessage | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { ids: shortlistIds, toggle: toggleShortlist, clear: clearShortlist, addMany: addToShortlist } = useSkillShortlist();
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

  const catalogCountLabel = skills.length > 0 ? skills.length.toLocaleString('en-US') : '';

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
    if (view !== 'skills') next.set('view', view);
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
  }, [categoryFilter, matchMode, requiredTerms, riskFilter, scopeFilter, search, searchParamsRef, setSearchParamsRef, sortBy, sourceFilter, view]);

  // URL -> State: restore filters after browser back/forward navigation or a
  // manual address-bar edit. Without this, the state->URL effect would
  // immediately overwrite the restored URL with the stale in-memory filters.
  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false;
      return;
    }
    setView(getAllowedFilter(searchParams, 'view', VIEW_OPTIONS, 'skills'));
    const nextSearch = getInitialFilter(searchParams, 'q', '');
    setSearch(nextSearch);
    setDebouncedSearch(nextSearch); // avoid a 300ms unfiltered flash on load/nav
    setCategoryFilter(getCategoryFilter(searchParams, categories, skills.length > 0));
    setMatchMode(searchMode(searchParams.get('match')));
    setRequiredTerms(getInitialFilter(searchParams, 'required', ''));
    setRiskFilter(getAllowedFilter(searchParams, 'risk', RISK_FILTERS, 'all'));
    setSourceFilter(getAllowedFilter(searchParams, 'source', SOURCE_FILTERS, 'all'));
    setScopeFilter(getAllowedFilter(searchParams, 'scope', SCOPE_FILTERS, 'all'));
    setSortBy(getAllowedFilter(searchParams, 'sort', SORT_OPTIONS, 'default'));
  }, [categories, searchParams, skills.length]);

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

  const shortlistSkills = useMemo(() => skills.filter((skill) => shortlistIds.includes(skill.id)), [shortlistIds, skills]);

  const openPanel = (id: 'guided-discovery' | 'shortlist-review' | 'skill-collections') => {
    setActivePanel(id);
    const panel = document.getElementById(id) as HTMLDetailsElement | null;
    if (panel) panel.open = true;
    requestAnimationFrame(() => panel?.scrollIntoView({ block: 'start' }));
  };

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
    <div className={`catalog-layout ${view !== 'skills' ? 'catalog-layout--wide' : ''}`}>
      <aside hidden={view !== 'skills'} className="catalog-rail" aria-label="Skill categories">
        <CategoryRail categories={categories} stats={categoryStats} total={skills.length} selected={categoryFilter} onSelect={setCategoryFilter} />
        <Link to={toIndexableRoutePath('/workbench')} className="catalog-rail__workbench">
          <Icon name="fileCode" size={17} />
          AAS Core Workbench
        </Link>
      </aside>

      <div className="catalog-content">
          <CatalogNavigation active={view as 'skills' | 'workflows' | 'collections'} onSelect={(next) => { setView(next); setActivePanel(null); }} />
        <div hidden={view !== 'skills'}>
        <section className="catalog-hero">
          <h1>Find the skills for your next project.</h1>
          <p>Explore {catalogCountLabel ? `${catalogCountLabel} ` : ''}reusable playbooks. Compare a few candidates, then let your agent inspect and choose what fits.</p>


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

          <details className="catalog-advanced platform-panel" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
            <summary>Advanced filters <span>{[matchMode !== 'all', Boolean(requiredTerms), riskFilter !== 'all', sourceFilter !== 'all'].filter(Boolean).length} active</span></summary>
            <div className="platform-panel__body">          <div className="catalog-search-options">
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

<div className="catalog-toolbar">              <label>
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
</div></div>
          </details>

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

          </div>
        </section>

        <div className="catalog-selection-bar" aria-label="Current selection">
          <span>{shortlistIds.length} selected</span>
          <button type="button" aria-expanded={activePanel === 'shortlist-review'} aria-controls="shortlist-review" onClick={() => openPanel('shortlist-review')}>Review shortlist</button>
          <button type="button" onClick={() => setView('collections')}>Save as collection</button>
        </div>
        {activePanel && <button className="catalog-close-panel" type="button" onClick={() => { const trigger = document.querySelector<HTMLButtonElement>(`button[aria-controls="${activePanel}"]`); setActivePanel(null); trigger?.focus(); }}>Close panel</button>}
        <div hidden={activePanel !== 'shortlist-review'}><details className="platform-panel" id="shortlist-review"><summary>Review your shortlist <span>{shortlistIds.length} selected</span></summary><div className="platform-panel__body"><ShortlistReview suggestedGoal={discoveryGoal} skills={shortlistSkills} onRemove={toggleShortlist} onClear={clearShortlist} /></div></details></div>


        <section className="catalog-results" aria-labelledby="catalog-results-title">
          <header>
            <div>
              <h2 id="catalog-results-title">{filteredSkills.length.toLocaleString('en-US')} {filteredSkills.length === 1 ? 'skill' : 'skills'}</h2>
              <p>Read the instructions and requirements before choosing.</p>
            </div>
            {syncFeatureEnabled ? (
              <button type="button" onClick={() => void handleSync()} disabled={syncing}>
                <Icon name="refresh" size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync skills'}
              </button>
            ) : null}
          </header>

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

        </div>
        <div hidden={view !== 'workflows'}>
          <header className="catalog-view-header"><h1>Start from a workflow.</h1><p>Explore ordered paths, inspect their candidates, and let your agent make the selection.</p></header>
          <GuidedDiscovery onWorkflow={(id) => { setWorkflowFocus(id); requestAnimationFrame(() => document.getElementById('catalog-workflows')?.scrollIntoView({ block: 'start' })); }} />
          <div id="catalog-workflows"><WorkflowExplorer key={workflowFocus} initialQuery={workflowFocus} catalog={skills} shortlistIds={shortlistIds} onToggleShortlist={toggleShortlist} /></div>
          <details className="platform-panel"><summary>Explore by outcome</summary><div className="platform-panel__body"><OutcomeExplorer catalog={skills} onGoalChange={setDiscoveryGoal} /></div></details>
        </div>
        <div hidden={view !== 'collections'} className="catalog-collection-view">
          <header className="catalog-view-header"><h1>Your saved collections.</h1><p>Named skill selections saved on this device. Import or export a backup to move them.</p></header>
          <SkillCollections shortlistIds={shortlistIds} availableIds={skills.map((skill) => skill.id)} onAdd={addToShortlist} standalone />
        </div>
      </div>
      <section className="platform-panel platform-panel__body" aria-label="Catalog questions">{getHomeFaqItems(skills.length).map((item) => <div key={item.question}><h2>{item.question}</h2><p>{item.answer}</p></div>)}</section>
    </div>
  );
}

export default Home;
