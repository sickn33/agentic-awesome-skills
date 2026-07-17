#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateReceipts, writeBundle } from "../lib/aggregate.mjs";
import { loadReceiptValidator } from "../lib/receipt.mjs";

const outIndex = process.argv.indexOf("--out");
const out = outIndex >= 0 ? path.resolve(process.argv[outIndex + 1]) : null;
const inputs = process.argv.slice(2).filter((value, index, all) => value !== "--out" && all[index - 1] !== "--out");
if (!out || inputs.length === 0) throw new Error("Usage: merge-product-evidence --out <bundle.json> <receipt...>");
const here = path.dirname(fileURLToPath(import.meta.url));
const schema = path.resolve(here, "..", "..", "schemas", "product-verifier-receipt.schema.json");
const validator = loadReceiptValidator(schema);
const receipts = inputs.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const bundle = aggregateReceipts(receipts, validator);
writeBundle(out, bundle);
process.stdout.write(`${JSON.stringify({ ok: bundle.status === "passed", out, bundleDigest: bundle.bundleDigest, failures: bundle.failures })}\n`);
if (bundle.status !== "passed") process.exit(1);

