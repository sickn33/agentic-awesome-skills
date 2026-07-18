import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { sha256, sha512 } from "./canonical.mjs";

function textField(block, offset, length) {
  return block.subarray(offset, offset + length).toString("utf8").replace(/\0.*$/s, "");
}

function octalField(block, offset, length) {
  const value = textField(block, offset, length).trim();
  if (!/^[0-7]*$/.test(value)) throw new Error(`Invalid tar octal field: ${JSON.stringify(value)}`);
  return Number.parseInt(value || "0", 8);
}

export function parseTarGzip(bytes) {
  const expanded = zlib.gunzipSync(bytes, { maxOutputLength: 512 * 1024 * 1024 });
  if (expanded.length % 512 !== 0) throw new Error("Tarball is not block aligned");
  const entries = [];
  let offset = 0;
  let zeroBlocks = 0;
  while (offset + 512 <= expanded.length) {
    const header = expanded.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1;
      if (zeroBlocks === 2) break;
      continue;
    }
    zeroBlocks = 0;
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const actualChecksum = [...checksumHeader].reduce((total, byte) => total + byte, 0);
    if (actualChecksum !== octalField(header, 148, 8)) throw new Error("Tar header checksum mismatch");
    const name = textField(header, 0, 100);
    const prefix = textField(header, 345, 155);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    const size = octalField(header, 124, 12);
    const type = textField(header, 156, 1) || "0";
    if (offset + size > expanded.length) throw new Error(`${entryPath}: tar entry exceeds archive`);
    const content = expanded.subarray(offset, offset + size);
    entries.push({
      path: entryPath,
      type,
      size,
      mode: octalField(header, 100, 8),
      linkName: textField(header, 157, 100),
      sha256: type === "0" || type === "\0" ? sha256(content) : null,
      content,
    });
    offset += size + ((512 - (size % 512)) % 512);
  }
  if (zeroBlocks !== 2) throw new Error("Tarball lacks two terminal zero blocks");
  return entries;
}

function portablePath(value) {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment && segment !== "." && segment !== "..");
}

const ALLOWED_PACKAGE_PATHS = [
  /^package\/(?:LICENSE(?:\.[^/]+)?|README(?:\.[^/]+)?|package\.json)$/i,
  /^package\/tools\/(?:bin|lib)\/[A-Za-z0-9._/-]+$/,
  /^package\/(?:data|schemas)\/[A-Za-z0-9._/-]+$/,
  /^package\/skills\/.+$/,
  /^package\/skills_index\.json$/,
  /^package\/node_modules\/(?:ajv|fast-deep-equal|fast-uri|json-schema-traverse|require-from-string|sanitize-filename|truncate-utf8-bytes|utf8-byte-length|yaml)\/[A-Za-z0-9@._+/-]+$/,
];

const FORBIDDEN_NAMES = /(?:^|\/)(?:\.git|verification|coverage|\.env(?:\.(?!example$|sample$|template$)[^/]*)?|[^/]*\.(?:pem|key|p12|pfx|log))(?:\/|$)/i;

export function inspectPackageTarball(tarballPath) {
  const bytes = fs.readFileSync(tarballPath);
  const entries = parseTarGzip(bytes);
  const failures = [];
  const normalized = new Set();
  for (const entry of entries) {
    if (!portablePath(entry.path)) failures.push({ code: "PACKAGE_UNSAFE_PATH", path: entry.path });
    if (!["0", "\0", "5"].includes(entry.type)) failures.push({ code: "PACKAGE_NON_REGULAR_ENTRY", path: entry.path, type: entry.type });
    const collisionKey = entry.path.normalize("NFC").toLowerCase();
    if (normalized.has(collisionKey)) failures.push({ code: "PACKAGE_PATH_COLLISION", path: entry.path });
    normalized.add(collisionKey);
    if (entry.type !== "5" && !ALLOWED_PACKAGE_PATHS.some((pattern) => pattern.test(entry.path))) {
      failures.push({ code: "PACKAGE_PATH_NOT_ALLOWLISTED", path: entry.path });
    }
    if (FORBIDDEN_NAMES.test(entry.path)) failures.push({ code: "PACKAGE_SENSITIVE_OR_CHECKOUT_PATH", path: entry.path });
    if ((entry.mode & 0o7000) !== 0 || (entry.mode & 0o002) !== 0) failures.push({ code: "PACKAGE_UNSAFE_MODE", path: entry.path, mode: entry.mode });
  }
  const packageEntry = entries.find((entry) => entry.path === "package/package.json" && entry.type === "0");
  if (!packageEntry) failures.push({ code: "PACKAGE_JSON_MISSING" });
  let manifest = null;
  if (packageEntry) {
    manifest = JSON.parse(packageEntry.content.toString("utf8"));
    const bins = manifest.bin || {};
    for (const [name, expected] of Object.entries({
      aas: "tools/bin/aas.js",
      "aas-mcp": "tools/bin/aas-mcp.js",
      "agentic-awesome-skills": "tools/bin/install.js",
    })) {
      if (bins[name] !== expected) failures.push({ code: "PACKAGE_BIN_CONTRACT", name, expected, actual: bins[name] });
    }
    for (const target of Object.values(bins)) {
      if (!entries.some((entry) => entry.path === `package/${target}` && entry.type === "0")) failures.push({ code: "PACKAGE_BIN_TARGET_MISSING", target });
    }
  }
  return {
    tarballPath: path.resolve(tarballPath),
    bytes: bytes.length,
    sha256: sha256(bytes),
    sha512: sha512(bytes),
    entries: entries.map(({ content, ...entry }) => entry),
    manifest,
    failures,
  };
}
