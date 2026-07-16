#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { findProjectRoot } = require("../lib/project-root");
const {
  extractChangelogSection,
  getManagedFiles,
  loadWorkflowContract,
} = require("../lib/workflow-contract");

function parseArgs(argv) {
  const [command, version] = argv;
  return {
    command,
    version: version || null,
  };
}

function runCommand(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: options.shell ?? process.platform === "win32",
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

function ensureOnMain(projectRoot) {
  const currentBranch = runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], projectRoot, {
    capture: true,
  });
  if (currentBranch !== "main") {
    throw new Error(`Release workflow must run from main. Current branch: ${currentBranch}`);
  }
}

function ensureCleanWorkingTree(projectRoot, message) {
  const status = runCommand("git", ["status", "--porcelain"], projectRoot, {
    capture: true,
  });

  if (status) {
    throw new Error(message || "Working tree has changes. Commit, stash, or remove them first.");
  }
}

function ensureTagMissing(projectRoot, tagName) {
  const result = spawnSync("git", ["rev-parse", "--verify", tagName], {
    cwd: projectRoot,
    stdio: "ignore",
  });

  if (result.status === 0) {
    throw new Error(`Tag ${tagName} already exists.`);
  }
}

function githubReleaseExists(projectRoot, tagName) {
  const result = spawnSync("gh", ["release", "view", tagName], {
    cwd: projectRoot,
    stdio: "ignore",
  });
  return result.status === 0;
}

