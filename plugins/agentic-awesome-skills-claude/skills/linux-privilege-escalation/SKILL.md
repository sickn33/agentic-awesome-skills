---
name: linux-privilege-escalation
description: "Assess Linux privilege boundaries in authorized disposable labs using read-only enumeration, synthetic fixtures, and reversible proof patterns."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Linux Privilege Escalation

## Purpose

Assess Linux privilege boundaries and identify kernel exposure, sudo misconfigurations, risky SUID/capability assignments, writable scheduled-task inputs, PATH issues, and unsafe NFS exports. Validate findings with read-only evidence or owner-created synthetic fixtures; do not obtain a root shell, read protected data, crack credentials, install persistence, or execute public exploit code.

## Mandatory Test Gate

Before running any assessment command, record:

- written authorization for the exact disposable lab hosts, test account, commands, and time window;
- a snapshot or rebuild procedure and a named rollback owner;
- an allowlist of read-only paths and synthetic fixtures; production hosts and real secrets are excluded;
- a command ceiling and rate limit (default: 100 read-only commands, one concurrent session);
- allowed impact: listing metadata and writing only inside an owner-created test directory;
- stop conditions: unexpected privilege change, protected-data access, service restart, resource pressure, out-of-scope host/path, or a command requiring exploit execution.

If the environment is not disposable or any gate is missing, stop after passive configuration review.

## Inputs / Prerequisites

### Required Access
- Low-privilege shell access to target Linux system
- Ability to execute commands (interactive or semi-interactive shell)
- No outbound network requirement; keep the lab isolated
- Owner-created synthetic fixtures for any writable-path validation

### Technical Requirements
- Understanding of Linux filesystem permissions and ownership
- Familiarity with common Linux utilities and scripting
- Knowledge of kernel versions and associated vulnerabilities
- Basic understanding of compilation (gcc) for custom exploits

### Recommended Tools
- Distribution-provided inventory tools
- Offline vendor advisories and package metadata
- A disposable VM snapshot for synthetic fixture validation

## Outputs / Deliverables

### Primary Outputs
- Read-only privilege-boundary findings
- Privilege escalation path documentation
- System enumeration findings report
- Recommendations for remediation

### Evidence Artifacts
- Screenshots of successful privilege escalation
- Redacted command output demonstrating the unsafe permission or configuration
- Identified vulnerability details
- Synthetic fixture results and cleanup evidence

## Core Workflow

### Phase 1: System Enumeration

#### Basic System Information
Gather fundamental system details for vulnerability research:

```bash
# Hostname and system role
hostname

# Kernel version and architecture
uname -a

# Detailed kernel information
cat /proc/version

# Operating system details
cat /etc/issue
cat /etc/*-release

# Architecture
arch
```

#### User and Permission Enumeration

```bash
# Current user context
whoami
id

# Users with login shells
cat /etc/passwd | grep -v nologin | grep -v false

# Users with home directories
cat /etc/passwd | grep home

# Group memberships
groups

# Other logged-in users
w
who
```

#### Network Information

```bash
# Network interfaces
ifconfig
ip addr

# Routing table
ip route

# Active connections
netstat -antup
ss -tulpn

# Listening services
netstat -l
```

#### Process and Service Enumeration

```bash
# All running processes
ps aux
ps -ef

# Process tree view
ps axjf

# Services running as root
ps aux | grep root
```

#### Environment Variables

```bash
# Full environment
env

# PATH variable (for hijacking)
echo $PATH
```

### Phase 2: Bounded Enumeration

Prefer native, read-only commands already present on the lab image. Do not download or execute third-party enumeration scripts during the assessment. If an owner supplies an approved tool, verify its recorded checksum offline and run it only after reviewing its exact command plan and output destinations.

Collect the minimum metadata needed for each hypothesis, redact usernames, addresses, environment values, and tokens from evidence, and stop when the command ceiling is reached.

### Phase 3: Kernel Exploits

#### Identify Kernel Version

```bash
uname -r
cat /proc/version
```

#### Map Exposure Without Exploitation

Compare the installed package and kernel build with offline vendor advisories. Record whether the vendor backported a fix; a version-string match alone is not proof of vulnerability.

#### Common Kernel Exploits

| Kernel Version | Exploit | CVE |
|---------------|---------|-----|
| 2.6.x - 3.x | Dirty COW | CVE-2016-5195 |
| 4.4.x - 4.13.x | Double Fetch | CVE-2017-16995 |
| 5.8+ | Dirty Pipe | CVE-2022-0847 |

Do not download, compile, or execute exploit code. If exploitability must be established, use a separate owner-approved reproduction image with a benign vendor test that cannot change privileges, then restore the snapshot.

### Phase 4: Sudo Exploitation

#### Enumerate Sudo Privileges

```bash
sudo -l
```

#### Validate Sudo Policy Safely

