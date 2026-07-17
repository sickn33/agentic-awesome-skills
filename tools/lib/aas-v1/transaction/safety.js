"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { transactionError } = require("./errors");
const { fsyncDirectory } = require("./state");

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function assertRegularDirectory(directory, code = "AAS_TRANSACTION_DIRECTORY_UNSAFE") {
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw transactionError(code, "filesystem", {});
  }
  return stat;
}

function assertOwned(stat, code = "AAS_TRANSACTION_OWNERSHIP_UNSAFE") {
  if (typeof process.getuid === "function" && typeof stat.uid === "number" && stat.uid !== process.getuid()) {
    throw transactionError(code, "filesystem", {});
  }
}

function assertNoSymlinkChain(root, candidate) {
  if (!isContained(root, candidate)) {
    throw transactionError("AAS_TRANSACTION_PATH_OUTSIDE_TARGET", "filesystem", {});
  }
  const relative = path.relative(root, candidate);
  let cursor = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) break;
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      throw transactionError("AAS_TRANSACTION_SYMLINK_PATH", "filesystem", {});
    }
  }
}

function inspectLayout(adapter, target) {
  if (!adapter || typeof adapter.resolveTransactionLayout !== "function") {
    throw transactionError("AAS_TRANSACTION_ADAPTER_INVALID", "invalidInput", {});
  }
  const layout = adapter.resolveTransactionLayout(target);
  const keys = ["root", "skillsDirectory", "stateFile", "transactionDirectory"];
  if (!layout || keys.some((key) => typeof layout[key] !== "string" || !path.isAbsolute(layout[key]))) {
    throw transactionError("AAS_TRANSACTION_LAYOUT_INVALID", "invalidInput", {});
  }
  const lexicalRoot = path.resolve(layout.root);
  const root = fs.realpathSync(layout.root);
  const resolved = Object.fromEntries(keys.map((key) => [
    key,
    key === "root" ? root : path.resolve(root, path.relative(lexicalRoot, path.resolve(layout[key]))),
  ]));
  const rootStat = assertRegularDirectory(root);
  assertOwned(rootStat);
  for (const key of ["skillsDirectory", "stateFile", "transactionDirectory"]) {
    if (!isContained(root, resolved[key])) {
      throw transactionError("AAS_TRANSACTION_PATH_OUTSIDE_TARGET", "filesystem", { logicalId: key });
    }
    assertNoSymlinkChain(root, resolved[key]);
  }
  const requiredDirectories = [...new Set([
    ...directoryClosure(root, resolved.skillsDirectory),
    ...directoryClosure(root, resolved.transactionDirectory),
  ])].sort((left, right) => left.split(path.sep).length - right.split(path.sep).length || (left < right ? -1 : 1));
  const missingDirectories = [];
  for (const directory of requiredDirectories) {
    if (!fs.existsSync(directory)) {
      missingDirectories.push(directory);
      continue;
    }
    const stat = assertRegularDirectory(directory);
    assertOwned(stat);
    if (stat.dev !== rootStat.dev) throw transactionError("AAS_TRANSACTION_CROSS_FILESYSTEM", "filesystem", {});
  }
  if (fs.existsSync(resolved.stateFile)) {
    const stateStat = fs.lstatSync(resolved.stateFile);
    if (stateStat.isSymbolicLink() || !stateStat.isFile() || stateStat.nlink !== 1 || stateStat.dev !== rootStat.dev) {
      throw transactionError("AAS_TRANSACTION_STATE_UNSAFE", "filesystem", {});
    }
    assertOwned(stateStat);
  }
  return Object.freeze({
    ...resolved,
    device: rootStat.dev,
    layoutDirectories: Object.freeze(requiredDirectories),
    missingDirectories: Object.freeze(missingDirectories),
  });
}

