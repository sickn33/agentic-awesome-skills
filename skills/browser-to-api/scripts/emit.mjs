#!/usr/bin/env node
// Stage 5 — Emit.
//
// Build the OpenAPI 3.1 document, hoist repeated schemas into components, and
// write openapi.yaml, openapi.json, report.md, confidence.json.

import path from 'node:path';
import { readJsonl, writeJson, writeText, intermediatePath, readJson } from './lib/io.mjs';
import { structuralHash } from './lib/schema-merge.mjs';
import { toYaml } from './lib/yaml.mjs';

function confidenceBucket(ep) {
  const s = ep.sampleCount;
  const flagged = ep.normalizationFlags.length > 0;
  const multiStatus = ep.statusCodes.length >= 2;
  if (s <= 2 || flagged) return 'low';
  if (s >= 10 && multiStatus) return 'high';
  return 'medium';
}

// Hoist structurally-identical inline schemas into components.schemas. We use a
// stable structural hash and bias names off the endpoint path so refs are
// readable (e.g. "Item" instead of "Schema7"). Recurses into nested object/array
// schemas so a Post that appears once at the top level and once as the items of
// a list still hoists as a single component.
function buildComponents(endpoints) {
  const byHash = new Map();      // hash -> { name, schema, hint }
  const refCount = new Map();    // hash -> count of sites referencing it

  function isObjectSchema(s) {
    if (!s || typeof s !== 'object') return false;
    if (s.type === 'object') return true;
    if (Array.isArray(s.type) && s.type.includes('object')) return true;
    return false;
  }
  function isArraySchema(s) {
    if (!s || typeof s !== 'object') return false;
    if (s.type === 'array') return true;
    if (Array.isArray(s.type) && s.type.includes('array')) return true;
    return false;
  }

  function visit(schema, hint) {
    if (!schema || typeof schema !== 'object') return;
    if (isObjectSchema(schema)) {
      const h = structuralHash(schema);
      refCount.set(h, (refCount.get(h) || 0) + 1);
      if (!byHash.has(h)) byHash.set(h, { name: null, schema, hint });
      for (const [k, child] of Object.entries(schema.properties || {})) {
        visit(child, propHint(hint, k));
      }
    } else if (isArraySchema(schema) && schema.items) {
      visit(schema.items, hint);
    }
  }

  for (const ep of endpoints) {
    if (ep.requestSchema) visit(ep.requestSchema, schemaHintFromPath(ep.path) + 'Request');
    for (const [, sch] of Object.entries(ep.responseSchemas || {})) {
      visit(sch, schemaHintFromPath(ep.path));
    }
  }

  // Hoist when (a) referenced by ≥ 2 sites, OR (b) it's an object with ≥ 4 properties.
  const components = {};
  let counter = 0;
  for (const [h, info] of byHash.entries()) {
    const refs = refCount.get(h) || 0;
    const propCount = Object.keys(info.schema.properties || {}).length;
    if (refs < 2 && propCount < 4) continue;
    let name = info.hint || `Schema${++counter}`;
    if (components[name]) name = `${name}_${++counter}`;
    info.name = name;
    components[name] = info.schema;
  }

  // refOrInline rewrites a schema, replacing any nested object schema that
  // matches a hoisted component with a $ref. Arrays have their items rewritten.
  function refOrInline(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    if (isObjectSchema(schema)) {
      const h = structuralHash(schema);
      const info = byHash.get(h);
      if (info && info.name) return { $ref: `#/components/schemas/${info.name}` };
      if (!schema.properties) return schema;
      const rewritten = { ...schema, properties: {} };
      for (const [k, child] of Object.entries(schema.properties)) {
        rewritten.properties[k] = refOrInline(child);
      }
      return rewritten;
    }
    if (isArraySchema(schema) && schema.items) {
      return { ...schema, items: refOrInline(schema.items) };
    }
    return schema;
  }

  // Inline-rewrite the components themselves so nested objects within
  // components also use $refs.
  for (const [name, sch] of Object.entries(components)) {
    if (sch.properties) {
      components[name] = { ...sch, properties: Object.fromEntries(
        Object.entries(sch.properties).map(([k, c]) => [k, refOrInline(c)]),
      )};
    }
  }

  return { components, refOrInline };
}

