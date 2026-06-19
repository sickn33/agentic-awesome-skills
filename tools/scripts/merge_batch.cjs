#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { findProjectRoot } = require("../lib/project-root");
const {
  hasQualityChecklist,
  normalizeRepoPath,
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
  ["pr-policy", ["pr-policy"]],
  ["source-validation", ["source-validation"]],
  ["artifact-preview", ["artifact-preview"]],
];
const SKILL_REVIEW_REQUIRED = ["review", "Skill Review & Optimize", "Skill Review & Optimize / review"];
const DISALLOWED_COAUTHOR_TRAILER_PATTERNS = [
  /<noreply@anthropic\.com>/i,
  /:\s*claude\b/i,
  /:\s*claude\s+sonnet\b/i,
];

function parseArgs(argv) {
  const args = {
    prs: null,
    pollSeconds: DEFAULT_POLL_SECONDS,
    dryRun: false,
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
    }
  }

  if (typeof args.pollSeconds !== "number" || Number.isNaN(args.pollSeconds) || args.pollSeconds <= 0) {
    args.pollSeconds = DEFAULT_POLL_SECONDS;
  }

  return args;
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
      "mergeStateStatus",
      "mergeable",
      "number",
      "title",
      "headRefOid",
      "url",
    ].join(","),
  });

  const filesPayload = runGhApiJson(projectRoot, [
    `repos/${repoSlug}/pulls/${prNumber}/files?per_page=100`,
  ], {
    paginate: true,
    slurp: true,
  });

  const files = flattenGhSlurpPayload(filesPayload)
    .map((entry) => normalizeRepoPath(entry?.filename))
    .filter(Boolean);

  return {
    ...details,
    files,
    hasSkillChanges: files.some((filePath) => filePath.endsWith("/SKILL.md") || filePath === "SKILL.md"),
  };
}

function needsBodyRefresh(prDetails) {
  return !hasQualityChecklist(prDetails.body);
}

