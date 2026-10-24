---
name: active-directory-attacks
description: "Assess Active Directory attack paths using scoped configuration review and controlled synthetic lab validation; identify prerequisites, evidence and mitigations."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
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



# Active Directory Attack-Path Assessment

## When to Use

For explicitly authorized AD security assessments or isolated training labs. Start with supplied configuration and owner evidence, then choose the smallest permitted validation. This document does not provide tools, credentials, a licensed lab or a verified exploit chain.

## Mandatory confirmation gate

Before probing, authentication, collection, ticket requests, credential access, coercion, exploitation or configuration changes, obtain the exact domain/controllers/hosts/accounts, written owner authorization and permitted techniques, timing and lockout/request limits. Show the exact proposed operation and its expected effect; wait for explicit confirmation in this conversation. No confirmation means supplied-evidence analysis only. Credentials or a tool installation are not authorization.

Keep production secrets and privileged identities out of exercises. Prefer synthetic users, service accounts, tickets, certificates and canary resources in a disposable owner lab. Never default to password sprays, DCSync/krbtgt extraction, credential dumps, remote shells, machine-password resets, malicious updates, persistence or using another user's ticket. Stop on unexpected real data or cross-domain scope.

## Evidence workflow

1. Record immutable scope and owner-supplied topology: domains/forests/trusts, domain-controller and client patch/configuration state, relevant privileges, service accounts and certificate services. Note missing evidence.
2. Map the candidate principal → permission → resource → possible action. Confirm effective groups/ACL inheritance, denied rights, authentication conditions, host access and actual controls; an attack-graph edge is a hypothesis.
3. Identify the specific technique's preconditions using [the advanced reference](references/advanced-attacks.md). Separate credential disclosure, authentication, execution and privileged state change; one does not automatically prove the next.
4. If active validation is authorized, propose a bounded lab operation with a synthetic marker and a control case. Set stop/cleanup conditions, request/time budget and a reviewer-visible observation before execution. Do not install a historical tool or collector unreviewed.
5. Report exact evidence, limits and mitigation. Owner-approved remediation and retest are separate actions.

## Core checks

| Area | Inspect | Avoid this false conclusion |
| --- | --- | --- |
| Kerberos | Configured clock-skew allowance, time source, encryption types and service principals | A universal five-minute rule or fixed date command safely repairs time |
| Account exposure | Authorized SPN/preauthentication/account policy inventory and owner access review | Empty tool output proves no service accounts or exposure |
| Replication privileges | Effective directory replication rights and who can exercise them | One named replication right or a successful login proves DCSync eligibility |
| Ticket abuse | Origin and intended identity of synthetic tickets, actual validation policy | Pass-the-ticket and forging a golden ticket are the same operation |
| Relay | Signing/channel binding/extended protection, protocol and target permissions | Failed SMB relay authorizes switching to LDAP or another target |
| AD CS | Template and CA permissions, enrollment/approval, EKUs/subject/mapping policy | One template flag alone proves arbitrary administrator impersonation |
| Known CVEs | Exact product, installed patch/configuration and vendor advisory prerequisites | RPC exposure or a version banner alone proves vulnerability |

BloodHound collection can contact many hosts and disclose sensitive topology. Agree collector version, collection methods and scope rather than running All by default. Do not launch browser tools with sandbox disabled as routine setup. Modern and legacy BloodHound/collector versions have different deployment and query formats. Tools named in older playbooks may be retired, renamed or incompatible; inspect official release/help in a safe environment and do not infer current flags from this document.

## Controlled example

For a possible overprivileged synthetic service account, first inspect the supplied group/ACL evidence. In the approved isolated lab, compare the account's access to one owner-created resource with a baseline account. Record success/denial without reading real data, dumping hashes or launching a shell. If the requested privilege cannot be tested safely, report it as a configuration risk pending owner confirmation. Do not claim Domain Admin access from an inferred graph path.

## Reporting

```text
Scope and authorization:
Evidence versions/collection window:
Candidate source-to-permission-to-resource path:
Required versus observed preconditions:
Minimal authorized validation and control:
Observed result, hypothetical impact and severity rationale:
Sensitive evidence location (no values in report):
Remediation owner, cleanup, retest and uncertainty:
```

## Limitations

No commands or exploit behavior have been run or certified by this document. Remote identity and credential operations can trigger lockouts, monitoring, outages and durable artifacts. A cleanup command does not guarantee restoration; record pre-state and verify it independently. Do not change the host clock, bypass endpoint controls, reset a domain-controller password or weaken trust/ADCS policy to make a demonstration work. Owner incident procedures govern accidentally exposed secrets.
