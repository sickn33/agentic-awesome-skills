#!/usr/bin/env node
// Emits the ENTIRE prompt a sub-agent sees for one candidate (candidate +
// deep-dive evidence + filtered citations + playbook + protocol + output
// schema). --list emits a manifest the orchestrator uses to decide fan-out
// vs serial. Brief → stdout, status → stderr.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  buildBrief,
  inferPlaybook,
  inferFrameworkPlaybook,
  resolveFiles,
  citationSubset,
} from '../lib/investigation-brief.mjs';
import { supportTopicSubset } from '../lib/support-topics.mjs';
import { candidateRefFor } from '../lib/reconcile-candidates.mjs';
import { formatCandidateLabel } from '../lib/display-labels.mjs';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLAYBOOKS_DIR = join(HERE, '..', 'references', 'playbooks');

const log = (...a) => console.error('[prepare-brief]', ...a);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mergedPath || !args.investigationPath) {
    console.error('usage: node scripts/prepare-investigation-brief.mjs <merged.json> <investigation.json> [--index N] [--group toLaunch|platform] [--out FILE]');
    console.error('   or: node scripts/prepare-investigation-brief.mjs <merged.json> <investigation.json> --list');
    process.exit(1);
  }

  const [merged, investigation] = await Promise.all([
    readFile(args.mergedPath, 'utf-8').then(JSON.parse),
    readFile(args.investigationPath, 'utf-8').then(JSON.parse),
  ]);

  if (args.list) {
    const manifest = buildManifest(merged, investigation);
    process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
    return;
  }

  const group = args.group ?? 'toLaunch';
  const index = args.index ?? 0;
  const pool = Array.isArray(investigation[group]) ? investigation[group] : [];
  if (index < 0 || index >= pool.length) {
    console.error(`[prepare-brief] FATAL: ${group}[${index}] out of range (${group} has ${pool.length} entries)`);
    process.exit(2);
  }
  let candidate = pool[index];

  // Scan output may live at merged.codebase (older shape) or merged.signals.codebase
  // (current shape, after the jq merge nests it under signals). Resolve either.
  const codebase = pickCodebase(merged);
  const signals = {
    ...merged,
    codebase,
  };
  const files = resolveFiles(candidate, signals);
  candidate = {
    ...candidate,
    candidateRef: candidate.candidateRef ?? candidateRefFor(candidate, files),
  };
  const playbookId = inferPlaybook(signals);
  const playbookBody = playbookId ? await tryReadPlaybook(playbookId) : null;
  const frameworkPlaybookId = inferFrameworkPlaybook(signals);
  const frameworkPlaybookBody = frameworkPlaybookId ? await tryReadPlaybook(frameworkPlaybookId) : null;

  const stack = signals.stack ?? signals.codebase?.stack ?? {};
  const framework = stack.framework ?? 'unknown';
  const version = stack.frameworkVersion ?? 'unknown';
  const citations = await citationSubset(candidate.kind, framework, version);
  const supportTopics = await supportTopicSubset({
    candidate,
    signals,
    framework,
    version,
    profile: playbookId,
    frameworkPlaybookId,
  });

  const brief = buildBrief({
    candidate,
    candidateIndex: index,
    candidateGroup: group,
    files,
    signals,
    citations,
    playbookId,
    playbookBody,
    frameworkPlaybookId,
    frameworkPlaybookBody,
    supportTopics,
    generatedAt: args.deterministic ? null : new Date().toISOString(),
  });

  if (args.outPath) {
    await mkdir(dirname(args.outPath), { recursive: true });
    await writeBriefFile(args.outPath, brief, { force: args.force });
    log(`wrote ${brief.length}B → ${args.outPath}`);
  } else {
    process.stdout.write(brief + '\n');
  }
}

