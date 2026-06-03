#!/usr/bin/env node
// Collect raw sub-agent outputs into the recommendations.json array consumed by
// verify-and-regen. Sub-agent hosts often wrap JSON in prose or markdown fences,
// so extraction is permissive while candidateRef coverage stays strict.

import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';

const log = (...a) => console.error('[collect-sub-agent-outputs]', ...a);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.inputs.length === 0 && !args.manifestPath) {
    console.error('usage: node scripts/collect-sub-agent-outputs.mjs [--manifest briefs/manifest.json] <output-file-or-dir...> [--out recommendations.json] [--strict]');
    process.exit(1);
  }

  const manifest = args.manifestPath
    ? JSON.parse(await readFile(args.manifestPath, 'utf-8'))
    : null;
  const expected = manifest ? readExpectedBriefs(manifest) : [];
  const preResolvedRecords = manifest ? readPreResolvedRecords(manifest) : [];
  const files = args.inputs.length > 0 ? await collectInputFiles(args.inputs) : [];
  const collected = [];
  const summary = {
    files: files.length,
    kept: 0,
    abstained: 0,
    parseFailed: 0,
    nonObject: 0,
    missingCandidateRef: 0,
  };
  const errors = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    const extracted = extractJsonValue(raw);
    if (!extracted.ok) {
      summary.parseFailed++;
      const msg = `${file}: ${extracted.reason}`;
      if (args.strict) errors.push(msg);
      else log(`warn: ${msg}`);
      continue;
    }

    const records = normalizeOutput(extracted.value);
    if (records.length === 0) {
      summary.nonObject++;
      const msg = `${file}: JSON did not contain a recommendation or abstention object`;
      if (args.strict) errors.push(msg);
      else log(`warn: ${msg}`);
      continue;
    }

    for (const record of records) {
      const candidateRef = record.candidateRef ?? inferCandidateRefFromFile(file, expected, records.length);
      if (!candidateRef) {
        summary.missingCandidateRef++;
        errors.push(`${file}: output is missing candidateRef`);
        continue;
      }
      collected.push({
        sourcePath: file,
        record: record.candidateRef ? record : { ...record, candidateRef },
      });
    }
  }

  let ordered = collected;
  if (expected.length > 0) {
    const byRef = new Map();
    for (const item of collected) {
      const ref = item.record.candidateRef;
      if (!expected.some((b) => b.candidateRef === ref)) {
        errors.push(`${item.sourcePath}: unknown candidateRef ${ref}`);
        continue;
      }
      if (byRef.has(ref)) {
        errors.push(`${item.sourcePath}: duplicate output for candidateRef ${ref}`);
        continue;
      }
      byRef.set(ref, item);
    }
    const missing = expected.filter((b) => !byRef.has(b.candidateRef));
    for (const b of missing) errors.push(`missing output for candidateRef ${b.candidateRef}`);
    ordered = expected.map((b) => byRef.get(b.candidateRef)).filter(Boolean);
  } else {
    ordered = collected.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  }

  const records = [...preResolvedRecords, ...ordered.map((item) => item.record)];
  summary.kept = records.filter((r) => r?.abstain !== true).length;
  summary.abstained = records.filter((r) => r?.abstain === true).length;

  if (errors.length > 0) {
    for (const e of errors) log(`error: ${e}`);
    process.exit(2);
  }
  if (records.length === 0) {
    log('error: no recommendation or abstention records collected');
    process.exit(2);
  }

  const serialized = JSON.stringify(records, null, 2) + '\n';
  if (args.outPath) {
    await mkdir(dirname(args.outPath), { recursive: true });
    await writeFile(args.outPath, serialized, 'utf-8');
    log(`wrote ${serialized.length}B → ${args.outPath}`);
  } else {
    process.stdout.write(serialized);
  }
  log(`done: ${summary.files} files, ${summary.kept} recommendation draft(s), ${summary.abstained} found no supported change, ${summary.parseFailed} parse failed, ${summary.nonObject} invalid output(s)`);
}

function parseArgs(argv) {
  const out = { inputs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manifest') out.manifestPath = resolve(argv[++i]);
    else if (a.startsWith('--manifest=')) out.manifestPath = resolve(a.slice('--manifest='.length));
    else if (a === '--out') out.outPath = resolve(argv[++i]);
    else if (a.startsWith('--out=')) out.outPath = resolve(a.slice('--out='.length));
    else if (a === '--strict') out.strict = true;
    else out.inputs.push(resolve(a));
  }
  return out;
}

