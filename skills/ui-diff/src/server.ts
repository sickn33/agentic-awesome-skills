import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { log, UiDiffError } from './log.js';

export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

export function fillPort(template: string, port: number): string {
  return template.replace(/\{port\}/g, String(port));
}

export interface RunningServer {
  label: string;
  port: number;
  url: string;
  logFile: string;
  stop(): Promise<void>;
}

/**
 * Why a dev server did not become ready. Only `exited` and `http-error` can be caused by the
 * dependencies, so only those justify retrying with a clean install.
 */
export type StartFailure = 'exited' | 'http-error' | 'unreachable';

export class ServerStartError extends UiDiffError {
  readonly reason: StartFailure;
  constructor(message: string, reason: StartFailure, hint?: string) {
    super(message, { hint });
    this.reason = reason;
  }
}

const running = new Set<ChildProcess>();

function killGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // already gone
    }
  }
}

/** Stops every server started by this process (used on SIGINT / fatal errors). */
export function killAllServers(): void {
  for (const child of running) killGroup(child, 'SIGKILL');
  running.clear();
}

function tail(file: string, lines = 25): string {
  try {
    return readFileSync(file, 'utf8').trim().split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
}

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * URLs to probe for a local dev server: the configured one first, then the same URL on the other
 * loopback hosts. Dev servers bind "localhost" differently (Vite: often IPv6 ::1 only; Python's
 * http.server: 127.0.0.1 only), so a fixed host misses some of them.
 */
export function loopbackCandidates(url: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [url];
  }
  if (!LOOPBACK_HOSTS.includes(parsed.hostname)) return [url];
  const out = [parsed.toString()];
  for (const host of LOOPBACK_HOSTS) {
    const candidate = new URL(parsed.toString());
    candidate.hostname = host;
    if (!out.includes(candidate.toString())) out.push(candidate.toString());
  }
  return out;
}

/** `base` with its host replaced by the host of `answered` (the loopback URL that responded). */
export function withHostOf(base: string, answered: string): string {
  const out = new URL(base);
  out.hostname = new URL(answered).hostname;
  return out.toString().replace(/\/$/, '');
}

export interface ReadyResult {
  url: string;
  status: number;
}

export async function waitForUrl(
  urls: string | string[],
  opts: { timeoutMs: number; isAlive?: () => boolean; headers?: Record<string, string>; intervalMs?: number; failOn5xxAfterMs?: number },
): Promise<ReadyResult> {
  const candidates = Array.isArray(urls) ? urls : [urls];
  const started = Date.now();
  const deadline = started + opts.timeoutMs;
  let lastError = '';
  let first5xx: number | undefined;
  while (Date.now() < deadline) {
    if (opts.isAlive && !opts.isAlive()) throw new ServerStartError(`server exited before ${candidates[0]} became ready`, 'exited');
    for (const url of candidates) {
      try {
        const response = await fetch(url, { headers: opts.headers, redirect: 'manual', signal: AbortSignal.timeout(5000) });
        if (response.status < 500) return { url, status: response.status };
        lastError = `HTTP ${response.status}`;
        first5xx ??= Date.now();
      } catch (error) {
        const cause = (error as { cause?: { code?: string; message?: string } }).cause;
        if (!lastError.startsWith('HTTP')) lastError = cause?.code ?? cause?.message ?? (error as Error).message;
      }
    }
    if (first5xx !== undefined && opts.failOn5xxAfterMs !== undefined && Date.now() - first5xx > opts.failOn5xxAfterMs) {
      throw new ServerStartError(`${candidates[0]} kept answering ${lastError}`, 'http-error');
    }
    await new Promise((r) => setTimeout(r, opts.intervalMs ?? 400));
  }
  const seconds = Math.round(opts.timeoutMs / 1000);
  if (first5xx !== undefined) throw new ServerStartError(`timed out after ${seconds}s: ${candidates[0]} answered ${lastError}`, 'http-error');
  throw new ServerStartError(`timed out after ${seconds}s: nothing answered at ${candidates.join(', ')} (${lastError || 'no response'})`, 'unreachable');
}

