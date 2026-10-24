---
name: mid-engagement-ir-detection
description: Methodology for detecting client SOC patches, attacker activity, and
  security-state changes that occur DURING a red-team engagement
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Process guidance; no tooling required. Docs-only; upstream templates
  not bundled.
sources: authorized-engagement
report_count: 1
---

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

## Mandatory confirmation gate

Before any probe, evasion, source-IP change or credential-related request, collect the exact target URL, IP, account, or resource, written authorization and permitted scope; show the exact command and expected effect. Wait for explicit confirmation in the current conversation. Otherwise review existing evidence only. Unexpected blocks/lockouts trigger the engagement stop/contact procedure, not automatic evasion. Bound requests, account attempts, timing and cost; never test unrelated accounts or change tenant policies.

## When to use this skill

Trigger when:
- Running active testing against a target with active SOC monitoring
- A confirmed-vulnerable finding stops reproducing on recheck
- Baseline timing shifts unexpectedly (3× slower, sudden errors, new headers)
- Response sizes change between test windows
- New WAF cookies or headers appear that weren't there at session start
- Lockout / error rates change between test windows (especially LOCKED count for credential attacks)
- Engagement is "assume breach" or "white box" — client knows you're testing

DO NOT use for:
- Any program whose authorization excludes the proposed observation/probe; bug-bounty programs can also have active SOC monitoring
- Pure recon (no state-change happening)
- One-off vulnerability scanning (no temporal dimension)

---

## The core insight

In a real red-team engagement against a competent SOC, the security state of the target is **not static**. It changes during your test in response to your traffic. These state changes are:

1. **Themselves valuable findings** (positive operational observations about IR responsiveness)
2. **Contextual evidence** (a response change alone proves neither a patch nor the original vulnerability)
3. **Classification signals** (WAF rule deployment vs code fix — different remediation depth)

Anti-pattern: treating reproduction failure as evidence the original signal was a false positive. Preserve original artifacts, then independently assess whether they actually established the vulnerability; label uncertain signals honestly.

---

## The discipline — capture before, diff after

### Before any active test:

```text
# Pseudocode only; placeholders are not runnable Python.
# Capture pre-test fingerprint of the target
fingerprint = {
    "ts_pre": time.time(),
    "ip_seen": "<operator-src-ip>",
    "baseline_response_time_ms": <measure>,
    "baseline_response_size_bytes": <measure>,
    "response_headers": <capture set>,
    "waf_cookies": <list>,
    "lockout_count_in_state": <count from o365_attempts.json>,
}
```

Persist to `engagement_log/fingerprint_pre.json`.

### During the test:

Log every test result with full context (timestamp, IP, payload, response code, response size, response time, headers if relevant) to JSONL append-only.

### After the test session OR on first failed-recheck:

```text
# Pseudocode only.
fingerprint_post = same structure
delta = {
    "baseline_time_change_ms": post.time - pre.time,
    "baseline_size_change_bytes": post.size - pre.size,
    "new_headers_appeared": post.headers - pre.headers,
    "new_waf_cookies": post.cookies - pre.cookies,
    "new_lockouts": post.locked_count - pre.locked_count,
}
```

If a delta is significant, investigate alternative explanations and update confidence; neither retain nor retract a finding automatically.

---

## The three primary IR observations

### Observation 1 — Mid-engagement WAF rule deployment

**Symptoms:**
- Original payloads return identical response → no signal at all on recheck
- Body size identical to baseline (login page reflection)
- Timing reverts to baseline regardless of payload
- New cookie or header in responses (e.g., `cf-bm`, `__cf_bm`, `awselb`)
- Specific keyword in URL/body now triggers different response code (403, 406, 429)

**Confirmation:** retry with WAF-evasion variants:
- URL-encode the payload differently (`%27` vs `%5cu0027`)
- Change request method (POST → PUT, GET → POST)
- Different content-type (form-urlencoded → multipart)
- Slower pace (5s → 60s between requests)
- Mixed-case keywords (`SLEEP` → `SlEeP`)