Review `sudo -l` output for wildcard arguments, shell-capable programs, unsafe environment retention, and commands that can write outside their intended path. Do not invoke a listed command with `sudo`. Demonstrate impact by mapping the policy to documented program behavior and recommend an exact command/argument allowlist. Treat retained loader variables such as `LD_PRELOAD` as a critical finding without building a shared object.

### Phase 5: SUID Binary Exploitation

#### Find SUID Binaries

```bash
find / -type f -perm -04000 -ls 2>/dev/null
find / -perm -u=s -type f 2>/dev/null
```

#### Validate SUID Assignments Safely

Compare the inventory against the distribution's expected package manifest. Flag unexpected interpreters, editors, file-copy tools, or locally writable SUID binaries. Do not read protected files, create privileged copies, modify account databases, or crack hashes. A package-manifest mismatch plus writable ownership evidence is sufficient proof.

### Phase 6: Capabilities Exploitation

#### Enumerate Capabilities

```bash
getcap -r / 2>/dev/null
```

#### Validate Capability Assignments Safely

Flag general-purpose interpreters or editors holding identity-changing, DAC-bypass, or raw-network capabilities. Verify only the file path, owner, package provenance, and capability metadata; never invoke the binary to change identity.

### Phase 7: Cron Job Exploitation

#### Enumerate Cron Jobs

```bash
# System crontab
cat /etc/crontab

# User crontabs
ls -la /var/spool/cron/crontabs/

# Cron directories
ls -la /etc/cron.*

# Systemd timers
systemctl list-timers
```

#### Validate Scheduled-Task Inputs Safely

Inspect ownership and permissions of the referenced executable, parent directories, environment files, and PATH entries. Do not alter a real scheduled script. When execution proof is required, the owner must create a disabled synthetic timer that reads a marker from a dedicated test directory and writes `CRON_BOUNDARY_TEST` to a test log; remove both after verification.

### Phase 8: PATH Safety Review

Inspect privileged service definitions and scripts for unqualified command names and writable PATH entries. Do not create a shadow binary or invoke the privileged program. If a synthetic proof is required, reproduce the lookup logic as an unprivileged test user in a disposable directory and use a marker executable that only prints `PATH_BOUNDARY_TEST`.

### Phase 9: NFS Export Review

Review `/etc/exports` and owner-provided mount configuration for `no_root_squash`, broad client ranges, insecure transport, and writable sensitive paths. Do not mount the export, create SUID content, or alter files. Confirm remediation by configuration review or an owner-run synthetic read/write check against a non-privileged test file.

## Quick Reference

### Enumeration Commands Summary
| Purpose | Command |
|---------|---------|
| Kernel version | `uname -a` |
| Current user | `id` |
| Sudo rights | `sudo -l` |
| SUID files | `find / -perm -u=s -type f 2>/dev/null` |
| Capabilities | `getcap -r / 2>/dev/null` |
| Cron jobs | `cat /etc/crontab` |
| Writable dirs | `find / -writable -type d 2>/dev/null` |
| NFS exports | `cat /etc/exports` |

### Key Resources
- GTFOBins: https://gtfobins.github.io
- LinPEAS: https://github.com/carlospolop/PEASS-ng
- Linux Exploit Suggester: https://github.com/mzet-/linux-exploit-suggester

## Constraints and Guardrails

### Operational Boundaries
- Do not execute kernel exploits or privilege-changing commands
- Keep all writes inside owner-created synthetic fixtures
- Record every command and clean up every fixture
- Never create persistence, shells, privileged users, or credential artifacts

### Technical Limitations
- Modern kernels may have exploit mitigations (ASLR, SMEP, SMAP)
- AppArmor/SELinux may restrict exploitation techniques
- Container environments limit kernel-level exploits
- Hardened systems may have restricted sudo configurations

### Legal and Ethical Requirements
- Written authorization required before testing
- Stay within defined scope boundaries
- Report critical findings immediately
- Do not access data beyond scope requirements

## Examples

### Example 1: Unsafe Sudo Policy

**Scenario**: A test user can run a shell-capable utility through sudo.

Record the exact `sudo -l` policy and the vendor documentation showing that the utility can launch subprocesses. Do not invoke it with sudo. Recommend replacing the broad entry with a purpose-built wrapper and an exact argument allowlist.

### Example 2: Unexpected SUID Utility

**Scenario**: A general-purpose file reader has an unexpected SUID bit.

Capture its path, ownership, capability metadata, and package-manifest mismatch. Do not read any protected file. Removing the unexpected SUID bit in the owner's remediation window is the verification target.

### Example 3: Writable Scheduled Script

**Scenario**: A privileged timer references a group-writable script.

Capture the timer definition and permission chain without modifying the script. Verify the fix by confirming privileged ownership and removal of group/other write access.

## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| Advisory match is unclear | Check the distribution advisory and package changelog; do not execute an exploit |
| Evidence includes sensitive data | Stop, redact the artifact, and notify the data owner |
| SUID finding is ambiguous | Compare against the signed package manifest and local change records |
| Synthetic timer does not run | Ask the owner to inspect the disabled fixture; do not modify a real scheduled job |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
