---
name: linux-administration
description: System administration for Linux servers. Manage packages, services, and
  system configuration. Use when administering Linux systems.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Linux Administration

Core Linux system administration skills for managing production servers, development environments, and infrastructure hosts across Debian/Ubuntu and RHEL/CentOS distributions.

## When to Use

- Provisioning and maintaining Linux servers in any environment
- Installing, updating, or removing software packages
- Managing filesystems, disk usage, and mount points
- Investigating runaway processes or high resource consumption
- Scheduling recurring tasks with cron or systemd timers
- Analyzing system and application logs for troubleshooting

## Prerequisites

- Root or sudo access on the target system
- SSH access configured (see `ssh-configuration` skill)
- Familiarity with a terminal text editor (vim, nano)
- Package manager available (`apt` on Debian/Ubuntu, `dnf` on RHEL 8+/Fedora)

## Package Management

### Debian / Ubuntu (apt)

```bash
# Update package index and upgrade all installed packages
apt update && apt upgrade -y

# Search for a package by keyword
apt search nginx

# Show detailed package info including dependencies
apt show nginx

# Install a specific version of a package
apt install nginx=1.24.0-1ubuntu1

# Install multiple packages in one command
apt install -y nginx certbot python3-certbot-nginx

# Remove a package but keep its config files
apt remove nginx

# Remove a package and purge all config files
apt purge nginx

# Remove unused dependency packages
apt autoremove -y

# List all installed packages
dpkg -l | grep nginx

# Pin a package to prevent automatic upgrades
cat <<'EOF' > /etc/apt/preferences.d/pin-nginx
Package: nginx
Pin: version 1.24.0-1ubuntu1
Pin-Priority: 1001
EOF

# Add an external repository (example: Docker CE)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
```

### RHEL / CentOS / Fedora (dnf)

```bash
# Update all packages
dnf update -y

# Search for a package
dnf search nginx

# Show package details
dnf info nginx

# Install a package
dnf install -y nginx

# Install a specific version
dnf install nginx-1.24.0-1.el9

# Remove a package
dnf remove nginx

# List installed packages
dnf list installed | grep nginx

# Enable a module stream (example: Node.js 20)
dnf module enable nodejs:20
dnf install -y nodejs

# Add an external repository
dnf install -y epel-release

# View repository list
dnf repolist --all

# Clean cached package data
dnf clean all
```

## System Information

```bash
# Kernel and OS release
uname -a
cat /etc/os-release

# Hostname and system metadata
hostnamectl

# CPU information
lscpu
nproc                      # Number of processing units

# Memory usage (human-readable)
free -h

# Disk usage summary
df -hT                     # Include filesystem type
du -sh /var/log/*          # Summarize directory sizes

# Network interfaces and IP addresses
ip addr show
ip route show              # Routing table

# Uptime and load average
uptime
w                          # Who is logged in and load
```

## Filesystem Management

```bash
# List block devices and partitions
lsblk
fdisk -l

# Create a new ext4 filesystem on a partition
mkfs.ext4 /dev/sdb1

# Mount a filesystem temporarily
mount /dev/sdb1 /mnt/data

# Add a persistent mount via fstab
echo '/dev/sdb1  /mnt/data  ext4  defaults,noatime  0  2' >> /etc/fstab
mount -a                   # Mount everything in fstab

# Check and repair a filesystem (unmount first)
umount /dev/sdb1
fsck.ext4 -y /dev/sdb1

# Monitor disk I/O in real time
iostat -xz 2

# Find files larger than 100 MB
find / -xdev -type f -size +100M -exec ls -lh {} \;

# Check inode usage (out-of-inodes can mimic out-of-disk)
df -i
```

## Process Management

