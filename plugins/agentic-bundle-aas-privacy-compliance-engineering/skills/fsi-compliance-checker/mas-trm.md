# MAS Technology Risk Management (TRM) Guidelines — Engineering Control Reference

Engineering-relevant expectations from the Monetary Authority of Singapore's TRM Guidelines (January 2021), organized for change triage. Section numbers follow the official guidelines. The TRM Guidelines apply to all MAS-regulated financial institutions; they are principles-based guidelines (not prescriptive rules), so findings should be framed as "expectation gaps", and the institution's own TRM-aligned policies take precedence where stricter.

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
| 6.1 | Secure-by-design SDLC: security requirements defined at the start, not bolted on | Security stories/threat model exist for the feature |
| 6.2 | Secure coding standards; code review (peer or automated) before deployment | Review gates; standards documented and enforced |
| 6.3 | Source code security: access to repositories controlled; code integrity protected | Repo permissions, branch protection, signed commits where applicable |
| 6.4 | Security testing: vulnerability assessment before production launch and after major changes; penetration testing for internet-facing systems | SAST/DAST in pipeline; pen-test cadence for public systems |
| 6.5 | Separate environments for development, testing, production; production data not used in non-production without protection | Environment isolation; data masking for test data |
| 6.6 | Change management: assessed, tested, approved before production; emergency change procedures with retrospective approval | CI/CD approval gates, change records, rollback plans |
| 6.7 | End-of-life/unsupported software identified and risk-managed | Dependency and runtime version currency |
| — | DevOps note: §6 expectations apply to pipeline automation itself — the pipeline is a production system (access control, audit, segregation of duties in deployment approval) | Who can approve+deploy; pipeline credentials |

## 2. IT Resilience & Availability (§8)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| 8.2 | Availability targets defined; critical systems' RTO ≤ 4 hours and RPO defined per MAS Notice expectations | Architecture supports the institution's stated RTO/RPO |
| 8.3 | Single points of failure identified and addressed for critical systems | Redundancy in new components; multi-AZ/multi-site where critical |
| 8.4 | DR plans tested at least annually; recovery procedures current | New components included in DR runbooks |
| 8.5 | Capacity management: monitor and plan for demand | Load assumptions documented for new services |

## 3. Access Control (§9)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| 9.1 | Least privilege and need-to-have for all access; access reviewed periodically | New roles/permissions minimal; review process covers them |
| 9.2 | Strong authentication for privileged access; MFA expected for critical system administration | Admin paths MFA-protected |
| 9.3 | Privileged access managed: just-in-time where possible, activities logged and reviewed | Break-glass procedures, session recording/audit for admin ops |
| 9.4 | Segregation of duties: no single person develops, approves, and deploys to production unchecked | Pipeline approval separation |
| 9.5 | Remote access secured (MFA, encrypted channels, device posture) | VPN/zero-trust requirements for any new remote path |

## 4. Cryptography (§10)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| 10.1 | Strong, industry-accepted algorithms and key lengths; no deprecated crypto | No MD5/SHA-1 for security, no TLS <1.2, AES-128+ |
| 10.2 | Key lifecycle management: generation, distribution, storage, rotation, revocation, destruction | KMS/HSM usage; no keys in code, config files, or tickets |
| 10.3 | Cryptographic key compromise procedures | Key rotation runbook covers new keys |

## 5. Data & Infrastructure Security (§11)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| 11.1 | Data security throughout lifecycle: at rest, in transit, in use; data loss prevention strategy | Encryption defaults on new stores; egress paths controlled |
| 11.2 | Network security: segmentation, defense in depth; critical systems in secured zones | New services placed in correct zones; no flattening of segmentation |
| 11.3 | Endpoint and server hardening per standards | Base images hardened; IaC matches hardening baselines |
| 11.4 | Virtualization/container security: hypervisor and orchestration hardening | K8s RBAC, pod security, image provenance |
| 11.5 | Cloud: institution remains responsible; due diligence, data residency, exit strategy, and MAS Outsourcing Guidelines apply | New cloud services assessed; data residency for Singapore customer data confirmed |

## 6. Cyber Operations & Monitoring (§12-13)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| 12.1 | Security event logging across systems; logs protected and retained per policy | New components emit security events to central SIEM |
| 12.2 | Continuous monitoring and correlation; anomaly detection for critical systems | Alert rules accompany new security-relevant functionality |
| 13.1 | Cyber incident response plan; roles defined; MAS notification obligations for relevant incidents (as required by notices — commonly understood as within 1 hour for severe incidents) | New failure modes mapped to incident severity matrix |
| 13.2 | Post-incident review and remediation tracking | Incident learnings feed backlog |

## 7. Online Financial Services (§14)

| Ref | Expectation (summary) | Engineering check |
|-----|----------------------|-------------------|
| 14.1 | Strong customer authentication: MFA for login to online financial services and for high-risk transactions | Customer auth flows; step-up auth for transfers/payee changes |
| 14.2 | Transaction signing/confirmation for high-risk transactions; out-of-band notification to customers | Transaction flows notify customers of significant actions |
| 14.3 | Session management: timeout, re-authentication for sensitive actions, protection against hijacking | Session config on customer-facing changes |
| 14.4 | Fraud monitoring and customer education surfaces | New transaction types covered by fraud rules |
| — | Anti-scam expectations (post-2022 MAS/ABS measures): kill switch, cooling-off for new payees/devices, transaction limits | Payment feature changes checked against these measures |

## 8. Quick Triage Table

| Change type | Check first |
|-------------|-------------|
| New feature touching customer money | §14.1-14.2, §6.1, threat model |
| Auth/session change | §9.x, §14.1, §14.3 |
| New data store / data flow | §11.1, §11.5 (residency), §10.1 |
| New cloud service | §11.5 + Outsourcing Guidelines flag |
| CI/CD or repo change | §6.3, §6.6, §9.4 |
| Infra/network change | §11.2, §8.3 |
| New logging/monitoring | §12.1-12.2 |
| Incident-relevant failure mode | §13.1 severity mapping |
| AI/ML model in decisioning | Flag MAS AI information paper review |
