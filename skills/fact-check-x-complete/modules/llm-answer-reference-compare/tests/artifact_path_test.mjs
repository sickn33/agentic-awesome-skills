import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { relativeArtifact } from "../assets/tool/dist/capture/generic-chat.js";

const windowsRoot = String.raw`C:\FactCheckX\fixtures\capture`;
const windowsArtifact = String.raw`C:\FactCheckX\fixtures\capture\artifacts\dknowc-chat\screenshot.png`;
assert.equal(
  relativeArtifact(windowsArtifact, windowsRoot),
  "artifacts/dknowc-chat/screenshot.png",
);

assert.equal(
  relativeArtifact(
    "/tmp/fact-check/capture/artifacts/doubao/page.html",
    "/tmp/fact-check/capture",
  ),
  "artifacts/doubao/page.html",
);

assert.throws(
  () => relativeArtifact(
    String.raw`D:\outside\screenshot.png`,
    windowsRoot,
  ),
  /采集存证路径越出输出目录/,
);
assert.throws(
  () => relativeArtifact(
    "/tmp/fact-check/outside/page.html",
    "/tmp/fact-check/capture",
  ),
  /采集存证路径越出输出目录/,
);

if (process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT) {
  await writeFile(
    process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT,
    JSON.stringify({
      schemaVersion: "fact-check-x/test-assertions@1",
      actualAssertionIds: [
        "capture.artifact_path_cross_platform",
        "capture.artifact_path_confined",
      ],
    }),
    "utf8",
  );
}

console.log("PASS Windows/POSIX 采集存证路径统一为安全相对路径");
