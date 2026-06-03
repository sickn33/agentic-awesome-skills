// Deterministic markdown renderer. Same inputs → byte-identical output (modulo caller-supplied generatedAt).

import { createHash } from 'node:crypto';
import { computeImpactLabel } from './impact-label.mjs';
import { deriveProjectFacts } from './project-facts.mjs';
import { canonicalizeRoute } from './route-normalize.mjs';
import { computeCostCoverage, renderCostCoverageMarkdown } from './cost-coverage.mjs';
import { gates as registeredGates } from './gates/index.mjs';
import { formatCandidateLabel, formatKind, formatPublicText, formatRoute, formatSignal } from './display-labels.mjs';
import { splitCustomerSafeObservations } from './observation-safety.mjs';

const PLATFORM_CAP = 3;
const GATED_TARGET_PREVIEW = 5;

export function renderReport({ recommendations = [], gated = [], abstentions = [], observations = [], signals = {}, candidates = [], opts = {} } = {}) {
  const safety = splitCustomerSafeObservations(observations, abstentions, signals);
  observations = safety.observations;
  abstentions = [...abstentions, ...safety.heldBackObservations];
  assertValidObservations(observations);

  const projectName = opts.projectName ?? signals.project?.name ?? '<project>';
  const stack = signals.stack ?? signals.codebase?.stack ?? {};
  const usage = signals.usage ?? null;
  const plan = signals.plan ?? { plan: 'unknown', reason: '(not detected)' };

  // Sub-agents don't always propagate o11ySignal/aliasRoutes — look them up by candidateRef and canonicalize the displayed ref.
  recommendations = recommendations.map((r) => enrichRecFromCandidates(r, candidates));
  const { needsEvidenceRows, noChangeRows } = splitInvestigationOutcomes(abstentions);

  const lines = [];
  lines.push(`# Vercel Optimization Report — ${projectName}`);
  lines.push('');
  lines.push(renderMetadataLine(stack, plan, usage, signals));
  const coverageLine = renderCoverageLine(candidates, recommendations, signals, {
    abstentions,
    heldBackCount: opts.heldBackCount,
    noChangeCount: opts.noChangeCount,
  });
  if (coverageLine) lines.push(coverageLine);
  if (opts.generatedAt) {
    lines.push('');
    lines.push(`_Generated ${opts.generatedAt}_`);
  }
  lines.push('');

  lines.push(...renderCostHeader(signals));
  lines.push('');
  lines.push(...renderCostBreakdown(usage, signals));
  if (usage) {
    const coverage = computeCostCoverage(usage, registeredGates);
    lines.push(...renderCostCoverageMarkdown(coverage));
  }
  lines.push('');

  const platformRecs = recommendations.filter(isPlatformScope).slice(0, PLATFORM_CAP);
  const codeRecs = recommendations.filter((r) => !isPlatformScope(r));
  const sorted = sortRecs(codeRecs);
  const high = sorted.filter((r) => r.impactTier === 'high');
  const medium = sorted.filter((r) => r.impactTier === 'medium');
  const low = sorted.filter((r) => r.impactTier === 'low' || !r.impactTier);
  lines.push('## Highest-impact recommendations');
  lines.push('');
  if (sorted.length === 0) {
    lines.push('_No recommendations are ready to apply from this run._');
  } else {
    const top = sorted.slice(0, 5);
    top.forEach((rec, i) => {
      const candidate = candidateForDisplay(rec);
      const signal = formatSignal(rec.o11ySignal ?? signalFromRec(rec) ?? '', candidate);
      lines.push(`${i + 1}. **${formatCandidateLabel(candidate)}** — ${signal}`);
      lines.push(`   - **What to do**: ${formatRecommendationText(rec.what ?? '')}`);
      lines.push(`   - **Impact**: ${formatRecommendationText(impactString(rec, signals))}`);
      if (rec.effort) lines.push(`   - **Effort**: ${rec.effort}`);
      const cites = asArray(rec.citations);
      if (cites.length > 0) lines.push(`   - **Citations**: ${cites.join(', ')}`);
    });
  }
  lines.push('');

  lines.push('## Recommendations');
  lines.push('');
  lines.push('### High impact');
  lines.push('');
  lines.push(...renderRecTable(high, signals));
  lines.push('');
  lines.push('### Medium impact');
  lines.push('');
  lines.push(...renderRecTable(medium, signals));
  lines.push('');
  if (low.length > 0) {
    lines.push('### Low impact');
    lines.push('');
    lines.push(...renderRecTable(low, signals));
    lines.push('');
  }

  lines.push('## Detailed recommendations');
  lines.push('');
  if (sorted.length === 0) {
    lines.push('_No recommendations are ready to apply from this run._');
  } else {
    for (const [i, rec] of sorted.entries()) {
      lines.push(...renderRecDetail(rec, i + 1, { signals }));
    }
  }
  lines.push('');

  lines.push('## Platform recommendations');
  lines.push('');
  if (platformRecs.length === 0) {
    lines.push('_(none — the gate did not surface any platform-scope recommendations)_');
  } else {
    for (const [i, rec] of platformRecs.entries()) {
      lines.push(...renderRecDetail(rec, i + 1, { compact: true, signals }));
    }
  }
  lines.push('');

  // Observations carry actionable signal discovered during investigation.
  if (observations.length > 0) {
    lines.push('## Observations from investigation');
    lines.push('');
    lines.push('These are real signals from the audit, but they are not ready-to-apply recommendations.');
    lines.push('');
    lines.push('| Candidate | Observation | Evidence | Suggested action | Kind |');
    lines.push('|---|---|---|---|---|');
    for (const o of observations) {
      const ref = o.candidateRef ?? '(unspecified)';
      lines.push(`| ${escape(displayCandidateRef(ref))} | ${escape(formatEvidenceText(o.summary))} | ${escape(formatEvidenceText(o.evidence ?? '_(none recorded)_'))} | ${escape(formatEvidenceText(o.suggestedAction ?? '_(none recorded)_'))} | ${escape(formatKind(o.kind ?? 'other'))} |`);
    }
    lines.push('');
  }

  // Trust mechanism: customer sees what was investigated and why no rec emerged.
  if (needsEvidenceRows.length > 0) {
    lines.push('## Needs more evidence');
    lines.push('');
    lines.push('These candidates were investigated, but automated checks kept the change out of the ready-to-apply list.');
    lines.push('');
    lines.push('| Candidate | Why it was held back |');
    lines.push('|---|---|');
    for (const a of needsEvidenceRows) {
      const ref = a.candidateRef ?? '(unspecified)';
      const reason = publicNoRecommendationReason(a.reason ?? '(no reason recorded)');
      lines.push(`| ${escape(displayCandidateRef(ref))} | ${escape(reason)} |`);
    }
    lines.push('');
  }

  if (noChangeRows.length > 0) {
    lines.push('## Investigated, no change recommended');
    lines.push('');
    lines.push('These candidates were checked and did not produce a supported change.');
    lines.push('');
    lines.push('| Candidate | Why no recommendation shipped |');
    lines.push('|---|---|');
    for (const a of noChangeRows) {
      const ref = a.candidateRef ?? '(unspecified)';
      const reason = publicNoRecommendationReason(a.reason ?? '(no reason recorded)');
      lines.push(`| ${escape(displayCandidateRef(ref))} | ${escape(reason)} |`);
    }
    lines.push('');
  }

  lines.push('## Not investigated in this run');
  lines.push('');
  lines.push(...renderGatedTable(gated));
  lines.push('');

  lines.push('## Strengths');
  lines.push('');
  lines.push(...renderStrengths(signals));
  lines.push('');

  const configNotes = renderConfigurationNotes(signals);
  if (configNotes.length > 0) {
    lines.push('## Configuration notes');
    lines.push('');
    lines.push(...configNotes);
    lines.push('');
  }

  lines.push('## Data gaps');
  lines.push('');
  lines.push(...renderDataGaps(signals));

  return lines.join('\n');
}

