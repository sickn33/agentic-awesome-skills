import { canonicalizeRoute } from './route-normalize.mjs';

const KIND_LABELS = new Map([
  ['slow_route', 'Slow route'],
  ['uncached_route', 'Low cache-hit route'],
  ['cold_start', 'Cold starts'],
  ['route_errors', 'Route errors'],
  ['cache_header_gap', 'Missing cache headers'],
  ['image_optimization', 'Image optimization'],
  ['external_api_slow', 'Slow external API'],
  ['isr_overrevalidation', 'ISR over-revalidation'],
  ['middleware_heavy', 'Heavy middleware'],
  ['cwv_poor', 'Poor Core Web Vitals'],
  ['platform_fluid_compute', 'Fluid Compute usage'],
  ['platform_bot_protection', 'Bot traffic'],
  ['rendering_candidate', 'Rendering opportunity'],
  ['missing_cache_headers', 'Missing cache headers'],
  ['max_age_without_s_maxage', 'Browser-only cache header'],
  ['force_dynamic', 'Forced dynamic rendering'],
  ['headers_in_page', 'Dynamic API in page'],
  ['unoptimized_image', 'Image optimization gap'],
  ['large_static_asset', 'Large static asset'],
  ['source_maps_production', 'Production source maps'],
  ['edge_heavy_import', 'Heavy Edge import'],
]);

const SIGNAL_LABELS = new Map([
  ['inv', 'function invocations'],
  ['runs', 'function invocations'],
  ['middleware_inv', 'middleware invocations'],
  ['total_req', 'total requests'],
  ['requests', 'requests'],
  ['p95', '95th percentile duration'],
  ['p75', '75th percentile duration'],
  ['5xx', '5xx error rate'],
  ['errs', '5xx errors'],
  ['rate', '5xx error rate'],
  ['cache', 'cache hit rate'],
  ['get', 'GET request share'],
  ['cold', 'cold start rate'],
  ['writes', 'ISR write units'],
  ['reads', 'ISR read units'],
  ['w/r', 'ISR writes per read'],
  ['ratio', 'ratio'],
  ['host', 'host'],
  ['calls', 'external API calls'],
  ['edge_cost', 'Edge Request cost units'],
  ['bot_protection', 'Bot Protection'],
  ['bot_fdt_pct', 'bot Fast Data Transfer share'],
  ['LCP', 'Largest Contentful Paint (LCP)'],
  ['INP', 'Interaction to Next Paint (INP)'],
  ['CLS', 'Cumulative Layout Shift (CLS)'],
]);

const REQUEST_COUNT_KINDS = new Set([
  'uncached_route',
]);

const PUBLIC_ASSIGNMENT_LABELS = new Map([
  ...SIGNAL_LABELS,
  ['deepDive.latency.p95', 'deepDive latency p95'],
  ['deepDive.cpu.p95', 'deepDive CPU p95'],
  ['deepDive.ttfb.p95', 'deepDive TTFB p95'],
  ['cpu.p95', 'CPU p95'],
  ['latency.p95', 'latency p95'],
  ['ttfb.p95', 'TTFB p95'],
  ['cache_result', 'cache result'],
  ['http_status', 'HTTP status'],
  ['error_code', 'error code'],
  ['status', 'status'],
  ['count', 'count'],
]);

export function formatKind(kind) {
  if (!kind) return 'Candidate';
  if (KIND_LABELS.has(kind)) return KIND_LABELS.get(kind);
  return String(kind)
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Candidate';
}

export function formatRoute(candidate) {
  const route = candidate?.displayRoute ?? candidate?.route ?? candidate?.hostname ?? null;
  if (route) return String(canonicalizeRoute(route));
  if (Array.isArray(candidate?.files) && candidate.files.length > 0) return candidate.files[0];
  return 'account-wide';
}

export function formatSignal(signal, context = {}) {
  if (typeof signal !== 'string' || signal.trim() === '') return 'no signal recorded';

  const parts = signal
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => formatSignalPart(part, context));

  return parts.length > 0 ? parts.join('; ') : signal;
}

