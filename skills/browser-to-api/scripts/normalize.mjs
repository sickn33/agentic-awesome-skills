#!/usr/bin/env node
// Stage 3 — Normalize.
//
// Group paired samples by (origin, method, templated path), classify noise vs
// real API, decompose multiplexed endpoints (GraphQL, JSON-RPC), collect
// query-param schemas, and detect normalization anomalies.

import { readJsonl, writeJsonl, intermediatePath } from './lib/io.mjs';
import { templatize, templatizeWithSlugs } from './lib/path-template.mjs';

function inferQueryType(values) {
  if (values.every(v => /^-?\d+$/.test(v))) return { type: 'integer' };
  if (values.every(v => /^-?\d+(\.\d+)?$/.test(v))) return { type: 'number' };
  if (values.every(v => v === 'true' || v === 'false')) return { type: 'boolean' };
  return { type: 'string' };
}

function statusSignature(rows) {
  const ct = new Set(rows.map(r => (r.contentType || '').split(';')[0].trim().toLowerCase()).filter(Boolean));
  const status = new Set(rows.map(r => (r.status != null ? Math.floor(r.status / 100) + 'xx' : 'none')));
  return [...ct].sort().join(',') + '|' + [...status].sort().join(',');
}

// ---------------------------------------------------------------------------
// Noise classification — tag endpoints that are infrastructure, not user-facing
// ---------------------------------------------------------------------------
const NOISE_PATH_PATTERNS = [
  // Tracking / analytics / telemetry
  /\/track(ing)?[\/\b]/i, /\/pixel/i, /\/beacon/i, /\/log[\/\b]/i,
  /\/impression/i, /\/pageview/i, /\/click[\/\b]/i,
  /\/session[-_]?start/i, /\/batch\/(impression|list)/i,
  /\/dag\/v\d+\//i,
  /\/trackgoal/i, /\/profileview/i, /\/sessionstart/i,
  /\/dinerTrust/i, /\/trackDiner/i,
  /\/profile-view$/i, /\/track\/search$/i,
  /\/mix$/i,
  // Cookie / consent / privacy
  /\/cookie[-_]?consent/i, /\/consent\//i, /\/onetrust/i,
  // Experimentation
  /\/bucket[-_]?experiment/i, /\/experiment[\/\b]/i, /\/feature[-_]?flag/i,
  // Bot defense / fingerprinting
  /\/akam\//i, /\/akamai\//i, /\/human$/i,
  // Session plumbing (not user-facing API)
  /\/session$/i, /\/authenticate\/start$/i,
];

const NOISE_BODY_SIGNALS = [
  /^sensor_data$/,                  // Akamai bot fingerprint
  /^body$/,                         // Obfuscated payloads (Akamai, etc.)
];

function classifyEndpoint(endpoint) {
  const p = endpoint.path;
  const m = endpoint.method;

  // HTML page renders are not API endpoints
  const htmlRows = endpoint.sampleRows.filter(r =>
    (r.contentType || '').includes('text/html'));
  if (htmlRows.length === endpoint.sampleRows.length && m === 'GET') return 'page';

  // Path-based noise detection
  if (NOISE_PATH_PATTERNS.some(re => re.test(p))) return 'noise';

  // Obfuscated paths (random-looking segments with mixed case, no real structure)
  const segs = p.split('/').filter(Boolean);
  const obfuscated = segs.filter(s =>
    /[A-Za-z0-9_-]{8,}/.test(s) &&
    !/^(v\d+|api|dapi|graphql|rest|fe|gql)$/i.test(s) &&
    /[A-Z]/.test(s) && /[a-z]/.test(s));
  if (obfuscated.length >= 2) return 'noise';

  // Body-based: if every sample's request body only has noise-signal keys
  if (endpoint.sampleRows.length > 0) {
    const allNoise = endpoint.sampleRows.every(r => {
      if (!r.reqBody || typeof r.reqBody !== 'object') return false;
      const keys = Object.keys(r.reqBody);
      return keys.length > 0 && keys.every(k => NOISE_BODY_SIGNALS.some(re => re.test(k)));
    });
    if (allNoise) return 'noise';
  }

  return 'api';
}

