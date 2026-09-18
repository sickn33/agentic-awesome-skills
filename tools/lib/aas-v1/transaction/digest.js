"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { canonicalJson, sha256 } = require("../canonical-json");
const { transactionError } = require("./errors");

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

function fileDigest(filePath) {
  const hash = crypto.createHash("sha256");
  const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile()) throw transactionError("AAS_TRANSACTION_FILE_UNSAFE", "filesystem", {});
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytes === 0) break;
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return `sha256-${hash.digest("hex")}`;
}

function treeManifest(root) {
  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw transactionError("AAS_TRANSACTION_TREE_UNSAFE", "filesystem", { reason: "rootNotDirectory" });
  }
  const entries = [];
  const collisionKeys = new Set();

  function visit(directory, relativeDirectory) {
    const names = fs.readdirSync(directory).sort(compareStrings);
    for (const name of names) {
      const relative = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const normalized = relative.normalize("NFC").toLowerCase();
      if (collisionKeys.has(normalized)) {
        throw transactionError("AAS_TRANSACTION_TREE_COLLISION", "filesystem", { logicalPath: relative });
      }
      collisionKeys.add(normalized);
      const absolute = path.join(directory, name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw transactionError("AAS_TRANSACTION_TREE_SYMLINK", "filesystem", { logicalPath: relative });
      }
      if (stat.isDirectory()) {
        entries.push({ path: relative, type: "directory" });
        visit(absolute, relative);
      } else if (stat.isFile() && stat.nlink === 1) {
        entries.push({ path: relative, type: "file", size: stat.size, digest: fileDigest(absolute) });
      } else {
        throw transactionError("AAS_TRANSACTION_TREE_UNSAFE", "filesystem", { logicalPath: relative });
      }
    }
  }

  visit(root, "");
  return { schemaVersion: 1, entries };
}

function treeDigest(root) {
  return sha256(canonicalJson(treeManifest(root)));
}

module.exports = { fileDigest, treeDigest, treeManifest };
