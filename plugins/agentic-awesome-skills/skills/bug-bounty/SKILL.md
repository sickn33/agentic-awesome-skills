---
name: bug-bounty
description: Complete bug bounty workflow
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

# Bug bounty review workflow

## When to Use

Use for an explicitly authorized bug-bounty engagement, scoped source review or
lab reproduction. This skill organizes evidence and reporting; it does not grant
permission to test every asset owned by an organization or any discovered host.
The mandatory confirmation gate above applies to each active command.

## Scope and plan

Record the program policy URL and retrieval time, exact allowed assets/accounts,
allowed techniques, exclusions, rate/concurrency limits, test window, data-handling
rules and stop conditions. Ownership is not authorization. Resolve ambiguous scope
with the program before testing. Do not pivot into third-party services, metadata,
CI runners or unrelated accounts because a vulnerability appears to permit it.

Begin with already authorized local source, architecture and documented public
material. Check authentication, object/tenant authorization, input handling,
workflow state, cache boundaries and dependency provenance. Treat scanner output,
fingerprints, secret-pattern matches and CVE-version matches as leads.

## Validate with minimum impact

Use synthetic records and two accounts controlled by the engagement. Request
approval for an exact bounded test with expected effect and rollback. Demonstrate
the smallest effect sufficient to establish the security boundary failure; stop
when evidence is adequate. Never require stolen money, real-user PII, production
credential use, persistence or a destructive exploit as a prerequisite for reporting.
A source-proven issue can be reported with its runtime uncertainty clearly stated.

Conditions, authentication and user interaction do not invalidate a vulnerability.
Separate confirmed behavior, inferred impact and untested hypotheses. Do not apply
an “always rejected” list across programs; eligibility and payout are program
policy, while risk and remediation may remain relevant even without a bounty.
Timeboxes guide prioritization, not proof that a host is safe after five minutes.

## Example: static first step

```text
Evidence record:
- Scope: approved local checkout at full commit SHA
- Observation: route reads object ID from user input
- Expected boundary: caller must belong to the object's tenant
- Current evidence: missing authorization in this code path
- Untested: deployed reachability and compensating middleware
- Proposed test: two controlled accounts and one synthetic object, pending approval
```

Store source/version, timestamps, redacted requests, role/tenant and expected vs
actual result. Keep evidence private with restricted retention. Discovery of a
credential requires immediate stop, redaction and owner notification through the
approved channel, not testing the credential against production services.

## Report and handoff

Use [detailed evidence guidance](references/details.md). Include prerequisites,
exact affected version/location, safe reproduction, evidence, bounded impact,
remaining uncertainty and remediation. Calculate the full CVSS vector using the
program's requested version; do not assign severity from vulnerability name alone.
Return a draft unless submission/public disclosure is explicitly authorized.

## Limitations and provenance

This is a docs-only adaptation of
[elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter),
with declared upstream MIT attribution retained. No external tools, helper engine,
slash command or engagement scaffold is bundled. Verify separately installed
skills and prerequisites before routing to them. Do not fetch moving branches or
install tools from historical snippets; a separately authorized installation must
pin and inspect artifacts before activation. No historical payout, “top 1%”,
zero-misfire or live-test certification is established by this local tree.
