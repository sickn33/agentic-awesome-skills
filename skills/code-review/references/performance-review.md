# Sub-case: performance review

A specialisation of the parent engine. The anchor changes; the refutation discipline and the report
contract do not.

**Anchor:** workload → resource demand → growth or contention → material consequence.

The agreement being tested is between what the code *assumes about its workload* and what the
workload *will actually be*. Code written against seed data agrees with a world that will not exist
in production. That is the same shape as any other broken agreement: two participants, each
reasonable alone.

## The universal core

Language- and stack-agnostic. Apply before any technology-specific checklist.

- **Repeated work** — scans, parsing, serialisation, allocation, initialisation or I/O performed
  again where a single pass, a hoist or a reuse would do.
- **Growth relationships** — how does resource use scale with input size, with concurrency, and with
  elapsed time? Superlinear growth in any of the three is the finding; the constant factor is not.
- **Retention** — queues, buffers, caches and collections that grow without a bound, an eviction
  policy or backpressure. Unbounded retention is a failure with a delay on it.
- **Copying and conversion** — data copied or converted between representations on a hot path,
  especially at a boundary where both sides could have agreed on one representation.
- **Serialisation and contention** — lock duration and scope, single-threaded chokepoints,
  head-of-line blocking, and work held inside a critical section that did not need to be.
- **Amplification** — retries, polling, fan-out and cache misses that multiply one logical request
  into many real ones. Check the multiplier under failure, not under success.

## Technology specialisations

Apply only where the underlying technology exists — do not report the absence of a database concept
in a program that has no database. For data-backed applications (over-fetching, `SELECT *`, missing
pagination, index definitions, caching layers), the `performance-audit-static` skill holds the detailed
checklist; use it rather than restating it here.

## What makes a performance finding

All three, or it is not a finding:

1. **A reachable workload** — the input size, rate or concurrency is one the system will actually
   meet, established from the code and its context rather than assumed.
2. **A resource cost or growth relationship** — what is consumed, and how it scales.
3. **A material consequence** — latency a user feels, a cost that is paid, a limit that is hit, or a
   failure that results.

## Refutation

Refute against real bounds, amortisation, reuse, actual call frequency, and deliberate trade-offs. A
nested loop over a collection with a hard bound of four is not a finding. A missing cache in code
called once at startup is not a finding.

**Distinguish measurement from static deduction, and label which you did.** Never invent a timing.
Never report absent caching, a nested loop, or a missing index as a finding on its own — without a
workload, those are observations, not defects.
