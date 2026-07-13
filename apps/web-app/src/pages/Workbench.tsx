import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { VirtuosoGrid } from 'react-virtuoso';
import packageMetadata from '../../../../package.json';
import { Icon } from '../components/ui/Icon';
import { useSkills } from '../context/SkillContext';
import { usePageMeta } from '../hooks/usePageMeta';
import type { RiskLevel, Skill } from '../types';
import {
  WORKBENCH_HOSTS,
  buildInstallerCommand,
  collectSelectionEvidence,
  getHostCompatibility,
  getRecordedProvenance,
  getSetupType,
  isWorkbenchHost,
  matchesWorkbenchFilters,
  normalizeSelectedIds,
  parseSelectedIds,
  type CompatibilityFacet,
  type ProvenanceFacet,
  type RiskFacet,
  type SetupFacet,
  type WorkbenchHost,
} from '../utils/skillWorkbench';

const riskStyles: Record<RiskLevel, string> = {
  none: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  safe: 'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  unknown: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  critical: 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
  offensive: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
};

const evidenceToneStyles = {
  rose: 'border-rose-900/70 bg-rose-950/35 text-rose-200',
  orange: 'border-orange-900/70 bg-orange-950/30 text-orange-200',
  amber: 'border-amber-900/70 bg-amber-950/25 text-amber-200',
  violet: 'border-violet-900/70 bg-violet-950/25 text-violet-200',
  slate: 'border-slate-700 bg-slate-900 text-slate-300',
} as const;

function recordedRisk(skill: Skill): RiskLevel {
  return skill.risk ?? 'unknown';
}

function EvidenceBucket({
  summary,
  entries,
  tone,
}: {
  summary: string;
  entries: string[];
  tone: keyof typeof evidenceToneStyles;
}): React.ReactElement | null {
  if (entries.length === 0) return null;
  return (
    <div className={`border px-2.5 py-2 ${evidenceToneStyles[tone]}`}>
      <p>{entries.length} {summary}.</p>
      <ul className="mt-1 space-y-1 font-mono text-[10px] leading-relaxed opacity-90">
        {entries.map((entry) => <li key={entry} className="break-words">{entry}</li>)}
      </ul>
    </div>
  );
}

function buildWorkbenchQuery(selectedIds: Iterable<string>, host: WorkbenchHost): URLSearchParams {
  const query = new URLSearchParams();
  const normalized = normalizeSelectedIds(selectedIds);
  if (normalized.length > 0) query.set('selected', normalized.join(','));
  query.set('host', host);
  return query;
}

