"use strict";

const fs = require("fs");
const path = require("path");

function readBoundedRegular(filePath, maxBytes, label = "Input") {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0);
  const fd = fs.openSync(filePath, flags);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile()) throw new Error(`${label} must be a regular file`);
    if (before.size > maxBytes) throw new Error(`${label} exceeds byte limit`);
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== bytes.length || after.mtimeMs !== before.mtimeMs) throw new Error(`${label} changed while reading`);
    return bytes;
  } finally { fs.closeSync(fd); }
}

function artifactName(skillId) {
  if (typeof skillId !== "string" || !skillId) throw new Error("Artifact skill id is invalid");
  return Buffer.from(skillId, "utf8").toString("base64url");
}

function safeTempRoot() {
  const candidate = process.platform === "darwin" ? "/private/tmp" : "/tmp";
  const stat = fs.lstatSync(candidate);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Trusted temporary root is unavailable");
  if (stat.uid !== 0 || (stat.mode & 0o1000) === 0 || (stat.mode & 0o002) === 0) throw new Error("Trusted temporary root lacks root-owned sticky policy");
  const real = fs.realpathSync(candidate);
  if (real !== path.resolve(candidate)) throw new Error("Trusted temporary root is not physical");
  return real;
}

module.exports = { artifactName, readBoundedRegular, safeTempRoot };
