import type { Skill } from '../types';

export const OUTCOME_PRESETS = [
  { label: 'Fix a bug', goal: 'Systematic debugging and regression testing' },
  { label: 'Ship a web feature', goal: 'Build an accessible React interface with tests' },
  { label: 'Review security', goal: 'Review application security and authentication vulnerabilities' },
  { label: 'Understand my data', goal: 'Data analysis, data quality and dashboard design' },
  { label: 'Improve conversion', goal: 'Improve landing page conversion with copywriting and experiments' },
  { label: 'Prepare a release', goal: 'Release review and deployment checklist' },
] as const;

const STOP_WORDS = new Set('a an and are as at be by for from how i in is it me my of on or our the this to want with without un una e di del della per con che il la le lo gli da come mio voglio'.split(' '));
const ALIASES: Record<string, string> = {
  debugging: 'debug', debuggen: 'debug', bug: 'debug', bugs: 'debug', fix: 'debug', failing: 'debug',
  tests: 'test', testing: 'test', tested: 'test',
  sicurezza: 'security', vulnerabilities: 'security', vulnerability: 'security',
  dati: 'data', analisi: 'analysis', analyze: 'analysis', analytics: 'analysis',
  accessibile: 'accessibility', accessible: 'accessibility',
  conversione: 'conversion', conversioni: 'conversion',
  authentication: 'auth', autenticazione: 'auth',
  deploy: 'deployment', deploys: 'deployment',
};

export function outcomeTerms(text: string): string[] {
  return [...new Set(text.slice(0, 1000).normalize('NFKC').toLowerCase()
    .split(/[^\p{L}\p{N}+#]+/u).filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map((word) => Object.prototype.hasOwnProperty.call(ALIASES, word) ? ALIASES[word] : word))].slice(0, 32);
}

export interface OutcomeMatch { skill: Skill; score: number; matched: string[]; totalTerms: number }

/** Browser-only discovery: descriptive relevance, never quality or Core eligibility. */
export function rankForOutcome(skills: Skill[], goal: string): OutcomeMatch[] {
  const terms = outcomeTerms(goal);
  if (!terms.length) return [];
  const indexed = skills.map((skill) => {
    const identity = new Set(outcomeTerms(`${skill.id} ${skill.name} ${(skill.tags || []).join(' ')}`));
    const description = new Set(outcomeTerms(skill.description));
    const category = new Set(outcomeTerms(skill.category));
    return { skill, identity, description, category };
  });
  const frequency = new Map(terms.map((term) => [term, indexed.filter(({ identity, description, category }) => identity.has(term) || description.has(term) || category.has(term)).length]));
  return indexed.map(({ skill, identity, description, category }) => {
    const matched = terms.filter((term) => identity.has(term) || description.has(term) || category.has(term));
    const score = matched.reduce((sum, term) => sum + (identity.has(term) ? 3 : description.has(term) ? 2 : 1) * Math.log(1 + skills.length / (1 + (frequency.get(term) || 0))), 0);
    return { skill, score, matched, totalTerms: terms.length };
  }).filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || a.skill.id.localeCompare(b.skill.id, 'en'));
}

export function evidenceSignals(skill: Skill): Array<{ label: string; value: string }> {
  return [
    { label: 'Provenance', value: skill.source_repo ? `Declared source: ${skill.source_repo}` : skill.source === 'self' ? 'Author declares original work' : skill.source ? `Declared source: ${skill.source}` : 'Source not recorded' },
    { label: 'License', value: skill.license || 'Not recorded in catalog' },
    { label: 'Risk', value: !skill.risk || skill.risk === 'unknown' ? 'Not assessed in catalog' : `Author-declared: ${skill.risk}` },
    { label: 'Setup', value: skill.plugin?.setup.type === 'manual' ? skill.plugin.setup.summary || 'Manual setup required' : skill.plugin ? 'No extra setup declared' : 'Not recorded in catalog' },
  ];
}

/** Reject malformed optional fields too: shortlist comparison consumes these records. */
export function isDiscoveryCatalog(value: unknown): value is Skill[] {
  if (!Array.isArray(value) || !value.length || value.length > 10000) return false;
  const seen = new Set<string>();
  return value.every((skill: unknown) => {
    if (!skill || typeof skill !== 'object' || Array.isArray(skill)) return false;
    const row = skill as Record<string, unknown>;
    if (!['id', 'name', 'description', 'category', 'path'].every((key) => typeof row[key] === 'string' && (row[key] as string).length <= 2000)) return false;
    if (!/^[a-z0-9][a-z0-9._-]{0,199}$/.test(row.id as string) || seen.has(row.id as string)) return false;
    seen.add(row.id as string);
    for (const key of ['source', 'source_repo', 'license', 'license_source', 'date_added']) if (row[key] !== undefined && typeof row[key] !== 'string') return false;
    if (row.risk !== undefined && !['none', 'safe', 'critical', 'offensive', 'unknown'].includes(String(row.risk))) return false;
    if (row.tags !== undefined && (!Array.isArray(row.tags) || !row.tags.every((tag) => typeof tag === 'string'))) return false;
    if (row.plugin !== undefined) {
      const plugin = row.plugin as Skill['plugin'];
      if (!plugin || typeof plugin !== 'object' || !plugin.targets || !plugin.setup ||
        !['supported', 'blocked'].includes(plugin.targets.codex) || !['supported', 'blocked'].includes(plugin.targets.claude) ||
        !['none', 'manual'].includes(plugin.setup.type) || typeof plugin.setup.summary !== 'string' ||
        (plugin.setup.docs !== null && typeof plugin.setup.docs !== 'string') || !Array.isArray(plugin.reasons) || !plugin.reasons.every((reason) => typeof reason === 'string')) return false;
    }
    return true;
  });
}
