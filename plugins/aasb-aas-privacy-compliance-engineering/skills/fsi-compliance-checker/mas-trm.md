# MAS Technology Risk Management (TRM) Guidelines — Engineering Control Reference

Engineering-relevant expectations from the Monetary Authority of Singapore's TRM Guidelines (January 2021), organized for change triage. The topic summaries below are engineering prompts, not a verified paragraph-level control map. Verify every cited paragraph against the official January 2021 PDF before including it in an audit finding. The TRM Guidelines apply to all MAS-regulated financial institutions; they are principles-based guidelines (not prescriptive rules), so findings should be framed as "expectation gaps", and the institution's own TRM-aligned policies take precedence where stricter.

Related instruments to flag when relevant (not summarized here): MAS Notices on Cyber Hygiene (legally binding baseline), Outsourcing Guidelines, and the MAS AI model risk management information paper for AI/ML systems.

## Contents

1. [Software development & DevOps (§6)](#1-software-development--devops-6)
2. [IT resilience & availability (§8)](#2-it-resilience--availability-8)
3. [Access control (§9)](#3-access-control-9)
4. [Cryptography (§10)](#4-cryptography-10)
5. [Data & infrastructure security (§11)](#5-data--infrastructure-security-11)
6. [Cyber operations & monitoring (§12-13)](#6-cyber-operations--monitoring-12-13)
7. [Online financial services (§14)](#7-online-financial-services-14)
8. [Quick triage table](#8-quick-triage-table)

## 1. Software Development & DevOps (§6)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Secure-by-design SDLC: security requirements defined at the start, not bolted on | Security stories/threat model exist for the feature |
| Verify official paragraph | Secure coding standards; code review (peer or automated) before deployment | Review gates; standards documented and enforced |
| Verify official paragraph | Source code security: access to repositories controlled; code integrity protected | Repo permissions, branch protection, signed commits where applicable |
| Verify official paragraph | Security testing: vulnerability assessment before production launch and after major changes; penetration testing for internet-facing systems | SAST/DAST in pipeline; pen-test cadence for public systems |
| Verify official paragraph | Separate environments for development, testing, production; production data not used in non-production without protection | Environment isolation; data masking for test data |
| Verify official paragraph | Change management: assessed, tested, approved before production; emergency change procedures with retrospective approval | CI/CD approval gates, change records, rollback plans |
| Verify official paragraph | End-of-life/unsupported software identified and risk-managed | Dependency and runtime version currency |
| — | DevOps note: §6 expectations apply to pipeline automation itself — the pipeline is a production system (access control, audit, segregation of duties in deployment approval) | Who can approve+deploy; pipeline credentials |

## 2. IT Resilience & Availability (§8)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Availability targets defined; critical-system RTO/RPO defined under the applicable sector Notice and institutional policy | Architecture supports the institution's stated RTO/RPO |
| Verify official paragraph | Single points of failure identified and addressed for critical systems | Redundancy in new components; multi-AZ/multi-site where critical |
| Verify official paragraph | DR plans tested at least annually; recovery procedures current | New components included in DR runbooks |
| Verify official paragraph | Capacity management: monitor and plan for demand | Load assumptions documented for new services |

## 3. Access Control (§9)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Least privilege and need-to-have for all access; access reviewed periodically | New roles/permissions minimal; review process covers them |
| Verify official paragraph | Strong authentication for privileged access; MFA expected for critical system administration | Admin paths MFA-protected |
| Verify official paragraph | Privileged access managed: just-in-time where possible, activities logged and reviewed | Break-glass procedures, session recording/audit for admin ops |
| Verify official paragraph | Segregation of duties: no single person develops, approves, and deploys to production unchecked | Pipeline approval separation |
| Verify official paragraph | Remote access secured (MFA, encrypted channels, device posture) | VPN/zero-trust requirements for any new remote path |

## 4. Cryptography (§10)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Strong, industry-accepted algorithms and key lengths; no deprecated crypto | No MD5/SHA-1 for security, no TLS <1.2, AES-128+ |
| Verify official paragraph | Key lifecycle management: generation, distribution, storage, rotation, revocation, destruction | KMS/HSM usage; no keys in code, config files, or tickets |
| Verify official paragraph | Cryptographic key compromise procedures | Key rotation runbook covers new keys |

## 5. Data & Infrastructure Security (§11)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Data security throughout lifecycle: at rest, in transit, in use; data loss prevention strategy | Encryption defaults on new stores; egress paths controlled |
| Verify official paragraph | Network security: segmentation, defense in depth; critical systems in secured zones | New services placed in correct zones; no flattening of segmentation |
| Verify official paragraph | Endpoint and server hardening per standards | Base images hardened; IaC matches hardening baselines |
| Verify official paragraph | Virtualization/container security: hypervisor and orchestration hardening | K8s RBAC, pod security, image provenance |
| Verify official paragraph | Cloud: institution remains responsible; due diligence, data residency, exit strategy, and MAS Outsourcing Guidelines apply | New cloud services assessed; cross-border data, outsourcing and residency obligations verified for the actual institution; no blanket localization rule is asserted |

## 6. Cyber Operations & Monitoring (§12-13)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Security event logging across systems; logs protected and retained per policy | New components emit security events to central SIEM |
| Verify official paragraph | Continuous monitoring and correlation; anomaly detection for critical systems | Alert rules accompany new security-relevant functionality |
| Verify official paragraph | Cyber incident response plan; roles defined; MAS notification obligations for relevant incidents (as required by notices — verify the applicable sector Notice, reportable event definition and clock start; do not infer a universal deadline) | New failure modes mapped to incident severity matrix |
| Verify official paragraph | Post-incident review and remediation tracking | Incident learnings feed backlog |

## 7. Online Financial Services (§14)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| Verify official paragraph | Strong customer authentication: MFA for login to online financial services and for high-risk transactions | Customer auth flows; step-up auth for transfers/payee changes |
| Verify official paragraph | Transaction signing/confirmation for high-risk transactions; out-of-band notification to customers | Transaction flows notify customers of significant actions |
| Verify official paragraph | Session management: timeout, re-authentication for sensitive actions, protection against hijacking | Session config on customer-facing changes |
| Verify official paragraph | Fraud monitoring and customer education surfaces | New transaction types covered by fraud rules |
| — | Anti-scam expectations (post-2022 MAS/ABS measures): kill switch, cooling-off for new payees/devices, transaction limits | Payment feature changes checked against these measures |

## 8. Quick Triage Table

| Change type | Check first |
|-------------|-------------|
| New feature touching customer money | online-services scope (verify official paragraphs), §6.1, threat model |
| Auth/session change | access/online-services scope (verify official paragraphs) |
| New data store / data flow | data/cloud/cryptography scope (verify official paragraphs) |
| New cloud service | cloud/third-party scope (verify official paragraph) + Outsourcing Guidelines flag |
| CI/CD or repo change | secure development/change/release/access scope (verify official paragraphs) |
| Infra/network change | network/resilience scope (verify official paragraphs) |
| New logging/monitoring | cyber monitoring scope (verify official paragraphs) |
| Incident-relevant failure mode | incident handling and applicable sector Notice (verify official references) |
| AI/ML model in decisioning | Flag MAS AI information paper review |