```bash
# List all processes with full details
ps auxf

# Interactive process viewer (prefer htop if installed)
top
htop

# Find processes by name
pgrep -la nginx

# Show process tree
pstree -p

# Send graceful stop signal (SIGTERM)
kill <pid>

# Force kill an unresponsive process (SIGKILL)
kill -9 <pid>

# Kill all processes matching a name
pkill nginx

# Show open files for a process
lsof -p <pid>

# Show which process is listening on a port
ss -tlnp | grep :80
lsof -i :80

# Run a process immune to hangups (persists after logout)
nohup /opt/myapp/start.sh > /var/log/myapp.log 2>&1 &

# Limit CPU usage of a running process with cgroups v2
systemd-run --scope -p CPUQuota=25% --unit=limit-myapp /opt/myapp/start.sh
```

## Cron Job Management

```bash
# Edit the current user's crontab
crontab -e

# List current user's cron jobs
crontab -l

# Example crontab entries
# ┌───── minute (0-59)
# │ ┌───── hour (0-23)
# │ │ ┌───── day of month (1-31)
# │ │ │ ┌───── month (1-12)
# │ │ │ │ ┌───── day of week (0-7, 0 and 7 = Sunday)
# * * * * * command

# Run a backup every day at 2:30 AM
30 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Run a cleanup every Sunday at midnight
0 0 * * 0 /usr/local/bin/cleanup.sh

# Run a health check every 5 minutes
*/5 * * * * /usr/local/bin/healthcheck.sh

# Place system-wide cron scripts in drop-in directories
ls /etc/cron.daily/
ls /etc/cron.weekly/

# Restrict cron access to specific users
echo "deploy" >> /etc/cron.allow
```

## Log Management

```bash
# Follow systemd journal for a specific service
journalctl -u nginx -f

# Show logs since last boot
journalctl -b

# Show logs from a specific time range
journalctl --since "2025-01-15 08:00" --until "2025-01-15 12:00"

# Show only error-level and above
journalctl -p err

# Tail traditional syslog
tail -f /var/log/syslog          # Debian/Ubuntu
tail -f /var/log/messages        # RHEL/CentOS

# Kernel ring buffer messages
dmesg -T                          # Human-readable timestamps
dmesg --level=err,warn

# Check disk usage of log directory
du -sh /var/log/*

# Configure logrotate for a custom application
cat <<'EOF' > /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 myapp myapp
    sharedscripts
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
EOF

# Force a logrotate run for testing
logrotate -f /etc/logrotate.d/myapp

# Centralized logging: forward journal to a remote syslog
# In /etc/systemd/journal-upload.conf:
# URL=http://logserver.example.com:19532
```

## Networking Essentials

```bash
# Test connectivity
ping -c 4 8.8.8.8

# DNS lookup
dig example.com
nslookup example.com

# Trace route to host
traceroute example.com

# List listening ports and associated processes
ss -tlnp

# Show active connections
ss -tunap

# Firewall management (UFW on Ubuntu)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose

# Firewall management (firewalld on RHEL/CentOS)
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
firewall-cmd --list-all
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| Disk full | `df -h` and `du -sh /var/log/*` | Clear old logs, run `logrotate -f`, remove temp files |
| Out of inodes | `df -i` | Delete many small files, check `/tmp` and mail spools |
| High CPU usage | `top`, `ps aux --sort=-%cpu` | Identify and restart or kill the offending process |
| High memory / swapping | `free -h`, `vmstat 1` | Tune `vm.swappiness`, add RAM, identify memory leak |
| Service won't start | `systemctl status <svc>`, `journalctl -u <svc>` | Check config syntax, file permissions, port conflicts |
| DNS resolution fails | `dig @8.8.8.8 example.com`, `cat /etc/resolv.conf` | Fix nameserver entries, restart `systemd-resolved` |
| Package dependency error | `apt --fix-broken install` or `dnf distro-sync` | Resolve held or conflicting packages |
| SSH connection refused | `ss -tlnp \| grep 22`, `systemctl status sshd` | Ensure sshd is running and firewall allows port 22 |

## Related Skills

- `ssh-configuration` -- Secure remote access to Linux servers
- `user-management` -- Create and manage users, groups, and sudo
- `systemd-services` -- Write and manage systemd unit files
- `performance-tuning` -- Kernel and application performance optimization
- `backup-recovery` -- Protect server data with automated backups

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

