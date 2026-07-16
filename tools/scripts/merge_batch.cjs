#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { findProjectRoot } = require("../lib/project-root");
const { parseRawDiff } = require("../lib/git-raw-diff");
const {
  classifyChangeRecords,
  classifyPathPolicy,
  hasQualityChecklist,
} = require("../lib/workflow-contract");

const REOPEN_COMMENT =
  "Maintainer workflow refresh: closing and reopening to retrigger pull_request checks against the updated PR body.";
const DEFAULT_POLL_SECONDS = 20;
const BASE_BRANCH_MODIFIED_PATTERNS = [
  /base branch was modified/i,
  /base branch has been modified/i,
  /branch was modified/i,
];
const REQUIRED_CHECKS = [
  ["pr-policy", { label: "pr-policy", aliases: ["pr-policy"], appId: 15368 }],
  ["pr-evidence", { label: "pr-evidence", aliases: ["pr-evidence"], appId: 15368 }],
  ["source-validation", { label: "source-validation", aliases: ["source-validation"], appId: 15368 }],
  ["artifact-preview", { label: "artifact-preview", aliases: ["artifact-preview"], appId: 15368 }],
];
const REQUIRED_PROTECTION_CHECKS = new Map(REQUIRED_CHECKS.map(([name, spec]) => [name, spec.appId]));
const GITHUB_ACTIONS_APP_ID = 15368;
const SKILL_REVIEW_REQUIRED = [
  "review",
  "Skill Review / review",
  "Skill Review & Optimize",
  "Skill Review & Optimize / review",
];
const MANUAL_REVIEW_REQUIRED = ["manual-review-required", "Skill Review / manual-review-required"];
const MISSING_REVIEW_CREDENTIALS = ["missing-review-credentials", "Skill Review / missing-review-credentials"];
const DISALLOWED_COAUTHOR_TRAILER_PATTERNS = [
  /<noreply@anthropic\.com>/i,
  /:\s*claude\b/i,
  /:\s*claude\s+sonnet\b/i,
];
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const EVIDENCE_SCHEMA_VERSION = 1;
const EVIDENCE_TIMEOUT_MS = 120_000;
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const APPROVAL_WORKFLOW_PATHS = new Set([
  ".github/workflows/actionlint.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/skill-review.yml",
]);

function parseArgs(argv) {
  const args = {
    prs: null,
    pollSeconds: DEFAULT_POLL_SECONDS,
    dryRun: false,
    reviewedHeads: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--prs") {
      args.prs = argv[index + 1] || null;
      index += 1;
    } else if (arg === "--poll-seconds") {
      args.pollSeconds = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--reviewed-head") {
      const reviewedHead = String(argv[index + 1] || "");
      if (!FULL_SHA_PATTERN.test(reviewedHead)) {
        throw new Error("--reviewed-head must be an exact 40-character lowercase commit SHA.");
      }
      args.reviewedHeads.push(reviewedHead);
      index += 1;
    }
  }

  if (typeof args.pollSeconds !== "number" || Number.isNaN(args.pollSeconds) || args.pollSeconds <= 0) {
    args.pollSeconds = DEFAULT_POLL_SECONDS;
  }

  return args;
}

function assertFullSha(value, label) {
  if (!FULL_SHA_PATTERN.test(String(value || ""))) {
    throw new Error(`${label} must be an exact 40-character lowercase commit SHA.`);
  }
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readRepositorySlug(projectRoot) {
  const packageJson = readJson(path.join(projectRoot, "package.json"));
  const repository = packageJson.repository;
  const rawUrl =
    typeof repository === "string"
      ? repository
      : repository && typeof repository.url === "string"
        ? repository.url
        : null;

  if (!rawUrl) {
    throw new Error("package.json repository.url is required to resolve the GitHub slug.");
  }

  const match = rawUrl.match(/github\.com[:/](?<slug>[^/]+\/[^/]+?)(?:\.git)?$/i);
  if (!match?.groups?.slug) {
    throw new Error(`Could not derive a GitHub repo slug from repository url: ${rawUrl}`);
  }

  return match.groups.slug;
}

function runCommand(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    input: options.input,
    stdio: options.capture
      ? ["pipe", "pipe", "pipe"]
      : options.input !== undefined
        ? ["pipe", "inherit", "inherit"]
        : ["inherit", "inherit", "inherit"],
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status !== "number" || result.status !== 0) {
    const stderr = options.capture ? result.stderr.trim() : "";
    throw new Error(stderr || `${command} ${args.join(" ")} failed with status ${result.status}`);
  }

  return options.capture ? result.stdout.trim() : "";
}

function runCommandBuffer(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: null,
    input: options.input,
    maxBuffer: options.maxBuffer || 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }
  if (typeof result.status !== "number" || result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8").trim() : "";
    throw new Error(stderr || `${command} ${args.join(" ")} failed with status ${result.status}`);
  }
  if (!Buffer.isBuffer(result.stdout)) {
    throw new Error(`${command} did not return a raw byte buffer.`);
  }
  return result.stdout;
}

function resolveMergeBase(projectRoot, baseOid, headOid, dependencies = {}) {
  const execute = dependencies.runCommand || runCommand;
  const mergeBase = execute("git", ["merge-base", baseOid, headOid], projectRoot, { capture: true });
  return assertFullSha(mergeBase, "Pull request merge-base SHA");
}

function normalizeEvidenceRecord(record) {
  return JSON.stringify({
    status: String(record?.status || ""),
    old_path: record?.old_path ?? null,
    new_path: record?.new_path ?? null,
    old_mode: String(record?.old_mode || ""),
    new_mode: String(record?.new_mode || ""),
    old_oid: String(record?.old_oid || ""),
    new_oid: String(record?.new_oid || ""),
    similarity: record?.similarity ?? null,
  });
}

function isSkillContentRecord(record) {
  return [record?.old_path, record?.new_path]
    .filter((filePath) => typeof filePath === "string" && filePath)
    .some((filePath) => ["canonical_skill", "skill_support"].includes(classifyPathPolicy(filePath).kind));
}

function assertFiniteSnapshotScores(snapshot, label) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error(`${label} snapshot is missing.`);
  }
  const scores = snapshot?.score?.scores;
  for (const component of ["metadata", "documentation", "security", "total"]) {
    if (typeof scores?.[component] !== "number" || !Number.isFinite(scores[component])) {
      throw new Error(`${label} score component ${component} is missing or non-finite.`);
    }
  }
}

