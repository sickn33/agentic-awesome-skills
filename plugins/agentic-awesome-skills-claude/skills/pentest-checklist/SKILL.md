---
name: pentest-checklist
description: "Provide a comprehensive checklist for planning, executing, and following up on penetration tests. Ensure thorough preparation, proper scoping, and effective remediation of discovered vulnerabilities."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Pentest Checklist

## Purpose

Provide a comprehensive checklist for planning, executing, and following up on penetration tests. Ensure thorough preparation, proper scoping, and effective remediation of discovered vulnerabilities.

## Inputs/Prerequisites

- Clear business objectives for testing
- Target environment information
- Budget and timeline constraints
- Stakeholder contacts and authorization
- Legal agreements and scope documents

## Outputs/Deliverables

- Defined pentest scope and objectives
- Prepared testing environment
- Security monitoring data
- Vulnerability findings report
- Remediation plan and verification

## Core Workflow

### Phase 1: Scope Definition

#### Define Objectives

- [ ] **Clarify testing purpose** - Determine goals (find vulnerabilities, compliance, customer assurance)
- [ ] **Validate pentest necessity** - Ensure penetration test is the right solution
- [ ] **Align outcomes with objectives** - Define success criteria

**Reference Questions:**
- Why are you doing this pentest?
- What specific outcomes do you expect?
- What will you do with the findings?

#### Know Your Test Types

| Type | Purpose | Scope |
|------|---------|-------|
| External Pentest | Assess external attack surface | Public-facing systems |
| Internal Pentest | Assess insider threat risk | Internal network |
| Web Application | Find application vulnerabilities | Specific applications |
| Social Engineering | Test human security | Employees, processes |
| Red Team | Full adversary simulation | Entire organization |

#### Enumerate Likely Threats

- [ ] **Identify high-risk areas** - Where could damage occur?
- [ ] **Assess data sensitivity** - What data could be compromised?
- [ ] **Review legacy systems** - Old systems often have vulnerabilities
- [ ] **Map critical assets** - Prioritize testing targets

#### Define Scope

- [ ] **List in-scope systems** - IPs, domains, applications
- [ ] **Define out-of-scope items** - Systems to avoid
- [ ] **Set testing boundaries** - What techniques are allowed?
- [ ] **Document exclusions** - Third-party systems, production data

#### Budget Planning

| Factor | Consideration |
|--------|---------------|
| Asset Value | Higher value = higher investment |
| Complexity | More systems = more time |
| Depth Required | Thorough testing costs more |
| Reputation Value | Brand-name firms cost more |

**Budget Reality Check:**
- Cheap pentests often produce poor results
- Align budget with asset criticality
- Consider ongoing vs. one-time testing

### Phase 2: Environment Preparation

#### Prepare Test Environment

- [ ] **Production vs. staging decision** - Determine where to test
- [ ] **Set testing limits** - No DoS on production
- [ ] **Schedule testing window** - Minimize business impact
- [ ] **Create test accounts** - Provide appropriate access levels

**Environment Options:**
```
Production  - Realistic but risky
Staging     - Safer but may differ from production
Clone       - Ideal but resource-intensive
```

#### Run Preliminary Scans

- [ ] **Execute vulnerability scanners** - Find known issues first
- [ ] **Fix obvious vulnerabilities** - Don't waste pentest time
- [ ] **Document existing issues** - Share with testers

**Common Pre-Scan Tools:**
```bash
# Network vulnerability scan
nmap -sV --script vuln TARGET

# Web vulnerability scan
nikto -h http://TARGET
```

#### Review Security Policy

- [ ] **Verify compliance requirements** - GDPR, PCI-DSS, HIPAA
- [ ] **Document data handling rules** - Sensitive data procedures
- [ ] **Confirm legal authorization** - Get written permission

#### Notify Hosting Provider

- [ ] **Check provider policies** - What testing is allowed?
- [ ] **Submit authorization requests** - AWS, Azure, GCP requirements
- [ ] **Document approvals** - Keep records

**Cloud Provider Policies:**
- AWS: https://aws.amazon.com/security/penetration-testing/
- Azure: https://docs.microsoft.com/security/pentest
- GCP: https://cloud.google.com/security/overview

#### Freeze Developments

- [ ] **Stop deployments during testing** - Maintain consistent environment
- [ ] **Document current versions** - Record system states
- [ ] **Avoid critical patches** - Unless security emergency

### Phase 3: Expertise Selection

#### Find Qualified Pentesters

- [ ] **Seek recommendations** - Ask trusted sources
- [ ] **Verify credentials** - OSCP, GPEN, CEH, CREST
- [ ] **Check references** - Talk to previous clients
- [ ] **Match expertise to scope** - Web, network, mobile specialists

**Evaluation Criteria:**

| Factor | Questions to Ask |
|--------|------------------|
| Experience | Years in field, similar projects |
| Methodology | OWASP, PTES, custom approach |
| Reporting | Sample reports, detail level |
| Communication | Availability, update frequency |

