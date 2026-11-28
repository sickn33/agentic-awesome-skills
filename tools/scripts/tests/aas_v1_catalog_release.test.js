"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../../lib/aas-v1/canonical-json");
const { compatible, updateCatalogRelease, fetchReleaseBytes } = require("../../lib/aas-v1/cache/catalog-release");
const { createVerifiedCatalogResolver } = require("../../lib/aas-v1/cache/resolver");
const { loadBundledCatalog } = require("../../lib/aas-v1/catalog");
const { parseArgs } = require("../../bin/aas-mcp");
const release = { schemaVersion:1,sourceCommit:"a".repeat(40),runtimeMajor:19,minimumRuntime:"19.10.0" };
test("independent catalog requires a compatible runtime and exact offline startup pin",async()=>{
  for (const version of ["19.10.0","19.11.0"]) assert.equal(compatible(release,version),true);
  for (const version of ["19.9.0","20.0.0","19.10.0-beta.1","invalid"]) assert.equal(compatible(release,version),false);
  assert.equal(compatible({...release,minimumRuntime:"20.0.0"},"19.10.0"),false);
  await assert.rejects(fetchReleaseBytes("https://attacker.example/catalog.tgz",100),/origin/);
  await assert.rejects(fetchReleaseBytes("http://github.com/catalog.tgz",100),/origin/);
  const digest="sha256-"+"b".repeat(64);
  assert.throws(()=>parseArgs(["--catalog-digest",digest]));
  assert.equal(parseArgs(["--cache-root",path.resolve(os.tmpdir()),"--catalog-digest",digest]).catalogDigest,digest);
});
function fixture(root, override = {}) {
  const stage=path.join(root,"package");fs.mkdirSync(stage);
  const files={
    "data/catalog.json":JSON.stringify({skills:[{id:"example",path:"skills/example/SKILL.md"}]}),
    "data/aas-v1/skill-content-index.v1.json":JSON.stringify({entries:{example:{offset:0,length:1,sha256:sha256("x")}}}),
    "data/aas-v1/skill-content.v1.ndjson":"x",
    "tools/lib/aas-v1/ontology.v1.json":"{}",
    "skills_index.json":JSON.stringify([{id:"example",path:"skills/example"}]),
    "skills/example/SKILL.md":"# Reviewed example\n",
    ...override,
  };
  const assets=Object.keys(files).sort().map(file=>{
    const target=path.join(stage,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,files[file],{mode:0o644});
    return {path:file,size:Buffer.byteLength(files[file]),sha256:sha256(files[file])};
  });
  const manifest={schemaVersion:1,digestVersion:1,package:"agentic-awesome-skills",packageVersion:"2026.10.18",catalogSchemaVersion:"2.0.0",skillCount:1,assets,catalogDigest:sha256(canonicalJson({digestVersion:1,assets})),catalogRelease:release};
  fs.writeFileSync(path.join(stage,"data/aas-v1/catalog-manifest.v1.json"),canonicalJson(manifest)+"\n");
  const archive=path.join(root,"catalog.tgz");
  const tarArgs=["--no-mac-metadata","-czf",archive,"-C",root,"package"];
  try {
    execFileSync("tar",tarArgs);
  } catch (error) {
    const stderr=Buffer.isBuffer(error.stderr) ? error.stderr.toString("utf8") : String(error.stderr || "");
    if (!/unrecognized option|unknown option|illegal option/i.test(stderr)) throw error;
    // GNU tar has no AppleDouble metadata mode and does not create ._* files.
    execFileSync("tar",tarArgs.slice(1));
  }
  const integrity="sha512-"+crypto.createHash("sha512").update(fs.readFileSync(archive)).digest("base64");
  return {archive,integrity,manifest,stage};
}
test("catalog import is verified, rollback-addressable, inert and rejects incompatible or changed bytes",async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"aas-independent-test-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const f=fixture(root);const cacheRoot=path.join(root,"cache");
  const options={cacheRoot,revision:"2026.10.18",integrity:f.integrity,archive:f.archive,runtimeVersion:"19.10.0"};
  await assert.rejects(updateCatalogRelease({...options,runtimeVersion:"19.9.0"}),/compatibility/);
  assert.equal(fs.existsSync(cacheRoot),false);
  await assert.rejects(updateCatalogRelease({...options,revision:"2026.10.19"}),/revision/);
  const result=await updateCatalogRelease(options);
  assert.equal(result.status,"promoted");assert.equal(result.identity.catalogDigest,f.manifest.catalogDigest);
  assert.equal((await updateCatalogRelease(options)).status,"alreadyPresent");
  const resolved=await createVerifiedCatalogResolver({cacheRoot,bundledRoot:path.resolve(__dirname,"../../..")})(f.manifest.catalogDigest);
  assert.equal(resolved.version,"2026.10.18");assert.equal(resolved.catalogRelease.minimumRuntime,"19.10.0");
  assert.ok(resolved.sourceRoot);assert.equal(JSON.stringify(resolved).includes(cacheRoot),false);
  assert.equal(loadBundledCatalog({root:resolved.sourceRoot}).skills[0].id,"example");
  fs.appendFileSync(f.archive,"tampered");
  await assert.rejects(updateCatalogRelease(options),/integrity/);
});
test("catalog installation index cannot escape verified trees even with valid archive integrity",async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"aas-independent-hostile-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const f=fixture(root,{"skills_index.json":JSON.stringify([{id:"example",path:"../../outside"}])});
  await assert.rejects(updateCatalogRelease({cacheRoot:path.join(root,"cache"),revision:"2026.10.18",integrity:f.integrity,archive:f.archive,runtimeVersion:"19.10.0"}),/traversal|confined/);
  assert.equal(fs.existsSync(path.join(root,"cache")),false);
});
