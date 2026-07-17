import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { digestJson, sha256 } from "./canonical.mjs";
import { runProcess } from "./process.mjs";

const NETWORK_CALL = /\b(?:socket|socketpair|connect|bind|listen|accept|accept4|sendto|sendmsg|recvfrom|recvmsg|getaddrinfo|GetAddrInfoW)\s*\(/;
const MUTATION_CALL = /\b(?:creat|mkdir|mkdirat|rmdir|unlink|unlinkat|rename|renameat|renameat2|link|linkat|symlink|symlinkat|truncate|ftruncate|chmod|fchmod|fchmodat|chown|fchown|fchownat|utime|utimes|futimes|futimens|fsync|fdatasync)\s*\(/;
const OPEN_WRITE = /\b(?:open|openat|openat2)\s*\([^\n]*\b(?:O_WRONLY|O_RDWR|O_CREAT|O_TRUNC|O_APPEND)\b/;
const FD_WRITE = /\b(?:write|writev|pwrite|pwritev)\s*\((\d+)(?:<[^>]*>)?,/;
const PROCESS_CALL = /\b(?:execve|execveat|posix_spawn)\s*\(/;

function commandExists(command) {
  const probe = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(probe, [command], { encoding: "utf8", windowsHide: true });
  return result.status === 0;
}

function redactToken(token, zones) {
  let normalized = token;
  for (const [name, root] of Object.entries(zones)) {
    if (root && normalized.includes(root)) normalized = normalized.split(root).join(`<${name.toUpperCase()}>`);
  }
  return sha256(Buffer.from(normalized, "utf8"));
}

export function parseLinuxStrace(text, zones = {}) {
  const events = [];
  let rootExecSeen = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("+++") || line.startsWith("---")) continue;
    let kind = null;
    if (NETWORK_CALL.test(line)) kind = "network";
    else if (MUTATION_CALL.test(line) || OPEN_WRITE.test(line)) kind = "write";
    else {
      const fdWrite = line.match(FD_WRITE);
      if (fdWrite && !["1", "2"].includes(fdWrite[1])) kind = "write";
      else if (PROCESS_CALL.test(line)) {
        if (!rootExecSeen) rootExecSeen = true;
        else kind = "process";
      }
    }
    if (kind) events.push({ kind, targetDigest: redactToken(line, zones) });
  }
  return summarizeEvents(events);
}

export function parseDelimitedObserver(text, zones = {}) {
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [kind, ...rest] = line.split("|");
    if (!["network", "write", "process"].includes(kind)) continue;
    events.push({ kind, targetDigest: redactToken(rest.join("|"), zones) });
  }
  return summarizeEvents(events);
}

function shellQuote(value) {
  if (/[\0\r\n]/.test(value)) throw new Error("Observer command contains forbidden control characters");
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function summarizeEvents(events) {
  const byKind = (kind) => events.filter((entry) => entry.kind === kind);
  return {
    networkAttempts: byKind("network").length,
    writeAttempts: byKind("write").length,
    childProcesses: byKind("process").length,
    events,
    eventDigest: digestJson(events),
  };
}

async function linuxObserved(executable, args, options) {
  if (!commandExists("strace")) throw Object.assign(new Error("strace is required"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  const tracePrefix = path.join(options.evidenceDir, `strace-${process.pid}`);
  const traceArgs = [
    "-ff", "-qq", "-s", "256", "-yy",
    "-e", "trace=%network,%file,%process,write,writev,pwrite64,pwritev,fsync,fdatasync,ftruncate",
    "-o", tracePrefix,
    executable,
    ...args,
  ];
  const result = await runProcess("strace", traceArgs, options);
  const traceFiles = fs.readdirSync(options.evidenceDir)
    .filter((name) => name.startsWith(path.basename(tracePrefix)))
    .sort();
  if (!traceFiles.length) throw Object.assign(new Error("strace produced no trace"), { code: "AAS_OBSERVER_EMPTY" });
  const raw = traceFiles.map((name) => fs.readFileSync(path.join(options.evidenceDir, name), "utf8")).join("\n");
  for (const name of traceFiles) fs.rmSync(path.join(options.evidenceDir, name), { force: true });
  return { result, observation: parseLinuxStrace(raw, options.zones), backend: "linux-strace-process-tree" };
}

function fsUsageLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^\d{2}:\d{2}:\d{2}\.\d+/.test(line));
}

export function parseMacFsUsage(filesystemText, networkText, execText, zones = {}) {
  const events = [];
  for (const line of fsUsageLines(networkText)) events.push({ kind: "network", targetDigest: redactToken(line, zones) });
  for (const line of fsUsageLines(filesystemText)) {
    if (/\b(?:write|pwrite|rename|unlink|mkdir|rmdir|truncate|chmod|chown|fsync|fdatasync|setattr|setxattr)\b/i.test(line)) {
      events.push({ kind: "write", targetDigest: redactToken(line, zones) });
    }
  }
  const execLines = fsUsageLines(execText);
  for (const line of execLines.slice(1)) events.push({ kind: "process", targetDigest: redactToken(line, zones) });
  return summarizeEvents(events);
}

async function macObserved(executable, args, options) {
  if (!commandExists("fs_usage")) throw Object.assign(new Error("fs_usage is required"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  const gate = path.join(options.evidenceDir, `observer-${process.pid}.go`);
  const launcher = path.join(options.evidenceDir, `observer-${process.pid}.command`);
  const command = [executable, ...args].map(shellQuote).join(" ");
  fs.writeFileSync(launcher, `#!/bin/zsh\nwhile [[ ! -e ${shellQuote(gate)} ]]; do sleep 0.01; done\nexec ${command}\n`, { mode: 0o700 });
  let rootPid = 0;
  const commandPromise = runProcess("/bin/zsh", [launcher], {
    ...options,
    onSpawn(child) { rootPid = child.pid; },
  });
  if (!rootPid) throw Object.assign(new Error("Observed process did not start"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  const observers = ["filesys", "network", "exec"].map((mode) => {
    let pid = 0;
    const promise = runProcess("sudo", ["-n", "/usr/bin/fs_usage", "-w", "-f", mode, String(rootPid)], {
      ...options,
      timeoutMs: (options.timeoutMs ?? 30_000) + 5_000,
      maxOutputBytes: 8 * 1024 * 1024,
      onSpawn(child) { pid = child.pid; },
    });
    return { mode, get pid() { return pid; }, promise };
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  fs.writeFileSync(gate, "go\n", { mode: 0o600 });
  const result = await commandPromise;
  for (const observer of observers) {
    if (observer.pid) await runProcess("sudo", ["-n", "kill", "-INT", String(observer.pid)], { timeoutMs: 5_000 });
  }
  const traces = await Promise.all(observers.map(async (observer) => {
    const trace = await observer.promise;
    return [observer.mode, `${trace.stdout}\n${trace.stderr}`];
  }));
  fs.rmSync(gate, { force: true });
  fs.rmSync(launcher, { force: true });
  const byMode = Object.fromEntries(traces);
  return {
    result,
    observation: parseMacFsUsage(byMode.filesys, byMode.network, byMode.exec, options.zones),
    backend: "macos-fs_usage-process",
  };
}

async function windowsObserved(executable, args, options) {
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "observers", "windows-etw.ps1");
  const powershell = commandExists("pwsh.exe") ? "pwsh.exe" : "powershell.exe";
  if (!fs.existsSync(script) || !commandExists(powershell)) {
    throw Object.assign(new Error("Windows ETW observer is unavailable"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  const trace = path.join(options.evidenceDir, `windows-etw-${process.pid}.jsonl`);
  const encodedArgs = Buffer.from(JSON.stringify(args), "utf8").toString("base64");
  const resultFile = path.join(options.evidenceDir, `windows-result-${process.pid}.json`);
  const wrapper = await runProcess(powershell, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", script,
    "-Executable", executable,
    "-ArgumentsBase64", encodedArgs,
    "-TraceOutput", trace,
    "-ResultOutput", resultFile,
  ], options);
  if (wrapper.code !== 0 || !fs.existsSync(trace) || !fs.existsSync(resultFile)) {
    throw Object.assign(new Error(`ETW observer failed closed: ${wrapper.stderr.slice(0, 500)}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  const raw = fs.readFileSync(trace, "utf8");
  const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  fs.rmSync(trace, { force: true });
  fs.rmSync(resultFile, { force: true });
  return { result, observation: parseDelimitedObserver(raw, options.zones), backend: "windows-etw-kernel-process-tree" };
}

export async function runObserved(executable, args, options) {
  fs.mkdirSync(options.evidenceDir, { recursive: true, mode: 0o700 });
  if (process.platform === "linux") return linuxObserved(executable, args, options);
  if (process.platform === "darwin") return macObserved(executable, args, options);
  if (process.platform === "win32") return windowsObserved(executable, args, options);
  throw Object.assign(new Error(`Unsupported observer platform: ${process.platform}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
}

export async function selfTestObserver(options) {
  const sentinel = path.join(options.evidenceDir, `sentinel-${process.pid}.txt`);
  const program = `const fs=require('node:fs'),net=require('node:net');fs.writeFileSync(${JSON.stringify(sentinel)},'sentinel');const s=net.connect({host:'127.0.0.1',port:9});s.on('error',()=>process.exit(0));setTimeout(()=>process.exit(1),1000);`;
  const observed = await runObserved(process.execPath, ["-e", program], { ...options, timeoutMs: 10_000 });
  fs.rmSync(sentinel, { force: true });
  if (observed.observation.networkAttempts < 1 || observed.observation.writeAttempts < 1) {
    throw Object.assign(new Error("Observer missed sentinel network/write attempts"), { code: "AAS_OBSERVER_SELF_TEST_FAILED" });
  }
  return {
    backend: observed.backend,
    contractVersion: "1.0.0",
    selfTestDigest: observed.observation.eventDigest,
    observedNetworkSentinels: observed.observation.networkAttempts,
    observedWriteSentinels: observed.observation.writeAttempts,
    host: { platform: os.platform(), release: os.release(), architecture: os.arch() },
  };
}
