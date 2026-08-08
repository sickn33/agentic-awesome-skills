// Final-gate sanitizer: drops a rec with no citations left after
// unknown-citation + version-mismatch have run. Every rec must carry ≥1
// citation.

export const metadata = {
  id: 'missing-citation',
  description: 'Drop rec when citations[] is empty after other sanitizers.',
};

export function apply(rec, _ctx = {}) {
  const cites = Array.isArray(rec.citations) ? rec.citations : [];
  if (cites.length === 0) {
    return { dropped: true, tag: 'missing-citation' };
  }
  return {};
}
