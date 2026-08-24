const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const installer = require(path.resolve(__dirname, "..", "..", "bin", "install.js"));
const packageMetadata = require(path.resolve(__dirname, "..", "..", "..", "package.json"));
const installerPath = path.resolve(__dirname, "..", "..", "bin", "install.js");

const publishedHead = "1111111111111111111111111111111111111111";
const movedTagHead = "2222222222222222222222222222222222222222";

function npmResult({ status = 0, stdout = `"${publishedHead}"\n`, stderr = "" } = {}) {
  return { status, stdout, stderr, error: null };
}

let capturedNpmCall;
assert.strictEqual(
  installer.resolvePublishedGitHead("15.12.0", (command, args, options) => {
    capturedNpmCall = { command, args, options };
    return npmResult();
  }),
  publishedHead,
  "an exact npm version should resolve its immutable published gitHead",
);
assert.strictEqual(capturedNpmCall.command, process.platform === "win32" ? "npm.cmd" : "npm");
assert.deepStrictEqual(capturedNpmCall.args, [
  "view",
  `${packageMetadata.name}@15.12.0`,
  "gitHead",
  "--json",
  "--registry",
  "https://registry.npmjs.org",
  "--ignore-scripts",
  "--prefer-online",
  "--loglevel=error",
]);
assert.deepStrictEqual(capturedNpmCall.options, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

assert.deepStrictEqual(
  installer.resolveNpmInvocation(["view", "example"], {
    platform: "win32",
    env: { npm_execpath: String.raw`C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` },
    execPath: String.raw`C:\Program Files\nodejs\node.exe`,
  }),
  {
    command: String.raw`C:\Program Files\nodejs\node.exe`,
    args: [String.raw`C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`, "view", "example"],
  },
  "Windows should execute npm's JavaScript entry point with Node instead of spawning npm.cmd",
);

assert.deepStrictEqual(
  installer.resolveNpmInvocation(["view", "example"], { platform: "win32", env: {}, execPath: "node.exe" }),
  { command: "npm.cmd", args: ["view", "example"] },
  "Windows should retain the legacy command fallback outside an npm-managed process",
);

assert.doesNotThrow(
  () => installer.assertClonedReleaseIdentity(publishedHead, publishedHead, "v15.12.0"),
  "the installer should accept a clone that matches the npm release identity",
);

assert.throws(
  () => installer.assertClonedReleaseIdentity(movedTagHead, publishedHead, "v15.12.0"),
  /release identity mismatch.*ref may have been moved/i,
  "a force-moved release tag must fail closed instead of installing replacement content",
);

assert.throws(
  () => installer.resolvePublishedGitHead("15.12.0", () => npmResult({ status: 1, stderr: "registry unavailable" })),
  /unable to resolve npm release identity.*registry unavailable/i,
  "an unavailable registry identity must fail closed",
);

assert.throws(
  () => installer.resolvePublishedGitHead("15.12.0", () => npmResult({ stdout: "{}\n" })),
  /gitHead is missing or invalid/i,
  "a release without a valid gitHead must fail closed",
);

assert.strictEqual(
  installer.resolvePublishedGitHead("15.12.0", () => npmResult({ stdout: `[\n  "${publishedHead}"\n]\n` })),
  publishedHead,
  "npm >= 12 wraps single-field --json output in an array and must still resolve",
);

assert.throws(
  () => installer.resolvePublishedGitHead("15.12.0", () => npmResult({ stdout: "[]\n" })),
  /gitHead is missing or invalid/i,
  "an empty array response must fail closed",
);

assert.throws(
  () => installer.resolvePublishedGitHead("15.12.0", () => npmResult({
    stdout: `["${publishedHead}", "${movedTagHead}"]\n`,
  })),
  /gitHead is missing or invalid/i,
  "an ambiguous multi-entry response must fail closed",
);

assert.strictEqual(installer.resolveInstallVersion({}), require("../../../package.json").version);
assert.strictEqual(installer.resolveInstallVersion({ versionArg: "v1.2.3" }), "1.2.3");
assert.strictEqual(
  installer.resolveInstallVersion({ versionArg: "1.2.3-rc.1+build.5" }),
  "1.2.3-rc.1+build.5",
  "exact SemVer releases may include prerelease and build metadata",
);
assert.strictEqual(installer.resolveInstallRef({ versionArg: "1.2.3+build.5" }), "v1.2.3+build.5");
assert.doesNotThrow(() => installer.buildCloneArgs("https://example.test/repo.git", "/tmp/repo", "v1.2.3+build.5"));
assert.strictEqual(installer.resolveInstallVersion({ tagArg: "main" }), null);
assert.throws(() => installer.resolveInstallVersion({ versionArg: "main" }), /invalid exact release version/i);

// Exercise the process boundary: a moved Git ref must stop after cloning and
// identity verification, before reading repository content or touching the
// requested target.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "installer-release-identity-"));
try {
  const sourceRepo = path.join(tmpRoot, "source-repo");
  const skillDir = path.join(sourceRepo, "skills", "safe-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: safe-skill\nrisk: safe\n---\n\n# Safe skill\n",
    "utf8",
  );

  const target = path.join(tmpRoot, "target");
  fs.mkdirSync(target, { recursive: true });
  const sentinel = path.join(target, "sentinel.txt");
  fs.writeFileSync(sentinel, "unchanged", "utf8");
  const beforeEntries = fs.readdirSync(target).sort();

  const fakeBin = path.join(tmpRoot, "fake-bin");
  fs.mkdirSync(fakeBin, { recursive: true });
  const fakeNpm = path.join(fakeBin, "npm");
  fs.writeFileSync(
    fakeNpm,
    `#!/usr/bin/env node
process.stdout.write(JSON.stringify(process.env.FAKE_NPM_GIT_HEAD) + "\\n");
`,
    "utf8",
  );
  fs.chmodSync(fakeNpm, 0o755);

  const fakeGit = path.join(fakeBin, "git");
  fs.writeFileSync(
    fakeGit,
    `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
if (args[0] === "clone") {
  fs.cpSync(process.env.FAKE_GIT_SOURCE, args[args.length - 1], { recursive: true, force: true });
} else if (args[0] === "-C" && args[2] === "rev-parse" && args[3] === "HEAD") {
  process.stdout.write(process.env.FAKE_GIT_HEAD + "\\n");
} else {
  process.exitCode = 1;
}
`,
    "utf8",
  );
  fs.chmodSync(fakeGit, 0o755);

  const mismatch = spawnSync(
    process.execPath,
    [
      installerPath,
      "--path",
      target,
      "--release",
      packageMetadata.version,
      "--skills",
      "safe-skill",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        FAKE_NPM_GIT_HEAD: publishedHead,
        FAKE_GIT_HEAD: movedTagHead,
        FAKE_GIT_SOURCE: sourceRepo,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    },
  );
  assert.strictEqual(mismatch.status, 1, `${mismatch.stdout}\n${mismatch.stderr}`);
  assert.match(mismatch.stderr, /release identity mismatch.*ref may have been moved/is);
  assert.deepStrictEqual(fs.readdirSync(target).sort(), beforeEntries);
  assert.strictEqual(fs.readFileSync(sentinel, "utf8"), "unchanged");
  assert.strictEqual(fs.existsSync(path.join(target, "safe-skill")), false);
  assert.strictEqual(fs.existsSync(path.join(target, ".antigravity-install-manifest.json")), false);
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
