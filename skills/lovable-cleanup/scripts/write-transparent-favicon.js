#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  throw new Error(`Refusing favicon write: ${message}`);
}

function existingStat(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

function transparentIco() {
  const bytes = Buffer.alloc(6 + 16 + 40 + 8);
  bytes.writeUInt16LE(1, 2);
  bytes.writeUInt16LE(1, 4);
  bytes.writeUInt8(1, 6);
  bytes.writeUInt8(1, 7);
  bytes.writeUInt16LE(1, 10);
  bytes.writeUInt16LE(32, 12);
  bytes.writeUInt32LE(40 + 8, 14);
  bytes.writeUInt32LE(22, 18);
  bytes.writeUInt32LE(40, 22);
  bytes.writeInt32LE(1, 26);
  bytes.writeInt32LE(2, 30);
  bytes.writeUInt16LE(1, 34);
  bytes.writeUInt16LE(32, 36);
  bytes.writeUInt32LE(0, 38);
  bytes.writeUInt32LE(8, 42);
  return bytes;
}

function main() {
  const requestedRoot = path.resolve(process.argv[2] || process.cwd());
  const projectRoot = fs.realpathSync(requestedRoot);
  const publicDirectory = path.join(projectRoot, "public");
  const publicStat = fs.lstatSync(publicDirectory);
  if (publicStat.isSymbolicLink() || !publicStat.isDirectory()) {
    fail("public/ must be a real directory, not a symlink or special file");
  }
  if (fs.realpathSync(publicDirectory) !== publicDirectory) {
    fail("public/ resolves outside the physical project path");
  }

  const target = path.join(publicDirectory, "favicon.ico");
  const targetStat = existingStat(target);
  if (targetStat && targetStat.isSymbolicLink()) {
    fail("public/favicon.ico is a symbolic link");
  }
  if (targetStat && !targetStat.isFile()) {
    fail("public/favicon.ico is not a regular file");
  }

  const temporary = path.join(
    publicDirectory,
    `.favicon.ico.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`,
  );
  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    (fs.constants.O_NOFOLLOW || 0);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, flags, 0o600);
    fs.writeFileSync(descriptor, transparentIco());
    fs.fsyncSync(descriptor);
    fs.fchmodSync(descriptor, 0o644);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, target);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    const temporaryStat = existingStat(temporary);
    if (temporaryStat && temporaryStat.isFile()) fs.unlinkSync(temporary);
  }
  process.stdout.write(`Wrote ${target}\n`);
}

main();
