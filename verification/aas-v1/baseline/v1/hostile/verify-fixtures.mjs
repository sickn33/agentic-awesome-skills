#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { buildCorpus, fixtureContract } from "./generate-fixtures.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const generated = buildCorpus();
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readString = (buffer, offset, length) => buffer.subarray(offset, offset + length).toString("utf8").replace(/\0.*$/s, "");
const readOctal = (buffer, offset, length) => Number.parseInt(readString(buffer, offset, length).trim() || "0", 8);

function parseTar(input, compressed) {
  const buffer = compressed ? zlib.gunzipSync(input) : input;
  assert(buffer.length % 512 === 0, "tar byte length is not block aligned");
  const entries = [];
  let offset = 0;
  let zeroBlocks = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1;
      if (zeroBlocks === 2) break;
      continue;
    }
    zeroBlocks = 0;
    const storedChecksum = readOctal(header, 148, 8);
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const actualChecksum = [...checksumHeader].reduce((sum, byte) => sum + byte, 0);
    assert(storedChecksum === actualChecksum, `tar checksum mismatch at block ${offset / 512 - 1}`);
    const size = readOctal(header, 124, 12);
    assert(offset + size <= buffer.length, "tar entry extends beyond archive");
    entries.push({
      name: readString(header, 0, 100),
      mode: readOctal(header, 100, 8),
      size,
      type: readString(header, 156, 1) || "0",
      linkName: readString(header, 157, 100),
    });
    offset += size + ((512 - (size % 512)) % 512);
  }
  assert(zeroBlocks === 2, "tar archive lacks two terminal zero blocks");
  assert(entries.length > 0, "tar archive is empty");
  return entries;
}

function hasDuplicate(values) {
  return new Set(values).size !== values.length;
}

function hasFileDirectoryCollision(names) {
  return names.some((name) => names.some((other) => other !== name && other.startsWith(`${name.replace(/\/$/, "")}/`) && !name.endsWith("/")));
}

function expandedSize(entries) {
  return entries.filter((entry) => entry.type === "0").reduce((sum, entry) => sum + entry.size, 0);
}