function localTagTarget(projectRoot, tagName) {
  const result = spawnSync("git", ["rev-list", "-n", "1", tagName], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function remoteTagTarget(projectRoot, tagName) {
  const output = runCommand(
    "git",
    ["ls-remote", "--tags", "origin", `refs/tags/${tagName}`],
    projectRoot,
    { capture: true },
  );
  return output ? output.split(/\s+/u)[0] : null;
}

function selectMergedReleaseCandidate(pullRequests, version) {
  const branch = `release/v${version}`;
  const matches = pullRequests.filter((pr) => (
    pr.headRefName === branch && pr.baseRefName === "main" && /^[0-9a-f]{40}$/u.test(String(pr.mergeCommit?.oid || ""))
  ));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one merged protected release PR for ${branch}.`);
  }
  return matches[0];
}

function mergedReleaseCandidate(projectRoot, version) {
  const branch = `release/v${version}`;
  const payload = runCommand(
    "gh",
    [
      "pr",
      "list",
      "--state",
      "merged",
      "--head",
      branch,
      "--limit",
      "10",
      "--json",
      "number,headRefName,baseRefName,mergeCommit",
    ],
    projectRoot,
    { capture: true },
  );
  return selectMergedReleaseCandidate(JSON.parse(payload || "[]"), version);
}

function validateReleaseSuccessors(projectRoot, releaseCommit, headCommit, dependencies = {}) {
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", releaseCommit, headCommit], {
    cwd: projectRoot,
    stdio: "ignore",
  });
  if (ancestor.status !== 0) {
    throw new Error("The merged release candidate is not an ancestor of protected main.");
  }
  if (releaseCommit === headCommit) return true;

  const commits = runCommand("git", ["rev-list", "--reverse", `${releaseCommit}..${headCommit}`], projectRoot, {
    capture: true,
  }).split(/\r?\n/u).filter(Boolean);
  for (const commit of commits) {
    const subject = runCommand("git", ["show", "-s", "--format=%s", commit], projectRoot, { capture: true });
    if (subject !== "chore: synchronize canonical repository state") {
      throw new Error(`Unexpected commit ${commit} landed after the release candidate: ${subject}`);
    }
  }
  const validateManagedRange = dependencies.validateManagedRange || (() => {
    runCommand(
      process.execPath,
      [
        path.join(projectRoot, "tools", "scripts", "validate_canonical_sync_pr.cjs"),
        "--base",
        releaseCommit,
        "--head",
        headCommit,
      ],
      projectRoot,
    );
  });
  validateManagedRange();
  return true;
}

function readPackageVersion(projectRoot) {
  const packagePath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  return packageJson.version;
}

function ensureChangelogSection(projectRoot, version) {
  const changelogPath = path.join(projectRoot, "CHANGELOG.md");
  const changelogContent = fs.readFileSync(changelogPath, "utf8");
  return extractChangelogSection(changelogContent, version);
}

function writeReleaseNotes(projectRoot, version, sectionContent) {
  const releaseNotesDir = path.join(projectRoot, ".tmp", "releases");
  const notesPath = path.join(releaseNotesDir, `v${version}.md`);
  fs.mkdirSync(releaseNotesDir, { recursive: true });
  fs.writeFileSync(notesPath, sectionContent, "utf8");
  return notesPath;
}

function runReleaseSuite(projectRoot) {
  runCommand("npm", ["run", "validate:references"], projectRoot);
  runCommand("npm", ["run", "sync:release-state"], projectRoot);
  runCommand("npm", ["run", "test"], projectRoot);
  runCommand("npm", ["run", "app:install"], projectRoot);
  runCommand("npm", ["run", "app:build"], projectRoot);
  runCommand("npm", ["pack", "--dry-run", "--json"], projectRoot);
}

function runReleasePreflight(projectRoot) {
  ensureOnMain(projectRoot);
  ensureCleanWorkingTree(projectRoot, "release:preflight requires a clean tracked working tree.");
  const version = readPackageVersion(projectRoot);
  ensureChangelogSection(projectRoot, version);
  runReleaseSuite(projectRoot);
  ensureCleanWorkingTree(
    projectRoot,
    "release:preflight left tracked changes. Sync and commit them before releasing.",
  );
  console.log(`[release] Preflight passed for version ${version}.`);
}

function stageReleaseFiles(projectRoot, contract) {
  const filesToStage = getManagedFiles(contract, {
    includeMixed: true,
    includeReleaseManaged: true,
  });

  const claudePluginFiles = [
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
  ].filter((filePath) => fs.existsSync(path.join(projectRoot, filePath)));

  const pluginsDir = path.join(projectRoot, "plugins");
  const codexPluginFiles = fs.existsSync(pluginsDir)
    ? fs
        .readdirSync(pluginsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join("plugins", entry.name, ".codex-plugin", "plugin.json"))
        .filter((filePath) => fs.existsSync(path.join(projectRoot, filePath)))
    : [];

  filesToStage.push(...claudePluginFiles, ...codexPluginFiles);
  runCommand("git", ["add", ...filesToStage], projectRoot);
}

function prepareRelease(projectRoot, version) {
  if (!version) {
    throw new Error("Usage: npm run release:prepare -- X.Y.Z");
  }

  ensureOnMain(projectRoot);
  ensureCleanWorkingTree(projectRoot, "release:prepare requires a clean tracked working tree.");
  ensureTagMissing(projectRoot, `v${version}`);
  ensureChangelogSection(projectRoot, version);
  const releaseBranch = `release/v${version}`;
  runCommand("git", ["switch", "-c", releaseBranch], projectRoot);

  const currentVersion = readPackageVersion(projectRoot);
  if (currentVersion !== version) {
    runCommand("npm", ["version", version, "--no-git-tag-version"], projectRoot);
  } else {
    console.log(`[release] package.json already set to ${version}; keeping current version.`);
  }

  runCommand(
    "npm",
    ["run", "sync:metadata", "--", "--refresh-volatile"],
    projectRoot,
  );
  // Volatile metadata is an input to catalog timestamps. Refresh it before the
  // canonical release sync so the tagged tree is exactly what publish CI will
  // regenerate and verify.
  runReleaseSuite(projectRoot);

  const refreshedReleaseNotes = ensureChangelogSection(projectRoot, version);
  const notesPath = writeReleaseNotes(projectRoot, version, refreshedReleaseNotes);
  const contract = loadWorkflowContract(projectRoot);
  stageReleaseFiles(projectRoot, contract);

  const stagedFiles = runCommand("git", ["diff", "--cached", "--name-only"], projectRoot, {
    capture: true,
  });
  if (!stagedFiles) {
    throw new Error("release:prepare did not stage any files. Nothing to commit.");
  }

  runCommand("git", ["commit", "-m", `chore: release v${version}`], projectRoot);
  runCommand("git", ["push", "-u", "origin", releaseBranch], projectRoot);
  runCommand(
    "gh",
    [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      releaseBranch,
      "--title",
      `chore: release v${version}`,
      "--body",
      [
        `Prepare protected release v${version}.`,
        "",
        "## Quality Bar Checklist",
        "",
        "- [x] Release suite and package dry run passed locally.",
        "- [x] Canonical release artifacts are included intentionally.",
        "- [x] Publishing remains separate until this PR is merged.",
      ].join("\n"),
    ],
    projectRoot,
  );

  console.log(`[release] Prepared v${version}.`);
  console.log(`[release] Notes file: ${notesPath}`);
  console.log(`[release] Next step: merge ${releaseBranch}, update local main, then run npm run release:publish -- ${version}`);
}

function publishRelease(projectRoot, version) {
  if (!version) {
    throw new Error("Usage: npm run release:publish -- X.Y.Z");
  }

  ensureOnMain(projectRoot);
  ensureCleanWorkingTree(projectRoot, "release:publish requires a clean tracked working tree.");

  const packageVersion = readPackageVersion(projectRoot);
  if (packageVersion !== version) {
    throw new Error(`package.json version ${packageVersion} does not match requested release ${version}.`);
  }

  const tagName = `v${version}`;
  const candidate = mergedReleaseCandidate(projectRoot, version);

  runCommand("git", ["fetch", "origin", "main"], projectRoot);
  const remoteMain = runCommand("git", ["rev-parse", "origin/main"], projectRoot, {
    capture: true,
  });
  const headCommit = runCommand("git", ["rev-parse", "HEAD"], projectRoot, {
    capture: true,
  });
  if (remoteMain !== headCommit) {
    throw new Error("release:publish requires local main to equal protected origin/main.");
  }
  validateReleaseSuccessors(projectRoot, candidate.mergeCommit.oid, headCommit);

  const pendingCanonical = JSON.parse(runCommand(
    "gh",
    ["pr", "list", "--state", "open", "--head", "automation/canonical-repo-state", "--json", "number"],
    projectRoot,
    { capture: true },
  ) || "[]");
  if (pendingCanonical.length > 0) {
    throw new Error("A canonical-sync PR is still open; merge it before tagging the release.");
  }

  runCommand("npm", ["run", "sync:release-state"], projectRoot);
  ensureCleanWorkingTree(projectRoot, "release:publish detected canonical release drift.");

  const notesPath = writeReleaseNotes(projectRoot, version, ensureChangelogSection(projectRoot, version));

  const existingLocalTarget = localTagTarget(projectRoot, tagName);
  if (existingLocalTarget && existingLocalTarget !== headCommit) {
    throw new Error(`Local ${tagName} points at ${existingLocalTarget}, not protected main ${headCommit}.`);
  }
  if (!existingLocalTarget) {
    runCommand("git", ["tag", tagName], projectRoot);
  }

  const existingRemoteTarget = remoteTagTarget(projectRoot, tagName);
  if (existingRemoteTarget && existingRemoteTarget !== headCommit) {
    throw new Error(`Remote ${tagName} points at ${existingRemoteTarget}, not protected main ${headCommit}.`);
  }
  if (!existingRemoteTarget) {
    runCommand("git", ["push", "origin", tagName], projectRoot);
  }

  if (githubReleaseExists(projectRoot, tagName)) {
    console.log(`[release] ${tagName} is already published.`);
    return;
  }
  runCommand("gh", ["release", "create", tagName, "--title", tagName, "--notes-file", notesPath], projectRoot);

  console.log(`[release] Published ${tagName}.`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = findProjectRoot(__dirname);

  if (args.command === "preflight") {
    runReleasePreflight(projectRoot);
    return;
  }

  if (args.command === "prepare") {
    prepareRelease(projectRoot, args.version);
    return;
  }

  if (args.command === "publish") {
    publishRelease(projectRoot, args.version);
    return;
  }

  throw new Error(
    "Usage: node tools/scripts/release_workflow.js <preflight|prepare|publish> [X.Y.Z]",
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[release] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  localTagTarget,
  remoteTagTarget,
  selectMergedReleaseCandidate,
  validateReleaseSuccessors,
};
