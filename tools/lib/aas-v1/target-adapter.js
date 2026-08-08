"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, sha256 } = require("./canonical-json");
const { treeDigest } = require("./transaction");

const ADAPTER_VERSION = "1.0.0";

function createSkillTargetAdapter({ targetRoot, sourceRoot, host, scope }) {
  if (!path.isAbsolute(targetRoot) || !path.isAbsolute(sourceRoot)) throw new Error("targetRoot and sourceRoot must be absolute");
  const index = JSON.parse(fs.readFileSync(path.join(sourceRoot, "skills_index.json"), "utf8"));
  const sourceById = new Map(index.map((entry) => [entry.id, path.resolve(sourceRoot, entry.path)]));
  const resolvedRoot = path.resolve(targetRoot);
  const skillsDirectory = scope === "project"
    ? path.join(resolvedRoot, host === "codex" ? ".agents" : ".claude", "skills")
    : path.join(resolvedRoot, "skills");
  const stateRoot = path.join(resolvedRoot, ".aas");
  const layout = {
    root: resolvedRoot,
    skillsDirectory,
    stateFile: path.join(stateRoot, `managed-state.${host}.json`),
    transactionDirectory: path.join(stateRoot, "transactions", host),
  };
  return {
    adapterVersion: ADAPTER_VERSION,
    resolveTransactionLayout(target) {
      if (target.host !== host || target.scope !== scope) throw new Error("target does not match adapter");
      return layout;
    },
    computeTargetIdentity(resolvedLayout, target) {
      const stat = fs.lstatSync(resolvedLayout.root);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("target root is unsafe");
      return sha256(canonicalJson({
        adapterVersion: ADAPTER_VERSION,
        host: target.host,
        scope: target.scope,
        device: stat.dev,
        inode: stat.ino,
        rootPathDigest: sha256(process.platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot),
        logicalSkillsPath: path.relative(resolvedLayout.root, resolvedLayout.skillsDirectory).split(path.sep).join("/"),
        logicalStatePath: path.relative(resolvedLayout.root, resolvedLayout.stateFile).split(path.sep).join("/"),
      }));
    },
    resolveSourceTree({ skillId }) {
      const source = sourceById.get(skillId);
      if (!source) throw new Error(`unknown source skill: ${skillId}`);
      return source;
    },
    validateSourceTree(source, operation) {
      return sourceById.get(operation.skillId) === source && treeDigest(source) === operation.sourceTreeDigest;
    },
  };
}

module.exports = { ADAPTER_VERSION, createSkillTargetAdapter };
