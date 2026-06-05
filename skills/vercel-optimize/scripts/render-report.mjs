#!/usr/bin/env node
// Final pipeline step. Emits customer-facing markdown from
// recommendations.json + gate.json + signals.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildFinalReportMessage, renderReport } from '../lib/render-report.mjs';
import { dedupeRecommendations } from '../lib/dedup-recs.mjs';
import { canonicalizeRoute } from '../lib/route-normalize.mjs';
import { hasUnsupportedCacheLifeCdnText, splitCustomerSafeObservations } from '../lib/observation-safety.mjs';

const log = (...a) => console.error('[render-report]', ...a);
const HARD_REGEN_TRIGGERS = new Set([
  'project_config_contradiction',
  'cache_vary_safety',
  'semantic_safety',
]);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.recsPath || !args.gatePath || !args.signalsPath) {
    console.error('usage: node scripts/render-report.mjs <recommendations.json> <gate.json> <signals.json> [--project NAME] [--out FILE] [--message-out FILE] [--no-timestamp] [--debug-out FILE]');
    process.exit(1);
  }

  const [recsRaw, gateRaw, signalsRaw] = await Promise.all([
    readFile(args.recsPath, 'utf-8').then(JSON.parse),
    readFile(args.gatePath, 'utf-8').then(JSON.parse),
    readFile(args.signalsPath, 'utf-8').then(JSON.parse),
  ]);

  // Accept either a raw rec array OR the verify-and-regen wrapper
  // {recsGraded, qualityDropped, ...}. Stale-rec defense: when verify-and-regen
  // flagged a hard-safety issue but the orchestrator skipped re-spawn, the
  // original rec is still in recsGraded. Filter it here so it can't ship; it
  // surfaces in "Investigated, no change recommended" instead.
  const hardRegenRefs = new Set(
    Array.isArray(recsRaw.regenPlan)
      ? recsRaw.regenPlan
          .filter((p) => HARD_REGEN_TRIGGERS.has(p.regenTrigger))
          .map((p) => p.candidateRef)
          .filter(Boolean)
      : []
  );
  const activeCandidates = [
    ...(Array.isArray(gateRaw.toLaunch) ? gateRaw.toLaunch : []),
    ...(Array.isArray(gateRaw.platform) ? gateRaw.platform : []),
  ];
  const enforceCurrentGate = !Array.isArray(recsRaw) && activeCandidates.length > 0;
  const staleRecommendationDrops = [];
  const wrapperRecommendations = Array.isArray(recsRaw.renderableRecommendations)
    ? recsRaw.renderableRecommendations
    : (recsRaw.recsGraded ?? []);
  const needsReviewDrops = [];
  const candidateRecommendations = Array.isArray(recsRaw)
    ? recsRaw.filter((r) => r?.abstain !== true)
    : wrapperRecommendations
        .filter((r, i) => (r.quality?.overall ?? 0) >= 0.55)
        .filter((r) => !hardRegenRefs.has(r.candidateRef));
  const recommendationsRaw = candidateRecommendations
        .filter((r) => {
          if (r?.abstain === true || r?.needsReview !== true) return true;
          needsReviewDrops.push({
            candidateRef: r.candidateRef ?? null,
            reason: 'This recommendation needs a manual safety review before it is ready to apply.',
          });
          return false;
        })
        .filter((r) => {
          if (!enforceCurrentGate) return true;
          if (recommendationMatchesActiveCandidate(r, activeCandidates)) return true;
          staleRecommendationDrops.push({
            candidateRef: r.candidateRef ?? null,
            reason: 'This recommendation came from a candidate that is not in the current run output. Re-run from a clean run directory before applying it.',
          });
          return false;
        });
  const recommendations = dedupeRecommendations(recommendationsRaw);
  const readyTargets = new Set(
    recommendations
      .map((r) => candidateTarget(r?.candidateRef))
      .filter(Boolean)
  );
  const droppedContradictions = !Array.isArray(recsRaw)
    ? (recsRaw.recsGraded ?? [])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => hardRegenRefs.has(r.candidateRef))
        .map(({ r, i }) => ({
          candidateRef: r.candidateRef ?? null,
          reason: publicHardRegenReason(recsRaw.regenPlan?.find((p) => p.index === i || p.candidateRef === r.candidateRef)),
        }))
    : [];

  const gated = Array.isArray(gateRaw.gated) ? gateRaw.gated : [];

  // No-change findings are first-class investigation outputs ("the hypothesis didn't hold").
  // Contradiction-dropped recs ride alongside them so customers see WHY a rec
  // was held back instead of it silently disappearing.
  const baseAbstentions = Array.isArray(recsRaw)
    ? recsRaw.filter((r) => r?.abstain === true).map((r) => ({
        candidateRef: r.candidateRef ?? null,
        reason: publicNoChangeReason(r.reason ?? '(no reason recorded)'),
      }))
    : (recsRaw.abstentions ?? []).map((r) => ({
        ...r,
        reason: publicNoChangeReason(r.reason ?? '(no reason recorded)'),
      }));
  const publicBaseAbstentions = baseAbstentions.filter((r) => !readyTargets.has(candidateTarget(r?.candidateRef)));
  // Observations: no-change findings carrying a structured non-perf finding
  // (deployment regression, error storm, etc.).
  const flattenedObservations = Array.isArray(recsRaw)
    ? flattenObservations(recsRaw.filter((r) => r?.abstain === true))
    : flattenObservations([
        ...(Array.isArray(recsRaw.observations) ? recsRaw.observations : []),
        ...(Array.isArray(recsRaw.abstentions) ? recsRaw.abstentions : []),
      ]);
  const { observations: safeObservations, heldBackObservations } = splitCustomerSafeObservations(flattenedObservations, baseAbstentions, signalsRaw);
  const observations = suppressReadyCoveredObservations(safeObservations, recommendations);

  const abstentions = [
    ...publicBaseAbstentions,
    ...droppedContradictions,
    ...staleRecommendationDrops,
    ...needsReviewDrops,
    ...(Array.isArray(recsRaw.withheldRecommendations) ? recsRaw.withheldRecommendations.map((d) => ({
      candidateRef: d.candidateRef ?? null,
      reason: publicWithheldReason(d),
      needsEvidence: true,
    })) : []),
    ...(Array.isArray(recsRaw.sanitizerDropped) ? recsRaw.sanitizerDropped.map((d) => ({
      candidateRef: d.candidateRef ?? null,
      reason: `This needs a closer review before it is safe to apply: ${d.reason ?? 'review required'}.`,
      needsEvidence: true,
    })) : []),
    ...(Array.isArray(recsRaw.heldBackObservations) ? recsRaw.heldBackObservations.map((d) => ({
      ...d,
      needsEvidence: true,
    })) : []),
    ...heldBackObservations,
  ];

  // Full catalog lets the renderer recover o11ySignal + aliasRoutes that recs
  // didn't propagate, and canonicalize segment-tree candidateRefs.
  const allCandidates = [
    ...activeCandidates,
    ...gated,
  ];

  const md = renderReport({
    recommendations,
    gated,
    abstentions,
    observations,
    signals: signalsRaw,
    candidates: allCandidates,
    opts: {
      projectName: args.projectName,
      generatedAt: args.noTimestamp ? null : new Date().toISOString(),
      heldBackCount: (Number.isInteger(recsRaw.summary?.withheldRecommendations)
          ? recsRaw.summary.withheldRecommendations
          : (Array.isArray(recsRaw.regenPlan) ? recsRaw.regenPlan.length : 0) +
            (Array.isArray(recsRaw.qualityDropped) ? recsRaw.qualityDropped.length : 0)) +
        (Array.isArray(recsRaw.sanitizerDropped) ? recsRaw.sanitizerDropped.length : 0) +
        (Array.isArray(recsRaw.heldBackObservations) ? recsRaw.heldBackObservations.length : 0) +
        heldBackObservations.length,
      noChangeCount: Number.isInteger(recsRaw.summary?.abstentions)
        ? Math.min(recsRaw.summary.abstentions, publicBaseAbstentions.length)
        : publicBaseAbstentions.length,
    },
  });

  if (args.debugOutPath) {
    const debugArtifact = buildDebugArtifact({
      recsRaw,
      recommendationsRaw,
      recommendations,
      gateRaw,
      abstentions,
      observations,
      heldBackObservations,
      staleRecommendationDrops,
      droppedContradictions,
    });
    const serializedDebug = JSON.stringify(debugArtifact, null, 2) + '\n';
    await mkdir(dirname(args.debugOutPath), { recursive: true });
    await writeFile(args.debugOutPath, serializedDebug, 'utf-8');
    log(`wrote debug ${serializedDebug.length}B → ${args.debugOutPath}`);
  }

  if (args.messageOutPath) {
    const messageArtifact = buildFinalReportMessage({
      reportPath: args.outPath ?? '(stdout)',
      markdown: md,
      recommendations,
      signals: signalsRaw,
    });
    const serializedMessage = JSON.stringify(messageArtifact, null, 2) + '\n';
    await mkdir(dirname(args.messageOutPath), { recursive: true });
    await writeFile(args.messageOutPath, serializedMessage, 'utf-8');
    log(`wrote final message ${serializedMessage.length}B → ${args.messageOutPath}`);
  }

  if (args.outPath) {
    await mkdir(dirname(args.outPath), { recursive: true });
    await writeFile(args.outPath, md + '\n', 'utf-8');
    log(`wrote ${md.length}B → ${args.outPath}`);
  } else {
    process.stdout.write(md + '\n');
  }
}

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project') out.projectName = argv[++i];
    else if (a.startsWith('--project=')) out.projectName = a.slice('--project='.length);
    else if (a === '--out') out.outPath = resolve(argv[++i]);
    else if (a.startsWith('--out=')) out.outPath = resolve(a.slice('--out='.length));
    else if (a === '--message-out') out.messageOutPath = resolve(argv[++i]);
    else if (a.startsWith('--message-out=')) out.messageOutPath = resolve(a.slice('--message-out='.length));
    else if (a === '--no-timestamp') out.noTimestamp = true;
    else if (a === '--debug-out') out.debugOutPath = resolve(argv[++i]);
    else if (a.startsWith('--debug-out=')) out.debugOutPath = resolve(a.slice('--debug-out='.length));
    else if (a === '--debug') {
      console.error('[render-report] --debug no longer writes internal details into customer markdown; use --debug-out FILE');
    }
    else out.positional.push(a);
  }
  out.recsPath = out.positional[0];
  out.gatePath = out.positional[1];
  out.signalsPath = out.positional[2];
  return out;
}

