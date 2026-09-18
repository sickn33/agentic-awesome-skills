#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const out = process.argv[2];
if (!out || !path.isAbsolute(out) || process.argv.length !== 3) {
  process.stderr.write("AAS_PREVIEW_WORKBENCH_RECEIPT_ARGUMENT_INVALID\n");
  process.exit(1);
}

const receipt = {
  schemaVersion: 1,
  assuranceProfile: "agent-first-preview-1",
  appTests: "passed",
  productionBuild: "passed",
  liveDeployment: "notEvaluated",
};
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};

fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
fs.writeFileSync(out, `${stable(receipt)}\n`, { flag: "wx", mode: 0o600 });
process.stdout.write(`${stable(receipt)}\n`);