function propHint(parentHint, key) {
  const cap = key.replace(/[^A-Za-z0-9]/g, '').replace(/^./, c => c.toUpperCase());
  return cap || (parentHint ? parentHint + 'Inner' : 'Schema');
}

function schemaHintFromPath(p) {
  if (!p) return 'Schema';
  const parts = p.split('/').filter(s => s && !s.startsWith('{'));
  if (!parts.length) return 'Root';
  const last = parts[parts.length - 1];
  return last.replace(/[^A-Za-z0-9]/g, '').replace(/^./, c => c.toUpperCase()) || 'Schema';
}

function makeOperation(ep, refOrInline) {
  const params = [];
  for (const p of ep.pathParams || []) params.push(p);
  for (const p of ep.queryParams || []) params.push(p);

  const summary = ep.operationName
    ? `${ep.operationName} (${ep.method} ${ep.parentPath || ep.path})`
    : `${ep.method} ${ep.path}`;
  const op = {
    summary,
    operationId: makeOpId(ep),
  };
  if (params.length) op.parameters = params;

  if (ep.requestSchema && (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH' || ep.method === 'DELETE')) {
    op.requestBody = {
      content: {
        [ep.requestContentType || 'application/json']: {
          schema: refOrInline(ep.requestSchema),
          ...(ep.requestExample ? { example: ep.requestExample } : {}),
        },
      },
    };
  }

  const responses = {};
  const statuses = ep.statusCodes.length ? ep.statusCodes : [200];
  for (const status of statuses) {
    const ct = (ep.responseContentTypes && ep.responseContentTypes[status]) || 'application/json';
    const schema = ep.responseSchemas?.[String(status)];
    const entry = { description: defaultDescriptionFor(status) };
    if (schema || ep.responseExample) {
      entry.content = {
        [ct]: {
          ...(schema ? { schema: refOrInline(schema) } : {}),
          ...(status === ep.statusCodes[0] && ep.responseExample ? { example: ep.responseExample } : {}),
        },
      };
    }
    responses[String(status)] = entry;
  }
  op.responses = responses;

  // Extensions
  op['x-confidence'] = {
    samples: ep.sampleCount,
    statusCodes: ep.statusCodes,
    normalizationFlags: ep.normalizationFlags,
    confidence: confidenceBucket(ep),
  };
  op['x-sample-count'] = ep.sampleCount;
  if (ep.observedAuthHeaders?.length) op['x-observed-auth'] = ep.observedAuthHeaders;
  op['x-origin'] = ep.origin;

  return op;
}

function defaultDescriptionFor(status) {
  const n = Number(status);
  if (n >= 200 && n < 300) return 'Success';
  if (n >= 300 && n < 400) return 'Redirect';
  if (n === 400) return 'Bad request';
  if (n === 401) return 'Unauthorized';
  if (n === 403) return 'Forbidden';
  if (n === 404) return 'Not found';
  if (n >= 400 && n < 500) return 'Client error';
  if (n >= 500) return 'Server error';
  return `Status ${status}`;
}

function makeOpId(ep) {
  if (ep.operationName) {
    return `${ep.method.toLowerCase()}_${ep.operationName.replace(/[^A-Za-z0-9]/g, '_')}`;
  }
  const parts = ep.path.split('/').filter(Boolean).map(s => s.replace(/[{}]/g, ''));
  const tail = parts.map(p => p.replace(/[^A-Za-z0-9]/g, '_')).join('_');
  return `${ep.method.toLowerCase()}_${tail || 'root'}`;
}

export function emit(outDir, opts = {}) {
  const minSamples = opts.minSamples || 1;
  const format = opts.format || 'both';
  const titleOverride = opts.title || null;

  const endpoints = readJsonl(intermediatePath(outDir, 'endpoints.with-schemas.jsonl'));
  const kept = endpoints.filter(e => e.sampleCount >= minSamples);
  const dropped = endpoints.filter(e => e.sampleCount < minSamples);

  // Load raw samples for header extraction (client generation needs them)
  const samplesByKey = new Map();
  for (const row of readJsonl(intermediatePath(outDir, 'endpoint-samples.jsonl'))) {
    samplesByKey.set(row.endpointKey, row.samples);
  }
  // Attach to kept endpoints temporarily for client gen
  for (const ep of kept) {
    ep.sampleRows = samplesByKey.get(ep.endpointKey) || [];
  }

  // Servers: one entry per distinct origin, sorted by frequency.
  const originCounts = new Map();
  for (const e of kept) originCounts.set(e.origin, (originCounts.get(e.origin) || 0) + e.sampleCount);
  const servers = [...originCounts.entries()].sort((a, b) => b[1] - a[1]).map(([url]) => ({ url }));

  const primary = servers[0]?.url || '';
  const title = titleOverride || (primary ? `${new URL(primary).host} (discovered)` : 'Discovered API');

  const { components, refOrInline } = buildComponents(kept);

  // Build paths. Decomposed operations (e.g. GraphQL) get a synthetic path
  // like /dapi/fe/gql#Autocomplete so each operation is a distinct entry.
  const paths = {};
  const collisions = {};
  for (const ep of kept) {
    const m = ep.method.toLowerCase();
    // Use the path as-is (includes [OpName] for decomposed endpoints)
    const pathKey = ep.path;
    if (!paths[pathKey]) paths[pathKey] = {};
    const existing = paths[pathKey][m];
    if (!existing) {
      paths[pathKey][m] = makeOperation(ep, refOrInline);
    } else {
      const key = `${m} ${pathKey}`;
      if (!collisions[key]) collisions[key] = [{ origin: existing['x-origin'], samples: existing['x-sample-count'] }];
      collisions[key].push({ origin: ep.origin, samples: ep.sampleCount });
      if (ep.sampleCount > (existing['x-sample-count'] || 0)) {
        paths[pathKey][m] = makeOperation(ep, refOrInline);
      }
    }
  }
  for (const [key, origins] of Object.entries(collisions)) {
    const [m, ...rest] = key.split(' ');
    const p = rest.join(' ');
    if (!paths[p]?.[m]) continue;
    const op = paths[p][m];
    const winner = op['x-origin'];
    op['x-also-served-from'] = origins.filter(o => o.origin !== winner).map(o => o.origin);
  }

  const doc = {
    openapi: '3.1.0',
    info: {
      title,
      version: '0.1.0-discovered',
      description: 'Spec discovered from a browser-trace capture by the browser-to-api skill. Inductive, not contractual — see `report.md` and `x-confidence` extensions for caveats.',
    },
    servers,
    paths,
  };
  if (Object.keys(components).length) doc.components = { schemas: components };

  if (format === 'yaml' || format === 'both') {
    writeText(path.join(outDir, 'openapi.yaml'), toYaml(doc));
  }
  if (format === 'json' || format === 'both') {
    writeJson(path.join(outDir, 'openapi.json'), doc);
  }

  // confidence.json
  const confidence = {
    endpoints: endpoints.map(ep => ({
      key: ep.endpointKey,
      samples: ep.sampleCount,
      statusCodes: ep.statusCodes,
      requestBodyKnown: ep.requestBodyKnown,
      responseBodyKnown: ep.responseBodyKnown,
      normalizationFlags: ep.normalizationFlags,
      confidence: confidenceBucket(ep),
      includedInSpec: ep.sampleCount >= minSamples,
    })),
  };
  writeJson(path.join(outDir, 'confidence.json'), confidence);

  // report.md
  const redaction = readJson(intermediatePath(outDir, 'redaction-stats.json'), { headers: 0, bodyKeys: 0, bodyValues: 0 });

  // client.mjs — generated SDK wrapping each operation as a callable function
  const clientCode = buildClient({ kept, servers });
  if (clientCode) {
    writeText(path.join(outDir, 'client.mjs'), clientCode);
  }

  writeText(path.join(outDir, 'report.md'), buildReport({ kept, dropped, servers, redaction, minSamples, hasClient: !!clientCode }));

  // index.html — self-contained visual report
  writeText(path.join(outDir, 'index.html'), buildHtmlReport({ kept, servers, title, clientCode }));

  return {
    endpoints: kept.length,
    droppedLowSample: dropped.length,
    servers: servers.length,
    components: Object.keys(components).length,
    client: !!clientCode,
  };
}

// ---------------------------------------------------------------------------
// Client SDK generation
// ---------------------------------------------------------------------------

function toFnName(name) {
  // Autocomplete → autocomplete, RestaurantsAvailability → restaurantsAvailability
  return name[0].toLowerCase() + name.slice(1);
}

function extractObservedHeaders(kept) {
  // Pull non-standard headers that appeared consistently across requests.
  // These are often required (CSRF tokens, custom auth, etc.)
  const candidates = new Map(); // headerName -> { values: Set, count }
  let totalSamples = 0;
  const skip = new Set([
    'content-type', 'user-agent', 'accept', 'accept-encoding', 'accept-language',
    'referer', 'origin', 'host', 'connection', 'content-length',
    'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
    'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site',
    'cookie', 'authorization', 'x-api-key',
  ]);
  for (const ep of kept) {
    const samples = ep.sampleRows || [];
    for (const s of samples) {
      totalSamples++;
      for (const [k, v] of Object.entries(s.reqHeaders || {})) {
        const lk = k.toLowerCase();
        if (skip.has(lk)) continue;
        if (!candidates.has(lk)) candidates.set(lk, { name: k, values: new Set(), count: 0 });
        const c = candidates.get(lk);
        c.count++;
        c.values.add(v);
      }
    }
  }
  // Keep headers present in >50% of requests (likely required)
  const result = {};
  for (const [, c] of candidates) {
    if (c.count <= totalSamples * 0.5) continue;
    if (c.values.size <= 5) {
      result[c.name] = [...c.values][0];
    } else {
      // High cardinality (e.g. CSRF tokens, correlation IDs) — include with a
      // representative value. The header is likely required even if the value varies.
      result[c.name] = [...c.values][0];
    }
  }
  return result;
}

function buildClient({ kept, servers }) {
  const baseUrl = servers[0]?.url || '';
  const operations = kept.filter(e => e.operationName);
  const regular = kept.filter(e => !e.operationName);

  if (!operations.length && !regular.length) return null;

  // Detect required headers from the trace (e.g. CSRF tokens)
  const observedHeaders = extractObservedHeaders(kept);

  const lines = [];
  lines.push(`// Auto-generated API client from browser-trace capture.`);
  lines.push(`// Usage: import { ${operations.slice(0, 3).map(e => toFnName(e.operationName)).join(', ')}${operations.length > 3 ? ', ...' : ''} } from './client.mjs';\n`);
  lines.push(`const BASE = '${baseUrl}';\n`);

  lines.push(`const defaultHeaders = {`);
  lines.push(`  'Content-Type': 'application/json',`);
  lines.push(`  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',`);
  for (const [k, v] of Object.entries(observedHeaders)) {
    lines.push(`  '${k}': '${v}',`);
  }
  lines.push(`};\n`);

  lines.push(`async function request(path, { method = 'GET', body, query, headers } = {}) {`);
  lines.push(`  let url = BASE + path;`);
  lines.push(`  if (query) {`);
  lines.push(`    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null));`);
  lines.push(`    if (qs.toString()) url += '?' + qs;`);
  lines.push(`  }`);
  lines.push(`  const res = await fetch(url, {`);
  lines.push(`    method,`);
  lines.push(`    headers: { ...defaultHeaders, ...headers },`);
  lines.push(`    ...(body ? { body: JSON.stringify(body) } : {}),`);
  lines.push(`  });`);
  lines.push(`  if (!res.ok) throw new Error(\`\${res.status} \${res.statusText}: \${await res.text()}\`);`);
  lines.push(`  const ct = res.headers.get('content-type') || '';`);
  lines.push(`  return ct.includes('json') ? res.json() : res.text();`);
  lines.push(`}\n`);

  // GraphQL / multiplexed operations
  if (operations.length) {
    // Group by parent path + discriminator to emit one dispatcher per GQL endpoint
    const byParent = new Map();
    for (const op of operations) {
      const key = op.parentPath || op.path;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(op);
    }

    for (const [parentPath, ops] of byParent) {
      // Check if it's a persisted-query GraphQL endpoint
      const isPersisted = ops.some(op =>
        op.requestExample?.extensions?.persistedQuery?.sha256Hash);

      if (isPersisted) {
        // Build a hash lookup table
        lines.push(`// Persisted query hashes for ${parentPath}`);
        lines.push(`const HASHES = {`);
        for (const op of ops) {
          const hash = op.requestExample?.extensions?.persistedQuery?.sha256Hash;
          if (hash) lines.push(`  ${op.operationName}: '${hash}',`);
        }
        lines.push(`};\n`);
      }

      // Emit a function per operation
      for (const op of ops) {
        const fnName = toFnName(op.operationName);
        const vars = op.requestExample?.variables;
        const varKeys = vars && typeof vars === 'object' ? Object.keys(vars) : [];

        // Build JSDoc
        lines.push(`/**`);
        if (varKeys.length) {
          for (const k of varKeys) {
            const v = vars[k];
            const t = v === null ? '*' : Array.isArray(v) ? 'Array' : typeof v;
            lines.push(` * @param {${t}} variables.${k}`);
          }
        }
        lines.push(` * @returns {Promise<object>}`);
        lines.push(` */`);

        lines.push(`export async function ${fnName}(variables = {}) {`);
        if (isPersisted) {
          lines.push(`  return request('${parentPath}', {`);
          lines.push(`    method: 'POST',`);
          lines.push(`    query: { optype: 'query', opname: '${op.operationName}' },`);
          lines.push(`    body: {`);
          lines.push(`      operationName: '${op.operationName}',`);
          lines.push(`      variables,`);
          lines.push(`      extensions: { persistedQuery: { version: 1, sha256Hash: HASHES.${op.operationName} } },`);
          lines.push(`    },`);
          lines.push(`  });`);
        } else {
          lines.push(`  return request('${parentPath}', {`);
          lines.push(`    method: 'POST',`);
          lines.push(`    body: { ${op.discriminatorField || 'operationName'}: '${op.operationName}', variables },`);
          lines.push(`  });`);
        }
        lines.push(`}\n`);
      }
    }
  }

  // Regular REST endpoints
  for (const ep of regular) {
    const fnName = makeOpId(ep).replace(/^(get|post|put|patch|delete)_/, (_, m) => m);
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.requestBodyKnown;

    lines.push(`export async function ${fnName}(${hasBody ? 'body, ' : ''}options = {}) {`);
    lines.push(`  return request('${ep.path}', {`);
    lines.push(`    method: '${ep.method}',`);
    if (hasBody) lines.push(`    body,`);
    lines.push(`    ...options,`);
    lines.push(`  });`);
    lines.push(`}\n`);
  }

  return lines.join('\n') + '\n';
}

function buildReport({ kept, dropped, servers, redaction, minSamples, hasClient }) {
  const lines = [];
  const baseUrl = servers[0]?.url || '';
  lines.push('# Discovered API\n');
  lines.push(`**Base URL:** \`${baseUrl || '(unknown)'}\`\n`);

  // Separate decomposed (named operations) from regular endpoints
  const operations = kept.filter(e => e.operationName);
  const regular = kept.filter(e => !e.operationName);

  // Quick-start with generated client
  if (hasClient) {
    const allFns = [...operations, ...regular];
    const fnNames = allFns.map(e => e.operationName ? toFnName(e.operationName) : makeOpId(e));
    lines.push('## Quick start\n');
    lines.push('```js');
    lines.push(`import { ${fnNames.join(', ')} } from './client.mjs';`);
    lines.push('```\n');
    lines.push(`**${fnNames.length} functions**, zero dependencies. See [\`client.mjs\`](./client.mjs) for full signatures.\n`);
  }

  // --- Named operations (GraphQL / multiplexed) ---
  if (operations.length) {
    lines.push('## Operations\n');
    lines.push('These are logical operations multiplexed over a single endpoint.\n');

    const sorted = [...operations].sort((a, b) => b.sampleCount - a.sampleCount);
    for (const ep of sorted) {
      lines.push(`### ${ep.operationName}\n`);
      lines.push(`- **Endpoint:** \`${ep.method} ${ep.parentPath || ep.path}\``);
      lines.push(`- **Discriminator:** \`${ep.discriminatorField}: "${ep.operationName}"\``);
      lines.push(`- **Samples:** ${ep.sampleCount} | **Statuses:** ${ep.statusCodes.join(', ') || '—'}`);
      lines.push('');

      // Curl example from request body
      if (ep.requestExample) {
        const body = JSON.stringify(ep.requestExample, null, 2);
        const curlPath = ep.parentPath || ep.path;
        lines.push('```bash');
        lines.push(`curl -X ${ep.method} '${baseUrl}${curlPath}' \\`);
        lines.push(`  -H 'Content-Type: application/json' \\`);
        lines.push(`  -d '${body}'`);
        lines.push('```\n');
      }

      // Key variables (for GraphQL, show the variables object shape)
      if (ep.requestExample?.variables && typeof ep.requestExample.variables === 'object') {
        const vars = ep.requestExample.variables;
        const varKeys = Object.keys(vars);
        if (varKeys.length) {
          lines.push('**Variables:**\n');
          lines.push('| Name | Example | Type |');
          lines.push('|---|---|---|');
          for (const k of varKeys) {
            const v = vars[k];
            const t = Array.isArray(v) ? 'array' : typeof v;
            const example = JSON.stringify(v);
            const truncated = example.length > 60 ? example.slice(0, 57) + '...' : example;
            lines.push(`| \`${k}\` | \`${truncated}\` | ${t} |`);
          }
          lines.push('');
        }
      }

      // Response shape summary
      if (ep.responseExample) {
        const respStr = JSON.stringify(ep.responseExample, null, 2);
        const truncResp = respStr.length > 1500 ? respStr.slice(0, 1500) + '\n  ...\n}' : respStr;
        lines.push('<details><summary>Example response</summary>\n');
        lines.push('```json');
        lines.push(truncResp);
        lines.push('```\n</details>\n');
      }
    }
  }

  // --- Regular REST endpoints ---
  if (regular.length) {
    lines.push('## Endpoints\n');
    lines.push('| Method | Path | Samples | Statuses | Confidence |');
    lines.push('|---|---|---|---|---|');
    const sorted = [...regular].sort((a, b) => b.sampleCount - a.sampleCount);
    for (const ep of sorted) {
      lines.push(`| ${ep.method} | \`${ep.path}\` | ${ep.sampleCount} | ${ep.statusCodes.join(', ') || '—'} | ${confidenceBucket(ep)} |`);
    }
    lines.push('');

    // Curl examples for top regular endpoints
    const withExamples = sorted.filter(e => e.requestExample || e.responseExample).slice(0, 5);
    for (const ep of withExamples) {
      lines.push(`### \`${ep.method} ${ep.path}\`\n`);
      if (ep.requestExample) {
        const body = JSON.stringify(ep.requestExample, null, 2);
        lines.push('```bash');
        lines.push(`curl -X ${ep.method} '${baseUrl}${ep.path}' \\`);
        lines.push(`  -H 'Content-Type: application/json' \\`);
        lines.push(`  -d '${body}'`);
        lines.push('```\n');
      }
      if (ep.responseExample) {
        const respStr = JSON.stringify(ep.responseExample, null, 2);
        const truncResp = respStr.length > 1000 ? respStr.slice(0, 1000) + '\n  ...\n}' : respStr;
        lines.push('<details><summary>Example response</summary>\n');
        lines.push('```json');
        lines.push(truncResp);
        lines.push('```\n</details>\n');
      }
    }
  }

  if (!kept.length) lines.push('No API endpoints discovered.\n');

  // --- Coverage ---
  lines.push('## Coverage\n');
  lines.push(`- **${kept.length}** API endpoints discovered`);
  if (dropped.length) lines.push(`- **${dropped.length}** dropped (below --min-samples=${minSamples})`);
  const noResp = kept.filter(e => !e.responseBodyKnown);
  if (noResp.length) lines.push(`- **${noResp.length}** missing response-body schemas`);
  const singleSample = kept.filter(e => e.sampleCount === 1);
  if (singleSample.length) lines.push(`- **${singleSample.length}** observed only once`);
  lines.push('');

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// HTML report
// ---------------------------------------------------------------------------

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtmlReport({ kept, servers, title, clientCode }) {
  const baseUrl = servers[0]?.url || '';
  const operations = kept.filter(e => e.operationName);
  const regular = kept.filter(e => !e.operationName);
  const all = [...operations.sort((a, b) => b.sampleCount - a.sampleCount), ...regular];

  const opCards = all.map((ep, i) => {
    const name = ep.operationName || `${ep.method} ${ep.path}`;
    const fnName = ep.operationName ? toFnName(ep.operationName) : null;
    const vars = ep.requestExample?.variables;
    const varRows = vars && typeof vars === 'object'
      ? Object.entries(vars).map(([k, v]) => {
          const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
          const ex = JSON.stringify(v);
          return `<tr><td><code>${escHtml(k)}</code></td><td>${escHtml(t)}</td><td><code>${escHtml(ex.length > 50 ? ex.slice(0, 47) + '...' : ex)}</code></td></tr>`;
        }).join('\n')
      : '';

    const reqBody = ep.requestExample ? JSON.stringify(ep.requestExample, null, 2) : null;
    const respBody = ep.responseExample ? JSON.stringify(ep.responseExample, null, 2) : null;
    const truncResp = respBody && respBody.length > 2000 ? respBody.slice(0, 2000) + '\n  ...' : respBody;

    return `
    <div class="card" id="op-${i}">
      <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
        <div class="card-title">
          <span class="method">POST</span>
          <span class="op-name">${escHtml(name)}</span>
        </div>
        <div class="card-meta">
          <span class="badge">${ep.sampleCount} sample${ep.sampleCount !== 1 ? 's' : ''}</span>
          ${fnName ? `<code class="fn-name">${escHtml(fnName)}()</code>` : ''}
        </div>
      </div>
      <div class="card-body">
        ${ep.parentPath ? `<p class="endpoint-line"><strong>Endpoint:</strong> <code>${escHtml(ep.method)} ${escHtml(baseUrl)}${escHtml(ep.parentPath)}</code></p>` : ''}
        ${ep.discriminatorField ? `<p class="endpoint-line"><strong>Discriminator:</strong> <code>${escHtml(ep.discriminatorField)}: "${escHtml(ep.operationName)}"</code></p>` : ''}

        ${varRows ? `
        <h4>Variables</h4>
        <table class="var-table">
          <thead><tr><th>Name</th><th>Type</th><th>Example</th></tr></thead>
          <tbody>${varRows}</tbody>
        </table>` : ''}

        ${fnName ? `
        <h4>Client usage</h4>
        <pre><code>import { ${escHtml(fnName)} } from './client.mjs';

const result = await ${escHtml(fnName)}(${vars ? JSON.stringify(Object.fromEntries(Object.entries(vars).filter(([,v]) => v !== '<redacted>').slice(0, 4).map(([k, v]) => {
          if (Array.isArray(v) && v.length > 2) return [k, v.slice(0, 2)];
          return [k, v];
        })), null, 2) : '{}'});</code></pre>` : ''}

        ${reqBody ? `
        <h4>Request body</h4>
        <pre class="scrollable"><code>${escHtml(reqBody)}</code></pre>` : ''}

        ${truncResp ? `
        <h4>Response</h4>
        <pre class="scrollable"><code>${escHtml(truncResp)}</code></pre>` : ''}
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)} — API Report</title>
<style>
  :root {
    --brand: #F03603;
    --black: #100D0D;
    --gray: #514F4F;
    --border: #edebeb;
    --bg: #F9F6F4;
    --card: #ffffff;
    --text: #100D0D;
    --muted: #514F4F;
    --green: #22863a;
    --code-bg: #f6f5f5;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; font-size: 15px; }
  .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }

  header { margin-bottom: 2rem; }
  header h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
  header .meta { color: var(--muted); font-size: 0.875rem; }

  .summary { display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 1rem 1.25rem; flex: 1; min-width: 120px; }
  .stat .label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 600; margin-bottom: 0.25rem; }
  .stat .value { font-size: 1.5rem; font-weight: 700; color: var(--black); }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.5rem; overflow: hidden; }
  .card-header { padding: 0.875rem 1.25rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
  .card-header:hover { background: #faf9f8; }
  .card-title { display: flex; align-items: center; gap: 0.75rem; }
  .card-meta { display: flex; align-items: center; gap: 0.75rem; }
  .method { background: var(--green); color: white; font-size: 0.6875rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.03em; }
  .op-name { font-weight: 600; font-size: 0.9375rem; }
  .fn-name { font-size: 0.8125rem; color: var(--muted); background: var(--code-bg); padding: 0.15rem 0.4rem; border-radius: 3px; }
  .badge { font-size: 0.75rem; color: var(--muted); background: var(--code-bg); padding: 0.15rem 0.5rem; border-radius: 10px; }

  .card-body { display: none; padding: 0 1.25rem 1.25rem; border-top: 1px solid var(--border); }
  .card.open .card-body { display: block; padding-top: 1rem; }
  .card-body h4 { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin: 1.25rem 0 0.5rem; }
  .card-body h4:first-child { margin-top: 0; }
  .endpoint-line { font-size: 0.875rem; margin-bottom: 0.25rem; }

  .var-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
  .var-table th { text-align: left; font-weight: 600; color: var(--muted); padding: 0.4rem 0.75rem; border-bottom: 1px solid var(--border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .var-table td { padding: 0.35rem 0.75rem; border-bottom: 1px solid #f5f4f3; }
  .var-table code { font-size: 0.8125rem; }

  pre { background: var(--code-bg); border-radius: 4px; padding: 0.75rem 1rem; overflow-x: auto; font-size: 0.8125rem; line-height: 1.5; }
  pre.scrollable { max-height: 400px; overflow-y: auto; }
  code { font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace; font-size: 0.875em; }

  .client-section { margin-top: 2rem; }
  .client-section h2 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>${escHtml(title)}</h1>
    <p class="meta">${escHtml(baseUrl)} · ${all.length} operation${all.length !== 1 ? 's' : ''} discovered from browser trace</p>
  </header>

  <div class="summary">
    <div class="stat"><div class="label">Operations</div><div class="value">${all.length}</div></div>
    <div class="stat"><div class="label">Endpoint</div><div class="value" style="font-size:0.875rem">${escHtml(operations[0]?.parentPath || regular[0]?.path || '—')}</div></div>
    <div class="stat"><div class="label">Protocol</div><div class="value" style="font-size:0.875rem">${operations.length ? 'GraphQL (APQ)' : 'REST'}</div></div>
    <div class="stat"><div class="label">Total samples</div><div class="value">${all.reduce((s, e) => s + e.sampleCount, 0)}</div></div>
  </div>

  ${opCards}

  ${clientCode ? `
  <div class="client-section">
    <h2>Generated client</h2>
    <p style="color:var(--muted);font-size:0.875rem;margin-bottom:0.75rem;">Copy <code>client.mjs</code> into your project. Zero dependencies — uses native <code>fetch</code>.</p>
    <pre class="scrollable"><code>${escHtml(clientCode)}</code></pre>
  </div>` : ''}
</div>
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (!out) { console.error('usage: emit.mjs <out-dir>'); process.exit(2); }
  const stats = emit(out);
  console.log(`emit: ${stats.endpoints} endpoints, ${stats.servers} server(s), ${stats.components} components${stats.droppedLowSample ? `, ${stats.droppedLowSample} dropped (low sample)` : ''}`);
}
