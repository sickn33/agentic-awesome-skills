#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const benchmarkRoot = path.resolve(here, "..");
const baselineRoot = path.resolve(benchmarkRoot, "..");
const repositoryRoot = path.resolve(baselineRoot, "..", "..", "..", "..");
const reportPaths = [
  path.join(baselineRoot, "reviews", "reviewer-alpha.json"),
  path.join(baselineRoot, "reviews", "reviewer-beta.json"),
];

function sha256File(file) {
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function pairDigest(caseData, judgmentData, section) {
  const reviewNeutralJudgment = { ...judgmentData, reviews: [] };
  const payload = section === "abstention"
    ? { case: caseData, label: reviewNeutralJudgment }
    : { case: caseData, gold: reviewNeutralJudgment };
  const bytes = JSON.stringify(canonicalize(payload));
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function pairManifestRoot(entries) {
  const sorted = entries.sort((left, right) => (
    left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0
  ));
  return `sha256-${crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex")}`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const reports = reportPaths.map((file) => {
  if (!fs.existsSync(file)) throw new Error(`Missing independent review report: ${file}`);
  const report = readJson(file);
  if ((report.overallDecision || report.overall?.decision) !== "approved") {
    throw new Error(`Review is not approved: ${file}`);
  }
  return report;
});
const reviewerId = (report) => report.reviewer.id || report.reviewer.identity;
if (new Set(reports.map(reviewerId)).size !== 2) {
  throw new Error("Exactly two distinct independent reviewer identities are required.");
}

const pendingWrites = new Map();
const reviewedCaseIds = new Map(reports.map((report) => [reviewerId(report), new Set()]));

const pairPaths = new Map();
const heldOutIndexForPaths = readJson(path.join(benchmarkRoot, "held-out-index.json"));
for (const entry of heldOutIndexForPaths.cases) {
  pairPaths.set(entry.caseId, {
    caseFile: path.join(benchmarkRoot, entry.inputPath),
    judgmentFile: path.join(benchmarkRoot, entry.goldPath),
    section: "heldOut",
  });
}
const tuningRoot = path.join(benchmarkRoot, "tuning");
const tuningIndexForPaths = readJson(path.join(tuningRoot, "index.json"));
for (const entry of tuningIndexForPaths.cases) {
  pairPaths.set(entry.caseId, {
    caseFile: path.join(tuningRoot, entry.inputPath),
    judgmentFile: path.join(tuningRoot, entry.goldPath),
    section: "tuning",
  });
}
const abstentionRoot = path.join(benchmarkRoot, "abstention");
const abstentionIndexForPaths = readJson(path.join(abstentionRoot, "index.json"));
for (const entry of abstentionIndexForPaths.cases) {
  pairPaths.set(entry.caseId, {
    caseFile: path.join(abstentionRoot, entry.inputPath),
    judgmentFile: path.join(abstentionRoot, entry.labelPath),
    section: "abstention",
  });
}

function addReview(report, caseId, caseFile, judgmentFile, section) {
  const identity = reviewerId(report);
  const caseData = readJson(caseFile);
  const judgmentData = readJson(judgmentFile);
  const digest = pairDigest(caseData, judgmentData, section);
  const pending = pendingWrites.get(judgmentFile) || { data: judgmentData, reviews: [] };
  pending.reviews.push({ reviewer: identity, decision: "approved", reviewedDigest: digest });
  pendingWrites.set(judgmentFile, pending);
  reviewedCaseIds.get(identity).add(caseId);
  return digest;
}

for (const report of reports) {
  if (report.scope) {
    for (const section of ["heldOut", "tuning", "abstention"]) {
      const items = report.scope?.[section]?.items;
      if (!Array.isArray(items)) throw new Error(`${reviewerId(report)} missing ${section} items`);
      for (const item of items) {
        if (item.decision !== "approved") throw new Error(`${reviewerId(report)} rejected ${item.caseId}`);
        const caseFile = path.join(repositoryRoot, item.casePath);
        const judgmentFile = path.join(repositoryRoot, item.judgmentPath);
        if (sha256File(caseFile) !== item.caseSha256) throw new Error(`Case digest mismatch: ${item.caseId}`);
        if (sha256File(judgmentFile) !== item.judgmentSha256) throw new Error(`Judgment digest mismatch: ${item.caseId}`);
        addReview(report, item.caseId, caseFile, judgmentFile, section);
      }
    }
    continue;
  }
  if (report.splits) {
    const globalEntries = [];
    for (const section of ["heldOut", "tuning", "abstention"]) {
      const splitEntries = [];
      for (const [caseId, pair] of pairPaths) {
        if (pair.section !== section) continue;
        const digest = addReview(report, caseId, pair.caseFile, pair.judgmentFile, section);
        splitEntries.push([caseId, digest]);
        globalEntries.push([caseId, digest]);
      }
      if (splitEntries.length !== report.splits[section]?.pairCount) {
        throw new Error(`${reviewerId(report)} ${section} pair count mismatch`);
      }
      if (pairManifestRoot(splitEntries) !== report.splits[section]?.pairManifestRootDigest) {
        throw new Error(`${reviewerId(report)} ${section} root digest mismatch`);
      }
    }
    if (globalEntries.length !== report.pairCount || pairManifestRoot(globalEntries) !== report.pairManifestRootDigest) {
      throw new Error(`${reviewerId(report)} global root digest mismatch`);
    }
    continue;
  }
  for (const section of ["heldOut", "tuning", "abstention"]) {
    const digestMap = report[section]?.pairSha256ByCaseId;
    if (!digestMap || typeof digestMap !== "object") throw new Error(`${reviewerId(report)} missing ${section} digest map`);
    for (const [caseId, expectedDigest] of Object.entries(digestMap)) {
      const pair = pairPaths.get(caseId);
      if (!pair || pair.section !== section) throw new Error(`Unknown ${section} review pair: ${caseId}`);
      const actualDigest = addReview(report, caseId, pair.caseFile, pair.judgmentFile, section);
      if (actualDigest !== expectedDigest) throw new Error(`Pair digest mismatch: ${caseId}`);
    }
  }
}

for (const [reviewer, ids] of reviewedCaseIds) {
  if (ids.size !== 270) throw new Error(`${reviewer} approved ${ids.size} unique pairs, expected 270`);
}
if (pendingWrites.size !== 270) throw new Error(`Expected 270 judgments, found ${pendingWrites.size}`);
for (const [file, pending] of pendingWrites) {
  pending.data.reviews = pending.reviews.sort((left, right) => left.reviewer.localeCompare(right.reviewer));
  writeJson(file, pending.data);
}

const heldOutIndexPath = path.join(benchmarkRoot, "held-out-index.json");
const heldOutIndex = readJson(heldOutIndexPath);
heldOutIndex.status = "frozen";
heldOutIndex.indexVersion = "1.0.0";
heldOutIndex.cases = heldOutIndex.cases.map((entry) => ({ ...entry, reviewStatus: "approved" }));
writeJson(heldOutIndexPath, heldOutIndex);

const tuningIndexPath = path.join(benchmarkRoot, "tuning", "index.json");
const tuningIndex = readJson(tuningIndexPath);
tuningIndex.status = "frozen";
tuningIndex.cases = tuningIndex.cases.map((entry) => ({ ...entry, reviewStatus: "approved" }));
writeJson(tuningIndexPath, tuningIndex);

const tuningManifestPath = path.join(benchmarkRoot, "tuning", "manifest.json");
const tuningManifest = readJson(tuningManifestPath);
tuningManifest.status = "frozen";
tuningManifest.reviews = reports.map((report) => ({ reviewer: report.reviewer.id, decision: "approved" }));
writeJson(tuningManifestPath, tuningManifest);

const abstentionIndexPath = path.join(benchmarkRoot, "abstention", "index.json");
const abstentionIndex = readJson(abstentionIndexPath);
abstentionIndex.status = "frozen";
abstentionIndex.cases = abstentionIndex.cases.map((entry) => ({ ...entry, reviewStatus: "approved" }));
writeJson(abstentionIndexPath, abstentionIndex);

const manifestPath = path.join(benchmarkRoot, "manifest.json");
const manifest = readJson(manifestPath);
manifest.benchmarkVersion = "1.0.0";
manifest.status = "frozen";
manifest.heldOut.actualInputsPresent = true;
manifest.heldOut.goldLabelsPresent = true;
manifest.abstention = {
  index: "abstention/index.json",
  caseCount: 30,
  labelsFrozen: true,
  status: "frozen"
};
manifest.tuning = {
  manifest: "tuning/manifest.json",
  separatedFromHeldOut: true,
  status: "frozen"
};
manifest.labelsFrozen = true;
writeJson(manifestPath, manifest);

console.log(JSON.stringify({
  ok: true,
  reviewers: reports.map(reviewerId),
  reviewedPairs: pendingWrites.size,
  heldOut: 180,
  tuning: 60,
  abstention: 30,
}, null, 2));
