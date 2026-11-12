const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const esbuild = require("esbuild");
const { gzipSync } = require("node:zlib");
const root = path.resolve(__dirname, "../..");
const { loadBundledCatalog } = require(
  path.join(root, "tools/lib/aas-v1/catalog"),
);
const { readSkillFileBytes, MAX_READ_BYTES } = require(path.join(root, "tools/lib/aas-v1/skill-files"));
const catalog = loadBundledCatalog({ root });
const out = path.join(__dirname, "dist");
if (process.env.AAS_EXPECTED_VERSION && catalog.version !== process.env.AAS_EXPECTED_VERSION) {
  throw Error("The bundled catalog does not match the selected release");
}
fs.rmSync(path.join(out, "assets"), { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
const demo = path.join(__dirname, "public/demo/aas-core-0.1.6.mp4");
if (fs.existsSync(demo)) {
  fs.mkdirSync(path.join(out, "assets/demo"), { recursive: true });
  fs.copyFileSync(demo, path.join(out, "assets/demo/aas-core-0.1.6.mp4"));
}
const bootstrap = {};
for (const name of fs.readdirSync(path.join(root, "schemas/aas-v1"))) {
  if (name.endsWith(".json"))
    bootstrap["/aas/schemas/aas-v1/" + name] = fs.readFileSync(
      path.join(root, "schemas/aas-v1", name),
      "utf8",
    );
}
const payloads = {};
const content = fs.readFileSync(
  path.join(root, "data/aas-v1/skill-content.v1.ndjson"),
);
function asset(bytes) {
  if (bytes.length > 25 * 1024 * 1024) throw Error("Workers Free asset size exceeded");
  const name = crypto.createHash("sha256").update(bytes).digest("hex") + ".txt";
  fs.writeFileSync(path.join(out, "assets", name), bytes);
  return name;
}
for (const skill of catalog.skills) {
  const ref = skill.untrustedContentRef;
  payloads[skill.id] = {
    content: asset(content.subarray(ref.offset, ref.offset + ref.length)),
    files: {},
  };
  for (const f of skill.untrustedFiles || []) {
    if (f.type !== "file" || f.size > MAX_READ_BYTES) continue;
    const relativePath = path.posix.join(path.posix.dirname(skill.untrustedContentPath), f.path);
    const bytes = readSkillFileBytes(root, relativePath);
    const digest = "sha256-" + crypto.createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== f.size || digest !== f.sha256) {
      throw Error("Support payload differs from the release inventory: " + relativePath);
    }
    payloads[skill.id].files[f.path] = asset(bytes);
  }
}
const assetCount = fs.readdirSync(path.join(out, "assets")).length;
if (assetCount > 20000) throw Error("Workers Free asset count exceeded");
fs.writeFileSync(path.join(out, "catalog.json"), JSON.stringify(catalog));
fs.writeFileSync(path.join(out, "bootstrap.json"), JSON.stringify(bootstrap));
fs.writeFileSync(path.join(out, "payloads.json"), JSON.stringify(payloads));
fs.writeFileSync(
  path.join(out, "build-receipt.json"),
  JSON.stringify({
    version: catalog.version,
    catalogDigest: catalog.digest,
    skillCount: catalog.skills.length,
    assets: assetCount,
  }),
);
const Ajv = require("ajv/dist/2020"),
  standalone = require("ajv/dist/standalone").default;
const validatorNames = fs
  .readdirSync(path.join(root, "schemas/aas-v1"))
  .filter((n) => n.endsWith(".schema.json"));
for (const name of validatorNames) {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
    validateFormats: false,
    code: { source: true },
  });
  const v = ajv.compile(
    JSON.parse(fs.readFileSync(path.join(root, "schemas/aas-v1", name))),
  );
  fs.writeFileSync(path.join(out, name + ".cjs"), standalone(ajv, v));
}
let validatorSource = fs.readFileSync(
  path.join(root, "tools/lib/aas-v1/schema-validator.js"),
  "utf8",
);
validatorSource = validatorSource
  .replace('const Ajv2020 = require("ajv/dist/2020");', "")
  .replace(/const ajv = new Ajv2020\([^\n]+\);/, "");
const first = validatorSource.indexOf("function validatorFor(name) {"),
  last = validatorSource.indexOf("function validateInstance(", first);
validatorSource =
  validatorSource.slice(0, first) +
  'function validatorFor(name) { const v = compiled[name]; if(!v) throw Error("AAS_SCHEMA_NAME_INVALID"); return v; }\n' +
  validatorSource.slice(last);
validatorSource =
  "const compiled={" +
  validatorNames
    .map(
      (n) =>
        JSON.stringify(n) +
        ":require(" +
        JSON.stringify("./" + n + ".cjs") +
        ")",
    )
    .join(",") +
  "};\n" +
  validatorSource;
fs.writeFileSync(path.join(out, "schema-validator.cjs"), validatorSource);
esbuild
  .build({
    entryPoints: [path.join(__dirname, "worker.mjs")],
    outfile: path.join(out, "worker.mjs"),
    bundle: true,
    banner: {
      js: 'import {createRequire} from "node:module"; const require = createRequire("/aas/worker.mjs");',
    },
    format: "esm",
    platform: "node",
    target: "es2022",
    external: ["node:*", "cloudflare:workers"],
    define: { __dirname: JSON.stringify("/aas/tools/lib/aas-v1") },
    plugins: [
      {
        name: "portable-core",
        setup(b) {
          b.onResolve({ filter: /^(?:\.\.\/stack|\.\/stack)$/ }, () => ({
            path: path.join(root, "tools/lib/aas-v1/stack/manifest.js"),
          }));
          b.onResolve({ filter: /schema-validator$/ }, () => ({
            path: path.join(out, "schema-validator.cjs"),
          }));
          b.onResolve({ filter: /^node:fs$/ }, () => ({
            path: path.join(__dirname, "virtual-fs.cjs"),
          }));
          b.onResolve({ filter: /^\.\.$/ }, (args) =>
            args.importer.endsWith("/mcp/server.js")
              ? { path: path.join(__dirname, "pure-core.cjs") }
              : null,
          );
        },
      },
    ],
  })
  .then(() => {
    const bytes = fs.readFileSync(path.join(out, "worker.mjs"));
    if (gzipSync(bytes).length > 3 * 1024 * 1024) {
      throw Error("Workers Free compressed Worker size exceeded");
    }
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
