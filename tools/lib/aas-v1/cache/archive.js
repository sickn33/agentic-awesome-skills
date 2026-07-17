"use strict";

const zlib = require("node:zlib");
const { cacheError } = require("./identity");
const { collisionKey, validateRelativeAssetPath } = require("./scan");

const DEFAULT_ARCHIVE_LIMITS = Object.freeze({
  maxEntries: 10000,
  maxSingleFileBytes: 32 * 1024 * 1024,
  maxExpandedTotalBytes: 160 * 1024 * 1024,
  maxCompressionRatio: 128,
});

function parseOctal(buffer, field) {
  const text = buffer.toString("ascii").replace(/\0.*$/, "").trim();
  if (!/^[0-7]+$/.test(text)) throw cacheError("AAS_ARCHIVE_HEADER_INVALID", `invalid ${field}`);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) throw cacheError("AAS_ARCHIVE_HEADER_INVALID", `unsafe ${field}`);
  return value;
}

function decodeField(buffer) {
  const end = buffer.indexOf(0);
  const bytes = end === -1 ? buffer : buffer.subarray(0, end);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw cacheError("AAS_ARCHIVE_HEADER_INVALID", "archive path is not valid UTF-8");
  }
}

function safeArchivePath(value) {
  if (typeof value !== "string" || value.includes("\\") || value.startsWith("/")
    || /^[A-Za-z]:/.test(value) || value.startsWith("//")) {
    throw cacheError("AAS_ARCHIVE_PATH_INVALID", "archive path is absolute or platform-ambiguous");
  }
  const withoutDirectorySlash = value.replace(/\/$/, "");
  for (const segment of withoutDirectorySlash.split("/")) {
    const deviceBase = segment.split(".")[0].toUpperCase();
    if (!segment || /[\u0000-\u001f<>:"|?*]/u.test(segment) || /[ .]$/.test(segment)
      || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|CONIN\$|CONOUT\$)$/.test(deviceBase)) {
      throw cacheError("AAS_ARCHIVE_PATH_INVALID", "archive path is unsafe on a supported filesystem");
    }
  }
  try {
    return validateRelativeAssetPath(withoutDirectorySlash);
  } catch {
    throw cacheError("AAS_ARCHIVE_PATH_INVALID", "archive path contains traversal or invalid segments");
  }
}

function parsePax(bytes) {
  const values = {};
  let offset = 0;
  while (offset < bytes.length) {
    const space = bytes.indexOf(0x20, offset);
    if (space < 0) throw cacheError("AAS_ARCHIVE_PAX_INVALID", "PAX record length is missing");
    const lengthText = bytes.subarray(offset, space).toString("ascii");
    if (!/^[1-9][0-9]*$/.test(lengthText)) throw cacheError("AAS_ARCHIVE_PAX_INVALID", "PAX record length is invalid");
    const length = Number(lengthText);
    if (!Number.isSafeInteger(length) || length < 5 || offset + length > bytes.length || bytes[offset + length - 1] !== 0x0a) {
      throw cacheError("AAS_ARCHIVE_PAX_INVALID", "PAX record is truncated");
    }
    const record = bytes.subarray(space + 1, offset + length - 1).toString("utf8");
    const equals = record.indexOf("=");
    if (equals < 1) throw cacheError("AAS_ARCHIVE_PAX_INVALID", "PAX record has no key");
    const key = record.slice(0, equals);
    const value = record.slice(equals + 1);
    if (Object.hasOwn(values, key)) throw cacheError("AAS_ARCHIVE_PAX_INVALID", "duplicate PAX key");
    values[key] = value;
    offset += length;
  }
  if (values.linkpath !== undefined) throw cacheError("AAS_ARCHIVE_LINK_FORBIDDEN", "PAX linkpath is forbidden");
  return values;
}

function assertArchiveMode(mode) {
  if ((mode & 0o7000) !== 0 || (mode & 0o022) !== 0) {
    throw cacheError("AAS_ARCHIVE_MODE_UNSAFE", "archive entry has anomalous permissions");
  }
}

