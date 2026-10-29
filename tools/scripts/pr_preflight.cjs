#!/usr/bin/env node

const fs = require("fs");
const { evaluateAdmission, admissionMessage } = require("../lib/contribution-admission");
const { buildContributorReport, formatContributorReport } = require("../lib/contributor-report");
const { classifyImpact } = require("../lib/maintenance-impact");
const { resolveLicenseContents } = require("../lib/skill-license");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const sanitizeFilename = require("sanitize-filename");
const { resolveCommandInvocation } = require("./release_workflow.js");

const { resolveBlobSizes } = require("../lib/git-blob-sizes");
const { resolveMirrorLockfileRepairs } = require("../lib/mirror-lockfile-repair");
const { findProjectRoot } = require("../lib/project-root");
const { parseRawDiff } = require("../lib/git-raw-diff");
const {
  classifyChangeRecords,
  classifyChangedFiles,
  classifyShadowImpact,
  getDirectDerivedChanges,
  hasIssueLink,
  hasQualityChecklist,
  loadWorkflowContract,
  normalizeRepoPath,
  requiresReferencesValidation,
} = require("../lib/workflow-contract");

function parseArgs(argv) {
  const args = {
    repo: null,
    base: null,
    head: "HEAD",
    eventPath: null,
    contributor: false,
    bodyFile: null,
    checkSubmission: false,
    checkPolicy: false,
    checkForkSafety: false,
    noRun: false,
    writeGithubOutput: false,
    writeStepSummary: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") {
      args.repo = argv[index + 1] || null;
      index += 1;
    } else if (arg === "--base") {
      args.base = argv[index + 1];
      index += 1;
    } else if (arg === "--head") {
      args.head = argv[index + 1];
      index += 1;
    } else if (arg === "--event-path") {
      args.eventPath = argv[index + 1];
      index += 1;
    } else if (arg === "--body-file") {
      args.bodyFile = argv[++index];
      if (!args.bodyFile || args.bodyFile.startsWith("--")) throw new Error("--body-file requires a path");
    } else if (arg === "--check-submission") {
      args.checkSubmission = true;
    } else if (arg === "--contributor") {
      args.contributor = true;
    } else if (arg === "--check-policy") {
      args.checkPolicy = true;
    } else if (arg === "--check-fork-safety") {
      args.checkForkSafety = true;
    } else if (arg === "--no-run") {
      args.noRun = true;
    } else if (arg === "--write-github-output") {
      args.writeGithubOutput = true;
    } else if (arg === "--write-step-summary") {
      args.writeStepSummary = true;
    } else if (arg === "--json") {
      args.json = true;
    }
  }

  if (args.bodyFile && args.eventPath) throw new Error("Use either --body-file or --event-path, not both.");
  if (args.contributor && !args.base) {
    throw new Error("--contributor requires --base upstream/main (fetch the official upstream main first).");
  }
  return args;
}

