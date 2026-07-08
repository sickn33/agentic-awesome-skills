// Single source for "already on" project facts. Feeds report Strengths, sub-agent brief, and verifier contradiction check.
// contradictPhrases must lowercase exactly — verifier does case-insensitive substring match.

// Stable order = byte-identical brief output. Empty result when project config didn't load — don't pretend.
export function deriveProjectFacts(signals) {
  const out = [];
  const cfg = signals?.project?.defaultResourceConfig;
  const projectErr = signals?.project?.error;
  if (!cfg || projectErr) return out;

  if (cfg.fluid === true) {
    out.push({
      id: 'fluid_compute',
      strength: 'Fluid Compute is enabled (`defaultResourceConfig.fluid=true`) — instance reuse + reduced cold starts active.',
      briefLine: 'Fluid Compute is ENABLED on this project (`defaultResourceConfig.fluid=true`). Do not recommend toggling it on.',
      contradictPhrases: [
        'enable fluid compute',
        'enable fluid',
        'turn on fluid compute',
        'switch to fluid compute',
        'migrate to fluid compute',
        'opt in to fluid compute',
      ],
    });
  }
  if (cfg.elasticConcurrencyEnabled === true) {
    out.push({
      id: 'in_function_concurrency',
      strength: 'In-function concurrency is enabled — multiple invocations share a single function instance, lowering active CPU costs on I/O-bound work.',
      briefLine: 'In-function concurrency is ENABLED. Do not recommend toggling it on.',
      contradictPhrases: [
        'enable in-function concurrency',
        'enable elastic concurrency',
        'turn on in-function concurrency',
        'enable concurrent invocations',
      ],
    });
  }
  if (cfg.functionDefaultMemoryType === 'standard') {
    out.push({
      id: 'memory_standard',
      strength: 'Function memory tier: Standard (2GB) — the cost-efficient default; upgrade to Performance (4GB) only with memory, CPU-bound, or latency-sensitive route evidence.',
      briefLine: 'Function memory tier is Standard (2GB), the cost-efficient default. Recommending an upgrade to Performance (4GB) requires memory, CPU-bound, or latency-sensitive route evidence.',
      contradictPhrases: [],
    });
  } else if (cfg.functionDefaultMemoryType === 'performance') {
    out.push({
      id: 'memory_performance',
      strength: 'Function memory tier: **Performance (4GB)** — verify this is intentional; Performance costs ~2x Standard. If your routes don\'t saturate Standard\'s memory headroom, downgrade.',
      briefLine: 'Function memory tier is Performance (4GB). Do not recommend upgrading further — the next valid tier change is downgrading to Standard.',
      contradictPhrases: [
        'upgrade memory to performance',
        'upgrade to performance memory',
        'switch to performance memory',
        'enable performance memory',
      ],
    });
  }
  if (Array.isArray(cfg.functionDefaultRegions) && cfg.functionDefaultRegions.length > 0) {
    const r = cfg.functionDefaultRegions;
    out.push({
      id: 'function_regions',
      strength: `Function regions: \`${r.join(', ')}\` (${r.length === 1 ? 'single region' : 'multi-region'}).`,
      briefLine: `Function regions configured: ${r.join(', ')}. If your rec hinges on region placement, it must accept this configuration as the starting point.`,
      contradictPhrases: [],
    });
  }
  if (cfg.functionZeroConfigFailover === true) {
    out.push({
      id: 'zero_config_failover',
      strength: 'Function failover is enabled in project config.',
      briefLine: 'Function failover is ENABLED in project config. Do not recommend enabling it.',
      contradictPhrases: [
        'enable zero-config failover',
        'enable multi-region failover',
        'turn on zero-config failover',
      ],
    });
  }
  return out;
}

// `why` excluded — citing a fact as evidence ("fluid is on, so …") is legitimate, not contradiction.
export function findRecContradictions(rec, facts) {
  if (!rec || typeof rec !== 'object') return [];
  if (!Array.isArray(facts) || facts.length === 0) return [];
  const haystack = [
    rec.what,
    rec.fix,
    rec.desiredBehavior,
    rec.currentBehavior,
  ]
    .map((s) => (typeof s === 'string' ? s.toLowerCase() : ''))
    .join('\n');
  if (!haystack) return [];
  return facts.filter((f) =>
    (f.contradictPhrases ?? []).some((p) => haystack.includes(p.toLowerCase()))
  );
}