function parseTar(tarBytes, options = {}) {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...(options.limits || {}) };
  const selected = options.selectPaths ? new Set(options.selectPaths.map(safeArchivePath)) : null;
  const entries = [];
  const seen = new Map();
  const collisionKeys = new Map();
  let offset = 0;
  let fileCount = 0;
  let expandedBytes = 0;
  let pendingPath = null;
  let zeroBlocks = 0;
  while (offset + 512 <= tarBytes.length) {
    const header = tarBytes.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1;
      if (zeroBlocks === 2) break;
      continue;
    }
    zeroBlocks = 0;
    const expectedChecksum = parseOctal(header.subarray(148, 156), "checksum");
    let checksum = 0;
    for (let index = 0; index < 512; index += 1) checksum += index >= 148 && index < 156 ? 0x20 : header[index];
    if (checksum !== expectedChecksum) throw cacheError("AAS_ARCHIVE_CHECKSUM_INVALID", "archive header checksum mismatch");
    const size = parseOctal(header.subarray(124, 136), "size");
    const mode = parseOctal(header.subarray(100, 108), "mode");
    assertArchiveMode(mode);
    const type = String.fromCharCode(header[156] || 0);
    const name = decodeField(header.subarray(0, 100));
    const prefix = decodeField(header.subarray(345, 500));
    let archivePath = pendingPath || (prefix ? `${prefix}/${name}` : name);
    pendingPath = null;
    const paddedSize = Math.ceil(size / 512) * 512;
    if (offset + paddedSize > tarBytes.length) throw cacheError("AAS_ARCHIVE_TRUNCATED", "archive entry is truncated");
    const body = tarBytes.subarray(offset, offset + size);
    offset += paddedSize;
    if (type === "x" || type === "g") {
      if (size > 64 * 1024) throw cacheError("AAS_ARCHIVE_PAX_INVALID", "PAX metadata is too large");
      const pax = parsePax(body);
      if (pax.path !== undefined) pendingPath = pax.path;
      continue;
    }
    if (type === "L") {
      if (size > 4096) throw cacheError("AAS_ARCHIVE_PATH_INVALID", "GNU long path is too large");
      pendingPath = decodeField(body).replace(/\0$/, "");
      continue;
    }
    archivePath = safeArchivePath(archivePath);
    const directory = type === "5";
    const regular = type === "0" || type === "\0";
    if (!directory && !regular) throw cacheError("AAS_ARCHIVE_SPECIAL_FILE_FORBIDDEN", "archive links and special entries are forbidden");
    if (directory && size !== 0) throw cacheError("AAS_ARCHIVE_HEADER_INVALID", "directory entry has data");
    fileCount += regular ? 1 : 0;
    expandedBytes += regular ? size : 0;
    if (fileCount > limits.maxEntries) throw cacheError("AAS_ARCHIVE_ENTRY_LIMIT", "archive exceeds the file-count limit");
    if (regular && size > limits.maxSingleFileBytes) throw cacheError("AAS_ARCHIVE_FILE_LIMIT", "archive file exceeds the size limit");
    if (expandedBytes > limits.maxExpandedTotalBytes) throw cacheError("AAS_ARCHIVE_TOTAL_LIMIT", "archive exceeds the expanded-byte limit");
    const kind = directory ? "directory" : "file";
    if (seen.has(archivePath)) throw cacheError("AAS_ARCHIVE_DUPLICATE_PATH", "archive contains a duplicate path");
    const key = collisionKey(archivePath);
    if (collisionKeys.has(key)) throw cacheError("AAS_ARCHIVE_PATH_COLLISION", "archive paths collide by case or Unicode normalization");
    for (const [existingPath, existingKind] of seen) {
      if ((archivePath.startsWith(`${existingPath}/`) && existingKind === "file")
        || (existingPath.startsWith(`${archivePath}/`) && kind === "file")) {
        throw cacheError("AAS_ARCHIVE_FILE_DIRECTORY_COLLISION", "archive file and directory paths collide");
      }
    }
    seen.set(archivePath, kind);
    collisionKeys.set(key, archivePath);
    if (regular && (!selected || selected.has(archivePath))) entries.push({ path: archivePath, mode, bytes: Buffer.from(body) });
  }
  if (zeroBlocks < 2) throw cacheError("AAS_ARCHIVE_TRUNCATED", "archive end markers are missing");
  if (pendingPath !== null) throw cacheError("AAS_ARCHIVE_TRUNCATED", "archive ended after path metadata");
  if (selected) {
    const found = new Set(entries.map((entry) => entry.path));
    const missing = [...selected].filter((entry) => !found.has(entry));
    if (missing.length) throw cacheError("AAS_ARCHIVE_ASSET_MISSING", `archive asset is missing: ${missing[0]}`);
  }
  return { entries, fileCount, expandedBytes };
}

function parsePackageArchive(archiveBytes, options = {}) {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...(options.limits || {}) };
  const gzip = archiveBytes[0] === 0x1f && archiveBytes[1] === 0x8b;
  let tarBytes = archiveBytes;
  if (gzip) {
    try {
      tarBytes = zlib.gunzipSync(archiveBytes, { maxOutputLength: limits.maxExpandedTotalBytes + 1024 * 1024 });
    } catch (cause) {
      throw cacheError("AAS_ARCHIVE_DECOMPRESSION_FAILED", "archive decompression failed", cause);
    }
    if (tarBytes.length > archiveBytes.length * limits.maxCompressionRatio) {
      throw cacheError("AAS_ARCHIVE_COMPRESSION_RATIO", "archive exceeds the compression-ratio limit");
    }
  }
  return parseTar(tarBytes, { ...options, limits });
}

module.exports = { DEFAULT_ARCHIVE_LIMITS, parsePackageArchive, parsePax, parseTar, safeArchivePath };
