# Incident Response Playbooks

> Extended playbooks for common security incidents.
> Each follows 5 phases: Contain, Assess, Remediate, Prevent, Document.
> Use with `007 incident` or when responding to any security event.

---

## Playbook 1: Data Breach

**Severity:** CRITICAL
**Response Time:** Immediate (< 15 minutes to begin containment)

### Phase 1: Contain
- [ ] Identify the source of the breach (compromised credential, vulnerability, insider)
- [ ] Revoke compromised credentials immediately (API keys, tokens, passwords)
- [ ] Isolate affected systems from the network
- [ ] Block the attacker's IP/access path if identifiable
- [ ] Preserve forensic evidence (do NOT wipe or restart affected systems yet)

### Phase 2: Assess
- [ ] Determine what data was exposed (PII, financial, credentials, business data)
- [ ] Determine scope: how many users/records affected
- [ ] Identify the attack timeline (when it started, when it was detected)
- [ ] Review access logs to trace the attacker's actions
- [ ] Assess if data was exfiltrated or only accessed

### Phase 3: Remediate
- [ ] Patch the vulnerability that was exploited
- [ ] Force password reset for all affected users
- [ ] Rotate all potentially compromised secrets (API keys, DB passwords, certificates)
- [ ] Clean malware/backdoors if installed
- [ ] Restore from clean backups if data was tampered with

### Phase 4: Prevent
- [ ] Implement missing access controls identified during the breach
- [ ] Add monitoring for the attack pattern used
- [ ] Enable encryption at rest for exposed data stores
- [ ] Implement DLP (Data Loss Prevention) rules
- [ ] Review and restrict access permissions (least privilege)

### Phase 5: Document
- [ ] Complete incident timeline with timestamps
- [ ] Root cause analysis (RCA)
- [ ] List of all affected systems and data
- [ ] Actions taken and by whom
- [ ] Regulatory notifications (LGPD: 72 hours, GDPR: 72 hours)
- [ ] User notification if PII was exposed
- [ ] Lessons learned and process improvements

### Communication Template
```
SUBJECT: [CRITICAL] Security Incident - Data Breach Detected

STATUS: Active incident as of {timestamp}
SEVERITY: CRITICAL
INCIDENT ID: INC-{YYYY}-{NNN}

SUMMARY:
A data breach affecting {scope} has been detected. The breach involves
{type of data} from {source system}.

CURRENT ACTIONS:
- Compromised access has been revoked
- Affected systems are isolated
- Investigation is in progress

AFFECTED DATA:
- Type: {PII / financial / credentials / business}
- Records: {approximate count}
- Users: {approximate count}

NEXT STEPS:
- Complete forensic analysis by {ETA}
- Regulatory notification by {deadline}
- User communication by {deadline}

CONTACT: {incident commander} at {contact info}
```

---

## Playbook 2: DDoS / DoS

**Severity:** HIGH
**Response Time:** < 5 minutes to begin mitigation

### Phase 1: Contain
- [ ] Confirm it is an attack (not a legitimate traffic spike)
- [ ] Activate CDN/WAF DDoS protection (Cloudflare Under Attack Mode, AWS Shield, etc.)
- [ ] Enable rate limiting emergency mode (aggressive thresholds)
- [ ] Block obvious attack source IPs/ranges at the edge
- [ ] Scale infrastructure if possible (auto-scaling groups)
- [ ] Enable geo-blocking if attack originates from specific regions

### Phase 2: Assess
- [ ] Identify attack type (volumetric, protocol, application layer)
- [ ] Identify attack source patterns (IP ranges, user agents, request patterns)
- [ ] Measure impact on service availability and user experience
- [ ] Check if DDoS is a distraction for another attack (data breach, etc.)
- [ ] Review resource utilization (CPU, memory, bandwidth, connections)

