#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { artifactName } = require("../../local-skill-reviewer/safe-io");
const { collectParity, DIMENSIONS, makeLabel, mappingOptions, normalize, validateCredits, validatePredictions, verifyMetadata } = require("../../local-skill-reviewer/tessl-parity-collector");

const ROOT = path.resolve(__dirname, "../../..");
const MANIFEST_PATH = path.join(ROOT, "tools/config/local-skill-review-parity-benchmark.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

function stable(value) { return Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value; }
function hash(value) { return crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest("hex"); }
function tempDir(name) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)); fs.chmodSync(dir, 0o700); return dir; }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 }); fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, { mode: 0o600 }); }
function predictions(extra = {}) {
  return {
    schemaVersion: 1, kind: "aas-tessl-parity-pre-reveal-predictions", manifestSelectionSha256: manifest.integrity.selectionSha256, split: "final_blind",
    predictions: Object.fromEntries(manifest.splits.final_blind.map((item) => [item.id, { score: 50, description: [2, 2, 2, 2], content: [2, 2, 2, 2] }])),
    ...extra,
  };
}

function seedNormalized(resultRoot, exceptId = null) {
  for (let index = 0; index < manifest.splits.validation.length; index += 1) {
    const skill = manifest.splits.validation[index];
    if (skill.id === exceptId) continue;
    writeJson(path.join(resultRoot, "normalized", `${artifactName(skill.id)}.unique.json`), { schemaVersion: 1, kind: "aas-tessl-parity-labels", split: "validation", skillId: skill.id, bundleHash: skill.bundleHash, repeat: 0, reviewRunId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, label: makeLabel("validation", skill.id, 0), score: 50, validationNormalized: 0.96875, warnings: 1, errors: 0, totalChecks: 16, description: [2, 2, 2, 2], content: [2, 2, 2, 2], agent: "claude", model: "glm-5.2", reviewPlugin: "tessl/default-skill-review@0.1.0", reusedFrom: null });
  }
}

function fakeTessl({ remaining = 0, malformed = false } = {}) {
  const root = tempDir("aas-fake-tessl-parity");
  const log = path.join(root, "calls.jsonl");
  const executable = path.join(root, "tessl");
const source = `#!/usr/bin/env node
const fs=require("fs");
fs.appendFileSync(process.env.FAKE_TESSL_LOG, JSON.stringify(process.argv.slice(2))+"\\n");
if(process.argv[2]==="--version") process.stdout.write("0.91.0\\n");
else if(process.argv[2]==="api") process.stdout.write(JSON.stringify({links:{self:"fake"},data:{id:"org",type:"credit-account",attributes:{credits:{state:"ok",limit:1000,used:${1000 - remaining},remaining:${malformed ? JSON.stringify("invalid") : remaining},windowStart:"2026-07-01T00:00:00.000Z",overLimit:false,blocked:false,overageAllowed:false},plan:{code:"free"}}}}));
else { process.stderr.write("unexpected fake Tessl call\\n"); process.exitCode=9; }
`;
  fs.writeFileSync(executable, source, { mode: 0o700 });
  return { executable, log };
}

