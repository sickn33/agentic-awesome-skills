import { spawn } from "node:child_process";

export function runProcess(executable, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      stdio: [options.stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const maxOutputBytes = options.maxOutputBytes ?? 4 * 1024 * 1024;
    let killedForOutput = false;
    const collect = (chunks, kind) => (chunk) => {
      if (kind === "stdout") stdoutBytes += chunk.length;
      else stderrBytes += chunk.length;
      if (stdoutBytes + stderrBytes > maxOutputBytes) {
        killedForOutput = true;
        child.kill("SIGKILL");
        return;
      }
      chunks.push(chunk);
    };
    child.stdout.on("data", collect(stdout, "stdout"));
    child.stderr.on("data", collect(stderr, "stderr"));
    child.once("error", reject);
    if (options.stdin !== undefined) {
      child.stdin.end(options.stdin);
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        code: code ?? 128,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        timedOut: signal === "SIGKILL" && !killedForOutput,
        outputLimitExceeded: killedForOutput,
      });
    });
  });
}
