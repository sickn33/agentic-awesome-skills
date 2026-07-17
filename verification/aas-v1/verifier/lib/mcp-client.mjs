import { spawn } from "node:child_process";

export class McpClient {
  constructor(executable, args, options = {}) {
    this.executable = executable;
    this.args = args;
    this.options = options;
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutBuffer = "";
    this.stderr = "";
    this.protocolNoise = [];
  }

  async start() {
    this.child = spawn(this.executable, this.args, {
      cwd: this.options.cwd,
      env: this.options.env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.#receive(chunk));
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk;
      if (Buffer.byteLength(this.stderr) > (this.options.maxStderrBytes ?? 1024 * 1024)) this.child.kill("SIGKILL");
    });
    this.child.on("close", (code, signal) => {
      const error = new Error(`MCP process closed (${code ?? signal})`);
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
    this.child.on("error", (error) => {
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
  }

  #receive(chunk) {
    this.stdoutBuffer += chunk;
    if (Buffer.byteLength(this.stdoutBuffer) > (this.options.maxStdoutBufferBytes ?? 4 * 1024 * 1024)) {
      this.child.kill("SIGKILL");
      return;
    }
    while (this.stdoutBuffer.includes("\n")) {
      const newline = this.stdoutBuffer.indexOf("\n");
      const line = this.stdoutBuffer.slice(0, newline).replace(/\r$/, "");
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line.trim()) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        this.protocolNoise.push(line.slice(0, 200));
        continue;
      }
      if (message.id !== undefined && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        pending.resolve(message);
      } else if (!message.method) {
        this.protocolNoise.push(line.slice(0, 200));
      }
    }
  }

  request(method, params = {}, timeoutMs = 10_000) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${payload}\n`);
    });
  }

  notify(method, params = {}) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  async stop() {
    if (!this.child || this.child.exitCode !== null) return;
    this.child.stdin.end();
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.child.kill("SIGKILL");
        resolve();
      }, 2_000);
      this.child.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
