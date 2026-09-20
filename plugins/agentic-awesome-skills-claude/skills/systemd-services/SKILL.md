---
name: systemd-services
description: Create and manage systemd services and timers. Configure service dependencies
  and resource limits. Use when managing system services.
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

# Systemd Services

Create, manage, and monitor systemd services and timers. Covers unit file authoring, dependency management, socket activation, resource limits, journalctl log analysis, and production hardening.

## When to Use

- Deploying an application as a managed background service
- Replacing cron jobs with systemd timers for better logging and dependency control
- Setting up socket activation for on-demand service startup
- Configuring resource limits (CPU, memory, I/O) for services
- Debugging service startup failures and runtime crashes
- Managing service dependencies and ordering

## Prerequisites

- Linux system running systemd (most modern distributions)
- Root or sudo access for creating system-level unit files
- Application binary or script to run as a service
- Understanding of the application's start/stop lifecycle

## Service Unit File -- Complete Example

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=MyApp Production Server
Documentation=https://docs.example.com/myapp
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=notify
User=myapp
Group=myapp
WorkingDirectory=/opt/myapp

# Environment configuration
EnvironmentFile=/etc/myapp/env
Environment=NODE_ENV=production
Environment=PORT=8080

# Execution
ExecStartPre=/opt/myapp/bin/migrate --check
ExecStart=/opt/myapp/bin/server --config /etc/myapp/config.yaml
ExecStartPost=/opt/myapp/bin/healthcheck.sh
ExecReload=/bin/kill -HUP $MAINPID
ExecStop=/opt/myapp/bin/graceful-stop.sh

# Restart behavior
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=300
StartLimitBurst=5

# Timeouts
TimeoutStartSec=30
TimeoutStopSec=30
WatchdogSec=60

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/myapp /var/log/myapp
CapabilityBoundingSet=
AmbientCapabilities=

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

## Service Management Commands

```bash
# Reload systemd after creating or modifying unit files
systemctl daemon-reload

# Start, stop, restart a service
systemctl start myapp
systemctl stop myapp
systemctl restart myapp

# Reload service configuration without restart (if supported)
systemctl reload myapp

# Enable service to start on boot
systemctl enable myapp

# Enable and start in one command
systemctl enable --now myapp

# Disable and stop
systemctl disable --now myapp

# Check service status
systemctl status myapp

# Check if a service is active, enabled, or failed
systemctl is-active myapp
systemctl is-enabled myapp
systemctl is-failed myapp

# List all running services
systemctl list-units --type=service --state=running

# List all failed services
systemctl list-units --type=service --state=failed

# Show all properties of a service
systemctl show myapp

# Show specific property values
systemctl show myapp -p MainPID,MemoryCurrent,CPUUsageNSec

# Mask a service (prevent it from being started at all)
systemctl mask myapp

# Unmask
systemctl unmask myapp

# Reset a failed service state
systemctl reset-failed myapp
```

## Timer Units (Cron Replacement)

### Timer File

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Daily backup timer

[Timer]
# Run daily at 2:30 AM
OnCalendar=*-*-* 02:30:00
# If the system was off at the scheduled time, run when it boots
Persistent=true
# Add random delay up to 15 minutes to avoid thundering herd
RandomizedDelaySec=900
# Associate with a specific service (defaults to same name .service)
Unit=backup.service

[Install]
WantedBy=timers.target
```

### Corresponding Service File

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Daily backup job
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=backup
ExecStart=/usr/local/bin/run-backup.sh
StandardOutput=journal
StandardError=journal
```

### Timer Management

```bash
# Common OnCalendar expressions:
# minutely, hourly, daily, weekly, monthly
# *-*-* 06:00:00       Daily at 6 AM
# Mon..Fri *-*-* 09:00 Weekdays at 9 AM
# *:0/15               Every 15 minutes

# Validate calendar expressions
systemd-analyze calendar "Mon..Fri *-*-* 09:00"

# List all active timers
systemctl list-timers --all

# Enable and start a timer
systemctl enable --now backup.timer

# Run the associated service immediately (for testing)
systemctl start backup.service
```

## Socket Activation

```ini
# /etc/systemd/system/myapp.socket
[Unit]
Description=MyApp Socket

[Socket]
ListenStream=8080
Accept=no
# Optionally bind to a specific IP
# ListenStream=10.0.1.10:8080

[Install]
WantedBy=sockets.target
```

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=MyApp Server
Requires=myapp.socket

