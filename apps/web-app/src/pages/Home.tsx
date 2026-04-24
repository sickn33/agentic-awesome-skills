import { useState, useEffect, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useSkills } from '../context/SkillContext';
import { SkillCard } from '../components/SkillCard';
import { Icon } from '../components/ui/Icon';
import type { SyncMessage, CategoryStats } from '../types';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildHomeMeta, getHomeFaqItems } from '../utils/seo';

const conceptCards = [
  {
    title: 'Skills',
    body: 'Reusable SKILL.md playbooks that teach an AI assistant how to execute a workflow with better structure and context.',
  },
  {
    title: 'MCP tools',
    body: 'External capabilities and system integrations the assistant can call. Tools provide actions; skills tell the assistant how to use them well.',
  },
  {
    title: 'Bundles',
    body: 'Curated starting sets of recommended skills for a role, domain, or team that wants a smaller shortlist first.',
  },
  {
    title: 'Workflows',
    body: 'Ordered execution playbooks that show how to combine multiple skills step by step for a concrete outcome.',
  },
] as const;

const integrationGuides = [
  {
    name: 'Claude Code',
    href: 'https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/claude-code-skills.md',
    body: 'Install paths, starter prompts, plugin marketplace flow, and first skills to try.',
  },
  {
    name: 'Cursor',
    href: 'https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/cursor-skills.md',
    body: 'A practical guide for chat-first UI, frontend, and full-stack workflows in Cursor.',
  },
  {
    name: 'Codex CLI',
    href: 'https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/codex-cli-skills.md',
    body: 'How to use Antigravity Awesome Skills with Codex CLI for planning, implementation, testing, and review.',
  },
  {
    name: 'Gemini CLI',
    href: 'https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/gemini-cli-skills.md',
    body: 'A broad starting point for engineering, agent systems, integrations, and applied AI workflows.',
  },
] as const;

