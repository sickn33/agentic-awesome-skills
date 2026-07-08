#!/usr/bin/env node
// Deterministic reconciliation between deep-dive and investigator fan-out.
// Reads investigation-evidence.json, removes candidates whose follow-up metric
// evidence already disproves/reframes the gate hypothesis, and emits the same
// shape with preResolvedRecords for the final report.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { reconcileInvestigation } from '../lib/reconcile-candidates.mjs';

const log = (...a) => console.error('[reconcile-candidates]', ...a);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.investigationPath) {
    console.error('usage: node scripts/reconcile-candidates.mjs <investigation-evidence.json> [--gate gate.json] [--out reconciled-investigation.json]');
    process.exit(1);
  }

  const [investigation, gate] = await Promise.all([
    readFile(args.investigationPath, 'utf-8').then(JSON.parse),
    args.gatePath ? readFile(args.gatePath, 'utf-8').then(JSON.parse) : null,
  ]);

  const reconciled = reconcileInvestigation(investigation, { gate });
  const serialized = JSON.stringify({
    ...reconciled,
    reconciledAt: args.noTimestamp ? null : new Date().toISOString(),
  }, null, 2) + '\n';

  if (args.outPath) {
    await mkdir(dirname(args.outPath), { recursive: true });
    await writeFile(args.outPath, serialized, 'utf-8');
    log(`wrote ${serialized.length}B -> ${args.outPath}`);
  } else {
    process.stdout.write(serialized);
  }

  const dropped = reconciled.reconciliation?.droppedBeforeInvestigation ?? 0;
  if (dropped > 0) log(`dropped ${dropped} candidate(s) before investigation`);
}

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--gate') out.gatePath = resolve(argv[++i]);
    else if (a.startsWith('--gate=')) out.gatePath = resolve(a.slice('--gate='.length));
    else if (a === '--out') out.outPath = resolve(argv[++i]);
    else if (a.startsWith('--out=')) out.outPath = resolve(a.slice('--out='.length));
    else if (a === '--no-timestamp') out.noTimestamp = true;
    else out.positional.push(a);
  }
  out.investigationPath = out.positional[0] ? resolve(out.positional[0]) : null;
  return out;
}

main().catch((err) => {
  console.error('[reconcile-candidates] FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
