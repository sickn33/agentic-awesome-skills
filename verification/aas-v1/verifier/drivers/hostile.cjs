"use strict";

const fs = require("node:fs");
const path = require("node:path");

async function main(input) {
  const core = require(path.join(input.packageRoot, "tools/lib/aas-v1"));
  const mcp = require(path.join(input.packageRoot, "tools/lib/aas-v1/mcp"));
  const manifest = input.manifest;
  const corpusRoot = input.corpusRoot;
  const catalog = core.loadBundledCatalog({ root: input.packageRoot });
  let archiveExploitRejected = 0;
  let archiveControlsAccepted = 0;
  let inputExploitRejected = 0;
  let inputControlsAccepted = 0;
  const parserBoundaryClasses = new Set(["malformed-mcp-framing", "malformed-json", "duplicate-json-key", "invalid-utf8", "request-byte-limit", "json-depth-limit"]);

  for (const corpusCase of manifest.classes) {
    const pairs = [["exploit", corpusCase.exploit], ["boundaryControl", corpusCase.boundaryControl]];
    if (corpusCase.surface === "archive") {
      for (const [kind, fixture] of pairs) {
        const bytes = fs.readFileSync(path.resolve(corpusRoot, fixture.path));
        let accepted = false;
        try {
          core.cache.parsePackageArchive(bytes, { limits: manifest.fixtureContract.archive });
          accepted = true;
        } catch {}
        if (kind === "exploit" && accepted) throw new Error(`${corpusCase.classId}: archive exploit accepted`);
        if (kind === "boundaryControl" && !accepted) throw new Error(`${corpusCase.classId}: archive boundary control rejected`);
        if (kind === "exploit") archiveExploitRejected += 1;
        else archiveControlsAccepted += 1;
      }
      continue;
    }

    for (const [kind, fixture] of pairs) {
      const bytes = fs.readFileSync(path.resolve(corpusRoot, fixture.path));
      let parsed;
      let rejected = false;
      try { parsed = mcp.parseStrictJsonLine(bytes); } catch { rejected = true; }
      if (!rejected && !parserBoundaryClasses.has(corpusCase.classId)) {
        const server = new mcp.McpServer({ root: input.packageRoot, catalog });
        await server.handle({ jsonrpc: "2.0", id: -1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "hostile-driver", version: "1" } } });
        await server.handle({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
        const response = await server.handle(parsed);
        const payload = response?.result?.structuredContent;
        rejected = Boolean(response?.error || response?.result?.isError || payload?.ok === false);
      }
      if (kind === "exploit" && !rejected) throw new Error(`${corpusCase.classId}: input exploit accepted`);
      if (kind === "boundaryControl" && rejected) throw new Error(`${corpusCase.classId}: input boundary control rejected`);
      if (kind === "exploit") inputExploitRejected += 1;
      else inputControlsAccepted += 1;
    }
  }
  return {
    schemaVersion: 1,
    ok: true,
    executions: manifest.classes.length * 2,
    archiveExploitRejected,
    archiveControlsAccepted,
    inputExploitRejected,
    inputControlsAccepted,
  };
}

const input = JSON.parse(fs.readFileSync(0, "utf8"));
main(input).then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