function assertValidObservations(observations) {
  if (!Array.isArray(observations)) {
    throw new TypeError('renderReport observations must be an array');
  }
  for (const [i, o] of observations.entries()) {
    if (!o || typeof o !== 'object') {
      throw new TypeError(`renderReport observations[${i}] must be an object`);
    }
    if (typeof o.summary !== 'string' || o.summary.trim() === '') {
      throw new TypeError(`renderReport observations[${i}].summary is required`);
    }
  }
}

export function buildFinalReportMessage({ reportPath, markdown, recommendations = [], signals = {}, maxRecommendations = 10 } = {}) {
  const destination = reportPath || 'report.md';
  const coverageLine = extractCoverageLine(markdown);
  const lines = [`Report saved: ${destination}`];
  if (coverageLine) {
    lines.push('');
    lines.push(stripDetailsLink(coverageLine));
  } else {
    lines.push('');
    lines.push('Open the report for details. No coverage summary was available.');
  }
  const readyPreview = renderFinalRecommendationPreview(recommendations, signals, maxRecommendations);
  if (readyPreview.length > 0) {
    lines.push('');
    lines.push(...readyPreview);
  }
  const body = lines.join('\n');
  return {
    body,
    lineCount: lines.length,
    sha256: createHash('sha256').update(body).digest('hex'),
    reportPath: destination,
    coverageLine: coverageLine ?? null,
    recommendationsShown: readyPreview.filter((line) => /^\d+\./.test(line)).length,
  };
}

function renderFinalRecommendationPreview(recommendations, signals, maxRecommendations) {
  const ready = Array.isArray(recommendations)
    ? sortRecs(recommendations.filter((r) => r && r.abstain !== true))
    : [];
  if (ready.length === 0) return [];
  const max = Math.max(1, Math.min(Number.isInteger(maxRecommendations) ? maxRecommendations : 5, 10));
  const shown = ready.slice(0, max);
  const lines = ['Ready recommendations:'];
  for (const [i, rec] of shown.entries()) {
    lines.push(`${i + 1}. ${compactFinalText(rec.what ?? displayCandidate(rec))}`);
    const impact = impactString(rec, signals);
    if (impact && !/^_\(no impact framing recorded\)_$/.test(impact)) {
      lines.push(`   Impact: ${compactFinalText(impact)}`);
    }
  }
  const hidden = ready.length - shown.length;
  if (hidden > 0) {
    lines.push(`Open the report for ${hidden} more ready recommendation${hidden === 1 ? '' : 's'} and the full evidence.`);
  }
  return lines;
}

