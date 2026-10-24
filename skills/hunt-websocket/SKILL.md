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
report_count: 0
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

## When to Use

Review WebSocket handshake, message authorization and protocol state in an explicitly authorized application or isolated lab. No runtime, scanner, report corpus or Burp MCP tool is bundled; report_count0 means no bundled reports, not an empirical finding count. Upstream attribution is retained.

## Mandatory confirmation gate

Before any endpoint probe, connection, authentication attempt, message, replay, browser PoC, callback or configuration change, obtain the exact target/accounts, written owner permission, allowed techniques and request/time/connection/cost limits. Present the exact operation and expected effects and wait for explicit confirmation in this conversation. Without it, inspect supplied source/captures only.

Use two owner-controlled synthetic accounts/tenants and a disposable canary object. Do not read real victim data, delete users, place real trades/payments, steal tokens, capture other users' requests or send payloads to third parties. A permitted read request can still create server state or load. Stop on unexpected sensitive data or scope.

## 1. Inventory and transport evidence

Read supplied client/server code or approved captures for exact endpoints, path, protocol, authentication, Origin, cookies, subprotocols and frame schemas. Restrict any discovery to the named scope; no port scans or broad crawling by default. Raw URLs/frames can include tokens and personal content, so store privately and redact reports.

A standards-style WebSocket upgrade uses GET; curl -I sends HEAD and cannot be relied on as a normal handshake test. HTTP101 means a protocol upgrade, not authenticated data access. Engine.IO EIO=4 identifies a protocol version, not the exact Socket.IO package release. Resolve installed versions from manifests/lockfiles and verify actual advisories; a recognizable endpoint alone does not prove a CVE.

## 2. Cross-site WebSocket hijacking

Trace whether a browser on an untrusted origin can automatically supply the target authentication and perform a protected action or receive a synthetic private canary. Cookie SameSite/Secure policy, browser behavior, origin validation and application-level authentication all affect this. A token's presence does not automatically prevent hijacking: verify unpredictability, binding, validation, exposure and whether an attacker can obtain/reuse it. A token in a URL may leak in logs.

A CLI client can set Origin/Cookie headers, so it cannot alone prove the real browser threat model. Use an authorized owner-lab browser test with the target's actual cookie/session policy. Compare a permitted origin with one owner-controlled foreign origin and an unauthenticated control. Record only the canary identifier or a pass/fail boundary observation, not frame contents or secrets. No OAST exfiltration is required; an approved local browser recording/server log can prove receipt. Callback source IP alone does not establish identity or impact.

## 3. Per-message and lifecycle authorization

A connection may authenticate once, but each sensitive action/object/room needs effective authorization and schema checks. Inspect tenant ownership, server-derived prices/roles, state prerequisites, session expiry/revocation and logout behavior on existing sockets. Static permissions can be cached appropriately if revocation and resource changes are handled; redoing login on every frame is not the requirement.

For the approved synthetic test, use one harmless read/subscription to an owner canary. Compare same-tenant allowed versus other-tenant denied behavior, and confirm by an independent owner-side observation. An accepted frame, success acknowledgement or optimistic echo is not proof of access or persistence. Replay tests use a nonfinancial sandbox action with explicit idempotency/freshness expectations; do not assume every signed message must be single-use.

## 4. Socket.IO, SignalR and Phoenix

Use the exact protocol/client version, heartbeat and transport lifecycle. Socket.IO namespaces and application rooms are different controls; a namespace acknowledgement does not prove access to a privileged room. E.g., Engine.IO message4 wrapping Socket.IO connect0 can produce `40/admin,` for a compatible protocol, while event2 produces a42 prefix. These historical wire examples are not a complete client, do not establish authorization and do not apply unchanged to SignalR or Phoenix. Review actual join/subscribe/method handlers and obtain the canary only through the approved synthetic accounts.

## 5. Parser, proxy and resource limits

Inspect bounded message size, decompression, parsing, connection count, per-principal/action rate budgets, idle timeout, backpressure and cleanup. HTTP429 is not a mandatory WebSocket throttling signal; the application may reject frames or close connections. Receiving no429 does not prove no control. Do not send hundreds of frames/second, trigger ReDoS or exhaust connections to test a checklist. Any load test needs a separate owner-approved lab budget and abort threshold.

Upgrade-related smuggling depends on a specific proxy/origin disagreement. A malformed handshake response or delay alone is insufficient. Correctly framed established WebSocket traffic is not ordinarily reparsed as HTTP, but broken upgrade/tunneling components require exact implementation evidence. Investigate only in an isolated owner stack with synthetic downstream requests and no shared users/caches. Do not poison public caches or capture another user's traffic as a proof requirement.

## Example: two synthetic tenants

```text
Scope: disposable owner lab, two test tenantsA/B, one canary notification.
Allowed operation: one subscription attempt under each explicitly approved identity.
Control: tenantA receives only its own canary; tenantB must not receive it.
Evidence: actual browser-origin/session conditions, request/job identifier and redacted result.
Status: record observed allowed/denied/unknown; no live result is asserted here.
```

## Reporting and remediation

Report immutable scope/versions, actual authentication model, browser/protocol preconditions, source-to-action trace, synthetic control and observed boundary, redacted evidence and uncertainty. Severity depends on actual privileges and impact; token strings, HTTP101, namespace ack and an automatic Critical label are not impact proof.

Propose exact Origin allowlisting where appropriate, session/token checks, per-resource authorization, schema/size validation, revocation, idempotency, budgets and logging redaction. Origin is useful against browser cross-site attacks but is forgeable by nonbrowser clients and never replaces authentication. Retest the same fixture against the exact fixed head.

## Limitations

No browser, target, provider, tool or historical case has been tested here. Verify current protocol and vendor documentation for the pinned versions. External reporting, hosting a PoC, installing tools and target changes require actual user authority. Optional companion skill names are not bundled runtime dependencies or evidence.