function safeUserPath(pathValue, baseDir = process.cwd()) {
  if (path.isAbsolute(String(pathValue || ""))) {
    return path.resolve(pathValue);
  }

  const root = path.resolve(baseDir);
  const segments = String(pathValue || "")
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((segment) => {
      const sanitized = sanitizeFilename(segment);
      if (sanitized !== segment || !sanitized) {
        throw new Error(`Unsafe path segment: ${segment}`);
      }
      return sanitized;
    });
  const target = path.resolve(root, ...segments);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes allowed directory: ${pathValue}`);
  }
  return target;
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status !== "number" || result.status !== 0) {
    const stderr = options.capture ? result.stderr.trim() : "";
    throw new Error(
      stderr || `git ${args.join(" ")} failed with status ${result.status}`,
    );
  }

  return options.capture ? result.stdout.trim() : "";
}

function resolveBaseRef(projectRoot) {
  for (const candidate of ["origin/main", "main"]) {
    const result = spawnSync("git", ["rev-parse", "--verify", candidate], {
      cwd: projectRoot,
      stdio: "ignore",
    });
    if (result.status === 0) {
      return candidate;
    }
  }

  return "HEAD";
}

function getChangeRecords(projectRoot, baseRef, headRef) {
  if (baseRef === headRef) {
    return [];
  }

  const result = spawnSync(
    "git",
    [
      "diff",
      "--raw",
      "--no-abbrev",
      "-z",
      "-M",
      "--find-copies-harder",
      `${baseRef}...${headRef}`,
      "--",
    ],
    {
      cwd: projectRoot,
      encoding: null,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (typeof result.status !== "number" || result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8").trim()
      : "";
    throw new Error(stderr || `git diff failed with status ${result.status}`);
  }
  return parseRawDiff(result.stdout, { allowEmpty: true });
}

function getChangedFiles(projectRoot, baseRef, headRef) {
  return changedFilesFromRecords(
    getChangeRecords(projectRoot, baseRef, headRef),
  );
}

function changedFilesFromRecords(records) {
  // A copy reads its origin without changing it. Renames still modify both
  // paths, and the independent fork-safety classifier retains the raw records.
  return [
    ...new Set(
      records
        .flatMap((record) =>
          record.status === "C"
            ? [record.new_path]
            : [record.old_path, record.new_path],
        )
        .filter(Boolean)
        .map(normalizeRepoPath),
    ),
  ];
}

function loadPullRequestEvent(eventPath) {
  if (!eventPath) {
    return null;
  }

  const rawEvent = fs.readFileSync(safeUserPath(eventPath), "utf8");
  return JSON.parse(rawEvent).pull_request || null;
}

const {
  resolveReviewedSkillRoots,
  resolveReviewedSupportPaths,
} = require("../lib/reviewed-fork-skills");

function evaluateForkSafety(projectRoot, changeRecords, pullRequest) {
  if (!pullRequest) {
    return {
      applicable: false,
      approvalSafe: true,
      reasons: [],
      requiresHumanReview: false,
    };
  }
  const headRepository = String(
    pullRequest?.head?.repo?.full_name || "",
  ).toLowerCase();
  const baseRepository = String(
    pullRequest?.base?.repo?.full_name || "",
  ).toLowerCase();
  if (!headRepository || !baseRepository) {
    return {
      applicable: true,
      approvalSafe: false,
      reasons: ["pull_request_repository_identity_unavailable"],
      requiresHumanReview: false,
    };
  }
  if (headRepository === baseRepository) {
    return {
      applicable: false,
      approvalSafe: true,
      reasons: [],
      requiresHumanReview: false,
    };
  }
  if (Array.isArray(changeRecords) && changeRecords.length === 0) {
    return {
      applicable: true,
      safe: true,
      sensitive: false,
      approvalSafe: true,
      reasons: [],
      paths: [],
      requiresHumanReview: false,
      canonicalSkillChanges: [],
      skillContentChanges: [],
    };
  }

  const reviewedIdentity = {
    pr: pullRequest.number,
    baseRepository: pullRequest.base.repo.full_name,
    headRepository: pullRequest.head.repo.full_name,
    head: pullRequest.head.sha,
  };
  const reviewedSkillRoots = resolveReviewedSkillRoots(
    projectRoot,
    reviewedIdentity,
  );
  const reviewedSupportPaths = resolveReviewedSupportPaths(
    projectRoot,
    reviewedIdentity,
  );
  return evaluateContributorSafety(projectRoot, changeRecords, { reviewedSkillRoots, reviewedSupportPaths });
}

function evaluateContributorSafety(projectRoot, changeRecords, policyOptions = {}) {
  const preliminary = classifyChangeRecords(changeRecords, {
    requireBlobSizes: false,
    ...policyOptions,
  });
  if (!preliminary.approvalSafe) {
    return { applicable: true, ...preliminary };
  }
  const blobSizes = resolveBlobSizes(projectRoot, changeRecords);
  return {
    applicable: true,
    ...classifyChangeRecords(changeRecords, {
      blobSizes,
      licenseContents: resolveLicenseContents(projectRoot, changeRecords),
      ...policyOptions,
    }),
  };
}

function appendGithubOutput(result) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  const lines = [
    `primary_category=${result.primaryCategory}`,
    `categories=${result.categories.join(",")}`,
    `requires_references=${String(result.requiresReferencesValidation)}`,
    `direct_derived_changes_count=${String(result.directDerivedChanges.length)}`,
    `direct_derived_changes=${JSON.stringify(result.directDerivedChanges)}`,
    `changed_files_count=${String(result.changedFiles.length)}`,
    `has_quality_checklist=${String(result.prBody.hasQualityChecklist)}`,
    `has_issue_link=${String(result.prBody.hasIssueLink)}`,
    `fork_safety_applicable=${String(result.forkSafety.applicable)}`,
    `fork_approval_safe=${String(result.forkSafety.approvalSafe)}`,
    `fork_safety_reasons=${JSON.stringify(result.forkSafety.reasons)}`,
    `impact_profile=${result.shadowImpact.profile}`,
    `validation_profile=${result.validationImpact?.profile || "full"}`,
    `impact_reasons=${JSON.stringify(result.shadowImpact.reasons)}`,
  ];

  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function appendStepSummary(result) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  const derivedSummary =
    result.directDerivedChanges.length === 0
      ? "none"
      : result.directDerivedChanges
          .map((filePath) => `\`${filePath}\``)
          .join(", ");

  const lines = [
    "## PR Workflow Intake",
    "",
    `- Primary change: \`${result.primaryCategory}\``,
    `- Categories: ${result.categories.length > 0 ? result.categories.map((category) => `\`${category}\``).join(", ") : "\`none\`"}`,
    `- Changed files: ${result.changedFiles.length}`,
    `- Direct derived-file edits: ${derivedSummary}`,
    `- Owner lockfile replicas verified: ${(result.mirrorLockfileRepairs || []).map(item => `\`${item.path}\``).join(", ") || "none"}`,
    `- \`validate:references\` required: ${result.requiresReferencesValidation ? "yes" : "no"}`,
    `- PR template checklist: ${result.prBody.hasQualityChecklist ? "present" : "missing"}`,
    `- Issue auto-close link: ${result.prBody.hasIssueLink ? "detected" : "not detected"}`,
    `- Fork approval safety: ${result.forkSafety.applicable ? (result.forkSafety.approvalSafe ? "safe" : "blocked") : "not applicable"}`,
    `- Shadow impact profile: \`${result.shadowImpact.profile}\` (observational only; no test is skipped)`,
    "",
    "> Generated drift is reported separately in the artifact preview job and remains informational on pull requests.",
  ];

  lines.push(formatContributorReport(buildContributorReport(result)));
  fs.appendFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

