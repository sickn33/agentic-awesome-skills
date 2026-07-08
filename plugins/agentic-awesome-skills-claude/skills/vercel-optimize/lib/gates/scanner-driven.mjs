// Signal source is the codebase itself, not traffic. COLD-PATH and NO-ROUTE-MAPPING findings
// are dropped unless the scanner sets trafficIndependent (build configs, middleware matchers, etc.).
// Annotation happens in scan-codebase.mjs; gates here just read scanner.o11ySignal.

export const SCANNER_GATES = [
  { id: 'image_optimization', patterns: ['unoptimized-image'], threshold: 2,
    billingDimension: 'image-optimization', priority: 30 },
  { id: 'cache_header_gap', patterns: ['max-age-without-s-maxage', 'missing-cache-headers'], threshold: 1,
    billingDimension: 'edge-requests', priority: 40 },
  { id: 'rendering_candidate', patterns: ['force-dynamic', 'headers-in-page'], threshold: 3,
    billingDimension: 'function-duration', priority: 35 },
  { id: 'use_cache_date_stamp', patterns: ['use-cache-date-stamp'], threshold: 1,
    billingDimension: 'isr', priority: 45 },
  { id: 'cache_components_suspense_dedupe', patterns: ['cache-components-suspense-dedupe'], threshold: 1,
    billingDimension: 'function-duration', priority: 38 },
];

export const metadata = {
  id: 'scanner-driven',
  threshold: 'per-kind: scanner matches.length >= threshold',
  billingDimension: 'mixed',
  scope: 'mixed',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Configured kinds emitted from scanner output. Each requires a minimum match count to avoid noise. Findings on cold-path or unmappable files are dropped unless the underlying scanner is trafficIndependent.',
};

export function gate(signals) {
  const findings = signals.codebase?.findings ?? [];
  if (findings.length === 0) return [];

  const candidates = [];

  for (const cfg of SCANNER_GATES) {
    const matched = findings.filter((f) => {
      if (!cfg.patterns.includes(f.pattern)) return false;
      if (!f.trafficIndependent) {
        if (!f.o11ySignal || f.o11ySignal === 'scanner-only') return false;
        if (f.o11ySignal === 'COLD-PATH') return false;
        if (f.o11ySignal === 'NO-ROUTE-MAPPING') return false;
      }
      if (cfg.id === 'cache_header_gap' && observedCacheHitRate(f.o11ySignal) >= 90) return false;
      return true;
    });

    for (const group of groupFindings(cfg, matched)) {
      if (group.findings.length < cfg.threshold) continue;
      candidates.push(candidateForGroup(cfg, group));
    }
  }

  return candidates;
}

function groupFindings(cfg, findings) {
  const groups = new Map();
  for (const finding of findings) {
    const scope = finding.route ? 'route' : 'file';
    const target = scope === 'route' ? finding.route : finding.file;
    if (!target) continue;
    const key = `${cfg.id}:${scope}:${target}`;
    if (!groups.has(key)) groups.set(key, { scope, target, findings: [] });
    groups.get(key).findings.push(finding);
  }
  return [...groups.values()];
}

function candidateForGroup(cfg, group) {
  const matched = group.findings;
  const route = group.scope === 'route' ? group.target : null;
  return {
    kind: cfg.id,
    scope: group.scope,
    route,
    files: uniqueStrings(matched.map((m) => m.file)).slice(0, 6),
    priority: cfg.priority + Math.min(matched.length, 10),
    confidence: 0.88,
    o11ySignal: matched
      .map((m) => m.o11ySignal)
      .find((s) => s && s !== 'COLD-PATH' && s !== 'NO-ROUTE-MAPPING')
      ?? 'scanner-only',
    reason: `${matched.length} ${cfg.patterns.join('+')} finding(s)`,
    question: questionFor(cfg.id, matched),
    evidence: {
      scannerMatches: matched.length,
      patterns: cfg.patterns,
      scope: group.scope,
      route,
      sampleFiles: matched.slice(0, 3).map((m) => ({ file: m.file, line: m.line })),
    },
  };
}

function questionFor(kindId, matched) {
  const sample = matched.slice(0, 3).map((m) => m.file).join(', ');
  switch (kindId) {
    case 'image_optimization':
      return `Which raw <img> tags in ${sample} should move to next/image (or the framework's image component)?`;
    case 'cache_header_gap':
      return `Should the route handlers in ${sample} set Cache-Control with s-maxage to serve from the CDN?`;
    case 'rendering_candidate':
      return `Why are the routes in ${sample} forced to dynamic rendering, and can any of them tolerate ISR or static generation?`;
    case 'use_cache_date_stamp':
      return `Which 'use cache' boundaries in ${sample} embed new Date()/Date.now()/Math.random() that destabilizes cache keys, and can the timestamps be hoisted to a build constant or moved into a client useEffect?`;
    case 'cache_components_suspense_dedupe':
      return `In ${sample}, which repeated fetch or helper is being re-invoked across separate <Suspense> boundaries, and can the promise be hoisted to the page level or moved to 'use cache: remote' for cross-boundary dedupe?`;
    default:
      return `Investigate ${matched.length} ${kindId} finding(s).`;
  }
}

function uniqueStrings(values) {
  return [...new Set(values.filter((v) => typeof v === 'string' && v.length > 0))];
}

function observedCacheHitRate(signal) {
  if (typeof signal !== 'string') return null;
  const m = /\bcache=([\d.]+)%/.exec(signal);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}
