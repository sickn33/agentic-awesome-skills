const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  candidateIntegrity,
  packageIdentity,
  validateMetadata,
  verifyExpected,
} = require("../verify_npm_candidate.cjs");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-npm-candidate-"));
const tarball = path.join(root, "package.tgz");
fs.writeFileSync(tarball, "tested candidate bytes");
const expected = {
  version: "20.1.0",
  commit: "a".repeat(40),
  distTag: "latest",
  integrity: candidateIntegrity(tarball),
};
const metadata = {
  "dist-tags": { latest: expected.version },
  versions: {
    [expected.version]: {
      version: expected.version,
      gitHead: expected.commit,
      dist: { integrity: expected.integrity },
    },
  },
};

assert.equal(packageIdentity("20.1.0"), "latest");
assert.equal(packageIdentity("20.2.0-rc.1"), "next");
assert.deepEqual(validateMetadata(metadata, expected), {
  version: expected.version,
  gitHead: expected.commit,
  integrity: expected.integrity,
  distTag: "latest",
});
for (const mutate of [
  (value) => { value.version = "20.2.0"; },
  (value) => { value.gitHead = "b".repeat(40); },
  (value) => { value.dist.integrity = "sha512-wrong"; },
  (_, all) => { all["dist-tags"].latest = "20.0.0"; },
]) {
  const changed = structuredClone(metadata);
  mutate(changed.versions[expected.version], changed);
  assert.throws(() => validateMetadata(changed, expected));
}

(async () => {
  let attempt = 0;
  const result = await verifyExpected(expected, {
    timeoutMs: 10,
    intervalMs: 1,
    now: () => attempt,
    sleep: async () => { attempt += 1; },
    fetchMetadata: async () => {
      if (attempt < 2) return { "dist-tags": {}, versions: {} };
      return metadata;
    },
  });
  assert.equal(result.version, expected.version);
  await assert.rejects(
    verifyExpected(expected, {
      timeoutMs: 0,
      fetchMetadata: async () => ({ "dist-tags": {}, versions: {} }),
    }),
  );
  fs.rmSync(root, { recursive: true, force: true });
  console.log("npm candidate publication verification tests passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