function publicWithheldReason(record) {
  switch (record?.reason) {
    case 'needs_review':
      return 'Automated checks added a safety caveat, so this run kept the recommendation out of the ready-to-apply list.';
    case 'quality_floor':
      return 'The recommendation did not meet the evidence bar for this report.';
    case 'project_config_contradiction':
    case 'cache_vary_safety':
    case 'semantic_safety':
      return publicHardRegenReason({ regenTrigger: record.reason });
    default:
      return 'This recommendation needs stronger evidence before it is safe to apply.';
  }
}

function publicHardRegenReason(plan) {
  switch (plan?.regenTrigger) {
    case 'project_config_contradiction':
      return 'The recommendation tried to turn on a project setting that is already enabled. Re-run the investigation with refreshed project-config evidence.';
    case 'cache_vary_safety':
      return 'The recommendation added shared CDN caching to output that varies by request geography without the required Vary header. Re-run the investigation with the cache-safety failure in scope.';
    case 'semantic_safety':
      return 'This recommendation needs stronger framework evidence before it is safe to apply. Re-run the investigation with that evidence in scope.';
    default:
      return 'This recommendation needs stronger evidence before it is safe to apply. Re-run the investigation with those checks in scope.';
  }
}

function recommendationMatchesActiveCandidate(rec, candidates) {
  const ref = parseCandidateRef(rec?.candidateRef);
  if (!ref) return true;
  return candidates.some((candidate) => candidateMatchesRef(candidate, ref));
}

