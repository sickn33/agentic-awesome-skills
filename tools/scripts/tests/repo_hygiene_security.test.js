const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..", "..");
const pycacheDir = path.join(repoRoot, "skills", "ui-ux-pro-max", "scripts", "__pycache__");
const nestedSkillsDir = path.join(repoRoot, "skills", "skills");
const syncRecommended = fs.readFileSync(
  path.join(repoRoot, "tools", "scripts", "sync_recommended_skills.sh"),
  "utf8",
);
const alphaVantage = fs.readFileSync(
  path.join(repoRoot, "skills", "alpha-vantage", "SKILL.md"),
  "utf8",
);

assert.strictEqual(
  fs.existsSync(pycacheDir),
  false,
  "tracked Python bytecode should not ship in skill directories",
);
assert.strictEqual(
  fs.existsSync(nestedSkillsDir),
  false,
  "accidental skills/skills nesting should not ship in the canonical skill tree",
);
assert.match(syncRecommended, /cp -RP/, "recommended skills sync should preserve symlinks instead of dereferencing them");
assert.doesNotMatch(syncRecommended, /for item in \*\/; do\s+rm -rf "\$item"/, "recommended skills sync must not delete matched paths via naive glob iteration");
assert.match(syncRecommended, /readlink|test -L|find .* -type d/, "recommended skills sync should explicitly avoid following directory symlinks during cleanup");
assert.doesNotMatch(alphaVantage, /--- Unknown/, "alpha-vantage frontmatter should not contain malformed delimiters");

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-audit-security-"));
  try {
    const targetRepo = path.join(tempDir, "target");
    fs.mkdirSync(targetRepo);
    fs.writeFileSync(
      path.join(targetRepo, "README.md"),
      "[absolute](/etc/passwd)\n[traversal](../../etc/passwd)\n[symlink](linked-secret)\n[missing](docs/missing.md)\n",
      "utf8",
    );
    fs.symlinkSync("/etc/passwd", path.join(targetRepo, "linked-secret"));
    const fakeBin = path.join(tempDir, "bin");
    fs.mkdirSync(fakeBin);
    const fakeRg = path.join(fakeBin, "rg");
    fs.writeFileSync(
      fakeRg,
      `#!/usr/bin/env bash
set -euo pipefail

for arg in "$@"; do
  if [[ "$arg" == "--quiet" ]]; then
    exit 1
  fi
done

last_arg="\${@: -1}"
if [[ "$last_arg" == "README.md" ]]; then
  printf '%s\\n' '[absolute](/etc/passwd)' '[traversal](../../etc/passwd)' '[symlink](linked-secret)' '[missing](docs/missing.md)'
  exit 0
fi

exit 1
`,
      "utf8",
    );
    fs.chmodSync(fakeRg, 0o755);
    const scriptPath = path.join(
      repoRoot,
      "skills",
      "openclaw-github-repo-commander",
      "scripts",
      "repo-audit.sh",
    );
    const result = spawnSync("bash", [scriptPath, targetRepo], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /README local link escapes repository: \/etc\/passwd/);
    assert.match(result.stdout, /README local link escapes repository: \.\.\/\.\.\/etc\/passwd/);
    assert.match(result.stdout, /README local link escapes repository: linked-secret/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
