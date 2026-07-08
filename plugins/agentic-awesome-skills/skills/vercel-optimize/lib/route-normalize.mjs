// Canonicalize Next.js 16 segment-tree metric route paths so gate dedup doesn't burn budget on N copies of the same source file.
//
// Next.js folds flag state into base64 prefix, dynamic placeholders into `$d$X`, route groups into `!K..p`, cache-lifecycle leaves into `__PAGE__.segment` / `_tree.segment` / `_index.segment`. ~4-10x dupes per page without canonicalization.
//
// This module is the ONLY place we touch Next.js metric path encoding — every gate calls canonicalizeRoute before aggregating.

export const ROUTE_SHAPE_RE = /(?:^.{200,}$)|[\s'"`,;&=<>(){}!\\^|\u0000-\u001F]|%(?:22|5B|5C|7B|7D|20|3C|3E|26)|localhost:|https?:\/|\/\/(?!$)|[:,\$\s]$|\.segments?\/|__PAGE__|@[a-z]/i;

export function isSegmentTreePath(route) {
  if (typeof route !== 'string') return false;
  return /\.segments(\/|$)/.test(route);
}

export function canonicalizeRoute(route) {
  if (typeof route !== 'string' || route.length === 0) return route;
  if (!isSegmentTreePath(route)) return stripRouteGroups(replaceBase64WithDynamic(route));

  // Discard prefix (flag-state + dynamic value, both noise). Tail is the segment-tree node.
  const idx = route.indexOf('.segments');
  if (idx < 0) return route;
  const segmentTail = route.slice(idx + '.segments'.length).replace(/^\//, '');

  // _tree.segment / _index.segment have no per-segment tail — fall back to static head of prefix.
  if (segmentTail === '_tree.segment' || segmentTail === '_index.segment') {
    return canonicalizeBranchPrefix(route, idx);
  }

  const parts = segmentTail.split('/').filter((p) => p && !isMetricLeaf(p));
  if (parts.length === 0) return canonicalizeBranchPrefix(route, idx);
  const decoded = parts.map(decodeSegmentToken).filter(Boolean);
  if (decoded.length === 0) return canonicalizeBranchPrefix(route, idx);
  // scan-codebase's routePath enumeration drops route groups — match it or the route→file lookup breaks.
  return stripRouteGroups('/' + decoded.join('/'));
}

function canonicalizeBranchPrefix(route, segmentsIdx) {
  const prefix = route.slice(0, segmentsIdx);
  const parts = prefix.split('/').filter(Boolean);
  // Drop trailing dynamic value (e.g. "london") and base64 flag-state — neither is a route segment.
  const cleaned = parts
    .filter((p) => !isBase64FlagState(p))
    .slice(0, -1);
  if (cleaned.length === 0) return prefix || '/';
  return '/' + cleaned.join('/');
}

function isMetricLeaf(token) {
  return (
    token === '__PAGE__.segment' ||
    token === '_tree.segment' ||
    token === '_index.segment' ||
    token === '__page__.segment' ||
    token.endsWith('.segment') && token.startsWith('_')
  );
}

// Conservative heuristic for `eyJoYXNTZXNzaW9uIjpmYWxzZX0`-shape tokens: URL-safe base64 alphabet, length ≥16, mixed case.
function isBase64FlagState(token) {
  if (typeof token !== 'string') return false;
  if (token.length < 16) return false;
  return /^[A-Za-z0-9_-]+$/.test(token) && /[A-Z]/.test(token) && /[a-z]/.test(token);
}

// `/event/<base64>/teaser` → `/event/[*]/teaser`. Stripping entirely (old behavior) corrupted segment count and broke route→file lookup.
function replaceBase64WithDynamic(route) {
  if (typeof route !== 'string' || !route.startsWith('/')) return route;
  const parts = route.split('/');
  let mutated = false;
  const replaced = parts.map((p, i) => {
    if (i === 0) return p;
    if (isBase64FlagState(p)) { mutated = true; return '[*]'; }
    return p;
  });
  if (!mutated) return route;
  return replaced.join('/') || '/';
}

// Route groups `(default)` never appear in rendered URLs — scan-codebase drops them, so canonical form must match.
function stripRouteGroups(route) {
  if (typeof route !== 'string' || !route.includes('(')) return route;
  const parts = route.split('/');
  const kept = parts.filter((p) => !/^\([^)]+\)$/.test(p));
  const joined = kept.join('/');
  return joined.startsWith('/') ? (joined || '/') : '/' + joined;
}

// $d$X → [X] · $oc$X → [[...X]] · $c$X → [...X] · !K…p → (group) · metric-leaves → dropped.
function decodeSegmentToken(token) {
  if (isMetricLeaf(token)) return '';

  let t = token.endsWith('.segment') ? token.slice(0, -'.segment'.length) : token;

  if (/^\$d\$/.test(t)) return `[${t.slice(3)}]`;
  if (/^\$oc\$/.test(t)) return `[[...${t.slice(4)}]]`;
  if (/^\$c\$/.test(t)) return `[...${t.slice(3)}]`;

  // `!` is segment-tree marker; body is base64 of `(default)` etc. Accept only when decoded looks like `(name)`.
  if (t.startsWith('!') && t.length > 1) {
    const body = t.slice(1);
    try {
      const decoded = Buffer.from(body, 'base64').toString('utf-8');
      if (/^\(.*\)$/.test(decoded)) return decoded;
    } catch {
      /* fall through on decode failure */
    }
  }

  return t;
}

export function candidateKey(candidate) {
  const route = candidate?.route ?? candidate?.hostname ?? null;
  const kind = candidate?.kind ?? '?';
  const canonical = route ? canonicalizeRoute(route) : '<account>';
  return `${kind}::${canonical}`;
}

// Records alternates so the brief shows "all 4 cities collapse here" rather than a single per-city dupe.
export function mergeCandidates(a, b) {
  if (!a) return b;
  if (!b) return a;
  const winner = (b.priority ?? 0) > (a.priority ?? 0) ? b : a;
  const loser = winner === a ? b : a;
  const altRoutes = new Set([
    ...(Array.isArray(winner.aliasRoutes) ? winner.aliasRoutes : []),
    ...(Array.isArray(loser.aliasRoutes) ? loser.aliasRoutes : []),
  ]);
  if (loser.route && loser.route !== winner.route) altRoutes.add(loser.route);
  return {
    ...winner,
    // Canonicalize so briefs/reports/deep-dives see the clean path.
    route: canonicalizeRoute(winner.route),
    aliasRoutes: [...altRoutes].sort(),
    mergedCount: (winner.mergedCount ?? 1) + (loser.mergedCount ?? 1),
  };
}

// Input assumed sorted priority desc; output preserves that order. Account-scope pass through unchanged.
export function dedupeCandidates(candidates) {
  const byKey = new Map();
  const order = [];
  const dropped = [];
  for (const c of candidates) {
    if (!c || c.scope === 'account' || (!c.route && !c.hostname)) {
      order.push(c);
      continue;
    }
    const key = candidateKey(c);
    if (byKey.has(key)) {
      const merged = mergeCandidates(byKey.get(key), c);
      byKey.set(key, merged);
      dropped.push({
        candidate: c,
        mergedInto: key,
        reason: 'duplicate of higher-priority sibling (same source route after canonicalization)',
      });
    } else {
      byKey.set(key, { ...c, route: c.route ? canonicalizeRoute(c.route) : c.route });
      order.push({ __key: key });
    }
  }
  const deduped = order.map((c) => (c && c.__key ? byKey.get(c.__key) : c));
  return { deduped, dropped };
}

export function isLikelyNextRouteShape(route) {
  return typeof route === 'string' && route.length > 0 && !ROUTE_SHAPE_RE.test(route);
}

export function routeShapeWarning(route, signals = {}) {
  return routeShapeWarnings(route, signals)[0] ?? null;
}

export function routeShapeWarnings(route, signals = {}) {
  if (typeof route !== 'string' || route.length === 0) return [];
  const warnings = [];
  if (ROUTE_SHAPE_RE.test(route)) warnings.push('route-shape:suspicious-metric-label');
  const first = firstRouteSegment(canonicalizeRoute(route));
  if (first && shouldWarnUnknownFirstSegment(first, signals)) {
    warnings.push(`route-shape:unknown-first-segment:${first}`);
  }
  return warnings;
}

export function withRouteShapeWarnings(candidate, signals = {}) {
  const warnings = routeShapeWarnings(candidate?.route, signals);
  if (warnings.length === 0) return candidate;
  return {
    ...candidate,
    warnings: [...new Set([...(Array.isArray(candidate.warnings) ? candidate.warnings : []), ...warnings])],
  };
}

function firstRouteSegment(route) {
  if (typeof route !== 'string') return null;
  return route.split('/').filter(Boolean)[0] ?? null;
}

function shouldWarnUnknownFirstSegment(first, signals) {
  const exempt = new Set(['_next', '_vercel', 'api', '.well-known']);
  if (exempt.has(first)) return false;
  const known = knownFirstSegments(signals);
  if (known.size === 0) return false;
  if ([...known].some(isDynamicPlaceholder)) return false;
  return !known.has(first);
}

function knownFirstSegments(signals) {
  const out = new Set();
  const routes = signals.codebase?.routes ?? [];
  for (const route of routes) {
    const first = firstRouteSegment(route?.routePath);
    if (first) out.add(first);
  }
  return out;
}

function isDynamicPlaceholder(segment) {
  return /^\[.*\]$/.test(segment);
}
