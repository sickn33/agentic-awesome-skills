---
name: incident-response
description: Handle security incidents with IR playbooks and procedures.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Incident Response

Handle security incidents effectively with structured response procedures.

## Prerequisites

- IR team roster with on-call rotation and escalation paths
- Secure communication channel (separate from production systems)
- Forensic workstation with analysis tools installed
- Evidence storage with chain-of-custody controls
- Legal counsel contact information
- Pre-authorized incident response actions documented

## Incident Response Phases

```yaml
phases:
  1_preparation:
    - IR team roster and 24/7 contact info
    - Tools and privileged access ready
    - Playbooks documented and tested
    - Evidence collection kit prepared
    - Communication templates drafted

  2_detection:
    - Alert triage and validation
    - Initial assessment and scoping
    - Severity classification
    - Incident ticket creation

  3_containment:
    - Short-term containment (stop bleeding)
    - Evidence preservation (before changes)
    - System isolation (network/host level)
    - Credential rotation if needed

  4_eradication:
    - Root cause analysis
    - Remove threat actor access
    - Patch exploited vulnerabilities
    - Clean compromised systems

  5_recovery:
    - System restoration from clean backups
    - Enhanced monitoring deployment
    - Phased return to production
    - Business continuity verification

  6_lessons_learned:
    - Post-incident review (within 72 hours)
    - Timeline reconstruction
    - Documentation update
    - Process and detection improvements
```

## Severity Classification

The targets below (and the 72-hour retrospective target) are examples to agree with
the organization, not notification deadlines or guarantees. Classify phishing by
actual access/data/business impact, not automatically Medium.

| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| Critical (P1) | Active data breach, full outage, ransomware | Immediate (< 15 min) | Data exfiltration in progress, ransomware spreading |
| High (P2) | Service degraded, potential breach | < 1 hour | Unauthorized admin access, malware detected |
| Medium (P3) | Limited impact, contained | < 4 hours | Phishing compromise (single user), policy violation |
| Low (P4) | Minimal impact | Next business day | Failed brute force, blocked scanning activity |

## Evidence collection and containment

Live collection changes a host and may run attacker-controlled binaries. Use a
trusted forensic workstation/toolkit, approved scope and a private encrypted evidence
volume; record collector identity, UTC time/clock offset, source, tool/version,
commands, errors and custody transfers. Hashes detect later byte changes but do not
prove an honest source, completeness or chain of custody. Active containment may take
priority over preservation to prevent ongoing harm; record that decision.

### Bounded Linux collection example

On an approved Linux test host with GNU tools, a minimal metadata collection is:

```bash
set -euo pipefail
umask 077
# EVIDENCE_PARENT must already be an approved private evidence volume.
: "${EVIDENCE_PARENT:?Set approved evidence volume}"
EVIDENCE_DIR=$(mktemp -d "$EVIDENCE_PARENT/collection.XXXXXXXX")
date -u +%Y-%m-%dT%H:%M:%SZ > "$EVIDENCE_DIR/collection-time.txt"
uname -a > "$EVIDENCE_DIR/uname.txt"
ps -eo pid,ppid,user,comm > "$EVIDENCE_DIR/process-names.txt"
# Write the final log before hashing it; never append to hashed evidence afterward.
for name in collection-time.txt uname.txt process-names.txt; do
  (cd "$EVIDENCE_DIR" && sha256sum "$name")
done > "$EVIDENCE_DIR/checksums.sha256"
(cd "$EVIDENCE_DIR" && sha256sum -c checksums.sha256)
```

This omits memory, full command lines, credential databases, logs, containers and
remote clusters deliberately: each requires explicit data scope, retention/access
controls and an independently tracked outcome. A missing tool/error is partial
collection, not a clean host. Avoid unlimited whole-filesystem walks or collecting
`/etc/shadow` by default. Bound disk/time and do not hide permission failures.

### Memory acquisition

Use a reviewed kernel-compatible acquisition tool only under the IR plan: loading
LiME modifies kernel state and may crash a system. `/proc/kcore` is not always
available and copying its enormous virtual address space is not a reliable generic
memory dump. Record hashes, kernel/tool version, errors and approved size/time bounds;
no successful memory capture is implied by a printed message.

### AWS evidence and isolation runbook

1. Confirm account, region, instance and every attached volume/ENI from a read-only
   inventory. Preserve that inventory and request IDs in private evidence storage.
2. Snapshot the approved volume set consistently (multi-volume/application consistency
   needs planning), record IDs and wait for completed/error states. Creation is a
   billable write; an accepted request is not a completed forensic image.
3. Export the relevant log data and query/time coverage. `describe-flow-logs` exports
   configuration, not packets or historical flow records. CloudTrail event history
   lookup is not complete data-event or organization-wide incident coverage.