// ---------------------------------------------------------------------------
// GraphQL / multiplexed endpoint decomposition
// ---------------------------------------------------------------------------
function detectDiscriminator(rows) {
  // Check if these rows share a URL path but have a body field that acts as
  // a discriminator (operationName for GraphQL, method for JSON-RPC, etc.)
  const candidates = ['operationName', 'method', 'action', 'type', 'command'];
  for (const field of candidates) {
    const values = new Set();
    let matchCount = 0;
    for (const r of rows) {
      if (r.reqBody && typeof r.reqBody === 'object' && typeof r.reqBody[field] === 'string') {
        values.add(r.reqBody[field]);
        matchCount++;
      }
    }
    if (matchCount >= rows.length * 0.8 && values.size >= 2) {
      return { field, values: [...values] };
    }
  }

  // Also check query params (OpenTable uses ?opname= for GraphQL)
  for (const field of ['opname', 'operationName', 'op', 'action']) {
    const values = new Set();
    let matchCount = 0;
    for (const r of rows) {
      if (r.query && typeof r.query[field] === 'string') {
        values.add(r.query[field]);
        matchCount++;
      }
    }
    if (matchCount >= rows.length * 0.8 && values.size >= 2) {
      return { field, values: [...values], source: 'query' };
    }
  }

  return null;
}

function decomposeMultiplexed(endpoint) {
  const disc = detectDiscriminator(endpoint.sampleRows);
  if (!disc) return [endpoint];

  const byOp = new Map();
  for (const row of endpoint.sampleRows) {
    let opName;
    if (disc.source === 'query') {
      opName = row.query?.[disc.field] || '__unknown__';
    } else {
      opName = (row.reqBody && typeof row.reqBody === 'object')
        ? row.reqBody[disc.field] || '__unknown__'
        : '__unknown__';
    }
    if (!byOp.has(opName)) byOp.set(opName, []);
    byOp.get(opName).push(row);
  }

  const sub = [];
  for (const [opName, rows] of byOp) {
    // Build a virtual endpoint per operation
    const virtualPath = `${endpoint.path} [${opName}]`;
    sub.push({
      ...endpoint,
      endpointKey: `${endpoint.method} ${endpoint.origin}${virtualPath}`,
      path: virtualPath,
      operationName: opName,
      discriminatorField: disc.field,
      parentPath: endpoint.path,
      sampleRows: rows,
      sampleCount: rows.length,
    });
  }
  return sub;
}

