// Maps billing line items to gate coverage so report surfaces uncovered dimensions (Sandbox, AI Gateway, Build, …) as blind spots.

import { escapeMarkdownTableCell } from './util.mjs';

// Service → billing dimension. dim=null means uncovered. Substring match — Vercel billing names are stable but untyped.
const SERVICE_DIMENSION = [
  { match: /^Function Duration$/i,                       dim: 'function-duration' },
  { match: /^Function Invocations$/i,                    dim: 'function-duration' },
  { match: /^Fluid Active CPU$/i,                        dim: 'function-duration' },
  { match: /^Fluid Provisioned Memory$/i,                dim: 'function-duration' },
  { match: /^Edge Requests$/i,                           dim: 'edge-requests' },
  { match: /^Edge Requests.*Additional CPU Duration/i,   dim: 'edge-requests' },
  { match: /^Edge Function Execution Units$/i,           dim: 'edge-requests' },
  { match: /^Edge Middleware Invocations$/i,             dim: 'edge-requests' },
  { match: /^ISR (Reads|Writes)$/i,                      dim: 'isr' },
  { match: /^Speed Insights( Data Points)?$/i,           dim: 'speed-insights' },
  { match: /^Image Optimization/i,                       dim: 'image-optimization' },
  // Indirect: bot-protection gate addresses bandwidth/edge spend.
  { match: /^Fast Data Transfer$/i,                      dim: 'edge-requests' },
  { match: /^Fast Origin Transfer$/i,                    dim: 'edge-requests' },

  // Uncovered.
  { match: /^Sandbox/i,                                  dim: null, family: 'sandbox' },
  { match: /^AI Gateway$/i,                              dim: null, family: 'ai-gateway' },
  { match: /^Build Minutes$/i,                           dim: 'build', family: 'build' },
  { match: /^Build CPU Minutes$/i,                       dim: 'build', family: 'build' },
  { match: /^Private Data Transfer$/i,                   dim: null, family: 'private-network' },
  { match: /^Secure Compute Network$/i,                  dim: null, family: 'private-network' },
  { match: /^Drains Volume$/i,                           dim: null, family: 'drains' },
  { match: /^Observability Events$/i,                    dim: 'observability-events', family: 'observability-events' },
  { match: /^Blob/i,                                     dim: null, family: 'blob' },
  { match: /^Edge Config (Reads|Writes)$/i,              dim: null, family: 'edge-config' },
  { match: /^Runtime Cache/i,                            dim: null, family: 'runtime-cache' },
  { match: /^Microfrontends/i,                           dim: null, family: 'microfrontends' },
  { match: /^Workflow/i,                                 dim: null, family: 'workflow' },
  { match: /^Queue/i,                                    dim: null, family: 'queues' },
  { match: /^Flag Requests$/i,                           dim: null, family: 'flags' },
  { match: /^Flags Explorer/i,                           dim: null, family: 'flags' },
  { match: /^BotID/i,                                    dim: null, family: 'botid' },
  { match: /^Firewall/i,                                 dim: null, family: 'firewall' },
  { match: /^Vercel Agent$/i,                            dim: null, family: 'vercel-agent' },

  // Fixed costs (seats, contracts) — not actionable.
  { match: /^v0 /i,                                      dim: null, family: 'fixed', actionable: false },
  { match: /^Additional Team Seats$/i,                   dim: null, family: 'fixed', actionable: false },
  { match: /^SAML$/i,                                    dim: null, family: 'fixed', actionable: false },
  { match: /^HIPAA BAA$/i,                               dim: null, family: 'fixed', actionable: false },
  { match: /^SIEM Integration$/i,                        dim: null, family: 'fixed', actionable: false },
  { match: /^Web Analytics/i,                            dim: null, family: 'fixed', actionable: false },
  { match: /^Static IPs$/i,                              dim: null, family: 'fixed', actionable: false },
  { match: /^Bulk Redirects$/i,                          dim: null, family: 'fixed', actionable: false },
  { match: /^Preview Deployment Suffix$/i,               dim: null, family: 'fixed', actionable: false },
  { match: /^Rolling Releases$/i,                        dim: null, family: 'fixed', actionable: false },
  { match: /^Observability Plus$/i,                      dim: null, family: 'fixed', actionable: false },
  { match: /^Platform Customer Usage$/i,                 dim: null, family: 'fixed', actionable: false },
  { match: /^Advanced Deployment Protection$/i,          dim: null, family: 'fixed', actionable: false },
];

