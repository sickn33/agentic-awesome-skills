import type { Skill } from '../types';

const REQUIRED_TEXT_FIELDS = ['id', 'name', 'description', 'category', 'path'] as const;
const OPTIONAL_TEXT_FIELDS = ['source', 'source_repo', 'license', 'license_source', 'date_added'] as const;
const RISK_LEVELS = new Set(['none', 'safe', 'critical', 'offensive', 'unknown']);
const SOURCE_TYPES = new Set(['official', 'community', 'self']);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasValidPluginMetadata(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const plugin = value as Record<string, unknown>;
  const targets = plugin.targets as Record<string, unknown> | undefined;
  const setup = plugin.setup as Record<string, unknown> | undefined;
  return Boolean(
    targets
    && setup
    && ['supported', 'blocked'].includes(String(targets.codex))
    && ['supported', 'blocked'].includes(String(targets.claude))
    && ['none', 'manual'].includes(String(setup.type))
    && typeof setup.summary === 'string'
    && (setup.docs === null || typeof setup.docs === 'string')
    && isStringArray(plugin.reasons),
  );
}

/** Validate a complete public skills index before any consumer accepts it. */
export function isSkillsIndex(value: unknown): value is Skill[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10_000) return false;

  const seenIds = new Set<string>();
  return value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const skill = item as Record<string, unknown>;
    if (!REQUIRED_TEXT_FIELDS.every((field) => typeof skill[field] === 'string' && (skill[field] as string).length <= 2_000)) return false;
    if (!/^[a-z0-9][a-z0-9._-]{0,199}$/.test(skill.id as string) || seenIds.has(skill.id as string)) return false;
    seenIds.add(skill.id as string);

    if (!OPTIONAL_TEXT_FIELDS.every((field) => skill[field] === undefined || typeof skill[field] === 'string')) return false;
    if (skill.risk !== undefined && !RISK_LEVELS.has(String(skill.risk))) return false;
    if (skill.source_type !== undefined && !SOURCE_TYPES.has(String(skill.source_type))) return false;
    if (skill.tags !== undefined && !isStringArray(skill.tags)) return false;
    if (skill.plugin !== undefined && !hasValidPluginMetadata(skill.plugin)) return false;
    return true;
  });
}