export function normalize(outDir) {
  const filtered = readJsonl(intermediatePath(outDir, 'filtered.jsonl'));

  // Pass 1: bucket by (origin, method, single-pass template).
  const buckets = new Map();
  for (const row of filtered) {
    const t = templatize(row.path);
    const key = `${row.method} ${row.origin}${t.template}`;
    let b = buckets.get(key);
    if (!b) { b = { origin: row.origin, method: row.method, template: t.template, params: t.params, rows: [], rawPaths: new Set() }; buckets.set(key, b); }
    b.rows.push(row);
    b.rawPaths.add(row.path);
  }

  // Pass 2: re-templatize each bucket using its raw-path set so slugs can be
  // detected.
  const refined = new Map();
  for (const [, b] of buckets) {
    const rawPaths = [...b.rawPaths];
    const t = rawPaths.length > 1 ? templatizeWithSlugs(rawPaths) : { template: b.template, params: b.params };
    const key = `${b.method} ${b.origin}${t.template}`;
    let r = refined.get(key);
    if (!r) {
      r = { origin: b.origin, method: b.method, template: t.template, params: t.params, rows: [], rawPaths: new Set(), originalKeys: [] };
      refined.set(key, r);
    }
    r.rows.push(...b.rows);
    for (const p of b.rawPaths) r.rawPaths.add(p);
    r.originalKeys.push({ template: b.template, sig: statusSignature(b.rows) });
  }

  // Build endpoint records, classify, and decompose.
  const preEndpoints = [];
  for (const [, e] of refined) {
    const flags = [];
    const sigs = new Set(e.originalKeys.map(k => k.sig));
    if (sigs.size > 1) flags.push('divergent-response-shape');
    if (e.rows.length === 1) flags.push('single-sample');
    const statuses = new Set(e.rows.map(r => r.status).filter(s => s != null));
    if (statuses.size === 1) flags.push('single-status');
    const cts = new Set(e.rows.map(r => (r.contentType || '').split(';')[0].trim()).filter(Boolean));
    if (cts.size > 1) flags.push('mixed-content-types');
    const withBody = e.rows.filter(r => r.reqBody != null).length;
    if (withBody > 0 && withBody < e.rows.length) flags.push('request-body-only-on-some-samples');

    const qSamples = new Map();
    for (const r of e.rows) {
      for (const k of Object.keys(r.query || {})) {
        if (!qSamples.has(k)) qSamples.set(k, []);
        qSamples.get(k).push(r.query[k]);
      }
    }
    const queryParams = [];
    for (const [name, values] of qSamples.entries()) {
      const present = e.rows.filter(r => name in (r.query || {})).length;
      queryParams.push({
        name,
        in: 'query',
        required: present === e.rows.length,
        schema: inferQueryType(values),
      });
    }

    preEndpoints.push({
      endpointKey: `${e.method} ${e.origin}${e.template}`,
      origin: e.origin,
      method: e.method,
      path: e.template,
      pathParams: e.params.map(p => ({ name: p.name, in: 'path', required: true, schema: p.schema })),
      queryParams,
      statusCodes: [...new Set(e.rows.map(r => r.status).filter(s => s != null))].sort((a, b) => a - b),
      sampleRows: e.rows,
      sampleCount: e.rows.length,
      rawPaths: [...e.rawPaths],
      normalizationFlags: flags,
    });
  }

  // Pass 3: classify and decompose
  const endpoints = [];
  let noiseCount = 0, pageCount = 0, decomposedCount = 0;
  for (const ep of preEndpoints) {
    const category = classifyEndpoint(ep);
    if (category === 'noise') { noiseCount++; continue; }
    if (category === 'page') { pageCount++; continue; }

    // Try to decompose multiplexed endpoints
    const decomposed = decomposeMultiplexed(ep);
    if (decomposed.length > 1) {
      decomposedCount += decomposed.length;
      for (const sub of decomposed) {
        sub.normalizationFlags = [...(sub.normalizationFlags || [])];
        const subStatuses = new Set(sub.sampleRows.map(r => r.status).filter(s => s != null));
        sub.statusCodes = [...subStatuses].sort((a, b) => a - b);
        if (sub.sampleRows.length === 1) {
          if (!sub.normalizationFlags.includes('single-sample')) sub.normalizationFlags.push('single-sample');
        }
        if (subStatuses.size === 1) {
          if (!sub.normalizationFlags.includes('single-status')) sub.normalizationFlags.push('single-status');
        }
        endpoints.push(sub);
      }
    } else {
      endpoints.push(ep);
    }
  }

  // Drop the heavy in-memory rows from the persisted form; infer.mjs needs
  // them so we keep a parallel sidecar file.
  const persisted = endpoints.map(({ sampleRows, ...rest }) => rest);
  writeJsonl(intermediatePath(outDir, 'endpoints.jsonl'), persisted);

  const sidecar = endpoints.map(e => ({ endpointKey: e.endpointKey, samples: e.sampleRows }));
  writeJsonl(intermediatePath(outDir, 'endpoint-samples.jsonl'), sidecar);

  return { endpoints: endpoints.length, noise: noiseCount, pages: pageCount, decomposed: decomposedCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (!out) { console.error('usage: normalize.mjs <out-dir>'); process.exit(2); }
  const stats = normalize(out);
  console.log(`normalize: ${stats.endpoints} endpoints (${stats.noise} noise, ${stats.pages} pages dropped, ${stats.decomposed} decomposed)`);
}