function compactFinalText(value) {
  const text = formatRecommendationText(String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 217).trimEnd()}...`;
}

function extractCoverageLine(markdown) {
  if (typeof markdown !== 'string') return null;
  return markdown
    .split('\n')
    .find((line) => line.startsWith('**Coverage**:')) ?? null;
}

function stripDetailsLink(line) {
  return String(line).replace(/\s*·\s*\[details\]\(#not-investigated-in-this-run\)\s*$/, '');
}

// Hidden when no candidates exist (e.g., observability blocker — nothing to cover).
function renderCoverageLine(candidates, recommendations, signals, opts = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const launched = candidates.filter((c) => !c.gatedReason && !c.disqualified && c.scope !== 'account');
  const skippedByBudget = candidates.filter(
    (c) => typeof c.gatedReason === 'string' && c.gatedReason.startsWith('skippedByBudget')
  );
  const coveredByDedup = candidates.filter(
    (c) => typeof c.gatedReason === 'string' && c.gatedReason.startsWith('coveredBy')
  );
  const disqualified = candidates.filter(
    (c) => typeof c.gatedReason === 'string' && c.gatedReason === c.disqualifyReason
  );
  const total = launched.length + skippedByBudget.length;
  if (total === 0) return null;
  const parts = [];
  parts.push(`Found **${total}** potential issue${total === 1 ? '' : 's'} to check`);
  parts.push(`${launched.length} investigated`);
  if (skippedByBudget.length > 0) {
    parts.push(`${skippedByBudget.length} left for a larger run — re-run with \`--max-candidates all\` to see the rest`);
  }
  if (coveredByDedup.length > 0) {
    parts.push(`${coveredByDedup.length} similar route variant${coveredByDedup.length === 1 ? '' : 's'} grouped`);
  }
  const recCount = (recommendations ?? []).filter((r) => !r.abstain && !isPlatformScope(r)).length;
  parts.push(`${recCount} recommendation${recCount === 1 ? '' : 's'} ready`);
  const rawHeldBackCount = Number.isInteger(opts.heldBackCount)
    ? opts.heldBackCount
    : (Array.isArray(opts.abstentions) ? opts.abstentions.filter((a) => a?.needsEvidence === true).length : 0);
  const heldBackCount = Math.min(rawHeldBackCount, Math.max(0, launched.length - recCount));
  if (heldBackCount > 0) {
    parts.push(`${heldBackCount} need more evidence`);
  }
  const rawNoChangeCount = Number.isInteger(opts.noChangeCount)
    ? opts.noChangeCount
    : (Array.isArray(opts.abstentions) ? opts.abstentions.length : 0);
  const noChangeCount = Math.min(rawNoChangeCount, Math.max(0, launched.length - recCount - heldBackCount));
  if (noChangeCount > 0) {
    parts.push(`${noChangeCount} investigated, no change recommended`);
  }
  return `**Coverage**: ${parts.join('  ·  ')} · [details](#not-investigated-in-this-run)`;
}

function renderMetadataLine(stack, plan, usage, signals = {}) {
  const fw = `${stack.framework ?? 'unknown'}@${stack.frameworkVersion ?? '?'}`;
  const router = stack.hasAppRouter ? 'app-router' : stack.hasPagesRouter ? 'pages-router' : null;
  const orm = stack.orm && stack.orm !== 'none' ? stack.orm : null;
  const stackParts = [fw, router, orm].filter(Boolean).join(' | ');
  const period = usage?.period
    ? `${usage.period.from ?? '?'} → ${usage.period.to ?? '?'}`
    : '(unavailable)';
  const oplusLabel = observabilityLabel(signals, usage);
  // Plan-inference reason is debug detail — only surface when plan is uncertain.
  const planLabel = plan.plan === 'uncertain'
    ? `${plan.plan} (${plan.reason ?? 'no signal'})`
    : (plan.plan ?? 'unknown');
  return `**Stack**: ${stackParts}  ·  **Plan**: ${planLabel}  ·  **Period**: ${period}  ·  **Observability**: ${oplusLabel}`;
}

function observabilityLabel(signals, usage) {
  if (signals.observabilityPlusUsable === true) {
    return 'Observability Plus enabled — per-route metrics included';
  }
  if (signals.observabilityPlusUsable === false) {
    if (usage) {
      return 'Per-route metrics unavailable — analysis based on billing + scanner findings';
    }
    if (signals.usageError === 'NOT_COLLECTED_OBSERVABILITY_BLOCKED') {
      return 'Per-route metrics unavailable — audit paused before metric-backed route ranking';
    }
    return 'Per-route metrics unavailable — limited analysis based on scanner findings';
  }
  if (signals.observabilityPlus === true) {
    return 'Observability Plus enabled — per-route metrics included';
  }
  if (signals.usageError === 'NOT_COLLECTED_UNSUPPORTED_FRAMEWORK') {
    return 'Not checked — audit paused at unsupported-framework preflight';
  }
  if (signals.usageError === 'NOT_COLLECTED_OBSERVABILITY_BLOCKED') {
    return 'Per-route metrics unavailable — audit paused before metric-backed route ranking';
  }
  if (usage) {
    return 'Not enabled — analysis based on billing + scanner findings';
  }
  if (signals.observabilityPlus === false) {
    return 'Not enabled — limited analysis only';
  }
  return 'Not checked — limited analysis only';
}