If WAF-evasion variants restore the signal, the mitigation is at the WAF layer (bypassable).

A failed variant does not identify a code fix. WAF/origin/cache/session/backend changes require owner logs, configuration or code evidence to distinguish.

**Finding template:**
```
Subject: Mid-engagement mitigation deployed for <vulnerability X>
Observation: At engagement timestamp T0, vulnerability <X> on <endpoint> was
confirmed via <PoC>. At T0+<minutes>, recheck via the original payload no longer
reproduces the timing/error/size differential. <WAF-evasion variant> [does/does
not] restore the signal.

Description: This pattern is consistent with the client SOC observing engagement
traffic and deploying a mitigation in real time. Mitigation depth assessment:
[observed bypass under stated conditions] vs [layer/depth unknown pending owner evidence].

Impact (positive): Only claim SOC detection/mitigation timing when owner telemetry confirms the detection and change events; response timing alone is not that evidence.

Impact (caveat): The original vulnerability did exist and was exploitable for at
least the engagement window before mitigation. If the mitigation is at the WAF
layer only, the underlying code-level flaw remains exploitable via alternative
payloads.

Recommendation:
1. Verify the mitigation is in code (parameterized queries, input sanitization),
   not just at the WAF layer.
2. Audit the codebase for the same root cause across sister applications.
3. (Positive) Document the IR responsiveness as a capability metric.
```

### Observation 2 — Possible concurrent activity or authentication policy change

`AADSTS50053` can reflect account lockout or a malicious-source-IP block, irrespective of password validity. Defaults vary across cloud environments and tenant settings. Prior failures, familiar/unfamiliar-location counters, legitimate users, federated/pass-through behavior and the engagement itself can contribute. One logged attempt per user does **not** mathematically exclude tester contribution or prove an external actor.

Stop credential probes at the agreed threshold and coordinate with the authorized SOC contact. Review existing owner-provided sign-in logs, actual failure reasons, source identities/IPs, correlation IDs, timestamps and tenant policies. Compare against the tester's complete request journal and approved baseline. Alphabetic clustering or a rising response-code count is a hypothesis, not attribution. Do not probe service mailboxes to “confirm” a live attacker or assume they are MFA-exempt.

Report observed counts separately from unique principals and actual lockout events. Preserve unknown causes and benign alternatives. Password resets, geo-blocking, risk-policy changes or tenant-wide containment belong to the authorized incident commander after impact review, not an automatic24-hour checklist.

Example report:
```text
Observation: N responses contained50053 during [UTC window] from approved sourceX.
Known: owner logs identify [documented failure reason]; tester journal covers [scope].
Unknown: attribution and whether the response change resulted from a mitigation.
Next: authorized SOC correlates existing identity/network telemetry and decides response.
```

### Observation 3 — Detection-induced rate limiting / IP blocks

**Symptoms:**
- Specific IP starts returning 403 / 429 / 451 after a window of normal responses
- Specific IP starts seeing dramatically slower responses (3x+ baseline)
- TLS handshake fails or RST mid-connection
- DNS suddenly returns NXDOMAIN for hosts that resolved before
- Some hosts work from one IP but not another

**Confirmation:**
- Compare already authorized source observations; do not rotate around a block unless the engagement owner explicitly approves that exact action
- Compare DNS answers/TTL with resolver/cache/routing controls; a TTL change alone does not prove mitigation
- Check `Server:`, `Via:`, `CF-Cache-Status:` headers for CDN-introduced limits

**Finding template (operational note, usually low/info severity):**
```
Subject: Engagement traffic detected — IP <X> rate-limited at <timestamp>

Observation: After ~<N> requests in <window> from IP <X>, target <hostname>
began returning <code> for all subsequent requests. Rotation to IP <Y>
restored normal responses.

Description: Active anti-automation control at the perimeter (CDN/WAF/origin).

Impact (positive): Volumetric anti-automation is functional.

Impact (caveat): A permitted alternate-source observation may show a scope limitation; it does not establish universal bypass, attacker cost or complete control failure.
```

