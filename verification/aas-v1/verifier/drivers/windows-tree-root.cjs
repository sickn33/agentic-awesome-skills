"use strict";

const fs = require("node:fs");
const { spawn } = require("node:child_process");

const [powershell, childDriver, jobSource, readyCanary, rootAckCanary, afterParentCanary] = process.argv.slice(2);
if (!powershell || !childDriver || !jobSource || !readyCanary || !rootAckCanary || !afterParentCanary) process.exit(64);

const child = spawn(powershell, [
  "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
  "-File", childDriver,
  "-JobSource", jobSource,
  "-ParentProcessId", String(process.pid),
  "-ReadyCanary", readyCanary,
  "-AfterParentCanary", afterParentCanary,
], {
  detached: true,
  stdio: ["ignore", "ignore", "inherit"],
  windowsHide: true,
});
fs.writeSync(1, String(child.pid));
child.unref();

const deadline = Date.now() + 3_000;
const readiness = setInterval(() => {
  if (fs.existsSync(readyCanary)) {
    clearInterval(readiness);
    fs.writeFileSync(rootAckCanary, "ack", { mode: 0o600 });
    process.exit(0);
  }
  if (Date.now() >= deadline) {
    clearInterval(readiness);
    process.exit(65);
  }
}, 25);