function renderCostHeader(signals) {
  const scope = signals.usageScope;
  if (scope === 'project') {
    return ['## Cost breakdown (this project)'];
  }
  if (scope === 'team' && signals.usage) {
    return [
      '## Cost breakdown (team-wide — `vercel usage` has no per-project filter)',
      '',
      '_The Vercel CLI\'s `vercel usage` reports team-wide billing without a project filter (verified May 2026). This breakdown is the whole team\'s bill for the window. Per-route metrics in the rest of this report are project-scoped via `vercel metrics`._',
    ];
  }
  return ['## Cost breakdown'];
}

function renderCostBreakdown(usage, signals) {
  const lines = [];
  const services = Array.isArray(usage?.services) ? usage.services : null;
  if (services && services.length > 0) {
    const chargedRows = services.filter((s) => {
      const cost = serviceCost(s);
      return cost === null || costRoundsToCents(cost) > 0;
    });
    if (chargedRows.length > 0) {
      return renderServiceCostRows(chargedRows, {
        costLabel: 'Billed cost',
        costOf: serviceCost,
        omittedZeroRows: services.length - chargedRows.length,
        total: usage.totals?.billedCost,
        totalLabel: 'Total billed',
        totalSuffix: ' _(precise observed cost; future-savings framing is magnitude, never precise)_',
      });
    }

    const effectiveRows = services.filter((s) => costRoundsToCents(serviceEffectiveCost(s)) > 0);
    if (effectiveRows.length > 0) {
      lines.push('_Net billed cost is $0.00 after included credits or allotments. Showing effective usage cost so active cost drivers are still visible._');
      lines.push('');
      return [
        ...lines,
        ...renderServiceCostRows(effectiveRows, {
          costLabel: 'Effective cost',
          costOf: serviceEffectiveCost,
          omittedZeroRows: services.length - effectiveRows.length,
          total: usage.totals?.effectiveCost,
          totalLabel: 'Total effective cost',
          totalSuffix: ' _(usage cost before included-credit or allotment offsets)_',
        }),
      ];
    }

    if (chargedRows.length === 0) {
      const scope = signals.usageScope === 'team' ? 'team-wide ' : '';
      lines.push(`_\`vercel usage\` returned a ${scope}billing payload, but every reported service cost was $0.00 for this window._`);
      return lines;
    }
  }

  // Fallback to o11y-derived ranking when usage payload missing.
  const gbHr = signals.metrics?.fnGbHrByRoute?.rows ?? [];
  const usageGap = missingUsageSentence(signals);
  if (gbHr.length === 0) {
    lines.push(`_${usageGap} Without per-route function GB-hour data, this report cannot rank cost drivers._`);
    return lines;
  }
  const top = groupGbHoursByCanonicalRoute(gbHr)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 10);
  lines.push(`_${usageGap} Ranking by \`function_duration_gbhr\` instead. These do not translate to dollars directly, but they show which routes consume billable units._`);
  lines.push('');
  lines.push('| Route | GB-hr (sum, 14d) |');
  lines.push('|---|---|');
  for (const r of top) {
    lines.push(`| ${escape(r.route ?? '(unnamed)')} | ${(r.value ?? 0).toFixed(4)} |`);
  }
  return lines;
}

function renderServiceCostRows(services, { costLabel, costOf, omittedZeroRows = 0, total = null, totalLabel, totalSuffix = '' }) {
  const lines = [];
  const rows = services.slice().sort((a, b) => (costOf(b) ?? 0) - (costOf(a) ?? 0));
  // Drop Usage column when every cell is "(unspecified)" — happens when CLI emits pricingUnit=USD.
  const usageCells = rows.map((s) => formatUsage(s));
  const hasRealUsage = usageCells.some((c) => c !== '(unspecified)');
  if (hasRealUsage) {
    lines.push(`| Service | Usage | ${costLabel} |`);
    lines.push('|---|---|---|');
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      const costValue = costOf(s);
      const cost = typeof costValue === 'number' ? `$${costValue.toFixed(2)}` : '(n/a)';
      lines.push(`| ${escape(s.name ?? '(unnamed)')} | ${escape(usageCells[i])} | ${cost} |`);
    }
  } else {
    lines.push(`| Service | ${costLabel} |`);
    lines.push('|---|---|');
    for (const s of rows) {
      const costValue = costOf(s);
      const cost = typeof costValue === 'number' ? `$${costValue.toFixed(2)}` : '(n/a)';
      lines.push(`| ${escape(s.name ?? '(unnamed)')} | ${cost} |`);
    }
  }
  if (omittedZeroRows > 0) {
    lines.push('');
    lines.push(`_${omittedZeroRows} zero-cost service ${omittedZeroRows === 1 ? 'row was' : 'rows were'} omitted._`);
  }
  if (typeof total === 'number') {
    lines.push('');
    lines.push(`**${totalLabel}: $${total.toFixed(2)}**${totalSuffix}`);
  }
  return lines;
}

