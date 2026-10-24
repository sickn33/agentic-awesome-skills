#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'artifacts');
const interesting = /(?:log|report|result|junit|surefire|allure|playwright|cypress|screenshot|video|trace)/i;
const summary = {
  root,
  files: 0,
  directories: 0,
  bytes: 0,
  extensions: {},
  interesting: [],
};

function walk(current, depth = 0) {
  if (depth > 64 || summary.files + summary.directories > 100000) throw new Error("Artifact inventory limit reached");
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      summary.directories += 1;
      walk(fullPath, depth + 1);
      continue;
    }
    if (!entry.isFile()) continue;

    const stat = fs.statSync(fullPath);
    const ext = path.extname(entry.name).toLowerCase() || '(none)';
    const relative = path.relative(root, fullPath);

    summary.files += 1;
    summary.bytes += stat.size;
    summary.extensions[ext] = (summary.extensions[ext] || 0) + 1;

    if (interesting.test(relative) && summary.interesting.length < 25) {
      summary.interesting.push(`${relative} (${stat.size} bytes)`);
    }
  }
}

if (!fs.existsSync(root)) {
  console.error(`ERROR: Artifact path not found: ${root}`);
  process.exit(1);
}

if (!fs.lstatSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) {
  console.error("ERROR: Artifact root must be a regular directory, not a symlink");
  process.exit(1);
}
walk(root);

console.log(`Artifact root: ${summary.root}`);
console.log(`Directories: ${summary.directories}`);
console.log(`Files: ${summary.files}`);
console.log(`Bytes: ${summary.bytes}`);
console.log('Extensions:');
for (const [ext, count] of Object.entries(summary.extensions).sort()) {
  console.log(`  ${ext}: ${count}`);
}

if (summary.interesting.length) {
  console.log('Interesting files:');
  for (const file of summary.interesting) console.log(`  ${file}`);
} else {
  console.log('Interesting files: none matched known log/report/artifact names.');
}
