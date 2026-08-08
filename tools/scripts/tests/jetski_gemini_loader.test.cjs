const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createSymlinkOrSkip } = require("./symlink-test-utils");

async function main() {
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const loaderPath = path.join(
    repoRoot,
    "docs",
    "integrations",
    "jetski-gemini-loader",
    "loader.mjs",
  );
  const {
    loadSkillIndex,
    resolveSkillsFromMessages,
    loadSkillBodies,
    buildModelMessages,
  } = await import(`file://${loaderPath}`);

  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "jetski-gemini-loader-test-"),
  );
  try {
    const indexPath = path.join(fixtureRoot, "data", "skills_index.json");
    const alphaDir = path.join(fixtureRoot, "skills", "alpha");
    const betaDir = path.join(fixtureRoot, "skills", "beta");

    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.mkdirSync(alphaDir, { recursive: true });
    fs.mkdirSync(betaDir, { recursive: true });
    fs.writeFileSync(path.join(alphaDir, "SKILL.md"), "# alpha\n", "utf8");
    fs.writeFileSync(path.join(betaDir, "SKILL.md"), "# beta\n", "utf8");
    fs.writeFileSync(
      indexPath,
      JSON.stringify([
        { id: "alpha", path: "skills/alpha", name: "alpha" },
        { id: "beta", path: "skills/beta", name: "beta" },
      ]),
      "utf8",
    );

    const skillIndex = loadSkillIndex(indexPath);

    assert.deepStrictEqual([...skillIndex.keys()], ["alpha", "beta"]);

    const selected = resolveSkillsFromMessages(
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: "Try @alpha and @alpha again" },
        { role: "user", content: "Also @beta please" },
      ],
      skillIndex,
      2,
    );
    assert.deepStrictEqual(
      selected.map((meta) => meta.id),
      ["alpha", "beta"],
    );

    const noSkillMessages = await buildModelMessages({
      baseSystemMessages: [{ role: "system", content: "base" }],
      trajectory: [{ role: "user", content: "hi" }],
      skillIndex,
      skillsRoot: fixtureRoot,
    });
    assert.deepStrictEqual(noSkillMessages, [
      { role: "system", content: "base" },
      { role: "user", content: "hi" },
    ]);

    const loadedBodies = await loadSkillBodies(fixtureRoot, selected);
    assert.deepStrictEqual(loadedBodies, ["# alpha\n", "# beta\n"]);

    const loadedMessages = await buildModelMessages({
      baseSystemMessages: [{ role: "system", content: "base" }],
      trajectory: [{ role: "user", content: "Use @alpha then @beta" }],
      skillIndex,
      skillsRoot: fixtureRoot,
      maxSkillsPerTurn: 2,
    });
    assert.deepStrictEqual(
      loadedMessages.map((message) => message.content),
      ["base", "# alpha\n", "# beta\n", "Use @alpha then @beta"],
    );

    await assert.rejects(
      () =>
        buildModelMessages({
          baseSystemMessages: [{ role: "system", content: "base" }],
          trajectory: [{ role: "user", content: "Use @alpha and @beta" }],
          skillIndex,
          skillsRoot: fixtureRoot,
          maxSkillsPerTurn: 1,
          overflowBehavior: "error",
        }),
      /Too many skills requested in a single turn/,
    );

    await assert.rejects(
      () =>
        loadSkillBodies(fixtureRoot, [
          { id: "escape", path: "../outside", name: "escape" },
        ]),
      /Skill path escapes skills root/,
    );

    const symlinkedDir = path.join(fixtureRoot, "skills", "symlinked");
    const outsideDir = path.join(fixtureRoot, "outside-symlink");
    fs.mkdirSync(symlinkedDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, "secret.md"), "# secret\n", "utf8");
    const createdSymlink = createSymlinkOrSkip(
      path.join(outsideDir, "secret.md"),
      path.join(symlinkedDir, "SKILL.md"),
    );

    if (createdSymlink) {
      await assert.rejects(
        () =>
          loadSkillBodies(fixtureRoot, [
            { id: "symlinked", path: "skills/symlinked", name: "symlinked" },
          ]),
        /symlink|outside the skills root|regular file/i,
      );
    }
       console.log("✅ All Jetski Loader Security Checks Passed!");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
