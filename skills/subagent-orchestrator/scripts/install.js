#!/usr/bin/env node
/**
 * Subagent Orchestrator Skill Installer
 * Installs the skill globally for Antigravity 2.0
 *
 * Usage:
 *   Windows PowerShell: node install.js
 *   Or via npx (if published): npx subagent-orchestrator-skill
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'subagent-orchestrator';

// Antigravity global skills path per OS
const INSTALL_PATHS = {
  win32:  path.join(os.homedir(), '.agents', 'skills'),
  darwin: path.join(os.homedir(), '.agents', 'skills'),
  linux:  path.join(os.homedir(), '.agents', 'skills'),
};

const targetBase = INSTALL_PATHS[process.platform] || INSTALL_PATHS.linux;
const targetDir  = path.join(targetBase, SKILL_NAME);
const sourceDir  = path.join(__dirname, '..');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'install.js') continue; // skip self
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`\n Installing Subagent Orchestrator Skill for Antigravity 2.0`);
console.log(`→ Target: ${targetDir}\n`);

try {
  copyDir(sourceDir, targetDir);
  console.log('✅ Skill installed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Restart your Antigravity terminal session');
  console.log('2. Start a new conversation');
  console.log('3. Give a multi-file task — the skill auto-activates');
  console.log('');
  console.log('Or trigger manually: "Use subagent-orchestrator for this task"');
  console.log('');
} catch (err) {
  console.error('❌ Install failed:', err.message);
  console.log('');
  console.log('Manual install: copy the folder to:');
  console.log(targetDir);
  process.exit(1);
}