function validateChangedSkillEvidence(report, expected) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Changed-skill evidence must be a JSON object.");
  }
  if (report.schema_version !== EVIDENCE_SCHEMA_VERSION) {
    throw new Error(`Changed-skill evidence schema must be ${EVIDENCE_SCHEMA_VERSION}.`);
  }
  for (const [field, value] of [
    ["base_oid", expected.mergeBaseOid],
    ["head_oid", expected.headOid],
    ["base_ref", expected.mergeBaseOid],
    ["head_ref", expected.headOid],
  ]) {
    if (report[field] !== value) {
      throw new Error(`Changed-skill evidence ${field} does not match the validated tuple.`);
    }
  }
  if (typeof report.blocking !== "boolean") {
    throw new Error("Changed-skill evidence blocking must be boolean.");
  }
  if (!Array.isArray(report.reasons) || report.reasons.some((reason) => typeof reason !== "string")) {
    throw new Error("Changed-skill evidence reasons must be an array of strings.");
  }
  if (!Array.isArray(report.changes)) {
    throw new Error("Changed-skill evidence changes must be an array.");
  }

  const evidenceRecords = [];
  for (const [index, change] of report.changes.entries()) {
    if (!change || typeof change !== "object" || !Array.isArray(change.records) || !change.records.length) {
      throw new Error(`Changed-skill evidence change ${index} has no covered Git records.`);
    }
    const type = String(change.change_type || "");
    if (type === "modified" || type === "renamed") {
      assertFiniteSnapshotScores(change.before, `change ${index} before`);
      assertFiniteSnapshotScores(change.after, `change ${index} after`);
    } else if (type === "added" || type === "copied") {
      assertFiniteSnapshotScores(change.after, `change ${index} after`);
    } else if (type === "deleted") {
      assertFiniteSnapshotScores(change.before, `change ${index} before`);
      if (change.after !== null) {
        throw new Error(`Changed-skill evidence deletion ${index} must not contain an after snapshot.`);
      }
    } else {
      throw new Error(`Changed-skill evidence change ${index} has unknown type ${type || "<missing>"}.`);
    }
    evidenceRecords.push(...change.records.map(normalizeEvidenceRecord));
  }

  const rawRecords = expected.rawRecords.filter(isSkillContentRecord).map(normalizeEvidenceRecord).sort();
  evidenceRecords.sort();
  if (new Set(evidenceRecords).size !== evidenceRecords.length) {
    throw new Error("Changed-skill evidence contains duplicate Git records.");
  }
  if (rawRecords.length !== evidenceRecords.length || rawRecords.some((record, index) => record !== evidenceRecords[index])) {
    throw new Error("Changed-skill evidence does not cover the exact skill-content Git diff.");
  }
  if (report.blocking !== (report.reasons.length > 0)) {
    throw new Error("Changed-skill evidence blocking flag disagrees with its reasons.");
  }
  return report;
}

function resolveIsolatedPython() {
  const candidates = [["python3"], ["python"], ["py", "-3"]];
  for (const candidate of candidates) {
    const [command, ...baseArgs] = candidate;
    const probe = spawnSync(command, [...baseArgs, "-I", "-c", "import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)"], {
      encoding: "utf8",
      shell: false,
      timeout: 10_000,
      env: { PATH: process.env.PATH || "", SYSTEMROOT: process.env.SYSTEMROOT || "" },
    });
    if (!probe.error && probe.status === 0) {
      return candidate;
    }
  }
  throw new Error("Unable to find an isolated Python 3 interpreter for trusted evidence.");
}