function buildManifest(merged, investigation) {
  const out = [];
  const groups = ['toLaunch', 'platform'];
  for (const group of groups) {
    const pool = Array.isArray(investigation[group]) ? investigation[group] : [];
    pool.forEach((c, i) => {
      const files = resolveFiles(c, { ...merged, codebase: pickCodebase(merged) });
      const candidateRef = c.candidateRef ?? candidateRefFor(c, files);
      out.push({
        group,
        index: i,
        kind: c.kind,
        route: c.route ?? c.hostname ?? null,
        scope: c.scope ?? null,
        priority: c.priority ?? null,
        confidence: c.confidence ?? null,
        o11ySignal: c.o11ySignal ?? null,
        files,
        candidateRef,
        label: formatCandidateLabel({ ...c, files }),
      });
    });
  }
  return {
    schemaVersion: '1.0',
    totalBriefs: out.length,
    toLaunchCount: out.filter((b) => b.group === 'toLaunch').length,
    platformCount: out.filter((b) => b.group === 'platform').length,
    preResolvedRecords: Array.isArray(investigation.preResolvedRecords)
      ? investigation.preResolvedRecords
      : [],
    fanoutPlan: buildFanoutPlan(out),
    briefs: out,
  };
}

function buildFanoutPlan(briefs) {
  const groups = new Map();
  for (const brief of briefs) {
    const key = candidateFamilyKey(brief);
    const existing = groups.get(key) ?? {
      familyKey: key,
      label: brief.label,
      kind: brief.kind,
      primaryBrief: { group: brief.group, index: brief.index, candidateRef: brief.candidateRef },
      relatedBriefs: [],
    };
    if (existing.primaryBrief.candidateRef !== brief.candidateRef) {
      existing.relatedBriefs.push({ group: brief.group, index: brief.index, candidateRef: brief.candidateRef });
    }
    groups.set(key, existing);
  }
  return {
    totalFamilies: groups.size,
    families: [...groups.values()].map((g) => ({
      ...g,
      totalBriefs: 1 + g.relatedBriefs.length,
    })),
  };
}

function candidateFamilyKey(brief) {
  const file = Array.isArray(brief.files) && brief.files.length > 0 ? brief.files[0] : null;
  const target = file ?? brief.route ?? brief.scope ?? '<account>';
  return `${brief.kind ?? 'unknown'}:${target}`;
}

// Prefer merged.codebase, fall back to merged.signals.codebase, then empty.
// Also accepts a fully-shaped scan doc directly (used in tests).
function pickCodebase(merged) {
  if (!merged || typeof merged !== 'object') return {};
  if (merged.codebase && typeof merged.codebase === 'object' && (merged.codebase.routes || merged.codebase.findings)) {
    return merged.codebase;
  }
  if (merged.signals?.codebase && typeof merged.signals.codebase === 'object') {
    return merged.signals.codebase;
  }
  return {};
}

async function tryReadPlaybook(id) {
  try {
    return await readFile(join(PLAYBOOKS_DIR, `${id}.md`), 'utf-8');
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--index') out.index = Number(argv[++i]);
    else if (a.startsWith('--index=')) out.index = Number(a.slice('--index='.length));
    else if (a === '--group') out.group = argv[++i];
    else if (a.startsWith('--group=')) out.group = a.slice('--group='.length);
    else if (a === '--out') out.outPath = resolve(argv[++i]);
    else if (a.startsWith('--out=')) out.outPath = resolve(a.slice('--out='.length));
    else if (a === '--list') out.list = true;
    else if (a === '--deterministic') out.deterministic = true;
    else if (a === '--force') out.force = true;
    else out.positional.push(a);
  }
  out.mergedPath = out.positional[0];
  out.investigationPath = out.positional[1];
  return out;
}

async function writeBriefFile(outPath, brief, { force = false } = {}) {
  try {
    await writeFile(outPath, brief + '\n', { encoding: 'utf-8', flag: force ? 'w' : 'wx' });
  } catch (err) {
    if (err?.code === 'EEXIST') {
      throw new Error(`output file already exists: ${outPath}. Use a fresh run directory or pass --force to overwrite.`);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error('[prepare-brief] FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
