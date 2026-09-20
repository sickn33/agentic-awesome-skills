---
name: ssh-configuration
description: Configure SSH servers and clients securely. Manage keys, tunnels, and
  config files. Use when setting up secure remote access.
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

# SSH Configuration

Secure SSH server and client configuration for production environments, including key management, hardened sshd settings, bastion host architecture, tunneling, and multiplexing.

## When to Use

- Setting up secure remote access to Linux or Unix servers
- Hardening SSH daemon configuration to meet compliance requirements
- Configuring bastion / jump hosts for private network access
- Creating SSH tunnels for secure port forwarding
- Managing SSH keys for teams or automated deployments
- Troubleshooting connection, authentication, or performance issues

## Prerequisites

- OpenSSH client installed locally (`ssh -V` to verify)
- OpenSSH server installed on target (`sshd`)
- Root or sudo access on the server for sshd_config changes
- Firewall rules allowing TCP port 22 (or custom SSH port)

## Key Generation and Management

```bash
# Generate an Ed25519 key (recommended -- fast, secure, short)
ssh-keygen -t ed25519 -C "jane@example.com" -f ~/.ssh/id_ed25519

# Generate an RSA 4096-bit key (for legacy compatibility)
ssh-keygen -t rsa -b 4096 -C "jane@example.com" -f ~/.ssh/id_rsa_legacy

# Generate a key with a custom comment and no passphrase (CI/CD use only)
ssh-keygen -t ed25519 -C "ci-deploy-key" -f ~/.ssh/ci_deploy -N ""

# Copy public key to a remote server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server

# Manually append a public key (when ssh-copy-id is unavailable)
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# List fingerprints of keys on the agent
ssh-add -l

# Start the SSH agent and add a key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add a key with a lifetime (auto-removed after 8 hours)
ssh-add -t 28800 ~/.ssh/id_ed25519

# Remove all keys from the agent
ssh-add -D

# Convert an OpenSSH key to PEM format (for tools that need it)
ssh-keygen -p -m PEM -f ~/.ssh/id_rsa_legacy

# Show the public key fingerprint (SHA256)
ssh-keygen -lf ~/.ssh/id_ed25519.pub

# Rotate a key: generate new, deploy, then revoke old
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_new -C "jane@example.com rotated $(date +%Y-%m)"
ssh-copy-id -i ~/.ssh/id_ed25519_new.pub user@server
# After verifying the new key works, remove the old public key from authorized_keys on the server
```

## SSH Client Configuration (~/.ssh/config)

```text
# Global defaults applied to all hosts
Host *
  AddKeysToAgent yes
  IdentitiesOnly yes
  ServerAliveInterval 60
  ServerAliveCountMax 3
  TCPKeepAlive yes
  Compression yes

# Production servers via bastion
Host bastion
  HostName bastion.example.com
  User ops
  IdentityFile ~/.ssh/id_ed25519
  Port 22

Host prod-web-*
  User deploy
  IdentityFile ~/.ssh/id_ed25519
  ProxyJump bastion
  Port 22

Host prod-web-1
  HostName 10.0.1.10

Host prod-web-2
  HostName 10.0.1.11

# Staging accessed directly
Host staging
  HostName staging.example.com
  User deploy
  IdentityFile ~/.ssh/id_ed25519_staging

# Database tunnel through bastion
Host db-tunnel
  HostName 10.0.2.50
  User dba
  ProxyJump bastion
  LocalForward 5432 localhost:5432

# GitHub deploy key
Host github-deploy
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy_key
  IdentitiesOnly yes

# Connection multiplexing for faster repeated connections
Host fast-*
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h-%p
  ControlPersist 600
```

```bash
# Create the sockets directory for multiplexing
mkdir -p ~/.ssh/sockets
chmod 700 ~/.ssh/sockets
```

## Hardened Server Configuration (/etc/ssh/sshd_config)

```bash
# /etc/ssh/sshd_config -- hardened configuration
# -----------------------------------------------

# Listen on a non-default port (obscurity, not security -- combine with firewall)
Port 22

# Protocol and key exchange
Protocol 2
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Authentication
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
MaxAuthTries 3
MaxSessions 5
LoginGraceTime 30

# Restrict users and groups
AllowGroups ssh-users ops-team
# AllowUsers deploy admin

# Disable unused authentication methods
ChallengeResponseAuthentication no
KerberosAuthentication no
GSSAPIAuthentication no

# Forwarding controls
AllowTcpForwarding yes
AllowAgentForwarding no
X11Forwarding no
PermitTunnel no

# Security hardening
ClientAliveInterval 300
ClientAliveCountMax 2
UsePAM yes
UseDNS no
PermitEmptyPasswords no
PermitUserEnvironment no

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# SFTP subsystem
Subsystem sftp /usr/lib/openssh/sftp-server -f AUTH -l INFO

# Match block: restrict deploy user to SFTP only
Match User sftponly
  ForceCommand internal-sftp
  ChrootDirectory /home/%u
  AllowTcpForwarding no
  AllowAgentForwarding no
  X11Forwarding no
```

