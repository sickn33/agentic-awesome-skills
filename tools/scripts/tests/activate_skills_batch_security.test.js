const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..", "..");
const batchScript = fs.readFileSync(
  path.join(repoRoot, "scripts", "activate-skills.bat"),
  "utf8",
);

assert.doesNotMatch(
  batchScript,
  /for %%s in \(!ESSENTIALS!\) do \(/,
  "activate-skills.bat must not iterate untrusted skills with tokenized FOR syntax",
);
assert.match(
  batchScript,
  /for \/f .*%%s in \("%SKILLS_LIST_FILE%"\) do \(/i,
  "activate-skills.bat should read one validated skill id per line from the temp file",
);