function assertArchiveSemantics(classId, exploitBytes, controlBytes, extension) {
  const compressed = extension === "tar.gz";
  const exploit = parseTar(exploitBytes, compressed);
  const control = parseTar(controlBytes, compressed);
  const exploitNames = exploit.map((entry) => entry.name);
  const controlNames = control.map((entry) => entry.name);
  const max = fixtureContract.archive;
  switch (classId) {
    case "relative-path-traversal":
      assert(exploitNames.some((name) => name.split("/").includes("..")), `${classId}: exploit lacks traversal`);
      assert(controlNames.every((name) => !name.split("/").includes("..")), `${classId}: control traverses`);
      break;
    case "absolute-posix-path":
      assert(exploitNames.some((name) => name.startsWith("/")), `${classId}: exploit is not absolute`);
      assert(controlNames.every((name) => !name.startsWith("/")), `${classId}: control is absolute`);
      break;
    case "absolute-windows-drive-path":
      assert(exploitNames.some((name) => /^[A-Za-z]:[\\/]/.test(name)), `${classId}: exploit lacks drive path`);
      assert(controlNames.every((name) => !/^[A-Za-z]:[\\/]/.test(name)), `${classId}: control has drive path`);
      break;
    case "absolute-unc-path":
      assert(exploitNames.some((name) => /^(?:\\\\|\/\/)/.test(name)), `${classId}: exploit lacks UNC path`);
      assert(controlNames.every((name) => !/^(?:\\\\|\/\/)/.test(name)), `${classId}: control has UNC path`);
      break;
    case "symlink-entry":
      assert(exploit.some((entry) => entry.type === "2"), `${classId}: exploit lacks symlink`);
      assert(control.every((entry) => entry.type === "0"), `${classId}: control is not regular-only`);
      break;
    case "hardlink-entry":
      assert(exploit.some((entry) => entry.type === "1"), `${classId}: exploit lacks hardlink`);
      assert(control.every((entry) => entry.type === "0"), `${classId}: control is not regular-only`);
      break;
    case "device-entry":
      assert(exploit.some((entry) => ["3", "4"].includes(entry.type)), `${classId}: exploit lacks device`);
      assert(control.every((entry) => entry.type === "0"), `${classId}: control is not regular-only`);
      break;
    case "fifo-entry":
      assert(exploit.some((entry) => entry.type === "6"), `${classId}: exploit lacks FIFO`);
      assert(control.every((entry) => entry.type === "0"), `${classId}: control is not regular-only`);
      break;
    case "duplicate-file-entry":
      assert(hasDuplicate(exploitNames), `${classId}: exploit lacks duplicate`);
      assert(!hasDuplicate(controlNames), `${classId}: control has duplicate`);
      break;
    case "file-directory-collision":
      assert(hasFileDirectoryCollision(exploitNames), `${classId}: exploit lacks collision`);
      assert(!hasFileDirectoryCollision(controlNames), `${classId}: control has collision`);
      break;
    case "case-insensitive-collision":
      assert(hasDuplicate(exploitNames.map((name) => name.toLowerCase())), `${classId}: exploit lacks case collision`);
      assert(!hasDuplicate(controlNames.map((name) => name.toLowerCase())), `${classId}: control has case collision`);
      break;
    case "unicode-normalization-collision":
      assert(hasDuplicate(exploitNames.map((name) => name.normalize("NFC"))), `${classId}: exploit lacks Unicode collision`);
      assert(!hasDuplicate(controlNames.map((name) => name.normalize("NFC"))), `${classId}: control has Unicode collision`);
      break;
    case "anomalous-permissions":
      assert(exploit.some((entry) => (entry.mode & 0o7000) !== 0), `${classId}: exploit lacks special mode bits`);
      assert(control.every((entry) => (entry.mode & 0o7000) === 0), `${classId}: control has special mode bits`);
      break;
    case "file-count-limit":
      assert(exploit.length === max.maxEntries + 1, `${classId}: exploit count mismatch`);
      assert(control.length === max.maxEntries, `${classId}: control count mismatch`);
      break;
    case "single-file-size-limit":
      assert(Math.max(...exploit.map((entry) => entry.size)) === max.maxSingleFileBytes + 1, `${classId}: exploit size mismatch`);
      assert(Math.max(...control.map((entry) => entry.size)) === max.maxSingleFileBytes, `${classId}: control size mismatch`);
      break;
    case "expanded-total-size-limit":
      assert(expandedSize(exploit) === max.maxExpandedTotalBytes + 1, `${classId}: exploit total mismatch`);
      assert(expandedSize(control) === max.maxExpandedTotalBytes, `${classId}: control total mismatch`);
      break;
    case "decompression-ratio-bomb": {
      const exploitRatio = expandedSize(exploit) / exploitBytes.length;
      const controlRatio = expandedSize(control) / controlBytes.length;
      assert(exploitRatio > max.maxCompressionRatio, `${classId}: exploit ratio ${exploitRatio} is not excessive`);
      assert(controlRatio <= max.maxCompressionRatio, `${classId}: control ratio ${controlRatio} is excessive`);
      break;
    }
    default:
      assert(false, `unknown archive class: ${classId}`);
  }
}

function strictUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parseJson(bytes) {
  const text = strictUtf8(bytes);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonDepth(value) {
  if (value === null || typeof value !== "object") return 0;
  const children = Array.isArray(value) ? value : Object.values(value);
  return 1 + (children.length ? Math.max(...children.map(jsonDepth)) : 0);
}

function assertInputSemantics(classId, exploit, control) {
  const exploitJson = parseJson(exploit);
  const controlJson = parseJson(control);
  const max = fixtureContract.input;
  switch (classId) {
    case "malformed-mcp-framing":
      assert(exploit.toString("ascii").startsWith("Content-Length:"), `${classId}: exploit framing mismatch`);
      assert(controlJson !== null, `${classId}: control is not JSONL`);
      break;
    case "malformed-json":
      assert(exploitJson === null && controlJson !== null, `${classId}: malformed/valid pair mismatch`);
      break;
    case "duplicate-json-key":
      assert((strictUtf8(exploit).match(/\"id\"/g) || []).length === 2, `${classId}: exploit lacks duplicate id`);
      assert((strictUtf8(control).match(/\"id\"/g) || []).length === 1, `${classId}: control duplicate mismatch`);
      break;
    case "invalid-utf8":
      assert(strictUtf8(exploit) === null && strictUtf8(control) !== null, `${classId}: UTF-8 pair mismatch`);
      break;
    case "request-byte-limit":
      assert(exploit.length === max.maxRequestBytes + 1 && control.length === max.maxRequestBytes, `${classId}: byte limits mismatch`);
      break;
    case "json-depth-limit":
      assert(jsonDepth(exploitJson) === max.maxJsonDepth + 1 && jsonDepth(controlJson) === max.maxJsonDepth, `${classId}: depth limits mismatch`);
      break;
    case "query-length-limit":
      assert([...exploitJson.params.arguments.query].length === max.maxQueryCodePoints + 1, `${classId}: exploit query length mismatch`);
      assert([...controlJson.params.arguments.query].length === max.maxQueryCodePoints, `${classId}: control query length mismatch`);
      break;
    case "result-count-limit":
      assert(exploitJson.params.arguments.limit === max.maxResultCount + 1, `${classId}: exploit result count mismatch`);
      assert(controlJson.params.arguments.limit === max.maxResultCount, `${classId}: control result count mismatch`);
      break;
    case "version-incompatibility":
      assert(!max.supportedMcpProtocolVersions.includes(exploitJson.params.protocolVersion), `${classId}: exploit version is supported`);
      assert(max.supportedMcpProtocolVersions.includes(controlJson.params.protocolVersion), `${classId}: control version is unsupported`);
      break;
    case "invalid-resource-uri":
      assert(/%2e/i.test(exploitJson.params.uri), `${classId}: exploit URI lacks encoded traversal`);
      assert(/^aas:\/\/skills\/[a-z0-9-]+$/.test(controlJson.params.uri), `${classId}: control URI is invalid`);
      break;
    case "forbidden-profile-field":
      assert("rawFiles" in exploitJson.params.arguments.profile, `${classId}: exploit lacks forbidden field`);
      assert(!("rawFiles" in controlJson.params.arguments.profile), `${classId}: control has forbidden field`);
      break;
    case "absolute-profile-path":
      assert(path.posix.isAbsolute(exploitJson.params.arguments.profile.projectPaths[0]), `${classId}: exploit path is relative`);
      assert(!path.posix.isAbsolute(controlJson.params.arguments.profile.projectPaths[0]), `${classId}: control path is absolute`);
      break;
    case "secret-canary":
      assert(strictUtf8(exploit).includes("AAS_CANARY_DO_NOT_LOG_"), `${classId}: exploit lacks canary`);
      assert(!strictUtf8(control).includes("AAS_CANARY_DO_NOT_LOG_"), `${classId}: control contains canary`);
      break;
    case "prompt-injection-content":
      assert(/ignore previous instructions/i.test(exploitJson.params.arguments.profile.request), `${classId}: exploit lacks injection phrase`);
      assert(!/ignore previous instructions/i.test(controlJson.params.arguments.profile.request), `${classId}: control contains injection phrase`);
      break;
    case "timeout-resource-exhaustion":
      assert(exploitJson.params.arguments.query === "^(a+)+$", `${classId}: exploit is not the bounded ReDoS canary`);
      assert(controlJson.params.arguments.query === "react testing", `${classId}: control mismatch`);
      break;
    default:
      assert(false, `unknown input class: ${classId}`);
  }
}

function walkFiles(directory) {
  const results = [];
  for (const name of fs.readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    const stat = fs.lstatSync(absolute);
    assert(stat.isDirectory() || stat.isFile(), `special filesystem entry present: ${path.relative(root, absolute)}`);
    if (stat.isDirectory()) results.push(...walkFiles(absolute));
    else results.push(absolute);
  }
  return results;
}

assert(manifest.schemaVersion === 1, "manifest schemaVersion is not 1");
assert(manifest.corpusVersion === "1.0.0", "manifest corpusVersion is not 1.0.0");
assert(manifest.status === "frozen", "manifest is not frozen");
assert(JSON.stringify(manifest.fixtureContract) === JSON.stringify(fixtureContract), "fixture contract differs from generator");
assert(manifest.classes.length === 32, `expected 32 classes, found ${manifest.classes.length}`);
assert(new Set(manifest.classes.map((entry) => entry.classId)).size === 32, "class IDs are not unique");
assert(manifest.classes.filter((entry) => entry.surface === "archive").length === 17, "archive class count is not 17");
assert(manifest.classes.filter((entry) => entry.surface === "input").length === 15, "input class count is not 15");

const referenced = new Set();
for (const entry of manifest.classes) {
  const expected = generated.get(entry.classId);
  assert(expected !== undefined, `generator lacks class ${entry.classId}`);
  assert(entry.status === "frozen", `${entry.classId}: class is not frozen`);
  assert(entry.exploit.expected === "reject", `${entry.classId}: exploit expectation changed`);
  assert(entry.boundaryControl.expected === "accept", `${entry.classId}: control expectation changed`);
  if (!expected) continue;
  const pairs = [["exploit", expected.exploit], ["boundaryControl", expected.boundaryControl]];
  for (const [kind, expectedBytes] of pairs) {
    const fixture = entry[kind];
    assert(typeof fixture.path === "string" && fixture.path.length > 0, `${entry.classId}/${kind}: path missing`);
    if (typeof fixture.path !== "string") continue;
    assert(!path.isAbsolute(fixture.path) && !fixture.path.split(/[\\/]/).includes(".."), `${entry.classId}/${kind}: unsafe relative path`);
    const absolute = path.resolve(root, fixture.path);
    assert(absolute.startsWith(`${root}${path.sep}`), `${entry.classId}/${kind}: fixture escapes corpus`);
    assert(fs.existsSync(absolute) && fs.lstatSync(absolute).isFile(), `${entry.classId}/${kind}: fixture is not a regular file`);
    if (!fs.existsSync(absolute)) continue;
    const actualBytes = fs.readFileSync(absolute);
    assert(actualBytes.equals(expectedBytes), `${entry.classId}/${kind}: bytes are not deterministic`);
    assert(digest(actualBytes) === fixture.sha256, `${entry.classId}/${kind}: SHA-256 mismatch`);
    referenced.add(absolute);
  }
  const exploitBytes = fs.readFileSync(path.resolve(root, entry.exploit.path));
  const controlBytes = fs.readFileSync(path.resolve(root, entry.boundaryControl.path));
  if (entry.surface === "archive") assertArchiveSemantics(entry.classId, exploitBytes, controlBytes, expected.extension);
  else assertInputSemantics(entry.classId, exploitBytes, controlBytes);
}

const allFiles = walkFiles(root);
const fixtureFiles = allFiles.filter((absolute) => absolute.includes(`${path.sep}fixtures${path.sep}`));
assert(fixtureFiles.length === 64, `expected 64 fixture files, found ${fixtureFiles.length}`);
assert(referenced.size === 64, `expected 64 referenced fixtures, found ${referenced.size}`);
for (const absolute of fixtureFiles) assert(referenced.has(absolute), `orphan fixture: ${path.relative(root, absolute)}`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  corpusVersion: manifest.corpusVersion,
  classes: manifest.classes.length,
  archiveClasses: 17,
  inputClasses: 15,
  fixtureFiles: fixtureFiles.length,
  sha256Verified: referenced.size,
  filesystemSpecialEntries: 0,
  archivesExtracted: 0,
}, null, 2));
