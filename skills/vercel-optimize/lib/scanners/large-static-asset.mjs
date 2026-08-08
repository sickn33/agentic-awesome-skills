// Flag oversized assets under public/. Pure fs.stat — no parsing, no LLM.
// 500 KB threshold is where bandwidth/first-paint start to bite (Vercel
// Doctor's 4 KB triggers on favicons).

import { readdir, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const THRESHOLD_BYTES = 500_000;
const TOP_N = 20;

const SKIP_EXTENSIONS = new Set(['.html', '.txt', '.xml', '.json', '.webmanifest', '.ico']);
const SKIP_PATH_PREFIXES = ['.well-known/'];

export const metadata = {
  id: 'large-static-asset',
  title: 'Large file in public/',
  severity: 'medium',
  billingDimension: 'bandwidth',
  trafficIndependent: true,
  description:
    'Static assets in `public/` over 500 KB ship as-is from the CDN. Whether the cost is meaningful depends on traffic, but the candidate is binary — the file is either needed at that size or it can be optimized (compressed image, video transcode, or moved off the critical path).',
  fix:
    'Verify the asset is reachable on the customer-facing hot path. Then choose: (a) compress (convert PNG → AVIF/WebP; transcode MP4 to lower bitrate); (b) host externally (Vercel Blob, S3, or a media CDN with per-asset signed URLs); (c) lazy-load (defer to client-side fetch instead of bundling into initial HTML).',
  citations: [
    'https://vercel.com/docs/manage-cdn-usage',
    'https://vercel.com/docs/image-optimization',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**'],
  includeGlobs: ['public/**/*'],
};

// Walks public/ directly because collectFiles only emits text-readable
// extensions — binary assets never reach the shared `files` array.
export async function scan({ rootDir }) {
  if (!rootDir) return [];
  const root = join(rootDir, 'public');
  const out = [];
  try {
    for await (const entry of walk(root)) {
      if (shouldSkip(entry.relPath)) continue;
      if (entry.size < THRESHOLD_BYTES) continue;
      out.push({
        pattern: metadata.id,
        file: join('public', entry.relPath),
        line: 1,
        evidence: `${formatBytes(entry.size)} (${extname(entry.relPath) || 'no-ext'})`,
        trafficIndependent: metadata.trafficIndependent,
        sizeBytes: entry.size,
      });
    }
  } catch {
    return [];
  }
  out.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return out.slice(0, TOP_N);
}

async function* walk(dir, base = '') {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      yield* walk(full, rel);
      continue;
    }
    if (!e.isFile()) continue;
    try {
      const s = await stat(full);
      yield { relPath: rel, size: s.size };
    } catch { /* skip unreadable */ }
  }
}

function shouldSkip(relPath) {
  if (SKIP_PATH_PREFIXES.some((p) => relPath.startsWith(p))) return true;
  const ext = extname(relPath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return true;
  return false;
}

function formatBytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(2) + ' MB';
  if (b >= 1e3) return (b / 1e3).toFixed(1) + ' KB';
  return b + ' B';
}
