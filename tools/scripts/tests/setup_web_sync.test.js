const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function main() {
  const { copyFolderSync, copyIndexFiles } = require("../../scripts/setup_web.js");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "setup-web-sync-"));
  try {
    const source = path.join(root, "skills_index.json");
    const dest = path.join(root, "public", "skills.json");
    const backup = path.join(root, "public", "skills.json.backup");

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(source, JSON.stringify([{ id: "demo", category: "testing" }], null, 2));

    copyIndexFiles(source, dest, backup);

    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(dest, "utf8")),
      JSON.parse(fs.readFileSync(source, "utf8")),
    );
    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(backup, "utf8")),
      JSON.parse(fs.readFileSync(source, "utf8")),
    );

    const skillsSource = path.join(root, "skills");
    const skillsDest = path.join(root, "public", "skills");
    fs.mkdirSync(path.join(skillsSource, "visible-skill"), { recursive: true });
    fs.mkdirSync(path.join(skillsSource, ".disabled", "hidden-skill"), { recursive: true });
    fs.writeFileSync(path.join(skillsSource, "visible-skill", "SKILL.md"), "# Visible\n", "utf8");
    fs.writeFileSync(path.join(skillsSource, ".disabled", "hidden-skill", "SKILL.md"), "# Hidden\n", "utf8");

    copyFolderSync(skillsSource, skillsDest, skillsSource);

    assert.ok(fs.existsSync(path.join(skillsDest, "visible-skill", "SKILL.md")));
    assert.strictEqual(
      fs.existsSync(path.join(skillsDest, ".disabled")),
      false,
      "web asset setup must not publish dot-prefixed skills directories",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
