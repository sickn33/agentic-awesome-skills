#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ALLOWED_BUNDLE_ROOTS } = require("./constants");
const { assertSafeRelative, discoverBundle, sha256, trackedFiles } = require("./safe-bundle");
const { atomicWriteNew, ensureOutputRoot } = require("./output");
const { validateParityManifest } = require("./parity-benchmark");

const PACKET_KIND = "aas-codex-parity-input-packet";
const SUMMARY_KIND = "aas-codex-parity-input-summary";
const MAX_PACKET_BYTES = 2 * 1024 * 1024;

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function hashObject(value) { return sha256(Buffer.from(canonicalJson(value), "utf8")); }

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) throw new Error(`${label} schema is not closed`);
}

function readManifest(filePath) {
  const absolute = path.resolve(filePath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 5 * 1024 * 1024) throw new Error("Manifest must be a regular non-symlink JSON file under 5 MiB");
  const value = JSON.parse(fs.readFileSync(absolute, "utf8"));
  validateParityManifest(value);
  if (value.manifestVersion !== 2) throw new Error("Parity input packets require the frozen v2 manifest");
  return value;
}

function normalizeMention(candidate) {
  let value = candidate.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.includes("\\")) return null;
  value = value.replace(/^\.\//, "");
  value = value.split(/[?#]/, 1)[0].replace(/[.,;:!?]+$/, "");
  if (!value || value.includes("..")) return null;
  try { assertSafeRelative(value, "mentioned path"); } catch { return null; }
  if (!ALLOWED_BUNDLE_ROOTS.includes(value.split("/")[0]) || !value.includes("/")) return null;
  return value;
}

function mentionedBundlePaths(skillText) {
  const found = new Set();
  // Only explicit relative references rooted in an allowed bundle directory are
  // candidates. This deliberately ignores absolute paths, URLs, and ../ forms.
  const matcher = /(?:^|[\s("'`=])((?:\.\/)?(?:references|scripts|assets)\/[^\s"'`()<>\[\]{}]+)/gm;
  for (const match of skillText.matchAll(matcher)) {
    const normalized = normalizeMention(match[1]);
    if (normalized) found.add(normalized);
  }
  return [...found].sort();
}

function validateInputPacket(packet) {
  exactKeys(packet, ["schemaVersion", "kind", "manifestSelectionSha256", "split", "skillId", "skillPath", "bundleHash", "skillSha256", "skillText", "inventory", "mentionedPaths"], "Input packet");
  if (packet.schemaVersion !== 1 || packet.kind !== PACKET_KIND || ![packet.manifestSelectionSha256, packet.bundleHash, packet.skillSha256].every((value) => /^[0-9a-f]{64}$/.test(value)) || typeof packet.skillText !== "string") throw new Error("Input packet identity invalid");
  assertSafeRelative(packet.skillId, "packet skill id");
  if (packet.skillPath !== `skills/${packet.skillId}/SKILL.md` || !Array.isArray(packet.inventory) || !Array.isArray(packet.mentionedPaths)) throw new Error("Input packet binding invalid");
  let prior = null;
  const inventoryPaths = new Set();
  for (const item of packet.inventory) {
    exactKeys(item, item.encoding === "utf-8" ? ["path", "sha256", "size", "encoding", "text"] : ["path", "sha256", "size", "encoding"], "Inventory item");
    assertSafeRelative(item.path, "inventory path");
    if (!ALLOWED_BUNDLE_ROOTS.includes(item.path.split("/")[0]) || !item.path.includes("/") || !/^[0-9a-f]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.size) || item.size < 0 || !["utf-8", "binary"].includes(item.encoding) || (item.encoding === "utf-8" && typeof item.text !== "string")) throw new Error("Inventory item invalid");
    if (prior !== null && prior.localeCompare(item.path) >= 0) throw new Error("Inventory must be strictly sorted and unique");
    prior = item.path; inventoryPaths.add(item.path);
  }
  prior = null;
  for (const item of packet.mentionedPaths) {
    exactKeys(item, item.present ? ["path", "present", "sha256"] : ["path", "present"], "Mentioned path item");
    assertSafeRelative(item.path, "mentioned path");
    if (typeof item.present !== "boolean" || (item.present && (!inventoryPaths.has(item.path) || !/^[0-9a-f]{64}$/.test(item.sha256))) || (!item.present && inventoryPaths.has(item.path))) throw new Error("Mentioned path binding invalid");
    if (prior !== null && prior.localeCompare(item.path) >= 0) throw new Error("Mentioned paths must be strictly sorted and unique");
    prior = item.path;
  }
  if (Buffer.byteLength(canonicalJson(packet), "utf8") > MAX_PACKET_BYTES) throw new Error(`Input packet exceeds ${MAX_PACKET_BYTES} bytes`);
  return packet;
}

function createPacket({ manifest, split, snapshot, bundle }) {
  if (!manifest || manifest.manifestVersion !== 2 || !/^[0-9a-f]{64}$/.test(manifest.integrity?.selectionSha256 || "")) throw new Error("Invalid v2 manifest binding");
  if (!Object.hasOwn(manifest.splits || {}, split) || !manifest.splits[split].some((item) => item.id === snapshot.id)) throw new Error("Snapshot is not a member of the requested split");
  const primary = bundle.files[0];
  if (bundle.skillId !== snapshot.id || bundle.skillPath !== snapshot.skillPath || bundle.bundleHash !== snapshot.bundleHash || primary.path !== snapshot.skillPath || primary.sha256 !== snapshot.skillSha256 || primary.size !== snapshot.byteCount) throw new Error(`Frozen snapshot hash mismatch: ${snapshot.id}`);
  if (primary.encoding !== "utf-8" || typeof primary.text !== "string") throw new Error(`SKILL.md must be exact UTF-8 text: ${snapshot.id}`);
  const inventory = bundle.files.slice(1).map((file) => {
    const prefix = `skills/${snapshot.id}/`;
    if (!file.path.startsWith(prefix)) throw new Error(`Bundle file is outside skill root: ${file.path}`);
    const relative = file.path.slice(prefix.length);
    assertSafeRelative(relative, "bundle inventory path");
    if (!ALLOWED_BUNDLE_ROOTS.includes(relative.split("/")[0])) throw new Error(`Non-allowed bundle file: ${relative}`);
    const item = { path: relative, sha256: file.sha256, size: file.size, encoding: file.encoding };
    if (file.encoding === "utf-8") item.text = file.text;
    else if (file.encoding !== "binary" || file.text !== null) throw new Error(`Invalid bundle encoding: ${relative}`);
    return item;
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (new Set(inventory.map((item) => item.path)).size !== inventory.length) throw new Error(`Duplicate bundle inventory path: ${snapshot.id}`);
  const byPath = new Map(inventory.map((item) => [item.path, item]));
  const mentionedPaths = mentionedBundlePaths(primary.text).map((mentionedPath) => {
    const item = byPath.get(mentionedPath);
    return item ? { path: mentionedPath, present: true, sha256: item.sha256 } : { path: mentionedPath, present: false };
  });
  return validateInputPacket({
    schemaVersion: 1,
    kind: PACKET_KIND,
    manifestSelectionSha256: manifest.integrity.selectionSha256,
    split,
    skillId: snapshot.id,
    skillPath: snapshot.skillPath,
    bundleHash: snapshot.bundleHash,
    skillSha256: snapshot.skillSha256,
    skillText: primary.text,
    inventory,
    mentionedPaths,
  });
}

function packetRelativePath(skillId) {
  assertSafeRelative(skillId, "skill id");
  return `packets/${skillId}.json`;
}

function generateInputPackets({ repoRoot, manifest, split, resultDir }) {
  validateParityManifest(manifest);
  if (manifest.manifestVersion !== 2) throw new Error("Parity input packets require the frozen v2 manifest");
  if (!Object.hasOwn(manifest.splits, split)) throw new Error(`Unknown parity split: ${split}`);
  const outputRoot = ensureOutputRoot(resultDir, repoRoot);
  const tracked = trackedFiles(repoRoot);
  const packets = [];
  for (const snapshot of manifest.splits[split]) {
    const bundle = discoverBundle(repoRoot, snapshot.id, tracked);
    const packet = createPacket({ manifest, split, snapshot, bundle });
    const relativePath = packetRelativePath(snapshot.id);
    const bytes = Buffer.from(`${canonicalJson(packet)}\n`, "utf8");
    if (bytes.length > MAX_PACKET_BYTES + 1) throw new Error(`Input packet exceeds ${MAX_PACKET_BYTES} bytes: ${snapshot.id}`);
    atomicWriteNew(outputRoot, relativePath, bytes);
    packets.push({ skillId: snapshot.id, bundleHash: snapshot.bundleHash, path: relativePath, sha256: sha256(bytes), size: bytes.length });
  }
  const summaryCore = {
    schemaVersion: 1,
    kind: SUMMARY_KIND,
    manifestSelectionSha256: manifest.integrity.selectionSha256,
    split,
    packetCount: packets.length,
    packets,
  };
  const summary = { ...summaryCore, summarySha256: hashObject(summaryCore) };
  const summaryBytes = Buffer.from(`${canonicalJson(summary)}\n`, "utf8");
  atomicWriteNew(outputRoot, "summary.json", summaryBytes);
  return summary;
}

function parseArgs(argv) {
  const value = (name, fallback = null) => {
    const indexes = argv.flatMap((item, index) => item === name ? [index] : []);
    if (indexes.length > 1) throw new Error(`Duplicate CLI option: ${name}`);
    if (!indexes.length) return fallback;
    const result = argv[indexes[0] + 1];
    if (!result || result.startsWith("--")) throw new Error(`${name} requires a value`);
    return result;
  };
  const allowed = new Set(["--manifest", "--split", "--result-dir", "--repo-root"]);
  for (let index = 0; index < argv.length; index += 2) if (!allowed.has(argv[index]) || argv[index + 1] === undefined) throw new Error(`Unknown or incomplete CLI option: ${argv[index] || "<empty>"}`);
  const manifestPath = value("--manifest"); const split = value("--split"); const resultDir = value("--result-dir");
  if (!manifestPath || !split || !resultDir) throw new Error("Required: --manifest PATH --split validation|final_blind --result-dir PATH");
  return { manifestPath, split, resultDir, repoRoot: path.resolve(value("--repo-root", path.resolve(__dirname, "../.."))) };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const manifest = readManifest(args.manifestPath);
    const summary = generateInputPackets({ repoRoot: args.repoRoot, manifest, split: args.split, resultDir: args.resultDir });
    process.stdout.write(`${canonicalJson(summary)}\n`);
  } catch (error) {
    process.stderr.write(`parity-input-packet: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { MAX_PACKET_BYTES, PACKET_KIND, SUMMARY_KIND, canonicalJson, createPacket, generateInputPackets, mentionedBundlePaths, normalizeMention, packetRelativePath, parseArgs, readManifest, validateInputPacket };
