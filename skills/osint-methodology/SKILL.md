---
name: osint-methodology
description: Comprehensive OSINT methodology for external red-team operations and
  authorized attack-surface assessments.
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
sources: community, public_research
version: 2.3
triggers:
- external recon
- external red team
- red team external
- attack surface management
- attack surface mapping
- ASM
- perimeter recon
- target reconnaissance
- bug bounty recon
- asset discovery
- footprint
- attack path
- identity fabric
- SSO discovery
- IdP fingerprinting
- tenant fingerprinting
- M365 enumeration
- Microsoft 365 recon
- API discovery
- GraphQL introspection
- mobile recon
- APK analysis
- cloud bucket enumeration
- bucket enum
- breach correlation
- secret leak hunt
- origin discovery
- CDN bypass
- WAF bypass
- vulnerability prioritization
- CVE prioritization
- EPSS
- CISA KEV
- phishing infrastructure
- pretext development
- bug bounty submission
- responsible disclosure
- client report
- exec summary
- risk translation
- confidence upgrade
- time budget
- engagement profile
- asset triage
- detection-aware probing
- back-off strategy
- persona rotation
- OSINT methodology
- open source intelligence
- target profiling
- data correlation
- OSINT workflow
- intelligence collection
- OSINT campaign
- recon methodology
- threat actor investigation
- attribution
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

# OSINT methodology for authorized surface review

## When to Use

Use for scoped organizational attack-surface research, evidence correlation and
assessment reports. Defensive inventory and source analysis are valid uses.
Personal investigations need a legitimate, clearly scoped purpose and privacy
limits; do not collect private identifiers, credentials or location histories as
an automatic extension of an infrastructure engagement. Exploitation, phishing
execution, persistence and account intrusion are outside this methodology.

## Authorization and collection plan

Record exact assets, approved sources/queries, allowed active techniques, window,
rate limits, data minimization, retention and stop conditions. The root mandatory
per-command confirmation gate remains binding; an asserted engagement or a
`--deep` flag does not waive it. Ownership evidence is distinct from permission.
Discovery of a subsidiary, vendor, employee profile or historical origin does not
expand scope. Use approved engagement accounts and egress; do not rotate personas,
TLS fingerprints or proxies to evade blocks or platform controls.

Start with approved local inventories and public documentation. Separate passive
third-party queries from requests to the target: HTTP HEAD, DNS resolution, TLS
handshakes, screenshots and API calls can all generate traffic/logs and may send
sensitive query information to the provider. Check cost, terms and authorization.
Stop at rate limits, WAF challenges, explicit denial or owner contact; document
and consult the lead before resuming, without switching identity to bypass them.

## Workflow

1. Define the research question and known seed identities with sources/dates.
2. Collect only relevant authorized evidence and record acquisition method.
3. Represent assets and relationships as typed, timestamped observations.
4. Corroborate each specific claim using independent sources and alternatives.
5. Prioritize by verified exposure, business context and uncertainty, not hostname
   keywords, email role or a fixed numeric “interest score”.
6. Draft findings and recommended next steps; submit/contact/publish only when
   specifically authorized. Preserve unresolved leads as hypotheses.

## Evidence record example

```json
{
  "asset_key": "domain:example.org",
  "claim": "appears in a certificate SAN",
  "source": "approved CT record reference",
  "observed_at": "2026-10-23T10:00:00Z",
  "confidence": "directly observed record; present ownership unverified",
  "scope_status": "candidate, active testing not approved",
  "alternatives": ["historic deployment", "shared hosting"],
  "limitations": ["not evidence of a live service or vulnerability"]
}
```

Confidence attaches to the precise claim. A resolved domain, an HTTP response,
a matched photo or three copied search results does not confirm ownership,
attribution, exploitation or a person's identity. Counts of signals are not a
universal proof rule. Distinguish source independence, direct observation and
inference; record counterevidence and possible stale/spoofed data.

## Data handling

Store restricted evidence and redacted working copies separately. Record source,
UTC time, tool version, full content hash and any truncation or normalization.
Hashes bind bytes, not truth, legal admissibility or replayability. Do not submit
private URLs, artifacts, PII or secrets to public archives, sandboxes or external
models without explicit data-sharing approval. A local model is not automatically
private: check logging, telemetry, access and storage. Do not acquire stolen dumps
or validate found credentials merely to increase confidence; stop and notify via
the approved owner channel, with redaction.

Read [technical interpretation guidance](references/details.md) before classifying
identity, cloud, media, blockchain or vulnerability data.

## Limitations and provenance

Docs-only adaptation of
[elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter),
with upstream MIT attribution retained. No scanner engine, corpus, CLI `--deep`
mode, test evidence or third-party credentials are bundled. Referenced external
services may require permission, payment, accounts and version-specific APIs.
Do not install from moving snippets or assume a companion skill is present.
No enumeration completeness, current compromise, court-grade evidence, attribution
certainty or guaranteed bounty follows from this workflow.
