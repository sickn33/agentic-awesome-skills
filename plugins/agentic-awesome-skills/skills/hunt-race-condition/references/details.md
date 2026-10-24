# Race-condition synchronization — technical boundaries

Read the root skill's scope and confirmation gate before any active test. Prefer
provided labs, tester-owned accounts, synthetic balances and an agreed concurrency
budget. Never escalate to thousands of requests merely because a paper did so.

## Primary research

- [PortSwigger, Smashing the state machine (2023)](https://portswigger.net/research/smashing-the-state-machine)
- [Flatt Security, First Sequence Sync (2024)](https://flatt.tech/research/posts/beyond-the-limit-expanding-single-packet-race-condition-with-first-sequence-sync/)

Single-packet synchronization reduces network jitter by completing several HTTP/2
streams together. It does not guarantee simultaneous application dispatch or prove
a vulnerability. HTTP/2 multiplexing alone does not guarantee a single TLS record,
TCP segment or IP packet. Last-byte synchronization and HTTP/2 single-packet
techniques must not be conflated with HTTP request smuggling (`h2.cl`).

The Flatt extension uses fragmentation and TCP sequence reordering, not synchronized
initial sequence numbers across independently established connections. Its published
10,000-request result is a research demonstration, not a default testing budget.

## Validation

Use the tool's documented synchronized-send mode for the installed version. If
using a Turbo Intruder gate, queue every request with the same explicit gate name
before opening that gate. A background curl loop or `curl --next` alone does not
provide this synchronization; `--next` separates transfers rather than making them
parallel. HTTP/1.1 last-byte synchronization is a separate technique.

Response latency cannot measure the internal check-to-write interval. Similar
response times, headers, framework choice, or multiple 2xx replies are leads only.
Verify the committed invariant using application state, transaction logs or harmless
readback. A database constraint error may show a successful defense rather than a
successful exploit. Stop once sufficient evidence exists; avoid repeated financial,
account, notification or deletion side effects.

Packet capture can help debug synchronization on an approved interface. Encrypted
TLS captures do not expose HTTP/2 frames without authorized decryption material.
Protect captures and keys; they can contain credentials and personal data. A
particular packet shape is not mandatory proof of business impact.

## Defensive review

Trace reads, writes, database constraints and external side effects. Verify transaction
boundaries, isolation, idempotency-key uniqueness and retries. A unique constraint is
checked as part of database write/commit semantics; it is not generally bypassed by
racing two inserts. Test failure rollback and side-effect coordination in staging.
Report impact and observed reliability without arbitrary payout, timing or severity
thresholds. Distinguish an unconfirmed hypothesis from a reproduced invariant failure.