---

## State diff — the key technique

Maintain three pieces of state:

### 1. `engagement_log/baseline.json` — captured at session start

```json
{
  "ts": "2026-05-08T13:00:00",
  "source_ip": "<operator-src-ip>",
  "targets": {
    "https://target.example.com/login": {
      "baseline_response_time_ms": 584,
      "baseline_response_size_bytes": 11966,
      "headers_seen": ["Server: Apache", "X-Powered-By: PHP/8.0.26"],
      "set_cookie_names": ["PHPSESSID"]
    }
  },
  "m365": {
    "lockout_count": 247,
    "valid_creds_count": 0
  }
}
```

### 2. `engagement_log/journal.jsonl` — append-only test log

Every test logs:
```jsonl
{"ts":"...","ip":"...","tool":"...","target":"...","payload":"...","resp_code":...,"resp_size":...,"resp_ms":...,"verdict":"...","notes":"..."}
```

### 3. `engagement_log/state_changes.jsonl` — observed deltas

When a state change is detected, append:
```jsonl
{"ts_observed":"2026-05-08T14:30:00","change_type":"baseline_time_shift","target":"https://<employee-app-host>/<app>/login.php","baseline_pre_ms":24412,"baseline_post_ms":90403,"interpretation":"likely WAF rule deployed","actions_taken":["tested WAF-evasion variants — no signal restoration","documented as IR-mitigation finding"]}
```

This third file is your finding evidence. Every entry is a candidate finding.

---

## Tooling — automated state-change detection

```bash
# Bash watcher — runs every 5 min during engagement, alerts on shifts

cd "$ENGAGEMENT_DIR"

# Re-measure baseline timing on key targets
for target in "$@"; do
  ms=$(curl -sS -o /dev/null -w "%{time_total}" "$target" --max-time 30)
  ms_int=$(echo "$ms * 1000" | bc | cut -d. -f1)
  echo "$(date -u +%FT%TZ) $target $ms_int" >> baseline_history.log
done

# Diff against pre-session baseline
python3 - << 'PY'
import json, time
baseline = json.load(open("engagement_log/baseline.json"))
for line in open("baseline_history.log"):
    parts = line.strip().split()
    ts, target, ms = parts[0], parts[1], int(parts[2])
    if target in baseline["targets"]:
        pre = baseline["targets"][target]["baseline_response_time_ms"]
        if abs(ms - pre) > pre * 0.5:  # >50% shift
            print(f"ALERT {ts} {target} time {pre} -> {ms}")
PY
```

For lockout-count tracking on M365:
```bash
# Run every 30 min during M365 spray
LOCK_COUNT=$(grep -c '"AADSTS50053"' engagement_log/o365_results.jsonl)
echo "$(date -u +%FT%TZ) lockout_count $LOCK_COUNT" >> lockout_history.log
# Diff first vs last to surface delta
```

---

## The "single signal recanted" rule

If a confirmed-vulnerable finding stops reproducing:

1. **DO NOT delete the original PoC.** Preserve restricted/redacted evidence according to agreed retention; do not retain sensitive payloads indefinitely.
2. **Capture the new state in detail.** What's the recheck response? What's different?
3. Reassess original evidence and authorized scope. Stop or request owner correlation; do not require additional attack vectors when limits or uncertainty call for stopping.
4. If no reproduction is available, report exactly what was confirmed atT0 and what changed; keep mitigation cause/depth unknown until independently established.
5. **Both states go in the report.** The original finding + the IR observation.

This is the discipline that distinguishes professional red team from "hobbyist scanning". Your client wants the timeline of vulnerability + mitigation, not just the static state.

---

## Owner Correlation Before Causal Claims

The following narrative applies only when original impact and owner detection/change events have been independently confirmed. A before/after response difference alone cannot establish any of these claims.