```bash
# Validate configuration before restarting
sshd -t

# Restart sshd to apply changes
systemctl restart sshd

# Always keep an existing session open while testing
# Open a NEW terminal to verify you can still connect before closing the old one
```

## Bastion Host Setup

```bash
# On the bastion server, restrict forwarding to internal subnets only
# /etc/ssh/sshd_config addition on bastion:
AllowTcpForwarding yes
PermitOpen 10.0.0.0/8:22 10.0.0.0/8:5432

# Disable shell access for jump-only users
Match User jump-user
  PermitTTY no
  ForceCommand /usr/sbin/nologin
  AllowTcpForwarding yes

# Connect through the bastion from a client in one command
ssh -J ops@bastion.example.com deploy@10.0.1.10

# Equivalent using ProxyCommand (older SSH versions)
ssh -o ProxyCommand="ssh -W %h:%p ops@bastion.example.com" deploy@10.0.1.10

# Multi-hop: client -> bastion -> app-server -> db-server
ssh -J ops@bastion,deploy@10.0.1.10 dba@10.0.2.50
```

## SSH Tunneling

```bash
# Local port forward: access remote service on localhost
# Access remote PostgreSQL (10.0.2.50:5432) via bastion at localhost:5432
ssh -L 5432:10.0.2.50:5432 ops@bastion.example.com -N

# Remote port forward: expose local service to the remote network
# Make local dev server (localhost:3000) available on server port 8080
ssh -R 8080:localhost:3000 user@server -N

# Dynamic SOCKS proxy: route all traffic through the server
ssh -D 1080 user@server -N
# Then configure browser or apps to use SOCKS5 proxy at localhost:1080

# Tunnel with a background process
ssh -fN -L 5432:10.0.2.50:5432 ops@bastion.example.com
# Find and kill the tunnel later
ps aux | grep "ssh -fN" | grep -v grep
kill <pid>

# Autossh for persistent tunnels (auto-reconnects)
autossh -M 0 -f -N -L 5432:10.0.2.50:5432 ops@bastion.example.com \
  -o "ServerAliveInterval=30" -o "ServerAliveCountMax=3"
```

## Agent Forwarding (Use with Caution)

```bash
# Enable agent forwarding for a single connection
ssh -A user@bastion

# From the bastion, your local keys are available to authenticate further
ssh deploy@10.0.1.10   # Uses your local key via the agent

# SECURITY WARNING: Agent forwarding exposes your keys to anyone with root
# on the intermediate host. Prefer ProxyJump instead.

# Safer alternative: ProxyJump does not expose the agent
ssh -J ops@bastion deploy@10.0.1.10
```

## SSH Key Restrictions in authorized_keys

```text
# Restrict a key to a specific command only (backup key)
command="/usr/local/bin/run-backup.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... backup@example.com

# Restrict a key to specific source IPs
from="10.0.0.0/24,192.168.1.0/24" ssh-ed25519 AAAA... admin@example.com

# Read-only SFTP key with chroot
command="internal-sftp",no-port-forwarding,no-pty ssh-ed25519 AAAA... sftp-upload@example.com
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| Connection refused | `ss -tlnp \| grep 22` on server | Ensure sshd is running; check firewall rules |
| Permission denied (publickey) | `ssh -vvv user@server` | Verify key is in authorized_keys, permissions 600/700 |
| Host key verification failed | `ssh-keygen -R server` | Remove stale host key; verify server identity |
| Connection timeout | `ssh -o ConnectTimeout=5 user@server` | Check network path, security groups, NACLs |
| Slow SSH login | Check `UseDNS` in sshd_config | Set `UseDNS no`; check reverse DNS |
| Broken pipe / dropped sessions | Add `ServerAliveInterval 60` to config | Configure keepalive on both client and server |
| Agent forwarding not working | `ssh-add -l` on bastion | Ensure `-A` flag used and agent has keys loaded |
| Tunnel port already in use | `ss -tlnp \| grep <port>` | Kill existing tunnel or use a different local port |

## Related Skills

- `linux-administration` -- General Linux system administration
- `user-management` -- Managing the users who connect via SSH
- `systemd-services` -- Managing sshd as a systemd service
- `performance-tuning` -- Network tuning for SSH performance

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

