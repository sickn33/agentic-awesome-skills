// Detects pinned function regions in vercel.json or per-route segment config.
// Provides the "configured region" signal for the region-misconfig gate when a TTFB
// breakdown by function_region isn't available (current state — see Phase 0 preflight
// in plans/wild-splashing-flamingo.md).
//
// Subtypes:
//   vercel-json-single   — vercel.json `regions: ["iad1"]` (single region, no failover)
//   vercel-json-list     — vercel.json `regions: [...]` (multi-region; informational)
//   segment-preferred    — `export const preferredRegion = 'iad1'` (or array)

import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'region-pin-in-config',
  title: 'Function region pinned in config',
  severity: 'low',
  billingDimension: 'function-duration',
  trafficIndependent: true,
  description:
    "vercel.json `regions` or per-route `preferredRegion` is set. If the pinned region is far from the dominant user geo (or far from a data source) p95 TTFB suffers. This scanner provides the configured-region signal so the region-misconfig gate can recommend an audit.",
  fix:
    "Audit the pinned region against traffic geography (Speed Insights or Web Analytics by country) and data-source location. Consider multi-region if data lives in a fixed location and users are global; consider relocating if users are concentrated in one geography.",
  citations: [
    'https://vercel.com/docs/functions/configuring-functions/region',
    'https://vercel.com/docs/functions/configuring-functions/region',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**'],
  includeGlobs: [
    'vercel.json',
    '**/vercel.json',
    '**/page.{ts,tsx,js,jsx}',
    '**/route.{ts,tsx,js,jsx}',
    '**/layout.{ts,tsx,js,jsx}',
  ],
};

// Matches `regions: ["iad1"]`, `regions: ['iad1', 'sfo1']`, or `"regions": ["iad1"]`
const VERCEL_JSON_REGIONS_RE = /['"]?regions['"]?\s*:\s*\[([^\]]+)\]/;
// `export const preferredRegion = 'iad1'` OR `= ['iad1', 'sfo1']`
const PREFERRED_REGION_RE = /export\s+const\s+preferredRegion\s*=\s*(['"][^'"]+['"]|\[[^\]]+\])/;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    const name = path.split('/').pop();

    if (name === 'vercel.json') {
      const m = VERCEL_JSON_REGIONS_RE.exec(content);
      if (m) {
        const regions = parseRegionList(m[1]);
        out.push({
          pattern: metadata.id,
          file: path,
          line: lineOf(content, m.index),
          evidence: `vercel.json regions: [${regions.join(', ')}]`,
          trafficIndependent: metadata.trafficIndependent,
          subtype: regions.length === 1 ? 'vercel-json-single' : 'vercel-json-list',
          regions,
        });
      }
      continue;
    }

    // Segment config files (page.tsx, route.ts, layout.tsx).
    const m = PREFERRED_REGION_RE.exec(content);
    if (m) {
      const raw = m[1];
      const regions = raw.startsWith('[') ? parseRegionList(raw.slice(1, -1)) : [raw.replace(/['"]/g, '')];
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, m.index),
        evidence: `preferredRegion = ${raw}`,
        trafficIndependent: metadata.trafficIndependent,
        subtype: 'segment-preferred',
        regions,
      });
    }
  }
  return out;
}

function parseRegionList(inner) {
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}
