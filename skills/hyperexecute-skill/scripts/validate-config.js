#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const configPath = process.argv[2] || 'hyperexecute.yaml';
const absolutePath = path.resolve(configPath);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

function hasKey(content, key) {
  return new RegExp(`^${key}\\s*:`, 'm').test(content);
}

function keyValue(content, key) {
  const match = content.match(new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1].replace(/^['"]|['"]$/g, '') : '';
}

if (!fs.existsSync(absolutePath)) {
  fail(`Config file not found: ${configPath}`);
  process.exit();
}

const content = fs.readFileSync(absolutePath, 'utf8');

if (!hasKey(content, 'version')) fail('Missing required key: version');
if (!hasKey(content, 'runson')) warn('Missing runson; CLI --runson may override it, but YAML should usually declare it.');

const hasTestSuites = hasKey(content, 'testSuites');
const hasDiscovery = hasKey(content, 'testDiscovery');
const hasRunner = hasKey(content, 'testRunnerCommand');

if (!hasTestSuites && !(hasDiscovery && hasRunner)) {
  fail('Expected either testSuites or testDiscovery plus testRunnerCommand.');
}

if (hasDiscovery && !hasRunner) fail('testDiscovery is present but testRunnerCommand is missing.');

const concurrency = Number(keyValue(content, 'concurrency'));
if (hasKey(content, 'concurrency') && (!Number.isInteger(concurrency) || concurrency < 1)) {
  fail('concurrency should be a positive integer.');
}

if (!hasKey(content, 'pre')) warn('No pre step found; ensure dependencies and browsers are available in the HyperExecute environment.');
if (!hasKey(content, 'uploadArtefacts') && !hasKey(content, 'uploadArtifacts')) warn('No artifact upload paths found; debugging failed jobs may be harder.');
if (hasKey(content, 'retryOnFailure') && !hasKey(content, 'maxRetries')) warn('retryOnFailure is set but maxRetries is missing.');

if (/LT_ACCESS_KEY\s*:\s*['"]?(?!\$)[A-Za-z0-9_-]{12,}/.test(content)) {
  fail('LT_ACCESS_KEY appears to be hardcoded. Use ${LT_ACCESS_KEY} or CI secrets.');
}

if (/LT_USERNAME\s*:\s*[^\s$][^\n]*/.test(content)) {
  warn('LT_USERNAME appears to be hardcoded. Prefer ${LT_USERNAME} or CI secrets.');
}

if (/access[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9_-]{12,}/i.test(content)) {
  fail('Possible access key detected in config. Remove secrets from YAML.');
}

if (process.exitCode) {
  console.error('HyperExecute config lint failed. Run the official CLI with --validate after fixing these issues.');
} else {
  console.log('Text checks found no blocking patterns; YAML syntax/schema and credential safety remain unverified. Next: approved official CLI validation.');
}
