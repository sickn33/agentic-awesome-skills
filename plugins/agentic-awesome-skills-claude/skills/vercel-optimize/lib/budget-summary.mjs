// Checkpoint between gate and deep-dive. Asks only when budget was default AND >=1 candidate got skipped — every question is a tax on the user.

import { createHash } from 'node:crypto';
import { formatCandidateLine } from './display-labels.mjs';

const TOP_INVESTIGATING_PREVIEW = 5;
const MAX_FULL_INVESTIGATING_PREVIEW = 10;
export function buildBudgetSummary(gate) {
  const toLaunch = Array.isArray(gate?.toLaunch) ? gate.toLaunch : [];
  const gated = Array.isArray(gate?.gated) ? gate.gated : [];
  const budgetSource = gate?.budget?.source ?? 'default';
  const currentBudget =
    typeof gate?.budget?.maxCandidates === 'number'
      ? gate.budget.maxCandidates
      : (gate?.budget?.maxCandidates === 'all' ? Infinity : 6);

  // Only budget skips can be reached by raising the budget; disqualified/coveredBy can't.
  const skippedByBudget = gated.filter((g) =>
    typeof g.gatedReason === 'string' && g.gatedReason.startsWith('skippedByBudget')
  );
  const skipped = skippedByBudget.length;
  const totalPassed = toLaunch.length + skipped;

  const reasonParts = [];
  if (budgetSource !== 'default') reasonParts.push(`user pre-set budget via ${budgetSource}`);
  if (skipped === 0) reasonParts.push('no candidates skipped by budget');
  const shouldAsk = budgetSource === 'default' && skipped > 0;
  const reason = shouldAsk
    ? `default budget skipped ${skipped} candidate(s); ask user whether to expand`
    : reasonParts.join('; ') || 'no expansion possible';

  const summarize = (c) => ({
    kind: c.kind,
    route: c.route ?? c.hostname ?? null,
    displayRoute: c.displayRoute ?? null,
    o11ySignal: c.o11ySignal ?? null,
    priority: c.priority ?? null,
  });

  const investigatingPreviewCount = typeof currentBudget === 'number' && currentBudget <= MAX_FULL_INVESTIGATING_PREVIEW
    ? currentBudget
    : TOP_INVESTIGATING_PREVIEW;
  const topInvestigating = toLaunch.slice(0, investigatingPreviewCount).map(summarize);
  const topSkipped = skippedByBudget.map(summarize);
  const options = buildOptions(toLaunch.length, skipped);
  const questionText = buildQuestionText({ shouldAsk, totalPassed, currentBudget });
  const printContract = shouldAsk
    ? 'Print chatPreview verbatim by copying exactChatMessage.body as a chat message before asking questionText. Do not summarize, truncate, reorder, shorten, or rewrite options.'
    : null;
  const questionPayload = shouldAsk ? buildQuestionPayload(questionText, options) : null;
  const chatPreview = buildChatPreview({ shouldAsk, totalPassed, currentBudget, skipped, topInvestigating, topSkipped, reason });
  const exactChatMessage = buildExactChatMessage(chatPreview);
  return {
    shouldAsk,
    reason,
    totalPassed,
    currentBudget: currentBudget === Infinity ? 'all' : currentBudget,
    budgetSource,
    skipped,
    topInvestigating,
    topSkipped,
    options,
    printContract,
    chatPreview,
    exactChatMessage,
    printCheck: shouldAsk ? buildPrintCheck({ exactChatMessage, skipped }) : null,
    questionText,
    questionPayload,
  };
}

function buildChatPreview({ shouldAsk, totalPassed, currentBudget, skipped, topInvestigating, topSkipped, reason }) {
  if (!shouldAsk) return `Audit scope: no question needed — ${reason}.`;
  const lines = [];
  lines.push(`Found ${totalPassed} potential issue${totalPassed === 1 ? '' : 's'} worth checking. By default I'll inspect the ${currentBudget} strongest now; ${skipped} will stay in the report for a larger run.`);
  lines.push(`Choose a larger scope if you want broader coverage. More checks take longer.`);
  if (topInvestigating.length > 0) {
    lines.push('');
    lines.push(`Checking now${topInvestigating.length < currentBudget ? ` (${topInvestigating.length} shown)` : ''}:`);
    topInvestigating.forEach((c, i) => lines.push(`  ${i + 1}. ${formatCandidateLine(c)}`));
  }
  if (topSkipped.length > 0) {
    lines.push('');
    lines.push(`Only checked if you expand this run (${topSkipped.length}):`);
    topSkipped.forEach((c, i) => lines.push(`  ${i + 1}. ${formatCandidateLine(c)}`));
  }
  return lines.join('\n');
}

function buildExactChatMessage(body) {
  return {
    body,
    lineCount: body.split('\n').length,
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

function buildPrintCheck({ exactChatMessage, skipped }) {
  return {
    bodyField: 'exactChatMessage.body',
    sameAs: 'chatPreview',
    requiredLineCount: exactChatMessage.lineCount,
    requiredSha256: exactChatMessage.sha256,
    requiredSkippedRows: skipped,
    requiredSkippedHeading: `Only checked if you expand this run (${skipped}):`,
    forbiddenSummaryPatterns: [
      '\\btop skipped\\b',
      '\\bmore (?:candidate|candidates|routes|entries|items|in gated list)\\b',
      '\\b\\d+\\s*[-–—]\\s*\\d+\\.\\s+\\d+\\s+more\\b',
      '\\betc\\.\\b',
    ],
    instruction: 'The budget message is valid only when every line from exactChatMessage.body is preserved exactly. If you cannot verify that, print exactChatMessage.body again before asking the question.',
  };
}

function buildQuestionText({ shouldAsk, totalPassed, currentBudget }) {
  if (!shouldAsk) return '';
  return `How many potential issues should I check in this run?`;
}

function buildOptions(currentCount, skippedCount) {
  if (skippedCount === 0) return [];
  const total = currentCount + skippedCount;
  return [
    {
      label: `Check ${currentCount} (default)`,
      value: currentCount,
      recommended: true,
      description: 'Fastest first pass; checks the strongest cost and performance signals.',
      rationale: 'fastest first pass; checks the strongest cost and performance signals',
    },
    {
      label: `Check all ${total}`,
      value: 'all',
      recommended: false,
      description: 'Most complete; takes longer because every flagged route is investigated.',
      rationale: 'most complete; takes longer because every flagged route is investigated',
    },
    {
      label: 'Pick a number',
      value: 'custom',
      recommended: false,
      description: `Check more than ${currentCount} without running the full ${total}.`,
      rationale: `checks more than ${currentCount} without running the full ${total}`,
    },
  ];
}

function buildQuestionPayload(questionText, options) {
  return {
    questions: [{
      question: questionText,
      header: 'Audit scope',
      multiSelect: false,
      options: options.map((o) => ({
        label: o.label,
        description: o.description ?? o.rationale,
      })),
    }],
  };
}

export function renderBudgetSummaryMarkdown(s) {
  const lines = [];
  lines.push(`## Audit scope`);
  lines.push('');
  if (!s.shouldAsk) {
    lines.push(`_No question needed — ${s.reason}._`);
    return lines.join('\n');
  }
  for (const ln of s.chatPreview.split('\n')) lines.push(ln);
  lines.push('');
  lines.push('### Options');
  lines.push('');
  for (const o of s.options) {
    const tag = o.recommended ? ' (recommended)' : '';
    lines.push(`- **${o.label}${tag}** — ${o.rationale}`);
  }
  lines.push('');
  lines.push(`**Question:** ${s.questionText}`);
  return lines.join('\n');
}
