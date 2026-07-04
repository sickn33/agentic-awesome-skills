#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const sanitizeFilename = require("sanitize-filename");

const { findProjectRoot } = require("../lib/project-root");
const {
  classifyChangedFiles,
  getDirectDerivedChanges,
  hasIssueLink,
  hasQualityChecklist,
  loadWorkflowContract,
  normalizeRepoPath,
  requiresReferencesValidation,
} = require("../lib/workflow-contract");

function parseArgs(argv) {
  const args = {
    base: null,
    head: "HEAD",
    eventPath: null,
    checkPolicy: false,
    noRun: false,
    writeGithubOutput: false,
    writeStepSummary: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base") {
      args.base = argv[index + 1];
      index += 1;
    } else if (arg === "--head") {
      args.head = argv[index + 1];
      index += 1;
    } else if (arg === "--event-path") {
      args.eventPath = argv[index + 1];
      index += 1;
    } else if (arg === "--check-policy") {
      args.checkPolicy = true;
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

  return args;
}

function safeUserPath(pathValue, baseDir = process.cwd()) {
  if (path.isAbsolute(String(pathValue || ""))) {
    return path.resolve(pathValue);
  }

  const root = path.resolve(baseDir);
  const segments = String(pathValue || "").split(/[\\/]+/).filter(Boolean).map((segment) => {
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
    throw new Error(stderr || `git ${args.join(" ")} failed with status ${result.status}`);
  }

  return options.capture ? result.stdout.trim() : "";
}

function runCommand(command, args, cwd) {
  console.log(`[pr:preflight] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status !== "number" || result.status !== 0) {
    process.exit(result.status || 1);
  }
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

function getChangedFiles(projectRoot, baseRef, headRef) {
  if (baseRef === headRef) {
    return [];
  }

  const diffOutput = runGit(["diff", "--name-only", `${baseRef}...${headRef}`], {
    cwd: projectRoot,
    capture: true,
  });

  return [...new Set(diffOutput.split(/\r?\n/).map(normalizeRepoPath).filter(Boolean))];
}

function loadPullRequestBody(eventPath) {
  if (!eventPath) {
    return null;
  }

  const rawEvent = fs.readFileSync(safeUserPath(eventPath), "utf8");
  const event = JSON.parse(rawEvent);
  return event.pull_request?.body || "";
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
      : result.directDerivedChanges.map((filePath) => `\`${filePath}\``).join(", ");

  const lines = [
    "## PR Workflow Intake",
    "",
    `- Primary change: \`${result.primaryCategory}\``,
    `- Categories: ${result.categories.length > 0 ? result.categories.map((category) => `\`${category}\``).join(", ") : "\`none\`"}`,
    `- Changed files: ${result.changedFiles.length}`,
    `- Direct derived-file edits: ${derivedSummary}`,
    `- \`validate:references\` required: ${result.requiresReferencesValidation ? "yes" : "no"}`,
    `- PR template checklist: ${result.prBody.hasQualityChecklist ? "present" : "missing"}`,
    `- Issue auto-close link: ${result.prBody.hasIssueLink ? "detected" : "not detected"}`,
    "",
    "> Generated drift is reported separately in the artifact preview job and remains informational on pull requests.",
  ];

  fs.appendFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = findProjectRoot(__dirname);
  const contract = loadWorkflowContract(__dirname);
  const baseRef = args.base || resolveBaseRef(projectRoot);
  const changedFiles = getChangedFiles(projectRoot, baseRef, args.head);
  const classification = classifyChangedFiles(changedFiles, contract);
  const directDerivedChanges = getDirectDerivedChanges(changedFiles, contract);
  const pullRequestBody = loadPullRequestBody(args.eventPath);

  const result = {
    baseRef,
    headRef: args.head,
    changedFiles,
    categories: classification.categories,
    primaryCategory: classification.primaryCategory,
    directDerivedChanges,
    requiresReferencesValidation: requiresReferencesValidation(changedFiles, contract),
    prBody: {
      available: pullRequestBody !== null,
      hasQualityChecklist: hasQualityChecklist(pullRequestBody),
      hasIssueLink: hasIssueLink(pullRequestBody),
    },
  };

  if (args.writeGithubOutput) {
    appendGithubOutput(result);
  }

  if (args.writeStepSummary) {
    appendStepSummary(result);
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(`[pr:preflight] Base ref: ${baseRef}`);
    console.log(`[pr:preflight] Changed files: ${changedFiles.length}`);
    console.log(
      `[pr:preflight] Classification: ${result.categories.length > 0 ? result.categories.join(", ") : "none"}`,
    );
  }

  if (args.checkPolicy) {
    if (directDerivedChanges.length > 0) {
      console.error(
        [
          "Pull requests are source-only.",
          "Remove derived files from the PR and let main regenerate them after merge.",
          `Derived files detected: ${directDerivedChanges.join(", ")}`,
        ].join(" "),
      );
      process.exit(1);
    }

    if (pullRequestBody !== null && !result.prBody.hasQualityChecklist) {
      console.error("PR body must include the Quality Bar Checklist section from the template.");
      process.exit(1);
    }
  }

  if (!args.noRun) {
    runCommand("npm", ["run", "validate"], projectRoot);

    if (result.requiresReferencesValidation) {
      runCommand("npm", ["run", "validate:references"], projectRoot);
    }

    runCommand("npm", ["run", "test"], projectRoot);
  }
}

main();
