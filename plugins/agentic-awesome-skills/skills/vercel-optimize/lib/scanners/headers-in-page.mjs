import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'headers-in-page',
  title: 'Dynamic API call forcing dynamic rendering',
  severity: 'medium',
  billingDimension: 'function-duration',
  trafficIndependent: false,
  description:
    'headers(), cookies(), and draftMode() are dynamic APIs. Reading them in a page/layout makes the entire segment dynamic — no ISR, no static generation, and a function invocation on every request.',
  fix:
    'Move the dynamic API call into a child Server Component that lives inside a Suspense boundary. The parent can stay static; only the leaf re-renders dynamically.',
  citations: [
    'https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config',
    'https://nextjs.org/docs/app/building-your-application/caching',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**'],
  includeGlobs: ['**/{page,layout,template}.{tsx,jsx}'],
};

const RE = /\b(cookies|headers|draftMode)\s*\(\s*\)/g;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!isApplicable(path)) continue;
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(content)) !== null) {
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, m.index),
        evidence: `${m[1]}()`,
        trafficIndependent: metadata.trafficIndependent,
      });
    }
  }
  return out;
}

function isApplicable(path) {
  return /\/(page|layout|template)\.(tsx|jsx)$/.test(path);
}
