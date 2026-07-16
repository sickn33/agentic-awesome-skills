#!/usr/bin/env node

'use strict';

const { spawn, spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const PYTHON_ENV = {
  ...process.env,
  PYTHONDONTWRITEBYTECODE: process.env.PYTHONDONTWRITEBYTECODE || '1',
};

if (args.length === 0) {
  console.error('Usage: node tools/scripts/run-python.js <script.py> [args...]');
  process.exit(1);
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  const unique = [];

  for (const candidate of candidates) {
    const key = candidate.join('\u0000');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique;
}

function getPythonCandidates() {
  // Optional override for CI/local pinning without editing scripts.
  const configuredPython =
    process.env.ANTIGRAVITY_PYTHON || process.env.npm_config_python;
  const candidates = [
    configuredPython ? [configuredPython] : null,
    // Keep this ordered list easy to update if project requirements change.
    ['python3'],
    ['python'],
    ['py', '-3'],
  ].filter(Boolean);

  return uniqueCandidates(candidates);
}

function canRun(candidate) {
  const [command, ...baseArgs] = candidate;
  const probe = spawnSync(
    command,
    [...baseArgs, '-c', 'import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)'],
    {
      env: PYTHON_ENV,
      stdio: 'ignore',
      shell: false,
    },
  );

  return probe.error == null && probe.status === 0;
}

const pythonCandidates = getPythonCandidates();
const selected = pythonCandidates.find(canRun);

if (!selected) {
  console.error(
    'Unable to find a Python 3 interpreter. Tried: python3, python, py -3',
  );
  process.exit(1);
}

const [command, ...baseArgs] = selected;
const child = spawn(command, [...baseArgs, ...args], {
  env: PYTHON_ENV,
  stdio: 'inherit',
  shell: false,
});

child.on('error', (error) => {
  console.error(`Failed to start Python interpreter "${command}": ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    try {
      process.kill(process.pid, signal);
    } catch {
      process.exit(1);
    }
    return;
  }

  process.exit(code ?? 1);
});