function successfulFakeTessl(runId = "00000000-0000-4000-8000-999999999999", charge = 10) {
  const root = tempDir("aas-success-fake-tessl");
  const log = path.join(root, "calls.jsonl");
  const state = path.join(root, "state.json");
  const executable = path.join(root, "tessl");
  const scoreMap = (ids) => Object.fromEntries(ids.map((id) => [id, { score: 2, reasoning: "fixture" }]));
  const view = { reviewRunId: runId, "review-plugin": "tessl/default-skill-review@0.1.0", validation: { overallPassed: true, errorCount: 0, warningCount: 1, checks: Array.from({ length: 16 }, () => ({ status: "passed" })) }, judges: { description: { success: true, evaluation: { scores: scoreMap(DIMENSIONS.description) } }, content: { success: true, evaluation: { scores: scoreMap(DIMENSIONS.content) } } }, review: { reviewScore: 50 } };
  const source = `#!/usr/bin/env node
const fs=require("fs"),a=process.argv.slice(2),log=process.env.FAKE_TESSL_LOG,state=process.env.FAKE_TESSL_STATE;
fs.appendFileSync(log,JSON.stringify(a)+"\\n");
const view=${JSON.stringify(JSON.stringify(view))};
const s=fs.existsSync(state)?JSON.parse(fs.readFileSync(state)):{remaining:100};
const credits={links:{self:"fake"},data:{id:"org",type:"credit-account",attributes:{credits:{state:"ok",limit:1000,used:1000-s.remaining,remaining:s.remaining,windowStart:"2026-07-01T00:00:00.000Z",overLimit:false,blocked:false,overageAllowed:false},plan:{code:"free"}}}};
if(a[0]==="--version") process.stdout.write("0.91.0\\n");
else if(a[0]==="api") process.stdout.write(JSON.stringify(credits));
else if(a[0]==="review"&&a[1]==="run") { const label=a[a.indexOf("--label")+1]; fs.writeFileSync(state,JSON.stringify({...s,label,remaining:s.remaining-${charge}})); process.stdout.write(view); }
else if(a[0]==="review"&&a[1]==="list") { const metadata={pathLabel:s.label}; if(s.reusedFromReviewRunId!==undefined) metadata.reusedFromReviewRunId=s.reusedFromReviewRunId; process.stdout.write(JSON.stringify({data:[{id:"${runId}",type:"review",attributes:{status:"completed",metadata,config:{agent:"claude",model:"glm-5.2",pluginRef:"tessl/default-skill-review@0.1.0"},results:{scoring:{components:[{id:"validation",normalized:0.96875}]}}}}]})); }
else if(a[0]==="review"&&a[1]==="view") process.stdout.write(view);
else process.exitCode=9;
`;
  fs.writeFileSync(executable, source, { mode: 0o700 });
  return { executable, log, state, runId };
}

