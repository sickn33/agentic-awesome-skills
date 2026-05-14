const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { copyRecursiveSync } = require("../../bin/install");

async function main() {
  const { copyFolderSync, copyIndexFile } = await import("../../scripts/setup_web.js");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "copy-security-"));
  try {
    const safeRoot = path.join(root, "safe-root");
    const destRoot = path.join(root, "dest-root");
    const outsideDir = path.join(root, "outside");

    fs.mkdirSync(path.join(safeRoot, "nested"), { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });

    fs.writeFileSync(path.join(safeRoot, "nested", "ok.txt"), "ok");
    fs.writeFileSync(path.join(outsideDir, "secret.txt"), "secret");
    fs.symlinkSync(outsideDir, path.join(safeRoot, "escape-link"));

    copyRecursiveSync(safeRoot, path.join(destRoot, "install-copy"), safeRoot);
    copyFolderSync(safeRoot, path.join(destRoot, "web-copy"), safeRoot);

    assert.strictEqual(
      fs.existsSync(path.join(destRoot, "install-copy", "escape-link", "secret.txt")),
      false,
      "installer copy must not follow symlinks outside the cloned root",
    );
    assert.strictEqual(
      fs.existsSync(path.join(destRoot, "web-copy", "escape-link", "secret.txt")),
      false,
      "web setup copy must not follow symlinks outside the skills root",
    );
    assert.strictEqual(
      fs.readFileSync(path.join(destRoot, "install-copy", "nested", "ok.txt"), "utf8"),
      "ok",
    );
    assert.strictEqual(
      fs.readFileSync(path.join(destRoot, "web-copy", "nested", "ok.txt"), "utf8"),
      "ok",
    );

    const indexSource = path.join(root, "skills_index.json");
    const outsideIndexTarget = path.join(outsideDir, "index-target.json");
    const symlinkedIndexDest = path.join(destRoot, "skills.json");
    fs.writeFileSync(indexSource, "[]");
    fs.writeFileSync(outsideIndexTarget, "outside");
    fs.symlinkSync(outsideIndexTarget, symlinkedIndexDest);

    assert.throws(
      () => copyIndexFile(indexSource, symlinkedIndexDest),
      /symlink/i,
      "web setup index copy must reject destination symlinks",
    );
    assert.strictEqual(fs.readFileSync(outsideIndexTarget, "utf8"), "outside");

    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    const repoTmp = path.join(repoRoot, ".tmp", `copy-security-${process.pid}`);
    const copySource = path.join(repoTmp, "source.txt");
    const copyDest = path.join(repoTmp, "dest.txt");
    const outsideCopyTarget = path.join(outsideDir, "copy-target.txt");
    fs.mkdirSync(repoTmp, { recursive: true });
    fs.writeFileSync(copySource, "new content");
    fs.writeFileSync(outsideCopyTarget, "outside");
    fs.symlinkSync(outsideCopyTarget, copyDest);

    const copyResult = spawnSync(
      process.execPath,
      [
        path.join(repoRoot, "tools", "scripts", "copy-file.js"),
        path.relative(repoRoot, copySource),
        path.relative(repoRoot, copyDest),
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.notStrictEqual(copyResult.status, 0, "copy-file must fail for destination symlinks");
    assert.match(
      `${copyResult.stdout}\n${copyResult.stderr}`,
      /symlink/i,
      "copy-file failure should explain that symlink destinations are refused",
    );
    assert.strictEqual(fs.readFileSync(outsideCopyTarget, "utf8"), "outside");
    fs.rmSync(repoTmp, { recursive: true, force: true });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
