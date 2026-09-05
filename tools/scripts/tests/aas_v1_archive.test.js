"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { parsePackageArchive, safeArchivePath } = require("../../lib/aas-v1/cache");

const HOSTILE_ROOT = path.join(__dirname, "fixtures", "aas-v1-archive");
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

function smallTar(specs) {
  const blocks = [];
  for (const { name, type = "0", body = "" } of specs) {
    const bytes = Buffer.from(body);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf8");
    header.write("0000644\0", 100, "ascii");
    header.write(bytes.length.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    header.fill(0x20, 148, 156);
    header.write(type, 156, "ascii");
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    blocks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return Buffer.concat([...blocks, Buffer.alloc(1024)]);
}

test("archive entry budget includes directories and path metadata even when selecting no files", () => {
  for (const type of ["5", "x", "g", "L"]) {
    const entries = Array.from({ length: 3 }, (_, index) => ({
      name: `package/entry-${index}`, type, body: type === "L" ? `package/file-${index}\0` : "",
    }));
    // End long-path metadata with a regular file; metadata cannot escape the budget.
    if (type === "L") entries.push({ name: "package/end", type: "0", body: "" });
    assert.throws(() => parsePackageArchive(smallTar(entries), { limits: { maxEntries: 2 }, selectPaths: [] }),
      { code: "AAS_ARCHIVE_ENTRY_LIMIT" });
  }
  const exact = smallTar([{ name: "package", type: "5" }, { name: "package/file" }]);
  assert.equal(parsePackageArchive(exact, { limits: { maxEntries: 2 } }).fileCount, 1);
});

test("archive ancestor collisions use normalized paths in either entry order", () => {
  for (const [parent, child] of [["package/Foo", "package/foo/bar"], ["package/café", "package/cafe\u0301/bar"]]) {
    for (const names of [[parent, child], [child, parent]]) {
      assert.throws(() => parsePackageArchive(smallTar(names.map((name) => ({ name })))),
        { code: "AAS_ARCHIVE_FILE_DIRECTORY_COLLISION" });
    }
  }
  assert.doesNotThrow(() => parsePackageArchive(smallTar([
    { name: "package/a/one" }, { name: "package/a/two" }, { name: "package/a", type: "5" },
  ])));
});
