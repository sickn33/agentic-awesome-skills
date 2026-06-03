#!/usr/bin/env node
// Pure-JS deterministic gate. Reads merged signals.json, emits
// {toLaunch, platform, gated}. Same input → byte-identical output (modulo
// appliedAt). Sort keys are stable and explicit — never change without
// a co-located golden-output test update.

import { readFile } from 'node:fs/promises';
import { gates, DEFAULT_MAX_CODE_CANDIDATES, GATE_VERSION } from '../lib/gates/index.mjs';
import { applyAuthDisqualifier } from '../lib/auth-route.mjs';
import { dedupeCandidates } from '../lib/route-normalize.mjs';
import { validateCandidates } from '../lib/gates/contract.mjs';
import { applyHardGates } from '../lib/gates/hard-gates.mjs';
import { selectLaunchCandidates } from '../lib/gates/select-candidates.mjs';
import { routePathMatchScore } from '../lib/investigation-brief.mjs';

const SCHEMA_VERSION = '1.1';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.signalsPath) {
    console.error('usage: node scripts/gate-investigations.mjs <signals.json> [--max-candidates N|all]');
    console.error('       VERCEL_OPTIMIZE_MAX_CANDIDATES env var supported (same values)');
    process.exit(1);
  }
  const budget = resolveBudget(args);
  const signals = JSON.parse(await readFile(args.signalsPath, 'utf-8'));

  const allSeeds = gates.flatMap((g) => {
    try {
      return g.gate(signals) ?? [];
    } catch (err) {
      console.error(`[gate-investigations] gate ${g.metadata?.id} threw: ${err.message}`);
      return [];
    }
  });

  const validSeeds = validateCandidates(allSeeds, { source: 'gate-output' });
  const annotated = validSeeds.map(applyAuthDisqualifier);
  const sorted = annotated.slice().sort(stableCompare);

  // Next.js 16 segment-tree metric paths surface the same source file under
  // many encoded labels (city variants, _tree/_index siblings, base64 flag
  // prefixes). Without dedup the budget gets shredded ~4-10x per page.
  const { deduped, dropped } = dedupeCandidates(sorted);
  const displayAnnotated = deduped.map((candidate) => attachDisplayRoute(candidate, signals));
  const hardGateResult = applyHardGates(displayAnnotated, signals);
  const gateable = hardGateResult.allowed;

  // Account-scope candidates don't compete with code-scope for the budget.
  const codeScoped = gateable.filter((c) => !c.disqualified && c.scope !== 'account');
  const platformScoped = gateable.filter((c) => !c.disqualified && c.scope === 'account');

  const selection = selectLaunchCandidates(codeScoped, budget, {
    diversify: args.budgetSource === 'default',
  });
  const toLaunch = selection.selected;
  const skippedByBudget = selection.skipped;
  const budgetLabel = budget === Infinity ? 'unlimited (all)' : String(budget);
  const gated = [
    ...gateable
      .filter((c) => c.disqualified)
      .map((c) => ({ ...c, gatedReason: c.disqualifyReason ?? 'disqualified' })),
    ...hardGateResult.gated,
    ...skippedByBudget.map((c) => ({
      ...c,
      gatedReason: `skippedByBudget (max-candidates=${budgetLabel}; raise with --max-candidates N or =all)`,
    })),
    ...dropped.map((d) => ({
      ...d.candidate,
      gatedReason: `coveredBy (${d.mergedInto}) — ${d.reason}`,
    })),
  ];

  process.stdout.write(JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    gateVersion: GATE_VERSION,
    appliedAt: new Date().toISOString(),
    budget: {
      maxCandidates: budget === Infinity ? 'all' : budget,
      source: args.budgetSource,
      selection: selection.selectionMode,
    },
    toLaunch,
    platform: platformScoped,
    gated,
    gateMetadata: gates.map((g) => ({
      id: g.metadata?.id,
      threshold: g.metadata?.threshold,
      billingDimension: g.metadata?.billingDimension,
      sourceCitation: g.metadata?.sourceCitation,
    })),
  }, null, 2) + '\n');
}

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--max-candidates') out.maxCandidatesArg = argv[++i];
    else if (a.startsWith('--max-candidates=')) out.maxCandidatesArg = a.slice('--max-candidates='.length);
    else out.positional.push(a);
  }
  out.signalsPath = out.positional[0];
  return out;
}

function resolveBudget(args) {
  const raw = args.maxCandidatesArg ?? process.env.VERCEL_OPTIMIZE_MAX_CANDIDATES;
  if (raw == null || raw === '') {
    args.budgetSource = 'default';
    return DEFAULT_MAX_CODE_CANDIDATES;
  }
  const trimmed = String(raw).trim().toLowerCase();
  if (trimmed === 'all' || trimmed === 'unlimited' || trimmed === '-1') {
    args.budgetSource = args.maxCandidatesArg != null ? 'flag' : 'env';
    return Infinity;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    console.error(`[gate-investigations] bad budget value '${raw}'; expected positive integer or 'all'`);
    process.exit(2);
  }
  args.budgetSource = args.maxCandidatesArg != null ? 'flag' : 'env';
  return n;
}

// Total ordering: priority desc, kind asc, route asc. Underpins byte-identical output.
function stableCompare(a, b) {
  const pa = a.priority ?? 0;
  const pb = b.priority ?? 0;
  if (pa !== pb) return pb - pa;
  const ka = String(a.kind ?? '');
  const kb = String(b.kind ?? '');
  if (ka !== kb) return ka.localeCompare(kb);
  const ra = String(a.route ?? a.hostname ?? '');
  const rb = String(b.route ?? b.hostname ?? '');
  return ra.localeCompare(rb);
}

function attachDisplayRoute(candidate, signals) {
  if (!candidate || candidate.scope !== 'route' || typeof candidate.route !== 'string') return candidate;
  if (!candidate.route.includes('[*]')) return candidate;

  const routes = (signals.codebase?.routes ?? [])
    .map((route) => route?.routePath)
    .filter((routePath) => typeof routePath === 'string' && routePath.length > 0);
  if (routes.length === 0) return candidate;

  let bestRoute = null;
  let bestScore = 0;
  for (const routePath of routes) {
    const score = routePathMatchScore(routePath, candidate.route);
    if (score > bestScore) {
      bestRoute = routePath;
      bestScore = score;
    }
  }

  if (!bestRoute || bestScore <= 0 || bestRoute === candidate.route) return candidate;
  return { ...candidate, displayRoute: bestRoute };
}

main().catch((err) => {
  console.error('[gate-investigations] FAILED:', err.message);
  process.exit(1);
});
