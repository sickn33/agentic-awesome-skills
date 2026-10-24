// Prepend a caveat (don't drop — customer may be on a higher tier) when a
// rec prescribes concurrency above a known provider account quota.

const PROVIDER_LIMITS = {
  notion: { label: 'Notion', doc: 'https://developers.notion.com/reference/request-limits' },
  openai: { label: 'OpenAI', doc: 'https://platform.openai.com/docs/guides/rate-limits' },
  stripe: { label: 'Stripe', doc: 'https://docs.stripe.com/rate-limits' },
  anthropic: { label: 'Anthropic', doc: 'https://docs.anthropic.com/en/api/rate-limits' },
};

export const metadata = {
  id: 'rate-limit',
  description: 'Prepend caveat when a rec prescribes concurrency above a known provider account quota.',
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
    if (concurrency > 0) {
      const tag = `rate-limit:${limit.label}:${concurrency}:quota-check`;
      tags.push(tag);
      prepend += `⚠ ${limit.label}: concurrency ${concurrency} does not establish requests per second. Check the account/model-specific quotas and response headers, then bound concurrency, throughput and retries before applying.\n\n`;
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
