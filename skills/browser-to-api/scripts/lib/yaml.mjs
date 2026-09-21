// Minimal YAML emitter for the OpenAPI document we build. Sufficient for the
// shapes we produce (objects, arrays, strings, numbers, booleans, null) without
// pulling in a dep. Strings are conservatively quoted whenever they contain any
// character that would change YAML parsing.

// YAML 1.2 reserves certain characters as indicators that cannot start a plain
// scalar (they must be quoted): , [ ] { } # & * ! | > ' " % @ `
// plus ? and : when followed by whitespace, plus - when followed by whitespace.
// We're conservative: if any of those rules might trip, single-quote the string.
const FIRST_CHAR_DENY = /^[,\[\]{}#&*!|>'"%@`]/;
const FIRST_CHAR_AMBIG = /^[-?:]/;
const SAFE_BARE = /^[A-Za-z0-9_./-][A-Za-z0-9 _./@-]*$/;
const RESERVED = new Set([
  'true', 'false', 'null', 'yes', 'no', 'on', 'off', '~',
  'True', 'False', 'Null', 'TRUE', 'FALSE', 'NULL',
]);

function quoteScalar(s) {
  if (s === '') return "''";
  if (RESERVED.has(s)) return `'${s}'`;
  if (/^-?\d+(\.\d+)?$/.test(s)) return `'${s}'`;
  if (FIRST_CHAR_DENY.test(s) || FIRST_CHAR_AMBIG.test(s) || !SAFE_BARE.test(s)) {
    // Prefer single quotes; if the string contains them, escape via doubling.
    if (!s.includes("'") && !s.includes('\n')) return `'${s}'`;
    return JSON.stringify(s); // double-quoted YAML is JSON-compatible
  }
  return s;
}

function emitScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return JSON.stringify(String(v));
    return String(v);
  }
  return quoteScalar(String(v));
}

function isScalar(v) {
  return v === null || v === undefined ||
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function emit(node, indent) {
  if (isScalar(node)) return emitScalar(node);
  const pad = '  '.repeat(indent);

  if (Array.isArray(node)) {
    if (node.length === 0) return '[]';
    return node.map(item => {
      if (isScalar(item)) return `${pad}- ${emitScalar(item)}`;
      const inner = emit(item, indent + 1);
      // Place the dash on the same line as the first key of an object, or as
      // the opener of a nested array.
      if (inner.startsWith(pad + '  ')) {
        return pad + '- ' + inner.trimStart().slice(0); // first line dedented relative to dash
      }
      return `${pad}-\n${inner}`;
    }).join('\n');
  }

  // Object
  const keys = Object.keys(node);
  if (keys.length === 0) return '{}';
  const lines = [];
  for (const k of keys) {
    const v = node[k];
    const keyStr = quoteScalar(k);
    if (isScalar(v)) {
      lines.push(`${pad}${keyStr}: ${emitScalar(v)}`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${pad}${keyStr}: []`); continue; }
      lines.push(`${pad}${keyStr}:`);
      lines.push(emit(v, indent + 1));
    } else {
      if (Object.keys(v).length === 0) { lines.push(`${pad}${keyStr}: {}`); continue; }
      lines.push(`${pad}${keyStr}:`);
      lines.push(emit(v, indent + 1));
    }
  }
  return lines.join('\n');
}

export function toYaml(obj) {
  return emit(obj, 0) + '\n';
}