async function expectNoReviewCall(operation, fake) {
  const prior = process.env.FAKE_TESSL_LOG;
  process.env.FAKE_TESSL_LOG = fake.log;
  try { await assert.rejects(operation); }
  finally { if (prior === undefined) delete process.env.FAKE_TESSL_LOG; else process.env.FAKE_TESSL_LOG = prior; }
  const calls = fs.existsSync(fake.log) ? fs.readFileSync(fake.log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
  assert(!calls.some((args) => args[0] === "review" && args[1] === "run"), `review submission leaked through guard: ${JSON.stringify(calls)}`);
  return calls;
}

(async () => {
  const fake = fakeTessl();
  await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "tuning", resultDir: tempDir("aas-parity-bad-split"), tesslPath: fake.executable }), fake);

  const badSchema = JSON.parse(JSON.stringify(manifest)); badSchema.injected = true;
  const badSchemaPath = path.join(tempDir("aas-parity-bad-schema"), "manifest.json"); writeJson(badSchemaPath, badSchema);
  await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: badSchemaPath, split: "validation", resultDir: tempDir("aas-parity-bad-schema-out"), tesslPath: fake.executable }), fake);

  const badBundle = JSON.parse(JSON.stringify(manifest));
  badBundle.splits.validation[0].bundleHash = "0".repeat(64);
  badBundle.integrity.selectionSha256 = hash(badBundle.splits);
  const badBundlePath = path.join(tempDir("aas-parity-bad-bundle"), "manifest.json"); writeJson(badBundlePath, badBundle);
  await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: badBundlePath, split: "validation", resultDir: tempDir("aas-parity-bad-bundle-out"), tesslPath: fake.executable }), fake);

  const predictionPath = path.join(tempDir("aas-parity-predictions"), "predictions.json"); writeJson(predictionPath, predictions());
  await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "final_blind", resultDir: tempDir("aas-parity-bad-pred-hash"), predictionsPath: predictionPath, predictionsSha256: "f".repeat(64), tesslPath: fake.executable }), fake);
  const invalidPredictions = predictions({ injected: true });
  const invalidPredictionPath = path.join(tempDir("aas-parity-pred-schema"), "predictions.json"); writeJson(invalidPredictionPath, invalidPredictions);
  await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "final_blind", resultDir: tempDir("aas-parity-bad-pred-schema-out"), predictionsPath: invalidPredictionPath, predictionsSha256: hash(fs.readFileSync(invalidPredictionPath)), tesslPath: fake.executable }), fake);

  const creditCalls = await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: tempDir("aas-parity-zero-credit"), tesslPath: fake.executable }), fake);
  assert(creditCalls.some((args) => args[0] === "api" && /credits$/.test(args[1])), "zero-credit guard must read the live account first");
  const malformedCredit = fakeTessl({ remaining: 100, malformed: true });
  const malformedCalls = await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: tempDir("aas-parity-malformed-credit"), tesslPath: malformedCredit.executable }), malformedCredit);
  assert(malformedCalls.some((args) => args[0] === "api"), "malformed credit response must fail after a live read");
  const driftedCli = fakeTessl({ remaining: 1000 });
  await expectNoReviewCall(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: tempDir("aas-parity-cli-drift"), tesslPath: driftedCli.executable, versionCommand: async () => "0.92.0" }), driftedCli);

  const credit = validateCredits({ links: {}, data: { id: "org", type: "credit-account", attributes: { credits: { state: "ok", limit: 1000, used: 250, remaining: 750, windowStart: "2026-07-01T00:00:00.000Z", overLimit: false, blocked: false, overageAllowed: false }, plan: { code: "free" } } } });
  assert.strictEqual(credit.remaining, 750);
  const predictionBytes = fs.readFileSync(predictionPath);
  assert.strictEqual(validatePredictions(JSON.parse(predictionBytes), manifest, hash(predictionBytes), predictionBytes).split, "final_blind");

  const runId = "00000000-0000-4000-8000-000000000001";
  const label = makeLabel("validation", manifest.splits.validation[0].id, 0);
  const scores = (ids) => Object.fromEntries(ids.map((id) => [id, { score: 2, reasoning: "fixture" }]));
  const view = { reviewRunId: runId, "review-plugin": "tessl/default-skill-review@0.1.0", validation: { overallPassed: true, errorCount: 0, warningCount: 1, checks: Array.from({ length: 16 }, () => ({ status: "passed" })) }, judges: { description: { success: true, evaluation: { scores: scores(DIMENSIONS.description) } }, content: { success: true, evaluation: { scores: scores(DIMENSIONS.content) } } }, review: { reviewScore: 50 } };
  const entry = { id: runId, type: "review", attributes: { status: "completed", metadata: { pathLabel: label }, config: { agent: "claude", model: "glm-5.2", pluginRef: "tessl/default-skill-review@0.1.0" }, results: { scoring: { components: [{ id: "validation", normalized: 0.96875 }] } } } };
  const observed = verifyMetadata(entry, { runId, label });
  const item = normalize(view, { split: "validation", skill: manifest.splits.validation[0], repeat: 0, label, runId }, observed, entry);
  assert.deepStrictEqual(item.description, [2, 2, 2, 2]);
  assert.strictEqual(item.validationNormalized, 0.96875);
  assert.throws(() => verifyMetadata({ ...entry, attributes: { ...entry.attributes, config: { ...entry.attributes.config, model: "other" } } }, { runId, label }), /metadata mismatch/);
  assert.throws(() => verifyMetadata({ ...entry, attributes: { ...entry.attributes, metadata: { ...entry.attributes.metadata, reusedFromReviewRunId: "00000000-0000-4000-8000-000000000002" } } }, { runId, label }), /metadata mismatch/);

  const resumeRoot = tempDir("aas-parity-resume");
  seedNormalized(resumeRoot, manifest.splits.validation[0].id);
  const successFake = successfulFakeTessl();
  const prior = process.env.FAKE_TESSL_LOG; const priorState = process.env.FAKE_TESSL_STATE;
  process.env.FAKE_TESSL_LOG = successFake.log; process.env.FAKE_TESSL_STATE = successFake.state;
  try { await collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: resumeRoot, tesslPath: successFake.executable, concurrency: 1, pollMs: 0 }); }
  finally { if (prior === undefined) delete process.env.FAKE_TESSL_LOG; else process.env.FAKE_TESSL_LOG = prior; }
  if (priorState === undefined) delete process.env.FAKE_TESSL_STATE; else process.env.FAKE_TESSL_STATE = priorState;
  const successfulCalls = fs.readFileSync(successFake.log, "utf8").trim().split("\n").map(JSON.parse);
  const run = successfulCalls.find((args) => args[0] === "review" && args[1] === "run");
  assert(run, "one uncollected item must submit exactly once");
  assert.deepStrictEqual(run.slice(0, 4), ["review", "run", "quality", run[3]]);
  assert.deepStrictEqual(run.slice(4), ["--json", "--workspace", "019f1c57-2d90-72cd-b477-f452fd852e62", "--threshold", "1", "--force", "--label", makeLabel("validation", manifest.splits.validation[0].id, 0)]);
  assert(!run.includes("--review-plugin"), "free-plan collector must use the implicit default plugin");
  assert.strictEqual(successfulCalls.filter((args) => args[0] === "api").length, 3, "credits require batch preflight plus wave before/after checks");
  assert.strictEqual(successfulCalls.filter((args) => args[0] === "review" && args[1] === "view").length, 0, "live completed run JSON must be used directly without a redundant view call");
  const gold = JSON.parse(fs.readFileSync(path.join(resumeRoot, "gold.json"), "utf8"));
  assert.deepStrictEqual(Object.keys(gold).sort(), ["items", "kind", "oracle", "schemaVersion", "split"].sort());
  assert.strictEqual(gold.kind, "aas-tessl-parity-gold");
  assert.strictEqual(gold.items.length, manifest.splits.validation.length);
  assert.deepStrictEqual(Object.keys(gold.items[0]).sort(), ["content", "description", "reviewRunId", "score", "skillId", "validation"].sort());

  const mismatchRoot = tempDir("aas-parity-cost-mismatch");
  seedNormalized(mismatchRoot, manifest.splits.validation[0].id);
  const mismatchFake = successfulFakeTessl("00000000-0000-4000-8000-888888888888", 0);
  const mismatchLogPrior = process.env.FAKE_TESSL_LOG; const mismatchStatePrior = process.env.FAKE_TESSL_STATE;
  process.env.FAKE_TESSL_LOG = mismatchFake.log; process.env.FAKE_TESSL_STATE = mismatchFake.state;
  try { await assert.rejects(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: mismatchRoot, tesslPath: mismatchFake.executable, concurrency: 1 }), /credit cost mismatch/); }
  finally { if (mismatchLogPrior === undefined) delete process.env.FAKE_TESSL_LOG; else process.env.FAKE_TESSL_LOG = mismatchLogPrior; if (mismatchStatePrior === undefined) delete process.env.FAKE_TESSL_STATE; else process.env.FAKE_TESSL_STATE = mismatchStatePrior; }

  const overlapRoot = tempDir("aas-parity-overlap");
  const overlapSkills = manifest.splits.validation.slice(0, 2);
  for (const skill of overlapSkills) seedNormalized(overlapRoot, skill.id);
  // seedNormalized excludes only one ID, so explicitly remove both selected files.
  for (const skill of overlapSkills) fs.unlinkSync(path.join(overlapRoot, "normalized", `${artifactName(skill.id)}.unique.json`));
  let remaining = 100; let active = 0; let maxActive = 0;
  const completed = new Map();
  const creditResponse = () => ({ links: {}, data: { id: "org", type: "credit-account", attributes: { credits: { state: "ok", limit: 1000, used: 1000 - remaining, remaining, windowStart: "2026-07-01T00:00:00.000Z", overLimit: false, blocked: false, overageAllowed: false } } } });
  const overlapCommand = async (_tesslPath, args) => {
    if (args[0] === "api") return creditResponse();
    if (args[0] === "review" && args[1] === "run") {
      const labelValue = args[args.indexOf("--label") + 1];
      const index = overlapSkills.findIndex((skill) => labelValue === makeLabel("validation", skill.id, 0));
      const overlapRunId = `00000000-0000-4000-8000-${String(700 + index).padStart(12, "0")}`;
      active += 1; maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const overlapView = { reviewRunId: overlapRunId, "review-plugin": "tessl/default-skill-review@0.1.0", validation: { overallPassed: true, errorCount: 0, warningCount: 1, checks: Array.from({ length: 16 }, () => ({ status: "passed" })) }, judges: { description: { success: true, evaluation: { scores: scores(DIMENSIONS.description) } }, content: { success: true, evaluation: { scores: scores(DIMENSIONS.content) } } }, review: { reviewScore: 50 } };
      completed.set(overlapRunId, { label: labelValue, view: overlapView });
      remaining -= 10; active -= 1;
      return overlapView;
    }
    if (args[0] === "review" && args[1] === "list") return { data: [...completed].map(([id, value]) => ({ id, type: "review", attributes: { status: "completed", metadata: { pathLabel: value.label }, config: { agent: "claude", model: "glm-5.2", pluginRef: "tessl/default-skill-review@0.1.0" }, results: { scoring: { components: [{ id: "validation", normalized: 0.96875 }] } } } })) };
    throw new Error(`Unexpected overlap command: ${args.join(" ")}`);
  };
  await collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: overlapRoot, concurrency: 2, command: overlapCommand, versionCommand: async () => "0.91.0" });
  assert.strictEqual(maxActive, 2, "concurrency=2 must overlap two paid review calls within a wave");

  const noCallFake = fakeTessl({ remaining: 100 });
  const oldLog = process.env.FAKE_TESSL_LOG; process.env.FAKE_TESSL_LOG = noCallFake.log;
  try { await collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: resumeRoot, tesslPath: noCallFake.executable }); }
  finally { if (oldLog === undefined) delete process.env.FAKE_TESSL_LOG; else process.env.FAKE_TESSL_LOG = oldLog; }
  assert(!fs.existsSync(noCallFake.log), "idempotent completed resume must not call Tessl");

  const adoptedId = "tool-use-guardian";
  const adoptedRunId = "019f703b-42f9-75d3-874a-caf54847c839";
  assert.deepStrictEqual(mappingOptions(["--adopt-run", `${adoptedId}=${adoptedRunId}`], "--adopt-run"), { [adoptedId]: adoptedRunId });
  const adoptionRoot = tempDir("aas-parity-adoption");
  seedNormalized(adoptionRoot, adoptedId);
  const adoptionFake = successfulFakeTessl(adoptedRunId);
  writeJson(adoptionFake.state, { label: makeLabel("validation", adoptedId, 0) });
  const adoptionLogPrior = process.env.FAKE_TESSL_LOG; const adoptionStatePrior = process.env.FAKE_TESSL_STATE;
  process.env.FAKE_TESSL_LOG = adoptionFake.log; process.env.FAKE_TESSL_STATE = adoptionFake.state;
  try { await collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: adoptionRoot, tesslPath: adoptionFake.executable, adoptRuns: { [adoptedId]: adoptedRunId }, concurrency: 1 }); }
  finally { if (adoptionLogPrior === undefined) delete process.env.FAKE_TESSL_LOG; else process.env.FAKE_TESSL_LOG = adoptionLogPrior; if (adoptionStatePrior === undefined) delete process.env.FAKE_TESSL_STATE; else process.env.FAKE_TESSL_STATE = adoptionStatePrior; }
  const adoptionCalls = fs.readFileSync(adoptionFake.log, "utf8").trim().split("\n").map(JSON.parse);
  assert.deepStrictEqual(adoptionCalls.map((args) => args.slice(0, 2)), [["review", "list"], ["review", "view"]], "adoption must be read-only");
  const adoptedGold = JSON.parse(fs.readFileSync(path.join(adoptionRoot, "gold.json"), "utf8"));
  assert.strictEqual(adoptedGold.items.find((item) => item.skillId === adoptedId).reviewRunId, adoptedRunId);

  const reusedRoot = tempDir("aas-parity-reused-adoption");
  seedNormalized(reusedRoot, adoptedId);
  const reusedFake = successfulFakeTessl(adoptedRunId);
  writeJson(reusedFake.state, { label: makeLabel("validation", adoptedId, 0), reusedFromReviewRunId: "00000000-0000-4000-8000-000000000002" });
  const reusedLogPrior = process.env.FAKE_TESSL_LOG; const reusedStatePrior = process.env.FAKE_TESSL_STATE;
  process.env.FAKE_TESSL_LOG = reusedFake.log; process.env.FAKE_TESSL_STATE = reusedFake.state;
  try { await assert.rejects(() => collectParity({ repoRoot: ROOT, manifestPath: MANIFEST_PATH, split: "validation", resultDir: reusedRoot, tesslPath: reusedFake.executable, adoptRuns: { [adoptedId]: adoptedRunId }, concurrency: 1 }), /metadata mismatch/); }
  finally { if (reusedLogPrior === undefined) delete process.env.FAKE_TESSL_LOG; else process.env.FAKE_TESSL_LOG = reusedLogPrior; if (reusedStatePrior === undefined) delete process.env.FAKE_TESSL_STATE; else process.env.FAKE_TESSL_STATE = reusedStatePrior; }
  const reusedCalls = fs.readFileSync(reusedFake.log, "utf8").trim().split("\n").map(JSON.parse);
  assert(!reusedCalls.some((args) => args[0] === "api" || (args[0] === "review" && args[1] === "run")), "reused adoption rejection must not spend credits");

  process.stdout.write("Tessl parity collector tests passed\n");
})().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
