// Zero-dependency concurrency + rate-limit primitives for `vercel metrics`. API cap is 100 req / 60s / team.
// CLI fails fast on 429 and doesn't surface Retry-After, so we back off blind.

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_MAX_RETRIES = 3;
// Wait most of a 60s window when rate-limited — we don't know how much headroom remains. Jitter prevents lockstep retry.
const BASE_BACKOFF_MS = 60_000;
const JITTER_MS = 15_000;
// 20% headroom under the 100/60s cap for the user's other concurrent CLI usage.
const DEFAULT_RATE_LIMIT = 80;
const DEFAULT_RATE_WINDOW_MS = 60_000;
const DAILY_OBSERVABILITY_LIMIT_RE = /daily.*observability.*query limit/i;

let dailyQuotaBlock = null;

export function resolveConcurrency() {
  return parsePositiveIntEnv('VERCEL_OPTIMIZE_METRIC_CONCURRENCY', DEFAULT_CONCURRENCY);
}

// Format: VERCEL_OPTIMIZE_METRIC_RATE=N or N/60s.
export function resolveRateLimit() {
  const env = process.env.VERCEL_OPTIMIZE_METRIC_RATE;
  if (env == null || env === '') return { maxCalls: DEFAULT_RATE_LIMIT, windowMs: DEFAULT_RATE_WINDOW_MS };
  const m = String(env).trim().match(/^(\d+)(?:\/(\d+)([sm])?)?$/);
  if (!m) return { maxCalls: DEFAULT_RATE_LIMIT, windowMs: DEFAULT_RATE_WINDOW_MS };
  const maxCalls = Number(m[1]);
  if (!Number.isInteger(maxCalls) || maxCalls < 1) {
    return { maxCalls: DEFAULT_RATE_LIMIT, windowMs: DEFAULT_RATE_WINDOW_MS };
  }
  if (!m[2]) return { maxCalls, windowMs: DEFAULT_RATE_WINDOW_MS };
  const unit = m[3] === 'm' ? 60_000 : 1_000;
  const windowMs = Number(m[2]) * unit;
  return { maxCalls, windowMs };
}

function parsePositiveIntEnv(name, defaultValue) {
  const env = process.env[name];
  if (env == null || env === '') return defaultValue;
  const n = Number(env);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return defaultValue;
  return n;
}

// FIFO semaphore. Caller MUST call returned release() exactly once.
export class SemaphoreAbortError extends Error {
  constructor(result) {
    super('Semaphore acquire aborted');
    this.name = 'SemaphoreAbortError';
    this.result = result;
  }
}

export class Semaphore {
  constructor(max) {
    if (!Number.isInteger(max) || max < 1) {
      throw new Error(`Semaphore: max must be a positive integer (got ${max})`);
    }
    this.max = max;
    this.inFlight = 0;
    this.waiters = [];
  }

  async acquire(opts = {}) {
    const abortIf = opts.abortIf;
    const preAbort = abortIf?.();
    if (preAbort) throw new SemaphoreAbortError(preAbort);
    if (this.inFlight < this.max) {
      this.inFlight++;
      return () => this.release();
    }
    await new Promise((resolve) => this.waiters.push(resolve));
    const postAbort = abortIf?.();
    if (postAbort) {
      this.wakeNext();
      throw new SemaphoreAbortError(postAbort);
    }
    this.inFlight++;
    return () => this.release();
  }

  release() {
    this.inFlight--;
    this.wakeNext();
  }

  wakeNext() {
    const next = this.waiters.shift();
    if (next) next();
  }