function getRequiredCheckAliases(prDetails) {
  const aliases = REQUIRED_CHECKS.map(([, value]) => value);
  if (prDetails.hasSkillChanges) {
    aliases.push(SKILL_REVIEW_REQUIRED);
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

function checkRunMatchesAliases(checkRun, aliases) {
  const name = String(checkRun?.name || "");
  return aliases.some((alias) => name === alias || name.endsWith(` / ${alias}`));
}

function summarizeRequiredCheckRuns(checkRuns, requiredAliases) {
  const latestByName = selectLatestCheckRuns(checkRuns);
  const summaries = [];

  for (const aliases of requiredAliases) {
    const latestRun = [...latestByName.values()].find((run) => checkRunMatchesAliases(run, aliases));
    const label = aliases[0];

    if (!latestRun) {
      summaries.push({ label, state: "missing", conclusion: null, run: null });
      continue;
    }

    const status = String(latestRun.status || "").toLowerCase();
    const conclusion = String(latestRun.conclusion || "").toLowerCase();
    if (status !== "completed") {
      summaries.push({ label, state: "pending", conclusion, run: latestRun });
      continue;
    }

    if (["success", "neutral", "skipped"].includes(conclusion)) {
      summaries.push({ label, state: "success", conclusion, run: latestRun });
      continue;
    }

    summaries.push({ label, state: "failed", conclusion, run: latestRun });
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

function getHeadSha(projectRoot, repoSlug, prNumber) {
  const details = runGhJson(projectRoot, ["pr", "view", String(prNumber)], {
    jsonFields: "headRefOid",
  });
  return details.headRefOid;
}

function listActionRequiredRuns(projectRoot, repoSlug, headSha) {
  const payload = runGhApiJson(projectRoot, [
    `repos/${repoSlug}/actions/runs?head_sha=${headSha}&status=action_required&per_page=100`,
  ], {
    paginate: true,
    slurp: true,
  });

  const runs = flattenGhSlurpPayload(payload).filter((run) => Number.isInteger(Number(run?.id)));
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

function approveActionRequiredRuns(projectRoot, repoSlug, headSha) {
  const runs = listActionRequiredRuns(projectRoot, repoSlug, headSha);
  for (const run of runs) {
    runCommand(
      "gh",
      ["api", "-X", "POST", `repos/${repoSlug}/actions/runs/${run.id}/approve`],
      projectRoot,
    );
  }
  return runs;
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

function syncContributors(projectRoot) {
  runCommand(
    process.execPath,
    [
      path.join(projectRoot, "tools", "scripts", "run-python.js"),
      path.join(projectRoot, "tools", "scripts", "sync_contributors.py"),
    ],
    projectRoot,
  );
}

function commitAndPushReadmeIfChanged(projectRoot) {
  const status = runCommand("git", ["status", "--porcelain", "--untracked-files=no"], projectRoot, {
    capture: true,
  });

  if (!status) {
    return { changed: false };
  }

  const lines = status.split(/\r?\n/).filter(Boolean);
  const unexpected = lines.filter((line) => !line.includes("README.md"));
  if (unexpected.length) {
    throw new Error(`merge-batch expected sync:contributors to touch README.md only. Unexpected drift: ${unexpected.join(", ")}`);
  }

  runCommand("git", ["add", "README.md"], projectRoot);
  const staged = runCommand("git", ["diff", "--cached", "--name-only"], projectRoot, { capture: true });
  if (!staged.includes("README.md")) {
    return { changed: false };
  }

  runCommand("git", ["commit", "-m", "chore: sync contributor credits after merge batch"], projectRoot);
  runCommand("git", ["push", "origin", "main"], projectRoot);
  return { changed: true };
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

  const headSha = getHeadSha(projectRoot, repoSlug, prNumber);
  const approvedRuns = options.dryRun ? [] : approveActionRequiredRuns(projectRoot, repoSlug, headSha);
  if (approvedRuns.length) {
    console.log(
      `[merge-batch] PR #${prNumber}: approved ${approvedRuns.length} fork run(s) waiting on action_required.`,
    );
  }

  const requiredCheckAliases = getRequiredCheckAliases(prDetails);
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

  let merged = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      if (!options.dryRun) {
        runCommand(
          "gh",
          [
            "pr",
            "merge",
            String(prNumber),
            "--squash",
            "--subject",
            buildSquashMergeSubject(prDetails),
            "--body",
            buildSquashMergeBody(prDetails),
          ],
          projectRoot,
        );
      }
      merged = true;
      break;
    } catch (error) {
      if (!isRetryableMergeError(error) || attempt === 3) {
        throw error;
      }

      console.log(`[merge-batch] PR #${prNumber}: base branch changed, refreshing main and retrying merge.`);
      gitCheckoutMain(projectRoot);
      gitPullMain(projectRoot);
      prDetails = loadPullRequestDetails(projectRoot, repoSlug, prNumber);
      const refreshedSha = prDetails.headRefOid || headSha;
      if (!options.dryRun) {
        await waitForRequiredChecks(projectRoot, repoSlug, refreshedSha, requiredCheckAliases, options.pollSeconds);
      }
    }
  }

  if (!merged) {
    throw new Error(`Failed to merge PR #${prNumber}.`);
  }

  console.log(`[merge-batch] PR #${prNumber}: merged.`);

  gitCheckoutMain(projectRoot);
  gitPullMain(projectRoot);
  syncContributors(projectRoot);

  const followUp = commitAndPushReadmeIfChanged(projectRoot);
  if (followUp.changed) {
    console.log(`[merge-batch] PR #${prNumber}: README follow-up committed and pushed.`);
  }

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

  ensureOnMainAndClean(projectRoot);

  for (const prNumber of prNumbers) {
    const result = await mergePullRequest(projectRoot, repoSlug, prNumber, options);
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
  approveActionRequiredRuns,
  baseBranchModifiedPatterns: BASE_BRANCH_MODIFIED_PATTERNS,
  buildSquashMergeBody,
  buildSquashMergeSubject,
  checkRunMatchesAliases,
  closeAndReopenPr,
  commitAndPushReadmeIfChanged,
  ensureOnMainAndClean,
  extractSummaryBlock,
  extractTemplateSections,
  formatCheckSummary,
  getRequiredCheckAliases,
  gitCheckoutMain,
  gitPullMain,
  isRetryableMergeError,
  listActionRequiredRuns,
  listCheckRuns,
  loadPullRequestDetails,
  loadPullRequestTemplate,
  mergePullRequest,
  mergeableIsConflict,
  normalizePrBody,
  parseArgs,
  parsePrList,
  readRepositorySlug,
  runCommand,
  runBatch,
  selectLatestCheckRuns,
  stripDisallowedCoauthorTrailers,
  summarizeRequiredCheckRuns,
  waitForRequiredChecks,
};
