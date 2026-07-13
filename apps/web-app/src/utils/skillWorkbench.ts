import type { PluginCompatibility, RiskLevel, Skill, SkillSetupType } from '../types';

export const WORKBENCH_HOSTS = [
  { id: 'codex', label: 'Codex CLI', flag: '--codex', compatibilityRecorded: true },
  { id: 'claude', label: 'Claude Code', flag: '--claude', compatibilityRecorded: true },
  { id: 'cursor', label: 'Cursor', flag: '--cursor', compatibilityRecorded: false },
  { id: 'gemini', label: 'Gemini CLI', flag: '--gemini', compatibilityRecorded: false },
  { id: 'antigravity', label: 'Antigravity', flag: '--antigravity', compatibilityRecorded: false },
  { id: 'kiro', label: 'Kiro', flag: '--kiro', compatibilityRecorded: false },
] as const;

export type WorkbenchHost = typeof WORKBENCH_HOSTS[number]['id'];
export type RiskFacet = RiskLevel | 'all';
export type ProvenanceFacet = 'all' | 'official' | 'community' | 'self' | 'unknown';
export type CompatibilityFacet = 'all' | 'supported' | 'blocked' | 'unrecorded';
export type SetupFacet = SkillSetupType | 'all' | 'unknown';

export interface WorkbenchFilters {
  search: string;
  category: string;
  risk: RiskFacet;
  provenance: ProvenanceFacet;
  compatibility: CompatibilityFacet;
  setup: SetupFacet;
}

export interface SelectionEvidence {
  blockedForHost: Skill[];
  unrecordedForHost: Skill[];
  elevatedRisk: Skill[];
  unknownRisk: Skill[];
  missingProvenance: Skill[];
  manualSetup: Skill[];
}

// Canonical catalog ids are shell-safe lowercase directory basenames. One
// legacy id contains an underscore, so preserve that real registry value.
const SKILL_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/i;

export function isWorkbenchHost(value: string | null): value is WorkbenchHost {
  return WORKBENCH_HOSTS.some((host) => host.id === value);
}

export function getRecordedProvenance(skill: Skill): Exclude<ProvenanceFacet, 'all'> {
  if (skill.source_type) return skill.source_type;
  if (skill.source === 'official' || skill.source === 'community' || skill.source === 'self') {
    return skill.source;
  }
  return 'unknown';
}

export function getHostCompatibility(
  skill: Skill,
  host: WorkbenchHost,
): PluginCompatibility | 'unrecorded' {
  if (host === 'codex' || host === 'claude') {
    return skill.plugin?.targets?.[host] ?? 'unrecorded';
  }
  return 'unrecorded';
}

export function getSetupType(skill: Skill): SkillSetupType | 'unknown' {
  return skill.plugin?.setup?.type ?? 'unknown';
}

function searchableText(skill: Skill): string {
  return [
    skill.id,
    skill.name,
    skill.description,
    skill.category,
    skill.source,
    skill.source_repo,
    skill.source_type,
    ...(skill.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function matchesWorkbenchFilters(
  skill: Skill,
  filters: WorkbenchFilters,
  host: WorkbenchHost,
): boolean {
  const query = filters.search.trim().toLowerCase();
  if (query && !searchableText(skill).includes(query)) return false;
  if (filters.category !== 'all' && skill.category !== filters.category) return false;
  if (filters.risk !== 'all' && (skill.risk ?? 'unknown') !== filters.risk) return false;
  if (filters.provenance !== 'all' && getRecordedProvenance(skill) !== filters.provenance) return false;
  if (filters.compatibility !== 'all' && getHostCompatibility(skill, host) !== filters.compatibility) return false;
  if (filters.setup !== 'all' && getSetupType(skill) !== filters.setup) return false;
  return true;
}

export function collectSelectionEvidence(
  skills: Skill[],
  host: WorkbenchHost,
): SelectionEvidence {
  return {
    blockedForHost: skills.filter((skill) => getHostCompatibility(skill, host) === 'blocked'),
    unrecordedForHost: skills.filter((skill) => getHostCompatibility(skill, host) === 'unrecorded'),
    elevatedRisk: skills.filter((skill) => skill.risk === 'critical' || skill.risk === 'offensive'),
    unknownRisk: skills.filter((skill) => (skill.risk ?? 'unknown') === 'unknown'),
    missingProvenance: skills.filter((skill) => getRecordedProvenance(skill) === 'unknown'),
    manualSetup: skills.filter((skill) => getSetupType(skill) === 'manual'),
  };
}

export function normalizeSelectedIds(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))].sort();
}

export function parseSelectedIds(value: string | null): string[] {
  if (!value) return [];
  return normalizeSelectedIds(value.split(','));
}

export function buildInstallerCommand({
  skillIds,
  host,
  version,
  dryRun,
}: {
  skillIds: Iterable<string>;
  host: WorkbenchHost;
  version: string;
  dryRun: boolean;
}): string {
  const selected = normalizeSelectedIds(skillIds);
  if (selected.length === 0) throw new Error('Select at least one skill.');
  if (!VERSION_PATTERN.test(version)) throw new Error(`Invalid release version: ${version}`);
  const invalid = selected.filter((skillId) => !SKILL_ID_PATTERN.test(skillId));
  if (invalid.length > 0) throw new Error(`Invalid skill IDs: ${invalid.join(', ')}`);
  const hostDefinition = WORKBENCH_HOSTS.find((candidate) => candidate.id === host);
  if (!hostDefinition) throw new Error(`Unsupported host: ${host}`);

  return [
    `npx agentic-awesome-skills@${version}`,
    hostDefinition.flag,
    `--release ${version}`,
    `--skills ${selected.join(',')}`,
    dryRun ? '--dry-run' : '',
  ].filter(Boolean).join(' ');
}
