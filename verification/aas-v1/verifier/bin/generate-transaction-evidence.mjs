#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { canonicalJson } from "../lib/canonical.mjs";
import { isolatedZones } from "../lib/runtime.mjs";
import { generateTransactionEvidence } from "../lib/transaction-controller.mjs";

function args(values) {
  const out = {};
  for (let index = 2; index < values.length; index += 2) {
    if (!values[index].startsWith("--") || values[index + 1] === undefined) throw new Error(`Invalid argument: ${values[index]}`);
    out[values[index].slice(2)] = values[index + 1];
  }
  return out;
}

const options = args(process.argv);
if (!options.tarball || !options["work-root"] || !options.out) throw new Error("--tarball, --work-root, and --out are required");
const workRoot = path.resolve(options["work-root"]);
const output = path.resolve(options.out);
fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
const evidence = await generateTransactionEvidence({
  tarball: path.resolve(options.tarball),
  workRoot,
  zones: isolatedZones(path.join(workRoot, "zones")),
});
const temporary = `${output}.pending-${process.pid}`;
fs.writeFileSync(temporary, `${canonicalJson(evidence)}\n`, { mode: 0o600, flag: "wx" });
fs.renameSync(temporary, output);
process.stdout.write(`${JSON.stringify({ ok: true, output, executions: evidence.executions, eventDigest: evidence.observer.eventDigest })}\n`);