## Why confirmed evidence can be useful

When you tell a client "I confirmed SQLi at 14:24, you deployed a mitigation by 14:55, here's the original PoC and here's why you should still verify the fix is in code":

- **Confirmed the vulnerability existed** (auditor-grade evidence)
- **Confirmed the mitigation was deployed** (positive ops finding for the SOC)
- **Identified the depth question** (WAF vs code — different remediation cost)
- **Demonstrated red-team value** (you proved both the bug AND the IR responsiveness)

This is a more valuable deliverable than "I confirmed SQLi" alone, because it captures the engagement's full operational picture.

---

## Anti-patterns to avoid

- **"Recheck failed → false positive."** A failed recheck has multiple causes. Investigate and reassess the original evidence.
- **"It's no longer vulnerable, drop the finding."** No. It WAS vulnerable. The finding stays. Add a "current state: mitigated" annotation.
- **"They patched it, mission accomplished."** No. WAF rule != code fix. Verify the depth.
- **"Don't tell the client we observed their patch."** Yes, do. It's a positive finding about their IR.
- **"Don't include the locked accounts list — they'll think we caused it."** No actor attribution follows from a response code. Share minimized account evidence only with the authorized SOC and state uncertainty.

---

## Bridge to neighboring skills

- `redteam-mindset` — broader discipline framework; this skill is a specific application
- `m365-entra-attack` — specific case for M365 / Smart Lockout differential
- `evidence-hygiene` — how to capture and redact PoC evidence properly
- `report-writing` — finding template for IR observations
- `bb-methodology` — note that this skill is INAPPROPRIATE for bug bounty (no real-time IR there)

---

## One-line summary

**Capture both states, distinguish observation from causation, and retain only evidence-supported findings.**

---

## Related Skills & Chains

- **`redteam-mindset`** — This skill is a specific application of the broader red-team discipline. Engagement flow: `redteam-mindset` loaded at engagement start → baseline-capture habit built in → when response patterns shift mid-test, `mid-engagement-ir-detection` activates to capture the SOC-patch state as a NEW finding (defensive-action observed = client capability metric, not "the bug got fixed so we lose the finding").
- **`evidence-hygiene`** — Mid-engagement IR detection produces TWO states (pre-patch and post-patch); both need disciplined evidence capture or the second finding can't be defended. Engagement flow: baseline screenshots + timestamped request/response dumps at session start → response shift detected → second capture set with explicit timestamp delta → both packaged together.
- **`m365-entra-attack`** — The single richest source of mid-engagement IR signal in modern engagements. Engagement flow: M365 spray triggers AADSTS50053 lockout → baseline lockout policy captured → if lockout window changes mid-test (e.g., from 60min to 24hr) → `mid-engagement-ir-detection` captures the policy change as a finding ("CA policy hardened mid-engagement; defensive response measured").
- **`enterprise-vpn-attack`** + **`vmware-vcenter-attack`** — Critical-infrastructure CVE exploitation is the highest-noise activity; expect SOC to patch within hours. Engagement flow: confirmed VPN/vCenter CVE → baseline capture BEFORE exploitation attempt → if appliance updates mid-test, capture as defensive-action finding → report both the original CVE AND the IR-response.
- **`redteam-report-template`** — IR-observation findings get their own Subject in the deliverable, framed differently from technical-vuln findings. Engagement flow: `mid-engagement-ir-detection` captures behavior-change event → `triage-validation` 7-Question Gate (specifically: "is the behavior-change attributable to my activity?") → `redteam-report-template` packages as a "client capability observation" with explicit timeline and detection-latency metric.

## Limitations

- Process guidance only; it does not authorize probing or exploitation — those steps need their own authorized skill and confirmation gate.
- Docs-only import: upstream templates, commands, and research assets are not bundled.

### Example

```markdown
Apply this skill's checklist to the current engagement notes and report gaps.
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
