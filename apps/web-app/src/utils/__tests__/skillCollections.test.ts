import { describe, expect, it } from 'vitest';
import { MAX_COLLECTION_FILE_BYTES, parseCollectionFile, serializeCollections, type SkillCollection } from '../skillCollections';
const collection: SkillCollection = { id: 'collection-1', name: 'Frontend', note: 'Private <script>note</script>', version: '19.3.0', ids: ['react-patterns', 'frontend-design'] };
const file = (entry: unknown) => JSON.stringify({ format: 1, collections: [entry] });
describe('bounded collection files', () => {
  it('round-trips exact IDs, order, version and notes without treating notes as markup', () => {
    expect(parseCollectionFile(serializeCollections([collection])).collections).toEqual([collection]);
  });
  it('preserves canonical dotted and 200-character skill IDs in collections', () => {
    const ids = ['review.v2', `a${'x'.repeat(199)}`];
    const updated = { ...collection, ids };
    expect(parseCollectionFile(serializeCollections([updated])).collections[0].ids).toEqual(ids);
    expect(() => parseCollectionFile(file({ ...collection, ids: [`a${'x'.repeat(200)}`] }))).toThrow();
  });
  it('rejects malformed, incompatible and oversized input', () => {
    for (const text of ['broken', '{}', JSON.stringify({ format: 2, collections: [] }), ' '.repeat(MAX_COLLECTION_FILE_BYTES + 1)]) expect(() => parseCollectionFile(text)).toThrow();
  });
  it('rejects extra fields, duplicate IDs, invalid versions and unsafe identifiers', () => {
    for (const change of [{ extra: true }, { name: '' }, { version: 'latest' }, { ids: ['ok', 'ok'] }, { ids: ['../secret'] }, { ids: [] }, { id: '__proto__' }, { note: 'x'.repeat(2001) }, { name: 'x'.repeat(81) }, { ids: Array.from({ length: 201 }, (_, i) => `id-${i}`) }]) expect(() => parseCollectionFile(file({ ...collection, ...change }))).toThrow();
    expect(() => parseCollectionFile(JSON.stringify({ format: 1, collections: [collection, collection] }))).toThrow();
    expect(() => parseCollectionFile(JSON.stringify({ format: 1, collections: Array.from({ length: 21 }, (_, i) => ({ ...collection, id: `list-${i}` })) }))).toThrow();
  });
});
