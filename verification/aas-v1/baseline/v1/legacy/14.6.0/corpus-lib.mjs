import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const EXPECTED_SRI = "sha512-VTOb3O9PSYKCDO99i3h0vOn7vHQlGtO/+jSErR80g6OGaDJoBzg3q2GE9Nu890en1/Z54hBEYiVQj/1Rl95xEg==";
export const EXPECTED_SHASUM = "3a58a1346cbc7d0b39500cf6f9ee687184533036";
export const PACKAGE_NAME = "agentic-awesome-skills";
export const PACKAGE_VERSION = "14.6.0";

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function sha256(bytes) {
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function sri512(bytes) {
  return `sha512-${crypto.createHash("sha512").update(bytes).digest("base64")}`;
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, canonicalJson(value), "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { force: true });
  }
}

function normalizedFileBytes(relative, bytes) {
  if (path.basename(relative) !== ".antigravity-install-manifest.json") return bytes;
  try {
    const text = bytes.toString("utf8");
    const parsed = JSON.parse(text);
    if (typeof parsed.updatedAt !== "string") return bytes;
    const pattern = /(\"updatedAt\"\s*:\s*\")[^\"]*(\")/g;
    const matches = [...text.matchAll(pattern)];
    if (matches.length !== 1) throw new Error("expected exactly one updatedAt field");
    return Buffer.from(text.replace(pattern, "$1<TIMESTAMP>$2"));
  } catch {
    return bytes;
  }
}

export function treeEntries(root, { prefix = "", exclude = new Set() } = {}) {
  if (!fs.existsSync(root)) return [];
  const entries = [];
  const visit = (absolute, relative) => {
    const normalized = relative.split(path.sep).join("/");
    if (exclude.has(normalized)) return;
    const stat = fs.lstatSync(absolute);
    const reportPath = prefix ? `${prefix}/${normalized}`.replace(/\/$/, "") : normalized;
    if (stat.isSymbolicLink()) {
      entries.push({ path: reportPath, type: "symlink", target: fs.readlinkSync(absolute).split(path.sep).join("/") });
      return;
    }
    if (stat.isDirectory()) {
      if (relative) entries.push({ path: reportPath, type: "directory" });
      for (const name of fs.readdirSync(absolute).sort()) visit(path.join(absolute, name), path.join(relative, name));
      return;
    }
    if (stat.isFile()) {
      const bytes = normalizedFileBytes(normalized, fs.readFileSync(absolute));
      entries.push({ path: reportPath, type: "file", size: bytes.length, sha256: sha256(bytes), hardlinkCount: stat.nlink });
      return;
    }
    entries.push({ path: reportPath, type: "other" });
  };
  visit(root, "");
  return entries;
}

export function treeDigest(entries) {
  return sha256(Buffer.from(JSON.stringify(canonicalize(entries))));
}

export function normalizeText(text, replacements) {
  let normalized = String(text).replace(/\r\n?/g, "\n");
  for (const [absolute, token] of replacements.sort((a, b) => b[0].length - a[0].length)) {
    const alternatives = new Set([absolute, absolute.split(path.sep).join("/"), absolute.split(path.sep).join("\\")]);
    for (const candidate of alternatives) normalized = normalized.split(candidate).join(token);
  }
  return normalized;
}

export function parseTrace(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export function runtimeReceipt(runtimeRoot) {
  const lock = JSON.parse(fs.readFileSync(path.join(runtimeRoot, "package-lock.json"), "utf8"));
  const closure = Object.entries(lock.packages || {})
    .filter(([packagePath]) => packagePath.startsWith("node_modules/"))
    .map(([packagePath, metadata]) => ({
      path: packagePath,
      version: metadata.version,
      resolved: metadata.resolved,
      integrity: metadata.integrity,
      dependencies: metadata.dependencies || {},
    }));
  const runtimeEntries = treeEntries(path.join(runtimeRoot, "node_modules"), { exclude: new Set([".bin"]) });
  const entrypoint = path.join(runtimeRoot, "node_modules", PACKAGE_NAME, "tools", "bin", "install.js");
  return {
    schemaVersion: 1,
    closure,
    closureDigest: sha256(Buffer.from(JSON.stringify(canonicalize(closure)))),
    runtimeTreeDigest: treeDigest(runtimeEntries),
    entrypointSha256: sha256(fs.readFileSync(entrypoint)),
  };
}
