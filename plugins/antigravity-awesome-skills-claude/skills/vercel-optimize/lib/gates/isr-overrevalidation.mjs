// ISR writes re-execute the page render. A w/r ratio above 0.5 means writes are
// happening at least once for every two reads — high enough for the default
// audit to spend investigation budget. writes>100 avoids flapping on quiet routes.
export const metadata = {
  id: 'isr_overrevalidation',
  threshold: 'writes/reads > 0.5 AND writes > 100',
  billingDimension: 'isr',
  scope: 'route',
  sourceCitation: 'https://vercel.com/docs/incremental-static-regeneration',
  description:
    'ISR routes with > 1 write per 2 reads. The revalidate interval is too aggressive relative to read traffic — many reads pay to regenerate. Investigate whether the page can tolerate a longer revalidate window or on-demand revalidation via revalidateTag.',
};

export function gate(signals) {
  const rows = extractRows(signals);
  return rows
    .filter((r) => r.writes > 100 && r.reads > 0 && r.writes / r.reads > 0.5)
    .map((r) => {
      const ratio = r.writes / r.reads;
      return {
        kind: metadata.id,
        scope: 'route',
        route: r.route,
        files: [],
        priority: Math.round(r.writes),
        confidence: 0.88,
        o11ySignal: `writes=${r.writes},reads=${r.reads},w/r=${ratio.toFixed(2)}`,
        reason: 'ISR revalidating faster than read traffic justifies',
        question: `On ${r.route}, ${r.writes} ISR writes against ${r.reads} reads (${(ratio * 100).toFixed(0)} writes per 100 reads) — what is the current revalidate interval and can it be lengthened or switched to on-demand?`,
        evidence: {
          metric: 'isrWritesByRoute',
          route: r.route,
          writes: r.writes,
          reads: r.reads,
          ratio,
        },
      };
    });
}

function extractRows(signals) {
  const writes = signals.metrics?.isrWritesByRoute?.rows ?? [];
  const reads = signals.metrics?.isrReadsByRoute?.rows ?? [];

  const writeByRoute = new Map();
  for (const r of writes) {
    if (!r.route) continue;
    writeByRoute.set(r.route, (writeByRoute.get(r.route) ?? 0) + (r.value ?? 0));
  }
  const readByRoute = new Map();
  for (const r of reads) {
    if (!r.route) continue;
    readByRoute.set(r.route, (readByRoute.get(r.route) ?? 0) + (r.value ?? 0));
  }

  const routes = new Set([...writeByRoute.keys(), ...readByRoute.keys()]);
  return [...routes].map((route) => ({
    route,
    writes: writeByRoute.get(route) ?? 0,
    reads: readByRoute.get(route) ?? 0,
  }));
}
