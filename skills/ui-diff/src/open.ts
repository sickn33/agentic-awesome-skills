import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export interface OpenResult {
  /** Paths relative to the working directory, in the order they were opened. */
  opened: string[];
  /** What could not be opened, with why. */
  failed: string[];
  /** The command used, when there was anything to open. */
  opener?: string;
}

type Run = (command: string, args: string[]) => Pick<SpawnSyncReturns<Buffer>, 'status' | 'error'>;

export function defaultOpener(platform = process.platform): string {
  return platform === 'darwin' ? 'open' : platform === 'win32' ? 'explorer' : 'xdg-open';
}

/** The images folder when it holds anything, and report.json when it exists. */
export function openTargets(outDir: string): string[] {
  const compare = path.join(outDir, 'compare');
  const report = path.join(outDir, 'report.json');
  return [existsSync(compare) && readdirSync(compare).length > 0 && compare, existsSync(report) && report].filter((t): t is string => Boolean(t));
}

function shown(target: string, isDir: boolean): string {
  const rel = path.relative(process.cwd(), target) || '.';
  const name = rel.startsWith('..') ? target : rel;
  return isDir ? `${name}${path.sep}` : name;
}

/**
 * Opens the check output with the operating system's default handler. Each target is opened with
 * its own call, so "opened" lists only what the handler accepted.
 */
export function openOutputs(outDir: string, opts: { platform?: NodeJS.Platform; run?: Run } = {}): OpenResult {
  const targets = openTargets(outDir);
  if (targets.length === 0) return { opened: [], failed: [] };
  const platform = opts.platform ?? process.platform;
  const opener = defaultOpener(platform);
  const run: Run = opts.run ?? ((command, args) => spawnSync(command, args, { stdio: 'ignore', timeout: 15_000 }));
  const opened: string[] = [];
  const failed: string[] = [];
  for (const target of targets) {
    const label = shown(target, !target.endsWith('.json'));
    const result = run(opener, [target]);
    // explorer exits 1 even when it opened the target.
    const ok = !result.error && (platform === 'win32' || result.status === 0);
    if (ok) opened.push(label);
    else failed.push(`${label} (${result.error ? result.error.message : `${opener} exited with ${result.status}`})`);
  }
  return { opened, failed, opener };
}
