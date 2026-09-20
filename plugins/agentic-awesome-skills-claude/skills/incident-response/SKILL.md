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

| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| Critical (P1) | Active data breach, full outage, ransomware | Immediate (< 15 min) | Data exfiltration in progress, ransomware spreading |
| High (P2) | Service degraded, potential breach | < 1 hour | Unauthorized admin access, malware detected |
| Medium (P3) | Limited impact, contained | < 4 hours | Phishing compromise (single user), policy violation |
| Low (P4) | Minimal impact | Next business day | Failed brute force, blocked scanning activity |

## Evidence Collection Scripts

### Linux Evidence Collection

```bash
#!/bin/bash
# linux-evidence-collect.sh - Collect forensic evidence from a Linux host
# Run with sudo. Preserves evidence with timestamps and hashes.

set -euo pipefail

EVIDENCE_DIR="/evidence/$(hostname)-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"
LOGFILE="$EVIDENCE_DIR/collection.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOGFILE"; }

log "Starting evidence collection on $(hostname)"
log "Collector: $(whoami)"
log "System time: $(date -u)"

# System information
log "Collecting system information..."
uname -a > "$EVIDENCE_DIR/uname.txt"
cat /etc/os-release > "$EVIDENCE_DIR/os-release.txt"
uptime > "$EVIDENCE_DIR/uptime.txt"
date -u > "$EVIDENCE_DIR/system-time.txt"

# Running processes (full command line)
log "Collecting process list..."
ps auxwwf > "$EVIDENCE_DIR/processes.txt"
ps -eo pid,ppid,user,args --sort=-pcpu > "$EVIDENCE_DIR/processes-by-cpu.txt"

# Network connections
log "Collecting network state..."
ss -tulnp > "$EVIDENCE_DIR/listening-ports.txt"
ss -anp > "$EVIDENCE_DIR/all-connections.txt"
ip addr show > "$EVIDENCE_DIR/ip-addresses.txt"
ip route show > "$EVIDENCE_DIR/routes.txt"
iptables -L -n -v > "$EVIDENCE_DIR/iptables.txt" 2>&1 || true
cat /etc/resolv.conf > "$EVIDENCE_DIR/dns-config.txt"

# User activity
log "Collecting user activity..."
last -a > "$EVIDENCE_DIR/login-history.txt"
lastb > "$EVIDENCE_DIR/failed-logins.txt" 2>&1 || true
who > "$EVIDENCE_DIR/currently-logged-in.txt"
w > "$EVIDENCE_DIR/user-activity.txt"
cat /etc/passwd > "$EVIDENCE_DIR/passwd.txt"
cat /etc/shadow > "$EVIDENCE_DIR/shadow.txt" 2>/dev/null || true
cat /etc/group > "$EVIDENCE_DIR/group.txt"

# Scheduled tasks
log "Collecting scheduled tasks..."
for user in $(cut -f1 -d: /etc/passwd); do
  crontab -u "$user" -l 2>/dev/null >> "$EVIDENCE_DIR/crontabs.txt" && \
    echo "--- $user ---" >> "$EVIDENCE_DIR/crontabs.txt"
done
ls -la /etc/cron.* > "$EVIDENCE_DIR/cron-dirs.txt" 2>&1

# File system state
log "Collecting filesystem state..."
find /tmp /var/tmp /dev/shm -type f -ls > "$EVIDENCE_DIR/temp-files.txt" 2>/dev/null
find / -name "*.sh" -mtime -7 -ls > "$EVIDENCE_DIR/recent-scripts.txt" 2>/dev/null
find / -perm -4000 -type f -ls > "$EVIDENCE_DIR/suid-files.txt" 2>/dev/null
find /home -name ".*history" -ls > "$EVIDENCE_DIR/history-files.txt" 2>/dev/null

# Loaded kernel modules
log "Collecting kernel modules..."
lsmod > "$EVIDENCE_DIR/kernel-modules.txt"

# Open files
log "Collecting open files..."
lsof -n > "$EVIDENCE_DIR/open-files.txt" 2>/dev/null

# Systemd services
log "Collecting service state..."
systemctl list-units --type=service --all > "$EVIDENCE_DIR/services.txt"
systemctl list-timers --all > "$EVIDENCE_DIR/timers.txt"

# Log preservation
log "Preserving system logs..."
tar czf "$EVIDENCE_DIR/var-log.tar.gz" /var/log/ 2>/dev/null

# Docker containers (if present)
if command -v docker &>/dev/null; then
  log "Collecting Docker state..."
  docker ps -a > "$EVIDENCE_DIR/docker-containers.txt"
  docker images > "$EVIDENCE_DIR/docker-images.txt"
  docker network ls > "$EVIDENCE_DIR/docker-networks.txt"
fi

# Kubernetes (if kubectl available)
if command -v kubectl &>/dev/null; then
  log "Collecting Kubernetes state..."
  kubectl get pods --all-namespaces > "$EVIDENCE_DIR/k8s-pods.txt" 2>/dev/null
  kubectl get events --all-namespaces --sort-by=.lastTimestamp > "$EVIDENCE_DIR/k8s-events.txt" 2>/dev/null
fi

# Hash all evidence files
log "Computing evidence hashes..."
find "$EVIDENCE_DIR" -type f ! -name "checksums.sha256" -exec sha256sum {} \; > "$EVIDENCE_DIR/checksums.sha256"

log "Evidence collection complete: $EVIDENCE_DIR"
echo "Total files collected: $(find "$EVIDENCE_DIR" -type f | wc -l)"
```

