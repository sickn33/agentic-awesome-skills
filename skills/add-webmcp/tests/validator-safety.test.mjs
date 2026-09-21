import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.dirname(testDirectory);

test("validator refuses consequential fixtures before launching a browser", () => {
  const result = spawnSync(
    process.execPath,
    [
      path.join(skillDirectory, "scripts", "validate-stagehand.mjs"),
      "--url",
      "https://example.com",
      "--config",
      path.join(testDirectory, "fixtures", "webmcp.consequential.json"),
      "--local",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing consequential invocation\(s\): submit_order/);
  assert.doesNotMatch(result.stdout, /stagehand\.init/);
});