function localCheckCommands(result, base, head) {
  if (result.validationImpact) return [["maintenance:validate", ["--base", base, "--head", head]]];
  return [
    ["validate", []],
    ...(result.requiresReferencesValidation
      ? [["validate:references", []]]
      : []),
    ["security:docs", []],
    ["check:readme-credits", ["--base", base, "--head", head]],
    ["test", []],
  ];
}
function prepareTestPreview(root, head, execute = spawnSync, generate = true) {
  if (!/^[0-9a-f]{40}$/.test(head))
    throw new Error("Preview requires an immutable head SHA");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aas-preflight-"));
  const cleanup = () => fs.rmSync(temporary, { recursive: true, force: true });
  const output = [];
  const started = Date.now();
  try {
    for (const [command, args, cwd] of [
      ["git", ["clone", "--shared", "--no-checkout", root, temporary], root],
      ["git", ["checkout", "--detach", head], temporary],
      [
        "npm",
        [
          "ci",
          "--ignore-scripts",
          "--audit=false",
          "--cache",
          path.join(temporary, ".tmp", "npm-cache"),
        ],
        temporary,
      ],
      ...(generate ? [["npm", ["run", "chain"], temporary],
      ["npm", ["run", "sync:web-assets"], temporary]] : []),
    ]) {
      const invocation = resolveCommandInvocation(command, args);
      const result = execute(invocation.command, invocation.args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        timeout: 300000,
        shell: false,
      });
      output.push(`${result.stdout || ""}${result.stderr || ""}`);
      if (result.error || result.status !== 0)
        throw new Error(
          result.error?.message || `${command} preparation failed`,
        );
    }
    return {
      root: temporary,
      cleanup,
      preparation: {
        script: "prepare-test-preview",
        exitCode: 0,
        elapsedMs: Date.now() - started,
        output: output.join("\n"),
      },
    };
  } catch (error) {
    return {
      root: null,
      cleanup,
      preparation: {
        script: "prepare-test-preview",
        exitCode: 1,
        elapsedMs: Date.now() - started,
        output: output.join("\n") + "\n" + error.message,
      },
    };
  }
}
function runLocalChecks(
  root,
  result,
  base,
  head,
  execute = spawnSync,
  prepare = prepareTestPreview,
) {
  const checks = [];
  for (const [script, extra] of localCheckCommands(result, base, head)) {
    let preview = null;
    try {
      if (script === "test" || script === "maintenance:validate") {
        preview = prepare(root, head, execute, script === "test");
        checks.push(preview.preparation);
        if (preview.preparation.exitCode !== 0) {
          checks.push({
            script: "test",
            exitCode: 1,
            skipped: true,
            output: "Test preview preparation failed; tests were not run.",
          });
          continue;
        }
      }
      const started = Date.now();
      const invocation = resolveCommandInvocation("npm", [
        "run",
        script,
        ...(extra.length ? ["--", ...extra] : []),
      ]);
      const run = execute(invocation.command, invocation.args, {
        cwd: preview?.root || root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        shell: false,
      });
      const check = {
        script,
        exitCode: run.error ? 1 : (run.status ?? 1),
        elapsedMs: Date.now() - started,
        output: `${run.stdout || ""}${run.stderr || ""}${run.error?.message || ""}`,
      };
      checks.push(check);
      process.stderr.write(
        `[pr:preflight] ${script}: ${check.exitCode === 0 ? "passed" : "failed"}\n`,
      );
    } finally {
      preview?.cleanup();
    }
  }
  return checks;
}
function runContributorEvidence(root, base, head, execute = spawnSync) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aas-contributor-evidence-"));
  const output = path.join(temporary, "changed-skills.json");
  const started = Date.now();
  try {
    const run = execute(process.execPath, [
      path.join(__dirname, "run-python.js"),
      path.join(__dirname, "changed_skill_evidence.py"),
      "--repo", root, "--base", base, "--head", head, "--output", output,
    ], { cwd: root, encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024, shell: false });
    const evidence = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, "utf8")) : null;
    if (evidence && (evidence.base_oid !== base || evidence.head_oid !== head || typeof evidence.blocking !== "boolean")) {
      throw new Error("Changed-skill evidence does not match the selected immutable commits.");
    }
    return {
      script: "pr:evidence", elapsedMs: Date.now() - started,
      exitCode: run.error || !evidence || evidence.blocking ? 1 : (run.status ?? 1), evidence,
      output: `${run.stdout || ""}${run.stderr || ""}${run.error?.message || ""}`,
    };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
