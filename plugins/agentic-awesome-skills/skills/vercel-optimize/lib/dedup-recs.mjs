const NO_VALUE = '<none>';

export function dedupeRecommendations(recommendations = []) {
  if (!Array.isArray(recommendations)) {
    throw new TypeError('dedupeRecommendations recommendations must be an array');
  }

  const byKey = new Map();
  const order = [];
  for (const rec of recommendations) {
    if (!rec || typeof rec !== 'object' || rec.abstain === true) {
      order.push(rec);
      continue;
    }

    const key = recommendationKey(rec);
    if (!byKey.has(key)) {
      const normalized = withDedupMetadata(rec);
      byKey.set(key, normalized);
      order.push({ __dedupKey: key });
      continue;
    }

    const current = byKey.get(key);
    const merged = mergeDuplicateRecs(current, rec);
    byKey.set(key, merged);
  }

  return order.map((entry) => entry?.__dedupKey ? byKey.get(entry.__dedupKey) : entry);
}

export function recommendationKey(rec) {
  const intent = dedupIntent(rec);
  const bucket = intent === 'cache-control:s-maxage'
    ? NO_VALUE
    : String(rec?.bucket ?? NO_VALUE);
  return JSON.stringify([
    bucket,
    dedupEditTarget(rec),
    primarySkillRule(rec),
    intent,
  ]);
}

export function normalizePath(path) {
  if (typeof path !== 'string' || path.trim() === '') return NO_VALUE;
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .replace(/:(\d+)(?::\d+)?$/, '');
}

export function primarySkillRule(rec) {
  const citations = Array.isArray(rec?.citations) ? rec.citations : [];
  return citations.find((c) => typeof c === 'string' && /^[A-Za-z][\w-]*:[A-Za-z][\w-]*$/.test(c)) ?? NO_VALUE;
}

export function fixShape(rec) {
  if (typeof rec?.fixShape === 'string' && rec.fixShape.trim()) {
    return normalizeFixText(rec.fixShape);
  }
  const primaryText = [rec?.fix, rec?.desiredBehavior]
    .filter((v) => typeof v === 'string' && v.trim())
    .join('\n');
  const text = primaryText || rec?.what;
  return normalizeFixText(text);
}

export function dedupIntent(rec) {
  if (isSMaxageCacheHeaderRec(rec)) return 'cache-control:s-maxage';
  if (isCacheLifeRec(rec)) return cacheLifeIntent(rec);
  const sharedFunction = sharedFunctionTarget(rec);
  if (sharedFunction) return `parallel-shared-helper:${sharedFunction}`;
  return fixShape(rec);
}

export function dedupEditTarget(rec) {
  return sharedFunctionTarget(rec) ?? normalizePath(firstAffectedFile(rec));
}

function firstAffectedFile(rec) {
  const direct = affectedFiles(rec);
  const editTarget = referencedCodeFiles(rec, ['fix', 'desiredBehavior', 'currentBehavior'])[0];
  if (editTarget) return editTarget;
  const referenced = referencedCodeFiles(rec)
    .find((file) => direct.includes(file));
  if (referenced) return referenced;
  return Array.isArray(rec?.affectedFiles) ? rec.affectedFiles[0] : null;
}

function affectedFiles(rec) {
  return Array.isArray(rec?.affectedFiles)
    ? rec.affectedFiles.map(normalizePath).filter((file) => file !== NO_VALUE)
    : [];
}