function serviceCost(service) {
  if (typeof service?.billedCost === 'number') return service.billedCost;
  if (typeof service?.cost === 'number') return service.cost;
  return null;
}

function serviceEffectiveCost(service) {
  if (typeof service?.effectiveCost === 'number') return service.effectiveCost;
  if (typeof service?.pricingQuantity === 'number' && service?.pricingUnit === 'USD') return service.pricingQuantity;
  return 0;
}

function costRoundsToCents(cost) {
  if (typeof cost !== 'number' || !Number.isFinite(cost)) return 0;
  return Math.round(cost * 100) / 100;
}

function renderRecTable(recs, signals = {}) {
  if (recs.length === 0) return ['_(none)_'];
  const lines = [];
  lines.push('| # | Bucket | What | Impact | Effort | Citations |');
  lines.push('|---|---|---|---|---|---|');
  recs.forEach((r, i) => {
    const cites = asArray(r.citations).slice(0, 2).join('<br>');
    lines.push(`| ${i + 1} | ${r.bucket ?? '?'} | ${escape(formatRecommendationText(r.what ?? ''))} | ${escape(formatRecommendationText(impactString(r, signals)))} | ${r.effort ?? '?'} | ${cites} |`);
  });
  return lines;
}

function renderRecDetail(rec, index, { compact = false, signals = {} } = {}) {
  const lines = [];
  lines.push(`### ${index}. ${formatRecommendationText(rec.what ?? '(no `what`)')}`);
  lines.push('');
  const meta = [
    rec.bucket ? `**${rec.bucket}**` : null,
    rec.effort ? `effort: ${rec.effort}` : null,
    rec.impactTier ? `impact tier: ${rec.impactTier}` : null,
    rec.candidateRef ? `candidate: ${displayCandidate(rec)}` : null,
    rec.corroborationCount > 1 ? `corroborated: ${rec.corroborationCount}` : null,
  ].filter(Boolean);
  if (meta.length > 0) lines.push(`_${meta.join(' · ')}_`);
  lines.push('');
  const appliesAlsoTo = asArray(rec.appliesAlsoTo);
  if (appliesAlsoTo.length > 0) {
    const refs = appliesAlsoTo
      .map((a) => a?.candidateRef)
      .filter(Boolean)
      .slice(0, 4);
    if (refs.length > 0) {
      const suffix = appliesAlsoTo.length > refs.length ? `, +${appliesAlsoTo.length - refs.length} more` : '';
      lines.push(`_Also applies to: ${refs.map(displayCandidateRef).join(', ')}${suffix}._`);
      lines.push('');
    }
  }
  if (rec.why) {
    lines.push('**Why**');
    lines.push('');
    lines.push(formatRecommendationText(rec.why));
    lines.push('');
  }
  lines.push('**Impact**');
  lines.push('');
  lines.push(formatRecommendationText(impactString(rec, signals)));
  lines.push('');
  if (!compact && rec.fix) {
    lines.push('**Fix**');
    lines.push('');
    lines.push(rec.fix);
    lines.push('');
  }
  if (!compact && rec.currentBehavior) {
    lines.push('**Before**');
    lines.push('');
    lines.push(rec.currentBehavior);
    lines.push('');
  }
  if (!compact && rec.desiredBehavior) {
    lines.push('**After**');
    lines.push('');
    lines.push(rec.desiredBehavior);
    lines.push('');
  }
  if (rec.verify) {
    lines.push('**Verify**');
    lines.push('');
    lines.push(formatRecommendationText(rec.verify));
    lines.push('');
  }
  const cites = asArray(rec.citations);
  if (cites.length > 0) {
    lines.push('**Citations**');
    lines.push('');
    for (const c of cites) lines.push(`- \`${c}\``);
    lines.push('');
  }
  lines.push('');
  return lines;
}

function renderGatedTable(gated) {
  if (!Array.isArray(gated) || gated.length === 0) {
    return ['_(no candidates were held back)_'];
  }
  const groups = groupGatedCandidates(gated);
  const lines = [];
  lines.push('| Candidate type | Why not investigated | Targets | Count |');
  lines.push('|---|---|---|---:|');
  for (const group of groups) {
    lines.push(`| ${escape(group.kind)} | ${escape(group.reason)} | ${formatGatedTargets(group.targets, group.count)} | ${group.count} |`);
  }
  return lines;
}

function formatGatedTargets(targets, count) {
  const unique = [...new Set(targets.map((t) => String(t)))];
  const shown = unique.slice(0, GATED_TARGET_PREVIEW).map((target) => escape(target));
  const hidden = Math.max(0, count - shown.length);
  if (hidden > 0) shown.push(`+${hidden} more`);
  return shown.join('<br>');
}

