// Redact credentials and PII before persisting samples or schema-derived bodies.
// All redactions replace values in-place with the literal string "<redacted>"
// so downstream schema inference still sees a string and types stay coherent.

const HEADER_DENY = new Set([
  'authorization', 'cookie', 'set-cookie', 'x-csrf-token', 'x-xsrf-token',
  'x-api-key', 'proxy-authorization',
]);

const HEADER_PATTERNS = [/token/i, /secret/i, /signature/i, /session/i];

const KEY_DENY = new Set([
  'password', 'token', 'secret', 'api_key', 'apikey',
  'accesstoken', 'refreshtoken', 'creditcard', 'ssn',
]);

const JWT_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{6,}[0-9]$/;

export function makeRedactor({ extra = [] } = {}) {
  const extraHeaders = new Set();
  const extraKeys = new Set();
  for (const e of extra) {
    const k = e.toLowerCase();
    extraHeaders.add(k);
    extraKeys.add(k);
  }
  const counts = { headers: 0, bodyKeys: 0, bodyValues: 0 };

  function isHeaderSecret(name) {
    const k = name.toLowerCase();
    if (HEADER_DENY.has(k) || extraHeaders.has(k)) return true;
    return HEADER_PATTERNS.some(re => re.test(k));
  }

  function isKeySecret(name) {
    const k = String(name).toLowerCase().replace(/[_-]/g, '');
    return KEY_DENY.has(k) || extraKeys.has(k);
  }

  function isValueSecret(v) {
    if (typeof v !== 'string') return false;
    if (v.length < 6) return false;
    return JWT_RE.test(v) || EMAIL_RE.test(v) || PHONE_RE.test(v);
  }

  function redactHeaders(h) {
    if (!h || typeof h !== 'object') return h;
    const out = {};
    for (const [k, v] of Object.entries(h)) {
      if (isHeaderSecret(k)) { out[k] = '<redacted>'; counts.headers++; }
      else out[k] = v;
    }
    return out;
  }

  function redactBody(node) {
    if (Array.isArray(node)) return node.map(redactBody);
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (isKeySecret(k)) { out[k] = '<redacted>'; counts.bodyKeys++; }
        else out[k] = redactBody(v);
      }
      return out;
    }
    if (isValueSecret(node)) { counts.bodyValues++; return '<redacted>'; }
    return node;
  }

  return { redactHeaders, redactBody, counts };
}
