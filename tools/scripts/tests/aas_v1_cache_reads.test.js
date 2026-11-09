"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { scanDataDirectory } = require("../../lib/aas-v1/cache/scan");

async function fixture(run) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "aas-cache-read-"));
  const file = path.join(root, "catalog.json");
  await fsp.writeFile(file, '{"skills":[]}\n', { mode: 0o600 });
  try { await run({ root, file, scan: (limits) => scanDataDirectory({ sourceDir: root, allowlist: ["catalog.json"], limits }) }); }
  finally { await fsp.rm(root, { recursive: true, force: true }); }
}

for (const change of ["growth", "same-size", "truncation"]) {
  test(`cache rejects ${change} during a bounded read`, async (t) => fixture(async ({ file, scan }) => {
    const open = fsp.open;
    let readBytes = 0;
    let changed = false;
    t.mock.method(fsp, "open", async (...args) => {
      const handle = await open(...args);
      const mutate = async () => {
        if (changed) return;
        changed = true;
        if (change === "growth") await fsp.appendFile(file, Buffer.alloc(8192));
        else if (change === "truncation") await fsp.truncate(file, 0);
        else {
          await fsp.writeFile(file, '{"skills":{}}\n');
          await fsp.utimes(file, new Date(0), new Date(0));
        }
      };
      const readFile = handle.readFile.bind(handle);
      const read = handle.read.bind(handle);
      handle.readFile = async (...params) => { await mutate(); const bytes = await readFile(...params); readBytes += bytes.length; return bytes; };
      handle.read = async (...params) => { await mutate(); const result = await read(...params); readBytes += result.bytesRead; return result; };
      return handle;
    });
    try {
      await assert.rejects(scan({ maxFileBytes: 32 }), { code: "AAS_CACHE_INPUT_CHANGED" });
      assert.ok(readBytes <= 32, `read ${readBytes} bytes despite the 32-byte bound`);
    } finally { t.mock.restoreAll(); }
  }));
}

test("cache completes short reads without changing the content digest", async (t) => fixture(async ({ scan }) => {
  const expected = await scan();
  const open = fsp.open;
  t.mock.method(fsp, "open", async (...args) => {
    const handle = await open(...args);
    const read = handle.read.bind(handle);
    handle.read = (buffer, offset, length, position) => read(buffer, offset, Math.min(length, 3), position);
    return handle;
  });
  try {
    const actual = await scan();
    assert.equal(actual.catalogDigest, expected.catalogDigest);
    assert.deepEqual(actual.records[0].bytes, expected.records[0].bytes);
  } finally { t.mock.restoreAll(); }
}));
