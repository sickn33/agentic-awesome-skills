const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const bootstrap = fs.readFileSync(
  path.join(root, "skills/using-lwc/scripts/bootstrap.sh"),
  "utf8",
);
const skill = fs.readFileSync(
  path.join(root, "skills/using-lwc/SKILL.md"),
  "utf8",
);
const installer = fs.readFileSync(
  path.join(root, "skills/using-lwc/scripts/install-lwc.sh"),
  "utf8",
);

assert.match(
  bootstrap,
  /\$\{LWC_AUTO_INSTALL:-0\}/,
  "CLI installation must default to disabled",
);
assert.match(
  bootstrap,
  /\$\{LWC_GLOBAL_INIT:-0\}/,
  "global memory initialization must default to disabled",
);
assert.match(
  bootstrap,
  /suggest_global_init=true/,
  "a missing global Wiki must be reported without creating it",
);
assert.match(
  bootstrap,
  /obtain explicit approval, then retry once with LWC_AUTO_INSTALL=1/,
  "a missing CLI must stop at an explicit consent gate",
);
assert.match(
  skill,
  /Skill activation is not consent/,
  "the public skill contract must preserve the consent boundary",
);
assert.match(installer, /version="0\.14\.7"/, "the installer must pin one reviewed release");
assert.doesNotMatch(installer, /releases\/latest/, "the installer must not resolve a moving latest release");
assert.match(
  installer,
  /50d9ebf3c4f4d895043b0db4fbcee6d8d62f40d67a00e288515d5b42044df21b/,
  "the pinned release must carry reviewed platform checksums",
);

console.log("using-lwc bootstrap consent contracts passed");
