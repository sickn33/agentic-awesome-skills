"use strict";

const fs = require("node:fs");
const { spawn } = require("node:child_process");

const [childDriver, readyCanary, rootAckCanary, afterParentCanary] = process.argv.slice(2);
if (!childDriver || !readyCanary || !rootAckCanary || !afterParentCanary) process.exit(64);

const child = spawn(process.execPath, [childDriver, readyCanary, afterParentCanary], {
  stdio: ["ignore", "ignore", "inherit"],
  windowsHide: true,
});
fs.writeSync(1, String(child.pid));
child.unref();

const deadline = Date.now() + 1_000;
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
