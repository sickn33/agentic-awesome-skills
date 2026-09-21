#!/usr/bin/env node
// Stage 1 — Load.
//
// Read browser-trace's cdp/network/{requests,responses}.jsonl, pair them by
// requestId, drop preflight + redirects + obvious non-API resource types, and
// write `intermediate/paired.jsonl`.
//
// Optional: a `browse network on` capture directory can be passed via
// `--bodies <path>` (or stashed under `<run>/cdp/network/bodies/`). Each
// per-request subdir there has request.json + response.json with the actual
// bodies. The browse-network "id" matches the CDP requestId for XHR/Fetch, so
// we join directly on requestId and inject reqBody / respBody into paired rows.

import fs from 'node:fs';
import path from 'node:path';
import { readJsonl, writeJsonl, intermediatePath, ensureDir } from './lib/io.mjs';

const KEEP_TYPES = new Set(['XHR', 'Fetch', 'Document']);

function tryParseJson(s) {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return s; }
}

function looksApiUrl(url) {
  return /\/(api|graphql|rest|v\d+)\b/i.test(url) ||
         /\.(json|jsonl|ndjson)(\?|$)/i.test(url);
}

function urlPath(u) {
  try { return new URL(u).pathname; } catch { return u; }
}

function urlOrigin(u) {
  try { const x = new URL(u); return `${x.protocol}//${x.host}`; } catch { return null; }
}

function urlQuery(u) {
  try {
    const x = new URL(u);
    const out = {};
    // First value wins for repeats. The downstream consumer (normalize.mjs)
    // only uses parameter names + a representative value for type inference,
    // so collapsing repeats to the first observation is fine.
    for (const [k, v] of x.searchParams.entries()) {
      if (out[k] === undefined) out[k] = v;
    }
    return out;
  } catch { return {}; }
}

// Walk a `browse network` capture directory and return a Map keyed by the
// CDP requestId, each value `{ reqBody, respBody }`. Bodies that are valid JSON
// are returned parsed; otherwise the raw string is preserved.
function loadBrowseNetworkBodies(bodiesDir) {
  const out = new Map();
  if (!bodiesDir || !fs.existsSync(bodiesDir)) return out;
  const entries = fs.readdirSync(bodiesDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const subdir = path.join(bodiesDir, e.name);
    const reqPath = path.join(subdir, 'request.json');
    const respPath = path.join(subdir, 'response.json');
    if (!fs.existsSync(reqPath)) continue;
    let req, resp;
    try { req = JSON.parse(fs.readFileSync(reqPath, 'utf8')); } catch { continue; }
    try { resp = fs.existsSync(respPath) ? JSON.parse(fs.readFileSync(respPath, 'utf8')) : null; } catch { resp = null; }
    if (!req?.id) continue;
    const reqBody = req.body != null ? tryParseJson(req.body) : null;
    const respBody = resp?.body != null ? tryParseJson(resp.body) : null;
    out.set(String(req.id), { reqBody, respBody });
  }
  return out;
}

export function load(runPath, outDir, opts = {}) {
  const cdpDir = path.join(runPath, 'cdp', 'network');
  const requests  = readJsonl(path.join(cdpDir, 'requests.jsonl'));
  const responses = readJsonl(path.join(cdpDir, 'responses.jsonl'));

  // Body sources: explicit --bodies path > <run>/cdp/network/bodies/ if present
  let bodiesDir = opts.bodies || null;
  if (!bodiesDir) {
    const stashed = path.join(runPath, 'cdp', 'network', 'bodies');
    if (fs.existsSync(stashed)) bodiesDir = stashed;
  }
  const bodyMap = loadBrowseNetworkBodies(bodiesDir);

  // Index responses by requestId; if the trace has duplicates (redirects), the
  // last one wins so the terminal status code is what we keep.
  const respByReq = new Map();
  for (const ev of responses) {
    const rid = ev?.params?.requestId;
    if (rid) respByReq.set(rid, ev);
  }

  const paired = [];
  for (const ev of requests) {
    const p = ev?.params;
    if (!p?.request) continue;

    const method = p.request.method;
    const url = p.request.url;
    if (!url || !method) continue;
    if (method === 'OPTIONS') continue;
    if (url.startsWith('data:') || url.startsWith('blob:')) continue;

    // Resource type: prefer p.type (CDP), fall back to URL heuristic.
    const type = p.type || 'Other';
    if (!KEEP_TYPES.has(type) && !looksApiUrl(url)) continue;

    const respEv = respByReq.get(p.requestId);
    const resp = respEv?.params?.response;
    const status = resp?.status ?? null;
    if (status && status >= 300 && status < 400) {
      // Pure redirect. The browser will issue a follow-up request with the
      // same requestId carrying redirectResponse on it; we already record the
      // post-redirect resource via the next requestWillBeSent. Drop the
      // intermediate.
      continue;
    }

    const contentType = resp?.headers
      ? Object.entries(resp.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? null
      : null;

    let reqBody = p.request.postData ? tryParseJson(p.request.postData) : null;
    let respBody = null;

    // Augment with browse-network bodies when present. Match by requestId
    // (the browse-network entry's `id` IS the CDP requestId for XHR/Fetch).
    const captured = bodyMap.get(String(p.requestId));
    if (captured) {
      if (reqBody == null && captured.reqBody != null) reqBody = captured.reqBody;
      if (captured.respBody != null) respBody = captured.respBody;
    }

    paired.push({
      requestId: p.requestId,
      method,
      url,
      origin: urlOrigin(url),
      path: urlPath(url),
      query: urlQuery(url),
      status,
      type,
      contentType,
      reqHeaders: p.request.headers || {},
      reqBody,
      respHeaders: resp?.headers || {},
      respBody,
      ts: typeof p.wallTime === 'number' ? Math.round(p.wallTime * 1000) : null,
    });
  }

  ensureDir(path.join(outDir, 'intermediate'));
  writeJsonl(intermediatePath(outDir, 'paired.jsonl'), paired);
  return {
    count: paired.length,
    requests: requests.length,
    responses: responses.length,
    bodiesAttached: paired.filter(r => r.respBody != null).length,
    bodiesDir,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [run, out, bodies] = process.argv.slice(2);
  if (!run || !out) { console.error('usage: load.mjs <run-path> <out-dir> [bodies-dir]'); process.exit(2); }
  const stats = load(run, out, { bodies });
  console.log(`load: ${stats.count} paired (from ${stats.requests} req / ${stats.responses} resp)${stats.bodiesAttached ? `, ${stats.bodiesAttached} response bodies attached` : ''}`);
}
