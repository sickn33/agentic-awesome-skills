// 4-axis rubric (specificity, actionability, grounding, evidence) → bucket. See references/recommendations.md.
// Account-scope (platform_*) recs use a separate grounding/evidence pair — they structurally cannot produce file:line.

const HEDGE_WORDS = /\b(consider|might|may|could|perhaps|maybe|likely|probably)\b/gi;
const VERB_OPENERS = /^\s*(?:[-*]\s+|\d+[.)]\s+|[*_]+)?(?:add|set|enable|disable|replace|remove|move|wrap|cache|defer|parallelize|introduce|configure|update|change|switch|opt[-\s]?in|opt[-\s]?out|export|import|install|run|delete|rename)/im;
const COUNT_WORDS_RE = /\b(errors?|queries|invocations|requests|reads|writes|bytes|fetch(?:es)?|calls?|hits?|misses?|seconds?|images?|deployments?|cold[- ]?starts?|users?)\b/gi;
const UNIT_RE = /\b\d[\d.,]*\s*(?:%|ms|s|sec|seconds?|min|minutes?|h|hours?|GB|MB|KB|K|M|B|rps|qps|req\/s|reqs?\/min)\b/gi;
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]{10,}`/g;
const FILE_LINE_RE = /[\w/.\-()\[\]]+\.\w+:\d+/g;

// Grounding + evidence are lie-detectors — weighted higher than specificity/actionability, which LLMs can game with fluff.
const W = { grounding: 0.35, evidence: 0.30, specificity: 0.20, actionability: 0.15 };

export function gradeRecommendation(rec, ctx = {}) {
  const accountScope = isAccountScope(rec);
  const specificity = scoreSpecificity(rec);
  const actionability = scoreActionability(rec);
  const grounding = accountScope ? scoreGroundingAccount(rec) : scoreGrounding(rec, ctx);
  const evidence = accountScope ? scoreEvidenceAccount(rec) : scoreEvidence(rec);
  const overall = roundTo(
    grounding * W.grounding + evidence * W.evidence + specificity * W.specificity + actionability * W.actionability,
    4,
  );
  return {
    specificity, actionability, grounding, evidence, overall,
    grade: grade(overall),
    scope: accountScope ? 'account' : 'route',
  };
}

function isAccountScope(rec) {
  if (rec?.scope === 'account') return true;
  const ref = rec?.candidateRef;
  if (typeof ref === 'string' && ref.startsWith('platform_')) return true;
  return false;
}

function grade(overall) {
  if (overall >= 0.85) return 'Excellent';
  if (overall >= 0.70) return 'Good';
  if (overall >= 0.55) return 'Fair';
  return 'Poor';
}

function scoreSpecificity(rec) {
  let s = 0;
  const codeText = [rec.fix, rec.currentBehavior, rec.desiredBehavior].filter((x) => typeof x === 'string').join('\n');
  const hasFence = CODE_FENCE_RE.test(codeText);
  CODE_FENCE_RE.lastIndex = 0;
  if (hasFence) s += 0.5;
  if (INLINE_CODE_RE.test(codeText)) s += 0.2;
  INLINE_CODE_RE.lastIndex = 0;
  if (Array.isArray(rec.affectedFiles) && rec.affectedFiles.length > 0) s += 0.2;
  if (Array.isArray(rec.findingRefs) && rec.findingRefs.some((r) => /:\d+/.test(r))) s += 0.3;
  return Math.min(1, roundTo(s, 4));
}

function scoreActionability(rec) {
  const text = typeof rec.fix === 'string' ? rec.fix : '';
  if (!text) return 0;
  let s = 0;
  if (VERB_OPENERS.test(text)) s += 0.35;
  const stepCount = (text.match(/(?:^|\n)\s*(?:\d+[.)]\s+|[-*]\s+)/g) ?? []).length;
  if (stepCount >= 2) s += 0.35;
  else if (stepCount === 1) s += 0.15;
  const hedges = (text.match(HEDGE_WORDS) ?? []).length;
  HEDGE_WORDS.lastIndex = 0;
  s -= Math.min(0.3, hedges * 0.1);
  // Baseline so a verb-only one-liner still scores.
  s += 0.3;
  return Math.max(0, Math.min(1, roundTo(s, 4)));
}

function scoreGrounding(rec, ctx) {
  let s = 0;
  const knownFindings = Array.isArray(ctx.knownFindings) ? ctx.knownFindings : [];
  const findingKeys = new Set(knownFindings.map((f) => `${f.file}:${f.line}`));
  const refs = Array.isArray(rec.findingRefs) ? rec.findingRefs : [];
  const matched = refs.filter((r) => findingKeys.has(r));
  if (matched.length > 0) s += 0.5;
  else if (refs.length > 0) s += 0.25;
  if (Array.isArray(rec.affectedFiles) && rec.affectedFiles.length > 0) s += 0.25;
  const fenceText = [rec.currentBehavior, rec.desiredBehavior].filter((x) => typeof x === 'string').join('\n');
  if (CODE_FENCE_RE.test(fenceText)) s += 0.25;
  CODE_FENCE_RE.lastIndex = 0;
  if (typeof rec.candidateRef === 'string' && rec.candidateRef.length > 0) s += 0.1;
  return Math.min(1, roundTo(s, 4));
}

function scoreEvidence(rec) {
  const text = [rec.what, rec.why, rec.fix, rec.verify]
    .filter((x) => typeof x === 'string').join('\n');
  if (!text) return 0;
  const counts = (text.match(COUNT_WORDS_RE) ?? []).length;
  COUNT_WORDS_RE.lastIndex = 0;
  const units = (text.match(UNIT_RE) ?? []).length;
  UNIT_RE.lastIndex = 0;
  const filelines = (text.match(FILE_LINE_RE) ?? []).length;
  FILE_LINE_RE.lastIndex = 0;
  // file:line is the gold standard.
  let s = Math.min(0.5, filelines * 0.2)
        + Math.min(0.3, units * 0.075)
        + Math.min(0.2, counts * 0.05);
  return Math.min(1, roundTo(s, 4));
}

// No findingRefs/code fences possible — grade structural tie to gate + signal-quoting.
function scoreGroundingAccount(rec) {
  let s = 0;
  if (typeof rec.candidateRef === 'string' && rec.candidateRef.startsWith('platform_')) s += 0.4;
  else if (typeof rec.candidateRef === 'string' && rec.candidateRef.length > 0) s += 0.2;
  // Quoting deep-dive data in why/fix is the account-scope equivalent of citing file:line.
  const text = [rec.why, rec.fix, rec.verify].filter((x) => typeof x === 'string').join('\n');
  const units = (text.match(UNIT_RE) ?? []).length;
  UNIT_RE.lastIndex = 0;
  if (units >= 3) s += 0.4;
  else if (units >= 1) s += 0.2;
  const citations = Array.isArray(rec.citations) ? rec.citations.length : 0;
  if (citations >= 2) s += 0.2;
  else if (citations >= 1) s += 0.1;
  return Math.min(1, roundTo(s, 4));
}

// Heavily weighted toward magnitude quoting — vague platform recs should score low.
function scoreEvidenceAccount(rec) {
  const text = [rec.what, rec.why, rec.fix, rec.verify]
    .filter((x) => typeof x === 'string').join('\n');
  if (!text) return 0;
  const counts = (text.match(COUNT_WORDS_RE) ?? []).length;
  COUNT_WORDS_RE.lastIndex = 0;
  const units = (text.match(UNIT_RE) ?? []).length;
  UNIT_RE.lastIndex = 0;
  // Higher weight than route-scope variant — file:line gold standard isn't available.
  let s = Math.min(0.55, units * 0.15) + Math.min(0.35, counts * 0.08);
  if (typeof rec.o11ySignal === 'string' && rec.o11ySignal.length > 0) s += 0.1;
  return Math.min(1, roundTo(s, 4));
}

function roundTo(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// 0.55 = Poor/Fair boundary. Recommending Poor-graded items erodes trust faster than the marginal recall benefit.
export function applyQualityFloor(recs, floor = 0.55) {
  const kept = [];
  const dropped = [];
  for (const rec of recs) {
    const o = rec?.quality?.overall ?? 0;
    if (o < floor) dropped.push({ rec, reason: `quality.overall=${o} < floor=${floor}` });
    else kept.push(rec);
  }
  return { kept, dropped };
}
