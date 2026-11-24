import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { CaptureRecord } from './capture.js';
import { log } from './log.js';

/** Everything that decides what the base captures look like, apart from the base commit and the browser. */
export interface BaseCacheInputs {
  /** The merge-base commit base is built from. */
  baseSha: string;
  /** Capture plan and options; hashed, so any change is a different key. */
  config: unknown;
  browser: { name: string; version: string };
  uiDiffVersion: string;
}

export interface BaseCacheKey {
  /** "base-<base sha, 12>-<digest, 16>": the directory name in the cache and the actions/cache key. */
  key: string;
  baseSha: string;
  configHash: string;
  browser: string;
  uiDiffVersion: string;
}

/** A base capture set: every record of one run's base side, with its files relative to the entry. */
export interface BaseCacheEntry {
  key: string;
  createdAt: string;
  /** Instant Date was frozen at for these captures; a run that reuses them freezes head at the same one. */
  frozenAt?: string;
  side: { sha: string; shortSha: string };
  records: CaptureRecord[];
}

const MANIFEST = 'entry.json';

function digest(value: unknown, length: number): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, length);
}

export function baseCacheKey(inputs: BaseCacheInputs): BaseCacheKey {
  const configHash = digest(inputs.config, 16);
  const browser = `${inputs.browser.name} ${inputs.browser.version}`;
  const key = `base-${inputs.baseSha.slice(0, 12)}-${digest({ baseSha: inputs.baseSha, configHash, browser, version: inputs.uiDiffVersion }, 16)}`;
  return { key, baseSha: inputs.baseSha, configHash, browser, uiDiffVersion: inputs.uiDiffVersion };
}

/** A capture that worked, or a flow checkpoint or component state base never reached (what base does, so it is kept). */
function storable(record: CaptureRecord): boolean {
  return record.ok || record.flow?.reached === false || record.component?.reached === false;
}

function fileFields(record: CaptureRecord): Array<'file' | 'stylesFile'> {
  return (['file', 'stylesFile'] as const).filter((f) => record[f]);
}

/**
 * The entry for `key` with its files restored under `outDir` (captures/base, styles/base, states/base), or
 * undefined. Only a complete entry counts: a missing manifest, another key, a failed record or a
 * missing file is a miss, never a partial reuse. A flow checkpoint or component state base never
 * reached is not a failure.
 */
export function restoreBaseCache(cacheDir: string, key: string, outDir: string): BaseCacheEntry | undefined {
  const dir = path.join(cacheDir, key);
  const manifest = path.join(dir, MANIFEST);
  if (!existsSync(manifest)) return undefined;
  let entry: BaseCacheEntry;
  try {
    entry = JSON.parse(readFileSync(manifest, 'utf8')) as BaseCacheEntry;
  } catch {
    return undefined;
  }
  if (entry.key !== key || !Array.isArray(entry.records) || entry.records.length === 0) return undefined;
  for (const record of entry.records) {
    if (!storable(record)) return undefined;
    for (const field of fileFields(record)) if (!existsSync(path.join(dir, record[field]!))) return undefined;
    for (const shot of record.states?.shots ?? []) if (!existsSync(path.join(dir, shot.file))) return undefined;
  }
  const records = entry.records.map((record) => {
    const restored: CaptureRecord = { ...record };
    for (const field of fileFields(record)) {
      const target = path.join(outDir, field === 'file' ? 'captures' : 'styles', 'base', path.basename(record[field]!));
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(path.join(dir, record[field]!), target);
      restored[field] = target;
    }
    if (record.states) {
      restored.states = {
        ...record.states,
        shots: record.states.shots.map((shot) => {
          const target = path.join(outDir, 'states', 'base', path.basename(shot.file));
          mkdirSync(path.dirname(target), { recursive: true });
          copyFileSync(path.join(dir, shot.file), target);
          return { ...shot, file: target };
        }),
      };
    }
    return restored;
  });
  return { ...entry, records };
}

/**
 * Stores a complete base capture set under `key`: written to a temporary directory and renamed
 * into place, so a crash leaves no half-written entry. Sets with a failed capture are not stored.
 */
export function storeBaseCache(cacheDir: string, entry: BaseCacheEntry, keep = 10): boolean {
  if (entry.records.length === 0 || entry.records.some((r) => !storable(r))) return false;
  const dir = path.join(cacheDir, entry.key);
  const tmp = path.join(cacheDir, `.tmp-${entry.key}-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const records = entry.records.map((record) => {
    const stored: CaptureRecord = { ...record };
    for (const field of fileFields(record)) {
      const name = `${field === 'file' ? 'captures' : 'styles'}/${path.basename(record[field]!)}`;
      mkdirSync(path.join(tmp, path.dirname(name)), { recursive: true });
      copyFileSync(record[field]!, path.join(tmp, name));
      stored[field] = name;
    }
    if (record.states) {
      mkdirSync(path.join(tmp, 'states'), { recursive: true });
      stored.states = {
        ...record.states,
        shots: record.states.shots.map((shot) => {
          const name = `states/${path.basename(shot.file)}`;
          copyFileSync(shot.file, path.join(tmp, name));
          return { ...shot, file: name };
        }),
      };
    }
    return stored;
  });
  writeFileSync(path.join(tmp, MANIFEST), `${JSON.stringify({ ...entry, records }, null, 2)}\n`);
  rmSync(dir, { recursive: true, force: true });
  renameSync(tmp, dir);
  pruneBaseCache(cacheDir, keep);
  return true;
}

/** Keeps the `keep` most recently written entries. */
export function pruneBaseCache(cacheDir: string, keep: number): void {
  if (!existsSync(cacheDir)) return;
  const entries = readdirSync(cacheDir)
    .filter((name) => name.startsWith('base-'))
    .map((name) => ({ name, mtime: statSync(path.join(cacheDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const { name } of entries.slice(keep)) {
    rmSync(path.join(cacheDir, name), { recursive: true, force: true });
    log.debug(`base cache: removed old entry ${name}`);
  }
}
