"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { analyzeBundle } = require("./analyzer");
const { atomicWriteJson, canonicalJson } = require("./cache");
const { cacheKey } = require("./cache");
const { MAX_SKILL_BYTES, SCHEMA_VERSION } = require("./constants");
const { atomicWrite, resolveOutputPath } = require("./output");
const { secretLike } = require("./packet");
const { discoverBundle, sha256 } = require("./safe-bundle");
const { artifactName, readBoundedRegular, safeTempRoot } = require("./safe-io");
const { expectedVersions, sanitizeJudgments, validateInterpretation, validatePacket, validateProposal, validateProposalCompletion, validateResult } = require("./schema");
const { deterministicValidation, splitFrontmatter } = require("./validation");

function assertBoundedPatch(patch, label) {
  if (typeof patch !== "string" || !patch.startsWith(`--- a/${label}\n+++ b/${label}\n`)) throw new Error("Proposal patch target mismatch");
  if ((patch.match(/^--- /gm) || []).length !== 1 || (patch.match(/^\+\+\+ /gm) || []).length !== 1) throw new Error("Proposal patch must contain exactly one file");
  if (/^(?:rename|new file|deleted file|old mode|new mode) /m.test(patch)) throw new Error("Proposal patch changes file identity or mode");
  return true;
}

function createProposal({ repoRoot, skillId, candidatePath, outputRoot, packet, interpretation, result }) {
  validatePacket(packet, result);
  validateInterpretation(interpretation, packet);
  const bundle = discoverBundle(repoRoot, skillId);
  validateResult({ ...result, cacheHit: false }, bundle, cacheKey({ bundle }));
  const original = bundle.files[0];
  const candidateBytes = readBoundedRegular(candidatePath, MAX_SKILL_BYTES, "Proposal candidate");
  const candidate = new TextDecoder("utf-8", { fatal: true }).decode(candidateBytes);
  if (secretLike(original.text) || secretLike(candidate)) throw new Error("Proposal content contains a secret-like value and cannot be emitted as a patch");
  if (candidate.includes("\0") || splitFrontmatter(candidate).errors.length) throw new Error("Candidate must be valid UTF-8 Markdown with safe frontmatter");
  if (candidate === original.text) throw new Error("Candidate does not change the target skill");

  const tempRoot = fs.mkdtempSync(path.join(safeTempRoot(), "aas-skill-proposal-"));
  let diffText;
  let report;
  try {
    const isolated = path.join(tempRoot, original.path);
    fs.mkdirSync(path.dirname(isolated), { recursive: true });
    fs.writeFileSync(isolated, original.bytes, { mode: 0o600 });
    const candidateTemp = path.join(tempRoot, "candidate.md");
    fs.writeFileSync(candidateTemp, candidateBytes, { mode: 0o600 });
    const label = original.path;
    const diff = spawnSync("diff", ["-u", "--label", `a/${label}`, "--label", `b/${label}`, isolated, candidateTemp], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
    if (diff.status !== 1) throw new Error(`Unable to create bounded proposal patch: ${diff.stderr || diff.status}`);
    assertBoundedPatch(diff.stdout, label);
    const check = spawnSync("git", ["apply", "--check", "--", "-"], { cwd: tempRoot, input: diff.stdout, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
    if (check.status !== 0) throw new Error(`Proposal patch check failed: ${check.stderr}`);
    diffText = diff.stdout;
    const proposedPrimary = { ...original, bytes: candidateBytes, text: candidate, sha256: sha256(candidateBytes), size: candidateBytes.length };
    const proposedBundle = { ...bundle, files: [proposedPrimary, ...bundle.files.slice(1)] };
    report = { schemaVersion: SCHEMA_VERSION, kind: "aas-local-skill-proposal", skillId, targetPath: original.path, inputSha256: original.sha256, candidateSha256: proposedPrimary.sha256, patchSha256: sha256(Buffer.from(diff.stdout, "utf8")), versions: expectedVersions(), packetHash: packet.packetHash, interpretationHash: sha256(Buffer.from(canonicalJson(interpretation))), reviewer: interpretation.reviewer, applyCapability: false, isolatedRootDeleted: false, patchCheck: "passed", validation: deterministicValidation(candidate, skillId), analysis: sanitizeJudgments(analyzeBundle(proposedBundle)) };
  } finally { fs.rmSync(tempRoot, { recursive: true, force: true }); }
  report.isolatedRootDeleted = !fs.existsSync(tempRoot);
  validateProposal(report);
  const name = artifactName(skillId);
  const patchBytes = Buffer.from(diffText, "utf8");
  const reportBytes = Buffer.from(`${canonicalJson(report)}\n`, "utf8");
  const completionPath = `proposals/${name}.complete.json`;
  atomicWriteJson(outputRoot, completionPath, { schemaVersion: SCHEMA_VERSION, kind: "aas-local-skill-proposal-incomplete", skillId });
  atomicWrite(outputRoot, `proposals/${name}.patch`, patchBytes);
  atomicWrite(outputRoot, `proposals/${name}.json`, reportBytes);
  atomicWriteJson(outputRoot, completionPath, { schemaVersion: SCHEMA_VERSION, kind: "aas-local-skill-proposal-complete", skillId, patchSha256: sha256(patchBytes), reportSha256: sha256(reportBytes) });
  verifyStoredProposal({ outputRoot, skillId });
  return report;
}

function verifyStoredProposal({ outputRoot, skillId }) {
  const name = artifactName(skillId);
  const completion = JSON.parse(readBoundedRegular(resolveOutputPath(outputRoot, `proposals/${name}.complete.json`), 64 * 1024, "Proposal completion").toString("utf8"));
  validateProposalCompletion(completion);
  if (completion.skillId !== skillId) throw new Error("Proposal completion skill binding mismatch");
  const patchBytes = readBoundedRegular(resolveOutputPath(outputRoot, `proposals/${name}.patch`), 2 * 1024 * 1024, "Proposal patch");
  const reportBytes = readBoundedRegular(resolveOutputPath(outputRoot, `proposals/${name}.json`), 2 * 1024 * 1024, "Proposal report");
  if (sha256(patchBytes) !== completion.patchSha256 || sha256(reportBytes) !== completion.reportSha256) throw new Error("Stored proposal artifact hash mismatch");
  const report = JSON.parse(reportBytes.toString("utf8"));
  validateProposal(report);
  if (report.skillId !== skillId || report.patchSha256 !== completion.patchSha256) throw new Error("Stored proposal binding mismatch");
  return report;
}

module.exports = { assertBoundedPatch, createProposal, verifyStoredProposal };