export function classifyService(serviceName, activeDims) {
  if (!serviceName) return { covered: false, family: 'unknown' };
  for (const e of SERVICE_DIMENSION) {
    if (e.match.test(serviceName)) {
      if (e.dim && activeDims.has(e.dim)) return { covered: true, dim: e.dim };
      return { covered: false, family: e.family ?? 'unknown', actionable: e.actionable ?? true };
    }
  }
  return { covered: false, family: 'unknown', actionable: true };
}

export function computeCostCoverage(usage, gates) {
  const services = Array.isArray(usage?.services) ? usage.services : [];
  const activeDims = new Set(
    (gates ?? [])
      .map((g) => g?.metadata?.billingDimension)
      .filter((d) => typeof d === 'string' && d !== 'mixed')
  );
  let total = 0;
  let covered = 0;
  let uncovered = 0;
  const byFamily = new Map();

  for (const s of services) {
    const billed = Number(s.billedCost ?? 0);
    if (!Number.isFinite(billed) || billed <= 0) continue;
    total += billed;
    const c = classifyService(s.name, activeDims);
    if (c.covered) {
      covered += billed;
      continue;
    }
    uncovered += billed;
    const key = c.family;
    const prev = byFamily.get(key) ?? { family: key, billed: 0, services: [], actionable: c.actionable !== false };
    prev.billed += billed;
    prev.services.push({ name: s.name, billed });
    prev.actionable = prev.actionable && (c.actionable !== false);
    byFamily.set(key, prev);
  }

  const uncoveredByFamily = [...byFamily.values()]
    .sort((a, b) => b.billed - a.billed)
    .map((f) => ({ ...f, services: f.services.sort((a, b) => b.billed - a.billed) }));

  // Pick top gaps globally so multiple families surface (Sandbox + AI Gateway + Build, not 5 Sandbox sub-services). Exclude fixed costs — seats aren't actionable workload.
  const allActionableServices = [];
  for (const family of uncoveredByFamily) {
    if (!family.actionable) continue;
    for (const s of family.services) {
      allActionableServices.push({ name: s.name, billed: s.billed, family: family.family });
    }
  }
  allActionableServices.sort((a, b) => b.billed - a.billed);
  const topGaps = allActionableServices.slice(0, 5).map((s) => ({
    ...s,
    share: total > 0 ? s.billed / total : 0,
  }));
  return { totalBilled: total, coveredBilled: covered, uncoveredBilled: uncovered, uncoveredByFamily, topGaps };
}

export function renderCostCoverageMarkdown(coverage) {
  if (!coverage || !Number.isFinite(coverage.totalBilled) || coverage.totalBilled <= 0) return [];
  const { totalBilled, coveredBilled, uncoveredBilled, topGaps } = coverage;
  const actionableGaps = topGaps.filter((g) => g.share >= 0.01); // 1%+ share
  if (actionableGaps.length === 0) return [];
  const lines = [];
  lines.push('');
  lines.push('### Coverage gaps');
  lines.push('');
  const coveredPct = totalBilled > 0 ? (coveredBilled / totalBilled) * 100 : 0;
  const uncoveredPct = totalBilled > 0 ? (uncoveredBilled / totalBilled) * 100 : 0;
  lines.push(`This audit has metric coverage for **$${coveredBilled.toFixed(0)} (${coveredPct.toFixed(0)}%)** of this bill via function-duration, edge-requests, ISR, middleware, and image-optimization dimensions. **$${uncoveredBilled.toFixed(0)} (${uncoveredPct.toFixed(0)}%)** sits in billed areas this run cannot analyze safely, including the top actionable items below:`);
  lines.push('');
  lines.push('| Service | Billed | Share | Family | Coverage |');
  lines.push('|---|---|---|---|---|');
  for (const g of actionableGaps) {
    lines.push(`| ${escapeCell(g.name)} | $${g.billed.toFixed(2)} | ${(g.share * 100).toFixed(1)}% | ${g.family} | _not analyzed in this run_ |`);
  }
  lines.push('');
  lines.push('_Recommendations in this report address the covered dimensions. The uncovered rows are not ignored; they need a separate investigation before we can make safe recommendations._');
  return lines;
}

function escapeCell(s) {
  return escapeMarkdownTableCell(s);
}
