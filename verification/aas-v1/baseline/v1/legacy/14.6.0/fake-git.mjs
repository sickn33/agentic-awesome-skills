#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { treeDigest, treeEntries } from "./corpus-lib.mjs";

const fixture = process.env.AAS_LEGACY_FIXTURE_REPO;
const expectedFixtureDigest = process.env.AAS_LEGACY_FIXTURE_DIGEST;
const allowedCloneRoot = process.env.AAS_FAKE_GIT_ALLOWED_ROOT;
const tracePath = process.env.AAS_FAKE_GIT_TRACE;
const args = process.argv.slice(2);

function fail(message) {
  process.stderr.write(`fake-git: ${message}\n`);
  process.exit(97);
}

if (!fixture || !expectedFixtureDigest || !allowedCloneRoot || !tracePath) fail("missing harness environment");
if (args[0] !== "clone") fail(`unsupported command: ${args[0] || "<none>"}`);
const branchIndex = args.indexOf("--branch");
const expectedLength = branchIndex >= 0 ? 7 : 5;
if (args.length !== expectedLength || args[1] !== "--depth" || args[2] !== "1") fail("unexpected clone invocation shape");

const destination = path.resolve(args.at(-1));
const repository = args.at(-2);
if (repository !== "https://github.com/sickn33/agentic-awesome-skills.git") fail("unexpected repository URL");
if (!path.basename(destination).startsWith("ag-skills-")) fail("destination is not an installer temporary directory");
if (!fs.existsSync(destination) || !fs.lstatSync(destination).isDirectory() || fs.readdirSync(destination).length !== 0) fail("destination is not an empty directory");
const cloneRoot = fs.realpathSync(allowedCloneRoot);
const realDestination = fs.realpathSync(destination);
const relativeDestination = path.relative(cloneRoot, realDestination);
if (!relativeDestination || relativeDestination.startsWith("..") || path.isAbsolute(relativeDestination)) fail("destination escapes the controlled temp root");
const observedFixtureDigest = treeDigest(treeEntries(fixture));
if (observedFixtureDigest !== expectedFixtureDigest) fail("fixture digest changed");
const trace = {
  schemaVersion: 1,
  command: "clone",
  depth: args[args.indexOf("--depth") + 1] || null,
  branch: branchIndex >= 0 ? args[branchIndex + 1] : null,
  repository,
  destination: "<CLONE_DIR>",
  destinationWasEmpty: true,
  destinationContained: true,
  fixtureDigest: observedFixtureDigest,
};

fs.mkdirSync(path.dirname(tracePath), { recursive: true, mode: 0o700 });
fs.appendFileSync(tracePath, `${JSON.stringify(trace)}\n`, { encoding: "utf8", mode: 0o600 });
fs.cpSync(fixture, destination, { recursive: true, errorOnExist: true });
