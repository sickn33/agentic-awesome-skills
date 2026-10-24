#!/usr/bin/env node

const path = require('path');

const args = process.argv.slice(2);
const action = args[0] || 'run';

function readFlag(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function quote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

const cli = readFlag('--cli', './hyperexecute');
const config = readFlag('--config', 'hyperexecute.yaml');
const artifactPath = readFlag('--download-artifacts-path', 'artifacts');
const secretFile = readFlag('--job-secret-file', '');
const runson = readFlag('--runson', '');
const concurrency = readFlag('--concurrency', '');

if (action === 'download') {
  console.error('Download-only requires a verified existing-job API/CLI flow; download flags on a run command may start another paid job.');
  process.exit(1);
}
if (concurrency && (!/^\d+$/.test(concurrency) || Number(concurrency) < 1)) {
  console.error('Concurrency must be a positive integer.');
  process.exit(1);
}
const command = [quote(cli), '--user "$LT_USERNAME"', '--key "$LT_ACCESS_KEY"'];

if (action === 'analyze') {
  console.log(`${quote(cli)} analyze`);
  process.exit(0);
}

command.push('--config', quote(config));

if (action === 'validate') command.push('--validate');
if (action === 'debug') command.push('--verbose', '--download-logs', '--download-report', '--download-artifacts');
if (action === 'download') command.push('--download-logs', '--download-report', '--download-artifacts', '--download-artifacts-path', quote(artifactPath));
if (secretFile) command.push('--job-secret-file', quote(secretFile));
if (runson) command.push('--runson', quote(runson));
if (concurrency) command.push('--concurrency', quote(concurrency));
if (hasFlag('--auto-proxy')) command.push('--auto-proxy');
if (hasFlag('--scan')) command.push('--scan');
if (hasFlag('--no-track')) command.push('--no-track');

if (!['run', 'validate', 'debug', 'download'].includes(action)) {
  console.error(`Unknown action: ${action}`);
  console.error('Usage: node scripts/build-command.js [analyze|validate|run|debug|download] --config hyperexecute.yaml');
  process.exit(1);
}

console.log(command.join(' '));

if (path.basename(config) !== config) {
  console.error('Note: config path includes directories; ensure payload layout matches CLI upload options.');
}
