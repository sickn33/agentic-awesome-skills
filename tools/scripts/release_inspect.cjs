#!/usr/bin/env node
// Read-only observations are refreshed on every run; saved reports never authorize publication.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync, spawn } = require("node:child_process");
const { assertLiveSeoDocuments } = require("./check-live-seo-geo");
const { parseCodexText } = require("../lib/aas-v1/adapters/codex");
const { parseJsonAst } = require("../lib/aas-v1/adapters/claude");
const runtime = require("../lib/aas-v1/cache/runtime");
const {
  resolveCommandInvocation,
  isPrereleaseVersion,
} = require("./release_workflow.js");
const ROOT = path.resolve(__dirname, "../..");
function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} failed: ${String(result.stderr || result.error).slice(0, 1500)}`,
    );
  return result.stdout.trim();
}
function git(args) {
  return run("git", args);
}
function resolve(ref) {
  if (
    typeof ref !== "string" ||
    !ref ||
    ref.startsWith("-") ||
    /[\s\0:]/u.test(ref)
  )
    throw new Error("Invalid Git ref");
  return git(["rev-parse", "--verify", `${ref}^{commit}`]);
}
function snapshot(sha, file) {
  return git(["show", `${sha}:${file}`]);
}
function skillPaths(sha) {
  return git(["ls-tree", "-r", "--name-only", sha, "--", "skills"])
    .split("\n")
    .filter((file) => file.endsWith("/SKILL.md"));
}
function buildPlan(base, head, dependencies = {}) {
  const resolveRef = dependencies.resolve || resolve;
  const execute = dependencies.git || git;
  const read = dependencies.snapshot || snapshot;
  const paths = dependencies.skillPaths || skillPaths;
  const baseSha = resolveRef(base),
    headSha = resolveRef(head);
  execute(["merge-base", "--is-ancestor", baseSha, headSha]);
  const oldPaths = new Set(paths(baseSha)),
    newPaths = new Set(paths(headSha));
  const touched = execute([
    "diff",
    "--name-only",
    "--no-renames",
    baseSha,
    headSha,
    "--",
    "skills",
  ]).split("\n");
  const id = (file) => file.slice(7, -9);
  const added = [...newPaths]
    .filter((file) => !oldPaths.has(file))
    .map(id)
    .sort();
  const removed = [...oldPaths]
    .filter((file) => !newPaths.has(file))
    .map(id)
    .sort();
  const updated = [...newPaths]
    .filter(
      (file) =>
        oldPaths.has(file) &&
        touched.some((changed) => changed.startsWith(file.slice(0, -8))),
    )
    .map(id)
    .sort();
  const commits = execute([
    "log",
    "--format=%H%x09%an%x09%ae%x09%s",
    `${baseSha}..${headSha}`,
  ])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, name, email, ...subject] = line.split("\t");
      return { sha, name, email, subject: subject.join("\t") };
    });
  const prs = [
    ...new Set(
      commits.flatMap((commit) =>
        [...commit.subject.matchAll(/\(#(\d+)\)/gu)].map((m) => Number(m[1])),
      ),
    ),
  ].sort((a, b) => a - b);
  const contributors = [
    ...new Set(
      commits
        .filter(
          (c) => !/\[bot\]|noreply@anthropic\.com/iu.test(c.name + c.email),
        )
        .map((c) => c.name),
    ),
  ].sort();
  return {
    schemaVersion: 1,
    base,
    baseSha,
    headSha,
    packageVersion: JSON.parse(read(headSha, "package.json")).version,
    catalogTotal: newPaths.size,
    added,
    updated,
    removed,
    prs,
    contributors,
    attributionLimit:
      "Git author names are candidates for editorial thanks; coauthors and PR authors need review.",
    commits,
  };
}
function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}
function comparePlan(plan, current) {
  return digest(plan) === digest(current);
}
async function fetchBounded(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Response exceeds 16 MiB");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function workflowProof(runs, workflowPath, sha, tag) {
  const matches = runs
    .filter(
      (item) =>
        item.head_sha === sha &&
        item.path === workflowPath &&
        (!tag ||
          (item.head_branch === tag && (item.event === "workflow_dispatch" || (workflowPath === ".github/workflows/distribution-candidate.yml" && item.event === "push")))),
    )
    .sort((a, b) => b.id - a.id || b.run_attempt - a.run_attempt);
  const latest = matches[0];
  if (
    !latest ||
    latest.status !== "completed" ||
    latest.conclusion !== "success"
  )
    throw new Error(
      `${workflowPath}: latest exact-commit run missing, pending or failed`,
    );
  return {
    runId: latest.id,
    attempt: latest.run_attempt,
    sha,
    url: latest.html_url,
  };
}
function commandAsync(command, args, cwd, timeout = 600000) {
  return new Promise((resolvePromise, reject) => {
    const invocation = resolveCommandInvocation(command, args);
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => child.kill(), timeout);
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        output = (output + chunk).slice(-10000);
      });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolvePromise(output)
        : reject(new Error(output || `Exit ${code}`));
    });
  });
}
async function canonicalProof(sha) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "aas-release-verify-"));
  try {
    run("git", ["clone", "--shared", "--no-checkout", ROOT, temp]);
    // Keep local objects fast while retaining the canonical promisor for historical
    // objects needed by attribution regeneration from a partial maintainer clone.
    run(
      "git",
      [
        "remote",
        "set-url",
        "origin",
        "https://github.com/sickn33/agentic-awesome-skills.git",
      ],
      temp,
    );
    run("git", ["config", "remote.origin.promisor", "true"], temp);
    run(
      "git",
      ["config", "remote.origin.partialclonefilter", "blob:none"],
      temp,
    );
    run("git", ["checkout", "--detach", sha], temp);
    run("git", ["fetch", "origin", "main:refs/remotes/origin/main"], temp);
    await commandAsync(process.execPath, ["tools/scripts/distribution_snapshot.cjs", "verify"], temp);
    const artifactRoot = path.join(temp, ".tmp", "distribution");
    await commandAsync(process.execPath, ["-e",
      "require('./tools/scripts/distribution_fetch.cjs').main([process.argv[1]], {...process.env, GITHUB_REPOSITORY:'sickn33/agentic-awesome-skills'}).catch(e=>{console.error(e);process.exitCode=1})", artifactRoot], temp);
    const manifest = JSON.parse(fs.readFileSync(path.join(artifactRoot, "distribution.json")));
    const expectedIntegrity = "sha512-" + crypto.createHash("sha512").update(fs.readFileSync(path.join(artifactRoot, "package.tgz"))).digest("base64");
    const observedIntegrity = run("npm", ["view", `agentic-awesome-skills@${manifest.version}`, "dist.integrity", "--cache", path.join(temp, ".tmp", "npm-cache")], temp);
    if (observedIntegrity !== expectedIntegrity) throw new Error("Published npm bytes differ from the tested candidate");
    const installRoot = path.join(temp, ".tmp", "fresh-install");
    await commandAsync("npm", ["install", "--ignore-scripts", "--audit=false", "--prefix", installRoot,
      "--cache", path.join(temp, ".tmp", "npm-cache"), `agentic-awesome-skills@${manifest.version}`], temp);
    await commandAsync(process.execPath, [path.join(installRoot, "node_modules", "agentic-awesome-skills", "tools", "bin", "aas.js"), "--help"], temp);
    return { sha, snapshot: "verified", candidateRun: manifest.runId, candidateAttempt: manifest.runAttempt,
      npmIntegrity: expectedIntegrity, freshInstall: "passed", regeneration: "verified-by-immutable-candidate" };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
async function legacyProof(sha, activeCatalog = null) {
  const { generateBridge } = require("./generate-pages-redirect-bridge");
  const { verifyLiveDeployment } = require("./verify-pages-redirect-bridge");
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "aas-release-bridge-"),
  );
  try {
    const sources = [
      "apps/web-app/public/sitemap.xml",
      "skills_index.json",
      "apps/web-app/public/google5815fd8827d2319c.html",
    ];
    const paths = sources.map((file, index) => {
      const result = file === "skills_index.json" && activeCatalog
        ? { status: 0, stdout: activeCatalog.skillsIndexBytes }
        : file.endsWith("sitemap.xml") && activeCatalog
        ? { status: 0, stdout: activeCatalog.sitemapBytes }
        : spawnSync("git", ["show", `${sha}:${file}`], {
        cwd: ROOT,
        maxBuffer: 16 * 1024 * 1024,
      });
      if (result.error || result.status !== 0)
        throw new Error(`Tagged bridge input missing: ${file}`);
      const target = path.join(temporary, `source-${index}`);
      fs.writeFileSync(target, result.stdout);
      return target;
    });
    const deploymentRoot = path.join(temporary, "bridge");
    const manifest = generateBridge({
      repoRoot: ROOT,
      outputDirectory: deploymentRoot,
      sitemapPath: paths[0],
      skillsIndexPath: paths[1],
      googleVerificationPath: paths[2],
    });
    const live = await verifyLiveDeployment({
      deploymentRoot,
      liveRoot: "https://sickn33.github.io/",
      liveMode: "all",
      concurrency: 8,
      timeoutMs: 30000,
    });
    return {
      ...live,
      source: manifest.source_repository,
      sha,
      webmasterVerification: "exact-google-and-bing",
    };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
async function handshake(script, cacheRoot, version) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script, "--cache-root", cacheRoot], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });
    let output = "",
      finished = false;
    const done = (error, result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      child.kill();
      error ? reject(error) : resolvePromise(result);
    };
    const timer = setTimeout(
      () => done(new Error("MCP handshake timeout")),
      15000,
    );
    child.on("error", (error) => done(error));
    child.on("exit", () => {
      if (!finished) done(new Error("MCP exited before tools/list"));
    });
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.length > 256 * 1024)
        return done(new Error("MCP output too large"));
      let end;
      while ((end = output.indexOf("\n")) >= 0) {
        const line = output.slice(0, end);
        output = output.slice(end + 1);
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          return done(new Error("Invalid MCP JSON"));
        }
        if (message.id === 1) {
          if (
            message.error ||
            message.result?._meta?.catalog?.version !== version
          )
            return done(new Error("MCP initialize version mismatch"));
          child.stdin.write(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "notifications/initialized",
            }) +
              "\n" +
              JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) +
              "\n",
          );
        }
        if (message.id === 2) {
          if (
            message.error ||
            message.result?._meta?.catalog?.version !== version ||
            !message.result?.tools?.length
          )
            return done(new Error("MCP catalog mismatch"));
          done(null, {
            version,
            tools: message.result.tools.length,
            proof: "fresh-stdio-process",
            clientReload: "not-observed",
          });
        }
      }
    });
    child.stderr.resume();
    child.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "aas-release-verifier", version: "1" },
        },
      }) + "\n",
    );
  });
}
async function hostProof(host, config, version) {
  if (!path.isAbsolute(config)) throw new Error("Host config must be absolute");
  if (!fs.existsSync(config)) return { host, config, status: "not-configured" };
  const stat = fs.lstatSync(config);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024)
    throw new Error("Unsafe host configuration");
  const text = fs.readFileSync(config, "utf8");
  const server =
    host === "codex"
      ? (() => {
          const parsed = parseCodexText(text);
          return parsed.present ? parsed.values : null;
        })()
      : parseJsonAst(text).value?.mcpServers?.aas;
  if (!server) return { host, config, status: "not-configured" };
  if (server.enabled === false)
    throw new Error("Configured AAS host is disabled");
  if (
    !Array.isArray(server.args) ||
    server.args.length !== 3 ||
    server.args[1] !== "--cache-root"
  )
    throw new Error("Host needs a verified content-addressed AAS runtime");
  const [script, , cacheRoot] = server.args;
  if (!path.isAbsolute(script) || !path.isAbsolute(cacheRoot))
    throw new Error("Host runtime paths must be absolute");
  const verified = await runtime.resolveUniqueRuntime({
    cacheRoot,
    packageVersion: version,
  });
  const release = await runtime.inspectRuntimeRelease({ version });
  if (
    !verified ||
    verified.identity.integrity !== release.integrity ||
    path.resolve(script) !==
      runtime.runtimeMcpPath({
        cacheRoot,
        packageVersion: version,
        integrity: verified.identity.integrity,
      })
  )
    throw new Error("Host runtime does not match released verified bytes");
  if (
    !path.isAbsolute(server.command) ||
    fs.realpathSync(server.command) !== fs.realpathSync(process.execPath)
  )
    throw new Error("Host Node runtime differs; verify that client explicitly");
  const proof = await handshake(script, cacheRoot, version);
  return {
    host,
    config,
    status: "verified",
    ...proof,
    requiresClientReconnect: true,
  };
}
function verifyTagExecutionProvenance(repo, version, sha, gh) {
  const branch = gh("branches/main");
  if (
    branch?.protected !== true ||
    !/^[0-9a-f]{40}$/.test(branch.commit?.sha || "")
  )
    throw new Error("Protected main identity is unavailable");
  const tag = `v${version}`;
  const ref = gh(`git/ref/tags/${tag}`);
  const target =
    ref.object?.type === "tag"
      ? gh(`git/tags/${ref.object.sha}`).object
      : ref.object;
  if (target?.type !== "commit" || target.sha !== sha)
    throw new Error(
      "Local tag does not match the immutable remote release tag",
    );
  const release = gh(`releases/tags/${tag}`);
  if (release?.draft || !release?.published_at || release?.tag_name !== tag)
    throw new Error("Published release provenance is missing");
  if (sha !== branch.commit.sha) {
    const comparison = gh(`compare/${sha}...${branch.commit.sha}`);
    if (
      !["ahead", "identical"].includes(comparison.status) ||
      comparison.merge_base_commit?.sha !== sha
    )
      throw new Error(
        "Release tag is not an ancestor of current protected main",
      );
  }
  return {
    sha,
    mainSha: branch.commit.sha,
    release: release.html_url,
    protected: true,
  };
}
async function verifyRelease(options, dependencies = {}) {
  const execute = dependencies.run || run,
    fetchText = dependencies.fetch || fetchBounded;
  const repo = options.repo || "sickn33/agentic-awesome-skills",
    version = options.version,
    tag = `v${version}`;
  isPrereleaseVersion(version);
  const sha = (dependencies.resolve || resolve)(tag);
  if (
    JSON.parse((dependencies.snapshot || snapshot)(sha, "package.json"))
      .version !== version
  )
    throw new Error("Tagged package version mismatch");
  const report = {
    schemaVersion: 1,
    version,
    tag,
    sha,
    checkedAt: new Date().toISOString(),
    checks: [],
  };
  const gh = (endpoint) =>
    JSON.parse(execute("gh", ["api", `repos/${repo}/${endpoint}`]));
  let provenanceError = null;
  try {
    report.provenance = {
      status: "passed",
      evidence: verifyTagExecutionProvenance(repo, version, sha, gh),
    };
  } catch (error) {
    provenanceError = error.message;
    report.provenance = { status: "blocked", observed: provenanceError };
  }

  async function check(component, expected, observe, action) {
    try {
      const observed = await observe();
      report.checks.push({
        component,
        status: "passed",
        expected,
        observed,
        action: null,
      });
    } catch (error) {
      report.checks.push({
        component,
        status: "blocked",
        expected,
        observed: error.message,
        action,
      });
    }
  }
  let activeCatalog = null, activeCatalogError = null;
  try { activeCatalog = await (dependencies.activeCatalogProof || require("./catalog_public_verify.cjs").activeCatalogProof)(version); }
  catch (error) { activeCatalogError = error.message; }
  await Promise.all([
    check("active-catalog-provenance", version, () => {
      if (activeCatalogError) throw new Error(activeCatalogError);
      return activeCatalog?.descriptor || { embeddedRelease: version };
    }, "Verify the independently published catalog descriptor and immutable workflow."),
    check(
      "release-ancestry",
      sha,
      () => {
        if (provenanceError) throw new Error(provenanceError);
        return report.provenance.evidence;
      },
      "Verify immutable release ancestry on protected main; successor commits are allowed.",
    ),
    check(
      "github-release",
      tag,
      () => {
        const release = gh(`releases/tags/${tag}`);
        if (release.draft || !release.published_at || release.tag_name !== tag)
          throw new Error("Published GitHub Release missing");
        const remote = gh(`git/ref/tags/${tag}`);
        const peeled =
          remote.object.type === "tag"
            ? gh(`git/tags/${remote.object.sha}`).object.sha
            : remote.object.sha;
        if (peeled !== sha)
          throw new Error("Remote tag differs from local tag");
        return { sha: peeled, url: release.html_url };
      },
      "Verify the protected release PR and immutable remote tag.",
    ),
    check(
      "npm",
      version,
      async () => {
        const metadata = JSON.parse(
          await fetchText(`https://registry.npmjs.org/agentic-awesome-skills`),
        );
        const distTag = isPrereleaseVersion(version) ? "next" : "latest";
        if (
          metadata["dist-tags"]?.[distTag] !== version ||
          metadata.versions?.[version]?.version !== version
        )
          throw new Error("npm package or intended dist-tag mismatch");
        if (
          metadata.versions[version].gitHead !== sha
        )
          throw new Error("npm gitHead is missing or differs from released SHA");
        return {
          version,
          distTag,
          integrity: metadata.versions[version].dist.integrity,
        };
      },
      "Inspect the exact publish workflow; do not reuse a published version.",
    ),
    check(
      "required-ci-codeql-pages",
      sha,
      () => {
        const runs = [];
        for (let page = 1; page <= 5; page++) {
          const part = gh(
            `actions/runs?head_sha=${sha}&per_page=100&page=${page}`,
          ).workflow_runs;
          runs.push(...part);
          if (part.length < 100) break;
        }
        const ciProof = workflowProof(runs, ".github/workflows/ci.yml", sha);
        const jobs = gh(
          `actions/runs/${ciProof.runId}/attempts/${ciProof.attempt || 1}/jobs?per_page=100`,
        ).jobs;
        const mainJob = jobs?.find(
          (job) => job.name === "main-validation-and-sync",
        );
        for (const name of ["Validate protected source diff with ephemeral snapshots"])
          if (!mainJob?.steps?.some(step => step.name === name && step.conclusion === "success"))
            throw new Error(`Exact main CI did not execute ${name}`);
        return [
          ciProof,
          workflowProof(runs, ".github/workflows/distribution-candidate.yml", sha, tag),
          workflowProof(runs, ".github/workflows/codeql.yml", sha),
          workflowProof(runs, ".github/workflows/pages.yml", sha, tag),
        ];
      },
      "Complete CI, CodeQL and release-tag Pages for the exact released SHA.",
    ),
    check(
      "canonical-regeneration",
      sha,
      () => {
        if (provenanceError)
          throw new Error(`Tag execution refused: ${provenanceError}`);
        return (dependencies.canonicalProof || canonicalProof)(sha);
      },
      "Repair distribution drift in a new protected release; never rebuild inside a publisher.",
    ),
    check(
      "live-catalog-and-seo",
      version,
      async () => {
        const urls = [
          "/",
          "/plugins",
          "/sitemap.xml",
          "/llms.txt",
          "/robots.txt",
          "/skills.json",
        ];
        const values = await Promise.all(
          urls.map((url) => fetchText(`https://aaskills.tech${url}`)),
        );
        if (activeCatalogError) throw new Error(activeCatalogError);
        const expectedSkills = activeCatalog?.skills || JSON.parse(
          (dependencies.snapshot || snapshot)(sha, "skills_index.json"),
        );
        if (digest(JSON.parse(values[5])) !== digest(expectedSkills))
          throw new Error("Live skill index differs from release tag");
        assertLiveSeoDocuments(
          Object.fromEntries(
            ["home", "plugins", "sitemap", "llms", "robots"].map((key, i) => [
              key,
              values[i],
            ]),
          ),
          {
            countLabel: `${expectedSkills.length.toLocaleString("en-US")}+`,
            releaseLabel: `V${version}`,
            pluginCount: activeCatalog?.descriptor.pluginCount || JSON.parse(
              (dependencies.snapshot || snapshot)(
                sha,
                "data/editorial-bundles.json",
              ),
            ).bundles.length,
          },
        );
        return {
          version,
          skills: expectedSkills.length,
          urls: urls.map((url) => `https://aaskills.tech${url}`),
        };
      },
      "Verify release-tag Pages deployment and live CDN content.",
    ),
    check(
      "legacy-bridge",
      sha,
      () => (dependencies.legacyProof || legacyProof)(sha, activeCatalog),
      "Run protected bridge synchronization and full live verification, including webmaster verification.",
    ),
    check(
      "local-mcp-hosts",
      version,
      async () => {
        if (provenanceError)
          throw new Error(`Runtime execution refused: ${provenanceError}`);
        const hosts = options.hosts || [
          {
            host: "codex",
            config: path.join(os.homedir(), ".codex/config.toml"),
          },
          { host: "claude", config: path.join(os.homedir(), ".claude.json") },
          { host: "claude", config: path.join(ROOT, ".mcp.json") },
          { host: "codex", config: path.join(ROOT, ".codex/config.toml") },
        ];
        const observed = await Promise.all(
          hosts.map((h) =>
            (dependencies.hostProof || hostProof)(h.host, h.config, version),
          ),
        );
        return {
          hosts: observed,
          scope:
            "Known default user/project configs plus explicit --hosts inventory; other host locations need explicit inventory.",
          clientSessions:
            "Fresh stdio verified; existing desktop sessions require reconnect and client-side confirmation.",
        };
      },
      "Update existing configured hosts through digest-bound aas mcp configure, then reconnect the clients.",
    ),
  ]);
  report.checks.sort((a, b) => a.component.localeCompare(b.component));
  const hostObservation = report.checks.find(
    (c) => c.component === "local-mcp-hosts",
  )?.observed;
  const configuredHosts =
    hostObservation?.hosts?.filter((h) => h.status === "verified") || [];
  if (
    options["client-confirmed-head"] &&
    options["client-confirmed-head"] !== sha
  )
    throw new Error(
      "Client attestation must match the exact released head SHA",
    );
  if (configuredHosts.length)
    report.checks.push({
      component: "client-session-reload",
      expected: sha,
      status:
        options["client-confirmed-head"] === sha
          ? "passed"
          : "manual-review-required",
      observed:
        options["client-confirmed-head"] === sha
          ? "Operator attested native client discovery/invocation for all inventoried hosts"
          : "Fresh stdio does not establish existing client state",
      action:
        "Reconnect each configured client, discover and invoke AAS, then attest with --client-confirmed-head <full released SHA>.",
    });
  report.machineChecksPassed = report.checks
    .filter((c) => c.component !== "client-session-reload")
    .every((c) => c.status === "passed");
  const personal = new Set(["local-mcp-hosts", "client-session-reload"]);
  report.publicReleaseComplete = report.provenance.status === "passed" && report.checks
    .filter((c) => !personal.has(c.component))
    .every((c) => c.status === "passed");
  report.personalEnvironmentUpdated = report.checks
    .filter((c) => personal.has(c.component))
    .every((c) => c.status === "passed");
  report.complete = report.publicReleaseComplete;
  report.completionLimit =
    "Machine checks do not attest editorial approval or that already-open native clients reloaded their MCP process.";
  return report;
}
function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--json") options.json = true;
    else if (
      [
        "--base",
        "--head",
        "--output",
        "--check",
        "--version",
        "--hosts",
        "--client-confirmed-head",
      ].includes(key)
    ) {
      if (!argv[i + 1] || argv[i + 1].startsWith("--"))
        throw new Error(`Missing value ${key}`);
      options[key.slice(2)] = argv[++i];
    } else throw new Error(`Unknown argument ${key}`);
  }
  return options;
}
async function main() {
  const mode = process.argv[2],
    options = parseArgs(process.argv.slice(3));
  let report;
  if (mode === "plan") {
    let base = options.base;
    if (!base)
      base = git(["describe", "--tags", "--abbrev=0", options.head || "HEAD"]);
    report = buildPlan(base, options.head || "HEAD");
    if (
      options.check &&
      !comparePlan(JSON.parse(fs.readFileSync(options.check)), report)
    )
      throw new Error(
        "Release plan is stale; regenerate for the current candidate",
      );
  } else if (mode === "verify") {
    if (options.hosts) {
      const inventory = JSON.parse(fs.readFileSync(options.hosts));
      if (
        !Array.isArray(inventory) ||
        inventory.length > 32 ||
        inventory.some((h) => !["codex", "claude"].includes(h.host))
      )
        throw new Error("Invalid host inventory");
      options.hosts = inventory;
    }
    report = await verifyRelease(options);
    if (!report.complete) process.exitCode = 1;
  } else throw new Error("Expected plan or verify");
  const output = JSON.stringify(report, null, 2) + "\n";
  if (options.output) fs.writeFileSync(options.output, output, { mode: 0o600 });
  process.stdout.write(output);
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = {
  verifyTagExecutionProvenance,
  buildPlan,
  comparePlan,
  workflowProof,
  parseArgs,
  verifyRelease,
  hostProof,
  handshake,
  resolve,
  canonicalProof,
};
