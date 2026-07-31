"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const catalog = read("tools/lib/aas-v1/catalog.js");
assert.match(catalog, /verifiedAssets\.set\(asset\.path, bytes\)/);
assert.match(catalog, /JSON\.parse\(verifiedAssets\.get\(indexAsset\.path\)\)/);
assert.match(catalog, /JSON\.parse\(catalogBytes\)/);
assert.doesNotMatch(catalog, /JSON\.parse\(fs\.readFileSync\(catalogPath/);

const gguf = read("skills/hugging-face-model-trainer/scripts/convert_to_gguf.py");
assert.match(gguf, /TemporaryDirectory\(prefix="aas-gguf-"\)/);
assert.doesNotMatch(gguf, /["']\/tmp\/(?:llama\.cpp|merged_model|gguf_output)/);

const downloader = read("skills/2slides-ppt-generator/scripts/download_slides_pages_voices.py");
assert.match(downloader, /socket\.create_connection\(\(pinned_ip, 443\)/);
assert.match(downloader, /server_hostname=parsed\.hostname/);
assert.match(downloader, /Download redirects are refused/);
assert.doesNotMatch(downloader, /requests\.get\(download_url/);

const pptx = read("skills/pptx-official/scripts/html2pptx.js");
assert.match(pptx, /function resolveTrustedAsset/);
assert.match(pptx, /Slide asset escapes the HTML directory/);
assert.match(pptx, /constrainSlideAssets\(slideData, assetRoot\)/);

const vercel = read("skills/deploy-to-vercel/resources/deploy.sh");
assert.match(vercel, /\.vercelignore is present/);
assert.ok(vercel.indexOf(".vercelignore is present") < vercel.indexOf("tar -C \"$PROJECT_PATH\""));

const loki = read("skills/loki-mode/autonomy/run.sh");
assert.match(loki, /ENABLE_DASHBOARD=\$\{LOKI_DASHBOARD:-false\}/);
assert.doesNotMatch(loki, /python3 -m http\.server/);
assert.doesNotMatch(loki, /claude --dangerously-skip-permissions/);
assert.match(loki, /mktemp -d/);
assert.match(loki, /safety controls are not implemented; refusing to run/);

for (const file of fs.readdirSync(path.join(root, "skills")).filter((name) => name.startsWith("apify-"))) {
  const exporter = path.join(root, "skills", file, "reference", "scripts", "run_actor.js");
  if (!fs.existsSync(exporter)) continue;
  const source = fs.readFileSync(exporter, "utf8");
  assert.match(source, /function csvCell\(value\)/, `${file} must neutralize spreadsheet cells`);
  assert.match(source, /fieldnames\.map\(csvCell\)/, `${file} must encode CSV headers`);
}

const supabase = read("supabase/migrations/202607300001_lock_skill_stars_read_only.sql");
assert.match(supabase, /enable row level security/);
assert.match(supabase, /revoke all privileges on table public\.skill_stars from anon, authenticated/);
assert.match(supabase, /grant select on table public\.skill_stars to anon, authenticated/);

console.log("Secur0 remediation security contracts passed.");
