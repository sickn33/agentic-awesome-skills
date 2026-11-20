"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { installForTarget } = require("../../bin/install");
const { bundles } = require("../../../data/editorial-bundles.json");

const root = path.resolve(__dirname, "../../..");
const cases = [
  {
    id: "design-how",
    count: 9,
    resources: [
      "design-how-design-system-boss/playbooks/build.md",
      "design-how-build-design-system/scripts/capture-guard.mjs",
      "design-how-migrate-design-system/scripts/parity.mjs",
      "design-how-make-font/scripts/fit_font.py",
      "design-how-make-logo/scripts/build_logo.py",
      "design-how-make-motion/template/package-lock.json",
      "design-how-make-motion/template/gitignore.template",
      "design-how-make-motion/template/src/example/video.tsx",
    ],
  },
  {
    id: "sybil-solutions",
    count: 18,
    resources: [
      "sybil-inference-optimisation/scripts/bench.py",
      "sybil-inference-optimisation/examples/config-existing-server.json",
      "sybil-glm53-offload-setup/bench/score_ref_panel.py",
      "sybil-glm53-offload-setup/reference/glm-5.3-flash-exl3-ref-panel.json",
      "sybil-local-studio-test-t3-mobile/scripts/pair-client.sh",
      "sybil-local-studio-test-t3-mobile/references/sqlite-fixtures.md",
      "effect-smol-test-development/types.md",
      "vercel-vgpu/references/guides/getting-started.docs.md",
    ],
  },
];

for (const { id, count, resources } of cases) {
  test(`${id} installs its tools and support files`, () => {
    const workspace = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "aas-bundle-install-"));
    try {
      const bundle = bundles.find((entry) => entry.id === id);
      const skillIds = bundle.skills.map((skill) => skill.id);
      assert.equal(skillIds.length, count);
      const destination = path.join(workspace, "installed");
      installForTarget(root, { name: id, path: destination }, undefined, null, skillIds);
      for (const file of resources) {
        assert.deepEqual(fs.readFileSync(path.join(destination, file)), fs.readFileSync(path.join(root, "skills", file)));
      }
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
}
