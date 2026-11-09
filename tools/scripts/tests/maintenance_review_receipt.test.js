const assert = require("node:assert/strict");
const { signReceipt, verifyReceipt } = require("../../lib/maintenance-review-receipt");
const key = Buffer.alloc(32, 1);
const fingerprint = { digest: "a".repeat(64), skills: [{ id: "example", tree: "b".repeat(40) }], context: [{ policy: "1" }] };
const signed = signReceipt({ reviewedHead: "1".repeat(40), fingerprint, reviewer: "maintainer", outcome: "approved", evidence: "Complete bundle inspected" }, key);
assert.equal(verifyReceipt(signed, fingerprint, key, "2".repeat(40)).reviewedHead, "2".repeat(40));
assert.throws(() => verifyReceipt(signed, { ...fingerprint, context: [] }, key, "2".repeat(40)), /context changed/);
assert.throws(() => verifyReceipt(signed, { ...fingerprint, skills: [] }, key, "2".repeat(40)), /context changed/);
assert.throws(() => verifyReceipt(signed, fingerprint, Buffer.alloc(32, 2), "2".repeat(40)), /authentication/);
assert.throws(() => verifyReceipt({ ...signed, receipt: { ...signed.receipt, reviewer: "attacker" } }, fingerprint, key, "2".repeat(40)), /authentication/);
assert.throws(() => verifyReceipt(signed, fingerprint, key, "short"), /Invalid/);
assert.throws(() => signReceipt({ outcome: "approved" }, key), /explicit/);
assert.throws(() => signReceipt(signed.receipt, Buffer.alloc(0)), /256-bit/);
console.log("review receipt reuse and invalidation tests passed");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const { fingerprint: gitFingerprint } = require("../../lib/maintenance-review-receipt");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-review-fingerprint-"));
const git = (...args) => execFileSync("git",args,{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
try {
  git("init","-q"); git("config","user.name","Fixture");git("config","user.email","fixture@example.invalid");
  for(const file of ["tools/policy.json","schemas/schema.json","package.json","package-lock.json","AGENTS.md",".github/rules.md","docs/maintainers/rules.md","skills/antigravity-maintainer-batch-release/SKILL.md","skills/example/SKILL.md","skills/example/references/guide.md"]){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),"baseline\n");}
  git("add",".");git("commit","-qm","base");const base=git("rev-parse","HEAD");
  fs.appendFileSync(path.join(root,"skills/example/references/guide.md"),"reviewed\n");git("commit","-qam","skill");const head=git("rev-parse","HEAD");
  for (const invalid of [undefined, null, [], [undefined], Array(1), [null], [{toString(){return "example";}}]]) {
    assert.throws(()=>gitFingerprint(root,head,base,invalid),/Invalid reviewed skill set/);
  }
  const first=gitFingerprint(root,head,base,["example"]);
  git("checkout","--detach",base);fs.writeFileSync(path.join(root,"CHANGELOG.md"),"unrelated\n");git("add",".");git("commit","-qm","base moves");const nextBase=git("rev-parse","HEAD");
  git("cherry-pick",head);const nextHead=git("rev-parse","HEAD");
  assert.deepEqual(gitFingerprint(root,nextHead,nextBase,["example"]),first,"unrelated base-only update reuses actual Git tree review");
  git("update-index","--chmod=+x","skills/example/references/guide.md");git("commit","-qm","mode change");
  assert.notEqual(gitFingerprint(root,git("rev-parse","HEAD"),nextBase,["example"]).digest,first.digest);
  fs.writeFileSync(path.join(root,"tools/policy.json"),"changed\n");git("commit","-qam","policy change");const changed=git("rev-parse","HEAD");
  assert.notEqual(gitFingerprint(root,changed,changed,["example"]).digest,first.digest);
} finally { fs.rmSync(root,{recursive:true,force:true}); }