[Service]
Type=notify
User=myapp
ExecStart=/opt/myapp/bin/server
# Service receives the socket file descriptor from systemd

[Install]
WantedBy=multi-user.target
```

```bash
# Enable the socket (service starts on first connection)
systemctl enable --now myapp.socket

# Check socket status
systemctl status myapp.socket

# List all listening sockets
systemctl list-sockets
```

## Dependency Management

```bash
# Key [Unit] directives for ordering and dependencies:
# After=            Start after these units (ordering only)
# Requires=         Hard dependency -- fail if this unit cannot start
# Wants=            Soft dependency -- try to start, don't fail if unavailable
# PartOf=           Stop this unit when the parent stops
# Conflicts=        Cannot run alongside this unit

# Visualize the dependency tree for a service
systemctl list-dependencies myapp

# Show reverse dependencies (who depends on this unit)
systemctl list-dependencies myapp --reverse

# Analyze boot order for a service
systemd-analyze critical-chain myapp.service
```

## Resource Limits (cgroups v2)

```ini
# /etc/systemd/system/myapp.service.d/limits.conf
# (drop-in override file)
[Service]
# Memory limits
MemoryMax=1G
MemoryHigh=768M

# CPU limits
CPUQuota=200%          # Up to 2 full CPU cores
CPUWeight=100          # Relative weight (default=100)

# I/O limits
IOWeight=50
IOReadBandwidthMax=/dev/sda 100M
IOWriteBandwidthMax=/dev/sda 50M

# Process limits
LimitNOFILE=65535
LimitNPROC=4096
TasksMax=512

# Disable OOM killer (let the app handle it)
OOMPolicy=continue
```

```bash
# Apply drop-in overrides without editing the main unit file
mkdir -p /etc/systemd/system/myapp.service.d/

cat <<'EOF' > /etc/systemd/system/myapp.service.d/limits.conf
[Service]
MemoryMax=1G
CPUQuota=200%
EOF

systemctl daemon-reload
systemctl restart myapp

# View current resource usage for a service
systemctl status myapp                  # Shows Memory and CPU
systemd-cgtop                          # Real-time cgroup resource usage

# Edit a service's overrides interactively
systemctl edit myapp
# This creates a drop-in file automatically
```

## Journalctl Log Analysis

```bash
# Follow logs for a service in real time
journalctl -u myapp -f

# Show logs since last boot
journalctl -u myapp -b

# Show logs for a specific time range
journalctl -u myapp --since "2025-01-15 08:00" --until "2025-01-15 12:00"

# Show only error and above
journalctl -u myapp -p err

# Show the last 100 lines with full messages (no truncation)
journalctl -u myapp -n 100 --no-pager -l

# Show logs in JSON format (for parsing)
journalctl -u myapp -o json-pretty --no-pager | head -50

# Check journal disk usage and vacuum old entries
journalctl --disk-usage
journalctl --rotate
journalctl --vacuum-time=7d
journalctl --vacuum-size=500M
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| Service fails to start | `systemctl status myapp`, `journalctl -u myapp -n 50` | Check ExecStart path, permissions, config syntax |
| Service keeps restarting | `journalctl -u myapp --since "5 min ago"` | Check StartLimitBurst; look for crash in logs |
| "Main process exited, code=exited, status=217" | `journalctl -u myapp` | User or group in unit file does not exist |
| "Failed to set up mount namespacing" | Check ProtectSystem/PrivateTmp | Kernel too old or SELinux blocking; relax directives |
| Timer not firing | `systemctl list-timers`, `systemctl status backup.timer` | Ensure timer is enabled; validate OnCalendar expression |
| Service starts before dependency | Check After= and Requires= | Add `After=dependency.service` for ordering |
| OOM killed | `journalctl -k \| grep oom`, `dmesg` | Increase MemoryMax or optimize application memory |
| Cannot bind to port 80 | Check AmbientCapabilities | Add `CAP_NET_BIND_SERVICE` or use a higher port |

## Related Skills

- `linux-administration` -- General system administration context
- `performance-tuning` -- Kernel tuning and resource optimization
- `user-management` -- Service accounts and permissions
- `backup-recovery` -- Scheduling backups with systemd timers

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

