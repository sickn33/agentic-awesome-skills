"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { sha256 } = require("../../lib/aas-v1/canonical-json");
const { loadBundledCatalog } = require("../../lib/aas-v1/catalog");
const { McpServer } = require("../../lib/aas-v1/mcp");
const { MAX_READ_BYTES, listSkillFiles, readSkillFile } = require("../../lib/aas-v1/skill-files");

const ROOT = path.resolve(__dirname, "../../..");

function fixture(t, bytes = Buffer.from("# Reference\nA concrete example.\n")) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-skill-files-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "skills", "example", "references");
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "guide.md");
  fs.writeFileSync(file, bytes);
  const catalog = { skills: [{ id: "example", untrustedContentPath: "skills/example/SKILL.md", untrustedFiles: [
    { path: "references/guide.md", type: "file", size: bytes.length, sha256: sha256(bytes) },
  ] }] };
  return { root, directory, file, catalog, input: { id: "example", path: "references/guide.md" } };
}

test("real canonical bundle inventory paginates completely and reads nested reference text", () => {
  const catalog = loadBundledCatalog({ root: ROOT });
  for (const id of ["debugging-strategies", "pptx-official", "2d-games", "android_ui_verification"]) {
    const all = [];
    let cursor = 0;
    do {
      const page = listSkillFiles(catalog, { id, cursor, limit: 2 });
      all.push(...page.files);
      cursor = page.nextCursor;
      assert.ok(page.files.length <= 2);
    } while (cursor !== null);
    assert.deepEqual(all, catalog.skills.find((skill) => skill.id === id).untrustedFiles);
    assert.equal(new Set(all.map((file) => file.path)).size, all.length);
    assert.ok(all.some((file) => file.path === "SKILL.md"));
  }
  const result = readSkillFile(catalog, ROOT, { id: "debugging-strategies", path: "resources/implementation-playbook.md" });
  assert.equal(result.authority, "untrusted");
  assert.equal(result.text, fs.readFileSync(path.join(ROOT, "skills/debugging-strategies/resources/implementation-playbook.md"), "utf8"));
});

test("bundle file read verifies the pinned bytes and never executes executable text", (t) => {
  const f = fixture(t, Buffer.from("#!/bin/sh\nexit 99\n"));
  fs.chmodSync(f.file, 0o755);
  assert.match(readSkillFile(f.catalog, f.root, f.input).text, /exit 99/);
  fs.writeFileSync(f.file, "#!/bin/sh\nexit 98\n");
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_DIGEST_MISMATCH" });
});

test("bundle reads reject traversal, encodings, absolute paths and unindexed files", (t) => {
  const f = fixture(t);
  for (const filePath of ["../secret", "/etc/passwd", "a/../../secret", "a\\b", "a//b", "a/./b", "%2e%2e/secret", "C:/secret", "a\0b"]) {
    assert.throws(() => readSkillFile(f.catalog, f.root, { ...f.input, path: filePath }), { code: "AAS_SKILL_FILE_PATH_INVALID" });
  }
  assert.throws(() => readSkillFile(f.catalog, f.root, { ...f.input, path: "not-indexed.md" }), { code: "AAS_SKILL_FILE_NOT_FOUND" });
  assert.throws(() => listSkillFiles(f.catalog, { id: "example", cursor: 2 }), { code: "AAS_INPUT_CURSOR_INVALID" });
  assert.throws(() => listSkillFiles(f.catalog, { id: "example", limit: 51 }), { code: "AAS_INPUT_LIMIT_INVALID" });
});

test("bundle reads reject leaf links, ancestor links, hardlinks and missing payloads", (t) => {
  const f = fixture(t);
  const original = `${f.file}.original`;
  fs.renameSync(f.file, original);
  fs.symlinkSync(original, f.file);
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_UNSAFE" });
  fs.unlinkSync(f.file);
  fs.linkSync(original, f.file);
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_UNSAFE" });
  fs.unlinkSync(f.file);
  fs.renameSync(original, f.file);
  fs.renameSync(f.directory, `${f.directory}-real`);
  fs.symlinkSync(`${f.directory}-real`, f.directory);
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_UNSAFE" });
  fs.unlinkSync(f.directory);
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_UNAVAILABLE" });
});

test("old catalogs stay usable and explicitly report missing file inventories", (t) => {
  const f = fixture(t);
  delete f.catalog.skills[0].untrustedFiles;
  assert.throws(() => listSkillFiles(f.catalog, { id: "example" }), { code: "AAS_SKILL_FILE_INDEX_UNAVAILABLE" });
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_INDEX_UNAVAILABLE" });
});

test("binary and oversized files return bounded failures instead of decoded or partial content", (t) => {
  for (const bytes of [Buffer.from([0xff]), Buffer.from([0x41, 0, 0x42])]) {
    const f = fixture(t, bytes);
    assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_BINARY" });
  }
  const f = fixture(t, Buffer.alloc(MAX_READ_BYTES + 1, 65));
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_TOO_LARGE" });
  // Also bound the actual file when its inventory claims it is small.
  f.catalog.skills[0].untrustedFiles[0].size = 10;
  assert.throws(() => readSkillFile(f.catalog, f.root, f.input), { code: "AAS_SKILL_FILE_TOO_LARGE" });
});

test("MCP exposes inert inventory and content with catalog identity, rejects extra arguments", async () => {
  const server = new McpServer({ root: ROOT });
  await server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" });
  for (const name of ["list_skill_files", "read_skill_file"]) {
    const args = { id: "debugging-strategies", ...(name === "read_skill_file" ? { path: "resources/implementation-playbook.md" } : {}) };
    const result = await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } });
    assert.equal(result.result.isError, false);
    assert.equal(result.result.structuredContent.authority, "untrusted");
    assert.equal(result.result.structuredContent.catalogDigest, server.catalog.digest);
    const rejected = await server.handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name, arguments: { ...args, execute: true } } });
    assert.equal(rejected.result.isError, true);
  }
});
