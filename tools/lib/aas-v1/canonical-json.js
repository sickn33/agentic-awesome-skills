"use strict";

const crypto = require("node:crypto");

function assertCanonicalValue(value, path = "$") {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new TypeError(`Unsupported canonical JSON value at ${path}`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(`Non-finite canonical JSON number at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertCanonicalValue(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain canonical JSON object at ${path}`);
    }
    for (const [key, entry] of Object.entries(value)) assertCanonicalValue(entry, `${path}.${key}`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  assertCanonicalValue(value);
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

module.exports = { assertCanonicalValue, canonicalize, canonicalJson, sha256 };