function WorkbenchCard({
  skill,
  selected,
  host,
  onToggle,
}: {
  skill: Skill;
  selected: boolean;
  host: WorkbenchHost;
  onToggle: (skillId: string) => void;
}): React.ReactElement {
  const compatibility = getHostCompatibility(skill, host);
  const provenance = getRecordedProvenance(skill);
  const setup = getSetupType(skill);
  const risk = recordedRisk(skill);
  const recordedOrigin = skill.source_repo || skill.source || 'not recorded';

  return (
    <article
      className={`relative flex h-full flex-col border bg-white p-4 transition-colors dark:bg-slate-950 ${selected
        ? 'border-teal-500 shadow-[inset_4px_0_0_0_rgb(13_148_136)] dark:border-teal-500'
        : 'border-slate-200 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {skill.category}
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-slate-100">
            {skill.name}
          </h2>
        </div>
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`${selected ? 'Remove' : 'Select'} ${skill.name}`}
          onClick={() => onToggle(skill.id)}
          className={`shrink-0 border px-2.5 py-1.5 text-xs font-semibold transition-colors ${selected
            ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800'
            : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
        >
          {selected ? 'Selected' : 'Select'}
        </button>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {skill.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
        <span className={`border px-2 py-1 font-semibold ${riskStyles[risk]}`}>risk: {risk}</span>
        <span className="border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          source: {provenance}
        </span>
        <span className={`border px-2 py-1 ${compatibility === 'blocked'
          ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
          : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}>
          host: {compatibility}
        </span>
        {setup === 'manual' && (
          <span className="border border-violet-300 bg-violet-50 px-2 py-1 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
            manual setup
          </span>
        )}
      </div>

      {skill.tags && skill.tags.length > 0 && (
        <p className="mt-3 line-clamp-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {skill.tags.map((tag) => `#${tag}`).join(' ')}
        </p>
      )}

      <p title={recordedOrigin} className="mt-3 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
        origin: {recordedOrigin}
      </p>
      {setup === 'manual' && skill.plugin?.setup?.summary && (
        <p className="mt-1 line-clamp-2 text-xs text-violet-800 dark:text-violet-300">
          setup: {skill.plugin.setup.summary}
        </p>
      )}
      {compatibility === 'blocked' && skill.plugin?.reasons?.length ? (
        <p className="mt-1 line-clamp-2 text-xs text-rose-800 dark:text-rose-300">
          recorded note: {skill.plugin.reasons.join(' ')}
        </p>
      ) : null}

      <Link
        to={`/skill/${encodeURIComponent(skill.id)}`}
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
      >
        Inspect canonical skill
        <Icon name="arrowRight" size={13} />
      </Link>
    </article>
  );
}

export function Workbench(): React.ReactElement {
  const { skills, loading, error, refreshSkills } = useSkills();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [risk, setRisk] = useState<RiskFacet>('all');
  const [provenance, setProvenance] = useState<ProvenanceFacet>('all');
  const [compatibility, setCompatibility] = useState<CompatibilityFacet>('all');
  const [setup, setSetup] = useState<SetupFacet>('all');
  const [copied, setCopied] = useState<'preview' | 'install' | 'share' | null>(null);
  const deferredSearch = useDeferredValue(search);

  usePageMeta(useMemo(() => ({
    title: 'Skill Workbench | Agentic Awesome Skills',
    description: 'Filter canonical skill evidence, compose an exact host-aware set, and preview a version-pinned install without filesystem writes.',
    canonicalPath: '/workbench',
  }), []));

  const hostParam = searchParams.get('host');
  const host: WorkbenchHost = isWorkbenchHost(hostParam) ? hostParam : 'codex';
  const selectedIds = useMemo(
    () => parseSelectedIds(searchParams.get('selected')),
    [searchParams],
  );
  const skillsById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const selectedSkills = useMemo(
    () => selectedIds.flatMap((skillId) => {
      const skill = skillsById.get(skillId);
      return skill ? [skill] : [];
    }),
    [selectedIds, skillsById],
  );
  const missingSelectedIds = useMemo(
    () => selectedIds.filter((skillId) => !skillsById.has(skillId)),
    [selectedIds, skillsById],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const categories = useMemo(
    () => ['all', ...new Set(skills.map((skill) => skill.category).filter(Boolean))].sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return a.localeCompare(b);
    }),
    [skills],
  );

  const filteredSkills = useMemo(
    () => skills.filter((skill) => matchesWorkbenchFilters(skill, {
      search: deferredSearch,
      category,
      risk,
      provenance,
      compatibility,
      setup,
    }, host)),
    [category, compatibility, deferredSearch, host, provenance, risk, setup, skills],
  );

  const evidence = useMemo(
    () => collectSelectionEvidence(selectedSkills, host),
    [host, selectedSkills],
  );

  const commands = useMemo(() => {
    if (selectedIds.length === 0 || missingSelectedIds.length > 0) return null;
    return {
      preview: buildInstallerCommand({ skillIds: selectedIds, host, version: packageMetadata.version, dryRun: true }),
      install: buildInstallerCommand({ skillIds: selectedIds, host, version: packageMetadata.version, dryRun: false }),
    };
  }, [host, missingSelectedIds.length, selectedIds]);

  const installBlocked = missingSelectedIds.length > 0 || evidence.blockedForHost.length > 0;

  const updateUrlState = (nextSelectedIds: string[], nextHost = host) => {
    setSearchParams(buildWorkbenchQuery(nextSelectedIds, nextHost), { replace: true });
  };

  const toggleSkill = (skillId: string) => {
    const next = new Set(selectedIds);
    if (next.has(skillId)) next.delete(skillId);
    else next.add(skillId);
    updateUrlState([...next]);
  };

  const changeHost = (nextHost: WorkbenchHost) => {
    updateUrlState(selectedIds, nextHost);
    setCompatibility('all');
  };

  const copyText = async (kind: 'preview' | 'install' | 'share', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const copyShareLink = async () => {
    const query = buildWorkbenchQuery(selectedIds, host).toString();
    const relative = `${import.meta.env.BASE_URL}workbench${query ? `?${query}` : ''}`;
    await copyText('share', new URL(relative, window.location.origin).toString());
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setRisk('all');
    setProvenance('all');
    setCompatibility('all');
    setSetup('all');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-100/70 p-4 sm:p-6 dark:bg-slate-950">
      <header className="relative overflow-hidden border border-slate-300 bg-slate-950 px-5 py-6 text-slate-100 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.9)] sm:px-7 dark:border-slate-700">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-teal-400" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-300">Expert registry control bench</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl">
              Build a precise, inspectable skill set
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Query recorded catalog evidence, select exact canonical IDs, expose host and risk conflicts, then preview a pinned install before it touches a target directory.
            </p>
          </div>
          <dl className="grid grid-cols-3 border border-slate-700 bg-slate-900/80 font-mono text-xs">
            <div className="border-r border-slate-700 px-4 py-3">
              <dt className="text-slate-500">catalog</dt>
              <dd className="mt-1 text-lg text-slate-100">{skills.length.toLocaleString('en-US')}</dd>
            </div>
            <div className="border-r border-slate-700 px-4 py-3">
              <dt className="text-slate-500">visible</dt>
              <dd className="mt-1 text-lg text-slate-100">{filteredSkills.length.toLocaleString('en-US')}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-slate-500">selected</dt>
              <dd className="mt-1 text-lg text-teal-300">{selectedSkills.length}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_23rem]">
        <aside className="order-1 border border-slate-300 bg-white p-4 xl:sticky xl:top-20 dark:border-slate-800 dark:bg-slate-900" aria-label="Workbench filters">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-800 dark:text-slate-200">Query</h2>
            <button type="button" onClick={resetFilters} className="text-xs font-semibold text-slate-500 underline underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100">
              Reset
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Search recorded fields
              <span className="relative mt-1.5 block">
                <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  aria-label="Search recorded fields"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="name, tag, source…"
                  className="h-10 w-full border border-slate-300 bg-white pl-9 pr-3 text-sm font-normal text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-teal-950"
                />
              </span>
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category
              <select aria-label="Filter workbench by category" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                {categories.map((value) => <option key={value} value={value}>{value === 'all' ? 'All categories' : value}</option>)}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Risk label
              <select aria-label="Filter workbench by risk" value={risk} onChange={(event) => setRisk(event.target.value as RiskFacet)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="all">All risk labels</option>
                <option value="none">none</option>
                <option value="safe">safe</option>
                <option value="unknown">unknown</option>
                <option value="critical">critical</option>
                <option value="offensive">offensive</option>
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Recorded provenance
              <select aria-label="Filter workbench by provenance" value={provenance} onChange={(event) => setProvenance(event.target.value as ProvenanceFacet)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="all">All provenance</option>
                <option value="official">official</option>
                <option value="community">community</option>
                <option value="self">self</option>
                <option value="unknown">unknown / not recorded</option>
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selected host
              <select aria-label="Select workbench host" value={host} onChange={(event) => changeHost(event.target.value as WorkbenchHost)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                {WORKBENCH_HOSTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Host evidence
              <select aria-label="Filter workbench by compatibility" value={compatibility} onChange={(event) => setCompatibility(event.target.value as CompatibilityFacet)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="all">All host evidence</option>
                <option value="supported">supported</option>
                <option value="blocked">blocked</option>
                <option value="unrecorded">unrecorded</option>
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Setup burden
              <select aria-label="Filter workbench by setup" value={setup} onChange={(event) => setSetup(event.target.value as SetupFacet)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950">
                <option value="all">All setup states</option>
                <option value="none">none recorded</option>
                <option value="manual">manual setup</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
          </div>
        </aside>

        <aside className="order-2 border border-slate-300 bg-slate-950 text-slate-100 xl:order-3 xl:sticky xl:top-20" aria-label="Selected skill ledger">
          <div className="border-b border-slate-700 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal-300">Selection ledger</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h2 className="text-xl font-semibold">{selectedSkills.length} exact skills</h2>
              <span className="font-mono text-xs text-slate-400">v{packageMetadata.version}</span>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto border-b border-slate-800 px-4 py-3">
            {selectedIds.length === 0 ? (
              <p className="text-sm leading-relaxed text-slate-400">Select canonical IDs from the results. Nothing broad is added automatically.</p>
            ) : (
              <ul className="space-y-2">
                {selectedIds.map((skillId) => (
                  <li key={skillId} className="flex items-center justify-between gap-2 font-mono text-xs">
                    <span className={`truncate ${skillsById.has(skillId) ? 'text-slate-200' : 'text-rose-300'}`}>{skillId}</span>
                    <button type="button" aria-label={`Remove ${skillId}`} onClick={() => toggleSkill(skillId)} className="shrink-0 text-slate-500 hover:text-rose-300">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div aria-live="polite" className="space-y-2 border-b border-slate-800 px-4 py-3 text-xs">
              <EvidenceBucket summary="selected IDs do not resolve in this catalog" entries={missingSelectedIds} tone="rose" />
              <EvidenceBucket
                summary="explicitly blocked for this host"
                entries={evidence.blockedForHost.map((skill) => [
                  skill.id,
                  skill.plugin?.reasons?.join(' '),
                ].filter(Boolean).join(' — '))}
                tone="rose"
              />
              <EvidenceBucket
                summary="critical/offensive risk labels"
                entries={evidence.elevatedRisk.map((skill) => `${skill.id} — risk: ${recordedRisk(skill)}`)}
                tone="orange"
              />
              <EvidenceBucket summary="unknown risk labels" entries={evidence.unknownRisk.map((skill) => skill.id)} tone="amber" />
              <EvidenceBucket summary="without recorded provenance type" entries={evidence.missingProvenance.map((skill) => skill.id)} tone="amber" />
              <EvidenceBucket
                summary="require manual setup"
                entries={evidence.manualSetup.map((skill) => [
                  skill.id,
                  skill.plugin?.setup?.summary,
                ].filter(Boolean).join(' — '))}
                tone="violet"
              />
              <EvidenceBucket summary="have no recorded compatibility for this host" entries={evidence.unrecordedForHost.map((skill) => skill.id)} tone="slate" />
              {!installBlocked && evidence.elevatedRisk.length === 0 && evidence.unknownRisk.length === 0 && evidence.missingProvenance.length === 0 && evidence.manualSetup.length === 0 && evidence.unrecordedForHost.length === 0 && (
                <p className="text-emerald-300">No recorded conflicts in the selected fields.</p>
              )}
            </div>
          )}

          <div className="space-y-3 px-4 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">1 / Preview without writes</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Exact selection is desired state for installer-managed entries. The dry run lists stale managed entries it would remove.
              </p>
              <code className="mt-1.5 block max-h-28 overflow-auto whitespace-pre-wrap break-all border border-slate-700 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300">
                {commands?.preview ?? 'Select valid canonical IDs to generate a preview.'}
              </code>
              <button type="button" disabled={!commands} onClick={() => commands && void copyText('preview', commands.preview)} className="mt-2 w-full border border-slate-600 px-3 py-2 text-xs font-semibold transition-colors hover:border-teal-400 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-40">
                {copied === 'preview' ? 'Preview command copied' : 'Copy dry-run command'}
              </button>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">2 / Apply exact set</p>
              <code className="mt-1.5 block max-h-28 overflow-auto whitespace-pre-wrap break-all border border-slate-700 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300">
                {commands?.install ?? 'The install command appears only after exact resolution.'}
              </code>
              <button type="button" disabled={!commands || installBlocked} onClick={() => commands && void copyText('install', commands.install)} className="mt-2 w-full bg-teal-400 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                {copied === 'install' ? 'Install command copied' : installBlocked ? 'Resolve blocked IDs first' : 'Copy pinned install command'}
              </button>
            </div>

            <button type="button" disabled={selectedIds.length === 0} onClick={() => void copyShareLink()} className="w-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40">
              {copied === 'share' ? 'Share URL copied' : 'Copy review URL'}
            </button>
          </div>
        </aside>

        <main className="order-3 min-w-0 xl:order-2" aria-label="Workbench results">
          <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-300 pb-3 dark:border-slate-800">
            <p aria-live="polite" className="font-mono text-xs text-slate-600 dark:text-slate-400">
              {filteredSkills.length.toLocaleString('en-US')} matching canonical skills
            </p>
            {selectedIds.length > 0 && (
              <button type="button" onClick={() => updateUrlState([])} className="text-xs font-semibold text-slate-500 underline underline-offset-4 hover:text-rose-700 dark:hover:text-rose-300">
                Clear selection
              </button>
            )}
          </div>

          {loading ? (
            <div data-testid="workbench-loader" className="grid gap-3 md:grid-cols-2">
              {[...Array(8)].map((_, index) => <div key={index} className="h-56 animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />)}
            </div>
          ) : error && skills.length === 0 ? (
            <div className="border border-rose-300 bg-rose-50 p-6 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <h2 className="font-semibold">Unable to load the canonical catalog</h2>
              <p className="mt-2">{error}</p>
              <button type="button" onClick={() => void refreshSkills()} className="mt-4 border border-rose-500 px-3 py-2 font-semibold">Retry</button>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="border border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-950 dark:text-slate-100">No exact matches</h2>
              <p className="mt-2 text-sm text-slate-500">Reset one or more recorded-data filters.</p>
            </div>
          ) : (
            <VirtuosoGrid
              useWindowScroll
              totalCount={filteredSkills.length}
              listClassName="grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
              itemContent={(index) => {
                const skill = filteredSkills[index];
                return <WorkbenchCard key={skill.id} skill={skill} selected={selectedSet.has(skill.id)} host={host} onToggle={toggleSkill} />;
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default Workbench;
