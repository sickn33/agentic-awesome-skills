# Details (moved from SKILL.md)

> Extended reference content for `hunt-race-condition`, kept under `references/` so the entrypoint stays within the audit budget.

## HTTP/2 Single-Packet Attack — Deep Reference

The single-packet attack is the most important race-condition technique published since 2020. It collapses the race window from "tens of milliseconds with TCP-handshake jitter" to "the time the server's worker pool takes to dispatch N pre-buffered requests" — typically **under 1 ms** for the entire batch. This is what makes modern race exploits viable against rate-limited, distributed, load-balanced backends that previously seemed un-race-able.

Original research: **James Kettle, PortSwigger — "Smashing the State Machine" (DEF CON 31, August 2023)** [portswigger.net/research/smashing-the-state-machine](https://portswigger.net/research/smashing-the-state-machine). 2024 extension: **RyotaK / Flatt Security — "Beyond the Limit: Expanding Single-Packet Race Condition with First Sequence Sync"** [flatt.tech/research/posts/beyond-the-limit-expanding-single-packet-race-condition-with-first-sequence-sync/](https://flatt.tech/research/posts/beyond-the-limit-expanding-single-packet-race-condition-with-first-sequence-sync/).

### Why it works — architecture

A race exploit fails for two reasons that look like the same problem but aren't:
1. **Network jitter** — N requests sent sequentially over the same TCP connection arrive at the server with 0.5–5 ms spread, depending on RTT and congestion.
2. **Server-side dispatch ordering** — even if all N requests arrive in the same millisecond, the worker pool may serialise them via a load balancer or accept-queue.

The single-packet attack solves (1) by exploiting two protocol-level facts about HTTP/2:

- HTTP/2 multiplexes N requests over ONE TCP connection as ONE TLS record per request batch.
- TLS records can carry multiple HTTP/2 `HEADERS` frames, and each HEADERS frame can be the last frame of a separate stream.

So if you pre-stage N requests on a single HTTP/2 connection — **send all the HEADERS frames except the very last byte of each, then release all the final bytes in a single TCP write** — the TCP stack ships them in **one IP packet** (assuming < MTU, ~1500 bytes). The server's kernel hands all N requests to the HTTP/2 parser in the same scheduler tick. The race window is no longer the network — it's the application's own atomicity-failure window.

For (2) — server-side dispatch ordering — Kettle showed that modern backends (Node.js, Go, async Python) dispatch concurrently within microseconds when handed a packet of N pre-parsed requests. Older blocking backends (default Apache prefork, single-threaded PHP-FPM) serialise even with single-packet delivery; for those, the technique helps less but still wins over TCP-stream sequencing.

### Last-byte-sync technique

The exact mechanic Kettle documented:

1. Open one HTTP/2 connection. Negotiate TLS, send the SETTINGS frame, accept the server's.
2. For each of N requests, send its `HEADERS` frame **with the END_HEADERS flag** and a `DATA` frame containing **all but the last byte of the body**. Do NOT set END_STREAM yet.
3. The server cannot dispatch the request because END_STREAM hasn't fired — it's waiting for one more byte.
4. Repeat (2) for all N requests on the same connection. Each is now buffered at the server, parsed up to "almost done".
5. **In a single TCP write, send N tiny `DATA` frames each carrying 1 byte with END_STREAM set.** TCP coalesces them into one outbound segment. The server's HTTP/2 parser sees END_STREAM on all N streams in the same scheduler tick.
6. Server dispatches N requests to N workers in microseconds.

The race window equals the time between worker N's `SELECT ... FOR UPDATE` and worker N+1's same query — typically nanoseconds when the workers run on the same CPU.

### Wireshark validation

To confirm your attack tool is genuinely producing one-packet sync (vs accidentally fragmenting):

1. Capture the loopback or your egress interface during the attack: `sudo tcpdump -i lo0 -w race.pcap port 443` (or interface 0).
2. Open in Wireshark, filter `tls and tcp.port == 443`.
3. Find the TLS record containing the END_STREAM flush. It should contain **N H2 DATA frames with END_STREAM set, in one TLS record, in one TCP segment.**
4. If you see N TLS records or N TCP segments, your tool is sequencing. The race window is your inter-segment gap — typically too wide.

The Turbo Intruder `engine=Engine.BURP2` implementation guarantees single-packet delivery on HTTP/2 targets when the request body fits in MTU. For larger bodies, see the "Race-window estimation" subsection below.

### h2.0 single-frame vs h2.cl multi-frame race

Two variants depending on what protocol the target speaks:

- **h2.0 single-frame** (the standard Kettle attack): pure HTTP/2 end-to-end. N requests in one TLS record. Works against any modern HTTPS-fronted target where the front-end advertises `h2` in ALPN. **Default approach.**
- **h2.cl multi-frame**: front-end speaks HTTP/2 to the client, downgrades to HTTP/1.1 to the back-end. Smuggling-adjacent — you craft an HTTP/2 request whose `Content-Length` confuses the front-end into emitting two HTTP/1.1 requests to the back-end on the same connection. Pairs with HTTP request smuggling (see `hunt-http-smuggling`). Useful when single-packet HTTP/2 is filtered at the front-end but the back-end is reachable in HTTP/1.1.

Detect h2.0 viability via `curl -sI --http2 https://target.com | grep -i HTTP/2`. If the server doesn't speak h2, single-packet is not directly applicable — fall back to "parallel-pipelining" over HTTP/1.1 (much wider race window; usually loses the race against modern backends, but still useful for naive ones).

### Race-window estimation methodology

Before firing the attack, estimate the race window. This determines whether you need single-packet at all, and how many concurrent requests to send.

1. Issue a **single** request to the target endpoint. Capture the response time on the wire: `T_single`.
2. Issue **two sequential** requests. Capture both response times: `T_seq1`, `T_seq2`.
3. Issue **two concurrent** requests over the same connection (via HTTP/2 multiplex or HTTP/1.1 pipeline). Capture both: `T_par1`, `T_par2`.
4. If `T_par1 ≈ T_par2 ≈ T_single`, the server handles both in parallel — race window is `min(T_par1, T_par2)`, single-packet helps a lot.
5. If `T_par2 ≈ T_par1 + T_single`, the server serialises — race window is whatever happens between sequential workers; single-packet helps less but still wins over TCP jitter.
6. For PIN / OTP / coupon-redemption endpoints, expect `T_single` to be 10–100 ms (DB query latency). The race window inside the server is typically < 1 ms (the gap between `SELECT` and `UPDATE` on the same row).
7. **N rule of thumb:** start with `N = 30` concurrent requests for single-packet h2. Increase to 100+ if the target's `T_single` is < 10 ms (very fast endpoint = larger pre-buffer needed to overflow the worker pool). Up to **10,000** with Flatt's first-sequence-sync extension (see below).

### Single-connection-multi-stream vs Multi-connection-single-stream

A decision tree for picking the right shape:

- **Single connection, N streams** (default Kettle / Turbo Intruder BURP2 engine): N concurrent HTTP/2 streams on one TCP connection. **Use when:** target speaks HTTP/2; request body fits in MTU (~1400 bytes after TLS overhead); you need N ≤ ~30.
- **Multiple connections, one stream each** (older parallel HTTP/1.1): N TCP connections, one request per connection. **Use when:** target doesn't speak HTTP/2 OR the request body is large (> MTU). Race window widens significantly (5–50 ms TCP-handshake spread) — only viable on slow servers.
- **Multiple connections, multiple streams** (Flatt's first-sequence-sync, 2024): N TCP connections each carrying M streams. Total = N×M requests. Uses synchronized TCP first-sequence numbers across multiple connections to land all packets at the server in the same processing window. **Use when:** you need N > 30 (e.g., brute-forcing a 6-digit PIN within a 5-attempt rate-limit window — Flatt demonstrated 10,000 requests in 166 ms by splitting across IP fragments with synchronized SEQ numbers).

### Turbo Intruder `Engine.BURP2` template — explained

```python
def queueRequests(target, wordlists):
    # 1. Engine.BURP2 = HTTP/2 single-packet engine; provides the last-byte-sync primitive.
    engine = RequestEngine(
        endpoint=target.endpoint,
        concurrentConnections=1,          # 2. One TCP connection, multiplexing all streams.
        requestsPerConnection=100,        # 3. Up to 100 concurrent H2 streams. >30 needs Flatt-extension.
        engine=Engine.BURP2,              # 4. THE critical line — selects the single-packet engine.
        pipeline=False,                   # 5. Pipelining is for HTTP/1.1; irrelevant on H2.
    )

    # 6. Build N requests. Each is identical here — racing the same endpoint.
    #    For PIN brute-force, vary the body across requests.
    for i in range(30):
        engine.queue(target.req)

    # 7. openGate(...).complete(...) is the API call that performs last-byte-sync:
    #    - Buffer all 30 requests up to "last byte not sent"
    #    - Release all final bytes in a single TCP write
    #    - openGate returns immediately; complete waits for all responses.
    engine.openGate("race1")
    engine.complete(timeout=10)
```

The `Engine.BURP2` import does the heavy lifting. Behind the scenes:
- Each `engine.queue(req)` adds a HEADERS frame to the connection's send buffer but withholds the last DATA frame byte.
- `openGate("race1")` blocks until all 30 are buffered, then issues a single `socket.send(...)` containing 30 × 1-byte DATA frames with END_STREAM. All 30 cross the wire in one IP packet (assuming < MTU).
- `complete(timeout=10)` collects responses and times.

Inspect each response object: `req.code`, `req.length`, `req.time`. The race is "won" when at least 2 requests return a success that should logically have been mutually exclusive (e.g., both coupon-applies succeed when the redemption limit was 1).

### Flatt's first-sequence-sync extension (when N > 30 is needed)

Kettle's original single-packet caps at roughly N=30 due to MTU + TLS record limits. Flatt Security's RyotaK published the extension in August 2024:

- Take advantage of IP fragmentation: a single "logical" packet at the IP layer can be split across multiple physical IP fragments.
- Force synchronized TCP SEQ numbers across multiple connections by completing the TLS handshakes in lockstep and aligning the SYN/SYN-ACK timing.
- Result: 10,000 concurrent requests delivered to the server in 166 ms, all landing inside a rate-limit window that the server thought was atomic.

Use case: brute-forcing 6-digit PINs (max 10^6 candidates) inside a 5-attempts-per-window cap. Without first-sequence-sync, you'd need ~200,000 windows. With it, ~100 windows.

Implementation: [flatt.tech/research/posts/beyond-the-limit-...](https://flatt.tech/research/posts/beyond-the-limit-expanding-single-packet-race-condition-with-first-sequence-sync/) includes a working PoC.

### Operator playbook (when to reach for what)

| Scenario | Tool / variant |
|---|---|
| Modern HTTPS target, ALPN advertises `h2`, body < 1400 bytes, need N ≤ 30 | Turbo Intruder `Engine.BURP2` single-packet — **default** |
| Same as above but body > MTU | Multi-connection HTTP/2; widen window estimate by ~5 ms |
| Target speaks HTTP/1.1 only (no h2 ALPN) | `curl --next` parallel pipeline; race window is wide; only viable on slow servers |
| Need N > 30 (PIN brute-force, OTP exhaustion within rate-limit window) | Flatt first-sequence-sync extension; manual implementation per the writeup |
| Front-end h2, back-end h1 (CDN+origin) | h2.cl smuggling variant — pairs with `hunt-http-smuggling` |
| Quick reproducibility test on a single endpoint | `curl --next --next --next --next` (4-shot parallel HTTP/1.1) — wide window but no setup |

### Anti-patterns

- **Don't claim "race condition" from observing two near-simultaneous successes in Burp Repeater "Send group in parallel" mode** — that mode pipelines over HTTP/1.1 with millisecond-spread, not single-packet. Triagers know this and downgrade.
- **Don't submit without Wireshark confirmation** for high-value race claims. The deliverable that pays best: PoC video showing Turbo Intruder firing + Wireshark capture showing all N END_STREAM frames in one TCP segment + N successful responses that should have been mutually exclusive.
- **Don't use single-packet against endpoints that genuinely don't race** (e.g., endpoints with row-level locks and transactions). The window estimation step exists to filter these out before you spend 2 hours building the PoC.

### Cross-references

- `hunt-http-smuggling` — h2.cl multi-frame variant
- `hunt-mfa-bypass` — OTP rate-limit window single-packet bypass (Flatt PIN-bruteforce class)
- `hunt-business-logic` — coupon / wallet / promo state-machine races where single-packet is the enabling primitive
- Disclosed Report Citations above — citations #4, #11, #12 are the canonical single-packet exemplars (GitLab/Devise CVE-2022-4037, Flatt 10k-req PIN brute-force, nopCommerce CVE-2024-58248)

---


## Related Skills & Chains

- **`hunt-business-logic`** — Race conditions are the "concurrency arm" of every business-logic state machine. Chain primitive: business logic (coupon/promo) + race-condition single-packet attack → coupon redeemed N times → direct financial loss.
- **`hunt-mfa-bypass`** — OTP-expiry windows and replay protection are classic race targets. Chain primitive: race + MFA-validate endpoint → bypass OTP expiry by submitting N concurrent validations within the validity window.
- **`hunt-ato`** — Race conditions on password reset, email change, and account creation enable persistent ATO. Chain primitive: race on email-change endpoint + atomic-update missing → swap victim email + read reset token before user notice.
- **`hunt-api-misconfig`** — Wallet/balance/credit endpoints without atomic UPDATE are double-spend candidates. Chain primitive: race + atomic-update missing → double-spend balance → withdraw N× user balance.
- **`security-arsenal`** — Load the Turbo Intruder single-packet template, h2.cl smuggling for atomic submit, and `curl --next` parallel multi-request patterns.
- **`triage-validation`** — Apply the Statistical-Sampling gate: a single anomalous response is noise; require 1 successful + N duplicate / over-quota / stale-state demonstrations with response screenshots before reporting.