function groupGatedCandidates(gated) {
  const byKey = new Map();
  for (const g of gated) {
    const kind = formatKind(g.kind ?? '?');
    const reason = publicGatedReason(g.gatedReason ?? g.disqualifyReason ?? '(no reason recorded)');
    const target = formatRoute(g);
    const key = `${kind}\u0000${reason}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      existing.targets.push(String(target));
    } else {
      byKey.set(key, { kind: String(kind), reason: String(reason), targets: [String(target)], count: 1 });
    }
  }
  return Array.from(byKey.values());
}

function publicNoRecommendationReason(reason) {
  return formatEvidenceText(String(reason))
    .replace(/\bDropped at render:\s*/gi, '')
    .replace(/\bverifier flagged for regen, but no regen happened\b/gi, 'needs stronger evidence before it is safe to apply')
    .replace(/\bRe-run with a refreshed brief\.?/gi, 'Re-run the investigation after refreshing the evidence.')
    .replace(/\bregen\b/gi, 're-check')
    .replace(/\bverifier\b/gi, 'verification')
    .replace(/\brec\b/gi, 'recommendation')
    .replace(/\bsub[- ]agent\b/gi, 'investigation')
    .replace(/\babstentions?\b/gi, 'no-change findings')
    .replace(/\babstaining\b/gi, 'not recommending a change')
    .replace(/\babstain(?:ed)?\b/gi, 'found no supported change')
    .replace(/\bquality\s*\+\s*verification\b/gi, 'verification')
    .replace(/\bquality\b/gi, 'review')
    .replace(/\bsanitizers?\b/gi, 'checks');
}

function splitInvestigationOutcomes(abstentions) {
  const rows = Array.isArray(abstentions) ? abstentions : [];
  return {
    needsEvidenceRows: rows.filter((a) => a?.needsEvidence === true),
    noChangeRows: rows.filter((a) => a?.needsEvidence !== true),
  };
}

function publicGatedReason(reason) {
  return formatPublicText(String(reason))
    .replace(/\bhardGated:\s*/gi, '')
    .replace(/skippedByBudget\s*\(max-candidates=([^);]+)(?:;[^)]*)?\)/i, 'left for a larger run (max candidates: $1)')
    .replace(/skippedByBudget\b/gi, 'left for a larger run')
    .replace(/\s*;\s*raise with --max-candidates N or =all/gi, '')
    .replace(/=all/g, 'all')
    .replace(/\bcoveredBy\b/gi, 'covered by a higher-priority candidate')
    .replace(/\bdisqualified\b/gi, 'not eligible');
}

function formatEvidenceText(value) {
  const expanded = formatPublicText(value)
    .replace(/\bdeepDive\b/gi, 'follow-up metric')
    .replace(/\bdeep-dive\b/gi, 'follow-up metric')
    .replace(/\blatency p95\b/gi, '95th percentile latency')
    .replace(/\bttfb p95\b/gi, '95th percentile TTFB')
    .replace(/\bcpu p95\b/gi, '95th percentile CPU time')
    .replace(/\bp95\b/gi, '95th percentile')
    .replace(/\bgate signal\b/gi, 'broad metric signal')
    .replace(/\bo11ySignal\b/gi, 'observed signal')
    .replace(/\bperDeployment\b/gi, 'per-deployment')
    .replace(/\bstartTypeSplit\b/gi, 'start-type breakdown')
    .replace(/\bstatusDistribution\b/gi, 'status distribution')
    .replace(/\bcacheBreakdown\b/gi, 'cache breakdown')
    .replace(/\bfunctionRoutes\b/gi, 'function routes')
    .replace(/\bfnGbHrByRoute\b/gi, 'function duration by route');
  return formatPublicText(expanded);
}

function formatRecommendationText(value) {
  return formatEvidenceText(value)
    .replace(/\bthe gate fires\b/gi, 'this audit flags the signal')
    .replace(/\bships immediately\b/gi, 'can ship sooner');
}

function displayCandidate(value) {
  return formatCandidateLabel(candidateForDisplay(value));
}

function candidateForDisplay(value) {
  const parsed = parseCandidateRef(value?.candidateRef);
  return parsed
    ? displayCandidateObject(value, parsed)
    : value;
}

function displayCandidateRef(ref) {
  const parsed = parseCandidateRef(ref);
  if (!parsed) return String(ref ?? '(unspecified)');
  return formatCandidateLabel(displayCandidateObject({}, parsed));
}

function parseCandidateRef(ref) {
  if (typeof ref !== 'string') return null;
  const [kind, ...rest] = ref.split(':');
  const target = rest.join(':');
  if (!kind || !target) return null;
  return { kind, target };
}

function displayCandidateObject(base, parsed) {
  if (parsed.target.startsWith('<account>#')) {
    return { ...base, kind: parsed.kind, files: [parsed.target.slice('<account>#'.length)] };
  }
  if (parsed.target === '<account>') {
    return { ...base, kind: parsed.kind };
  }
  return { ...base, kind: parsed.kind, route: parsed.target };
}

function groupGbHoursByCanonicalRoute(rows) {
  const byRoute = new Map();
  for (const row of rows) {
    const route = row?.route ? canonicalizeRoute(row.route) : '(unnamed)';
    byRoute.set(route, (byRoute.get(route) ?? 0) + (row?.value ?? 0));
  }
  return [...byRoute.entries()].map(([route, value]) => ({ route, value }));
}

function renderStrengths(signals) {
  const lines = [];

  // Stops agent from emitting "verify Fluid is on" recs. Source: defaultResourceConfig from project API.
  const projectFacts = deriveProjectFacts(signals);
  for (const f of projectFacts) {
    if (String(f.id ?? '').startsWith('memory_')) continue;
    lines.push(`- ${f.strength}`);
  }

  const cache = signals.metrics?.fdtByCache?.rows ?? [];
  const hit = cache.find((r) => r.cache_result === 'HIT' || r.cache_result === 'STALE');
  const miss = cache.find((r) => r.cache_result === 'MISS' || r.cache_result === 'BYPASS');
  if (hit && miss && (hit.value ?? 0) > (miss.value ?? 0)) {
    lines.push(`- Cache hit-rate is healthy at the bandwidth tier — HIT/STALE bandwidth (${formatBytes(hit.value)}) exceeds MISS/BYPASS (${formatBytes(miss.value)}).`);
  }
  const cold = signals.metrics?.fnStartTypeByRoute?.rows ?? [];
  const totalInv = cold.reduce((s, r) => s + (r.total ?? 0), 0);
  const totalCold = cold.reduce((s, r) => s + (r.coldCount ?? 0), 0);
  if (totalInv > 1000) {
    const coldPct = totalCold / totalInv;
    if (coldPct < 0.02) lines.push(`- Cold-start rate is very low (${(coldPct * 100).toFixed(2)}%) — Fluid Compute or warm-instance reuse is doing its job.`);
  }
  const errors = signals.metrics?.requestsByRouteStatus?.rows ?? [];
  const total5xx = errors.filter((r) => /^5/.test(r.http_status ?? '')).reduce((s, r) => s + (r.value ?? 0), 0);
  const totalReq = errors.reduce((s, r) => s + (r.value ?? 0), 0);
  if (totalReq > 1000) {
    const rate = total5xx / totalReq;
    if (rate < 0.001) lines.push(`- 5xx rate is very low (${(rate * 100).toFixed(3)}%) on ${formatNum(totalReq)} requests.`);
  }
  if (lines.length === 0) lines.push('_(no headline strengths to call out — see the gated table for signals we considered)_');
  return lines;
}

function renderConfigurationNotes(signals) {
  const projectFacts = deriveProjectFacts(signals);
  return projectFacts
    .filter((f) => String(f.id ?? '').startsWith('memory_'))
    .map((f) => `- ${f.strength}`);
}

function renderDataGaps(signals) {
  const lines = [];
  const observabilityGap = observabilityDataGap(signals);
  if (observabilityGap) lines.push(observabilityGap);
  if (!signals.usage) lines.push(`- ${missingUsageSentence(signals)}`);
  const cwvMetric = metricState(signals, 'cwvCount');
  if (cwvMetric.failed) {
    lines.push(`- Speed Insights metrics were not usable (\`${cwvMetric.code}\`), so LCP/INP/CLS analysis was skipped.`);
  } else if (cwvMetric.collected) {
    const cwv = cwvMetric.rows?.[0]?.value ?? 0;
    if (cwv === 0) lines.push('- No Speed Insights measurements — Core Web Vitals analysis dormant. Wire up Speed Insights to enable LCP/INP/CLS recommendations.');
  }
  const isrMetric = metricState(signals, 'isrReadsByRoute');
  if (isrMetric.collected) {
    const isrR = isrMetric.rows ?? [];
    if (isrR.length === 0) lines.push('- No ISR activity observed — either the project does not use ISR or no eligible routes had traffic in the window.');
  }
  const imageMetric = metricState(signals, 'imageCount');
  if (imageMetric.collected) {
    const images = imageMetric.rows?.[0]?.value ?? 0;
    if (images === 0) lines.push('- No image transformations observed — either `next/image` is not used or no images served in the window.');
  }
  const middlewareMetric = metricState(signals, 'middlewareCount');
  if (middlewareMetric.collected) {
    const middleware = middlewareMetric.rows ?? [];
    if (middleware.length === 0) lines.push('- No middleware invocations — either no `middleware.ts` is shipped or its matcher excludes all observed traffic.');
  }
  if (lines.length === 0) lines.push('_(no relevant gaps — every signal had data)_');
  return lines;
}

