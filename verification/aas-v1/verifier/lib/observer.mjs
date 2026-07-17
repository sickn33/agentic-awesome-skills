import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function shellQuote(value) {
  if (/[\0\r\n]/.test(value)) throw new Error("Observer command contains forbidden control characters");
  return `'${value.replaceAll("'", `'\\''`)}'`;
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

async function macObserved(executable, args, options) {
  if (!commandExists("dtrace")) throw Object.assign(new Error("dtrace is required"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  const script = path.join(options.evidenceDir, `observer-${process.pid}.d`);
  const output = path.join(options.evidenceDir, `observer-${process.pid}.trace`);
  fs.writeFileSync(script, `
#pragma D option quiet
syscall::socket:entry,syscall::connect:entry,syscall::bind:entry,syscall::listen:entry,syscall::accept:entry,syscall::sendto:entry,syscall::recvfrom:entry
/pid == $target || progenyof($target)/ { printf("network|%d|%s\\n", pid, probefunc); }
syscall::open:entry,syscall::open_nocancel:entry
/(pid == $target || progenyof($target)) && ((arg1 & 3) != 0 || (arg1 & 0x600) != 0)/ { printf("write|%d|%s|%s\\n", pid, probefunc, copyinstr(arg0)); }
syscall::write:entry,syscall::write_nocancel:entry
/(pid == $target || progenyof($target)) && arg0 > 2/ { printf("write|%d|%s|fd=%d\\n", pid, probefunc, arg0); }
syscall::mkdir:entry,syscall::rmdir:entry,syscall::unlink:entry,syscall::rename:entry,syscall::link:entry,syscall::symlink:entry,syscall::truncate:entry,syscall::ftruncate:entry,syscall::chmod:entry,syscall::chown:entry,syscall::fsync:entry
/pid == $target || progenyof($target)/ { printf("write|%d|%s\\n", pid, probefunc); }
proc:::exec-success
/progenyof($target)/ { printf("process|%d|exec\\n", pid); }
`, { mode: 0o600 });
  const command = [executable, ...args].map(shellQuote).join(" ");
  const dtrace = await runProcess("sudo", ["-n", "dtrace", "-q", "-s", script, "-c", command, "-o", output], options);
  fs.rmSync(script, { force: true });
  if (dtrace.code !== 0 || !fs.existsSync(output)) {
    throw Object.assign(new Error(`DTrace failed closed: ${dtrace.stderr.slice(0, 500)}`), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  const raw = fs.readFileSync(output, "utf8");
  fs.rmSync(output, { force: true });
  return {
    // DTrace writes probe records to -o while the observed command keeps its
    // stdout/stderr streams on the wrapper process. Preserve those protocol
    // bytes for the black-box MCP assertions.
    result: { ...dtrace, stdout: dtrace.stdout, stderr: dtrace.stderr },
    observation: parseDelimitedObserver(raw, options.zones),
    backend: "macos-dtrace-process-tree",
  };
}

async function windowsObserved(executable, args, options) {
  const script = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "observers", "windows-etw.ps1");
  if (!fs.existsSync(script) || !commandExists("powershell.exe")) {
    throw Object.assign(new Error("Windows ETW observer is unavailable"), { code: "AAS_OBSERVER_UNAVAILABLE" });
  }
  const trace = path.join(options.evidenceDir, `windows-etw-${process.pid}.jsonl`);
  const encodedArgs = Buffer.from(JSON.stringify(args), "utf8").toString("base64");
  const resultFile = path.join(options.evidenceDir, `windows-result-${process.pid}.json`);
  const wrapper = await runProcess("powershell.exe", [
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