4. Separately approve containment and preserve original SG/ENI configurations plus
   rollback/recovery path. A newly created SG has default outbound allow rules:
   attaching it alone does **not** isolate egress. Security groups are stateful and
   existing connections may persist; use the organization’s tested quarantine controls
   across every ENI/route/connection path, preserving authorized evidence access.
5. Verify observed isolation from controlled test points and monitor before declaring
   containment. Store evidence in an existing restricted encrypted retention-controlled
   destination; never derive arbitrary public bucket names or reuse predictable `/tmp`
   evidence files.

## Forensics Commands Reference

```bash
# --- Disk forensics ---
# Create forensic image of a disk
dd if=/dev/sda of=/evidence/disk.img bs=4M status=progress
sha256sum /evidence/disk.img > /evidence/disk.img.sha256

# Mount forensic image read-only
# Mount a working copy with filesystem-specific no-journal-replay options
# and a write blocker where applicable; ro alone may permit journal recovery.
# Do not mount an untrusted image on the production host.

# Find recently modified files
find /mnt/forensic -type f -mtime -3 -ls | sort -k11

# Find files by owner
find /mnt/forensic -user www-data -type f -newer /tmp/reference-time -ls

# --- Log analysis ---
# Search auth logs for brute force
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn | head -20

# Search for privilege escalation
grep -E "(sudo|su\[)" /var/log/auth.log | grep -v "session opened"

# Search web logs for attack patterns
grep -iE "(union.*select|<script|\.\.\/|%00)" /var/log/nginx/access.log

# Timeline analysis with find
find / -newermt "2025-01-15 00:00" ! -newermt "2025-01-16 00:00" -ls 2>/dev/null | sort -k9

# --- Network forensics ---
# Capture network traffic
tcpdump -i eth0 -w /evidence/capture.pcap -c 100000

# Analyze pcap for suspicious connections
tcpdump -r /evidence/capture.pcap -nn 'dst port 4444 or dst port 8888 or dst port 1337'

# Check for DNS tunneling
tcpdump -r /evidence/capture.pcap -nn 'udp port 53' | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# --- Malware analysis ---
# Check file for known malware hashes
sha256sum suspicious_file
# Query only a hash if disclosure is approved; never upload confidential samples automatically.

# Strings analysis
strings suspicious_file | grep -iE "(http|ftp|ssh|password|key|token)"

# Check for packed/obfuscated binaries
file suspicious_file
readelf -h suspicious_file 2>/dev/null
```

## Communication Templates

### Initial Notification (Internal)

```markdown
## Security Incident Notification

**Incident ID:** INC-YYYY-NNNN
**Severity:** [Critical/High/Medium/Low]
**Status:** Active - Investigating
**Time Detected:** YYYY-MM-DD HH:MM UTC
**Reported By:** [Name/System]

### Summary
[1-2 sentence description of what was detected]

### Impact Assessment
- **Systems affected:** [list]
- **Data at risk:** [type and scope]
- **Users impacted:** [count/scope]
- **Business impact:** [description]

### Current Actions
- [ ] Evidence preservation in progress
- [ ] Containment measures being applied
- [ ] IR team assembled

### Next Update
Expected at: YYYY-MM-DD HH:MM UTC

### Incident Commander
[Name] - [Contact info]
```

### Stakeholder Update

```markdown
## Incident Update - INC-YYYY-NNNN

**Update #:** N
**Time:** YYYY-MM-DD HH:MM UTC
**Severity:** [unchanged/upgraded/downgraded]
**Status:** [Investigating/Contained/Eradicating/Recovering/Resolved]

### Progress Since Last Update
- [Bullet points of actions taken]

### Current Understanding
- **Root cause:** [Known/Under investigation]
- **Scope:** [Expanded/Unchanged/Reduced]
- **Threat actor:** [If applicable]

### Active Containment Measures
- [List of measures in place]

### Next Steps
- [Planned actions with ETA]

### Decisions Needed
- [If any decisions required from leadership]
```

### External Breach Notification (if required)

The external notice is a draft in [the reference](references/details.md); legal/communications
owners must verify facts, jurisdiction-specific deadlines and recipients before sending.

## Contents

- [Notice of Data Security Incident](references/details.md)
- [IR Playbook: Compromised Credentials](references/details.md)
- [Troubleshooting](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Responding to an active security incident (breach, malware, unauthorized access)
- Building incident response playbooks and runbooks
- Conducting IR tabletop exercises and drills
- Setting up evidence collection and forensic capabilities
- Establishing communication protocols for security events
- Performing post-incident reviews and process improvements

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
command -v sha256sum # availability only; not evidence of collection success
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
