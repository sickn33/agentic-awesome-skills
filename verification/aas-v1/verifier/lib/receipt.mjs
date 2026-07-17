import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { canonicalJson, digestJson, sha256 } from "./canonical.mjs";

export const JOB_IDS = Object.freeze([
  "linux-node-22", "linux-node-24", "macos-node-22", "macos-node-24",
  "windows-node-22", "windows-node-24",
]);

export const SUITE_IDS = Object.freeze([
  "package", "entrypoints", "mcp", "property", "fuzz", "hostile",
  "legacy", "transaction", "adapters",
]);

export function receiptDigest(receipt) {
  const { receiptDigest: _omitted, ...payload } = receipt;
  return digestJson(payload);
}

export function finalizeReceipt(receipt) {
  return { ...receipt, receiptDigest: receiptDigest(receipt) };
}

export function writeCanonicalReceipt(file, receipt) {
  const finalized = finalizeReceipt(receipt);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${canonicalJson(finalized)}\n`, { mode: 0o600, flag: "wx" });
  return finalized;
}

export function loadReceiptValidator(schemaFile) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  return ajv.compile(JSON.parse(fs.readFileSync(schemaFile, "utf8")));
}

export function validateReceipt(receipt, validator) {
  const failures = [];
  if (!validator(receipt)) failures.push({ code: "AAS_VERIFIER_RECEIPT_SCHEMA", errors: validator.errors });
  if (receipt.receiptDigest !== receiptDigest(receipt)) failures.push({ code: "AAS_VERIFIER_RECEIPT_DIGEST" });
  const ids = (receipt.suites || []).map((entry) => entry.id);
  if (new Set(ids).size !== SUITE_IDS.length || SUITE_IDS.some((id) => !ids.includes(id))) {
    failures.push({ code: "AAS_VERIFIER_RECEIPT_SUITE_SET", ids });
  }
  for (const suite of receipt.suites || []) {
    if (suite.evidenceSha256 !== digestJson(suite.evidence)) failures.push({ code: "AAS_VERIFIER_SUITE_EVIDENCE_DIGEST", suite: suite.id });
  }
  return failures;
}

export function executableDigest() {
  return sha256(fs.readFileSync(process.execPath));
}

