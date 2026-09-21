import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { scanCodebase } from "../scripts/scan-codebase.mjs";

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "sample-next");

test("scanner inventories framework and WebMCP-relevant surfaces without source snippets", async () => {
  const result = await scanCodebase(fixture);
  assert.deepEqual(result.frameworks, ["Next.js", "React"]);
  assert.ok(result.findings.some((finding) => finding.kind === "form"));
  assert.ok(result.findings.some((finding) => finding.kind === "route-handler"));
  assert.ok(result.findings.some((finding) => finding.kind === "schema"));
  assert.ok(result.findings.some((finding) => finding.kind === "client-state"));
  assert.ok(result.findings.some((finding) => finding.kind === "network-client"));
  assert.ok(result.findings.some((finding) => finding.kind === "capability-function"));
  assert.ok(result.findings.some((finding) => finding.kind === "webmcp"));
  assert.ok(
    result.findings.some(
      (finding) => finding.kind === "framework-route" && finding.file === path.join("app", "page.tsx"),
    ),
  );
  assert.ok(result.findings.every((finding) => !("snippet" in finding)));
});
