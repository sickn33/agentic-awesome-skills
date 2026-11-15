const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { canonicalJson } = require("../../tools/lib/aas-v1/canonical-json");

// SHA-256 of the complete canonical tools/list from the published MCP endpoint.
const publishedToolHash = "b75ca52eca7eff17f9c27521c8cb5ba07766fbab01e4ef29bc24e3e42e61d385";

function assertToolContract(tools) {
  assert.equal(tools.length, 9);
  const hash = createHash("sha256").update(canonicalJson(tools)).digest("hex");
  assert.equal(hash, publishedToolHash, "Published MCP tool definitions changed");
}

module.exports = { assertToolContract };
