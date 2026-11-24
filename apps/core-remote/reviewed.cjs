const { createHash } = require("node:crypto");

function digest(value) {
  return "sha256-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fingerprint(skill) {
  // Offsets move when unrelated bundles are inserted into the release pack.
  const { offset, ...content } = skill.untrustedContentRef;
  return digest({ ...skill, untrustedContentRef: content });
}

function reviewedView(skills, ledger) {
  const approved = skills.filter((skill) => Object.hasOwn(ledger, skill.id) && ledger[skill.id] === fingerprint(skill));
  const ids = approved.map((skill) => skill.id);
  return { ids, digest: digest(ids.map((id) => [id, ledger[id]])) };
}

module.exports = { fingerprint, reviewedView };
