import docs from '../data/docs.json';

const sources = import.meta.glob<string>('../../../../docs/users/*.md', { query: '?raw', import: 'default' });
const cache = new Map<string, Promise<string>>();

export function loadGuide(slug: string): Promise<string> {
  const load = sources[`../../../../docs/users/${slug}.md`];
  if (!load) return Promise.reject(new Error('Unknown guide'));
  if (!cache.has(slug)) {
    cache.set(slug, load().catch((error: unknown) => {
      cache.delete(slug);
      throw error;
    }));
  }
  return cache.get(slug)!;
}

export async function loadSearchCorpus() {
  return Promise.all(docs.map(async (doc) => ({ ...doc, text: await loadGuide(doc.slug) })));
}

export function searchGuides<T extends { title: string; group: string; text: string }>(corpus: T[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return corpus.flatMap((doc) => {
    const text = doc.text.replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/[#*`|>]/g, '').replace(/\s+/g, ' ').trim();
    const haystack = `${doc.title} ${doc.group} ${text}`.toLowerCase();
    if (!terms.every((term) => haystack.includes(term))) return [];
    const firstMatch = Math.min(...terms.map((term) => text.toLowerCase().indexOf(term)).filter((index) => index >= 0));
    const start = Number.isFinite(firstMatch) ? Math.max(0, firstMatch - 60) : 0;
    return [{ ...doc, snippet: `${start ? '…' : ''}${text.slice(start, start + 200)}${text.length > start + 200 ? '…' : ''}` }];
  });
}
