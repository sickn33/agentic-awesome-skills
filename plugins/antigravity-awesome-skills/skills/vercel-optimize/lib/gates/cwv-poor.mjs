// Thresholds are Google's "Poor" band (https://web.dev/articles/vitals): LCP p75 > 2500ms, INP > 200ms, CLS > 0.1.
// When Speed Insights isn't wired up the metrics come back empty and the gate is a no-op.
import { withRouteShapeWarnings } from '../route-normalize.mjs';

export const metadata = {
  id: 'cwv_poor',
  threshold: 'LCP p75>2500 OR INP p75>200 OR CLS p75>0.1, AND speed_insights count > 50',
  billingDimension: 'speed-insights',
  scope: 'route',
  sourceCitation: 'https://web.dev/articles/vitals',
  description:
    'Routes where Core Web Vitals fall into Google\'s "Poor" band on real-user traffic. LCP > 2500ms, INP > 200ms, or CLS > 0.1 each hurt SEO and conversion. Surfaces one candidate per (route, metric) pair to keep recommendations focused.',
};

// Below this floor p75 is too noisy to act on.
const MIN_PER_ROUTE_SAMPLES = 50;

export function gate(signals) {
  const totalSamples = sumRows(signals.metrics?.cwvCount?.rows);
  if (totalSamples === 0) return [];

  const countByRoute = byRoute(signals.metrics?.cwvCountByRoute?.rows);
  const lcpBy = byRoute(signals.metrics?.cwvLcpByRoute?.rows);
  const inpBy = byRoute(signals.metrics?.cwvInpByRoute?.rows);
  const clsBy = byRoute(signals.metrics?.cwvClsByRoute?.rows);

  const routes = new Set([...lcpBy.keys(), ...inpBy.keys(), ...clsBy.keys()]);
  const out = [];
  for (const route of routes) {
    const routeSamples = countByRoute.get(route) ?? 0;
    if (routeSamples < MIN_PER_ROUTE_SAMPLES) continue;
    const lcp = lcpBy.get(route);
    const inp = inpBy.get(route);
    const cls = clsBy.get(route);
    const issues = [];
    if (lcp != null && lcp > 2500) issues.push({ metric: 'LCP', value: Math.round(lcp), threshold: 2500, unit: 'ms' });
    if (inp != null && inp > 200) issues.push({ metric: 'INP', value: Math.round(inp), threshold: 200, unit: 'ms' });
    if (cls != null && cls > 0.1) issues.push({ metric: 'CLS', value: round2(cls), threshold: 0.1, unit: '' });
    if (issues.length === 0) continue;

    const summary = issues.map((i) => `${i.metric}=${i.value}${i.unit}`).join(',');
    out.push(withRouteShapeWarnings({
      kind: metadata.id,
      scope: 'route',
      route,
      files: [],
      priority: issues.reduce((s, i) => s + ratioOverThreshold(i), 0) * 10,
      confidence: 0.82,
      o11ySignal: summary,
      reason: 'real-user Core Web Vitals in poor band',
      question: `On ${route}, ${summary}. Which client-side work (bundle weight, blocking scripts, layout shifts, hydration) is responsible, and which change would land first?`,
      evidence: {
        metric: 'cwv',
        route,
        lcpMs: lcp != null ? Math.round(lcp) : null,
        inpMs: inp != null ? Math.round(inp) : null,
        cls: cls != null ? round2(cls) : null,
        issues,
        totalSpeedInsightsSamples: totalSamples,
        routeSpeedInsightsSamples: routeSamples,
      },
    }, signals));
  }
  return out;
}

function byRoute(rows) {
  const m = new Map();
  for (const r of rows ?? []) {
    if (!r.route || r.value == null) continue;
    m.set(r.route, r.value);
  }
  return m;
}

function sumRows(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((s, r) => s + (r.value ?? 0), 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function ratioOverThreshold(i) {
  return i.value / (i.threshold || 1);
}
