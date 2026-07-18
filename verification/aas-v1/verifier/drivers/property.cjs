"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MASK = (1n << 64n) - 1n;
const rotateLeft = (value, amount) => ((value << BigInt(amount)) | (value >> (64n - BigInt(amount)))) & MASK;

function deriveState(rootSeedHex, namespace) {
  const key = Buffer.from(rootSeedHex, "hex");
  let material = namespace;
  for (let retry = 0; retry < 100; retry += 1) {
    const bytes = crypto.createHmac("sha256", key).update(material).digest();
    const state = [0, 8, 16, 24].map((offset) => bytes.readBigUInt64BE(offset));
    if (state.some((word) => word !== 0n)) return state;
    material = `${namespace}/retry/${retry + 1}`;
  }
  throw new Error("non-zero PRNG state unavailable");
}

function nextUint64(state) {
  const result = (rotateLeft((state[1] * 5n) & MASK, 7) * 9n) & MASK;
  const temporary = (state[1] << 17n) & MASK;
  state[2] ^= state[0]; state[3] ^= state[1]; state[1] ^= state[2]; state[0] ^= state[3];
  state[2] ^= temporary; state[3] = rotateLeft(state[3], 45);
  return result;
}

function sample(state, upper) {
  const bound = BigInt(upper);
  const limit = (1n << 64n) - ((1n << 64n) % bound);
  let value;
  do value = nextUint64(state); while (value >= limit);
  return Number(value % bound);
}

function stateHex(state) {
  return state.map((word) => word.toString(16).padStart(16, "0")).join("");
}

