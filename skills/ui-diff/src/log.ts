import { writeFileSync } from 'node:fs';

const secrets = new Set<string>();
let quiet = false;
let verbose = false;

/** Values registered here are replaced with `[redacted]` in every log line and error message. */
export function registerSecret(value: string | undefined | null): void {
  if (value && value.length >= 4) secrets.add(value);
}

export function redact(text: string): string {
  let out = text;
  for (const secret of secrets) out = out.split(secret).join('[redacted]');
  return out;
}

/** Writes a text file with registered secrets redacted. */
export function writeRedacted(file: string, text: string): void {
  writeFileSync(file, redact(text));
}

export function configureLog(opts: { quiet?: boolean; verbose?: boolean }): void {
  quiet = Boolean(opts.quiet);
  verbose = Boolean(opts.verbose);
}

function write(line: string): void {
  process.stderr.write(`${redact(line)}\n`);
}

export const log = {
  info(message: string): void {
    if (!quiet) write(`[ui-diff] ${message}`);
  },
  step(message: string): void {
    if (!quiet) write(`[ui-diff] → ${message}`);
  },
  warn(message: string): void {
    write(`[ui-diff] warning: ${message}`);
  },
  error(message: string): void {
    write(`[ui-diff] error: ${message}`);
  },
  /** Shown even with --quiet: it tells the user how to fix the error just printed. */
  hint(message: string): void {
    write(`[ui-diff] hint: ${message}`);
  },
  debug(message: string): void {
    if (verbose) write(`[ui-diff] debug: ${message}`);
  },
};

const notesAfterError = new WeakMap<object, string[]>();

/** A warning printed right after `error` (and its hint), so the real error is what the user sees first. */
export function noteAfterError(error: unknown, note: string): void {
  if (typeof error === 'object' && error !== null) notesAfterError.set(error, [...(notesAfterError.get(error) ?? []), note]);
  else log.warn(note);
}

export function notesAfter(error: unknown): string[] {
  return typeof error === 'object' && error !== null ? (notesAfterError.get(error) ?? []) : [];
}

export class UiDiffError extends Error {
  readonly hint?: string;
  readonly exitCode: number;
  constructor(message: string, opts: { hint?: string; exitCode?: number } = {}) {
    super(redact(message));
    this.name = 'UiDiffError';
    this.hint = opts.hint ? redact(opts.hint) : undefined;
    this.exitCode = opts.exitCode ?? 1;
  }
}
