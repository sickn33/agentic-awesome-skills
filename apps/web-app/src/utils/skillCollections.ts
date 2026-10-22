export const COLLECTIONS_KEY = 'aas_skill_collections_v1';
export const COLLECTIONS_EVENT = 'aas-collections-changed';
export const MAX_COLLECTIONS = 20;
export const MAX_COLLECTION_SKILLS = 200;
export const MAX_COLLECTION_FILE_BYTES = 256 * 1024;

export interface SkillCollection { id: string; name: string; note: string; version: string; ids: string[] }
export interface CollectionFile { format: 1; collections: SkillCollection[] }
const idPattern = /^[a-z0-9][a-z0-9_-]{0,127}$/;
// Skill IDs follow the public catalog contract; collection record IDs retain their stricter limit.
const skillIdPattern = /^[a-z0-9][a-z0-9._-]{0,199}$/;
const versionPattern = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/;

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function keys(value: Record<string, unknown>, expected: string[]): boolean { return Object.keys(value).length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key)); }
export function parseCollectionFile(text: string): CollectionFile {
  if (new TextEncoder().encode(text).length > MAX_COLLECTION_FILE_BYTES) throw new Error('Collection file is too large (maximum 256 KB).');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Choose a valid AAS collections JSON file.'); }
  if (!object(value) || !keys(value, ['format', 'collections']) || value.format !== 1 || !Array.isArray(value.collections) || value.collections.length > MAX_COLLECTIONS) throw new Error('Unsupported collection format or too many collections (maximum 20).');
  const identities = new Set<string>();
  const collections = value.collections.map((entry: unknown): SkillCollection => {
    if (!object(entry) || !keys(entry, ['id', 'name', 'note', 'version', 'ids']) || typeof entry.id !== 'string' || !idPattern.test(entry.id) || identities.has(entry.id) || typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 80 || typeof entry.note !== 'string' || entry.note.length > 2000 || typeof entry.version !== 'string' || entry.version.length > 64 || !versionPattern.test(entry.version) || !Array.isArray(entry.ids) || !entry.ids.length || entry.ids.length > MAX_COLLECTION_SKILLS || entry.ids.some((id) => typeof id !== 'string' || !skillIdPattern.test(id)) || new Set(entry.ids).size !== entry.ids.length) throw new Error('Invalid collection: check its name, notes, version, and unique skill IDs (maximum 200).');
    identities.add(entry.id);
    return { id: entry.id, name: entry.name.trim(), note: entry.note, version: entry.version, ids: entry.ids as string[] };
  });
  return { format: 1, collections };
}
export function serializeCollections(collections: SkillCollection[]): string {
  const text = JSON.stringify({ format: 1, collections }, null, 2);
  parseCollectionFile(text);
  return text;
}
export function newCollectionId(): string { return `collection-${crypto.randomUUID()}`; }
