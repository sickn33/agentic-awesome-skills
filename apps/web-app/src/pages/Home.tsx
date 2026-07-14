import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { VirtuosoGrid } from 'react-virtuoso';
import { SkillCard } from '../components/SkillCard';
import { Icon } from '../components/ui/Icon';
import { useSkills } from '../context/SkillContext';
import { seoLandingPages } from '../data/seoLandingPages';
import { usePageMeta } from '../hooks/usePageMeta';
import type { CategoryStats, SyncMessage } from '../types';
import { buildHomeMeta, getHomeFaqItems } from '../utils/seo';

const conceptCards = [
  { title: 'Specialized plugins', body: 'Focused distributions for a domain or job.' },
  { title: 'Skills', body: 'Reusable SKILL.md playbooks for repeatable execution.' },
  { title: 'MCP tools', body: 'External capabilities the assistant can call.' },
  { title: 'Bundles', body: 'Curated starting sets for a role or team.' },
  { title: 'Workflows', body: 'Ordered playbooks for a concrete outcome.' },
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

export function Home(): React.ReactElement {
  const { skills, stars, loading, error, refreshSkills } = useSkills();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<SyncMessage | null>(null);

  usePageMeta(buildHomeMeta(skills.length));

  const faqItems = getHomeFaqItems(skills.length);
  const catalogCountLabel = skills.length > 0 ? skills.length.toLocaleString('en-US') : '1,900+';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filteredSkills = useMemo(() => {
    let result = [...skills];
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter((skill) => (
        skill.name.toLowerCase().includes(query)
        || skill.description.toLowerCase().includes(query)
        || skill.tags?.some((tag) => tag.toLowerCase().includes(query))
      ));
    }
    if (categoryFilter !== 'all') result = result.filter((skill) => skill.category === categoryFilter);
    if (sortBy === 'stars') result.sort((a, b) => (stars[b.id] || 0) - (stars[a.id] || 0));
    if (sortBy === 'newest') result.sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));
    if (sortBy === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [categoryFilter, debouncedSearch, skills, sortBy, stars]);

  const { categories, categoryStats } = useMemo(() => {
    const stats: CategoryStats = {};
    skills.forEach((skill) => { stats[skill.category] = (stats[skill.category] || 0) + 1; });
    const ordered = Object.keys(stats)
      .filter((category) => category !== 'uncategorized')
      .sort((a, b) => stats[b] - stats[a]);
    if (stats.uncategorized) ordered.push('uncategorized');
    return { categories: ['all', ...ordered], categoryStats: stats };
  }, [skills]);

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
        <Link to="/workbench" className="catalog-rail__workbench">
          <Icon name="fileCode" size={17} />
          Saved & exact installs
        </Link>
      </aside>

      <div className="catalog-content">
        <section className="catalog-hero">
          <h1>Find the right skill.<br />Ship the better agent.</h1>
          <p>Search {catalogCountLabel} installable skills, plugins, and workflows — curated for real agent work.</p>

          <label className="catalog-search">
            <span className="sr-only">Search skills</span>
            <Icon name="search" size={23} />
            <input
              type="search"
              aria-label="Search skills"
              placeholder="Search skills, tools, or workflows"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>⌘K</kbd>
          </label>

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
                <span className="sr-only">Sort skills</span>
                <select aria-label="Sort skills" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="default">Recommended</option>
                  <option value="stars">Community saves</option>
                  <option value="newest">Newest</option>
                  <option value="az">A to Z</option>
                </select>
              </label>
            </div>
            <Link to="/workbench">Compose an exact install <Icon name="arrowRight" size={16} /></Link>
          </div>
        </section>

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
              <button type="button" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>Clear filters</button>
            </div>
          ) : (
            <VirtuosoGrid
              useWindowScroll
              totalCount={filteredSkills.length}
              listClassName="catalog-result-list"
              itemContent={(index) => {
                const skill = filteredSkills[index];
                return <SkillCard key={skill.id} skill={skill} starCount={stars[skill.id] || 0} />;
              }}
            />
          )}
        </section>

        <section className="catalog-support" aria-label="Catalog guides">
          <div className="catalog-support__intro">
            <h2>Understand the system behind the catalog</h2>
            <p>Skills, tools, bundles, plugins, and workflows solve different parts of the same job.</p>
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
              <nav>{seoLandingPages.map((page) => <Link key={page.slug} to={`/topics/${page.slug}`}>{page.h1}<Icon name="arrowRight" size={14} /></Link>)}</nav>
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