function directoryClosure(root, leaf) {
  const directories = [];
  let cursor = leaf;
  while (cursor !== root) {
    if (!isContained(root, cursor)) throw transactionError("AAS_TRANSACTION_PATH_OUTSIDE_TARGET", "filesystem", {});
    directories.push(cursor);
    const parent = path.dirname(cursor);
    if (parent === cursor) throw transactionError("AAS_TRANSACTION_PATH_OUTSIDE_TARGET", "filesystem", {});
    cursor = parent;
  }
  return directories.reverse();
}

function resolveLayout(adapter, target) {
  const inspected = inspectLayout(adapter, target);
  if (inspected.missingDirectories.length) {
    throw transactionError("AAS_TRANSACTION_LAYOUT_MISSING", "filesystem", {
      logicalIds: inspected.missingDirectories.map((directory) => path.relative(inspected.root, directory).split(path.sep).join("/")),
    });
  }
  return inspected;
}

function ownershipMarker(options) {
  if (!options || typeof options.markerName !== "string" || !/^\.aas-layout-recovery-[a-f0-9]{32,64}$/.test(options.markerName)
    || typeof options.markerToken !== "string" || !/^[a-f0-9]{48}$/.test(options.markerToken)) {
    throw transactionError("AAS_TRANSACTION_LAYOUT_OWNERSHIP_INVALID", "integrity", {});
  }
  return { markerName: options.markerName, markerToken: options.markerToken };
}

function writeMarker(directory, markerName, markerToken) {
  const marker = path.join(directory, markerName);
  const descriptor = fs.openSync(marker, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0), 0o600);
  try {
    fs.writeFileSync(descriptor, `${markerToken}\n`);
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  fsyncDirectory(directory);
}

function markerOwned(directory, markerName, markerToken) {
  const marker = path.join(directory, markerName);
  if (!fs.existsSync(marker)) return false;
  const stat = fs.lstatSync(marker);
  return !stat.isSymbolicLink() && stat.isFile() && stat.nlink === 1 && fs.readFileSync(marker, "utf8") === `${markerToken}\n`;
}

function materializeLayout(inspected, options) {
  const { markerName, markerToken } = ownershipMarker(options);
  const created = Array.isArray(options.createdDirectories) ? options.createdDirectories : [];
  try {
    for (const directory of inspected.missingDirectories) {
      const parent = path.dirname(directory);
      const parentStat = assertRegularDirectory(parent);
      assertOwned(parentStat);
      if (parentStat.dev !== inspected.device) throw transactionError("AAS_TRANSACTION_CROSS_FILESYSTEM", "filesystem", {});
      assertNoSymlinkChain(inspected.root, directory);
      const stage = path.join(parent, `.aas-layout-stage-${markerToken}-${path.basename(directory)}`);
      try {
        fs.mkdirSync(stage, { mode: 0o700 });
        writeMarker(stage, markerName, markerToken);
        if (fs.existsSync(directory)) throw transactionError("AAS_TRANSACTION_LAYOUT_CREATE_RACE", "conflict", {});
        fs.renameSync(stage, directory);
        // Publish ownership to the caller before the directory durability
        // barrier. If that barrier fails, cleanup/recovery still knows the
        // exact marker-bound directory that became visible.
        created.push(directory);
        if (typeof options.onBoundary === "function") {
          options.onBoundary("layoutDirectoryPublished", {
            logicalId: path.relative(inspected.root, directory).split(path.sep).join("/"),
          });
        }
        fsyncDirectory(parent);
      } catch (cause) {
        try { fs.rmSync(stage, { recursive: true, force: true }); } catch {}
        throw transactionError("AAS_TRANSACTION_LAYOUT_CREATE_FAILED", "filesystem", {}, cause);
      }
      const stat = assertRegularDirectory(directory);
      assertOwned(stat);
      if (stat.dev !== inspected.device) throw transactionError("AAS_TRANSACTION_CROSS_FILESYSTEM", "filesystem", {});
      fsyncDirectory(parent);
    }
    return created;
  } catch (error) {
    cleanupMaterializedLayout(inspected, created, { markerName, markerToken });
    throw error;
  }
}