### Phase 3: Remediate
- [ ] Implement targeted blocking rules based on attack patterns
- [ ] Optimize application to handle increased load (caching, static responses)
- [ ] Contact ISP/hosting provider for upstream filtering if needed
- [ ] Move critical services behind additional protection layers
- [ ] Gradually relax emergency protections as attack subsides

### Phase 4: Prevent
- [ ] Implement permanent rate limiting with appropriate thresholds
- [ ] Deploy CDN with DDoS protection for all public endpoints
- [ ] Set up auto-scaling with cost limits
- [ ] Create runbooks for common DDoS patterns
- [ ] Implement challenge-based protection (CAPTCHA) for sensitive endpoints

### Phase 5: Document
- [ ] Attack timeline, peak traffic volume, duration
- [ ] Attack type and source characteristics
- [ ] Service impact (downtime, degraded performance, affected users)
- [ ] Mitigation actions and effectiveness
- [ ] Cost impact (infrastructure, lost revenue)
- [ ] Recommendations for improved resilience

---

## Playbook 3: Ransomware

**Severity:** CRITICAL
**Response Time:** Immediate (< 10 minutes to isolate)

### Phase 1: Contain
- [ ] IMMEDIATELY disconnect affected systems from network (pull cable, disable WiFi)
- [ ] Do NOT power off systems (preserves forensic evidence in memory)
- [ ] Identify patient zero (first infected system)
- [ ] Block lateral movement (disable SMB, RDP between segments)
- [ ] Isolate backup systems to prevent encryption
- [ ] Alert all employees to disconnect suspicious systems

### Phase 2: Assess
- [ ] Identify the ransomware variant (check ransom note, file extensions)
- [ ] Determine scope: which systems and data are encrypted
- [ ] Check if backups are intact and uncompromised
- [ ] Assess if data was exfiltrated before encryption (double extortion)
- [ ] Check for decryption tools (NoMoreRansom.org)
- [ ] Determine entry point (phishing email, RDP brute force, vulnerable software)

### Phase 3: Remediate
- [ ] If clean backups exist: wipe and restore from backup
- [ ] If no backups: evaluate decryption options (public tools, negotiation as last resort)
- [ ] Patch the vulnerability that was exploited
- [ ] Remove all persistence mechanisms (scheduled tasks, registry keys, services)
- [ ] Scan all systems for remaining malware before reconnecting
- [ ] Change ALL passwords (domain admin first, then all users)

### Phase 4: Prevent
- [ ] Implement network segmentation
- [ ] Deploy EDR (Endpoint Detection and Response) on all systems
- [ ] Disable SMB v1, restrict RDP access
- [ ] Implement 3-2-1 backup strategy (3 copies, 2 media types, 1 offsite)
- [ ] Air-gapped or immutable backup storage
- [ ] Regular backup restoration tests
- [ ] Employee phishing awareness training

### Phase 5: Document
- [ ] Complete attack timeline
- [ ] Entry point and propagation method
- [ ] Data impact (encrypted, exfiltrated, lost)
- [ ] Recovery method and time to recovery
- [ ] Financial impact (ransom demand, downtime cost, recovery cost)
- [ ] Law enforcement report (recommended)

---

## Playbook 4: Supply Chain Compromise

**Severity:** CRITICAL
**Response Time:** < 30 minutes to assess, < 2 hours to contain

### Phase 1: Contain
- [ ] Identify the compromised dependency/package/vendor
- [ ] Pin to last known good version immediately
- [ ] Block outbound connections from affected systems to unknown IPs
- [ ] Audit all systems using the compromised component
- [ ] Halt all deployments until assessment is complete
- [ ] Check if compromised code was executed in production

### Phase 2: Assess
- [ ] Determine what the malicious code does (data exfiltration, backdoor, crypto-miner)
- [ ] Identify affected versions and timeline of compromise
- [ ] Check package manager advisories (npm, PyPI, Maven security advisories)
- [ ] Review build logs for when compromised version was first introduced
- [ ] Scan all artifacts built with the compromised dependency
- [ ] Check if secrets/credentials were exposed to the malicious code

