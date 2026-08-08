#!/usr/bin/env node
// Verify → grade → emit regenPlan. Does NOT spawn sub-agents — the
// orchestrator reads regenPlan, re-spawns one sub-agent per targeted candidate
// with topFailures injected, then re-runs this script. Thresholds are tuned
// below (REGEN_*, QUALITY_FLOOR) — read those constants for the live values.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { verifyClaim } from '../lib/verify-claim.mjs';
import { extractClaims, summarizeClaimResults } from '../lib/extract-claims.mjs';
import { gradeRecommendation, applyQualityFloor } from '../lib/grade-recommendation.mjs';
import { deriveProjectFacts } from '../lib/project-facts.mjs';
import { resolveRepoRoot } from '../lib/repo-root.mjs';
import { applySanitizers } from '../lib/sanitizers/index.mjs';

const SCHEMA_VERSION = '1.0';
const REGEN_PASS_RATE_THRESHOLD = 0.8;
// 1/1 failed is as broken as 1/5; below 2 claims is below the noise floor.
const REGEN_MIN_CLAIMS = 2;
// The Poor/Fair grade boundary — Poor recs erode trust faster than recall helps.
const QUALITY_FLOOR = 0.55;

const log = (...a) => console.error('[verify-and-regen]', ...a);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.recsPath) {
    console.error('usage: node scripts/verify-and-regen.mjs <recommendations.json> [--signals merged.json] [--repo-root DIR] [--out FILE]');
    process.exit(1);
  }

  const recs = JSON.parse(await readFile(args.recsPath, 'utf-8'));
  if (!Array.isArray(recs)) {
    console.error('[verify-and-regen] FATAL: recommendations.json must be an array of rec objects');
    process.exit(2);
  }

  let framework, version, cacheComponents, knownFindings = [], projectFacts = [], signals = null;
  if (args.signalsPath) {
    signals = JSON.parse(await readFile(args.signalsPath, 'utf-8'));
    const stack = signals.stack ?? signals.codebase?.stack ?? {};
    framework = stack.framework;
    version = stack.frameworkVersion;
    cacheComponents = stack.cacheComponents;
    knownFindings = (signals.codebase?.findings ?? signals.findings ?? [])
      .filter((f) => f.file && (f.line != null))
      .map((f) => ({ file: f.file, line: f.line }));
    projectFacts = deriveProjectFacts(signals);
    if (projectFacts.length > 0) {
      log(`project facts in play: ${projectFacts.map((f) => f.id).join(', ')}`);
    }
  }

  // Repo-root priority: (1) signals.project.rootDirectory from Vercel API
  // (authoritative — returns "apps/<name>" so cwd can be back-mapped without
  // filesystem probing), (2) supplied --repo-root, (3) walk-up from cwd.
  const rootResult = await resolveRepoRoot(recs, args.repoRoot, process.cwd(), signals);
  const repoRoot = rootResult.root;
  if (rootResult.source === 'api') {
    log(`repo-root from Vercel API: '${repoRoot}' (rootDirectory='${rootResult.apiOffset}')`);
  } else if (rootResult.source === 'auto-detected') {
    log(`repo-root auto-detected: '${repoRoot}' (probe: ${rootResult.probe})`);
  } else if (rootResult.source === 'corrected') {
    log(`repo-root auto-corrected: '${args.repoRoot}' → '${repoRoot}' (sub-agent paths resolve there)`);
  }
  log(`verifying ${recs.length} rec(s) — framework=${framework ?? '?'}@${version ?? '?'} repoRoot=${repoRoot}`);

  // knownFindings MUST combine scanner findings + sub-agent's verified
  // findingRefs — scanner-only grounding would miss every metric-gate rec.
  // Abstentions are first-class outputs ({abstain:true, candidateRef, reason})
  // and MUST NOT be graded; the abstention IS the answer.
  const recsGraded = [];
  const abstentions = [];
  const observations = [];
  const sanitizerDropped = [];
  for (let i = 0; i < recs.length; i++) {
    const rec = recs[i];

    if (rec?.abstain === true) {
      abstentions.push({
        index: i,
        candidateRef: rec.candidateRef ?? null,
        reason: rec.reason ?? '(no reason recorded)',
      });
      // Observation: real non-perf signal worth surfacing (regression, error storm).
      if (rec.observation && typeof rec.observation === 'object' && rec.observation.summary) {
        observations.push({
          index: i,
          candidateRef: rec.candidateRef ?? null,
          summary: String(rec.observation.summary),
          evidence: rec.observation.evidence ?? null,
          suggestedAction: rec.observation.suggestedAction ?? null,
          kind: rec.observation.kind ?? 'other',
        });
      }
      continue;
    }

    const baseClaimCtx = {
      framework,
      version,
      repoRoot,
      projectFacts,
      projectRootDirectory: signals?.project?.rootDirectory ?? null,
      cacheComponents,
      signals,
    };
    const initialClaims = extractClaims(rec, baseClaimCtx);
    const initialVerifyResults = await Promise.all(initialClaims.map((c) => verifyClaim(c)));
    const initialClaimsWithResults = initialVerifyResults.map((r, j) => ({
      ...r,
      type: initialClaims[j]?.type,
      claimType: initialClaims[j]?.type,
      claim: initialClaims[j],
    }));
    const sanitizerResult = await applySanitizers(rec, {
      framework,
      version,
      signals,
      verifyResults: initialClaimsWithResults,
    });
    if (!sanitizerResult.kept) {
      sanitizerDropped.push({
        index: i,
        candidateRef: rec.candidateRef ?? null,
        what: rec.what ?? null,
        reason: sanitizerResult.dropReason ?? 'automated-check',
      });
      continue;
    }

    const sanitizedRec = sanitizerResult.rec;
    const claims = extractClaims(sanitizedRec, baseClaimCtx);
    const verifyResults = await Promise.all(claims.map((c) => verifyClaim(c)));
    const verification = summarizeClaimResults(verifyResults);

    // A findingRef whose file_exists claim verified counts as grounding evidence.
    const verifiedRefs = [];
    for (let j = 0; j < claims.length; j++) {
      const c = claims[j];
      const r = verifyResults[j];
      if (r?.disposition !== 'verified') continue;
      if (c.sourceField === 'findingRefs' && c.type === 'file_exists') {
        const ref = (rec.findingRefs ?? []).find((x) => String(x).startsWith(c.file + ':'));
        if (ref) {
          const m = String(ref).match(/^(.+?):(\d+)$/);
          if (m) verifiedRefs.push({ file: m[1], line: Number(m[2]) });
        }
      }
    }
    const recKnownFindings = [...knownFindings, ...verifiedRefs];
    const quality = gradeRecommendation(sanitizedRec, { knownFindings: recKnownFindings });

    recsGraded.push({
      index: i,
      rec: { ...sanitizedRec, verification, verifyResults, quality },
      claims,
      verifyResults,
      verification,
      quality,
    });
  }

  // Project-config contradictions are a HARD trigger: a "turn on Fluid" rec on
  // a project where Fluid is already on passes 8/9 claims but is the wrong rec.
  // passRate alone won't catch this.
  const regenPlan = [];
  for (const g of recsGraded) {
    const { passRate, verifiable } = g.verification;
    const claimsWithResults = g.verifyResults.map((r, j) => ({ ...r, claim: g.claims[j] }));
    const contradictions = claimsWithResults.filter(
      (r) => r.disposition === 'failed' && r.claim?.type === 'does_not_contradict_project_config'
    );
    const triggeredByPassRate = verifiable >= REGEN_MIN_CLAIMS && passRate < REGEN_PASS_RATE_THRESHOLD;
    const cacheSafetyFailures = claimsWithResults.filter(
      (r) => r.disposition === 'failed' && (
        r.claim?.type === 'cache_vary_matches_dynamic_inputs' ||
        r.claim?.type === 'cache_vary_cardinality_safe'
      )
    );
    const semanticSafetyFailures = claimsWithResults.filter(
      (r) => r.disposition === 'failed' && (
        r.claim?.type === 'next_cached_not_found_causal_support' ||
        r.claim?.type === 'next_stable_cache_api_for_version' ||
        r.claim?.type === 'next_runtime_cache_api_for_version' ||
        r.claim?.type === 'next_cache_life_single_execution' ||
        r.claim?.type === 'next_cache_lifetime_freshness_supported' ||
        r.claim?.type === 'next_cache_components_route_chain_file' ||
        r.claim?.type === 'next_cache_life_cdn_header_semantics' ||
        r.claim?.type === 'image_response_headers_citation' ||
        r.claim?.type === 'next_image_priority_api_for_version' ||
        r.claim?.type === 'next_cache_components_route_segment_config' ||
        r.claim?.type === 'next_route_revalidate_static_prereq' ||
        r.claim?.type === 'next_cache_tag_invalidation_supported' ||
        r.claim?.type === 'cache_rec_not_error_dominated_or_acknowledged' ||
        r.claim?.type === 'cache_control_header_syntax' ||
        r.claim?.type === 'cache_control_headers_citation' ||
        r.claim?.type === 'cache_404_long_ttl_safety' ||
        r.claim?.type === 'route_error_not_found_status_and_scope' ||
        r.claim?.type === 'immutable_dynamic_route_safety' ||
        r.claim?.type === 'auth_guard_parallelization_safety' ||
        r.claim?.type === 'parallelization_impact_not_overclaimed' ||
        r.claim?.type === 'parallelization_not_cpu_bound_work' ||
        r.claim?.type === 'runtime_error_cause_supported' ||
        r.claim?.type === 'vercel_ignore_command_project_state'
      )
    );
    const triggeredByContradiction = contradictions.length > 0;
    const triggeredByCacheSafety = cacheSafetyFailures.length > 0;
    const triggeredBySemanticSafety = semanticSafetyFailures.length > 0;
    if (!triggeredByPassRate && !triggeredByContradiction && !triggeredByCacheSafety && !triggeredBySemanticSafety) continue;

    const failures = claimsWithResults
      .filter((r) => r.disposition === 'failed')
      .slice(0, 5);
    regenPlan.push({
      index: g.index,
      candidateRef: g.rec.candidateRef ?? null,
      what: g.rec.what ?? null,
      verifiableClaimCount: verifiable,
      passRate,
      regenTrigger: triggeredByContradiction
        ? 'project_config_contradiction'
        : triggeredByCacheSafety
          ? 'cache_vary_safety'
          : triggeredBySemanticSafety
            ? 'semantic_safety'
        : 'pass_rate_below_threshold',
      topFailures: failures.map((f) => ({
        claimType: f.claim?.type,
        field: f.claim?.sourceField,
        url: f.claim?.url,
        file: f.claim?.file,
        pattern: f.claim?.pattern,
        reason: f.reason,
      })),
      regenBriefHint: triggeredByContradiction
        ? 'Sub-agent recommended toggling on a project setting that is already enabled. Re-spawn with the project-config Strengths block highlighted; the rec must drop the contradictory step and keep only the actionable parts.'
        : triggeredByCacheSafety
          ? 'Sub-agent recommended CDN caching with unsafe or missing Vary behavior. Re-spawn with the cache safety failure highlighted; the rec must use a low-cardinality Vary header that matches the dynamic inputs, or abstain.'
          : triggeredBySemanticSafety
            ? 'Sub-agent made a framework-semantic claim that failed deterministic checks. Re-spawn with the failure highlighted; the rec must either add version-correct code/citations/runtime evidence or abstain.'
        : 'Re-spawn the sub-agent with this rec\'s topFailures injected as feedback. Re-emit the rec only if regenPassRate >= originalPassRate AND citation count not gutted.',
    });
  }

  const qualityCheck = applyQualityFloor(recsGraded.map((g) => g.rec), QUALITY_FLOOR);
  const hardRegenIndexes = new Set(regenPlan.map((p) => p.index));
  const qualityDroppedIndexes = new Set(
    qualityCheck.dropped
      .map((d) => recsGraded.findIndex((g) => g.rec === d.rec))
      .filter((i) => i >= 0)
  );
  const needsReviewIndexes = new Set(
    recsGraded
      .filter((g) => g.rec.needsReview === true)
      .map((g) => g.index)
  );
  const verifiedRecommendations = recsGraded
    .filter((g) => !hardRegenIndexes.has(g.index) && !qualityDroppedIndexes.has(g.index) && !needsReviewIndexes.has(g.index))
    .map((g) => g.rec);
  const withheldRecommendations = recsGraded
    .filter((g) => hardRegenIndexes.has(g.index) || qualityDroppedIndexes.has(g.index) || needsReviewIndexes.has(g.index))
    .map((g) => ({
      index: g.index,
      candidateRef: g.rec.candidateRef ?? null,
      what: g.rec.what ?? null,
      reason: hardRegenIndexes.has(g.index)
        ? (regenPlan.find((p) => p.index === g.index)?.regenTrigger ?? 'verification')
        : qualityDroppedIndexes.has(g.index)
          ? 'quality_floor'
          : 'needs_review',
    }));

  const summary = {
    totalRecs: recs.length,
    abstentions: abstentions.length,
    observations: observations.length,
    sanitizerDropped: sanitizerDropped.length,
    needsRegen: regenPlan.length,
    qualityDropped: qualityCheck.dropped.length,
    needsReview: needsReviewIndexes.size,
    verifiedRecommendations: verifiedRecommendations.length,
    withheldRecommendations: withheldRecommendations.length,
    averagePassRate: recsGraded.length > 0
      ? round4(recsGraded.reduce((s, g) => s + g.verification.passRate, 0) / recsGraded.length)
      : null,
    averageQuality: recsGraded.length > 0
      ? round4(recsGraded.reduce((s, g) => s + g.quality.overall, 0) / recsGraded.length)
      : null,
  };

  const output = {
    schemaVersion: SCHEMA_VERSION,
    summary,
    recsGraded: recsGraded.map((g) => g.rec),
    verifiedRecommendations,
    renderableRecommendations: verifiedRecommendations,
    withheldRecommendations,
    abstentions,
    observations,
    sanitizerDropped,
    regenPlan,
    qualityDropped: qualityCheck.dropped.map((d) => ({
      index: recsGraded.findIndex((g) => g.rec === d.rec),
      candidateRef: d.rec.candidateRef ?? null,
      quality: d.rec.quality,
      reason: d.reason,
    })),
  };

  const serialized = JSON.stringify(output, null, 2) + '\n';
  if (args.outPath) {
    await mkdir(dirname(args.outPath), { recursive: true });
    await writeFile(args.outPath, serialized, 'utf-8');
    log(`wrote ${serialized.length}B → ${args.outPath}`);
  } else {
    process.stdout.write(serialized);
  }
  log(`done: ${summary.totalRecs} records checked; ${summary.verifiedRecommendations} ready, ${summary.withheldRecommendations} held back, ${summary.abstentions} found no supported change, ${summary.sanitizerDropped} dropped by safety checks`);
}

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--signals') out.signalsPath = argv[++i];
    else if (a.startsWith('--signals=')) out.signalsPath = a.slice('--signals='.length);
    else if (a === '--repo-root') out.repoRoot = argv[++i];
    else if (a.startsWith('--repo-root=')) out.repoRoot = a.slice('--repo-root='.length);
    else if (a === '--out') out.outPath = resolve(argv[++i]);
    else if (a.startsWith('--out=')) out.outPath = resolve(a.slice('--out='.length));
    else out.positional.push(a);
  }
  out.recsPath = out.positional[0];
  return out;
}

function round4(n) { return Math.round(n * 10000) / 10000; }

main().catch((err) => {
  console.error('[verify-and-regen] FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
