// Auto-detect repo-root for claim verification. Priority: Vercel API rootDirectory > --repo-root > walk-up.
// In a monorepo the sub-agent emits paths like `apps/<app>/src/...` and the verifier needs the prefix root, not the app dir.

import { access } from 'node:fs/promises';
import { join, dirname, resolve, normalize } from 'node:path';

// Prefer affectedFiles[0] over findingRefs — findingRefs often share the same file.
export function pickProbeFile(recs) {
  for (const r of (recs ?? [])) {
    if (r?.abstain) continue;
    const af = Array.isArray(r?.affectedFiles) ? r.affectedFiles[0] : null;
    if (typeof af === 'string' && af.length > 0) return af;
    const ref = Array.isArray(r?.findingRefs) ? r.findingRefs[0] : null;
    if (typeof ref === 'string' && ref.length > 0) {
      const m = ref.match(/^(.+?):\d+$/);
      if (m) return m[1];
    }
  }
  return null;
}

export async function fileResolvesAt(root, file) {
  try {
    await access(join(root, file));
    return true;
  } catch {
    return false;
  }
}

export async function detectRepoRoot(probeFile, startDir, maxDepth = 10) {
  let dir = resolve(startDir);
  for (let depth = 0; depth < maxDepth; depth++) {
    if (await fileResolvesAt(dir, probeFile)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

// rootDirectory "apps/fixture-site" + cwd .../monorepo/apps/fixture-site → repo root .../monorepo.
export function deriveRootFromSignals(signals, cwd = process.cwd()) {
  const dir = signals?.project?.rootDirectory;
  if (!dir || typeof dir !== 'string') return null;
  const offset = normalize(dir).replace(/^\.\/?/, '').replace(/\/$/, '');
  if (!offset) return null;
  const cwdAbs = resolve(cwd);
  // Match `<root>/<offset>` OR `<root>/<offset>/<more>` — orchestrator may run from a subdir.
  const parts = cwdAbs.split('/');
  const offsetParts = offset.split('/');
  for (let start = parts.length - offsetParts.length; start >= 0; start--) {
    const slice = parts.slice(start, start + offsetParts.length).join('/');
    if (slice === offset) {
      const root = parts.slice(0, start).join('/');
      return root || '/';
    }
  }
  return null;
}

export async function resolveRepoRoot(recs, suppliedRoot, cwd = process.cwd(), signals = null) {
  if (signals) {
    const apiRoot = deriveRootFromSignals(signals, cwd);
    if (apiRoot) {
      return { root: apiRoot, source: 'api', probe: null, apiOffset: signals?.project?.rootDirectory ?? null };
    }
  }

  const probe = pickProbeFile(recs);
  if (!probe) {
    return { root: suppliedRoot ?? '.', source: suppliedRoot ? 'supplied' : 'default', probe: null };
  }
  if (suppliedRoot && await fileResolvesAt(suppliedRoot, probe)) {
    return { root: suppliedRoot, source: 'supplied', probe };
  }
  const detected = await detectRepoRoot(probe, suppliedRoot ?? cwd);
  if (detected) {
    return {
      root: detected,
      source: suppliedRoot ? 'corrected' : 'auto-detected',
      probe,
    };
  }
  return { root: suppliedRoot ?? '.', source: suppliedRoot ? 'supplied' : 'default', probe };
}