function cleanupMaterializedLayout(inspected, directories, options) {
  const { markerName, markerToken } = ownershipMarker(options);
  for (const directory of [...directories].reverse()) {
    if (!isContained(inspected.root, directory)) continue;
    const tombstone = path.join(path.dirname(directory), `.aas-layout-remove-${markerToken}-${path.basename(directory)}`);
    // A prior cleanup may have published the exact token-bound tombstone and
    // then failed its parent fsync. Reconcile that state before inspecting the
    // original path so cleanup is retryable at every durability boundary.
    if (fs.existsSync(tombstone)) {
      const tombstoneStat = fs.lstatSync(tombstone);
      if (tombstoneStat.isSymbolicLink() || !tombstoneStat.isDirectory() || tombstoneStat.dev !== inspected.device) continue;
      try { assertOwned(tombstoneStat); } catch { continue; }
      if (!markerOwned(tombstone, markerName, markerToken)) continue;
      if (fs.readdirSync(tombstone).some((name) => name !== markerName)) continue;
      fs.rmSync(tombstone, { recursive: true });
      fsyncDirectory(path.dirname(tombstone));
      continue;
    }
    if (!fs.existsSync(directory)) continue;
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || stat.dev !== inspected.device) continue;
    try { assertOwned(stat); } catch { continue; }
    if (!markerOwned(directory, markerName, markerToken)) continue;
    if (fs.readdirSync(directory).some((name) => name !== markerName)) continue;
    fs.renameSync(directory, tombstone);
    if (typeof options.onBoundary === "function") {
      options.onBoundary("layoutDirectoryTombstoned", {
        logicalId: path.relative(inspected.root, directory).split(path.sep).join("/"),
      });
    }
    fsyncDirectory(path.dirname(directory));
    fs.rmSync(tombstone, { recursive: true });
    fsyncDirectory(path.dirname(tombstone));
  }
}

function clearMaterializedMarkers(inspected, directories, options) {
  const { markerName, markerToken } = ownershipMarker(options);
  for (const directory of [...directories].reverse()) {
    if (!fs.existsSync(directory) || !markerOwned(directory, markerName, markerToken)) continue;
    fs.unlinkSync(path.join(directory, markerName));
    fsyncDirectory(directory);
  }
}

function resolveDestination(layout, skillId) {
  const destination = path.resolve(layout.skillsDirectory, ...skillId.split("/"));
  if (!isContained(layout.skillsDirectory, destination)) {
    throw transactionError("AAS_TRANSACTION_PATH_OUTSIDE_TARGET", "filesystem", { logicalId: skillId });
  }
  assertNoSymlinkChain(layout.root, destination);
  return destination;
}

function resolveSource(adapter, operation, layout, target) {
  if (typeof adapter.resolveSourceTree !== "function") {
    throw transactionError("AAS_TRANSACTION_ADAPTER_INVALID", "invalidInput", {});
  }
  const source = adapter.resolveSourceTree({ skillId: operation.skillId, operation, target });
  if (typeof source !== "string" || !path.isAbsolute(source)) {
    throw transactionError("AAS_TRANSACTION_SOURCE_INVALID", "invalidInput", { skillId: operation.skillId });
  }
  const real = fs.realpathSync(source);
  assertRegularDirectory(real, "AAS_TRANSACTION_SOURCE_UNSAFE");
  if (typeof adapter.validateSourceTree === "function" && adapter.validateSourceTree(real, operation) !== true) {
    throw transactionError("AAS_TRANSACTION_SOURCE_REJECTED", "integrity", { skillId: operation.skillId });
  }
  return real;
}

module.exports = {
  assertNoSymlinkChain,
  assertOwned,
  assertRegularDirectory,
  cleanupMaterializedLayout,
  clearMaterializedMarkers,
  inspectLayout,
  isContained,
  materializeLayout,
  resolveDestination,
  resolveLayout,
  resolveSource,
};