function assertCleanSnapshot(root, headOid, execute = spawnSync) {
  const head = execute("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const status = execute("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  });
  if (
    head.status !== 0 ||
    status.status !== 0 ||
    head.stdout.trim() !== headOid ||
    status.stdout.trim()
  )
    throw new Error(
      "Full preflight requires a clean committed checkout of the selected head. Commit or stash source changes, or use --repo with a clean checkout; --no-run performs classification only.",
    );
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = args.repo
    ? path.resolve(args.repo)
    : findProjectRoot(__dirname);
  const contract = loadWorkflowContract(__dirname);
  const baseRef = args.base || resolveBaseRef(projectRoot);
  const baseOid = runGit(
    ["rev-parse", "--verify", "--end-of-options", `${baseRef}^{commit}`],
    { cwd: projectRoot, capture: true },
  );
  const headOid = runGit(
    ["rev-parse", "--verify", "--end-of-options", `${args.head}^{commit}`],
    { cwd: projectRoot, capture: true },
  );
  if (!/^[0-9a-f]{40}$/.test(baseOid) || !/^[0-9a-f]{40}$/.test(headOid))
    throw new Error("Invalid immutable preflight snapshot");
  if (!args.noRun) {
    try {
      assertCleanSnapshot(projectRoot, headOid);
    } catch (error) {
      if (args.json)
        process.stdout.write(
          `${JSON.stringify({ error: "snapshot_not_clean", headOid, detail: error.message })}\n`,
        );
      else console.error(error.message);
      process.exitCode = 1;
      return;
    }
  }
  const changeRecords = getChangeRecords(projectRoot, baseOid, headOid);
  const changedFiles = changedFilesFromRecords(changeRecords);
  const classification = classifyChangedFiles(changedFiles, contract);
  const pullRequest = loadPullRequestEvent(args.eventPath);
  const mirrorLockfileRepairs = resolveMirrorLockfileRepairs(
    projectRoot, baseOid, headOid, changeRecords, pullRequest,
  );
  const repairedPaths = new Set(mirrorLockfileRepairs.map(item => item.path));
  const directDerivedChanges = getDirectDerivedChanges(changedFiles, contract)
    .filter(file => !repairedPaths.has(file));
  const pullRequestBody = args.bodyFile ? fs.readFileSync(safeUserPath(args.bodyFile), "utf8") : (pullRequest?.body ?? null);
  const forkSafety = args.contributor && !pullRequest
    ? evaluateContributorSafety(projectRoot, changeRecords)
    : evaluateForkSafety(projectRoot, changeRecords, pullRequest);
  const shadowImpact = classifyShadowImpact(changeRecords, contract);

  const result = {
    contributor: args.contributor,
    baseRef,
    baseOid,
    headOid,
    headRef: args.head,
    changeRecords,
    changedFiles,
    categories: classification.categories,
    primaryCategory: classification.primaryCategory,
    directDerivedChanges,
    mirrorLockfileRepairs,
    requiresReferencesValidation: requiresReferencesValidation(
      changedFiles,
      contract,
    ),
    forkSafety,
    shadowImpact,
    validationImpact: classifyImpact(changeRecords),
    prBody: {
      available: pullRequestBody !== null,
      body: pullRequestBody,
      hasQualityChecklist: hasQualityChecklist(pullRequestBody),
      hasIssueLink: hasIssueLink(pullRequestBody),
    },
  };

  result.contributorReport = buildContributorReport(result);

  if (args.writeGithubOutput) {
    appendGithubOutput(result);
  }

  if (args.writeStepSummary) {
    appendStepSummary(result);
  }

  if (args.json && args.noRun) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (!args.json) {
    console.log(`[pr:preflight] Base ref: ${baseRef}`);
    console.log(`[pr:preflight] Changed files: ${changedFiles.length}`);
    console.log(
      `[pr:preflight] Classification: ${result.categories.length > 0 ? result.categories.join(", ") : "none"}`,
    );
  }

  if (args.checkPolicy && pullRequestBody !== null && !result.prBody.hasQualityChecklist) {
    if (args.json && !args.noRun) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    console.error("PR body must include the Quality Bar Checklist section from the template.");
    process.exitCode = 1;
    return;
  }
  const admission = evaluateAdmission(changeRecords, pullRequestBody, pullRequestBody !== null);
  if ((args.checkSubmission || args.bodyFile) && admission.blocking) {
    if (args.json && !args.noRun) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    console.error(admissionMessage(admission));
    process.exitCode = 1;
    return;
  }
  const policyBlocked = (args.checkPolicy || args.contributor) && directDerivedChanges.length > 0;
  const forkBlocked = (args.checkForkSafety || args.contributor) && forkSafety.applicable && !forkSafety.approvalSafe;
  if (policyBlocked || forkBlocked) {
    if (policyBlocked) console.error("Pull requests are source-only. Remove derived changes; tracked snapshots refresh in protected release PRs.");
    if (forkBlocked) console.error(`Fork PR is not approval-safe: ${forkSafety.reasons.slice(0, 12).join(", ") || "unclassified diff"}.`);
    if (args.json && !args.noRun) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!args.json) console.error(formatContributorReport(result.contributorReport));
    process.exitCode = 1;
    return;
  }

  if (!args.noRun) {
    // Evaluate immutable skill trees before running candidate checks. The same
    // evaluator produces CI pr-evidence; it never executes bundled skill files.
    const evidenceCheck = args.contributor
      ? runContributorEvidence(projectRoot, baseOid, headOid)
      : null;
    const checks = evidenceCheck ? [evidenceCheck] : [];
    if (!evidenceCheck || evidenceCheck.exitCode === 0) {
      checks.push(...runLocalChecks(projectRoot, result, baseOid, headOid));
    }
    result.contributorReport = buildContributorReport(result, evidenceCheck?.evidence, checks);
    if (args.json) process.stdout.write(`${JSON.stringify({ ...result, localChecks: checks }, null, 2)}\n`);
    else {
      console.log(formatContributorReport(result.contributorReport));
      for (const check of checks.filter(check => check.exitCode !== 0)) {
        console.error(`[pr:preflight] ${check.script} output:\n${check.output}`);
      }
    }
    if (checks.some(check => check.exitCode !== 0)) process.exitCode = 1;
  } else if (!args.json) {
    console.log(formatContributorReport(result.contributorReport));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  assertCleanSnapshot,
  prepareTestPreview,
  localCheckCommands,
  runLocalChecks,
  changedFilesFromRecords,
  evaluateForkSafety,
  evaluateContributorSafety,
  runContributorEvidence,
  getChangeRecords,
  getChangedFiles,
  loadPullRequestEvent,
  parseArgs,
};
