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

## SSH Hardening

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers deploy admin
Protocol 2
```

## User Security

```bash
# Password policy
sudo apt install libpam-pwquality
# /etc/security/pwquality.conf
minlen = 14
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1

# Lock inactive accounts
useradd -D -f 30

# Audit sudo usage
echo "Defaults logfile=/var/log/sudo.log" >> /etc/sudoers
```

## Firewall Configuration

```bash
# UFW setup
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 443/tcp
ufw enable

# Or iptables
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

## Kernel Hardening

```bash
# /etc/sysctl.d/99-security.conf
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.randomize_va_space = 2
fs.suid_dumpable = 0

# Apply
sysctl -p
```

## File Permissions

```bash
# Critical files
chmod 600 /etc/shadow
chmod 644 /etc/passwd
chmod 700 /root
chmod 600 /etc/ssh/sshd_config

# Find world-writable files
find / -type f -perm -0002 -ls

# Find SUID files
find / -perm -4000 -type f -ls
```

## Audit Configuration

```bash
# Install auditd
apt install auditd

# /etc/audit/rules.d/audit.rules
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