function observabilityDataGap(signals = {}) {
  if (signals.usageError === 'NOT_COLLECTED_UNSUPPORTED_FRAMEWORK') {
    return '- Observability Plus was not checked because the audit paused at the unsupported-framework preflight.';
  }
  if (signals.observabilityPlusUsable === false) {
    const blocker = signals.observabilityPlusBlocker;
    if (blocker === 'project_disabled') {
      return '- Per-route metrics unavailable — Observability Plus is disabled for this project.';
    }
    if (blocker === 'forbidden' || blocker === 'project_not_found') {
      return '- Per-route metrics unavailable — the authenticated Vercel scope cannot read this project.';
    }
    if (blocker === 'not_linked') {
      return '- Per-route metrics unavailable — the app directory is not linked to the Vercel project.';
    }
    if (blocker === 'no_oplus_probe') {
      return '- Per-route metrics unavailable — Observability Plus was not detected for this scope.';
    }
    if (blocker === 'payment_required') {
      return '- Per-route metrics unavailable — Observability Plus metrics were not usable for this scope.';
    }
    if (blocker === 'daily_quota_exceeded') {
      return '- Per-route metrics unavailable — the Observability Plus query quota is exhausted for today.';
    }
    if (blocker === 'no_traffic') {
      return '- Per-route metrics sparse — no route-level traffic was returned in the metrics window.';
    }
    if (blocker === 'all_failed_other') {
      return '- Per-route metrics unavailable — all Observability Plus metric queries failed.';
    }
    if (blocker) {
      return `- Per-route metrics unavailable — Observability Plus metrics returned \`${blocker}\`.`;
    }
    return '- Per-route metrics unavailable — Observability Plus data was not usable for this run.';
  }
  if (signals.observabilityPlus === false) {
    return '- Observability Plus not enabled — per-route latency / cache-hit / cold-start metrics unavailable.';
  }
  return null;
}

