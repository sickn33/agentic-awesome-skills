import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'prisma-include-tree-bloat',
  title: 'Deep Prisma include tree (3+ levels)',
  severity: 'high',
  billingDimension: 'function-duration',
  trafficIndependent: false,
  description:
    'Nested .include({ x: { include: { y: { include: { z: ... } } } } }) can fetch excess related data. Prisma query strategy, cardinality and selected fields determine actual SQL and cost; inspect query logs and payloads before claiming a join explosion.',
  fix:
    'Replace with explicit .findMany() calls or scoped .include() of only what the consumer reads. Consider the query select option to project specific fields. For lists, batch with DataLoader patterns.',
  citations: [
    'vercel-react-best-practices:server-parallel-fetching',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**'],
  includeGlobs: ['**/*.{ts,tsx,js,jsx}'],
};

// Catches 3+ nesting levels of `include:` within a single object literal.
const RE = /include\s*:\s*\{[\s\S]*?include\s*:\s*\{[\s\S]*?include\s*:/g;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (/\.test\.|\.spec\./.test(path)) continue;
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(content)) !== null) {
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, m.index),
        evidence: '3+ levels of nested Prisma .include()',
        trafficIndependent: metadata.trafficIndependent,
      });
      // One finding per file is enough — agent investigates holistically.
      break;
    }
  }
  return out;
}
