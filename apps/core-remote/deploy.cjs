const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const receipt = require("./dist/build-receipt.json");

const endpoint = "https://aas-core.aas-core-remote.workers.dev";
const wrangler = path.join(__dirname, "node_modules", ".bin", "wrangler");
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function wrangle(args) {
  return execFileSync(wrangler, [...args, "--config", "wrangler.jsonc"], {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    timeout: 300000,
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  });
}

function activeVersion() {
  const { versions } = JSON.parse(wrangle(["deployments", "status", "--json"]));
  assert.equal(versions.length, 1, "Expected a single active Worker version");
  assert.equal(versions[0].percentage, 100);
  assert.match(versions[0].version_id, uuid);
  return versions[0].version_id;
}

async function health() {
  const response = await fetch(endpoint + "/health", { signal: AbortSignal.timeout(10000) });
  assert.ok(response.ok, "Worker health check failed: " + response.status);
  const result = await response.json();
  assert.equal(result.service, "AAS Core");
  return result;
}

function compareVersions(left, right) {
  assert.match(left, /^\d+\.\d+\.\d+$/);
  assert.match(right, /^\d+\.\d+\.\d+$/);
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

async function verifyCandidate() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const result = await health();
    if (result.catalogVersion === receipt.version && result.catalogDigest === receipt.catalogDigest) {
      assert.equal(result.skills, receipt.skillCount);
      const environment = { ...process.env, AAS_MCP_URL: endpoint + "/mcp" };
      delete environment.CLOUDFLARE_API_TOKEN;
      delete environment.GH_TOKEN;
      execFileSync(process.execPath, [path.join(__dirname, "live-smoke.cjs")], {
        env: environment, stdio: "inherit", timeout: 90000,
      });
      return;
    }
    if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw Error("The deployed catalog did not converge to the verified release");
}

async function main() {
  assert.ok(receipt.assets <= 20000);
  const previousVersion = activeVersion();
  const previous = await health();
  assert.ok(compareVersions(receipt.version, previous.catalogVersion) >= 0, "Refusing a catalog downgrade");
  if (previous.catalogVersion === receipt.version && previous.catalogDigest === receipt.catalogDigest) {
    await verifyCandidate();
    return;
  }

  assert.equal(activeVersion(), previousVersion, "Worker changed during deploy preparation");
  const output = wrangle(["deploy"]);
  process.stdout.write(output);
  const candidate = output.match(/Current Version ID: ([0-9a-f-]+)/i)?.[1];
  assert.match(candidate || "", uuid, "Unknown deploy outcome; inspect the active Worker");
  try {
    assert.equal(activeVersion(), candidate, "Candidate is not the active Worker version");
    await verifyCandidate();
  } catch (error) {
    if (activeVersion() !== candidate) throw error;
    process.stdout.write(wrangle(["rollback", previousVersion, "--message", "Restore previous AAS Core after smoke-test failure"]));
    assert.equal(activeVersion(), previousVersion, "Rollback did not restore the previous Worker version");
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
