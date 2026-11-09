"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { canonicalJson } = require("./aas-v1/canonical-json");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function git(root, args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr);
  return r.stdout.trim();
}
function fingerprint(root, head, protectedBase, skillIds) {
  if (![head, protectedBase].every(s => /^[a-f0-9]{40}$/.test(s))) throw new Error("Full immutable heads required");
  if (!Array.isArray(skillIds) || !skillIds.length || Array.from(skillIds).some(s => typeof s !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(s))) throw new Error("Invalid reviewed skill set");
  const skills = [...new Set(skillIds)].sort().map(id => ({ id, tree: git(root, ["ls-tree", head, "--", `skills/${id}`]) || "absent" }));
  // The Git tree binds all nested bytes and modes. The protected context binds
  // evaluators, dependencies, schemas and operational instructions, not only text.
  const context = ["tools", "schemas", "package.json", "package-lock.json", "AGENTS.md", ".github", "docs/maintainers", "skills/antigravity-maintainer-batch-release"]
    .map(file => ({ file, object: git(root, ["rev-parse", "--verify", `${protectedBase}:${file}`]), headObject: git(root, ["ls-tree", head, "--", file]) }));
  const content = { schemaVersion: 1, skills, context };
  return { ...content, digest: sha256(canonicalJson(content)) };
}
function signReceipt(review, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error("A private 256-bit key is required");
  if (!review || review.outcome !== "approved" || !/^[a-f0-9]{40}$/.test(review.reviewedHead || "")
      || !review.reviewer || !review.evidence || !/^[a-f0-9]{64}$/.test(review.fingerprint?.digest || ""))
    throw new Error("An explicit reviewed head, reviewer and evidence are required");
  const receipt = { schemaVersion: 1, ...review };
  return { receipt, mac: crypto.createHmac("sha256", key).update(canonicalJson(receipt)).digest("hex") };
}
function verifyReceipt(signed, expected, key, currentHead) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error("A private 256-bit key is required");
  if (!/^[a-f0-9]{40}$/.test(currentHead || "") || !signed?.receipt || !/^[a-f0-9]{64}$/.test(signed.mac || ""))
    throw new Error("Invalid review receipt");
  const actual = crypto.createHmac("sha256", key).update(canonicalJson(signed.receipt)).digest();
  if (!crypto.timingSafeEqual(actual, Buffer.from(signed.mac, "hex"))) throw new Error("Review receipt authentication failed");
  if (signed.receipt.schemaVersion !== 1 || signed.receipt.outcome !== "approved"
      || canonicalJson(signed.receipt.fingerprint) !== canonicalJson(expected)) throw new Error("Review content or context changed");
  return { reviewedHead: currentHead, reusedFrom: signed.receipt.reviewedHead, reviewer: signed.receipt.reviewer, evidence: signed.receipt.evidence };
}
function privateStore(directory, repository) {
  const root = fs.realpathSync(repository), target = path.resolve(directory);
  if (target === root || target.startsWith(root + path.sep)) throw new Error("Review store must be outside the repository");
  // Require a pre-created private directory; never follow links or create parent
  // paths in PR-controlled locations. Parent ownership prevents replacement.
  for (let current = target; ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) throw new Error("Review store must not be inside any Git checkout");
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe review-store ancestry");
    if (current === target && ((stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid()))) throw new Error("Review store must be privately owned");
    if (process.getuid && stat.uid !== process.getuid() && stat.uid !== 0) throw new Error("Untrusted review-store parent owner");
    if (current !== target && (stat.mode & 0o022) && !(stat.mode & 0o1000)) throw new Error("Replaceable review-store parent");
    if (current === path.dirname(current)) break;
  }
  return target;
}
module.exports = { fingerprint, signReceipt, verifyReceipt, privateStore };
