// Region-misconfig gate. Branch 2 (scanner-only) — per-region TTFB data gap.
//
// The intended Branch 1 (region-grouped TTFB metric) was preflight-tested but the
// CLI returned INTERNAL_ERROR for the `--group-by route --group-by function_region`
// combination, and SAML re-auth blocked single-dim verification (see Phase 0 in
// plans/wild-splashing-flamingo.md). Ship scanner-only with `evidence.dataGap` and
// add the query later when verifiable.
//
// Fires when a single-region pin is found AND the project has meaningful surface area
// (routes.length > 20). Skips multi-region configs (informational only).
export const metadata = {
  id: 'region_misconfig',
  threshold: 'single-region pin found AND routes.length > 20 (scanner-only branch)',
  billingDimension: 'function-duration',
  scope: 'account',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    "A single function region is pinned in `vercel.json` or per-route `preferredRegion`. Without per-region TTFB data (data gap), the gate can't quantify the geographic latency cost — but a single-region pin on a project with 20+ routes is worth auditing against Speed Insights traffic geo.",
};

const ROUTE_FLOOR = 20;
const SCANNER_PATTERN = 'region-pin-in-config';

export function gate(signals) {
  const findings = (signals?.codebase?.findings ?? []).filter((f) => f.pattern === SCANNER_PATTERN);
  if (findings.length === 0) return [];

  const routes = signals?.codebase?.routes ?? [];
  if (routes.length < ROUTE_FLOOR) return [];

  const singleRegionFindings = findings.filter((f) => Array.isArray(f.regions) && f.regions.length === 1);
  if (singleRegionFindings.length === 0) return [];

  const allPinned = new Set();
  for (const f of singleRegionFindings) {
    for (const r of f.regions ?? []) allPinned.add(r);
  }
  const regionList = [...allPinned];

  // If multiple distinct single-region pins exist across files, the surface is partly
  // multi-region by accident; that's noteworthy but lower priority.
  const homogeneous = regionList.length === 1;

  return [{
    kind: metadata.id,
    scope: 'account',
    files: singleRegionFindings.map((f) => f.file).slice(0, 6),
    priority: homogeneous ? 42 : 38,
    confidence: 0.6, // low — no per-region TTFB data
    o11ySignal: `pinned_regions=${regionList.join(',')} routes=${routes.length}`,
    reason: homogeneous
      ? `all functions pinned to a single region (${regionList[0]}) on a project with ${routes.length} routes`
      : `${regionList.length} different single-region pins across files`,
    question: 'Are the pinned function regions aligned with the dominant user geography and the data source location? Speed Insights TTFB-by-country can ground the comparison.',
    evidence: {
      metric: 'codebase.findings',
      pinnedRegions: regionList,
      findingsCount: singleRegionFindings.length,
      routeCount: routes.length,
      sampleFiles: singleRegionFindings.slice(0, 3).map((f) => ({ file: f.file, regions: f.regions, subtype: f.subtype })),
      dataGap: 'region-grouped-TTFB-unavailable',
    },
  }];
}
