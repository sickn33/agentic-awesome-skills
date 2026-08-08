export const metadata = {
  id: 'force-dynamic',
  title: "export const dynamic = 'force-dynamic'",
  severity: 'medium',
  billingDimension: 'function-duration',
  trafficIndependent: false,
  description:
    "force-dynamic disables static + ISR rendering. The route runs the function on every request. Sometimes necessary (cookies, headers, real-time data), often a habit that costs function-duration and edge-requests at scale.",
  fix:
    "Audit the route. If dynamic behavior comes from cookies()/headers()/searchParams, force-dynamic may be redundant — Next infers dynamic automatically. Consider revalidate / 'use cache' / generateStaticParams if any portion can be pre-rendered.",
  citations: [
    'https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**'],
  includeGlobs: ['**/route.{ts,tsx,js,jsx}', '**/page.{ts,tsx,js,jsx}'],
};

const RE = /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!isApplicable(path)) continue;
    const m = RE.exec(content);
    if (m) {
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, m.index),
        evidence: 'export const dynamic = "force-dynamic"',
        trafficIndependent: metadata.trafficIndependent,
      });
    }
  }
  return out;
}

import { lineOf } from '../util.mjs';

function isApplicable(path) {
  return /(\/route|\/page)\.(tsx?|jsx?)$/.test(path);
}
