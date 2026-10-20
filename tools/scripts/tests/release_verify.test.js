const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  verifyRelease,
  verifyTagExecutionProvenance,
} = require("../release_inspect.cjs");
const sha = "1".repeat(40),
  version = "1.2.3",
  skills = [{ id: "example" }];
const index = JSON.stringify(skills);
const workflows = ["ci", "codeql", "pages", "distribution-candidate"].map((name, i) => ({
  id: i + 1,
  path: `.github/workflows/${name}.yml`,
  head_sha: sha,
  head_branch: "v1.2.3",
  event: "workflow_dispatch",
  status: "completed",
  conclusion: "success",
}));
const manifest = {
  source_repository: "https://github.com/sickn33/agentic-awesome-skills",
  source_skills_index_sha256: crypto
    .createHash("sha256")
    .update(index + "\n")
    .digest("hex"),
  redirects: [
    {
      from: "https://sickn33.github.io/antigravity-awesome-skills/",
      to: "https://aaskills.tech/",
    },
  ],
};
let npmHead = sha;
let badNpm = false,
  drift = false,
  configured = false,
  latestFailed = false;
let deferredCi = false,
  remoteTagMoved = false,
  unprotected = false,
  canonicalCalls = 0,
  hostCalls = 0;
const deps = {
  activeCatalogProof: async () => null,
  legacyProof: async () => ({
    sha,
    checked_redirects: 1,
    webmasterVerification: "fixture",
  }),
  resolve: () => sha,
  snapshot: (_, file) =>
    file === "package.json"
      ? JSON.stringify({ version })
      : file === "skills_index.json"
        ? index
        : JSON.stringify({ bundles: [{}] }),
  canonicalProof: async () => {
    canonicalCalls++;
    if (drift) throw new Error("generated drift");
    return { sha, regeneration: "no-drift" };
  },
  hostProof: async () => (
    hostCalls++,
    {
      status: configured ? "verified" : "not-configured",
      requiresClientReconnect: configured,
    }
  ),
  run: (command, args) => {
    if (command === "git") {
      if (args.includes("--porcelain")) return "";
      return sha;
    }
    const url = args.at(-1);
    let result;
    if (url.endsWith("commits/main")) result = { sha };
    else if (url.endsWith("branches/main"))
      result = { protected: !unprotected, commit: { sha } };
    else if (url.includes("releases/tags/"))
      result = { tag_name: "v1.2.3", published_at: "2026-10-18", draft: false };
    else if (url.includes("git/ref/tags/"))
      result = {
        object: { type: "commit", sha: remoteTagMoved ? "2".repeat(40) : sha },
      };
    else if (url.includes("/jobs?"))
      result = {
        jobs: [
          {
            name: "main-validation-and-sync",
            steps: [
              "Validate protected source diff with ephemeral snapshots",
            ].map((name) => ({
              name,
              conclusion: latestFailed || deferredCi ? "skipped" : "success",
            })),
          },
        ],
      };
    else if (url.includes("actions/runs"))
      result = {
        workflow_runs: latestFailed
          ? [...workflows, { ...workflows[0], id: 9, conclusion: "failure" }]
          : workflows,
      };
    else throw new Error("Unexpected API " + url);
    return JSON.stringify(result);
  },
  fetch: async (url) => {
    if (new URL(url).hostname === "registry.npmjs.org")
      return JSON.stringify({
        "dist-tags": { latest: badNpm ? "1.2.2" : version },
        versions: {
          [version]: { version, gitHead: npmHead, dist: { integrity: "fixture" } },
        },
      });
    if (url.endsWith("redirect-manifest.json")) return JSON.stringify(manifest);
    if (new URL(url).origin === "https://sickn33.github.io")
      return "https://aaskills.tech/";
    if (url.endsWith("/skills.json")) return index;
    if (url.endsWith("/plugins"))
      return "AAS Specialized Plugins | 1 AI coding workflow packs specialized plugin packs numberOfItems";
    if (url.endsWith("/llms.txt"))
      return "https://aaskills.tech/plugins Current release: V1.2.3. 1+";
    if (url.endsWith("/sitemap.xml")) return "https://aaskills.tech/plugins";
    if (url.endsWith("/robots.txt"))
      return "User-agent: GPTBot User-agent: OAI-SearchBot User-agent: ClaudeBot User-agent: PerplexityBot";
    return '<meta name="description" content="Explore 1+ reusable skills">AAS Core | Your agent chooses. You stay in control. SoftwareSourceCode';
  },
};
assert.throws(
  () =>
    verifyTagExecutionProvenance("owner/repo", version, sha, (endpoint) => {
      if (endpoint === "branches/main")
        return { protected: true, commit: { sha: "2".repeat(40) } };
      if (endpoint.startsWith("git/ref/"))
        return { object: { type: "commit", sha } };
      if (endpoint.startsWith("releases/"))
        return { tag_name: "v1.2.3", published_at: "2026-10-18", draft: false };
      return { status: "diverged", merge_base_commit: { sha: "3".repeat(40) } };
    }),
  /ancestor/,
  "tag ancestry must be verified before executing its code",
);
assert.equal(verifyTagExecutionProvenance("owner/repo", version, sha, endpoint => {
  if (endpoint === "branches/main") return { protected: true, commit: { sha: "2".repeat(40) } };
  if (endpoint.startsWith("git/ref/")) return { object: { type: "commit", sha } };
  if (endpoint.startsWith("releases/")) return { tag_name: "v1.2.3", published_at: "2026-10-18", draft: false };
  return { status: "ahead", merge_base_commit: { sha } };
}).sha, sha, "protected main may advance beyond an immutable release");
(async () => {
  let result = await verifyRelease({ version, hosts: [] }, deps);
  assert.equal(result.complete, true, JSON.stringify(result));
  for (const badHead of [undefined, null, "", "short", "2".repeat(40)]) {
    npmHead=badHead;
    result=await verifyRelease({version,hosts:[]},deps);
    assert.equal(result.complete,false,'missing or wrong registry gitHead cannot certify an installable release');
    assert.equal(result.checks.find(c=>c.component==='npm').status,'blocked');
  }
  npmHead=sha;
  deferredCi = true;
  result = await verifyRelease({ version, hosts: [] }, deps);
  assert.equal(
    result.checks.find((row) => row.component === "required-ci-codeql-pages")
      .status,
    "blocked",
    "deferred main CI cannot attest release tests",
  );
  deferredCi = false;
  canonicalCalls = 0;
  hostCalls = 0;
  remoteTagMoved = true;
  result = await verifyRelease(
    { version, hosts: [{ host: "codex", config: "/fixture" }] },
    deps,
  );
  assert.equal(result.provenance.status, "blocked");
  assert.equal(canonicalCalls, 0, "unverified tag code must never run");
  assert.equal(hostCalls, 0, "unverified release must not launch a runtime");
  remoteTagMoved = false;
  unprotected = true;
  result = await verifyRelease({ version, hosts: [] }, deps);
  assert.equal(result.provenance.status, "blocked");
  assert.equal(canonicalCalls, 0);
  unprotected = false;
  badNpm = true;
  drift = true;
  latestFailed = true;
  result = await verifyRelease({ version, hosts: [] }, deps);
  assert.equal(result.complete, false);
  assert.equal(
    result.checks.filter((c) => c.status === "blocked").length,
    3,
    "independent failures remain visible",
  );
  badNpm = false;
  drift = false;
  latestFailed = false;
  configured = true;
  result = await verifyRelease(
    { version, hosts: [{ host: "codex", config: "/fixture" }] },
    deps,
  );
  assert.equal(result.machineChecksPassed, true);
  assert.equal(
    result.personalEnvironmentUpdated,
    false,
    "stdio alone cannot establish native session reload",
  );
  assert.equal(result.complete, true, "personal sessions do not block public release");
  result = await verifyRelease(
    {
      version,
      hosts: [{ host: "codex", config: "/fixture" }],
      "client-confirmed-head": sha,
    },
    deps,
  );
  assert.equal(result.complete, true);
  await assert.rejects(
    verifyRelease(
      { version, "client-confirmed-head": "short", hosts: [] },
      deps,
    ),
    /exact released head/,
  );
  console.log("release verification regressions passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
