import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'max-age-without-s-maxage',
  title: 'Cache-Control: max-age without s-maxage',
  severity: 'medium',
  billingDimension: 'edge-requests',
  trafficIndependent: false,
  description:
    'max-age caches in the browser; s-maxage caches at the CDN. Without s-maxage, every uncached visitor request invokes the function. Adding s-maxage often cuts function invocations by 80%+ on read-heavy routes.',
  fix:
    'Add s-maxage to the Cache-Control header. Example: Cache-Control: public, max-age=60, s-maxage=600, stale-while-revalidate=86400. Pair with explicit cache-bust strategy if content can change.',
  citations: [
    'https://vercel.com/docs/caching/cdn-cache',
    'https://vercel.com/docs/caching/cache-control-headers',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**', '*.config.*'],
  includeGlobs: ['**/*.{ts,tsx,js,jsx,mjs}'],
};

const RE = /Cache-Control[^"'`]*?max-age\s*=\s*\d+/gi;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (/\.test\.|\.spec\./.test(path)) continue;
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(content)) !== null) {
      const hit = m[0];
      if (/s-maxage/i.test(hit) || /CDN-Cache-Control/i.test(content.slice(Math.max(0, m.index - 100), m.index + hit.length + 100))) continue;
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, m.index),
        evidence: hit.slice(0, 160),
        trafficIndependent: metadata.trafficIndependent,
      });
    }
  }
  return out;
}
