import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { digestJson, sha256 } from "./canonical.mjs";
import { runProcess } from "./process.mjs";

const NETWORK_CALL = /\b(?:socket|socketpair|connect|bind|listen|accept|accept4|sendto|sendmsg|recvfrom|recvmsg|getaddrinfo|GetAddrInfoW)\s*\(/;
const MUTATION_CALL = /\b(?:creat|mkdir|mkdirat|rmdir|unlink|unlinkat|rename|renameat|renameat2|link|linkat|symlink|symlinkat|truncate|ftruncate|chmod|fchmod|fchmodat|chown|fchown|fchownat|utime|utimes|futimes|futimens|fsync|fdatasync)\s*\(/;
const OPEN_WRITE = /\b(?:open|openat|openat2)\s*\([^\n]*\b(?:O_WRONLY|O_RDWR|O_CREAT|O_TRUNC|O_APPEND)\b/;
const FD_WRITE = /\b(?:write|writev|pwrite|pwritev)\s*\((\d+)(?:<[^>]*>)?,/;
const PROCESS_CALL = /\b(?:execve|execveat|posix_spawn)\s*\(/;

function resolveCommandPath(command) {
  const probe = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(probe, [command], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find((line) => path.isAbsolute(line)) ?? null;
}

function commandExists(command) {
  return resolveCommandPath(command) !== null;
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

export function parseMacCombinedFsUsage(text, zones = {}, readinessToken = "", candidateToken = "") {
  const classified = [];
  let readinessIndex = -1;
  let candidateIndex = -1;
  const lines = fsUsageLines(text);
  for (const [index, line] of lines.entries()) {
    if (/\b(?:socket|connect|bind|listen|accept|sendto|sendmsg|recvfrom|recvmsg|getaddrinfo)\b/i.test(line)) {
      classified.push({ index, kind: "network", line });
    } else if (/\b(?:WrData|WrMeta|write|pwrite|rename|unlink|mkdir|rmdir|truncate|chmod|chown|fsync|fdatasync|setattr|setxattr)\b/i.test(line)) {
      if (readinessToken && line.includes(readinessToken)) readinessIndex = index;
      else if (candidateToken && line.includes(candidateToken)) candidateIndex = index;
      else classified.push({ index, kind: "write", line });
    } else if (/\b(?:execve|posix_spawn|exec|spawn)\b/i.test(line)) {
      classified.push({ index, kind: "process", line });
    }
  }
  const diagnostic = () => JSON.stringify({
    eventLines: lines.length,
    readinessTokenAnywhere: readinessToken ? text.includes(readinessToken) : null,
    candidateTokenAnywhere: candidateToken ? text.includes(candidateToken) : null,
    callNames: [...new Set(lines.map((line) => line.match(/^\d{2}:\d{2}:\d{2}\.\d+\s+(\S+)/)?.[1]).filter(Boolean))].slice(0, 24),
  });
  if (readinessToken && readinessIndex < 0) {
    throw Object.assign(new Error(`fs_usage missed the observer readiness canary: ${diagnostic()}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  if (candidateToken && candidateIndex < 0) {
    throw Object.assign(new Error(`fs_usage missed the candidate start canary: ${diagnostic()}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  if (candidateToken && candidateIndex <= readinessIndex) {
    throw Object.assign(new Error("fs_usage canary ordering is ambiguous"), { code: "AAS_OBSERVER_AMBIGUOUS_LINEAGE" });
  }
  const boundary = candidateToken ? candidateIndex : -1;
  const events = classified
    .filter((entry) => entry.index > boundary)
    .map(({ kind, line }) => ({ kind, targetDigest: redactToken(line, zones) }));
  return summarizeEvents(events);
}

async function macObserved(executable, args, options) {
  if (!commandExists("fs_usage")) throw Object.assign(new Error("fs_usage is required"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  if (path.resolve(executable) !== path.resolve(process.execPath)) {
    throw Object.assign(new Error("macOS verifier supports only the pinned Node executable"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  const budgets = macObserverBudgets(options.timeoutMs);
  const sequence = `${process.pid.toString(36)}${Date.now().toString(36).slice(-5)}`.slice(-8);
  const observedName = `aasobs${sequence}`;
  const observedExecutable = path.join(options.evidenceDir, observedName);
  const readinessCanary = path.join(options.evidenceDir, `aas-ready-${sequence}`);
  const candidateCanary = path.join(options.evidenceDir, `aas-start-${sequence}`);
  const readinessToken = path.basename(readinessCanary);
  const candidateToken = path.basename(candidateCanary);
  const launcher = path.join(options.evidenceDir, `observer-${process.pid}.command`);
  fs.copyFileSync(executable, observedExecutable, fs.constants.COPYFILE_FICLONE);
  fs.chmodSync(observedExecutable, 0o700);
  const encodedArgs = Buffer.from(JSON.stringify(args), "utf8").toString("base64");
  fs.writeFileSync(launcher, [
    `process.title = ${JSON.stringify(observedName)};`,
    "const fs = require('node:fs');",
    `const fd = fs.openSync(${JSON.stringify(candidateCanary)}, 'w', 0o600);`,
    "fs.writeSync(fd, 'start'); fs.fsyncSync(fd); fs.closeSync(fd);",
    `const args = JSON.parse(Buffer.from(${JSON.stringify(encodedArgs)}, 'base64').toString('utf8'));`,
    "if (args[0] === '-e') { process.argv = [process.execPath, ...args.slice(2)]; eval(args[1]); }",
    "else { process.argv = [process.execPath, ...args]; require('node:module').runMain(); }",
    "",
  ].join("\n"), { mode: 0o600 });
  let observerPid = 0;
  let observerOutcome = null;
  let observerPromise = null;
  let observerStopStarted = false;
  let observerCleanupFailed = false;
  let liveObserverOutput = "";
  let captureLiveOutput = true;
  const captureObserverOutput = (callback) => (chunk) => {
    if (captureLiveOutput) liveObserverOutput = `${liveObserverOutput}${chunk.toString("utf8")}`.slice(-1024 * 1024);
    if (typeof callback === "function") callback(chunk);
  };
  let readinessAttempts = 0;
  let readinessObservedLive = false;
  const stopObserver = async () => {
    if (observerStopStarted) return;
    observerStopStarted = true;
    if (!observerPid) return;
    const group = `-${observerPid}`;
    const probe = async () => runProcess("sudo", ["-n", "/bin/kill", "-0", group], { timeoutMs: 5_000 }).catch(() => null);
    const initialProbe = await probe();
    if (!initialProbe) {
      observerCleanupFailed = true;
      return;
    }
    if (initialProbe.code !== 0) return;
    await runProcess("sudo", ["-n", "/bin/kill", "-INT", group], { timeoutMs: 5_000 }).catch(() => null);
    await Promise.race([observerPromise, new Promise((resolve) => setTimeout(resolve, 1_000))]);
    const afterInterrupt = await probe();
    if (afterInterrupt?.code === 0) {
      await runProcess("sudo", ["-n", "/bin/kill", "-KILL", group], { timeoutMs: 5_000 }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const finalProbe = await probe();
    observerCleanupFailed = !finalProbe || finalProbe.code === 0;
  };
  const assertObserverActive = (stage) => {
    if (!observerOutcome) return;
    const result = observerOutcome.result;
    const diagnostic = JSON.stringify({
      stage,
      code: result?.code ?? null,
      signal: result?.signal ?? null,
      timedOut: result?.timedOut ?? null,
      outputLimitExceeded: result?.outputLimitExceeded ?? null,
      error: observerOutcome.error?.message ?? null,
    });
    throw Object.assign(new Error(`fs_usage exited before observation completed: ${diagnostic}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
  };
  try {
    observerPromise = runProcess("sudo", [
      "-n", "/usr/bin/fs_usage", "-w", "-t", String(Math.ceil(budgets.observerTimeoutMs / 1000)),
      observedName,
    ], {
      ...options,
      detached: true,
      timeoutMs: budgets.observerTimeoutMs,
      maxOutputBytes: 8 * 1024 * 1024,
      onSpawn(child) { observerPid = child.pid; },
      onStdoutData: captureObserverOutput(options.onStdoutData),
      onStderrData: captureObserverOutput(options.onStderrData),
    }).then(
      (result) => (observerOutcome = { result }),
      (error) => (observerOutcome = { error }),
    );
    await new Promise((resolve) => setTimeout(resolve, budgets.startupMs));
    assertObserverActive("startup");
    const readinessProgram = `process.title=${JSON.stringify(observedName)};const fs=require('node:fs');const target=${JSON.stringify(readinessCanary)};const deadline=Date.now()+4000;function beat(){const fd=fs.openSync(target,'w',0o600);fs.writeSync(fd,'ready');fs.fsyncSync(fd);fs.closeSync(fd);if(Date.now()<deadline)setTimeout(beat,200);}beat();`;
    for (let attempt = 0; attempt < budgets.readinessMaxAttempts; attempt += 1) {
      assertObserverActive("readiness-before-probe");
      readinessAttempts += 1;
      const readinessResult = await runProcess(observedExecutable, ["-e", readinessProgram], {
        cwd: options.cwd,
        env: options.env,
        timeoutMs: budgets.readinessProcessTimeoutMs,
      });
      if (readinessResult.code !== 0 || readinessResult.timedOut) {
        const diagnostic = JSON.stringify({
          code: readinessResult.code,
          signal: readinessResult.signal,
          timedOut: readinessResult.timedOut,
          outputLimitExceeded: readinessResult.outputLimitExceeded,
          stderr: readinessResult.stderr.slice(0, 240),
        });
        throw Object.assign(new Error(`macOS readiness process failed: ${diagnostic}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
      }
      await new Promise((resolve) => setTimeout(resolve, budgets.readinessDelayMs));
      assertObserverActive("readiness-after-probe");
      if (liveObserverOutput.includes(readinessToken)) {
        readinessObservedLive = true;
        captureLiveOutput = false;
        break;
      }
    }
    if (!readinessObservedLive) {
      throw Object.assign(new Error("fs_usage did not confirm readiness before the candidate deadline"), { code: "AAS_OBSERVER_UNAVAILABLE" });
    }
    assertObserverActive("candidate-start");
    const result = await runProcess(observedExecutable, [launcher], options);
    await new Promise((resolve) => setTimeout(resolve, budgets.drainMs));
    assertObserverActive("candidate-drain");
    await stopObserver();
    if (observerCleanupFailed) {
      throw Object.assign(new Error("fs_usage process group survived bounded cleanup"), { code: "AAS_OBSERVER_UNAVAILABLE" });
    }
    const outcome = await observerPromise;
    if (outcome.error) throw Object.assign(new Error("fs_usage observer process failed to start"), { code: "AAS_OBSERVER_UNAVAILABLE" });
    const trace = outcome.result;
    if (trace.outputLimitExceeded) throw Object.assign(new Error("fs_usage trace exceeded the observer limit"), { code: "AAS_OBSERVER_OVERFLOW" });
    if (trace.timedOut) throw Object.assign(new Error("fs_usage exceeded its derived lifecycle budget"), { code: "AAS_OBSERVER_UNAVAILABLE" });
    const raw = `${trace.stdout}\n${trace.stderr}`;
    return {
      result,
      observation: parseMacCombinedFsUsage(raw, options.zones, readinessToken, candidateToken),
      backend: "macos-fs_usage-process",
      diagnostics: {
        bytes: Buffer.byteLength(raw),
        eventLines: fsUsageLines(raw).length,
        readinessCanaryObserved: raw.includes(readinessToken),
        candidateCanaryObserved: raw.includes(candidateToken),
        readinessAttempts,
        readinessObservedLive,
        preview: fsUsageLines(raw).length ? null : raw.trim().slice(0, 160),
      },
    };
  } finally {
    captureLiveOutput = false;
    await stopObserver();
    if (observerPromise) await observerPromise.catch(() => null);
    fs.rmSync(readinessCanary, { force: true });
    fs.rmSync(candidateCanary, { force: true });
    fs.rmSync(launcher, { force: true });
    fs.rmSync(observedExecutable, { force: true });
  }
}

export function macObserverBudgets(candidateTimeoutMs = 30_000) {
  if (!Number.isSafeInteger(candidateTimeoutMs) || candidateTimeoutMs < 1 || candidateTimeoutMs > 15 * 60_000) {
    throw Object.assign(new Error("macOS observer timeout must be an integer from 1 to 900000 milliseconds"), {
      code: "AAS_OBSERVER_INVALID_TIMEOUT",
    });
  }
  const startupMs = 1_500;
  const readinessMaxAttempts = 2;
  const readinessProcessTimeoutMs = 10_000;
  const readinessDelayMs = 250;
  const drainMs = 1_000;
  return {
    startupMs,
    readinessMaxAttempts,
    readinessProcessTimeoutMs,
    readinessDelayMs,
    drainMs,
    observerTimeoutMs: startupMs
      + readinessMaxAttempts * (readinessProcessTimeoutMs + readinessDelayMs)
      + candidateTimeoutMs
      + drainMs
      + 5_000,
  };
}

async function windowsObserved(executable, args, options) {
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "observers", "windows-etw.ps1");
  const powershell = resolveCommandPath("pwsh.exe") ?? resolveCommandPath("powershell.exe");
  if (!fs.existsSync(script) || !powershell) {
    throw Object.assign(new Error("Windows ETW observer is unavailable"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  const trace = path.join(options.evidenceDir, `windows-etw-${process.pid}.jsonl`);
  const encodedArgs = Buffer.from(JSON.stringify(args), "utf8").toString("base64");
  const resultFile = path.join(options.evidenceDir, `windows-result-${process.pid}.json`);
  const sessionName = `AASVerifier-${process.pid}-${randomUUID().replaceAll("-", "")}`;
  const { candidateTimeoutMs, wrapperTimeoutMs } = windowsObserverBudgets(options.timeoutMs);
  const wrapper = await runProcess(powershell, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", script,
    "-Executable", executable,
    "-ArgumentsBase64", encodedArgs,
    "-TraceOutput", trace,
    "-ResultOutput", resultFile,
    "-SessionName", sessionName,
    "-CandidateTimeoutMilliseconds", String(candidateTimeoutMs),
  ], { ...options, timeoutMs: wrapperTimeoutMs });
  if (wrapper.code !== 0 || !fs.existsSync(trace) || !fs.existsSync(resultFile)) {
    const cleanup = await runProcess("logman.exe", ["stop", sessionName, "-ets"], {
      cwd: options.cwd,
      env: options.env,
      timeoutMs: 5_000,
      maxOutputBytes: 64 * 1024,
    });
    fs.rmSync(path.join(options.evidenceDir, `${sessionName}.etl`), { force: true });
    fs.rmSync(path.join(options.evidenceDir, `${sessionName}.csv`), { force: true });
    const traceExists = fs.existsSync(trace);
    const resultExists = fs.existsSync(resultFile);
    const diagnostic = JSON.stringify({
      wrapperCode: wrapper.code,
      signal: wrapper.signal,
      timedOut: wrapper.timedOut,
      outputLimitExceeded: wrapper.outputLimitExceeded,
      traceExists,
      resultExists,
      cleanupCode: cleanup.code,
      stderr: wrapper.stderr.slice(0, 500),
      stdout: wrapper.stdout.slice(0, 500),
    });
    fs.rmSync(trace, { force: true });
    fs.rmSync(resultFile, { force: true });
    fs.rmSync(`${resultFile}.stdout`, { force: true });
    fs.rmSync(`${resultFile}.stderr`, { force: true });
    throw Object.assign(new Error(`ETW observer failed closed: ${diagnostic}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
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

export function windowsObserverBudgets(timeoutMs = 30_000) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15 * 60_000) {
    throw Object.assign(new Error("Windows observer timeout must be an integer from 1 to 900000 milliseconds"), {
      code: "AAS_OBSERVER_INVALID_TIMEOUT",
    });
  }
  return {
    candidateTimeoutMs: timeoutMs,
    wrapperTimeoutMs: timeoutMs + 60_000,
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
  if (observed.result.code !== 0 || observed.result.timedOut) {
    throw Object.assign(new Error("Observer sentinel process did not complete within its candidate budget"), {
      code: "AAS_OBSERVER_SELF_TEST_FAILED",
    });
  }
  if (observed.observation.networkAttempts < 1 || observed.observation.writeAttempts < 1) {
    const diagnostic = JSON.stringify({
      backend: observed.backend,
      networkAttempts: observed.observation.networkAttempts,
      writeAttempts: observed.observation.writeAttempts,
      diagnostics: observed.diagnostics ?? null,
    });
    throw Object.assign(new Error(`Observer missed sentinel network/write attempts: ${diagnostic}`), { code: "AAS_OBSERVER_SELF_TEST_FAILED" });
  }
  if (process.platform === "win32") await selfTestWindowsProcessTree(options);
  return {
    backend: observed.backend,
    contractVersion: "1.0.0",
    selfTestDigest: observed.observation.eventDigest,
    observedNetworkSentinels: observed.observation.networkAttempts,
    observedWriteSentinels: observed.observation.writeAttempts,
    host: { platform: os.platform(), release: os.release(), architecture: os.arch() },
  };
}

async function selfTestWindowsProcessTree(options) {
  const drivers = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "drivers");
  const rootDriver = path.join(drivers, "windows-tree-root.ps1");
  const childDriver = path.join(drivers, "windows-tree-child.ps1");
  const jobSource = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "observers", "windows-job.cs");
  const powershell = resolveCommandPath("pwsh.exe") ?? resolveCommandPath("powershell.exe");
  if (!powershell) throw Object.assign(new Error("Windows PowerShell runtime is unavailable"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  const readyCanary = path.join(options.evidenceDir, `child-ready-${process.pid}.txt`);
  const rootAckCanary = path.join(options.evidenceDir, `root-ack-${process.pid}.txt`);
  const childCanary = path.join(options.evidenceDir, `child-after-parent-${process.pid}.txt`);
  const observed = await runObserved(powershell, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", rootDriver,
    "-Powershell", powershell,
    "-ChildDriver", childDriver,
    "-JobSource", jobSource,
    "-ReadyCanary", readyCanary,
    "-RootAckCanary", rootAckCanary,
    "-AfterParentCanary", childCanary,
  ], {
    ...options,
    timeoutMs: 10_000,
  });
  const childPid = Number.parseInt(observed.result.stdout.trim(), 10);
  const sessionName = observed.diagnostics?.sessionName;
  let childAlive = false;
  if (Number.isSafeInteger(childPid) && childPid > 0) {
    try {
      process.kill(childPid, 0);
      childAlive = true;
    } catch {
      childAlive = false;
    }
  }
  const sessionProbe = sessionName
    ? spawnSync("logman.exe", ["query", sessionName, "-ets"], { encoding: "utf8", windowsHide: true })
    : { status: 0 };
  const leftovers = fs.readdirSync(options.evidenceDir).filter((name) =>
    /^(?:AASVerifier-|windows-etw-|windows-result-)/.test(name) || /\.(?:etl|csv|stdout|stderr)$/.test(name));
  const readyCanaryWritten = fs.existsSync(readyCanary) && fs.readFileSync(readyCanary, "utf8") === "ready";
  const rootAckCanaryWritten = fs.existsSync(rootAckCanary) && fs.readFileSync(rootAckCanary, "utf8") === "ack";
  const childCanaryWritten = fs.existsSync(childCanary) && fs.readFileSync(childCanary, "utf8") === "child";
  fs.rmSync(readyCanary, { force: true });
  fs.rmSync(rootAckCanary, { force: true });
  fs.rmSync(childCanary, { force: true });
  const valid = observed.result.code === 124
    && observed.result.timedOut === true
    && observed.observation.childProcesses >= 1
    && readyCanaryWritten
    && rootAckCanaryWritten
    && childCanaryWritten
    && Number.isSafeInteger(childPid)
    && !childAlive
    && typeof sessionName === "string"
    && sessionProbe.status !== 0
    && leftovers.length === 0;
  if (!valid) {
    const diagnostic = JSON.stringify({
      code: observed.result.code,
      timedOut: observed.result.timedOut,
      childProcesses: observed.observation.childProcesses,
      childPid,
      childAlive,
      readyCanaryWritten,
      rootAckCanaryWritten,
      childCanaryWritten,
      totalRows: observed.diagnostics?.totalRows ?? null,
      processStartRows: observed.diagnostics?.processStartRows ?? null,
      jobTotalProcesses: observed.diagnostics?.jobTotalProcesses ?? null,
      rootStopRows: observed.diagnostics?.rootStopRows ?? null,
      postRootDescendantWriteRows: observed.diagnostics?.postRootDescendantWriteRows ?? null,
      rootEventSamples: observed.diagnostics?.rootEventSamples ?? null,
      stderr: observed.result.stderr.slice(0, 500),
      sessionName: sessionName ?? null,
      sessionStillExists: sessionProbe.status === 0,
      leftovers,
    });
    throw Object.assign(new Error(`Windows Job Object self-test failed: ${diagnostic}`), { code: "AAS_OBSERVER_SELF_TEST_FAILED" });
  }
}