function referencedCodeFiles(rec, fields = ['what', 'why', 'fix', 'currentBehavior', 'desiredBehavior', 'verify']) {
  const text = fields
    .map((field) => rec?.[field])
    .filter((v) => typeof v === 'string' && v.trim())
    .join('\n');
  const matches = text.match(/(?:^|[\s`'"(])((?:\.{1,2}\/|[A-Za-z0-9_.@-]+\/)[A-Za-z0-9_./@[\]()-]+\.(?:mjs|cjs|js|jsx|ts|tsx))/g) ?? [];
  return unique(matches.map((m) =>
    normalizePath(m.replace(/^[\s`'"(]+/, ''))
  ).filter((file) => file !== NO_VALUE));
}

function isSMaxageCacheHeaderRec(rec) {
  const text = [
    rec?.what,
    rec?.why,
    rec?.fix,
    rec?.desiredBehavior,
    ...(Array.isArray(rec?.citations) ? rec.citations : []),
  ].filter(Boolean).join('\n');
  return /\bs-maxage\b/i.test(text) &&
    /\b(?:Cache-Control|CDN cache|cdn-cache|caching\/cdn-cache)\b/i.test(text);
}

function isCacheLifeRec(rec) {
  const text = [
    rec?.candidateRef,
    rec?.what,
    rec?.why,
    rec?.fix,
    rec?.desiredBehavior,
    ...(Array.isArray(rec?.citations) ? rec.citations : []),
  ].filter(Boolean).join('\n');
  return /^isr_overrevalidation:/.test(String(rec?.candidateRef ?? '')) &&
    /\bcacheLife\s*\(|\bcacheLife\b/i.test(text);
}

function sharedFunctionTarget(rec) {
  const rule = primarySkillRule(rec);
  if (!/(?:^|:)async-parallel$|(?:^|:)server-parallel-fetching$|(?:^|:)async-suspense-boundaries$/.test(rule)) {
    return null;
  }
  const text = [
    rec?.what,
    rec?.why,
    rec?.fix,
    rec?.currentBehavior,
    rec?.desiredBehavior,
  ].filter((v) => typeof v === 'string' && v.trim()).join('\n');
  const names = [
    ...text.matchAll(/\b(?:get|fetch|load|read|render|create|generate|filter|resolve)[A-Z][A-Za-z0-9_]*\b/g),
  ].map((m) => m[0]);
  const stop = new Set([
    'getPayload',
    'draftMode',
    'notFound',
    'redirect',
    'Promise',
    'Response',
    'NextResponse',
  ]);
  const candidates = names.filter((name) => !stop.has(name));
  if (candidates.length === 0) return null;
  const score = new Map();
  for (const name of candidates) {
    score.set(name, (score.get(name) ?? 0) + 1);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || text.indexOf(a[0]) - text.indexOf(b[0]))
    .map(([name]) => `function:${name}`)[0] ?? null;
}

function cacheLifeIntent(rec) {
  const text = [
    rec?.what,
    rec?.why,
    rec?.fix,
    rec?.desiredBehavior,
    rec?.verify,
  ].filter(Boolean).join('\n');
  const profiles = unique(
    [...text.matchAll(/\bcacheLife\s*\(\s*['"`]([^'"`]+)['"`]/g)]
      .map((m) => m[1])
  );
  const tags = unique([
    ...[...text.matchAll(/\bcacheTag\s*\(([^)]*)\)/gs)].flatMap((m) => {
      const args = m[1] ?? '';
      return [
        ...[...args.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]),
        ...[...args.matchAll(/`([^`]+)`/g)].map((x) => x[1].includes('${') ? `${x[1].split('${')[0]}*` : x[1]),
      ];
    }),
  ]);
  const invalidation = /\b(?:revalidateTag|updateTag)\s*\(/.test(text) ? 'with-invalidation-api' : 'no-invalidation-api';
  return [
    'next-cache:cache-life',
    profiles.join('|') || NO_VALUE,
    tags.join('|') || NO_VALUE,
    invalidation,
  ].join(':');
}

function unique(values) {
  return Array.from(new Set(values.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()))).sort();
}

function normalizeFixText(text) {
  if (typeof text !== 'string' || text.trim() === '') return NO_VALUE;
  return text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' codeblock ')
    .replace(/`[^`]*`/g, ' code ')
    .replace(/\b\d+(?:\.\d+)?(?:ms|s|%|kb|mb|gb|k|m)?\b/g, '#')
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 80)
    .join(' ') || NO_VALUE;
}

function withDedupMetadata(rec) {
  const existing = normalizedAppliesAlsoTo(rec.appliesAlsoTo);
  const count = Math.max(
    numericCount(rec.corroborationCount),
    1 + existing.length,
  );
  return existing.length > 0 || count > 1
    ? { ...rec, appliesAlsoTo: existing, corroborationCount: count }
    : { ...rec };
}

function mergeDuplicateRecs(a, b) {
  const aScore = recScore(a);
  const bScore = recScore(b);
  const winner = bScore > aScore ? b : a;
  const loser = winner === a ? b : a;
  const winnerExisting = normalizedAppliesAlsoTo(winner.appliesAlsoTo);
  const loserExisting = normalizedAppliesAlsoTo(loser.appliesAlsoTo);
  const appliesAlsoTo = uniqueAppliesAlsoTo([
    ...winnerExisting,
    appliesAlsoEntry(loser),
    ...loserExisting,
  ]);
  const corroborationCount =
    numericCount(winner.corroborationCount) + numericCount(loser.corroborationCount);
  return {
    ...winner,
    appliesAlsoTo,
    corroborationCount: Math.max(corroborationCount, 1 + appliesAlsoTo.length),
  };
}

function recScore(rec) {
  const priority = typeof rec?.priority === 'number' ? rec.priority : 0;
  const quality = typeof rec?.quality?.overall === 'number' ? rec.quality.overall : 0;
  return (priority * 1_000_000_000_000) + signalMagnitude(rec) + quality;
}

function signalMagnitude(rec) {
  const text = [
    rec?.o11ySignal,
    rec?.why,
    rec?.what,
    rec?.impact,
  ].filter((v) => typeof v === 'string' && v.trim()).join('\n');
  const inv = parseNumber(text, /(?:inv|invocations?|function invocations?|requests?)[:=]\s*([\d,]+)/i);
  const p95 = parseNumber(text, /(?:p95|95th percentile(?: duration)?)[:=]?\s*([\d,]+)\s*ms/i);
  const errors = parseNumber(text, /(?:errs|errors?)[:=]\s*([\d,]+)/i);
  const writes = parseNumber(text, /writes[:=]\s*([\d,]+)/i);
  const reads = parseNumber(text, /reads[:=]\s*([\d,]+)/i);
  if (inv != null && p95 != null) return inv * p95;
  if (errors != null) return errors;
  if (writes != null && reads != null) return writes + reads;
  if (inv != null) return inv;
  return 0;
}

function parseNumber(text, re) {
  const match = re.exec(text);
  if (!match) return null;
  const value = Number(String(match[1]).replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function numericCount(value) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function appliesAlsoEntry(rec) {
  return {
    candidateRef: rec?.candidateRef ?? null,
    affectedFiles: Array.isArray(rec?.affectedFiles)
      ? rec.affectedFiles.map(normalizePath).filter((p) => p !== NO_VALUE)
      : [],
    o11ySignal: rec?.o11ySignal ?? null,
    what: rec?.what ?? null,
  };
}

function normalizedAppliesAlsoTo(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      candidateRef: e.candidateRef ?? null,
      affectedFiles: Array.isArray(e.affectedFiles)
        ? e.affectedFiles.map(normalizePath).filter((p) => p !== NO_VALUE)
        : [],
      o11ySignal: e.o11ySignal ?? null,
      what: e.what ?? null,
    }));
}

function uniqueAppliesAlsoTo(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = JSON.stringify([
      entry.candidateRef ?? NO_VALUE,
      entry.affectedFiles?.join(',') ?? NO_VALUE,
      entry.what ?? NO_VALUE,
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}