const syncFeatureEnabled = (
  (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_ENABLE_SKILLS_SYNC
  === 'true'
);

export function Home(): React.ReactElement {
  const { skills, stars, loading, error, refreshSkills } = useSkills();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<SyncMessage | null>(null);
  const [commandCopied, setCommandCopied] = useState(false);
  const installCommand = 'npx antigravity-awesome-skills';
  const docsLink = 'https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/usage.md';
  const installLink = 'https://www.npmjs.com/package/antigravity-awesome-skills';
  const faqItems = getHomeFaqItems();
  const catalogCountLabel = skills.length > 0 ? skills.length.toLocaleString('en-US') : 'installable';

  usePageMeta(buildHomeMeta(skills.length));

  const copyInstallCommand = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCommandCopied(true);
    window.setTimeout(() => setCommandCopied(false), 2000);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const filteredSkills = useMemo(() => {
    let result = [...skills];

    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      result = result.filter(skill =>
        skill.name.toLowerCase().includes(lowerSearch) ||
        skill.description.toLowerCase().includes(lowerSearch)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(skill => skill.category === categoryFilter);
    }

    // Apply sorting
    if (sortBy === 'stars') {
      result = [...result].sort((a, b) => (stars[b.id] || 0) - (stars[a.id] || 0));
    } else if (sortBy === 'newest') {
      result = [...result].sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));
    } else if (sortBy === 'az') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [debouncedSearch, categoryFilter, sortBy, skills, stars]);

  // Sort categories by count (most skills first), with 'uncategorized' at the end
  const { categories, categoryStats } = useMemo(() => {
    const stats: CategoryStats = {};
    skills.forEach(skill => {
      stats[skill.category] = (stats[skill.category] || 0) + 1;
    });

    const cats = ['all', ...Object.keys(stats)
      .filter(cat => cat !== 'uncategorized')
      .sort((a, b) => stats[b] - stats[a]),
      ...(stats['uncategorized'] ? ['uncategorized'] : [])
    ];

    return { categories: cats, categoryStats: stats };
  }, [skills]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/refresh-skills', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.upToDate) {
          setSyncMsg({ type: 'info', text: 'Skills are already up to date.' });
        } else {
          setSyncMsg({ type: 'success', text: `Synced ${data.count} skills.` });
          await refreshSkills();
        }
      } else {
        setSyncMsg({ type: 'error', text: String(data.error) });
      }
    } catch {
      setSyncMsg({ type: 'error', text: 'Network error' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_20%_12%,rgba(15,23,42,0.12),transparent_48%),radial-gradient(circle_at_84%_8%,rgba(99,102,241,0.16),transparent_54%)] dark:bg-[radial-gradient(circle_at_20%_12%,rgba(148,163,184,0.15),transparent_45%),radial-gradient(circle_at_84%_8%,rgba(129,140,248,0.2),transparent_52%)]" />

      <div className="mb-9 space-y-8">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_55px_-32px_rgba(15,23,42,0.55)] sm:p-8 dark:border-slate-800/80 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Skills Library
          </p>
          <h2 className="max-w-[20ch] text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance] sm:text-[3.25rem] sm:leading-[0.97] dark:text-slate-100">
            Build agent workflows with production-grade skill playbooks
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Antigravity Awesome Skills is a curated catalog of installable capabilities for AI assistants.
            Search fast, shortlist by category, and launch your first tested workflow from one focused workspace.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            <button
              onClick={copyInstallCommand}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {commandCopied ? 'Copied install command' : 'Copy install command'}
            </button>
            <a
              href={installLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-400/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_20px_-16px_rgba(15,23,42,0.7)] transition-colors hover:border-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Install with npm
            </a>
            <a
              href={docsLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-400/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_20px_-16px_rgba(15,23,42,0.7)] transition-colors hover:border-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Read getting started docs
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Recommended command</span>
            <code className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {installCommand}
            </code>
          </div>
        </section>

        <div className="relative overflow-hidden rounded-2xl border border-slate-300/70 bg-[color-mix(in_oklab,var(--surface-elevated)_92%,white_8%)] p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)] md:p-5 dark:border-slate-700/80 dark:bg-[var(--surface-elevated)]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--accent-solid)]/65" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Explore Skills</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Discover {catalogCountLabel} agentic capabilities for your AI assistant.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {syncMsg && (
                <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${syncMsg.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : syncMsg.type === 'info'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                  }`}>
                  {syncMsg.text}
                </span>
              )}
              {syncFeatureEnabled ? (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Icon name="refresh" size={16} className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                  <span>{syncing ? 'Syncing...' : 'Sync Skills'}</span>
                </button>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Public catalog mode
                </span>
              )}
            </div>
          </div>
        </div>

        {!syncFeatureEnabled && (
          <p className="-mt-4 text-sm text-slate-500 dark:text-slate-400">
            Catalog sync is a maintainer-only workflow in local builds, so the public Pages site always shows the last published catalog.
          </p>
        )}

        <div className="sticky top-0 z-40 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
            <div className="relative flex-1">
              <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search skills (e.g., react, security, python)..."
                aria-label="Search skills"
                className="w-full rounded-lg border border-slate-300 bg-white px-9 py-2.5 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Icon name="filter" size={16} className="h-4 w-4 shrink-0 text-slate-500" />
              <select
                aria-label="Filter by category"
                className="h-10 min-w-[165px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all'
                      ? 'All Categories'
                      : `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${categoryStats[cat] || 0})`
                    }
                  </option>
                ))}
              </select>

              <Icon name="sort" size={16} className="ml-1 h-4 w-4 shrink-0 text-slate-500" />
              <select
                aria-label="Sort skills"
                className="h-10 min-w-[145px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">Default</option>
                <option value="stars">Community saves</option>
                <option value="newest">Newest</option>
                <option value="az">A to Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="-mx-4 min-h-[60vh] flex-1 sm:min-h-[68vh] lg:min-h-[72vh]">
        {loading ? (
          <div data-testid="loader" className="grid gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950" />
            ))}
          </div>
        ) : error && skills.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
              <Icon name="alertCircle" size={24} className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Unable to load skills</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{error}</p>
            <button
              onClick={() => void refreshSkills()}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Retry loading catalog
            </button>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Icon name="alertCircle" size={24} className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No skills found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Try adjusting your search or category filters.</p>
          </div>
        ) : (
          <VirtuosoGrid
            useWindowScroll
            totalCount={filteredSkills.length}
            listClassName="grid gap-6 px-4 pb-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
            itemContent={(index) => {
              const skill = filteredSkills[index];
              return <SkillCard key={skill.id} skill={skill} starCount={stars[skill.id] || 0} />;
            }}
          />
        )}
      </div>

      <div className="mt-12 space-y-10">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Concepts
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Understand the system before scaling your setup
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            The catalog is easier to navigate when you separate reusable playbooks from external tool integrations.
            Skills explain execution quality, MCP tools expose systems, bundles reduce decision overhead, and workflows
            map the operating sequence.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {conceptCards.map((card) => (
              <article
                key={card.title}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{card.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/skills-vs-mcp-tools.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Read skills vs MCP/tools
            </a>
            <a
              href="https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/bundles.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Browse bundles
            </a>
            <a
              href="https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/workflows.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Explore workflows
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Integration Guides
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Start from the guide that matches your assistant runtime
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {integrationGuides.map((guide) => (
              <a
                key={guide.name}
                href={guide.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition-colors hover:border-slate-400 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:hover:border-slate-600"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{guide.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{guide.body}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Quick FAQ
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Answers to the first questions most users ask
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>
          <a
            href="https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/faq.md"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Read the full FAQ
          </a>
        </section>
      </div>
    </div>
  );
}

export default Home;
