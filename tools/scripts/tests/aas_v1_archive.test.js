"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { parsePackageArchive, safeArchivePath } = require("../../lib/aas-v1/cache");

const ROOT = path.resolve(__dirname, "../../..");
const HOSTILE_ROOT = path.join(ROOT, "verification", "aas-v1", "baseline", "v1", "hostile");
const manifest = JSON.parse(fs.readFileSync(path.join(HOSTILE_ROOT, "manifest.json"), "utf8"));
const limits = {
  maxEntries: manifest.fixtureContract.archive.maxEntries,
  maxSingleFileBytes: manifest.fixtureContract.archive.maxSingleFileBytes,
  maxExpandedTotalBytes: manifest.fixtureContract.archive.maxExpandedTotalBytes,
  maxCompressionRatio: manifest.fixtureContract.archive.maxCompressionRatio,
};

for (const fixtureClass of manifest.classes.filter((entry) => entry.surface === "archive")) {
  test(`archive boundary accepts ${fixtureClass.classId}`, () => {
    const bytes = fs.readFileSync(path.join(HOSTILE_ROOT, fixtureClass.boundaryControl.path));
    assert.doesNotThrow(() => parsePackageArchive(bytes, { limits }));
  });

  test(`archive exploit rejects ${fixtureClass.classId}`, () => {
    const bytes = fs.readFileSync(path.join(HOSTILE_ROOT, fixtureClass.exploit.path));
    assert.throws(() => parsePackageArchive(bytes, { limits }), (error) => /^AAS_ARCHIVE_/.test(error.code));
  });
}

test("archive paths reject NTFS streams, device aliases, reserved characters, and trailing dot or space", () => {
  for (const value of [
    "package/file:ads",
    "package/CON",
    "package/con.txt",
    "package/AUX.json",
    "package/COM1",
    "package/LPT9.md",
    "package/file.",
    "package/file ",
    "package/has?.txt",
  ]) assert.throws(() => safeArchivePath(value), { code: "AAS_ARCHIVE_PATH_INVALID" });
  assert.equal(safeArchivePath("package/console.txt"), "package/console.txt");
});