function main(input) {
  const core = require(path.join(input.packageRoot, "tools/lib/aas-v1"));
  const { judgment, notApplicable, recommendStack, canonicalJson, sha256, stack } = core;
  const budget = input.budget;
  const rootSeed = budget.prng.rootSeed;
  for (const vector of budget.prng.substreams.testVectors) {
    const state = deriveState(rootSeed, vector.namespace);
    if (stateHex(state) !== vector.stateHex || nextUint64(state).toString(16).padStart(16, "0") !== vector.firstUint64Hex) {
      throw new Error(`PRNG test vector failed: ${vector.namespace}`);
    }
  }

  const known = (value) => judgment(value, [{ type: "independent-property-fixture" }]);
  const skill = (id, options = {}) => ({
    id,
    name: id,
    description: options.description || id,
    category: "fixture",
    tags: [],
    triggers: [],
    searchTokens: options.tokens || [id],
    recommendationTokens: options.tokens || [id],
    metadata: {
      capabilities: known(options.capabilities || ["goal-a"]),
      risk: options.risk === null ? judgment(null) : known(options.risk || "safe"),
      source: options.source === null ? judgment(null) : known(options.source || { repository: "fixture" }),
      license: notApplicable(),
      targets: {
        codex: known(options.codex || "supported"),
        claude: known(options.claude || "supported"),
      },
      setup: options.setup === null ? judgment(null) : known(options.setup || "none"),
      dependencies: known(options.dependencies || []),
      conflicts: known(options.conflicts || []),
      validation: known({ catalogWideSelection: true }),
      tests: notApplicable(),
      reviews: known([{ reviewer: "independent-property-driver" }]),
    },
  });
  const catalog = (skills) => ({ schemaVersion: 1, package: "property-fixture", version: "1.0.0", digest: sha256(canonicalJson({ skills })), skills });
  const baseInput = (overrides = {}) => ({
    intent: "web-application-delivery",
    profile: { request: "goal-a" },
    targets: [{ host: "codex", scope: "project" }],
    criticalGoals: ["goal-a"],
    nonCriticalGoals: [],
    minimumNonCriticalGoalCoverage: 0.8,
    policy: { allowedRisk: ["safe"], requireKnownSource: false, allowManualSetup: false },
    maxSkills: 4,
    ...overrides,
  });

  const summary = {};
  let total = 0;
  let hardPolicyViolations = 0;
  const fail = (condition, code) => {
    if (!condition) {
      hardPolicyViolations += 1;
      throw new Error(code);
    }
  };
  const remap = (value, mapping) => {
    if (typeof value === "string") return mapping[value] || value;
    if (Array.isArray(value)) return value.map((entry) => remap(entry, mapping));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== "canonicalJson")
      .map(([key, entry]) => [key, remap(entry, mapping)]));
    return value;
  };

  for (const stratum of budget.propertyAndGenerative.strata) {
    let executions = 0;
    let accumulator = 0n;
    for (let index = 0; index < stratum.executions; index += 1) {
      if (index % input.jobCount !== input.jobIndex) continue;
      const namespace = `aas.v1/property-and-generative/${stratum.id}/execution/${index}`;
      const state = deriveState(rootSeed, namespace);
      const variant = sample(state, 4);
      if (stratum.id === "hard-policy-risk") {
        const result = recommendStack(catalog([skill("safe", { tokens: ["goal-a"] }), skill("blocked", { risk: "offensive", tokens: ["goal-a", "goal-a"] })]), baseInput());
        fail(!result.proposedStack.includes("blocked"), "risk policy violation");
      } else if (stratum.id === "hard-policy-provenance") {
        const result = recommendStack(catalog([skill("known"), skill("unknown", { source: null, tokens: ["goal-a", "goal-a"] })]), baseInput({ policy: { allowedRisk: ["safe"], requireKnownSource: true, allowManualSetup: false } }));
        fail(!result.proposedStack.includes("unknown"), "source policy violation");
      } else if (stratum.id === "hard-policy-compatibility") {
        const host = variant % 2 ? "claude" : "codex";
        const blocked = host === "codex" ? skill("blocked", { codex: "blocked" }) : skill("blocked", { claude: "blocked" });
        const result = recommendStack(catalog([skill("supported"), blocked]), baseInput({ targets: [{ host, scope: "project" }] }));
        fail(!result.proposedStack.includes("blocked"), "compatibility policy violation");
      } else if (stratum.id === "unknown-eligibility") {
        const result = recommendStack(catalog([skill("unknown", { risk: null }), skill("known")]), baseInput());
        fail(!result.proposedStack.includes("unknown") && result.discoveryCandidates.some((entry) => entry.id === "unknown"), "unknown eligibility was hidden or promoted");
      } else if (stratum.id === "dependency-conflict") {
        const skills = [
          skill("root", { dependencies: ["dep"], capabilities: ["goal-a"] }),
          skill("dep", { capabilities: ["goal-b"] }),
          skill("conflict", { conflicts: ["root"], capabilities: ["goal-a"] }),
        ];
        const result = recommendStack(catalog(skills), baseInput());
        if (result.proposedStack.includes("root")) fail(result.proposedStack.includes("dep"), "dependency omitted");
        fail(!(result.proposedStack.includes("root") && result.proposedStack.includes("conflict")), "conflict co-selected");
      } else if (stratum.id === "catalog-order-metamorphic") {
        const skills = [skill("a", { tokens: ["goal-a", "goal-a"] }), skill("b", { tokens: ["goal-a"] }), skill("c", { capabilities: ["goal-b"] })];
        const identity = catalog(skills);
        const left = recommendStack(identity, baseInput());
        const right = recommendStack({ ...identity, skills: [...skills].reverse() }, baseInput());
        fail(left.canonicalJson === right.canonicalJson, "catalog-order metamorphic mismatch");
      } else if (stratum.id === "consistent-id-permutation") {
        const skills = [skill("alpha", { tokens: ["goal-a", "goal-a"] }), skill("beta", { tokens: ["goal-a"] })];
        const firstCatalog = catalog(skills);
        const mapping = { alpha: "renamed-a", beta: "renamed-b" };
        const inverse = { "renamed-a": "alpha", "renamed-b": "beta" };
        const renamedSkills = skills.map((entry) => ({ ...entry, id: mapping[entry.id], name: mapping[entry.id] }));
        const left = recommendStack(firstCatalog, baseInput());
        const right = recommendStack({ ...firstCatalog, skills: renamedSkills }, baseInput());
        fail(canonicalJson(remap(left, {})) === canonicalJson(remap(right, inverse)), "consistent-ID metamorphic mismatch");
      } else if (stratum.id === "plan-policy-invariants") {
        const digest = `sha256-${"1".repeat(64)}`;
        const emptyStateDigest = sha256(canonicalJson({ schemaVersion: 1, entries: [] }));
        const nextStateDigest = sha256(canonicalJson({ schemaVersion: 1, entries: [{ skillId: "skill-a", treeDigest: digest, catalogIntegrity: digest }] }));
        const manifest = { schemaVersion: 1, name: "property", catalog: { package: "property-fixture", version: "1.0.0", integrity: digest }, targets: [{ host: "codex", scope: "project" }], intent: { goals: ["goal-a"] }, policy: { allowedRisk: ["safe"], requireKnownSource: true, allowManualSetup: false }, skills: [{ id: "skill-a" }] };
        const plan = stack.buildPlanEnvelope({ manifest, handshake: { protocolVersion: core.protocolVersion, coreVersion: core.coreVersion, metadataSchemaVersion: core.metadataSchemaVersion, scorerVersion: core.scorerVersion }, catalog: manifest.catalog, runtime: { package: "property-fixture", version: "1.0.0", integrity: digest, closureDigest: digest }, target: { host: "codex", scope: "project", adapterVersion: "1.0.0", identityDigest: digest }, installedState: { digest: emptyStateDigest, entries: [] }, operations: [{ kind: "install", skillId: "skill-a", sourceTreeDigest: digest, expectedTreeDigest: null, resultTreeDigest: digest, backupRequired: false }], overrides: [], stateCommit: { previousDigest: emptyStateDigest, nextDigest: nextStateDigest, position: "final" } });
        const tampered = JSON.parse(JSON.stringify(plan));
        tampered.payload.policy.allowedRisk = [variant % 2 ? "offensive" : "none"];
        let rejected = false;
        try { stack.validatePlanEnvelope(tampered); } catch { rejected = true; }
        fail(rejected, "tampered immutable plan accepted");
      } else throw new Error(`unknown property stratum: ${stratum.id}`);
      accumulator ^= nextUint64(state);
      executions += 1;
      total += 1;
    }
    summary[stratum.id] = { executions, accumulator: accumulator.toString(16).padStart(16, "0") };
  }
  return { schemaVersion: 1, ok: true, total, hardPolicyViolations, summary };
}

const input = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(`${JSON.stringify(main(input))}\n`);