/** Runs a shell command to completion, streaming output to a log file. */
export function runLogged(command: string, opts: { cwd: string; env: NodeJS.ProcessEnv; logFile: string; label: string }): Promise<void> {
  mkdirSync(path.dirname(opts.logFile), { recursive: true });
  const fd = openSync(opts.logFile, 'a');
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd: opts.cwd, env: opts.env, shell: true, stdio: ['ignore', fd, fd], detached: process.platform !== 'win32' });
    running.add(child);
    child.on('error', (error) => {
      running.delete(child);
      closeSync(fd);
      reject(error);
    });
    child.on('close', (code) => {
      running.delete(child);
      closeSync(fd);
      if (code === 0) resolve();
      else reject(new UiDiffError(`${opts.label} failed (exit ${code}): ${command}\n${tail(opts.logFile)}`, { hint: `Full log: ${opts.logFile}` }));
    });
  });
}

/** Known dev-server log lines that mean the captures may not show the real UI. */
export function serverLogWarnings(logFile: string, label: string): string[] {
  let text: string;
  try {
    text = readFileSync(logFile, 'utf8');
  } catch {
    return [];
  }
  const warnings: string[] = [];
  const blocked = /Blocked cross-origin request to Next\.js dev resource \S+ from "([^"]+)"/.exec(text);
  if (blocked) {
    warnings.push(
      `${label}: Next.js blocked its dev resources for "${blocked[1]}", so client components may not have hydrated; use "baseUrl": "http://localhost:{port}" (or add the host to allowedDevOrigins).`,
    );
  }
  return warnings;
}

export async function startServer(opts: {
  label: string;
  command: string;
  cwd: string;
  port: number;
  url: string;
  readyUrl: string;
  env: NodeJS.ProcessEnv;
  logFile: string;
  timeoutMs: number;
  /** Give up early when the server only answers 5xx for this long (used when a retry may fix it). */
  failOn5xxAfterMs?: number;
}): Promise<RunningServer> {
  if (!existsSync(opts.cwd)) {
    throw new UiDiffError(`${opts.label}: directory ${opts.cwd} does not exist`, {
      hint: '"cwd" in ui-diff.config.json is relative to the config file and uses forward slashes.',
    });
  }
  mkdirSync(path.dirname(opts.logFile), { recursive: true });
  const fd = openSync(opts.logFile, 'a');
  const command = fillPort(opts.command, opts.port);
  log.debug(`${opts.label}: ${command} (cwd ${opts.cwd})`);
  const child = spawn(command, {
    cwd: opts.cwd,
    env: { ...opts.env, PORT: String(opts.port), BROWSER: 'none', FORCE_COLOR: '0' },
    shell: true,
    stdio: ['ignore', fd, fd],
    detached: process.platform !== 'win32',
  });
  closeSync(fd);
  running.add(child);
  let exited = false;
  let spawnError: Error | undefined;
  child.on('error', (error) => {
    spawnError = error;
    exited = true;
    running.delete(child);
  });
  child.on('exit', () => {
    exited = true;
    running.delete(child);
  });
  const stop = async () => {
    if (exited) return;
    killGroup(child, 'SIGTERM');
    const deadline = Date.now() + 5000;
    while (!exited && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    if (!exited) killGroup(child, 'SIGKILL');
    running.delete(child);
  };
  let ready: ReadyResult;
  try {
    ready = await waitForUrl(loopbackCandidates(opts.readyUrl), { timeoutMs: opts.timeoutMs, isAlive: () => !exited, failOn5xxAfterMs: opts.failOn5xxAfterMs });
  } catch (error) {
    await stop();
    const reason: StartFailure = error instanceof ServerStartError ? error.reason : 'exited';
    const detail = spawnError ? `could not run the start command (${spawnError.message})` : (error as Error).message;
    const hints: Record<StartFailure, string> = {
      exited: `The start command exited; see the log. Full log: ${opts.logFile}`,
      'http-error': `The app started but answers with server errors; see the log. Full log: ${opts.logFile}`,
      unreachable: `The process is running but nothing answers on port ${opts.port}. Make sure startCommand passes {port} (or reads PORT) and that baseUrl matches; if the app is just slow to boot, raise startTimeoutMs (now ${Math.round(opts.timeoutMs / 1000)}s). Full log: ${opts.logFile}`,
    };
    throw new ServerStartError(`${opts.label} server did not start: ${detail}\n${tail(opts.logFile)}`, reason, hints[reason]);
  }
  if (ready.url !== opts.readyUrl) log.debug(`${opts.label}: answering on ${new URL(ready.url).host} instead of ${new URL(opts.readyUrl).host}`);
  return { label: opts.label, port: opts.port, url: withHostOf(opts.url, ready.url), logFile: opts.logFile, stop };
}