  async run(fn, opts = {}) {
    const release = await this.acquire(opts);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

// Load-bearing — semaphore alone is insufficient (8 concurrent × ~1s queries = 480/min, well above the 100/min cap).
export class SlidingWindowRateLimiter {
  constructor(maxCalls, windowMs, opts = {}) {
    if (!Number.isInteger(maxCalls) || maxCalls < 1) {
      throw new Error(`SlidingWindowRateLimiter: maxCalls must be >=1 (got ${maxCalls})`);
    }
    if (!Number.isFinite(windowMs) || windowMs < 1) {
      throw new Error(`SlidingWindowRateLimiter: windowMs must be >0 (got ${windowMs})`);
    }
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.timestamps = []; // ascending order
    this.now = opts.now ?? (() => Date.now());
    this.sleep = opts.sleep ?? defaultSleep;
  }

  async acquire() {
    while (true) {
      this.prune();
      if (this.timestamps.length < this.maxCalls) {
        this.timestamps.push(this.now());
        return;
      }
      // Small buffer avoids racing the window boundary.
      const oldestExpiresAt = this.timestamps[0] + this.windowMs;
      const sleepMs = Math.max(50, oldestExpiresAt - this.now() + 100);
      await this.sleep(sleepMs);
    }
  }

  prune() {
    const cutoff = this.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}

// Composes Semaphore + RateLimiter: bounds both burst (8 concurrent) and sustained throughput (80/60s).
let metricThrottleSingleton = null;
export function getMetricThrottle() {
  if (!metricThrottleSingleton) {
    const semaphore = new Semaphore(resolveConcurrency());
    const { maxCalls, windowMs } = resolveRateLimit();
    const rateLimiter = new SlidingWindowRateLimiter(maxCalls, windowMs);
    metricThrottleSingleton = {
      semaphore,
      rateLimiter,
      maxCalls,
      windowMs,
      async run(fn) {
        const cached = getDailyQuotaBlock();
        if (cached) return dailyQuotaResult(cached);
        let release;
        try {
          release = await semaphore.acquire({ abortIf: () => {
            const block = getDailyQuotaBlock();
            return block ? dailyQuotaResult(block) : null;
          } });
        } catch (err) {
          if (err instanceof SemaphoreAbortError) return err.result;
          throw err;
        }
        try {
          const afterAcquire = getDailyQuotaBlock();
          if (afterAcquire) return dailyQuotaResult(afterAcquire);
          await rateLimiter.acquire();
          const result = await fn();
          if (isDailyQuotaExceeded(result)) {
            const block = setDailyQuotaBlocked(result);
            return dailyQuotaResult(block, result);
          }
          return result;
        } finally {
          release();
        }
      },
    };
  }
  return metricThrottleSingleton;
}

// Back-compat alias — returns the throttle object (compatible `.run(fn)` shape).
export const getMetricSemaphore = getMetricThrottle;

export function _resetMetricSemaphoreForTests() {
  metricThrottleSingleton = null;
  dailyQuotaBlock = null;
}

export async function retryOnRateLimit(fn, opts = {}) {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseBackoffMs = opts.baseBackoffMs ?? BASE_BACKOFF_MS;
  const jitterMs = opts.jitterMs ?? JITTER_MS;
  const sleep = opts.sleep ?? defaultSleep;
  const onRetry = opts.onRetry;

  let attempt = 0;
  while (true) {
    const result = await fn();
    if (!isRateLimited(result) || attempt >= maxRetries) return result;
    attempt++;
    // attempt 1 = 1x, 2 = 1.5x, 3 = 2x of base.
    const factor = 1 + (attempt - 1) * 0.5;
    const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
    const delay = Math.round(baseBackoffMs * factor + jitter);
    if (onRetry) onRetry(attempt, delay, result);
    await sleep(delay);
  }
}

// Variants: code='RATE_LIMITED' (canonical), 'rate_limited', or 'EXIT_1' + stderr match.
export function isRateLimited(result) {
  if (!result || result.ok !== false) return false;
  const code = String(result.code ?? '').toLowerCase();
  if (code === 'rate_limited' || code === '429') return true;
  const stderr = String(result.stderr ?? '').toLowerCase();
  if (stderr.includes('rate limit') || stderr.includes('rate_limited') || stderr.includes('too many requests')) {
    return true;
  }
  return false;
}

export function isDailyQuotaExceeded(result) {
  if (!result || result.ok !== false) return false;
  const code = String(result.code ?? '');
  if (code.toUpperCase() === 'DAILY_QUOTA_EXCEEDED') return true;
  const haystack = [
    result.message,
    result.stderr,
    result.stdout,
    result.detail,
  ].filter(Boolean).join('\n');
  return DAILY_OBSERVABILITY_LIMIT_RE.test(haystack);
}

export function setDailyQuotaBlocked(result, nowMs = Date.now()) {
  dailyQuotaBlock = {
    untilMs: utcMidnightAfter(nowMs),
    originalCode: result?.code ?? null,
    message: result?.message || result?.stderr || 'Daily Observability query limit reached.',
  };
  return dailyQuotaBlock;
}

export function getDailyQuotaBlock(nowMs = Date.now()) {
  if (!dailyQuotaBlock) return null;
  if (dailyQuotaBlock.untilMs <= nowMs) {
    dailyQuotaBlock = null;
    return null;
  }
  return dailyQuotaBlock;
}

export function utcMidnightAfter(nowMs) {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

function dailyQuotaResult(block, sourceResult = null) {
  return {
    ...(sourceResult && typeof sourceResult === 'object' ? sourceResult : {}),
    ok: false,
    code: 'DAILY_QUOTA_EXCEEDED',
    message: block.message,
    cachedUntil: new Date(block.untilMs).toISOString(),
    originalCode: sourceResult?.originalCode ?? sourceResult?.code ?? block.originalCode ?? undefined,
  };
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