function parseCandidateRef(ref) {
  if (typeof ref !== 'string' || ref.length === 0) return null;
  const [kind, ...targetParts] = ref.split(':');
  if (!kind) return null;
  return { kind, target: targetParts.join(':') };
}

function candidateMatchesRef(candidate, ref) {
  if (!candidate || candidate.kind !== ref.kind) return false;
  if (candidate.scope === 'account' || ref.target === '<account>') return true;

  const candidateTarget = candidate.route ?? candidate.hostname ?? candidate.file ?? candidate.target ?? null;
  if (!candidateTarget || !ref.target) return false;

  const a = String(candidateTarget);
  const b = String(ref.target);
  return a === b || canonicalizeRoute(a) === canonicalizeRoute(b);
}

function suppressReadyCoveredObservations(observations, recommendations = []) {
  if (!Array.isArray(observations) || observations.length === 0) return [];
  const readyFamiliesByTarget = new Map();
  for (const rec of recommendations) {
    const parsed = parseCandidateRef(rec?.candidateRef);
    const target = candidateTarget(rec?.candidateRef);
    const family = candidateFamily(parsed?.kind);
    if (!target || !family) continue;
    const set = readyFamiliesByTarget.get(target) ?? new Set();
    set.add(family);
    readyFamiliesByTarget.set(target, set);
  }

  return observations.filter((observation) => {
    const parsed = parseCandidateRef(observation?.candidateRef);
    const target = candidateTarget(observation?.candidateRef);
    const family = candidateFamily(parsed?.kind);
    if (!target || !family) return true;
    return !readyFamiliesByTarget.get(target)?.has(family);
  });
}

