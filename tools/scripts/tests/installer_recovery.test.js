"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { replaceManagedEntry } = require("../../bin/install");

for (const scenario of ["success", "rollback", "rollback-fails", "destination-reappears", "dangling-link-reappears"]) {
  test(`managed installer preserves installed content: ${scenario}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-install-recovery-"));
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    const destination = path.join(target, "example");
    fs.mkdirSync(source);
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(source, "SKILL.md"), "new skill\n");
    fs.writeFileSync(path.join(destination, "notes.txt"), "previous local content\n");
    const rename = fs.renameSync;
    let backup;
    try {
      fs.renameSync = function (from, to) {
        if (from === destination) backup = to;
        if (to === destination && scenario !== "success") {
          if (path.basename(from) === "entry") {
            if (scenario === "dangling-link-reappears") fs.symlinkSync(path.join(root, "missing"), destination);
            if (scenario === "destination-reappears") {
              fs.mkdirSync(destination);
              fs.writeFileSync(path.join(destination, "concurrent.txt"), "concurrent content\n");
            }
            throw new Error("simulated publication failure");
          }
          if (scenario === "rollback-fails") throw new Error("simulated rollback failure");
        }
        return rename.apply(this, arguments);
      };
      if (scenario === "success") {
        replaceManagedEntry(source, destination, source, true, target);
        assert.equal(fs.readFileSync(path.join(destination, "SKILL.md"), "utf8"), "new skill\n");
      } else {
        assert.throws(() => replaceManagedEntry(source, destination, source, true, target), (error) => {
          assert.match(error.message, /publication failure/);
          if (scenario !== "rollback") assert.ok(error.message.includes(backup), "report the retained backup path");
          return true;
        });
        const retained = scenario === "rollback" ? destination : backup;
        assert.equal(fs.readFileSync(path.join(retained, "notes.txt"), "utf8"), "previous local content\n");
        if (scenario === "dangling-link-reappears") assert.equal(fs.readlinkSync(destination), path.join(root, "missing"));
        if (scenario === "destination-reappears") {
          assert.equal(fs.readFileSync(path.join(destination, "concurrent.txt"), "utf8"), "concurrent content\n");
        }
      }
      assert.equal(fs.readdirSync(target).some((name) => name.startsWith(".antigravity-stage-")),
        !["success", "rollback"].includes(scenario));
    } finally {
      fs.renameSync = rename;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
