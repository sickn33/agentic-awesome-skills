// JSON-Schema (draft 2020-12 / OpenAPI 3.1 compatible) inference from sample values.
//
// The merge is associative and idempotent: mergeSchemas(merge(a,b), c) == merge(a, merge(b,c)).
// Required fields are intersected (must be present in every sample). Types are
// unioned. Arrays infer item schemas across all samples. Enum detection runs as
// a final pass once all samples are merged in.

const ENUM_MAX = parseInt(process.env.DISCOVER_ENUM_MAX_DISTINCT || '8', 10);
const ENUM_MIN = parseInt(process.env.DISCOVER_ENUM_MIN_SAMPLES  || '5', 10);

const ISO_RE   = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const URI_RE   = /^https?:\/\/\S+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // 'string', 'number', 'boolean', 'object'
}

function inferFormat(v) {
  if (typeof v !== 'string') return null;
  if (UUID_RE.test(v))  return 'uuid';
  if (ISO_RE.test(v))   return 'date-time';
  if (URI_RE.test(v))   return 'uri';
  if (EMAIL_RE.test(v)) return 'email';
  return null;
}

// Build a "pre-schema" — captures every observed sample so we can compute
// required/enum/format with global knowledge, then collapse to JSON Schema.
export function newProto() {
  return {
    types: new Set(),       // 'string', 'integer', 'number', 'boolean', 'null', 'object', 'array'
    samples: 0,
    nullCount: 0,
    formats: new Map(),     // format -> count of samples that matched
    values: new Set(),      // primitive values, capped (used for enum detection)
    valuesCapped: false,
    properties: new Map(),  // key -> proto
    presence: new Map(),    // key -> count of samples that contained the key
    items: null,            // proto for array items
  };
}

const VALUE_CAP = 64;

export function ingest(proto, value) {
  proto.samples++;
  const t = jsonType(value);

  if (t === 'null') { proto.types.add('null'); proto.nullCount++; return; }

  if (t === 'number') {
    proto.types.add(Number.isInteger(value) ? 'integer' : 'number');
  } else {
    proto.types.add(t);
  }

  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'integer') {
    if (!proto.valuesCapped) {
      proto.values.add(value);
      if (proto.values.size > VALUE_CAP) {
        proto.values.clear();
        proto.valuesCapped = true;
      }
    }
    if (t === 'string') {
      const f = inferFormat(value);
      if (f) proto.formats.set(f, (proto.formats.get(f) || 0) + 1);
    }
  }

  if (t === 'object') {
    for (const [k, v] of Object.entries(value)) {
      proto.presence.set(k, (proto.presence.get(k) || 0) + 1);
      let child = proto.properties.get(k);
      if (!child) { child = newProto(); proto.properties.set(k, child); }
      ingest(child, v);
    }
  }

  if (t === 'array') {
    if (!proto.items) proto.items = newProto();
    for (const item of value) ingest(proto.items, item);
    // Important: treat array containment as a single sample at this level —
    // ingest() above already counted samples++ once. Items are sampled
    // individually inside the recursive call.
  }
}

export function ingestMany(proto, values) {
  for (const v of values) ingest(proto, v);
  return proto;
}

// Convert a proto into a JSON Schema fragment.
export function toSchema(proto) {
  if (!proto || proto.samples === 0) return {};

  const types = Array.from(proto.types);
  const nonNull = types.filter(t => t !== 'null');
  const nullable = proto.types.has('null') && nonNull.length > 0;

  // Scalar / enum case
  if (nonNull.length === 1 && !['object', 'array'].includes(nonNull[0])) {
    const t = nonNull[0];
    const out = { type: t };
    if (nullable) out.type = [t, 'null'];

    if (t === 'string') {
      // Format: pick the format that matched ≥ 80% of string samples
      const stringSamples = proto.samples - proto.nullCount;
      if (stringSamples > 0) {
        for (const [f, n] of proto.formats.entries()) {
          if (n / stringSamples >= 0.8) { out.format = f; break; }
        }
      }
    }

    // Enum detection: low cardinality AND meaningful repetition (otherwise
    // every distinct ID across N samples would look like an N-way enum).
    const valueSamples = proto.samples - proto.nullCount;
    if (!proto.valuesCapped &&
        proto.values.size > 0 &&
        proto.values.size <= ENUM_MAX &&
        valueSamples >= ENUM_MIN &&
        proto.values.size <= Math.max(2, Math.floor(valueSamples / 2))) {
      out.enum = Array.from(proto.values).sort((a, b) => String(a).localeCompare(String(b)));
    }
    return out;
  }

  // Object
  if (nonNull.length === 1 && nonNull[0] === 'object') {
    const properties = {};
    const required = [];
    for (const [k, child] of proto.properties.entries()) {
      properties[k] = toSchema(child);
      const presence = proto.presence.get(k) || 0;
      if (presence === proto.samples - proto.nullCount && presence > 0) required.push(k);
    }
    const out = { type: nullable ? ['object', 'null'] : 'object' };
    if (Object.keys(properties).length) out.properties = properties;
    if (required.length) out.required = required.sort();
    return out;
  }

  // Array
  if (nonNull.length === 1 && nonNull[0] === 'array') {
    const out = { type: nullable ? ['array', 'null'] : 'array' };
    if (proto.items) out.items = toSchema(proto.items);
    return out;
  }

  // Mixed types — fall back to a typed union via "type" array (OpenAPI 3.1 / draft 2020-12 OK).
  const out = { type: nullable ? [...nonNull, 'null'] : nonNull };
  return out;
}

// Convenience: build a schema directly from an array of sample values.
export function inferSchema(samples) {
  const p = newProto();
  ingestMany(p, samples);
  return toSchema(p);
}

// Stable structural hash for schema deduplication when hoisting components.
export function structuralHash(schema) {
  if (!schema || typeof schema !== 'object') return JSON.stringify(schema);
  if (Array.isArray(schema)) return '[' + schema.map(structuralHash).join(',') + ']';
  const keys = Object.keys(schema).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + structuralHash(schema[k])).join(',') + '}';
}
