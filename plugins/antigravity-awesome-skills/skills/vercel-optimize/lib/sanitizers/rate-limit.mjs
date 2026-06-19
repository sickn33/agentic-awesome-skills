// Prepend a caveat (don't drop — customer may be on a higher tier) when a
// rec prescribes concurrency above a known provider rate limit.

const PROVIDER_LIMITS = {
  notion: { rps: 3, label: 'Notion', doc: 'https://developers.notion.com/reference/request-limits' },
  openai: { rps: 30, label: 'OpenAI', doc: 'https://platform.openai.com/docs/guides/rate-limits' },
  stripe: { rps: 100, label: 'Stripe', doc: 'https://docs.stripe.com/rate-limits' },
  anthropic: { rps: 10, label: 'Anthropic', doc: 'https://docs.anthropic.com/en/api/rate-limits' },
};

export const metadata = {
  id: 'rate-limit',
  description: 'Prepend caveat when a rec prescribes concurrency above a known provider rate limit.',
};

const PROVIDER_RE = new RegExp(`\\b(${Object.keys(PROVIDER_LIMITS).join('|')})\\b`, 'gi');
const CONCURRENCY_RE = /\b(?:concurrency|parallel|in\s+parallel|simultaneous|simultaneously|fan[- ]?out|Promise\.all)\b[^\d]{0,40}(\d{1,4})\b/gi;
const CONCURRENCY_RE_REVERSE = /\b(\d{1,4})\s*(?:concurrent|parallel|simultaneous|in flight)\b/gi;

export function apply(rec, _ctx = {}) {
  const text = collectText(rec);
  const providers = matchProviders(text);
  if (providers.length === 0) return {};
  const concurrency = matchConcurrency(text);
  if (concurrency === null) return {};

  const tags = [];
  let prepend = '';
  for (const key of providers) {
    const limit = PROVIDER_LIMITS[key];
    if (!limit) continue;
    if (concurrency > limit.rps) {
      const tag = `rate-limit:${limit.label}:${concurrency}/${limit.rps}`;
      tags.push(tag);
      prepend += `⚠ ${limit.label} rate-limits to ~${limit.rps} requests/second on first-tier plans; the prescribed concurrency of ${concurrency} may saturate the limit. Verify your tier before applying.\n\n`;
    }
  }
  if (tags.length === 0) return {};
  if (typeof rec.fix === 'string') rec.fix = prepend + rec.fix;
  else rec.fix = prepend.trim();
  return { tags, needsReview: true };
}

function collectText(rec) {
  return [rec.what, rec.why, rec.fix, rec.currentBehavior, rec.desiredBehavior]
    .filter((s) => typeof s === 'string')
    .join('\n');
}

function matchProviders(text) {
  const out = new Set();
  for (const m of text.matchAll(PROVIDER_RE)) out.add(m[1].toLowerCase());
  return [...out];
}

function matchConcurrency(text) {
  let max = null;
  for (const m of text.matchAll(CONCURRENCY_RE)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && (max === null || n > max)) max = n;
  }
  for (const m of text.matchAll(CONCURRENCY_RE_REVERSE)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && (max === null || n > max)) max = n;
  }
  return max;
}
