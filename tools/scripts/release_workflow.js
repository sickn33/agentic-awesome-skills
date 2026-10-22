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
  const [command, version, ...rest] = argv;
  if (rest.length && (rest.length !== 2 || rest[0] !== '--state-dir' || !rest[1])) throw Error('Use --state-dir /absolute/private/cycle');
  return {
    command,
    version: version || null,
    stateDir: rest[1],
  };
}

function isRegularFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function resolveWindowsNpmCli(runtime = {}) {
  const execPath = runtime.execPath || process.execPath;
  const env = runtime.env || process.env;
  const candidates = [
    path.join(path.dirname(execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    env.npm_execpath,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !path.isAbsolute(candidate)) continue;
    if (path.basename(candidate).toLowerCase() !== "npm-cli.js") continue;
    if (isRegularFile(candidate)) return candidate;
  }

  throw new Error(
    "Unable to resolve npm-cli.js without a command shell. Run the release through an npm script or install npm beside node.exe.",
  );
}

function resolveCommandInvocation(command, args, runtime = {}) {
  const platform = runtime.platform || process.platform;
  const execPath = runtime.execPath || process.execPath;
  if (platform === "win32" && command === "npm") {
    return {
      command: execPath,
      args: [resolveWindowsNpmCli(runtime), ...args],
    };
  }
  return { command, args: [...args] };
}

function runCommand(command, args, cwd, options = {}) {
  const invocation = resolveCommandInvocation(command, args, options.runtime);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
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

function selectMergedReleaseCandidate(pullRequests, version, identity = {}) {
  const branch = `release/v${version}`;
  const repoSlug = String(identity.repoSlug || "").toLowerCase();
  const ownerLogin = String(identity.ownerLogin || "").toLowerCase();
  if (!repoSlug || !ownerLogin) {
    throw new Error("Release PR repository and owner identity are required.");
  }
  const matches = pullRequests.filter((pr) => (
    pr.headRefName === branch
    && pr.baseRefName === "main"
    && String(pr.headRepository?.nameWithOwner || "").toLowerCase() === repoSlug
    && String(pr.author?.login || "").toLowerCase() === ownerLogin
    && pr.title === `chore: release v${version}`
    && /^[0-9a-f]{40}$/u.test(String(pr.mergeCommit?.oid || ""))
    && Number.isFinite(Date.parse(String(pr.mergedAt || "")))
  ));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one owner-authored same-repository protected release PR for ${branch}; found ${matches.length}.`);
  }
  return matches[0];
}

function mergedReleaseCandidate(projectRoot, version) {
  const branch = `release/v${version}`;
  const repository = JSON.parse(runCommand(
    "gh",
    ["repo", "view", "--json", "nameWithOwner,owner"],
    projectRoot,
    { capture: true },
  ));
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
      "number,title,author,headRefName,headRepository,baseRefName,mergeCommit,mergedAt",
    ],
    projectRoot,
    { capture: true },
  );
  return selectMergedReleaseCandidate(JSON.parse(payload || "[]"), version, {
    repoSlug: repository.nameWithOwner,
    ownerLogin: repository.owner?.login,
  });
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
  const canonicalSyncSubjects = new Set([
    "chore: synchronize canonical repository state",
    "[skip pages] chore: synchronize canonical repository state",
  ]);
  for (const commit of commits) {
    const subject = runCommand("git", ["show", "-s", "--format=%s", commit], projectRoot, { capture: true });
    if (!canonicalSyncSubjects.has(subject)) {
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

function isPrereleaseVersion(version) {
  const match = typeof version === "string" ? version.match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u,
  ) : null;
  if (!match || match[0] !== version || (match[4] && match[4].split(".").some(part => /^0\d+$/u.test(part)))) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return Boolean(match[4]);
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
  // Source changes have already passed their protected component checks. Full
  // runtime/web/platform validation executes once on the immutable tag candidate.
  for (const script of ["sync:release-state", "validate:references", "security:docs", "plugin-compat:check", "bundles:check", "check:aas-v1-catalog"])
    runCommand("npm", ["run", script], projectRoot);
}

function runReleasePreflight(projectRoot, dependencies = {}) {
  ensureOnMain(projectRoot);
  ensureCleanWorkingTree(projectRoot, "release:preflight requires a clean tracked working tree.");
  const version = readPackageVersion(projectRoot);
  // Development main intentionally carries the last distribution snapshot.
  // Validate regeneration in an isolated clone; never tell the maintainer to
  // commit generated drift to source main or run the same suite before prepare.
  const prepare = dependencies.prepare || require("./pr_preflight.cjs").prepareTestPreview;
  const head = runCommand("git", ["rev-parse", "HEAD"], projectRoot, { capture: true }).trim();
  const preview = prepare(projectRoot, head, undefined, false);
  try {
    if (preview.preparation.exitCode || !preview.root) throw new Error(preview.preparation.output);
    (dependencies.suite || runReleaseSuite)(preview.root);
  } finally { preview.cleanup(); }
  ensureCleanWorkingTree(projectRoot, "Preflight unexpectedly changed the source checkout.");
  console.log(`[release] Isolated preflight passed for ${version}; generated preview discarded. No publication authorized.`);
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
  runCommand("git", ["add", ...filesToStage.filter(file => fs.existsSync(path.join(projectRoot, file)))], projectRoot);
}

// Prepare only: settle HEAD-dependent generated metadata before publishing a branch.
function convergePreparedRelease(projectRoot, contract, options = {}) {
  const run = options.runCommand || runCommand;
  run("npm", ["run", "sync:release-state"], projectRoot);
  stageReleaseFiles(projectRoot, contract);
  const changed = run("git", ["diff", "--cached", "--name-only"], projectRoot, { capture: true });
  if (changed) {
    // No remote branch or tag exists yet. Preserve the author date so doc lastmods settle.
    run("git", ["commit", "--amend", "--no-edit"], projectRoot);
  }
  run("npm", ["run", "sync:release-state"], projectRoot);
  ensureCleanWorkingTree(projectRoot, "Prepared release has generated or unmanaged drift; refusing to push.");
}

function prepareRelease(projectRoot, version, stateDir) {
  if (!version) {
    throw new Error("Usage: npm run release:prepare -- X.Y.Z");
  }
  isPrereleaseVersion(version);

  ensureOnMain(projectRoot);
  ensureCleanWorkingTree(projectRoot, "release:prepare requires a clean tracked working tree.");
  ensureTagMissing(projectRoot, `v${version}`);
  ensureChangelogSection(projectRoot, version);
  const cycleGate = require('./release_cycle_gate.cjs');
  const cycleProof = cycleGate.prepareProof(projectRoot, version, stateDir);
  const releaseBranch = `release/v${version}`;
  runCommand("git", ["switch", "-c", releaseBranch], projectRoot);

  fs.writeFileSync(path.join(projectRoot, cycleGate.FILE), JSON.stringify(cycleProof, null, 2) + '\n');
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
  for (const script of ["sync:source-credits", "sync:contributors", "sync:top-contributors"])
    runCommand("npm", ["run", script], projectRoot);
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
  convergePreparedRelease(projectRoot, contract);
  require("./distribution_snapshot.cjs").seal(projectRoot);
  runCommand("git", ["add", "data/distribution-snapshot.json"], projectRoot);
  runCommand("git", ["commit", "--amend", "--no-edit"], projectRoot);
  require("./distribution_snapshot.cjs").verify(projectRoot);
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
  isPrereleaseVersion(version);

  ensureCleanWorkingTree(projectRoot, "release:publish requires a clean tracked working tree.");

  const packageVersion = readPackageVersion(projectRoot);
  if (packageVersion !== version) {
    throw new Error(`package.json version ${packageVersion} does not match requested release ${version}.`);
  }

  require('./release_cycle_gate.cjs').verifyFile(projectRoot, version);
  const tagName = `v${version}`;
  const candidate = mergedReleaseCandidate(projectRoot, version);

  runCommand("git", ["fetch", "origin", "main"], projectRoot);
  const remoteMain = runCommand("git", ["rev-parse", "origin/main"], projectRoot, {
    capture: true,
  });
  const headCommit = runCommand("git", ["rev-parse", "HEAD"], projectRoot, {
    capture: true,
  });
  runCommand("git", ["merge-base", "--is-ancestor", headCommit, remoteMain], projectRoot);
  if (candidate.mergeCommit.oid !== headCommit) {
    throw new Error(`Check out immutable merged release commit ${candidate.mergeCommit.oid} before publishing; main may have advanced.`);
  }
  require("./distribution_snapshot.cjs").verify(projectRoot);

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
  const releaseArgs = ["release", "create", tagName, "--title", tagName, "--notes-file", notesPath];
  if (isPrereleaseVersion(version)) releaseArgs.push("--prerelease");
  runCommand("gh", releaseArgs, projectRoot);

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
    prepareRelease(projectRoot, args.version, args.stateDir);
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


module.exports = {
  runReleasePreflight,
  convergePreparedRelease,
  localTagTarget,
  remoteTagTarget,
  isPrereleaseVersion,
  resolveCommandInvocation,
  runCommand,
  selectMergedReleaseCandidate,
  validateReleaseSuccessors,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[release] ${error.message}`);
    process.exit(1);
  }
}