async function collectInputFiles(paths) {
  const out = [];
  for (const p of paths) {
    const s = await stat(p);
    if (s.isDirectory()) out.push(...await walkDir(p));
    else if (s.isFile()) out.push(p);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.')) continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...await walkDir(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function readExpectedBriefs(manifest) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.briefs)) {
    throw new TypeError('manifest must contain a briefs array');
  }
  return manifest.briefs.map((b, i) => {
    if (!b?.candidateRef) throw new TypeError(`manifest.briefs[${i}].candidateRef is required`);
    return {
      group: b.group ?? null,
      index: b.index ?? i,
      candidateRef: b.candidateRef,
    };
  });
}

function readPreResolvedRecords(manifest) {
  if (!manifest || !Array.isArray(manifest.preResolvedRecords)) return [];
  return manifest.preResolvedRecords.map((r, i) => {
    if (!isRecordObject(r)) {
      throw new TypeError(`manifest.preResolvedRecords[${i}] must be a recommendation or no-recommendation record`);
    }
    if (!r.candidateRef) {
      throw new TypeError(`manifest.preResolvedRecords[${i}].candidateRef is required`);
    }
    return r;
  });
}

function extractJsonValue(raw) {
  for (const block of extractFenceBlocks(raw)) {
    const parsed = tryParseJson(block);
    if (parsed.ok) return parsed;
  }
  const full = tryParseJson(raw);
  if (full.ok) return full;
  for (const span of findBalancedJsonSpans(raw)) {
    const parsed = tryParseJson(span);
    if (parsed.ok) return parsed;
  }
  return { ok: false, reason: 'no valid JSON object or array found' };
}

function extractFenceBlocks(raw) {
  const out = [];
  const re = /```(?:json|JSON)?\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(raw)) !== null) out.push(m[1].trim());
  return out;
}

function tryParseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw.trim()) };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function findBalancedJsonSpans(raw) {
  const spans = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== '{' && ch !== '[') continue;
    const closeFor = ch === '{' ? '}' : ']';
    const stack = [closeFor];
    let inString = false;
    let escape = false;
    for (let j = i + 1; j < raw.length; j++) {
      const c = raw[j];
      if (inString) {
        if (escape) escape = false;
        else if (c === '\\') escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === '{') stack.push('}');
      else if (c === '[') stack.push(']');
      else if (c === '}' || c === ']') {
        if (stack.at(-1) !== c) break;
        stack.pop();
        if (stack.length === 0) {
          spans.push(raw.slice(i, j + 1));
          i = j;
          break;
        }
      }
    }
  }
  return spans;
}

function normalizeOutput(value) {
  const unwrapped = unwrapEnvelope(value);
  if (Array.isArray(unwrapped)) return unwrapped.filter(isRecordObject);
  if (isRecordObject(unwrapped)) return [unwrapped];
  if (unwrapped && typeof unwrapped === 'object') {
    if (isRecordObject(unwrapped.recommendation)) return [unwrapped.recommendation];
    if (Array.isArray(unwrapped.recommendations)) return unwrapped.recommendations.filter(isRecordObject);
  }
  return [];
}

function unwrapEnvelope(value) {
  let current = value;
  for (let depth = 0; depth < 2; depth++) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    if (Array.isArray(current.recommendations) || current.recommendation) return current;
    const keys = Object.keys(current);
    const envelopeKey = ['data', 'result', 'insights'].find((k) => keys.length === 1 && k in current);
    if (!envelopeKey) return current;
    current = current[envelopeKey];
  }
  return current;
}

function isRecordObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.abstain === true) return true;
  return ['what', 'why', 'fix', 'bucket', 'affectedFiles', 'citations'].some((k) => k in value);
}

function inferCandidateRefFromFile(file, expected, recordCount) {
  if (recordCount !== 1 || expected.length === 0) return null;
  if (expected.length === 1) return expected[0].candidateRef;
  const name = basename(file);
  const matches = expected.filter((b) => {
    if (!b.group && b.index == null) return false;
    const group = escapeRegExp(String(b.group ?? ''));
    const index = escapeRegExp(String(b.index));
    return new RegExp(`(?:^|[^A-Za-z0-9])${group}[-_.]?${index}(?:[^A-Za-z0-9]|$)`).test(name);
  });
  return matches.length === 1 ? matches[0].candidateRef : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((err) => {
  console.error('[collect-sub-agent-outputs] FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
