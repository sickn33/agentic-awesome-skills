#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findProjectRoot } = require('../lib/project-root');

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node tools/scripts/copy-file.js <source> <destination>');
  process.exit(1);
}

const [sourceInput, destinationInput] = args;
const projectRoot = findProjectRoot(__dirname);
const sourcePath = path.resolve(projectRoot, sourceInput);
const destinationPath = path.resolve(projectRoot, destinationInput);
const destinationDir = path.dirname(destinationPath);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isInsideProjectRoot(targetPath) {
  const relativePath = path.relative(projectRoot, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function assertSafeDestination(destinationPath) {
  if (fs.existsSync(destinationPath) && fs.lstatSync(destinationPath).isSymbolicLink()) {
    fail(`Destination must not be a symlink: ${path.relative(projectRoot, destinationPath)}`);
  }

  const resolvedDestinationDir = fs.realpathSync(destinationDir);
  if (!isInsideProjectRoot(resolvedDestinationDir)) {
    fail(`Destination parent resolves outside the project root: ${path.relative(projectRoot, destinationDir)}`);
  }
}

if (!isInsideProjectRoot(sourcePath) || !isInsideProjectRoot(destinationPath)) {
  fail('Source and destination must resolve inside the project root.');
}

if (sourcePath === destinationPath) {
  fail('Source and destination must be different files.');
}

if (!fs.existsSync(sourcePath)) {
  fail(`Source file not found: ${sourceInput}`);
}

let sourceStats;
try {
  sourceStats = fs.statSync(sourcePath);
} catch (error) {
  fail(`Unable to read source file "${sourceInput}": ${error.message}`);
}

if (!sourceStats.isFile()) {
  fail(`Source is not a file: ${sourceInput}`);
}

let destinationDirStats;
try {
  destinationDirStats = fs.statSync(destinationDir);
} catch {
  fail(`Destination directory not found: ${path.relative(projectRoot, destinationDir)}`);
}

if (!destinationDirStats.isDirectory()) {
  fail(`Destination parent is not a directory: ${path.relative(projectRoot, destinationDir)}`);
}

assertSafeDestination(destinationPath);

try {
  fs.copyFileSync(sourcePath, destinationPath);
} catch (error) {
  fail(`Copy failed (${sourceInput} -> ${destinationInput}): ${error.message}`);
}

console.log(`Copied ${sourceInput} -> ${destinationInput}`);
