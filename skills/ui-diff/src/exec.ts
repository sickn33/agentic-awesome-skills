import { spawn } from 'node:child_process';
import { redact, UiDiffError } from './log.js';

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string | Buffer;
  allowFailure?: boolean;
  timeoutMs?: number;
}

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a program without a shell and collects its output. Rejects on a non-zero exit unless `allowFailure`. */
export function exec(cmd: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let timer: NodeJS.Timeout | undefined;
    if (opts.timeoutMs) {
      timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    }
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (timer) clearTimeout(timer);
      if (error.code === 'ENOENT') {
        reject(new UiDiffError(`Command not found: ${cmd}`, { hint: `Install ${cmd} or make sure it is on PATH.` }));
      } else {
        reject(error);
      }
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      const result: ExecResult = {
        code: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      };
      if (result.code !== 0 && !opts.allowFailure) {
        const detail = (result.stderr || result.stdout).trim().split('\n').slice(-8).join('\n');
        reject(new UiDiffError(redact(`${cmd} ${args.join(' ')} exited with ${result.code}${detail ? `:\n${detail}` : ''}`)));
        return;
      }
      resolve(result);
    });
    if (opts.input !== undefined) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}
