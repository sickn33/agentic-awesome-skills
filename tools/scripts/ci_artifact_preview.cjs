#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MODES = new Set(["source-preview", "canonical-exact-tree"]);
const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;
const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parsePositiveInteger(value, label) {
  if (!/^[1-9]\d*$/.test(String(value))) throw new Error(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} is outside the safe integer range`);
  return parsed;
}

function validateString(value, label) {
  if (typeof value !== "string" || value.length === 0 || /[\0-\x1f\x7f]/.test(value)) {
    throw new Error(`${label} must be a non-empty string without control characters`);
  }
  return value;
}

function validateRelativePath(value) {
  validateString(value, "drift file");
  if (value.includes("\\") || path.posix.isAbsolute(value) || path.posix.normalize(value) !== value) {
    throw new Error(`Drift file must be a normalized repository-relative POSIX path: ${value}`);
  }
  if (value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Drift file contains an unsafe path segment: ${value}`);
  }
  return value;
}

function validateOrderedUniqueStrings(values, label, itemValidator = validateString) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  let previous = null;
  return values.map((value, index) => {
    const validated = itemValidator(value, `${label}[${index}]`);
    if (previous !== null && previous >= validated) {
      throw new Error(`${label} must be strictly sorted and contain no duplicates`);
    }
    previous = validated;
    return validated;
  });
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Manifest must be a JSON object");
  }
  const expectedKeys = [
    "categories", "driftFiles", "headSha", "mode", "primaryCategory", "repository",
    "runAttempt", "runId", "schemaVersion", "workflowSha",
  ].sort();
  const actualKeys = Object.keys(manifest).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error("Manifest contains missing or unsupported fields");
  }
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported manifest schemaVersion");
  if (!MODES.has(manifest.mode)) throw new Error(`Unsupported preview mode: ${manifest.mode}`);
  if (!REPOSITORY_RE.test(validateString(manifest.repository, "repository"))) {
    throw new Error("repository must use the owner/name form");
  }
  if (!/^\d+$/.test(String(manifest.runId))) throw new Error("runId must contain decimal digits");
  parsePositiveInteger(manifest.runAttempt, "runAttempt");
  for (const [label, value] of [["workflowSha", manifest.workflowSha], ["headSha", manifest.headSha]]) {
    if (!SHA_RE.test(value)) throw new Error(`${label} must be a full lowercase SHA-1`);
  }
  validateString(manifest.primaryCategory, "primaryCategory");
  validateOrderedUniqueStrings(manifest.categories, "categories");
  validateOrderedUniqueStrings(manifest.driftFiles, "driftFiles", validateRelativePath);
  if (manifest.mode === "canonical-exact-tree" && manifest.driftFiles.length !== 0) {
    throw new Error("canonical-exact-tree manifests must not contain generated drift");
  }
  return manifest;
}

function parseOptions(argv) {
  if (argv.length === 0) throw new Error("Expected create or verify-summary command");
  const command = argv[0];
  if (!new Set(["create", "verify-summary"]).has(command)) throw new Error(`Unknown command: ${command}`);
  const repeatable = new Set(["drift-file"]);
  const flags = new Set(["write-github-output", "write-step-summary"]);
  const options = { command, driftFile: [] };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    if (flags.has(name)) {
      const key = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (options[key]) throw new Error(`Duplicate option: ${token}`);
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
    const key = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!repeatable.has(name) && options[key] !== undefined) throw new Error(`Duplicate option: ${token}`);
    if (repeatable.has(name)) options[key].push(value);
    else options[key] = value;
    index += 1;
  }
  return options;
}

