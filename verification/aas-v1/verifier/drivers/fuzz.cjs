"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MASK = (1n << 64n) - 1n;
const rotateLeft = (value, amount) => ((value << BigInt(amount)) | (value >> (64n - BigInt(amount)))) & MASK;
function deriveState(rootSeedHex, namespace) {
  const key = Buffer.from(rootSeedHex, "hex");
  const bytes = crypto.createHmac("sha256", key).update(namespace).digest();
  return [0, 8, 16, 24].map((offset) => bytes.readBigUInt64BE(offset));
}
function nextUint64(state) {
  const result = (rotateLeft((state[1] * 5n) & MASK, 7) * 9n) & MASK;
  const temporary = (state[1] << 17n) & MASK;
  state[2] ^= state[0]; state[3] ^= state[1]; state[1] ^= state[2]; state[0] ^= state[3];
  state[2] ^= temporary; state[3] = rotateLeft(state[3], 45);
  return result;
}
const sample = (state, upper) => Number(nextUint64(state) % BigInt(upper));

async function main(input) {
  const core = require(path.join(input.packageRoot, "tools/lib/aas-v1"));
  const mcp = require(path.join(input.packageRoot, "tools/lib/aas-v1/mcp"));
  const { McpServer, parseStrictJsonLine } = mcp;
  const catalog = core.loadBundledCatalog({ root: input.packageRoot });
  const server = new McpServer({ root: input.packageRoot, catalog });
  await server.handle({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "fuzz-driver", version: "1" } } });
  await server.handle({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
  const budget = input.budget;
  const summary = {};
  let total = 0;
  let crashes = 0;
  let canaryLeaks = 0;

  const expectParse = (bytes, accepted) => {
    let parsed = false;
    try { parseStrictJsonLine(bytes); parsed = true; } catch {}
    if (parsed !== accepted) throw new Error(`parser expectation mismatch: accepted=${accepted}`);
  };

  for (const stratum of budget.parserAndMcpFuzz.strata) {
    let executions = 0;
    let accepted = 0;
    let rejected = 0;
    let serverExecutions = 0;
    for (let index = 0; index < stratum.executions; index += 1) {
      if (index % input.jobCount !== input.jobIndex) continue;
      const namespace = `aas.v1/parser-and-mcp-fuzz/${stratum.id}/execution/${index}`;
      const state = deriveState(budget.prng.rootSeed, namespace);
      const variant = sample(state, 6);
      try {
        if (stratum.id === "mcp-framing-json") {
          const cases = [
            [Buffer.from('{"jsonrpc":"2.0","id":1,"id":2}'), false],
            [Buffer.from("[1,2]"), false],
            [Buffer.from("null"), false],
            [Buffer.from('{"jsonrpc":"2.0"} trailing'), false],
            [Buffer.from([0xff, 0xfe]), false],
            [Buffer.from('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'), true],
          ];
          expectParse(...cases[variant]);
          if (cases[variant][1]) accepted += 1; else rejected += 1;
        } else if (stratum.id === "schema-depth-size") {
          const excessive = variant % 2 === 0;
          const bytes = excessive
            ? Buffer.from(`{"x":${"[".repeat(17)}0${"]".repeat(17)}}`)
            : Buffer.from(`{"x":${"[".repeat(15)}0${"]".repeat(15)}}`);
          expectParse(bytes, !excessive);
          if (excessive) rejected += 1; else accepted += 1;
        } else if (stratum.id === "search-query-unicode") {
          const excessive = variant % 3 === 0;
          const query = `${"🧪".repeat(excessive ? 257 : 32)}${String.fromCodePoint(0x61 + variant)}`;
          const request = { jsonrpc: "2.0", id: index + 1, method: "tools/call", params: { name: "search_skills", arguments: { query, limit: 1 } } };
          expectParse(Buffer.from(JSON.stringify(request)), true);
          accepted += 1;
          if (index % 100 === 0) {
            const response = await server.handle(request);
            const serialized = JSON.stringify(response);
            if (serialized.includes("AAS_SECRET_CANARY_DO_NOT_EMIT_")) canaryLeaks += 1;
            serverExecutions += 1;
          }
        } else if (stratum.id === "resource-uri-get-skill") {
          const invalid = variant % 2 === 0;
          const request = { jsonrpc: "2.0", id: index + 1, method: "resources/read", params: { uri: invalid ? "aas://skills/%2e%2e%2fsecret" : "aas://skills/frontend-design" } };
          expectParse(Buffer.from(JSON.stringify(request)), true);
          accepted += 1;
          if (index % 100 === 0) {
            const response = await server.handle(request);
            if (invalid && !response.error) throw new Error("invalid resource URI accepted");
            serverExecutions += 1;
          }
        } else if (stratum.id === "manifest-plan-parsers") {
          const manifest = { schemaVersion: 1, name: "fuzz", catalog: { package: "agentic-awesome-skills", version: "14.6.0", integrity: `sha256-${"1".repeat(64)}` }, targets: [{ host: variant % 2 ? "codex" : "claude", scope: "project" }], intent: { goals: ["build"] }, policy: { allowedRisk: ["safe"], requireKnownSource: true, allowManualSetup: false }, skills: variant % 3 ? [{ id: "frontend-design" }] : [{ id: "../escape" }] };
          const validation = core.stack.validateManifest(manifest);
          if (variant % 3 === 0 && validation.ok) throw new Error("unsafe manifest accepted");
          if (variant % 3 !== 0 && !validation.ok) throw new Error("valid manifest rejected");
          if (validation.ok) accepted += 1; else rejected += 1;
        } else if (stratum.id === "timeout-result-limits") {
          const invalid = variant % 2 === 0;
          const request = { jsonrpc: "2.0", id: index + 1, method: "tools/call", params: { name: "search_skills", arguments: { query: "react", limit: invalid ? 51 : 1 } } };
          expectParse(Buffer.from(JSON.stringify(request)), true);
          accepted += 1;
          if (index % 100 === 0) {
            const response = await server.handle(request);
            const text = response.result?.content?.[0]?.text || "";
            if (invalid && !text.includes("AAS_INPUT_LIMIT_INVALID")) throw new Error("result limit was not enforced");
            serverExecutions += 1;
          }
        } else throw new Error(`unknown fuzz stratum: ${stratum.id}`);
      } catch (error) {
        crashes += 1;
        throw error;
      }
      executions += 1;
      total += 1;
    }
    summary[stratum.id] = { executions, accepted, rejected, serverExecutions };
  }
  return { schemaVersion: 1, ok: crashes === 0 && canaryLeaks === 0, total, crashes, canaryLeaks, summary };
}

const input = JSON.parse(fs.readFileSync(0, "utf8"));
main(input).then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
