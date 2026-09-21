#!/usr/bin/env node
// Top-level dispatcher: load → filter → normalize → infer → emit.
//
// Usage:
//   node scripts/discover.mjs --run .o11y/<run-id> [flags]

import path from 'node:path';
import fs from 'node:fs';
import { resolveRun, ensureDir } from './lib/io.mjs';
import { load } from './load.mjs';
import { filter } from './filter.mjs';
import { normalize } from './normalize.mjs';
import { infer } from './infer.mjs';
import { emit } from './emit.mjs';

function parseArgs(argv) {
  const opts = {
    run: null, out: null, bodies: null,
    include: [], exclude: [], origins: [],
    format: 'both', title: null, redact: [],
    minSamples: 1, stage: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--run': opts.run = next(); break;
      case '--out': opts.out = next(); break;
      case '--bodies': opts.bodies = next(); break;
      case '--include': opts.include.push(next()); break;
      case '--exclude': opts.exclude.push(next()); break;
      case '--origins': opts.origins = next().split(',').map(s => s.trim()).filter(Boolean); break;
      case '--format': opts.format = next(); break;
      case '--title': opts.title = next(); break;
      case '--redact': opts.redact = next().split(',').map(s => s.trim()).filter(Boolean); break;
      case '--min-samples': opts.minSamples = parseInt(next(), 10); break;
      case '--stage': opts.stage = next(); break;
      case '-h': case '--help':
        printHelp(); process.exit(0);
      default:
        console.error(`unknown arg: ${a}`);
        printHelp(); process.exit(2);
    }
  }
  return opts;
}

function printHelp() {
  console.error(`usage: discover.mjs --run <path> [--out <dir>] [--bodies <path>]
                       [--include <re>]... [--exclude <re>]...
                       [--origins <list>] [--format yaml|json|both]
                       [--title <s>] [--redact <list>] [--min-samples <n>]
                       [--stage load|filter|normalize|infer|emit]

  --bodies <path>   Directory written by \`browse network on\`. When set, response
                    bodies (and request bodies for non-postData captures) are
                    joined into the trace by CDP requestId. Without it, the spec
                    has no response-body schemas (browse cdp doesn't embed bodies).`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.run) { printHelp(); process.exit(2); }

  const runPath = resolveRun(opts.run);
  const outDir = opts.out ? path.resolve(opts.out) : path.join(runPath, 'api-spec');
  ensureDir(outDir);

  const stages = opts.stage ? [opts.stage] : ['load', 'filter', 'normalize', 'infer', 'emit'];

  for (const stage of stages) {
    const t0 = Date.now();
    let stats;
    switch (stage) {
      case 'load':      stats = load(runPath, outDir, { bodies: opts.bodies }); break;
      case 'filter':    stats = filter(outDir, { include: opts.include, exclude: opts.exclude, origins: opts.origins }); break;
      case 'normalize': stats = normalize(outDir); break;
      case 'infer':     stats = infer(outDir, { redact: opts.redact }); break;
      case 'emit':      stats = emit(outDir, { minSamples: opts.minSamples, format: opts.format, title: opts.title }); break;
      default: console.error(`unknown stage: ${stage}`); process.exit(2);
    }
    const ms = Date.now() - t0;
    console.log(`[${stage}] ${ms}ms ${JSON.stringify(stats)}`);
  }

  console.log(`\noutput: ${outDir}`);
  for (const f of ['index.html', 'client.mjs', 'report.md', 'openapi.yaml', 'openapi.json', 'confidence.json']) {
    const p = path.join(outDir, f);
    if (fs.existsSync(p)) console.log(`  ${path.relative(process.cwd(), p)}`);
  }
}

main();
