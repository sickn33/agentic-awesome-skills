import ontology from '../../../../tools/lib/aas-v1/ontology.v1.json';
import type { Skill } from '../types';

export type SearchMode = 'all' | 'any' | 'fuzzy';
export function searchMode(value: string | null): SearchMode {
  return value === 'any' || value === 'fuzzy' ? value : 'all';
}

function alias(map: Record<string, string>, value: string): string {
  return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : value;
}

export function categoryFacet(value: string): string {
  return alias(ontology.categoryAliases, (value || 'uncategorized').normalize('NFKC').trim().toLowerCase().replace(/[\s_]+/g, '-'));
}

function token(value: string): string {
  return alias(ontology.aliases, value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9+#./-]+/g, '-').replace(/^-+|-+$/g, ''));
}

function terms(value: string): string[] {
  return [...new Set(value.trim().split(/\s+/).map(token).filter(Boolean))];
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  let cursor = 0;
  for (const character of needle) {
    const found = haystack.indexOf(character, cursor);
    if (found === -1) return false;
    cursor = found + 1;
  }
  return true;
}

/** Literal modes share Core token aliases. Fuzzy matching is an explicit browser option.
 * Neither mode ranks results or uses risk/source metadata to decide eligibility. */
export function matchCatalogSkill(skill: Skill, query: string, mode: SearchMode, required = ''): { matches: boolean; explanation: string } {
  const fields = [skill.id, skill.name, skill.description, skill.category, ...(skill.tags || [])].map((field) => String(field || ''));
  const tokens = new Set(fields.flatMap((field) => [token(field), ...field.split(/[\s/.,:;()_-]+/).map(token)]).filter(Boolean));
  const requiredTerms = terms(required);
  if ((required.trim() && !requiredTerms.length) || !requiredTerms.every((term) => tokens.has(term))) return { matches: false, explanation: '' };
  const queryTerms = mode === 'fuzzy' ? query.trim().toLowerCase().split(/\s+/).filter(Boolean) : terms(query);
  const matched = queryTerms.filter((term) => mode === 'fuzzy'
    ? fields.some((field) => fuzzyMatch(term, field.toLowerCase()))
    : tokens.has(term));
  const matches = !query.trim() || (queryTerms.length > 0 && (mode === 'any' ? matched.length > 0 : matched.length === queryTerms.length));
  const explanation = [matched.length ? `${mode === 'fuzzy' ? 'Approximate match' : 'Matched terms'}: ${matched.join(', ')}` : '',
    requiredTerms.length ? `Required: ${requiredTerms.join(', ')}` : ''].filter(Boolean).join(' · ');
  return { matches, explanation };
}