function missingUsageSentence(signals = {}) {
  const code = signals.usageError;
  if (code === 'NOT_COLLECTED_OBSERVABILITY_BLOCKED') {
    return '`vercel usage` was not collected because the audit paused before billing collection on the Observability Plus blocker.';
  }
  if (code === 'NOT_COLLECTED_UNSUPPORTED_FRAMEWORK') {
    return '`vercel usage` was not collected because the audit paused at the unsupported-framework preflight.';
  }
  if (code === 'USAGE_CONTEXT_MISMATCH') {
    return '`vercel usage` returned data for a different team context, so the billing breakdown was not used.';
  }
  if (code === 'USAGE_UNAVAILABLE') {
    return '`vercel usage` returned `USAGE_UNAVAILABLE`; no billing breakdown was available from the Vercel CLI.';
  }
  if (typeof code === 'string' && code.trim() !== '') {
    return `\`vercel usage\` returned \`${code}\`; no billing breakdown was available from the Vercel CLI.`;
  }
  return '`vercel usage` did not return a billing payload.';
}

function metricState(signals, id) {
  const metrics = signals.metrics ?? {};
  if (!Object.prototype.hasOwnProperty.call(metrics, id)) {
    return { collected: false, failed: false, rows: null, code: null };
  }
  const metric = metrics[id] ?? {};
  const failed = metric.ok === false;
  return {
    collected: !failed,
    failed,
    rows: Array.isArray(metric.rows) ? metric.rows : [],
    code: metric.code ?? 'UNKNOWN',
  };
}

function sortRecs(recs) {
  return recs.slice().sort((a, b) => priorityScore(b) - priorityScore(a));
}

function priorityScore(rec) {
  return typeof rec.priority === 'number' ? rec.priority : tierScore(rec.impactTier);
}
function tierScore(t) { return ({ high: 100, medium: 50, low: 10 })[t] ?? 0; }

function isPlatformScope(rec) {
  const k = String(rec.candidateRef ?? '').split(':')[0];
  return k.startsWith('platform_') || rec.scope === 'account';
}

function impactString(rec, signals = {}) {
  const label = computeImpactLabel(rec, signals);
  if (label) return label;
  return '_(no impact framing recorded)_';
}

function signalFromRec(rec) {
  return rec.findingRefs?.[0] ?? null;
}

function formatUsage(s) {
  if (typeof s.usage === 'string') return s.usage;
  if (typeof s.usage === 'number') return formatNum(s.usage) + (s.unit ? ` ${s.unit}` : '');
  return '(unspecified)';
}

function formatNum(n) {
  if (!Number.isFinite(n)) return String(n);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return String(n);
}

function formatBytes(b) {
  if (!Number.isFinite(b)) return '(n/a)';
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB';
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(2) + ' MB';
  if (b >= 1e3) return (b / 1e3).toFixed(2) + ' KB';
  return Math.round(b) + ' B';
}

function escape(s) {
  if (typeof s !== 'string') return String(s ?? '');
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function asArray(v) { return Array.isArray(v) ? v : []; }

function enrichRecFromCandidates(rec, candidates) {
  if (!rec || typeof rec !== 'object') return rec;
  if (!Array.isArray(candidates) || candidates.length === 0) return rec;
  const ref = rec.candidateRef ?? null;
  // Match on raw OR canonical kind:route so pre-dedup-canonicalization refs still resolve.
  let match = null;
  if (ref) {
    const [kind, route] = String(ref).split(':');
    const canonical = route ? canonicalizeRoute(route) : null;
    match = candidates.find((c) => {
      if (!c || c.kind !== kind) return false;
      const cRoute = c.route ?? c.hostname ?? '<account>';
      return cRoute === route || cRoute === canonical || canonicalizeRoute(cRoute) === canonical;
    });
  }
  const canonicalRef = ref ? canonicalRefOf(ref) : ref;
  const merged = { ...rec, candidateRef: canonicalRef };
  if (match) {
    if (!merged.o11ySignal && match.o11ySignal) merged.o11ySignal = match.o11ySignal;
    if (!merged.displayRoute && match.displayRoute) merged.displayRoute = match.displayRoute;
    if (!merged.aliasRoutes && Array.isArray(match.aliasRoutes) && match.aliasRoutes.length > 0) {
      merged.aliasRoutes = match.aliasRoutes;
    }
    if (!merged.mergedCount && typeof match.mergedCount === 'number') {
      merged.mergedCount = match.mergedCount;
    }
  }
  return merged;
}

function canonicalRefOf(ref) {
  const [kind, ...rest] = String(ref).split(':');
  const route = rest.join(':');
  if (!route) return ref;
  return `${kind}:${canonicalizeRoute(route)}`;
}