### Phase 3: Remediate
- [ ] Update to patched version or remove dependency
- [ ] Rotate all secrets that could have been accessed
- [ ] Rebuild and redeploy all affected services from clean sources
- [ ] Scan all systems for backdoors or persistence mechanisms
- [ ] Audit build pipeline for additional compromises

### Phase 4: Prevent
- [ ] Implement dependency pinning with lock files
- [ ] Enable integrity checking (checksums, signatures)
- [ ] Set up automated vulnerability scanning (Dependabot, Snyk, pip-audit)
- [ ] Use private package registries with approved packages
- [ ] Implement SBOM (Software Bill of Materials)
- [ ] Code review for dependency updates
- [ ] Monitor for typosquatting attacks on your dependencies

### Phase 5: Document
- [ ] Compromised component, versions, and timeline
- [ ] Impact assessment (systems affected, data exposed)
- [ ] Detection method (how was it discovered)
- [ ] Remediation actions and verification
- [ ] Supply chain security improvements implemented

---

## Playbook 5: Insider Threat

**Severity:** HIGH to CRITICAL
**Response Time:** < 1 hour (balance speed with discretion)

### Phase 1: Contain
- [ ] Do NOT alert the suspected insider yet
- [ ] Engage HR and legal before technical actions
- [ ] Increase monitoring on the suspected account (audit logging)
- [ ] Restrict access to most sensitive systems without raising suspicion
- [ ] Preserve all evidence (logs, emails, file access records)
- [ ] Secure backup copies of evidence

### Phase 2: Assess
- [ ] Review access logs for unusual patterns (off-hours access, bulk downloads)
- [ ] Check for unauthorized data transfers (USB, email, cloud storage)
- [ ] Review code changes for backdoors or unauthorized modifications
- [ ] Assess what data/systems the insider has access to
- [ ] Determine if the threat is malicious or negligent
- [ ] Involve digital forensics if warranted

### Phase 3: Remediate
- [ ] Coordinate with HR/legal for appropriate action
- [ ] Revoke all access immediately when action is taken
- [ ] Change shared credentials the insider had access to
- [ ] Review and revoke any API keys/tokens created by the insider
- [ ] Audit code changes made by the insider in the last N months
- [ ] Check for scheduled tasks, cron jobs, or time bombs

### Phase 4: Prevent
- [ ] Implement Data Loss Prevention (DLP) tools
- [ ] Enforce least-privilege access across the organization
- [ ] Regular access reviews (quarterly minimum)
- [ ] Implement user behavior analytics (UBA)
- [ ] Offboarding checklist with comprehensive access revocation
- [ ] Background checks for roles with sensitive access

### Phase 5: Document
- [ ] Complete timeline of insider actions
- [ ] Data/systems accessed or compromised
- [ ] Evidence collected and chain of custody
- [ ] HR/legal actions taken
- [ ] Access control improvements implemented

---

## Playbook 6: Credential Stuffing

**Severity:** HIGH
**Response Time:** < 30 minutes to begin mitigation

### Phase 1: Contain
- [ ] Detect the attack (spike in failed logins, multiple accounts from same IPs)
- [ ] Enable aggressive rate limiting on login endpoints
- [ ] Block attacking IP ranges at WAF/CDN level
- [ ] Enable CAPTCHA on login forms
- [ ] Temporarily lock accounts with multiple failed attempts

### Phase 2: Assess
- [ ] Determine how many accounts were successfully compromised
- [ ] Identify the source of credential lists (check haveibeenpwned.com)
- [ ] Review compromised accounts for unauthorized actions
- [ ] Check if attackers accessed sensitive data or made changes
- [ ] Assess financial impact (fraudulent transactions, data access)

### Phase 3: Remediate
- [ ] Force password reset on all compromised accounts
- [ ] Notify affected users with guidance to use unique passwords
- [ ] Reverse any unauthorized actions (transactions, settings changes)
- [ ] Block known compromised credential pairs
- [ ] Invalidate all active sessions for affected accounts