### Memory Acquisition

```bash
#!/bin/bash
# memory-capture.sh - Capture volatile memory for forensic analysis

EVIDENCE_DIR="/evidence/memory-$(hostname)-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

# Using LiME (Linux Memory Extractor)
if [ -f /lib/modules/$(uname -r)/extra/lime.ko ]; then
  insmod /lib/modules/$(uname -r)/extra/lime.ko "path=$EVIDENCE_DIR/memory.lime format=lime"
  echo "Memory captured with LiME"
fi

# Alternative: /proc/kcore (partial, but always available)
cp /proc/kcore "$EVIDENCE_DIR/kcore" 2>/dev/null

# Capture /proc/meminfo for context
cat /proc/meminfo > "$EVIDENCE_DIR/meminfo.txt"

# Hash the memory dump
sha256sum "$EVIDENCE_DIR"/* > "$EVIDENCE_DIR/checksums.sha256"
```

### AWS Evidence Collection

```bash
#!/bin/bash
# aws-evidence-collect.sh - Collect evidence from compromised AWS resources

INCIDENT_ID="${1:?Usage: $0 <incident-id>}"
INSTANCE_ID="${2:?Usage: $0 <incident-id> <instance-id>}"
EVIDENCE_BUCKET="s3://incident-evidence-${AWS_ACCOUNT_ID}"
EVIDENCE_PREFIX="${INCIDENT_ID}/$(date +%Y%m%d-%H%M%S)"

echo "=== AWS Evidence Collection ==="
echo "Incident: $INCIDENT_ID"
echo "Instance: $INSTANCE_ID"

# Snapshot EBS volumes
echo "Creating EBS snapshots..."
VOLUMES=$(aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=${INSTANCE_ID}" \
  --query 'Volumes[].VolumeId' --output text)

for vol in $VOLUMES; do
  SNAP_ID=$(aws ec2 create-snapshot \
    --volume-id "$vol" \
    --description "IR Evidence - ${INCIDENT_ID} - ${vol}" \
    --tag-specifications "ResourceType=snapshot,Tags=[{Key=IncidentId,Value=${INCIDENT_ID}},{Key=Purpose,Value=forensic-evidence}]" \
    --query 'SnapshotId' --output text)
  echo "  Snapshot created: $SNAP_ID for volume $vol"
done

# Capture instance metadata
echo "Capturing instance metadata..."
aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  > "/tmp/${INCIDENT_ID}-instance-describe.json"
aws s3 cp "/tmp/${INCIDENT_ID}-instance-describe.json" \
  "${EVIDENCE_BUCKET}/${EVIDENCE_PREFIX}/instance-describe.json"

# Capture security group rules
SG_IDS=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[].Instances[].SecurityGroups[].GroupId' --output text)
for sg in $SG_IDS; do
  aws ec2 describe-security-group-rules --filters "Name=group-id,Values=${sg}" \
    > "/tmp/${INCIDENT_ID}-sg-${sg}.json"
  aws s3 cp "/tmp/${INCIDENT_ID}-sg-${sg}.json" \
    "${EVIDENCE_BUCKET}/${EVIDENCE_PREFIX}/sg-${sg}.json"
done

# Collect CloudTrail events for the instance
echo "Collecting CloudTrail events..."
aws cloudtrail lookup-events \
  --lookup-attributes "AttributeKey=ResourceName,AttributeValue=${INSTANCE_ID}" \
  --start-time "$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
  > "/tmp/${INCIDENT_ID}-cloudtrail.json"
aws s3 cp "/tmp/${INCIDENT_ID}-cloudtrail.json" \
  "${EVIDENCE_BUCKET}/${EVIDENCE_PREFIX}/cloudtrail.json"

# Collect VPC flow logs
echo "Collecting VPC flow logs..."
ENI_ID=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[].Instances[].NetworkInterfaces[0].NetworkInterfaceId' --output text)
aws ec2 describe-flow-logs --filter "Name=resource-id,Values=${ENI_ID}" \
  > "/tmp/${INCIDENT_ID}-flow-logs.json"
aws s3 cp "/tmp/${INCIDENT_ID}-flow-logs.json" \
  "${EVIDENCE_BUCKET}/${EVIDENCE_PREFIX}/flow-logs-config.json"

# Isolate the instance (move to quarantine security group)
echo "Isolating instance..."
QUARANTINE_SG=$(aws ec2 create-security-group \
  --group-name "quarantine-${INCIDENT_ID}" \
  --description "Quarantine SG for incident ${INCIDENT_ID}" \
  --vpc-id "$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[].Instances[].VpcId' --output text)" \
  --query 'GroupId' --output text)

# Quarantine SG: deny all inbound, allow outbound only to evidence bucket
aws ec2 modify-instance-attribute \
  --instance-id "$INSTANCE_ID" \
  --groups "$QUARANTINE_SG"

echo "Instance isolated with quarantine SG: $QUARANTINE_SG"
echo "Evidence stored at: ${EVIDENCE_BUCKET}/${EVIDENCE_PREFIX}/"
```

## Forensics Commands Reference

```bash
# --- Disk forensics ---
# Create forensic image of a disk
dd if=/dev/sda of=/evidence/disk.img bs=4M status=progress
sha256sum /evidence/disk.img > /evidence/disk.img.sha256

# Mount forensic image read-only
mount -o ro,loop,noexec /evidence/disk.img /mnt/forensic

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
# Compare against VirusTotal: https://www.virustotal.com

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

```markdown

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
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
