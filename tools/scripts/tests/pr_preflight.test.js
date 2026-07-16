const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const scriptPath = path.join(repoRoot, "tools", "scripts", "pr_preflight.cjs");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aas-pr-preflight-"));
const eventPath = path.join(tempDir, "event.json");

fs.writeFileSync(
  eventPath,
  JSON.stringify({
    pull_request: {
      body: "## Quality Bar Checklist ✅\n\n- [x] Canonical skill location\n",
    },
  }),
  "utf8",
);

const result = spawnSync(
  process.execPath,
  [
    scriptPath,
    "--base",
    "HEAD",
    "--head",
    "HEAD",
    "--event-path",
    eventPath,
    "--no-run",
    "--json",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);

assert.strictEqual(result.status, 0, result.stderr || result.stdout);

const parsed = JSON.parse(result.stdout);
assert.strictEqual(parsed.prBody.available, true);
assert.strictEqual(parsed.prBody.hasQualityChecklist, true);
