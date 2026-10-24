#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

function readFlag(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

const cli = readFlag('--cli', './hyperexecute');
const config = readFlag('--config', 'hyperexecute.yaml');
const cliPath = path.resolve(cli);
const configPath = path.resolve(config);

if (fs.existsSync(cliPath)) {
  ok(`HyperExecute CLI found at ${cli}`);
  try {
    fs.accessSync(cliPath, fs.constants.X_OK);
    ok('HyperExecute CLI is executable');
  } catch {
    fail(`HyperExecute CLI is not executable. Run: chmod u+x ${cli}`);
  }
} else {
  warn(`HyperExecute CLI not found at ${cli}. Ask before downloading unless autonomous mode was approved.`);
}

if (fs.existsSync(configPath)) ok(`Config file found at ${config}`);
else fail(`Config file not found at ${config}`);

if (process.env.LT_USERNAME) ok('LT_USERNAME is set');
else warn('LT_USERNAME is not set. Export it locally or configure CI secrets before official validation/run.');

if (process.env.LT_ACCESS_KEY) ok('LT_ACCESS_KEY is set');
else warn('LT_ACCESS_KEY is not set. Export it locally or configure CI secrets before official validation/run.');

if (fs.existsSync(path.resolve('.hyperexecuteignore'))) ok('.hyperexecuteignore exists');
else warn('No .hyperexecuteignore found. Consider excluding secrets, local artifacts, and unrelated monorepo files.');

if (fs.existsSync(path.resolve('.gitignore'))) ok('.gitignore exists');
else warn('No .gitignore found. Ensure local secrets are not committed.');

if (hasFlag('--validate-cli')) {
  if (!fs.existsSync(cliPath)) fail('Cannot run official validation because CLI is missing.');
  else if (!process.env.LT_USERNAME || !process.env.LT_ACCESS_KEY) fail('Cannot run official validation because credentials are missing.');
  else if (!fs.existsSync(configPath)) fail('Cannot run official validation because config is missing.');
  else {
    const result = spawnSync(cliPath, ['--user', process.env.LT_USERNAME, '--key', process.env.LT_ACCESS_KEY, '--config', config, '--validate'], {
      stdio: 'inherit',
      shell: false,
      timeout: 120000,
    });
    if (result.status === 0) ok('Official HyperExecute validation passed');
    else fail(`Official validation incomplete/failed (exit ${result.status ?? "unknown"}); inspect timeout/process status locally before retrying.`);
  }
}

if (process.exitCode) {
  console.error('HyperExecute doctor found blocking issues.');
} else {
  console.log('HyperExecute doctor finished without blocking issues.');
}