#### Define Methodology

- [ ] **Select testing standard** - PTES, OWASP, NIST
- [ ] **Determine access level** - Black box, gray box, white box
- [ ] **Agree on techniques** - Manual vs. automated testing
- [ ] **Set communication schedule** - Updates and escalation

**Testing Approaches:**

| Type | Access Level | Simulates |
|------|-------------|-----------|
| Black Box | No information | External attacker |
| Gray Box | Partial access | Insider with limited access |
| White Box | Full access | Insider/detailed audit |

#### Define Report Format

- [ ] **Review sample reports** - Ensure quality meets needs
- [ ] **Specify required sections** - Executive summary, technical details
- [ ] **Request machine-readable output** - CSV, XML for tracking
- [ ] **Agree on risk ratings** - CVSS, custom scale

**Report Should Include:**
- Executive summary for management
- Technical findings with evidence
- Risk ratings and prioritization
- Remediation recommendations
- Retesting guidance

### Phase 4: Monitoring

#### Implement Security Monitoring

- [ ] **Deploy IDS/IPS** - Intrusion detection systems
- [ ] **Enable logging** - Comprehensive audit trails
- [ ] **Configure SIEM** - Centralized log analysis
- [ ] **Set up alerting** - Real-time notifications

**Monitoring Tools:**
```bash
# Check security logs
tail -f /var/log/auth.log
tail -f /var/log/apache2/access.log

# Monitor network
tcpdump -i eth0 -w capture.pcap
```

#### Configure Logging

- [ ] **Centralize logs** - Aggregate from all systems
- [ ] **Set retention periods** - Keep logs for analysis
- [ ] **Enable detailed logging** - Application and system level
- [ ] **Test log collection** - Verify all sources working

**Key Logs to Monitor:**
- Authentication events
- Application errors
- Network connections
- File access
- System changes

#### Monitor Exception Tools

- [ ] **Track error rates** - Unusual spikes indicate testing
- [ ] **Brief operations team** - Distinguish testing from attacks
- [ ] **Document baseline** - Normal vs. pentest activity

#### Watch Security Tools

- [ ] **Review IDS alerts** - Separate pentest from real attacks
- [ ] **Monitor WAF logs** - Track blocked attempts
- [ ] **Check endpoint protection** - Antivirus detections

### Phase 5: Remediation

#### Ensure Backups

- [ ] **Verify backup integrity** - Test restoration
- [ ] **Document recovery procedures** - Know how to restore
- [ ] **Separate backup access** - Protect from testing

#### Reserve Remediation Time

- [ ] **Allocate team availability** - Post-pentest analysis
- [ ] **Schedule fix implementation** - Address findings
- [ ] **Plan verification testing** - Confirm fixes work

#### Patch During Testing Policy

- [ ] **Generally avoid patching** - Maintain consistent environment
- [ ] **Exception for critical issues** - Security emergencies only
- [ ] **Communicate changes** - Inform pentesters of any changes

#### Cleanup Procedure

- [ ] **Remove test artifacts** - Backdoors, scripts, files
- [ ] **Delete test accounts** - Remove pentester access
- [ ] **Restore configurations** - Return to original state
- [ ] **Verify cleanup complete** - Audit all changes

#### Schedule Next Pentest

- [ ] **Determine frequency** - Annual, quarterly, after changes
- [ ] **Consider continuous testing** - Bug bounty, ongoing assessments
- [ ] **Budget for future tests** - Plan ahead

**Testing Frequency Factors:**
- Release frequency
- Regulatory requirements
- Risk tolerance
- Past findings severity

## Quick Reference

### Pre-Pentest Checklist

```
□ Scope defined and documented
□ Authorization obtained
□ Environment prepared
□ Hosting provider notified
□ Team briefed
□ Monitoring enabled
□ Backups verified
```

### Post-Pentest Checklist

```
□ Report received and reviewed
□ Findings prioritized
□ Remediation assigned
□ Fixes implemented
□ Verification testing scheduled
□ Environment cleaned up
□ Next test scheduled
```

## Constraints

- Production testing carries inherent risks
- Budget limitations affect thoroughness
- Time constraints may limit coverage
- Tester expertise varies significantly
- Findings become stale quickly

## Examples

### Example 1: Quick Scope Definition

```markdown
**Target:** Corporate web application (app.company.com)
**Type:** Gray box web application pentest
**Duration:** 5 business days
**Excluded:** DoS testing, production database access
**Access:** Standard user account provided
```

### Example 2: Monitoring Setup

```bash
# Enable comprehensive logging
sudo systemctl restart rsyslog
sudo systemctl restart auditd

# Start packet capture
tcpdump -i eth0 -w /tmp/pentest_capture.pcap &
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Scope creep | Document and require change approval |
| Testing impacts production | Schedule off-hours, use staging |
| Findings disputed | Provide detailed evidence, retest |
| Remediation delayed | Prioritize by risk, set deadlines |
| Budget exceeded | Define clear scope, fixed-price contracts |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
