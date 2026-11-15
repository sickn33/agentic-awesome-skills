#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { main: verify } = require("./distribution_manifest.cjs");
const WORKFLOW = ".github/workflows/distribution-candidate.yml";
function trustedRun(run, expected) {
  return run?.head_sha === expected.commit && run?.repository?.full_name === expected.repository
    && run?.head_repository?.full_name === expected.repository && run?.path === WORKFLOW
    && ["push", "workflow_dispatch"].includes(run.event) && run.head_branch === expected.tag
    && run.status === "completed" && run.conclusion === "success"
    && Number.isSafeInteger(run.id) && run.id > 0 && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0;
}
async function main(argv, env = process.env) {
  const [directory] = argv;
  if (argv.length !== 1 || !directory) throw new Error("Usage: distribution_fetch.cjs EMPTY_DIRECTORY");
  const root = path.resolve(__dirname, "../..");
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const gh = args => execFileSync("gh", args, { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const repository = env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || "")) throw new Error("Repository identity required");
  const commit = git(["rev-parse", "HEAD"]);
  const tag = `v${JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version}`;
  if (git(["rev-parse", `${tag}^{commit}`]) !== commit) throw new Error("Release tag moved or checkout differs");
  git(["merge-base", "--is-ancestor", commit, "origin/main"]);
  fs.mkdirSync(directory, { recursive: true });
  if (fs.readdirSync(directory).length) throw new Error("Candidate destination must be empty");
  const expected = { repository, commit, tag };
  for (let attempt = 0; attempt < 90; attempt++) {
    const response = JSON.parse(gh(["api", "--method", "GET", `repos/${repository}/actions/workflows/distribution-candidate.yml/runs`, "-f", `head_sha=${commit}`, "-f", "per_page=100"]));
    const runs = (response.workflow_runs || []).filter(run => trustedRun(run, expected)).sort((a,b) => b.id-a.id);
    if (runs.length) {
      const run = runs[0];
      gh(["run", "download", String(run.id), "--repo", repository, "--name", "distribution-candidate", "--dir", directory]);
      const current = JSON.parse(gh(["api", `repos/${repository}/actions/runs/${run.id}`]));
      if (!trustedRun(current, expected) || current.run_attempt !== run.run_attempt) throw new Error("Candidate run changed during download");
      verify(["verify", directory, String(run.id), String(run.run_attempt)], env);
      return;
    }
    if (attempt === 89) throw new Error("No successful immutable candidate found within 45 minutes");
    console.log("Waiting for the complete distribution candidate and platform checks...");
    await new Promise(resolve => setTimeout(resolve, 30_000));
  }
}
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { trustedRun, main };