export function formatPublicText(value) {
  if (value == null) return '';
  return normalizeObservedWindowUnits(String(value))
    .replace(/\bo11y\b/gi, 'observability')
    .replace(/\bcache[- ]components gotcha\b/gi, 'Cache Components edge case')
    .replace(/\bcache_result\b(?!\s*=)/g, 'cache result')
    .replace(/\bhttp_status\b(?!\s*=)/g, 'HTTP status')
    .replace(/\berror_code\b(?!\s*=)/g, 'error code')
    .replace(/,(?=\s*([A-Za-z0-9][\w./-]*)=)/g, (match, key) =>
      PUBLIC_ASSIGNMENT_LABELS.has(key) ? '; ' : match
    )
    .replace(/\b([A-Za-z0-9][\w./-]*)=([^,;\s]+)/g, (match, key, rawValue) => {
      const label = PUBLIC_ASSIGNMENT_LABELS.get(key);
      if (!label) return match;
      return `${label}: ${formatSignalValue(key, rawValue)}`;
    })
    .replace(/\b(cache breakdown[^.!?\n;]{0,160}?)\b(?:function\s+)?invocations\b/gi, (match, prefix) =>
      /\bstatus distribution\b/i.test(prefix) ? match : `${prefix}requests`
    )
    .replace(/\b(cache breakdown[^.!?\n;]{0,220}?\bout of\s+[\d,]+)\s+invocations\b/gi, '$1 requests')
    .replace(/\b(cache hits over\s+[\d,.]+(?:\s?(?:K|M|B))?)\s+invocations\b/gi, '$1 requests')
    .replace(/\b(?:function\s+)?invocations\b([^.!?\n;]{0,120}\b(?:empty\s+)?cache result(?: label)?\b)/gi, 'requests$1');
}

export function normalizeObservedWindowUnits(value) {
  if (value == null) return '';
  return String(value)
    .replace(/(?<!\$)\b(\d[\d,.]*(?:\s?(?:K|M|B|KB|MB|GB|TB))?)\/mo\b/gi, '$1/window')
    .replace(/\bmonthly\s+function\s+invocations\b/gi, 'function invocations/window')
    .replace(/\b(requests?|invocations?|GETs|bytes|egress|bandwidth|writes?|reads?|errors?)\/mo\b/gi, '$1/window')
    .replace(/\bmonthly\s+(requests?|invocations?|GETs|bytes|egress|bandwidth|writes?|reads?|errors?)\b/gi, '$1/window')
    .replace(/\b(\d[\d,.]*(?:\s?(?:K|M|B|KB|MB|GB|TB))?)\s+function\s+invocations\s+per month\b/gi, '$1 function invocations/window')
    .replace(/\b(\d[\d,.]*(?:\s?(?:K|M|B|KB|MB|GB|TB))?)\s+(requests?|GETs|invocations?|bytes|writes?|reads?|errors?)\s+per month\b/gi, '$1 $2/window')
    .replace(/\b(\d[\d,.]*(?:\s?(?:K|M|B|KB|MB|GB|TB))?)\/window\s+(requests?|GETs|(?:function\s+)?invocations?|bytes|egress|bandwidth|writes?|reads?|errors?)\b/gi, '$1 $2 in this window')
    .replace(/\b(\d[\d,.]*(?:\s?(?:K|M|B|KB|MB|GB|TB))?)\s+(requests?|GETs|(?:function\s+)?invocations?|bytes|egress|bandwidth|writes?|reads?|errors?)\/window\b/gi, '$1 $2 in this window')
    .replace(/\b(\d[\d,.]*(?:\s?(?:K|M|B|KB|MB|GB|TB))?)\/window\b/gi, '$1 in this window')
    .replace(/\b(requests?|invocations?|GETs|bytes|egress|bandwidth|writes?|reads?|errors?)\/window\b/gi, '$1 in this window');
}

export function formatCandidateLine(candidate) {
  return `${formatKind(candidate?.kind)} on ${formatRoute(candidate)} - ${formatSignal(candidate?.o11ySignal, candidate)}`;
}

export function formatCandidateLabel(candidate) {
  return `${formatKind(candidate?.kind)} on ${formatRoute(candidate)}`;
}

function formatSignalPart(part, context = {}) {
  const eq = part.indexOf('=');
  if (eq === -1) return part;

  const key = part.slice(0, eq).trim();
  const value = part.slice(eq + 1).trim();
  const label = signalLabel(key, context);
  return `${label}: ${formatSignalValue(key, value)}`;
}

function signalLabel(key, context = {}) {
  const kind = typeof context === 'string' ? context : context?.kind;
  if (key === 'inv' && REQUEST_COUNT_KINDS.has(kind)) return 'requests';
  return SIGNAL_LABELS.get(key) ?? humanizeKey(key);
}

function humanizeKey(key) {
  return String(key)
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .trim();
}

function formatSignalValue(key, value) {
  if (key === 'inv' || key === 'runs' || key === 'middleware_inv' || key === 'total_req' || key === 'requests' || key === 'calls' || key === 'errs' || key === 'writes' || key === 'reads') {
    return formatNumberLike(value);
  }
  return value;
}

function formatNumberLike(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}