### Phase 4: Prevent
- [ ] Implement MFA (multi-factor authentication), push to all users
- [ ] Deploy credential stuffing detection (rate + pattern analysis)
- [ ] Check passwords against breach databases on registration/change
- [ ] Implement progressive delays on failed login attempts
- [ ] Device fingerprinting and anomaly detection
- [ ] Bot detection on authentication endpoints

### Phase 5: Document
- [ ] Attack timeline, volume, and success rate
- [ ] Number of compromised accounts and impact
- [ ] Source IP analysis
- [ ] Detection method and time to detection
- [ ] User communications sent
- [ ] Authentication security improvements

---

## Playbook 7: API Abuse

**Severity:** MEDIUM to HIGH
**Response Time:** < 1 hour

### Phase 1: Contain
- [ ] Identify the abusive client (API key, IP, user account)
- [ ] Rate limit or throttle the abusive client specifically
- [ ] If data scraping: block the client and return generic errors
- [ ] If financial abuse: freeze the account pending review
- [ ] Preserve request logs for analysis

### Phase 2: Assess
- [ ] Determine the type of abuse (scraping, brute force, fraud, free tier abuse)
- [ ] Quantify the impact (cost, data exposed, service degradation)
- [ ] Review if the abuse exploited a legitimate API or a vulnerability
- [ ] Check ToS violations
- [ ] Determine if automated (bot) or manual

### Phase 3: Remediate
- [ ] Revoke the abusive client's API keys
- [ ] Block abusive patterns (specific endpoints, request signatures)
- [ ] If vulnerability-based: patch the vulnerability
- [ ] If scraping: implement anti-bot measures
- [ ] If fraud: reverse fraudulent transactions, report to legal

### Phase 4: Prevent
- [ ] Implement per-client rate limiting with appropriate tiers
- [ ] Add request cost tracking (weighted rate limiting for expensive endpoints)
- [ ] Deploy bot detection (fingerprinting, behavior analysis)
- [ ] Implement API usage quotas and billing
- [ ] Add anomaly detection on API usage patterns
- [ ] Review API design for abuse vectors (pagination, filtering, bulk endpoints)

### Phase 5: Document
- [ ] Abuse type, method, and timeline
- [ ] Impact (financial, data, service)
- [ ] Client identification and evidence
- [ ] Actions taken (blocking, revocation)
- [ ] API security improvements implemented

---

## General Communication Template

Use this template for any incident type:

```
SUBJECT: [{SEVERITY}] Security Incident - {Brief Description}

STATUS: {Active / Contained / Resolved}
SEVERITY: {CRITICAL / HIGH / MEDIUM / LOW}
INCIDENT ID: INC-{YYYY}-{NNN}
DETECTED: {timestamp}
INCIDENT COMMANDER: {name}

SUMMARY:
{2-3 sentences describing what happened, what is affected, and current status.}

IMPACT:
- Systems: {affected systems}
- Data: {type of data affected, approximate scope}
- Users: {number of affected users}
- Business: {business impact description}

CURRENT STATUS:
- Phase: {Contain / Assess / Remediate / Prevent / Document}
- Actions completed: {list}
- Actions in progress: {list}

NEXT UPDATE: {timestamp for next status update}
CONTACT: {incident commander contact}
```

---

## Severity Classification Reference

| Severity | Examples | Response Time | Escalation |
|----------|---------|---------------|------------|
| **CRITICAL** | Data breach, ransomware, active exploitation | < 15 min | Immediate: CEO, CTO, Legal |
| **HIGH** | DDoS, credential stuffing, supply chain compromise | < 30 min | Within 1 hour: CTO, Engineering Lead |
| **MEDIUM** | API abuse, single account compromise, non-critical vuln exploited | < 2 hours | Within 4 hours: Engineering Lead |
| **LOW** | Failed attack attempt, minor misconfiguration found | < 24 hours | Next business day: Team Lead |
