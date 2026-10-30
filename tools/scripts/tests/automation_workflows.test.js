const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");
const root = path.resolve(__dirname,"../../..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const load = file => yaml.parse(read(`.github/workflows/${file}.yml`));
const ci = load("ci"), hygiene = load("repo-hygiene"), candidate = load("distribution-candidate"), publish = load("publish-npm"), pages = load("pages"), catalog = load("catalog-distribution");
const commands = job => (job.steps || []).map(step=>step.run || "").join("\n");
for (const name of ["pr-policy","pr-evidence","source-validation","artifact-preview"]) assert.ok(ci.jobs[name]);
assert.equal(ci.on.pull_request.paths,undefined,"required workflows must not be path filtered");
assert.match(commands(ci.jobs["pr-policy"]), /trusted_root/);
assert.match(commands(ci.jobs["source-validation"]), /maintenance_validate\.cjs --base "\$BASE_SHA" --head "\$HEAD_SHA"/);
assert.match(commands(ci.jobs["artifact-preview"]), /manifest/);
for (const job of [ci.jobs["main-validation-and-sync"],hygiene.jobs["source-health"]]) {
  assert.match(commands(job), /maintenance_validate\.cjs/);
  assert.doesNotMatch(commands(job), /create-pull-request|merge_canonical|git push|sync:repo-state/);
}
assert.deepEqual(ci.jobs["main-validation-and-sync"].permissions,{contents:"read"});
assert.deepEqual(hygiene.permissions,{contents:"read"});
for (const command of ["distribution:verify","sync:release-state","validate:strict","validate:glossary","validate:references","security:docs","security:scan:strict","plugin-compat:check","bundles:check","test","app:test:coverage","app:build"])
  assert.ok(commands(candidate.jobs.build).includes(`npm run ${command}`),`candidate must execute ${command}`);
assert.match(commands(candidate.jobs.build),/git merge-base --is-ancestor HEAD origin\/main/);
assert.match(commands(candidate.jobs.build),/distribution_pack\.cjs/,"the candidate must pack through the release-identity-aware packer");
assert.doesNotMatch(commands(candidate.jobs.build),/npm pack/,"the candidate must not pack a tarball without recording gitHead");
assert.match(commands(candidate.jobs.build),/distribution_manifest\.cjs create/);
assert.deepEqual([...new Set(candidate.jobs.functional.strategy.matrix.include.map(job => job.os))],["ubuntu-24.04","windows-2025"]);
assert.deepEqual([...new Set(candidate.jobs.functional.strategy.matrix.include.map(job => job.node))],["22.23.1","24"]);
assert.match(commands(candidate.jobs.functional),/distribution_manifest\.cjs verify/);
assert.match(commands(candidate.jobs.functional),/run-installed-candidate\.mjs/);
for (const workflow of [publish,pages]) {
  const all = Object.values(workflow.jobs).map(commands).join("\n");
  assert.match(all,/distribution_fetch\.cjs/);
  assert.doesNotMatch(all,/npm run (test|app:build|sync:release-state)|npm pack/);
}
assert.deepEqual(Object.keys(publish.on),["workflow_dispatch"]);
assert.deepEqual(Object.keys(publish.on.workflow_dispatch.inputs),["tag","commit"]);
assert.equal(publish["run-name"],"Publish npm ${{ inputs.tag }} at ${{ inputs.commit }}");
assert.match(commands(publish.jobs.publish),/git merge-base --is-ancestor "\$tag_commit" "\$main_commit"/);
assert.match(commands(publish.jobs.publish),/test "\$tag_commit" = "\$RELEASE_COMMIT"/);
assert.match(commands(publish.jobs.publish),/npm publish "\$candidate" --ignore-scripts --tag "\$tag"/);
assert.match(commands(publish.jobs.publish),/then tag=next; else tag=latest/);
assert.match(commands(publish.jobs.publish),/verify_npm_candidate\.cjs/);
assert.deepEqual(pages.on.workflow_dispatch.inputs.deployment_target.options,["release"]);
assert.match(commands(pages.jobs.build),/\.draft == false/);
assert.match(commands(pages.jobs.build),/tag_commit[^\n]+GITHUB_SHA/);
assert.match(commands(pages.jobs.build),/site.tar/);
assert.equal(catalog.jobs.candidate.if,"github.ref == 'refs/heads/main'");
assert.doesNotMatch(Object.values(catalog.jobs).map(commands).join("\n"),/npm publish|npm version/);
assert.match(commands(catalog.jobs.candidate),/catalog_distribution_verify\.cjs/);
assert.deepEqual(catalog.jobs.deploy.needs,["candidate","publish"]);
for (const workflow of [ci,hygiene,candidate,publish,pages,catalog]) {
  for (const job of Object.values(workflow.jobs)) for (const step of job.steps || []) {
    if (step.uses && !step.uses.startsWith("./")) assert.match(step.uses,/@[a-f0-9]{40}$/,"actions must be immutable");
    if (step.run) assert.doesNotMatch(step.run,/git push origin (?:main|HEAD)|--admin/);
  }
}
const pkg=JSON.parse(read("package.json"));
assert.match(pkg.scripts.prepack,/distribution_snapshot/);
assert.match(pkg.scripts["sync:release-state"],/chain.*sync:web-assets.*audit:consistency.*check:warning-budget/);
assert.match(read("tools/scripts/release_workflow.js"),/distribution_snapshot\.cjs.*seal/);
console.log("Component, snapshot and immutable publication workflow contracts passed");

const previewPrepared = yaml.parse(fs.readFileSync(path.join(root,".github/workflows/aas-agent-first-preview.yml"),"utf8"));
assert.match(commands(previewPrepared.jobs.plan),/distribution_snapshot.cjs verify/);
for (const job of ["candidate","workbench"]) {
  assert.equal(previewPrepared.jobs[job].needs,"plan");
  assert.match(previewPrepared.jobs[job].if,/run-preview == 'true'/);
}

const catalogBootstrap = catalog.jobs.candidate.steps.find(step => step.name === "Verify immutable protected source and catalog compatibility").run;
assert(catalogBootstrap.indexOf("npm ci --ignore-scripts") >= 0);
assert(catalogBootstrap.indexOf("npm ci --ignore-scripts") < catalogBootstrap.indexOf("catalog-release"), "install dependencies before loading the schema-backed compatibility verifier");

for (const [name, job] of Object.entries(ci.jobs)) {
 for (const step of job.steps || []) {
  if (!(step.uses || '').startsWith('actions/checkout@')) continue;
  if (step.with?.['fetch-depth'] === 0) assert.equal(step.with.filter, 'blob:none', name + ': retain full history without eager historical blobs');
  if (step.with?.['sparse-checkout']) assert.equal(step.with.filter, undefined, 'filter must not override sparse checkout');
 }
}
for (const name of ['source-validation', 'main-validation-and-sync']) {
 assert.match(commands(ci.jobs[name]), /maintenance_validate\.cjs[^\n]* --parallel/);
}
assert.doesNotMatch(commands(ci.jobs['source-validation']), /--shard|turbo run|vercel/);

for (const name of ["source-validation", "main-validation-and-sync"]) {
 assert.equal(ci.jobs[name].env.AAS_TEST_COHORT_WORKERS, "2");
}
