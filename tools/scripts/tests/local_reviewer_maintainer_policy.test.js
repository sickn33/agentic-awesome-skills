#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const policies = ["AGENTS.md", ".github/MAINTENANCE.md"];
const required = [
  "<!-- local-skill-reviewer-policy:v1 -->",
  "npm run review:skills:local -- review <skill-id> --merge-gate --result-dir <private-temp-dir>",
  "npm run review:skills:semantic:packet -- <skill-id> --result-dir <private-temp-dir>",
  "npm run review:skills:semantic:prepare -- --result-dir <private-temp-dir>",
  "npm run review:skills:semantic:import -- <skill-id> --input <codex-judgment.json> --result-dir <private-temp-dir>",
  "npm run review:skills:semantic:verify -- <skill-id> --result-dir <private-temp-dir>",
  "triage.reviewStatus",
  "triage.priority",
  "triage.reasonCodes",
  "source: local-skill-reviewer",
  "does not replace Tessl",
  "does not satisfy the exact-head attestation",
  "full head SHA remains the official merge gate",
  "Single-skill semantic route (alternative to batch preparation)",
  "Batch semantic route (alternative to the single-skill packet command)",
  "Never run `semantic:packet` and `semantic:prepare` for the same skill in the same result directory",
];

for (const relativePath of policies) {
  const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  for (const invariant of required) assert(text.includes(invariant), `${relativePath} is missing local reviewer policy invariant: ${invariant}`);
  const bashBlocks = [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]);
  assert(!bashBlocks.some((block) => block.includes("review:skills:semantic:packet") && block.includes("review:skills:semantic:prepare")), `${relativePath} presents mutually exclusive semantic preparation routes as one command sequence`);
  assert(!/local reviewer[^\n]{0,120}(?:replaces Tessl|satisfies the exact-head)/i.test(text), `${relativePath} overstates the local reviewer`);
}

process.stdout.write("local reviewer maintainer policy contract passed\n");