function recomputeChangedSkillEvidence(
  projectRoot,
  { evaluatorOid, mergeBaseOid, headOid, rawRecords },
  dependencies = {},
) {
  assertFullSha(evaluatorOid, "Trusted evaluator SHA");
  assertFullSha(mergeBaseOid, "Evidence merge-base SHA");
  assertFullSha(headOid, "Evidence head SHA");
  const executeBuffer = dependencies.runCommandBuffer || runCommandBuffer;
  const spawn = dependencies.spawnSync || spawnSync;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aas-trusted-evidence-"));
  try {
    const archive = executeBuffer(
      "git",
      ["archive", "--format=tar", evaluatorOid, "--", "tools/scripts"],
      projectRoot,
      { maxBuffer: 64 * 1024 * 1024 },
    );
    const extract = spawn("tar", ["-xf", "-", "-C", temporary], {
      input: archive,
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    if (extract.error || extract.status !== 0) {
      throw new Error(`Could not materialize trusted evaluator: ${extract.error?.message || extract.stderr || "tar failed"}`);
    }

    const scriptsDir = path.join(temporary, "tools", "scripts");
    const scriptPath = path.join(scriptsDir, "changed_skill_evidence.py");
    const outputPath = path.join(temporary, "changed-skills.json");
    const [python, ...pythonBaseArgs] = dependencies.pythonCommand || resolveIsolatedPython();
    const bootstrap = [
      "import runpy,sys",
      "scripts=sys.argv[1]",
      "script=sys.argv[2]",
      "sys.path.insert(0,scripts)",
      "sys.argv=[script,*sys.argv[3:]]",
      "runpy.run_path(script,run_name='__main__')",
    ].join(";");
    const environment = {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "",
      TMPDIR: temporary,
      TEMP: temporary,
      TMP: temporary,
      HOME: temporary,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      PYTHONDONTWRITEBYTECODE: "1",
      PYTHONHASHSEED: "0",
    };
    const result = spawn(
      python,
      [
        ...pythonBaseArgs,
        "-I",
        "-c",
        bootstrap,
        scriptsDir,
        scriptPath,
        "--repo",
        projectRoot,
        "--base",
        mergeBaseOid,
        "--head",
        headOid,
        "--output",
        outputPath,
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
        shell: false,
        timeout: EVIDENCE_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        env: environment,
      },
    );
    if (result.error) {
      throw new Error(`Trusted changed-skill evaluator failed: ${result.error.message}`);
    }
    if (![0, 1].includes(result.status)) {
      throw new Error(`Trusted changed-skill evaluator exited unexpectedly (${result.status ?? result.signal ?? "unknown"}).`);
    }
    const stat = fs.statSync(outputPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_EVIDENCE_BYTES) {
      throw new Error("Trusted changed-skill evidence output is missing, empty, or oversized.");
    }
    const report = validateChangedSkillEvidence(readJson(outputPath), {
      mergeBaseOid,
      headOid,
      rawRecords,
    });
    if ((result.status === 1) !== report.blocking) {
      throw new Error("Trusted changed-skill evaluator exit status disagrees with evidence blocking state.");
    }
    return report;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function fetchPullRequestObjects(projectRoot, baseOid, headOid, dependencies = {}) {
  const execute = dependencies.runCommand || runCommand;
  assertFullSha(baseOid, "Pull request base SHA");
  assertFullSha(headOid, "Pull request head SHA");
  execute(
    "git",
    ["fetch", "--no-tags", "--no-write-fetch-head", "origin", baseOid, headOid],
    projectRoot,
  );
  execute("git", ["cat-file", "-e", `${baseOid}^{commit}`], projectRoot);
  execute("git", ["cat-file", "-e", `${headOid}^{commit}`], projectRoot);
}

function readRawChangeRecords(projectRoot, baseOid, headOid, dependencies = {}) {
  const executeBuffer = dependencies.runCommandBuffer || runCommandBuffer;
  assertFullSha(baseOid, "Pull request base SHA");
  assertFullSha(headOid, "Pull request head SHA");
  const raw = executeBuffer(
    "git",
    ["diff", "--raw", "--no-abbrev", "-z", "-M", "--find-copies-harder", baseOid, headOid, "--"],
    projectRoot,
  );
  return parseRawDiff(raw);
}

function resolveBlobSizes(projectRoot, records, dependencies = {}) {
  const execute = dependencies.runCommand || runCommand;
  const objectIds = [...new Set(records.flatMap((record) => [record.old_oid, record.new_oid]))]
    .filter((oid) => FULL_SHA_PATTERN.test(String(oid || "")) && !/^0+$/u.test(oid));
  if (!objectIds.length) {
    throw new Error("Raw Git diff did not contain any materialized blob object IDs.");
  }

  const stdout = execute(
    "git",
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    projectRoot,
    { capture: true, input: `${objectIds.join("\n")}\n` },
  );
  const sizes = new Map();
  for (const line of String(stdout || "").split(/\r?\n/u).filter(Boolean)) {
    const match = line.match(/^(?<oid>[0-9a-f]{40}) (?<type>\S+) (?<size>\d+)$/u);
    if (!match?.groups || !objectIds.includes(match.groups.oid)) {
      throw new Error(`Unexpected git cat-file response: ${line}`);
    }
    if (match.groups.type !== "blob") {
      throw new Error(`Object ${match.groups.oid} is ${match.groups.type}, not a blob.`);
    }
    const size = Number(match.groups.size);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new Error(`Object ${match.groups.oid} has an invalid size.`);
    }
    sizes.set(match.groups.oid, size);
  }
  for (const oid of objectIds) {
    if (!sizes.has(oid)) {
      throw new Error(`git cat-file did not return metadata for ${oid}.`);
    }
  }
  return sizes;
}

function runGhJson(projectRoot, args, options = {}) {
  const stdout = runCommand(
    "gh",
    [...args, "--json", options.jsonFields || ""].filter(Boolean),
    projectRoot,
    { capture: true, input: options.input },
  );
  return JSON.parse(stdout || "null");
}

function runGhApiJson(projectRoot, args, options = {}) {
  const ghArgs = ["api", ...args];
  if (options.paginate) {
    ghArgs.push("--paginate");
  }
  if (options.slurp) {
    ghArgs.push("--slurp");
  }
  const stdout = runCommand("gh", ghArgs, projectRoot, { capture: true, input: options.input });
  return JSON.parse(stdout || "null");
}

function flattenGhSlurpPayload(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  const flattened = [];
  for (const page of payload) {
    if (Array.isArray(page)) {
      flattened.push(...page);
    } else if (page && typeof page === "object") {
      flattened.push(page);
    }
  }
  return flattened;
}

function ensureOnMainAndClean(projectRoot) {
  const branch = runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], projectRoot, {
    capture: true,
  });
  if (branch !== "main") {
    throw new Error(`merge-batch must run from main. Current branch: ${branch}`);
  }

  const status = runCommand(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    projectRoot,
    { capture: true },
  );
  if (status) {
    throw new Error("merge-batch requires a clean tracked working tree before starting.");
  }
}

function ensureTrustedMain(projectRoot, dependencies = {}) {
  const execute = dependencies.runCommand || runCommand;
  ensureOnMainAndClean(projectRoot);
  execute("git", ["fetch", "--no-tags", "origin", "main"], projectRoot);
  const localHead = assertFullSha(
    execute("git", ["rev-parse", "HEAD"], projectRoot, { capture: true }),
    "Local main SHA",
  );
  const remoteHead = assertFullSha(
    execute("git", ["rev-parse", "origin/main"], projectRoot, { capture: true }),
    "origin/main SHA",
  );
  if (localHead !== remoteHead) {
    throw new Error(`merge-batch requires local main to equal origin/main (${localHead} != ${remoteHead}).`);
  }
  return localHead;
}

function parsePrList(prs) {
  if (!prs) {
    throw new Error("Usage: merge_batch.cjs --prs 450,449,446,451");
  }

  const parsed = prs
    .split(/[\s,]+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!parsed.length) {
    throw new Error("No valid PR numbers were provided.");
  }

  return [...new Set(parsed)];
}

function extractSummaryBlock(body) {
  const text = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return "";
  }

  const sectionMatch = text.match(/^\s*##\s+/m);
  if (!sectionMatch) {
    return text;
  }

  const prefix = text.slice(0, sectionMatch.index).trimEnd();
  return prefix;
}

function extractTemplateSections(templateContent) {
  const text = String(templateContent || "").replace(/\r\n/g, "\n").trim();
  const sectionMatch = text.match(/^\s*##\s+/m);
  if (!sectionMatch) {
    return text;
  }

  return text.slice(sectionMatch.index).trim();
}

function normalizePrBody(body, templateContent) {
  const summary = extractSummaryBlock(body);
  const templateSections = extractTemplateSections(templateContent);

  if (!summary) {
    return templateSections;
  }

  return `${summary}\n\n${templateSections}`.trim();
}

function stripDisallowedCoauthorTrailers(body) {
  return String(body || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => {
      if (!/^\s*co-authored-by:/i.test(line)) {
        return true;
      }
      return !DISALLOWED_COAUTHOR_TRAILER_PATTERNS.some((pattern) => pattern.test(line));
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSquashMergeSubject(prDetails) {
  return `${String(prDetails.title || `PR #${prDetails.number}`).trim()} (#${prDetails.number})`;
}

function buildSquashMergeBody(prDetails) {
  const summary = extractSummaryBlock(prDetails.body);
  return stripDisallowedCoauthorTrailers(summary);
}

function loadPullRequestTemplate(projectRoot) {
  return fs.readFileSync(path.join(projectRoot, ".github", "PULL_REQUEST_TEMPLATE.md"), "utf8");
}

function loadPullRequestDetails(projectRoot, repoSlug, prNumber) {
  const details = runGhJson(projectRoot, ["pr", "view", String(prNumber)], {
    jsonFields: [
      "body",
      "autoMergeRequest",
      "baseRefName",
      "baseRefOid",
      "mergeStateStatus",
      "mergeable",
      "number",
      "title",
      "headRefOid",
      "headRefName",
      "headRepository",
      "url",
    ].join(","),
  });
  return details;
}

function pullRequestTuple(prDetails) {
  const number = Number(prDetails?.number);
  if (prDetails?.autoMergeRequest) {
    throw new Error(`PR #${number || "<unknown>"} already has deferred auto-merge enabled.`);
  }
  if (prDetails?.baseRefName !== "main") {
    throw new Error(`PR #${number || "<unknown>"} must target main.`);
  }
  return {
    baseOid: assertFullSha(prDetails?.baseRefOid, `PR #${number} base SHA`),
    headOid: assertFullSha(prDetails?.headRefOid, `PR #${number} head SHA`),
  };
}

function globMatchesRef(pattern, refName) {
  if (pattern === "~ALL" || pattern === "~DEFAULT_BRANCH") {
    return true;
  }
  if (/[\[\]\\]/u.test(String(pattern || ""))) {
    return null;
  }
  const escaped = String(pattern || "")
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*\*/gu, "\u0000")
    .replace(/\*/gu, "[^/]*")
    .replace(/\?/gu, "[^/]")
    .replace(/\u0000/gu, ".*");
  return new RegExp(`^${escaped}$`, "u").test(refName);
}

function rulesetAppliesToMain(ruleset) {
  if (String(ruleset?.enforcement || "").toLowerCase() !== "active" || ruleset?.target !== "branch") {
    return false;
  }
  const refCondition = ruleset?.conditions?.ref_name;
  if (!refCondition) {
    return true;
  }
  const refName = "refs/heads/main";
  const excludeMatches = Array.isArray(refCondition.exclude)
    ? refCondition.exclude.map((pattern) => globMatchesRef(pattern, refName))
    : [];
  if (excludeMatches.includes(null)) {
    return true;
  }
  const excluded = excludeMatches.includes(true);
  if (excluded) {
    return false;
  }
  const includes = Array.isArray(refCondition.include) ? refCondition.include : [];
  const includeMatches = includes.map((pattern) => globMatchesRef(pattern, refName));
  return includes.length === 0 || includeMatches.includes(null) || includeMatches.includes(true);
}

function assertUnchangedTuple(prDetails, expected, phase, prNumber) {
  const actual = pullRequestTuple(prDetails);
  if (actual.baseOid !== expected.baseOid || actual.headOid !== expected.headOid) {
    throw new Error(
      `PR #${prNumber} base/head changed ${phase}: expected ${expected.baseOid}/${expected.headOid}, ` +
      `received ${actual.baseOid}/${actual.headOid}. Rerun merge:batch.`,
    );
  }
  return actual;
}

function validateEffectiveMainProtection(protection, rulesets = []) {
  const required = protection?.required_status_checks;
  const checks = Array.isArray(required?.checks) ? required.checks : [];
  const configured = new Map(checks.map((check) => [String(check?.context || ""), Number(check?.app_id)]));
  const invalidChecks = [...REQUIRED_PROTECTION_CHECKS].filter(
    ([context, appId]) => configured.get(context) !== appId,
  );
  if (required?.strict !== true || invalidChecks.length > 0) {
    throw new Error(
      "main protection must require the exact app-bound strict checks: " +
      [...REQUIRED_PROTECTION_CHECKS.keys()].join(", "),
    );
  }
  if (protection?.enforce_admins?.enabled !== true) {
    throw new Error("main protection must apply to administrators.");
  }
  if (!protection?.required_pull_request_reviews) {
    throw new Error("main protection must require changes through pull requests.");
  }
  if (Number(protection.required_pull_request_reviews.required_approving_review_count) !== 0) {
    throw new Error("main protection must not require routine approving reviews.");
  }
  const bypassAllowances = protection.required_pull_request_reviews.bypass_pull_request_allowances || {};
  if (["users", "teams", "apps"].some((key) => Array.isArray(bypassAllowances[key]) && bypassAllowances[key].length > 0)) {
    throw new Error("main pull-request protection must not have bypass allowances.");
  }
  if (protection?.allow_force_pushes?.enabled !== false || protection?.allow_deletions?.enabled !== false) {
    throw new Error("main protection must disable force pushes and branch deletion.");
  }
  const applicableRulesets = rulesets.filter(rulesetAppliesToMain);
  const bypassing = applicableRulesets.filter((ruleset) =>
    Array.isArray(ruleset?.bypass_actors) && ruleset.bypass_actors.length > 0,
  );
  if (bypassing.length) {
    throw new Error(`Cannot prove latest-base enforcement because rulesets have bypass actors: ${bypassing.map((item) => item.id).join(", ")}.`);
  }
  const mergeQueues = applicableRulesets.filter((ruleset) =>
    Array.isArray(ruleset?.rules) && ruleset.rules.some((rule) => rule?.type === "merge_queue"),
  );
  if (mergeQueues.length) {
    throw new Error(`merge-batch does not support deferred merge queues: ${mergeQueues.map((item) => item.id).join(", ")}.`);
  }
  return true;
}

function loadEffectiveMainProtection(projectRoot, repoSlug, dependencies = {}) {
  const api = dependencies.runGhApiJson || runGhApiJson;
  const protection = api(projectRoot, [`repos/${repoSlug}/branches/main/protection`]);
  const pages = api(
    projectRoot,
    [`repos/${repoSlug}/rulesets?includes_parents=true&per_page=100`],
    { paginate: true, slurp: true },
  );
  const summaries = flattenGhSlurpPayload(pages);
  const rulesets = summaries
    .filter((ruleset) => Number.isInteger(Number(ruleset?.id)))
    .map((ruleset) => api(projectRoot, [`repos/${repoSlug}/rulesets/${Number(ruleset.id)}`]));
  return { protection, rulesets };
}

function assertEffectiveMainProtection(projectRoot, repoSlug, dependencies = {}) {
  const load = dependencies.loadEffectiveMainProtection || loadEffectiveMainProtection;
  let state;
  try {
    state = load(projectRoot, repoSlug, dependencies);
  } catch (error) {
    throw new Error(`Cannot prove effective main protection: ${error.message}`);
  }
  validateEffectiveMainProtection(state?.protection, state?.rulesets);
}

function needsBodyRefresh(prDetails) {
  return !hasQualityChecklist(prDetails.body);
}

function getRequiredCheckAliases(prDetails, options = {}) {
  const aliases = REQUIRED_CHECKS.map(([, value]) => value);
  if (prDetails.hasSkillChanges) {
    aliases.push({
      label: "review",
      aliases: SKILL_REVIEW_REQUIRED,
      appId: GITHUB_ACTIONS_APP_ID,
      acceptedConclusions: ["success"],
      blockingAliases: MISSING_REVIEW_CREDENTIALS,
      alternatives: options.allowManualReview
        ? [{
            aliases: MANUAL_REVIEW_REQUIRED,
            appId: GITHUB_ACTIONS_APP_ID,
            acceptedConclusions: ["success"],
          }]
        : [],
    });
  }
  return aliases;
}

function mergeableIsConflict(prDetails) {
  const mergeable = String(prDetails.mergeable || "").toUpperCase();
  const mergeState = String(prDetails.mergeStateStatus || "").toUpperCase();
  return mergeable === "CONFLICTING" || mergeState === "DIRTY";
}

function selectLatestCheckRuns(checkRuns) {
  const byName = new Map();

  for (const run of checkRuns) {
    const name = String(run?.name || "");
    if (!name) {
      continue;
    }

    const previous = byName.get(name);
    if (!previous) {
      byName.set(name, run);
      continue;
    }

    const currentKey = run.completed_at || run.started_at || run.created_at || "";
    const previousKey = previous.completed_at || previous.started_at || previous.created_at || "";

    if (currentKey > previousKey || (currentKey === previousKey && Number(run.id || 0) > Number(previous.id || 0))) {
      byName.set(name, run);
    }
  }

  return byName;
}

function checkRunMatchesAliases(checkRun, aliases, appId) {
  const name = String(checkRun?.name || "");
  return Number(checkRun?.app?.id) === Number(appId) && aliases.some((alias) => name === alias);
}

function normalizeRequiredCheckSpec(requiredCheck) {
  if (Array.isArray(requiredCheck)) {
    return {
      label: requiredCheck[0],
      aliases: requiredCheck,
      acceptedConclusions: ["success"],
      alternatives: [],
      blockingAliases: [],
      appId: GITHUB_ACTIONS_APP_ID,
    };
  }
  if (!requiredCheck || typeof requiredCheck !== "object" || !Array.isArray(requiredCheck.aliases)) {
    throw new Error("Required check specification is malformed.");
  }
  return {
    label: String(requiredCheck.label || requiredCheck.aliases[0] || "check"),
    aliases: requiredCheck.aliases,
    acceptedConclusions: requiredCheck.acceptedConclusions || ["success"],
    alternatives: Array.isArray(requiredCheck.alternatives) ? requiredCheck.alternatives : [],
    blockingAliases: Array.isArray(requiredCheck.blockingAliases) ? requiredCheck.blockingAliases : [],
    appId: Number(requiredCheck.appId || GITHUB_ACTIONS_APP_ID),
  };
}

function summarizeCheckCandidate(latestRuns, aliases, acceptedConclusions, appId = GITHUB_ACTIONS_APP_ID) {
  const candidates = latestRuns.filter((run) => checkRunMatchesAliases(run, aliases, appId));
  if (!candidates.length) {
    return { state: "missing", conclusion: null, run: null };
  }

  const successful = candidates.find((run) => (
    String(run?.status || "").toLowerCase() === "completed" &&
    acceptedConclusions.includes(String(run?.conclusion || "").toLowerCase())
  ));
  if (successful) {
    return {
      state: "success",
      conclusion: String(successful.conclusion || "").toLowerCase(),
      run: successful,
    };
  }

  const pending = candidates.find((run) => String(run?.status || "").toLowerCase() !== "completed");
  if (pending) {
    return {
      state: "pending",
      conclusion: String(pending.conclusion || "").toLowerCase(),
      run: pending,
    };
  }

  const failed = candidates.find((run) => {
    const conclusion = String(run?.conclusion || "").toLowerCase();
    return conclusion && conclusion !== "skipped";
  });
  if (failed) {
    return {
      state: "failed",
      conclusion: String(failed.conclusion || "").toLowerCase(),
      run: failed,
    };
  }

  return {
    state: "missing",
    conclusion: "skipped",
    run: candidates[0],
  };
}

function summarizeRequiredCheckRuns(checkRuns, requiredAliases) {
  const latestByName = selectLatestCheckRuns(checkRuns);
  const summaries = [];

  const latestRuns = [...latestByName.values()];
  for (const requiredCheck of requiredAliases) {
    const spec = normalizeRequiredCheckSpec(requiredCheck);
    const blocker = summarizeCheckCandidate(latestRuns, spec.blockingAliases, [], spec.appId);
    if (blocker.state === "failed" || blocker.state === "pending") {
      summaries.push({ label: spec.label, ...blocker });
      continue;
    }
    const primary = summarizeCheckCandidate(latestRuns, spec.aliases, spec.acceptedConclusions, spec.appId);
    if (primary.state === "success" || primary.state === "failed" || primary.state === "pending") {
      summaries.push({ label: spec.label, ...primary });
      continue;
    }

    let alternativeSummary = null;
    for (const alternative of spec.alternatives) {
      const candidate = summarizeCheckCandidate(
        latestRuns,
        alternative.aliases || [],
        alternative.acceptedConclusions || ["success"],
        Number(alternative.appId || spec.appId),
      );
      if (candidate.state === "success") {
        alternativeSummary = candidate;
        break;
      }
      if (!alternativeSummary || candidate.state === "pending" || candidate.state === "failed") {
        alternativeSummary = candidate;
      }
    }
    if (!spec.alternatives.length && primary.conclusion === "skipped") {
      summaries.push({ label: spec.label, ...primary, state: "failed" });
    } else {
      summaries.push({ label: spec.label, ...(alternativeSummary || primary) });
    }
  }

  return summaries;
}

function formatCheckSummary(summaries) {
  return summaries
    .map((summary) => {
      if (summary.state === "success") {
        return `${summary.label}: ${summary.conclusion || "success"}`;
      }
      if (summary.state === "pending") {
        return `${summary.label}: pending (${summary.conclusion || "in progress"})`;
      }
      if (summary.state === "failed") {
        return `${summary.label}: failed (${summary.conclusion || "unknown"})`;
      }
      return `${summary.label}: missing`;
    })
    .join(", ");
}

function listActionRequiredRuns(projectRoot, repoSlug, headSha) {
  const payload = runGhApiJson(projectRoot, [
    `repos/${repoSlug}/actions/runs?head_sha=${headSha}&status=action_required&per_page=100`,
  ]);

  const runs = (Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [])
    .filter((run) => Number.isInteger(Number(run?.id)));
  const seen = new Set();
  return runs.filter((run) => {
    const id = Number(run.id);
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function listWorkflowDefinitions(projectRoot, repoSlug) {
  const payload = runGhApiJson(projectRoot, [
    `repos/${repoSlug}/actions/workflows?per_page=100`,
  ]);
  return Array.isArray(payload?.workflows) ? payload.workflows : [];
}

function validateActionRequiredRuns(
  runs,
  workflows,
  prNumber,
  headSha,
  allowedWorkflowPaths = APPROVAL_WORKFLOW_PATHS,
  prIdentity = null,
) {
  const workflowById = new Map(
    workflows
      .filter((workflow) => Number.isInteger(Number(workflow?.id)))
      .map((workflow) => [Number(workflow.id), workflow]),
  );
  const validated = [];

  for (const run of runs) {
    const runId = Number(run?.id);
    const workflowId = Number(run?.workflow_id);
    const runPath = typeof run?.path === "string" ? run.path : "";
    const workflow = workflowById.get(workflowId);
    const prNumbers = Array.isArray(run?.pull_requests)
      ? run.pull_requests.map((entry) => Number(entry?.number)).filter(Number.isInteger)
      : [];
    const reasons = [];

    if (!Number.isInteger(runId) || runId <= 0) {
      reasons.push("missing run ID");
    }
    if (!workflow || !Number.isInteger(workflowId)) {
      reasons.push("workflow ID is not present in the trusted workflow inventory");
    }
    if (!allowedWorkflowPaths.has(runPath)) {
      reasons.push(`workflow path ${runPath || "<missing>"} is not allowlisted`);
    }
    if (workflow && (workflow.path !== runPath || !allowedWorkflowPaths.has(workflow.path))) {
      reasons.push("workflow ID/path mapping does not match the allowlist");
    }
    if (workflow && workflow.state !== "active") {
      reasons.push(`workflow is not active (${workflow.state || "missing state"})`);
    }
    if (run?.event !== "pull_request") {
      reasons.push(`event is ${run?.event || "missing"}, not pull_request`);
    }
    if (run?.head_sha !== headSha) {
      reasons.push("head SHA does not match the captured pull request head");
    }
    if (!prNumbers.includes(prNumber)) {
      const identityValues = [
        run?.head_branch,
        run?.head_repository?.full_name,
        run?.repository?.full_name,
        prIdentity?.headRefName,
        prIdentity?.headRepository,
        prIdentity?.baseRepository,
      ];
      const canBindEmptyMetadata = Array.isArray(run?.pull_requests)
        && run.pull_requests.length === 0
        && identityValues.every((value) => typeof value === "string" && value.length > 0)
        && run?.head_branch === prIdentity.headRefName
        && run?.head_repository?.full_name === prIdentity.headRepository
        && run?.repository?.full_name === prIdentity.baseRepository;
      if (!canBindEmptyMetadata) {
        reasons.push(`pull request metadata does not contain #${prNumber} and the exact fork identity does not match`);
      }
    }
    if (reasons.length) {
      throw new Error(`Refusing workflow run ${runId || "<unknown>"}: ${reasons.join("; ")}.`);
    }
    validated.push(run);
  }

  return validated;
}

function approveWorkflowRun(projectRoot, repoSlug, run) {
  runCommand(
    "gh",
    ["api", "-X", "POST", `repos/${repoSlug}/actions/runs/${run.id}/approve`],
    projectRoot,
  );
}

function approveActionRequiredRuns(projectRoot, repoSlug, prDetails, options = {}) {
  const prNumber = Number(prDetails?.number);
  const tuple = pullRequestTuple(prDetails);
  const { baseOid, headOid } = tuple;
  const dependencies = options.dependencies || {};
  const fetchObjects = dependencies.fetchPullRequestObjects || fetchPullRequestObjects;
  const getMergeBase = dependencies.resolveMergeBase || resolveMergeBase;
  const readRecords = dependencies.readRawChangeRecords || readRawChangeRecords;
  const getSizes = dependencies.resolveBlobSizes || resolveBlobSizes;
  const classifyRecords = dependencies.classifyChangeRecords || classifyChangeRecords;
  const recomputeEvidence = dependencies.recomputeChangedSkillEvidence || recomputeChangedSkillEvidence;
  const getCurrentDetails = dependencies.loadPullRequestDetails || loadPullRequestDetails;
  const getRuns = dependencies.listActionRequiredRuns || listActionRequiredRuns;
  const getWorkflows = dependencies.listWorkflowDefinitions || listWorkflowDefinitions;
  const approveRun = dependencies.approveWorkflowRun || approveWorkflowRun;

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error("Pull request number is required for workflow approval.");
  }

  fetchObjects(projectRoot, baseOid, headOid, dependencies);
  const mergeBaseOid = getMergeBase(projectRoot, baseOid, headOid, dependencies);
  const records = readRecords(projectRoot, mergeBaseOid, headOid, dependencies);
  const preliminaryPolicy = classifyRecords(records, { requireBlobSizes: false });
  if (!preliminaryPolicy?.approvalSafe) {
    const reasons = Array.isArray(preliminaryPolicy?.reasons) && preliminaryPolicy.reasons.length
      ? preliminaryPolicy.reasons.slice(0, 12).join(", ")
      : "unclassified local diff";
    throw new Error(`PR #${prNumber} local base-to-head diff is not fork-approval-safe: ${reasons}.`);
  }
  const blobSizes = getSizes(projectRoot, records, dependencies);
  const policy = classifyRecords(records, { blobSizes });
  if (!policy?.approvalSafe) {
    const reasons = Array.isArray(policy?.reasons) && policy.reasons.length
      ? policy.reasons.slice(0, 12).join(", ")
      : "unclassified local diff";
    throw new Error(`PR #${prNumber} local base-to-head diff is not fork-approval-safe: ${reasons}.`);
  }

  const evaluatorOid = assertFullSha(
    options.evaluatorOid || dependencies.getEvaluatorOid?.(projectRoot),
    "Trusted evaluator SHA",
  );
  const evidence = recomputeEvidence(
    projectRoot,
    { evaluatorOid, mergeBaseOid, headOid, rawRecords: records },
    dependencies,
  );
  if (evidence.blocking) {
    const reasons = evidence.reasons.slice(0, 12).join(", ") || "unspecified regression";
    throw new Error(`PR #${prNumber} trusted changed-skill evidence is blocking: ${reasons}.`);
  }

  const reviewedHeads = new Set(options.reviewedHeads || []);
  if (policy.requiresHumanReview && !reviewedHeads.has(headOid)) {
    throw new Error(
      `PR #${prNumber} changes canonical skill content. Re-run with --reviewed-head ${headOid} after reviewing that exact full SHA.`,
    );
  }

  const workflows = getWorkflows(projectRoot, repoSlug);
  const runs = getRuns(projectRoot, repoSlug, headOid);
  const validatedRuns = validateActionRequiredRuns(
    runs,
    workflows,
    prNumber,
    headOid,
    options.allowedWorkflowPaths || APPROVAL_WORKFLOW_PATHS,
    {
      headRefName: prDetails.headRefName,
      headRepository: prDetails.headRepository?.nameWithOwner,
      baseRepository: repoSlug,
    },
  );

  assertUnchangedTuple(
    getCurrentDetails(projectRoot, repoSlug, prNumber),
    tuple,
    "before approvals",
    prNumber,
  );
  if (!options.dryRun) {
    for (const run of validatedRuns) {
      approveRun(projectRoot, repoSlug, run);
    }
  }
  assertUnchangedTuple(
    getCurrentDetails(projectRoot, repoSlug, prNumber),
    tuple,
    "after approvals",
    prNumber,
  );

  return {
    tuple,
    evaluatorOid,
    mergeBaseOid,
    evidence,
    records,
    policy,
    runs: validatedRuns,
    approvedRuns: options.dryRun ? [] : validatedRuns,
  };
}

function listCheckRuns(projectRoot, repoSlug, headSha) {
  const payload = runGhApiJson(projectRoot, [
    `repos/${repoSlug}/commits/${headSha}/check-runs?per_page=100`,
  ]);
  return Array.isArray(payload?.check_runs) ? payload.check_runs : [];
}

async function waitForRequiredChecks(
  projectRoot,
  repoSlug,
  headSha,
  requiredAliases,
  pollSeconds,
  maxAttempts = 180,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const checkRuns = listCheckRuns(projectRoot, repoSlug, headSha);
    const summaries = summarizeRequiredCheckRuns(checkRuns, requiredAliases);
    const pending = summaries.filter((summary) => summary.state === "pending" || summary.state === "missing");
    const failed = summaries.filter((summary) => summary.state === "failed");

    console.log(`[merge-batch] Checks for ${headSha}: ${formatCheckSummary(summaries)}`);

    if (failed.length) {
      throw new Error(
        `Required checks failed for ${headSha}: ${failed.map((item) => `${item.label} (${item.conclusion || "failed"})`).join(", ")}`,
      );
    }

    if (!pending.length) {
      return summaries;
    }

    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
  }

  throw new Error(`Timed out waiting for required checks on ${headSha}.`);
}

function patchPrBody(projectRoot, repoSlug, prNumber, body) {
  const payload = JSON.stringify({ body });
  runCommand(
    "gh",
    ["api", `repos/${repoSlug}/pulls/${prNumber}`, "-X", "PATCH", "--input", "-"],
    projectRoot,
    { input: payload },
  );
}

function closeAndReopenPr(projectRoot, prNumber) {
  runCommand("gh", ["pr", "close", String(prNumber), "--comment", REOPEN_COMMENT], projectRoot);
  runCommand("gh", ["pr", "reopen", String(prNumber)], projectRoot);
}

function mergePullRequestImmediately(projectRoot, repoSlug, prDetails, dependencies = {}) {
  const execute = dependencies.runCommand || runCommand;
  const headOid = assertFullSha(prDetails?.headRefOid, `PR #${prDetails?.number} head SHA`);
  const payload = JSON.stringify({
    merge_method: "squash",
    sha: headOid,
    commit_title: buildSquashMergeSubject(prDetails),
    commit_message: buildSquashMergeBody(prDetails),
  });
  const stdout = execute(
    "gh",
    ["api", `repos/${repoSlug}/pulls/${prDetails.number}/merge`, "-X", "PUT", "--input", "-"],
    projectRoot,
    { capture: true, input: payload },
  );
  let response;
  try {
    response = JSON.parse(stdout || "null");
  } catch (error) {
    throw new Error(`PR #${prDetails.number} merge endpoint returned invalid JSON: ${error.message}`);
  }
  if (response?.merged !== true || !FULL_SHA_PATTERN.test(String(response?.sha || ""))) {
    throw new Error(
      `PR #${prDetails.number} was not merged immediately: ${response?.message || "merge endpoint returned merged=false"}.`,
    );
  }
  return response;
}

function isRetryableMergeError(error) {
  const message = String(error?.message || error || "");
  return BASE_BRANCH_MODIFIED_PATTERNS.some((pattern) => pattern.test(message));
}

function gitCheckoutMain(projectRoot) {
  runCommand("git", ["checkout", "main"], projectRoot);
}

function gitPullMain(projectRoot) {
  runCommand("git", ["pull", "--ff-only", "origin", "main"], projectRoot);
}

async function mergePullRequest(projectRoot, repoSlug, prNumber, options) {
  const template = loadPullRequestTemplate(projectRoot);
  let prDetails = loadPullRequestDetails(projectRoot, repoSlug, prNumber);

  console.log(`[merge-batch] PR #${prNumber}: ${prDetails.title}`);

  if (mergeableIsConflict(prDetails)) {
    throw new Error(`PR #${prNumber} is in conflict state; resolve conflicts on the PR branch before merging.`);
  }

  let bodyRefreshed = false;
  if (needsBodyRefresh(prDetails)) {
    const normalizedBody = normalizePrBody(prDetails.body, template);
    if (!options.dryRun) {
      patchPrBody(projectRoot, repoSlug, prNumber, normalizedBody);
      closeAndReopenPr(projectRoot, prNumber);
    }
    bodyRefreshed = true;
    console.log(`[merge-batch] PR #${prNumber}: refreshed PR body and retriggered checks.`);
    prDetails = loadPullRequestDetails(projectRoot, repoSlug, prNumber);
  }

  const approval = approveActionRequiredRuns(projectRoot, repoSlug, prDetails, {
    dryRun: options.dryRun,
    evaluatorOid: options.evaluatorOid,
    reviewedHeads: options.reviewedHeads,
    dependencies: options.approvalDependencies,
  });
  const headSha = prDetails.headRefOid;
  const approvedRuns = approval.approvedRuns;
  // The Skill Review workflow is path-filtered to SKILL.md. Supporting skill
  // content still requires exact-head human attestation, but has no review
  // check run to wait for.
  prDetails.hasSkillChanges = approval.policy.canonicalSkillChanges.length > 0;
  if (approvedRuns.length) {
    console.log(
      `[merge-batch] PR #${prNumber}: approved ${approvedRuns.length} fork run(s) waiting on action_required.`,
    );
  }

  const requiredCheckAliases = getRequiredCheckAliases(prDetails, {
    allowManualReview: approval.policy.requiresHumanReview &&
      new Set(options.reviewedHeads || []).has(headSha),
  });
  if (!options.dryRun) {
    await waitForRequiredChecks(projectRoot, repoSlug, headSha, requiredCheckAliases, options.pollSeconds);
  }

  if (options.dryRun) {
    console.log(`[merge-batch] PR #${prNumber}: dry run complete, skipping merge and post-merge sync.`);
    return {
      prNumber,
      bodyRefreshed,
      merged: false,
      approvedRuns: [],
      followUp: { changed: false },
    };
  }

  assertUnchangedTuple(
    loadPullRequestDetails(projectRoot, repoSlug, prNumber),
    approval.tuple,
    "immediately before merge",
    prNumber,
  );
  assertEffectiveMainProtection(
    projectRoot,
    repoSlug,
    options.protectionDependencies,
  );
  mergePullRequestImmediately(projectRoot, repoSlug, prDetails, options.mergeDependencies);
  const merged = true;

  console.log(`[merge-batch] PR #${prNumber}: merged.`);

  gitCheckoutMain(projectRoot);
  gitPullMain(projectRoot);
  const followUp = { changed: false, delegatedToCanonicalSync: true };
  console.log(`[merge-batch] PR #${prNumber}: canonical artifacts and contributor credits delegated to the protected bot PR lane.`);

  return {
    prNumber,
    bodyRefreshed,
    merged,
    approvedRuns: approvedRuns.map((run) => run.id),
    followUp,
  };
}

async function runBatch(projectRoot, prNumbers, options = {}) {
  const repoSlug = readRepositorySlug(projectRoot);
  const results = [];

  const evaluatorOid = ensureTrustedMain(projectRoot, options.mainDependencies);
  if (!options.dryRun) {
    assertEffectiveMainProtection(projectRoot, repoSlug, options.protectionDependencies);
  }

  for (const prNumber of prNumbers) {
    const result = await mergePullRequest(projectRoot, repoSlug, prNumber, {
      ...options,
      evaluatorOid,
    });
    results.push(result);
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = findProjectRoot(__dirname);
  const prNumbers = parsePrList(args.prs);

  if (args.dryRun) {
    console.log(`[merge-batch] Dry run for PRs: ${prNumbers.join(", ")}`);
  }

  const results = await runBatch(projectRoot, prNumbers, {
    dryRun: args.dryRun,
    pollSeconds: args.pollSeconds,
    reviewedHeads: args.reviewedHeads,
  });

  console.log(
    `[merge-batch] Completed ${results.length} PR(s): ${results.map((result) => `#${result.prNumber}`).join(", ")}`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[merge-batch] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  approvalWorkflowPaths: APPROVAL_WORKFLOW_PATHS,
  approveActionRequiredRuns,
  approveWorkflowRun,
  assertEffectiveMainProtection,
  assertFullSha,
  assertUnchangedTuple,
  baseBranchModifiedPatterns: BASE_BRANCH_MODIFIED_PATTERNS,
  buildSquashMergeBody,
  buildSquashMergeSubject,
  checkRunMatchesAliases,
  closeAndReopenPr,
  ensureOnMainAndClean,
  ensureTrustedMain,
  extractSummaryBlock,
  extractTemplateSections,
  formatCheckSummary,
  fetchPullRequestObjects,
  getRequiredCheckAliases,
  gitCheckoutMain,
  gitPullMain,
  isRetryableMergeError,
  listActionRequiredRuns,
  listCheckRuns,
  listWorkflowDefinitions,
  loadEffectiveMainProtection,
  loadPullRequestDetails,
  loadPullRequestTemplate,
  mergePullRequest,
  mergePullRequestImmediately,
  mergeableIsConflict,
  normalizePrBody,
  parseArgs,
  parsePrList,
  parseRawDiff,
  pullRequestTuple,
  readRawChangeRecords,
  readRepositorySlug,
  recomputeChangedSkillEvidence,
  resolveMergeBase,
  rulesetAppliesToMain,
  runCommand,
  runCommandBuffer,
  runBatch,
  selectLatestCheckRuns,
  stripDisallowedCoauthorTrailers,
  summarizeRequiredCheckRuns,
  validateActionRequiredRuns,
  validateChangedSkillEvidence,
  validateEffectiveMainProtection,
  waitForRequiredChecks,
  resolveBlobSizes,
};
