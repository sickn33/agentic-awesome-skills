#!/usr/bin/env node
// Stage 4 — Infer.
//
// Run JSON-Schema inference across each endpoint's request/response samples,
// pick representative redacted examples, and persist the result alongside the
// endpoint metadata for the emit stage.

import path from 'node:path';
import crypto from 'node:crypto';
import { readJsonl, writeJsonl, writeJson, intermediatePath, samplePath, ensureDir } from './lib/io.mjs';
import { newProto, ingest, toSchema } from './lib/schema-merge.mjs';
import { makeRedactor } from './lib/redact.mjs';

function pathHash(method, p) {
  return crypto.createHash('sha1').update(`${method} ${p}`).digest('hex').slice(0, 10);
}

function inferAuthHeaders(samples) {
  const seen = new Set();
  for (const s of samples) {
    for (const k of Object.keys(s.reqHeaders || {})) {
      const lk = k.toLowerCase();
      if (lk === 'authorization' || lk === 'x-api-key' || /token/.test(lk) || /^x-.*-auth/.test(lk)) {
        seen.add(lk);
      }
    }
  }
  return [...seen].sort();
}

export function infer(outDir, opts = {}) {
  const redactor = makeRedactor({ extra: opts.redact || [] });

  const endpoints = readJsonl(intermediatePath(outDir, 'endpoints.jsonl'));
  const samplesByKey = new Map();
  for (const row of readJsonl(intermediatePath(outDir, 'endpoint-samples.jsonl'))) {
    samplesByKey.set(row.endpointKey, row.samples);
  }

  ensureDir(path.join(outDir, 'samples'));
  const enriched = [];

  for (const ep of endpoints) {
    const samples = samplesByKey.get(ep.endpointKey) || [];
    const reqProto = newProto();
    const respProtoByStatus = new Map(); // status -> proto

    let pickedReqExample = null;
    let pickedRespExample = null;
    let pickedReqStatus = null, pickedRespStatus = null;

    for (const s of samples) {
      if (s.reqBody != null && typeof s.reqBody === 'object') {
        ingest(reqProto, s.reqBody);
        if (!pickedReqExample) { pickedReqExample = s.reqBody; pickedReqStatus = s.status; }
      }
      if (s.respBody != null && typeof s.respBody === 'object') {
        // Skip when we have no status: emit.mjs only renders schemas under
        // statuses that appear in ep.statusCodes (which excludes nulls), so
        // a body keyed under "0" would be silently discarded.
        if (s.status == null) continue;
        let p = respProtoByStatus.get(s.status);
        if (!p) { p = newProto(); respProtoByStatus.set(s.status, p); }
        ingest(p, s.respBody);
        if (s.status >= 200 && s.status < 300 && !pickedRespExample) {
          pickedRespExample = s.respBody;
          pickedRespStatus = s.status;
        }
      }
    }

    const requestBodyKnown = reqProto.samples > 0;
    const responseBodyKnown = [...respProtoByStatus.values()].some(p => p.samples > 0);

    const requestSchema = requestBodyKnown ? toSchema(reqProto) : null;
    const responseSchemas = {};
    for (const [status, p] of respProtoByStatus.entries()) {
      responseSchemas[String(status)] = toSchema(p);
    }

    // Determine the canonical content-type per role from sample headers.
    const reqCT = inferContentType(samples, 'reqHeaders');
    const respCTByStatus = {};
    for (const s of samples) {
      const status = s.status ?? 0;
      if (!respCTByStatus[status]) respCTByStatus[status] = inferContentType([s], 'respHeaders');
    }

    // Redact once and reuse for both the persisted sample file and the inline
    // OpenAPI example. (Calling redactBody twice double-counts redactions.)
    const ph = pathHash(ep.method, ep.path);
    const reqExample = pickedReqExample != null ? redactor.redactBody(pickedReqExample) : null;
    const respExample = pickedRespExample != null ? redactor.redactBody(pickedRespExample) : null;
    const reqHeaders = redactor.redactHeaders(samples[0]?.reqHeaders || {});
    const respHeaders = redactor.redactHeaders(samples[0]?.respHeaders || {});

    const example = {
      endpoint: ep.endpointKey,
      request:  { status: pickedReqStatus,  headers: reqHeaders,  body: reqExample },
      response: { status: pickedRespStatus, headers: respHeaders, body: respExample },
    };
    writeJson(samplePath(outDir, ep.method, ph), example);

    enriched.push({
      ...ep,
      pathHash: ph,
      requestBodyKnown,
      responseBodyKnown,
      requestSchema,
      responseSchemas,
      requestContentType: reqCT,
      responseContentTypes: respCTByStatus,
      requestExample: reqExample,
      responseExample: respExample,
      observedAuthHeaders: inferAuthHeaders(samples),
    });
  }

  writeJsonl(intermediatePath(outDir, 'endpoints.with-schemas.jsonl'), enriched);

  // Also persist redaction stats for the report.
  writeJson(intermediatePath(outDir, 'redaction-stats.json'), redactor.counts);

  return { endpoints: enriched.length, redactor: redactor.counts };
}

function inferContentType(samples, headerField) {
  for (const s of samples) {
    const headers = s[headerField] || {};
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === 'content-type') return String(v).split(';')[0].trim();
    }
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (!out) { console.error('usage: infer.mjs <out-dir>'); process.exit(2); }
  const stats = infer(out);
  console.log(`infer: ${stats.endpoints} endpoints (redactions: ${stats.redactor.headers}h ${stats.redactor.bodyKeys}k ${stats.redactor.bodyValues}v)`);
}
