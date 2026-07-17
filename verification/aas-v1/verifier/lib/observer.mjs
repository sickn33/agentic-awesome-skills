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
    if (/\b(?:WrData|WrMeta|write|pwrite|rename|unlink|mkdir|rmdir|truncate|chmod|chown|fsync|fdatasync|setattr|setxattr)\b/i.test(line)) {
      events.push({ kind: "write", targetDigest: redactToken(line, zones) });
    }
  }
  const execLines = fsUsageLines(execText);
  for (const line of execLines.slice(1)) events.push({ kind: "process", targetDigest: redactToken(line, zones) });
  return summarizeEvents(events);
}

export function parseMacCombinedFsUsage(text, zones = {}) {
  const events = [];
  const execLines = [];
  for (const line of fsUsageLines(text)) {
    if (/\b(?:socket|connect|bind|listen|accept|sendto|sendmsg|recvfrom|recvmsg|getaddrinfo)\b/i.test(line)) {
      events.push({ kind: "network", targetDigest: redactToken(line, zones) });
    } else if (/\b(?:WrData|WrMeta|write|pwrite|rename|unlink|mkdir|rmdir|truncate|chmod|chown|fsync|fdatasync|setattr|setxattr)\b/i.test(line)) {
      events.push({ kind: "write", targetDigest: redactToken(line, zones) });
    } else if (/\b(?:execve|posix_spawn|exec|spawn)\b/i.test(line)) {
      execLines.push(line);
    }
  }
  if (!execLines.length) {
    throw Object.assign(new Error("fs_usage did not observe the gated bootstrap exec"), { code: "AAS_OBSERVER_AMBIGUOUS_LINEAGE" });
  }
  for (const line of execLines.slice(1)) events.push({ kind: "process", targetDigest: redactToken(line, zones) });
  return summarizeEvents(events);
}

async function macObserved(executable, args, options) {
  if (!commandExists("fs_usage")) throw Object.assign(new Error("fs_usage is required"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  if (!fs.existsSync("/usr/bin/script")) throw Object.assign(new Error("script(1) is required for fs_usage readiness"), { code: "AAS_OBSERVER_UNAVAILABLE" });
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
  let observerPid = 0;
  let observerReady = false;
  let resolveReady;
  let rejectReady;
  let startupText = "";
  const readiness = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const observerTimeoutMs = (options.timeoutMs ?? 30_000) + 5_000;
  const observeStartup = (chunk) => {
    if (observerReady) return;
    startupText = `${startupText}${chunk.toString("utf8")}`.slice(-512);
    if (/Tracing active\. Please wait/i.test(startupText)) {
      observerReady = true;
      resolveReady();
    }
  };
  const observerPromise = runProcess("/usr/bin/script", [
    "-q", "/dev/null", "sudo", "-n", "/usr/bin/fs_usage", "-w", "-t", String(Math.ceil(observerTimeoutMs / 1000)),
    "-f", "filesys", "-f", "network", "-f", "exec", String(rootPid),
  ], {
    ...options,
    detached: true,
    timeoutMs: observerTimeoutMs,
    maxOutputBytes: 8 * 1024 * 1024,
    onSpawn(child) { observerPid = child.pid; },
    onStdoutData: observeStartup,
    onStderrData: observeStartup,
  });
  observerPromise.then((trace) => {
    if (!observerReady) rejectReady(Object.assign(new Error(`fs_usage exited before readiness (${trace.code})`), { code: "AAS_OBSERVER_UNAVAILABLE" }));
  }, rejectReady);
  const readinessTimer = setTimeout(() => {
    if (!observerReady) rejectReady(Object.assign(new Error("fs_usage readiness timed out"), { code: "AAS_OBSERVER_UNAVAILABLE" }));
  }, 5_000);
  await readiness.finally(() => clearTimeout(readinessTimer));
  fs.writeFileSync(gate, "go\n", { mode: 0o600 });
  const result = await commandPromise;
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (observerPid) {
    await runProcess("sudo", ["-n", "/bin/kill", "-INT", `-${observerPid}`], { timeoutMs: 5_000 });
  }
  const trace = await observerPromise;
  const raw = `${trace.stdout}\n${trace.stderr}`;
  fs.rmSync(gate, { force: true });
  fs.rmSync(launcher, { force: true });
  return {
    result,
    observation: parseMacCombinedFsUsage(raw, options.zones),
    backend: "macos-fs_usage-process",
    diagnostics: {
      bytes: Buffer.byteLength(raw),
      eventLines: fsUsageLines(raw).length,
      startupObserved: observerReady,
      preview: fsUsageLines(raw).length ? null : raw.trim().slice(0, 160),
    },
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
  return {
    result,
    observation: parseDelimitedObserver(raw, options.zones),
    backend: "windows-etw-kernel-process-tree",
    diagnostics: result.observerDiagnostics ?? null,
  };
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
  const program = `const fs=require('node:fs'),net=require('node:net');const fd=fs.openSync(${JSON.stringify(sentinel)},'w',0o600);fs.writeSync(fd,'sentinel');fs.fsyncSync(fd);fs.closeSync(fd);const server=net.createServer(s=>s.end());server.listen(0,'127.0.0.1',()=>{const s=net.connect({host:'127.0.0.1',port:server.address().port},()=>s.end());s.on('close',()=>server.close(()=>setTimeout(()=>process.exit(0),500)));s.on('error',()=>process.exit(2));});setTimeout(()=>process.exit(1),3000);`;
  const observed = await runObserved(process.execPath, ["-e", program], { ...options, timeoutMs: 10_000 });
  fs.rmSync(sentinel, { force: true });
  if (observed.observation.networkAttempts < 1 || observed.observation.writeAttempts < 1) {
    const diagnostic = JSON.stringify({
      backend: observed.backend,
      networkAttempts: observed.observation.networkAttempts,
      writeAttempts: observed.observation.writeAttempts,
      diagnostics: observed.diagnostics ?? null,
    });
    throw Object.assign(new Error(`Observer missed sentinel network/write attempts: ${diagnostic}`), { code: "AAS_OBSERVER_SELF_TEST_FAILED" });
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
