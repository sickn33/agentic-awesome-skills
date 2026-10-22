export const MAX_SHARED_SKILLS = 50;
const MAX_FRAGMENT_LENGTH = 12000;
// Match the canonical public catalog skill ID contract (skillsIndex.ts).
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,199}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

export interface SharedShortlist {
  format: 1;
  version: string;
  ids: string[];
}

function isSharedShortlist(value: unknown): value is SharedShortlist {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<SharedShortlist>;
  return data.format === 1 && typeof data.version === 'string' && data.version.length <= 64
    && VERSION_PATTERN.test(data.version) && Array.isArray(data.ids)
    && data.ids.length > 0 && data.ids.length <= MAX_SHARED_SKILLS
    && data.ids.every((id) => typeof id === 'string' && ID_PATTERN.test(id))
    && new Set(data.ids).size === data.ids.length
    && Object.keys(data).every((key) => ['format', 'version', 'ids'].includes(key));
}

/** Only catalog IDs and version enter the URL. No goals, targets or imported artifacts. */
export function buildSharedShortlistUrl(ids: string[], version: string, origin: string, baseUrl: string): string {
  const payload: SharedShortlist = { format: 1, version, ids };
  if (!isSharedShortlist(payload)) throw new Error(`Share between 1 and ${MAX_SHARED_SKILLS} distinct skill IDs.`);
  const fragment = `selection=${encodeURIComponent(JSON.stringify(payload))}`;
  if (fragment.length > MAX_FRAGMENT_LENGTH) throw new Error('This selection is too large to share in a link.');
  const url = new URL(`${baseUrl.replace(/\/?$/, '/')}share/`, origin);
  url.hash = fragment;
  return url.href;
}

export function parseSharedShortlist(hash: string): SharedShortlist | null {
  if (hash.length > MAX_FRAGMENT_LENGTH + 1 || !hash.startsWith('#selection=')) return null;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(hash.slice('#selection='.length)));
    return isSharedShortlist(value) ? value : null;
  } catch {
    return null;
  }
}
