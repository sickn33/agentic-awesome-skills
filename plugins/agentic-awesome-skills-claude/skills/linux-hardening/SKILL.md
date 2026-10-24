---
name: linux-hardening
description: Apply CIS benchmarks and secure Linux servers.
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

# Linux Hardening

Secure Linux servers following CIS benchmarks and security best practices.

## When to Use This Skill

Use this skill when:
- Hardening production servers
- Meeting compliance requirements
- Implementing security baselines
- Configuring secure SSH access

## Target and recovery

Confirm distribution/version, selected CIS profile, current service config and user-authorized changes. Keep a known-working access session and out-of-band recovery, back up affected files privately, preview changes and validate before reload. These examples are fragments, not a universal CIS-compliance script. Do not apply firewall/default-deny rules before verifying management access and IPv4/IPv6 requirements.

## SSH Hardening

```text
# Example sshd configuration; merge with existing policy
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers <confirmed-management-users>
```

## User Security

```bash
# Debian/Ubuntu package example; review the transaction first
sudo apt install libpam-pwquality
```

Merge these settings into `/etc/security/pwquality.conf` after reviewing the distribution PAM policy; these are configuration entries, not shell commands:

```text
minlen = 14
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
```

```bash
# Set the default for FUTURE accounts: inactivity after password expiry,
# not 30 days since last login; review service-account consequences first.
useradd -D -f 30

# Audit sudo usage
# Edit a reviewed /etc/sudoers.d/ fragment with visudo and validate with visudo -c.
# Do not append blindly to /etc/sudoers.
```

## Firewall Configuration

```bash
# UFW setup
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 443/tcp
ufw enable

# Alternative iptables changes require an isolated validated ruleset,
# management allow rules, conntrack, DNS/IPv6 decisions and timed rollback.
# Do not set INPUT DROP first on a live remote host.

```

## Kernel Hardening

```text
# /etc/sysctl.d/99-security.conf
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.randomize_va_space = 2
fs.suid_dumpable = 0

# After reviewing a supported value set, apply the exact file separately:
# sudo sysctl -p /etc/sysctl.d/99-security.conf
```

## File Permissions

```bash
# Inspect distro-prescribed owner/group/mode before any authorized repair.
# /etc/shadow group readability may be required; do not blanket chmod it.
# Find world-writable files
find / -xdev -type f -perm -0002 -ls

# Find SUID files
find / -xdev -perm -4000 -type f -ls
```

## Audit Configuration

Package installation and audit rules are separate steps. Validate and load the actual rules file through the installed audit tooling; execve auditing can capture secret command arguments and large volumes, so scope access and retention.

```bash
# Install auditd
apt install auditd

```

Example rule-file content for `/etc/audit/rules.d/audit.rules` (not shell commands):

```text
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k actions
-a always,exit -F arch=b64 -S execve -k exec
```

## Best Practices

- Disable unused services
- Keep system updated
- Use fail2ban for intrusion prevention
- Enable SELinux/AppArmor
- Regular security audits
- Monitor log files
- Implement least privilege

## Related Skills

- cis-benchmarks (`cis-benchmarks`) - Compliance scanning
- firewall-config (`firewall-config`) - Firewall rules

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