function candidateFamily(kind) {
  switch (kind) {
    case 'uncached_route':
    case 'cache_header_gap':
    case 'missing_cache_headers':
    case 'max_age_without_s_maxage':
      return 'cache';
    case 'slow_route':
    case 'cold_start':
    case 'external_api_slow':
    case 'cwv_poor':
      return 'performance';
    case 'route_errors':
      return 'reliability';
    case 'isr_overrevalidation':
      return 'isr';
    case 'middleware_heavy':
      return 'middleware';
    case 'build_minutes_fanout':
      return 'build';
    default:
      return kind || null;
  }
}

function candidateTarget(ref) {
  if (typeof ref !== 'string') return null;
  const idx = ref.indexOf(':');
  if (idx === -1) return null;
  return ref.slice(idx + 1);
}

function publicNoChangeReason(reason) {
  if (hasUnsupportedCacheLifeCdnText(reason)) {
    return 'This candidate overlapped a cache-lifetime draft that did not meet the framework evidence bar. No supported change shipped from this run.';
  }
  return reason;
}

function buildDebugArtifact({
  recsRaw,
  recommendationsRaw,
  recommendations,
  gateRaw,
  abstentions = [],
  observations = [],
  heldBackObservations = [],
  staleRecommendationDrops = [],
  droppedContradictions = [],
}) {
  const wrapper = Array.isArray(recsRaw) ? null : recsRaw;
  const sourceRecords = Array.isArray(recsRaw)
    ? recsRaw
    : (recsRaw.recsGraded ?? []);
  const summary = wrapper?.summary
    ? {
        ...wrapper.summary,
        rawRecommendationCount: recommendationsRaw.length,
        renderedRecommendationCount: recommendations.length,
      }
    : null;
  return {
    schemaVersion: '1.0',
    summary,
    regenPlan: wrapper?.regenPlan ?? [],
    qualityDropped: wrapper?.qualityDropped ?? [],
    withheldRecommendations: wrapper?.withheldRecommendations ?? [],
    abstentions,
    observations,
    heldBackObservations,
    staleRecommendationDrops,
    droppedContradictions,
    sanitizerDropped: wrapper?.sanitizerDropped ?? [],
    renderedRecommendationCount: recommendations.length,
    rawRecommendationCount: recommendationsRaw.length,
    gateBudget: gateRaw?.budget ?? null,
    recommendations: sourceRecords
      .filter((record) => record && record.abstain !== true)
      .map((record) => ({
        candidateRef: record.candidateRef ?? null,
        what: record.what ?? null,
        verification: record.verification ?? null,
        quality: record.quality ?? null,
        passRate: record.passRate ?? record.verification?.passRate ?? null,
        avgQuality: record.avgQuality ?? null,
        needsReview: record.needsReview === true,
        sanitizerTrail: Array.isArray(record.sanitizerTrail) ? record.sanitizerTrail : [],
      })),
  };
}

function flattenObservations(records) {
  const out = [];
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    if (record.observation && typeof record.observation === 'object') {
      out.push({
        candidateRef: record.candidateRef ?? null,
        summary: coerceOptionalString(record.observation.summary),
        evidence: record.observation.evidence ?? null,
        suggestedAction: record.observation.suggestedAction ?? null,
        kind: record.observation.kind ?? 'other',
      });
      continue;
    }
    if ('summary' in record || 'evidence' in record || 'suggestedAction' in record || 'kind' in record) {
      out.push({
        candidateRef: record.candidateRef ?? null,
        summary: coerceOptionalString(record.summary),
        evidence: record.evidence ?? null,
        suggestedAction: record.suggestedAction ?? null,
        kind: record.kind ?? 'other',
      });
    }
  }
  return out;
}

function coerceOptionalString(value) {
  return value == null ? value : String(value);
}

main().catch((err) => {
  console.error('[render-report] FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
