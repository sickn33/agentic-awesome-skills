// Build Minutes climb on monorepos when Turborepo cache is bypassed or every project rebuilds on every commit.
// Threshold: Build Minutes line > 15% of total bill OR scanner emits any turbo-force-bypass finding (even at lower share).
// Account-scoped because the lever is project-settings (Ignored Build Step, Elastic Build Machines), not code.
export const metadata = {
  id: 'build_minutes_fanout',
  threshold: 'Build Minutes share > 0.15 OR turbo-force-bypass finding present',
  billingDimension: 'build',
  scope: 'account',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Build Minutes line dominates the bill or Turborepo cache is bypassed. On monorepos, unchanged work should be skipped through Vercel skip-unaffected behavior, a verified Ignored Build Step, and a complete Turbo cache contract.',
};

const BUILD_RE = /^Build (CPU )?Minutes$/i;
const SCANNER_PATTERN = 'turbo-force-bypass';
const SHARE_FLOOR = 0.15;

export function gate(signals) {
  const services = signals?.usage?.services;
  const total = Array.isArray(services)
    ? services.reduce((acc, s) => acc + Number(s.billedCost ?? s.cost ?? 0), 0)
    : 0;
  const buildBilled = Array.isArray(services)
    ? services
        .filter((s) => BUILD_RE.test(String(s?.name ?? '')))
        .reduce((acc, s) => acc + Number(s.billedCost ?? s.cost ?? 0), 0)
    : 0;

  const buildShare = total > 0 ? buildBilled / total : 0;

  const findings = (signals?.codebase?.findings ?? []).filter((f) => f.pattern === SCANNER_PATTERN);

  if (buildShare <= SHARE_FLOOR && findings.length === 0) return [];

  const subtypes = unique(findings.map((f) => f.subtype).filter(Boolean));
  const sampleFiles = unique(findings.map((f) => f.file).filter(Boolean)).slice(0, 4);

  const reason = findings.length > 0
    ? (buildShare > SHARE_FLOOR
        ? 'Build Minutes share is high and Turborepo cache bypass detected in repo'
        : 'Turborepo cache bypass detected in repo')
    : 'Build Minutes line exceeds 15% of total billed cost';

  return [{
    kind: metadata.id,
    scope: 'account',
    files: sampleFiles,
    priority: findings.length > 0 ? 65 : 50,
    confidence: findings.length > 0 ? 0.86 : 0.74,
    o11ySignal: `build_minutes_share=${(buildShare * 100).toFixed(0)}% scanner_findings=${findings.length}`,
    reason,
    question: findings.length > 0
      ? `Turborepo cache bypass detected (${subtypes.join(', ')}). Which build pipeline forces a rebuild on every commit, and can Ignored Build Step + cache re-enable cut the project fan-out?`
      : 'Build Minutes exceed 15% of the bill. Is Ignored Build Step configured? Is Turborepo cache active across builds? Would Elastic Build Machines reduce duration on hot builds?',
    evidence: {
      metric: 'usage.services',
      buildBilled,
      totalBilled: total,
      buildShare,
      scannerFindings: findings.length,
      scannerSubtypes: subtypes,
      sampleFiles,
    },
  }];
}

function unique(values) {
  return [...new Set(values)];
}