function requireOptions(options, names) {
  for (const name of names) {
    if (options[name] === undefined) throw new Error(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required`);
  }
}

function appendGithubOutput(digest) {
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required with --write-github-output");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `manifest_digest=${digest}\n`, "utf8");
}

function createManifest(options) {
  requireOptions(options, [
    "output", "mode", "repository", "runId", "runAttempt", "workflowSha", "headSha",
    "primaryCategory", "categoriesJson",
  ]);
  let categories;
  try {
    categories = JSON.parse(options.categoriesJson);
  } catch (error) {
    throw new Error(`--categories-json must be valid JSON: ${error.message}`);
  }
  const manifest = validateManifest({
    schemaVersion: 1,
    mode: options.mode,
    repository: options.repository,
    runId: String(options.runId),
    runAttempt: parsePositiveInteger(options.runAttempt, "runAttempt"),
    workflowSha: options.workflowSha,
    headSha: options.headSha,
    primaryCategory: options.primaryCategory,
    categories,
    driftFiles: options.driftFile,
  });
  const serialized = canonicalJson(manifest);
  const digest = sha256(serialized);
  fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
  fs.writeFileSync(options.output, `${serialized}\n`, { encoding: "utf8", mode: 0o600 });
  if (options.writeGithubOutput) appendGithubOutput(digest);
  process.stdout.write(`${digest}\n`);
  return { digest, manifest };
}

function readCanonicalManifest(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Manifest is not valid JSON: ${error.message}`);
  }
  validateManifest(manifest);
  const serialized = canonicalJson(manifest);
  if (raw !== `${serialized}\n`) throw new Error("Manifest is not encoded as canonical JSON with one trailing newline");
  return { manifest, serialized };
}

function appendSummary(manifest, digest) {
  if (!process.env.GITHUB_STEP_SUMMARY) throw new Error("GITHUB_STEP_SUMMARY is required with --write-step-summary");
  const drift = manifest.driftFiles.length
    ? manifest.driftFiles.map((file) => `- \`${file.replace(/`/g, "\\`")}\``).join("\n")
    : "- none";
  const lines = [
    "## Artifact Preview", "",
    `- Mode: \`${manifest.mode}\``,
    `- Primary change: \`${manifest.primaryCategory.replace(/`/g, "\\`")}\``,
    `- Categories: ${manifest.categories.length ? manifest.categories.map((item) => `\`${item.replace(/`/g, "\\`")}\``).join(", ") : "none"}`,
    `- Workflow SHA: \`${manifest.workflowSha}\``,
    `- Manifest SHA-256: \`${digest}\``, "", "Generated drift:", drift, "",
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"), "utf8");
}

function verifySummary(options) {
  requireOptions(options, [
    "manifest", "expectedRepository", "expectedRunId", "expectedRunAttempt",
    "expectedWorkflowSha", "expectedHeadSha", "expectedDigest",
  ]);
  if (!DIGEST_RE.test(options.expectedDigest)) throw new Error("--expected-digest must be a lowercase SHA-256");
  const { manifest, serialized } = readCanonicalManifest(options.manifest);
  const bindings = [
    ["repository", options.expectedRepository],
    ["runId", String(options.expectedRunId)],
    ["runAttempt", parsePositiveInteger(options.expectedRunAttempt, "expectedRunAttempt")],
    ["workflowSha", options.expectedWorkflowSha],
    ["headSha", options.expectedHeadSha],
  ];
  for (const [key, expected] of bindings) {
    if (manifest[key] !== expected) throw new Error(`Manifest ${key} does not match the expected workflow identity`);
  }
  const digest = sha256(serialized);
  if (digest !== options.expectedDigest) throw new Error("Manifest SHA-256 does not match --expected-digest");
  if (options.writeStepSummary) appendSummary(manifest, digest);
  process.stdout.write(`${digest}\n`);
  return manifest;
}

function main(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  return options.command === "create" ? createManifest(options) : verifySummary(options);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[ci-artifact-preview] ${error.message}`);
    process.exit(2);
  }
}

module.exports = {
  canonicalJson,
  createManifest,
  main,
  parseOptions,
  readCanonicalManifest,
  sha256,
  validateManifest,
  validateRelativePath,
  verifySummary,
};
