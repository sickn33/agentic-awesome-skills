// Templatize concrete URL paths into OpenAPI path templates.
//
// Strategy: classify each segment in isolation; collisions across samples are
// handled by the caller (normalize.mjs), which groups samples by the resulting
// templated path and falls back to keeping endpoints split when the response
// shape disagrees.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_RE  = /^[0-9a-f]{8,}$/i;
const B62_RE  = /^[A-Za-z0-9]{8,}$/;
const INT_RE  = /^\d+$/;

// Static-looking segments we never template even if they're numeric/hex
// (e.g. version markers like "v1", "v2", short slugs that are real path parts).
const STATIC_HINTS = /^(v\d+|api|graphql|rest|public|private|me|self)$/i;

export function classifySegment(seg) {
  if (!seg) return { kind: 'static' };
  if (STATIC_HINTS.test(seg)) return { kind: 'static' };
  if (UUID_RE.test(seg)) return { kind: 'param', name: 'id', schema: { type: 'string', format: 'uuid' } };
  if (INT_RE.test(seg))  return { kind: 'param', name: 'id', schema: { type: 'integer' } };
  if (HEX_RE.test(seg))  return { kind: 'param', name: 'id', schema: { type: 'string' } };
  if (B62_RE.test(seg) && /[A-Z]/.test(seg) && /[a-z]/.test(seg) && /\d/.test(seg)) {
    return { kind: 'param', name: 'id', schema: { type: 'string' } };
  }
  return { kind: 'static' };
}

// Single-pass templating used during the first sweep — segments are evaluated
// independently. Returns { template, params: [{name, schema, position}] }.
export function templatize(rawPath) {
  const segs = rawPath.split('/');
  const params = [];
  let counter = 0;
  const out = segs.map((seg, i) => {
    if (!seg && i > 0) return seg;
    const c = classifySegment(seg);
    if (c.kind === 'static') return seg;
    counter++;
    const name = counter === 1 ? c.name : `${c.name}${counter}`;
    params.push({ name, schema: c.schema, position: i });
    return `{${name}}`;
  });
  return { template: out.join('/'), params };
}

// Second pass: given a set of paths that share the same number of segments
// and the same statics in the obvious positions, detect "slug" segments —
// positions that are alpha and *vary* across samples but didn't trip the
// numeric/UUID/hex classifiers in pass 1. Returns the same shape as templatize.
export function templatizeWithSlugs(paths) {
  if (paths.length < 2) return templatize(paths[0]);
  const split = paths.map(p => p.split('/'));
  const len = split[0].length;
  if (!split.every(s => s.length === len)) return templatize(paths[0]);

  const params = [];
  let counter = 0;
  const tpl = [];
  for (let i = 0; i < len; i++) {
    const colSamples = split.map(s => s[i]);
    const first = colSamples[0];
    if (!first && i > 0) { tpl.push(''); continue; }

    const c0 = classifySegment(first);
    if (c0.kind === 'param') {
      counter++;
      const name = counter === 1 ? c0.name : `${c0.name}${counter}`;
      params.push({ name, schema: c0.schema, position: i });
      tpl.push(`{${name}}`);
      continue;
    }

    const distinct = new Set(colSamples);
    if (distinct.size > 1 && colSamples.every(s => /^[A-Za-z0-9_-]+$/.test(s))) {
      counter++;
      const name = counter === 1 ? 'slug' : `slug${counter}`;
      params.push({ name, schema: { type: 'string' }, position: i });
      tpl.push(`{${name}}`);
      continue;
    }

    tpl.push(first);
  }
  return { template: tpl.join('/'), params };
}
