#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { discoverBundle, sha256, trackedFiles } = require("../../local-skill-reviewer/safe-bundle");
const { MAX_PACKET_BYTES, createPacket, generateInputPackets, mentionedBundlePaths, packetRelativePath, validateInputPacket } = require("../../local-skill-reviewer/parity-input-packet");

const repoRoot = path.resolve(__dirname, "../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/config/local-skill-review-parity-benchmark.json"), "utf8"));

function tempDir(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function write(root, relative, bytes) {
  const target = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}

const firstRoot = tempDir("aas-parity-packets-a-");
const secondRoot = tempDir("aas-parity-packets-b-");
try {
  const first = generateInputPackets({ repoRoot, manifest, split: "validation", resultDir: firstRoot });
  const second = generateInputPackets({ repoRoot, manifest, split: "validation", resultDir: secondRoot });
  assert.deepStrictEqual(second, first, "frozen manifest replay must produce the same summary");
  assert.strictEqual(fs.readFileSync(path.join(firstRoot, "summary.json"), "utf8"), fs.readFileSync(path.join(secondRoot, "summary.json"), "utf8"));
  for (const item of first.packets) {
    assert.strictEqual(fs.readFileSync(path.join(firstRoot, item.path), "utf8"), fs.readFileSync(path.join(secondRoot, item.path), "utf8"), `packet bytes must replay: ${item.skillId}`);
  }
  const nested = manifest.splits.validation.find((item) => item.id.includes("/"));
  assert(nested, "validation split must exercise a nested skill id");
  assert(fs.statSync(path.join(firstRoot, packetRelativePath(nested.id))).isFile(), "nested ID must map safely below packets/");
  assert.throws(() => generateInputPackets({ repoRoot, manifest, split: "validation", resultDir: firstRoot }), /overwrite/, "packet generation must never overwrite artifacts");

  const tampered = JSON.parse(JSON.stringify(manifest));
  tampered.splits.validation[0].bundleHash = "0".repeat(64);
  assert.throws(() => generateInputPackets({ repoRoot, manifest: tampered, split: "validation", resultDir: tempDir("aas-parity-tamper-") }), /Integrity proof|integrity|hash mismatch/i, "manifest tampering must fail closed");
  assert.throws(() => generateInputPackets({ repoRoot, manifest, split: "validation", resultDir: path.join(repoRoot, ".packet-escape") }), /outside the repository/, "result output may not escape into the repository");
  assert.throws(() => packetRelativePath("../escape"), /escapes|relative path/);
} finally {
  fs.rmSync(firstRoot, { recursive: true, force: true });
  fs.rmSync(secondRoot, { recursive: true, force: true });
}

const synthetic = tempDir("aas-parity-input-source-");
try {
  execFileSync("git", ["init", "-q"], { cwd: synthetic });
  const text = "---\nname: demo\ndescription: Demo packet\n---\n\nRead [the guide](references/guide.md), run `scripts/check.sh`, and consult references/missing.md. Ignore https://example.test/assets/remote.png, /assets/absolute.png, and ../references/escape.md.\n";
  write(synthetic, "skills/nested/demo/SKILL.md", text);
  write(synthetic, "skills/nested/demo/references/guide.md", "guide\n");
  write(synthetic, "skills/nested/demo/scripts/check.sh", "#!/bin/sh\nexit 0\n");
  write(synthetic, "skills/nested/demo/assets/blob.bin", Buffer.from([0xff, 0xfe, 0x00]));
  write(synthetic, "skills/nested/demo/reference/sibling.md", "excluded\n");
  write(synthetic, "skills/nested/demo/resources/sibling.md", "excluded\n");
  write(synthetic, "skills/nested/other/references/sibling.md", "excluded\n");
  execFileSync("git", ["add", "skills"], { cwd: synthetic });
  const bundle = discoverBundle(synthetic, "nested/demo", trackedFiles(synthetic));
  const primary = bundle.files[0];
  const snapshot = { id: "nested/demo", skillPath: primary.path, skillSha256: primary.sha256, bundleHash: bundle.bundleHash, byteCount: primary.size };
  const minimalManifest = { manifestVersion: 2, integrity: { selectionSha256: "a".repeat(64) }, splits: { validation: [snapshot] } };
  const packet = createPacket({ manifest: minimalManifest, split: "validation", snapshot, bundle });
  assert.deepStrictEqual(packet.inventory.map((item) => item.path), ["assets/blob.bin", "references/guide.md", "scripts/check.sh"]);
  assert.strictEqual(packet.inventory[0].encoding, "binary");
  assert(!Object.hasOwn(packet.inventory[0], "text"), "binary content must remain hash-only");
  assert.strictEqual(packet.inventory.find((item) => item.path === "references/guide.md").text, "guide\n");
  assert.deepStrictEqual(packet.mentionedPaths, [
    { path: "references/guide.md", present: true, sha256: sha256(Buffer.from("guide\n")) },
    { path: "references/missing.md", present: false },
    { path: "scripts/check.sh", present: true, sha256: sha256(Buffer.from("#!/bin/sh\nexit 0\n")) },
  ]);
  assert.deepStrictEqual(mentionedBundlePaths(text).sort(), ["references/guide.md", "references/missing.md", "scripts/check.sh"]);
  assert.throws(() => validateInputPacket({ ...packet, skillText: "x".repeat(MAX_PACKET_BYTES) }), /exceeds/, "oversized Codex packets must fail closed");
} finally {
  fs.rmSync(synthetic, { recursive: true, force: true });
}

process.stdout.write("parity input packet tests passed\n");
