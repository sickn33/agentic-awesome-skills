#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/project-root");
const { buildDecisionManifest } = require("../lib/pr-decision");

function parseArgs(argv) {
  const args = {
    preflight: null,
    evidence: null,
    output: null,
    semanticReviewState: "unknown",
    writeStepSummary: false,
    writeGithubOutput: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--preflight", "--evidence", "--output", "--semantic-review-state"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      const key = {
        "--preflight": "preflight",
        "--evidence": "evidence",
        "--output": "output",
        "--semantic-review-state": "semanticReviewState",
      }[arg];
      args[key] = value;
      index += 1;
    } else if (arg === "--write-step-summary") {
      args.writeStepSummary = true;
    } else if (arg === "--write-github-output") {
      args.writeGithubOutput = true;
    } else if (arg === "--json") {
      args.json = true;
    }
  }
  if (!args.preflight || !args.evidence) {
    throw new Error("--preflight and --evidence are required");
  }
  return args;
}

function safePath(projectRoot, value) {
  const target = path.resolve(projectRoot, value);
  const relative = path.relative(projectRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes repository root: ${value}`);
  }
  return target;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function appendSummary(manifest) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const lines = [
    "## PR Decision Manifest (shadow)",
    "",
    `- Route: \`${manifest.route}\``,
    `- Deterministic gate: ${manifest.deterministic_gate.blocking ? "blocking" : "pass"}`,
    `- Semantic review: \`${manifest.semantic_review.state}\``,
    `- Changed skills: ${manifest.change.changed_skills.length}`,
    `- Sensitive paths: ${manifest.change.sensitive_paths.length}`,
    `- Reasons: ${manifest.reason_codes.length ? manifest.reason_codes.map((item) => `\`${item}\``).join(", ") : "none"}`,
    "",
    "> Advisory artifact produced by unprivileged pull_request code. Privileged actions must recompute from trusted main.",
  ];
  fs.appendFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

function appendGithubOutput(manifest) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = [
    `route=${manifest.route}`,
    `blocking=${manifest.deterministic_gate.blocking}`,
    `semantic_review_state=${manifest.semantic_review.state}`,
    `changed_skills_count=${manifest.change.changed_skills.length}`,
    `sensitive_paths_count=${manifest.change.sensitive_paths.length}`,
  ];
  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = findProjectRoot(__dirname);
  const preflight = readJson(safePath(projectRoot, args.preflight));
  const evidence = readJson(safePath(projectRoot, args.evidence));
  const manifest = buildDecisionManifest({
    preflight,
    evidence,
    semanticReviewState: args.semanticReviewState,
  });
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (args.output) {
    const outputPath = safePath(projectRoot, args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialized, { encoding: "utf8", mode: 0o600 });
  }
  if (args.writeStepSummary) appendSummary(manifest);
  if (args.writeGithubOutput) appendGithubOutput(manifest);
  if (args.json || !args.output) process.stdout.write(serialized);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[pr-decision] ${error.message}`);
    process.exit(2);
  }
}

module.exports = { appendGithubOutput, appendSummary, parseArgs, safePath };
