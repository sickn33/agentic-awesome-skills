#!/usr/bin/env node
// Mid-flow checkpoint: should the orchestrator ask the user to raise the budget?
// JSON output is the contract the orchestrator parses; markdown is human-only.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildBudgetSummary, renderBudgetSummaryMarkdown } from '../lib/budget-summary.mjs';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.gatePath) {
    console.error('usage: node scripts/budget-summary.mjs <gate.json> [--format json|markdown] [--no-prompt]');
    process.exit(1);
  }
  const gate = JSON.parse(await readFile(args.gatePath, 'utf-8'));
  const summary = buildBudgetSummary(gate);
  // --no-prompt: CI / non-interactive hosts collapse the checkpoint to a logging hop.
  if (args.noPrompt) {
    summary.shouldAsk = false;
    summary.reason = 'forced false via --no-prompt (non-interactive host)';
    summary.printContract = null;
    summary.questionText = '';
    summary.questionPayload = null;
    summary.options = [];
    summary.chatPreview = `Audit scope: no question needed — ${summary.reason}.`;
    summary.exactChatMessage = {
      body: summary.chatPreview,
      lineCount: summary.chatPreview.split('\n').length,
      sha256: createHash('sha256').update(summary.chatPreview).digest('hex'),
    };
    summary.printCheck = null;
  }
  if (args.format === 'markdown') {
    process.stdout.write(renderBudgetSummaryMarkdown(summary) + '\n');
  } else {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  }
}

function parseArgs(argv) {
  const out = { positional: [], format: 'json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') out.format = argv[++i];
    else if (a.startsWith('--format=')) out.format = a.slice('--format='.length);
    else if (a === '--no-prompt') out.noPrompt = true;
    else out.positional.push(a);
  }
  out.gatePath = out.positional[0];
  return out;
}

main().catch((err) => {
  console.error('[budget-summary] FAILED:', err.message);
  process.exit(1);
});
