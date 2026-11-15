// Complete implementation of condition-based waiting utilities
// From: Lace test infrastructure improvements (2025-10-03)
// Context: Fixed 15 flaky tests by replacing arbitrary timeouts

import type { ThreadManager } from '~/threads/thread-manager';
import type { LaceEvent, LaceEventType } from '~/threads/types';

// Requires the source project's Lace interfaces. Polling reads must be synchronous.
// Bounds cannot interrupt a blocking getter; rejected getters stop without another timer.
async function poll<T>(read: () => T | undefined, description: string, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new Error('Invalid timeout');
  const deadline = performance.now() + timeoutMs;
  while (true) {
    const value = read();
    if (value !== undefined) return value;
    if (performance.now() >= deadline) throw new Error(`Timeout waiting for ${description}`);
    await new Promise<void>(resolve => setTimeout(resolve, 10));
  }
}

export function waitForEvent(manager: ThreadManager, threadId: string,
  eventType: LaceEventType, timeoutMs = 5000): Promise<LaceEvent> {
  return poll(() => manager.getEvents(threadId).find(event => event.type === eventType),
    eventType, timeoutMs);
}

export function waitForEventCount(manager: ThreadManager, threadId: string,
  eventType: LaceEventType, count: number, timeoutMs = 5000): Promise<LaceEvent[]> {
  if (!Number.isInteger(count) || count < 1) return Promise.reject(new Error('Invalid count'));
  return poll(() => {
    const events = manager.getEvents(threadId).filter(event => event.type === eventType);
    return events.length >= count ? events : undefined;
  }, `${count} ${eventType} events`, timeoutMs);
}

export function waitForEventMatch(manager: ThreadManager, threadId: string,
  predicate: (event: LaceEvent) => boolean, description: string,
  timeoutMs = 5000): Promise<LaceEvent> {
  return poll(() => manager.getEvents(threadId).find(predicate), description, timeoutMs);
}

// Scope observations to the current thread/request and await the actual tool events
// before cancelling or asserting. Historical source outcomes (15 repaired cases,
// 60% to 100% observed pass rate) are not a guarantee for other tests.
