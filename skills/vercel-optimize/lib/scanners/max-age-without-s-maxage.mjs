import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'max-age-without-s-maxage',
  title: 'Cache-Control: max-age without s-maxage',
  severity: 'medium',
  billingDimension: 'edge-requests',
  trafficIndependent: false,
  description:
    'max-age caches in the browser; s-maxage caches at the CDN. Without s-maxage, every uncached visitor request invokes the function. Only measured public, shared GET responses can justify adding s-maxage; savings require measurement.',
  fix:
    'After proving the response is public and shared, consider s-maxage in the Cache-Control header. Example: Cache-Control: public, max-age=60, s-maxage=600, stale-while-revalidate=86400. Pair with explicit cache-bust strategy if content can change.',
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
      const surroundingLine = content.slice(content.lastIndexOf('\n', m.index) + 1, content.indexOf('\n', m.index) < 0 ? undefined : content.indexOf('\n', m.index));
      if (/s-maxage/i.test(surroundingLine)) continue;
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
