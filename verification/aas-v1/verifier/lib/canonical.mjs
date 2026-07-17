import crypto from "node:crypto";

function canonicalNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError("Canonical JSON forbids non-finite numbers");
  if (Object.is(value, -0)) return "0";
  return JSON.stringify(value);
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return canonicalNumber(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    // RFC 8785 orders names by UTF-16 code units, matching ECMAScript's
    // default string sort. UTF-8 byte order differs for some non-ASCII keys.
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new TypeError(`Canonical JSON cannot encode ${typeof value}`);
}

export function sha256(value) {
  return `sha256-${crypto.createHash("sha256").update(value).digest("hex")}`;
}

export function sha512(value) {
  return `sha512-${crypto.createHash("sha512").update(value).digest("base64")}`;
}

export function digestJson(value) {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

export function parseCanonicalJson(text) {
  const value = JSON.parse(text);
  if (canonicalJson(value) !== text.trim()) throw new Error("Input is not canonical JSON");
  return value;
}
