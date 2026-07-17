"use strict";

const fs = require("node:fs");

const [readyCanary, afterParentCanary] = process.argv.slice(2);
if (!readyCanary || !afterParentCanary) process.exit(64);

fs.writeFileSync(readyCanary, "ready", { mode: 0o600 });
const parentPid = process.ppid;
const parentDeadline = Date.now() + 1_000;
const parentProbe = setInterval(() => {
  let parentAlive = true;
  try {
    process.kill(parentPid, 0);
  } catch {
    parentAlive = false;
  }
  if (!parentAlive) {
    clearInterval(parentProbe);
    fs.writeFileSync(afterParentCanary, "child", { mode: 0o600 });
    setInterval(() => {}, 1_000);
  } else if (Date.now() >= parentDeadline) {
    clearInterval(parentProbe);
    process.exit(66);
  }
}, 25);
