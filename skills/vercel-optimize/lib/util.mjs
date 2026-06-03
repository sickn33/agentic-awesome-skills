// Shared scanner + sanitizer helpers. Keep tiny — add only when duplicated 3+ times.

// 1-based line number of `idx` in a multi-line string.
export function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length;
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeMarkdownTableCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ');
}

// `slow_route:/api/products` → `/api/products`.
export function extractRoute(rec) {
  if (typeof rec?.candidateRef !== 'string') return null;
  const m = rec.candidateRef.match(/^[^:]+:(.+)$/);
  return m ? m[1] : null;
}
