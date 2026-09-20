---
name: user-management
description: Manage users, groups, and permissions on Linux systems. Configure sudo
  and access controls. Use when managing system access.
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

# User Management

Manage users, groups, permissions, sudo access, PAM modules, and LDAP integration on Linux systems. Includes practical scripts for bulk user operations and access auditing.

## When to Use

- Creating and managing local user accounts on Linux servers
- Configuring sudo access with fine-grained privilege controls
- Setting up group-based access control for teams
- Integrating Linux hosts with LDAP or Active Directory for centralized auth
- Auditing user accounts, permissions, and access patterns
- Automating bulk user provisioning and deprovisioning

## Prerequisites

- Root or sudo access on the target system
- `shadow-utils` package (provides useradd, usermod, etc.) -- installed by default
- `libpam-modules` for PAM configuration
- For LDAP: `sssd`, `realmd`, `libpam-ldapd`, or `nslcd` packages
- For auditing: `auditd` package

## User Operations

### Creating Users

```bash
# Create a user with home directory, default shell, and comment
useradd -m -s /bin/bash -c "Jane Smith" jsmith

# Set the user's password interactively
passwd jsmith

# Create a user with a specific UID and primary group
useradd -m -s /bin/bash -u 1500 -g developers -c "Deploy Account" deploy

# Create a system account (no home, no login shell) for running services
useradd -r -s /usr/sbin/nologin -d /opt/myapp -c "MyApp Service Account" myapp

# Create a user with an expiration date (contractor access)
useradd -m -s /bin/bash -e 2025-12-31 -c "Contractor - Bob Lee" blee

# Create user and add to multiple supplementary groups at creation time
useradd -m -s /bin/bash -G docker,developers,ssh-users -c "Dev User" devuser
```

### Modifying Users

```bash
# Add a user to a supplementary group (preserving existing groups with -a)
usermod -aG sudo jsmith
usermod -aG docker,developers jsmith

# Change the user's login shell
usermod -s /bin/zsh jsmith

# Change the user's home directory and move existing files
usermod -d /home/jsmith-new -m jsmith

# Lock a user account (disable login without deleting)
usermod -L jsmith

# Unlock a user account
usermod -U jsmith

# Set an account expiration date
usermod -e 2025-06-30 blee

# Change a user's login name
usermod -l jsmith-new jsmith

# Force password change on next login
chage -d 0 jsmith

# Set password aging: min 7 days, max 90 days, warn 14 days before
chage -m 7 -M 90 -W 14 jsmith

# View password aging info
chage -l jsmith
```

### Deleting Users

```bash
# Remove a user and their home directory
userdel -r jsmith

# Remove a user but keep their home directory (for auditing)
userdel jsmith

# Find and reassign files owned by a deleted user (by UID)
find / -uid 1500 -exec chown newowner:newgroup {} \;
```

## Group Management

```bash
# Create a new group
groupadd developers

# Create a group with a specific GID
groupadd -g 2000 devops

# Add a user to a group
usermod -aG developers jsmith
# Alternative using gpasswd
gpasswd -a jsmith developers

# Remove a user from a group
gpasswd -d jsmith developers

# Set group administrators (can add/remove members without root)
gpasswd -A jsmith developers

# Delete a group
groupdel developers

# List all groups a user belongs to
groups jsmith
id jsmith

# List all members of a group
getent group developers

# Show all groups on the system
cat /etc/group | cut -d: -f1 | sort
```

## Sudo Configuration

```bash
# Always edit sudoers via visudo (syntax validation prevents lockout)
visudo

# Better: use drop-in files in /etc/sudoers.d/
visudo -f /etc/sudoers.d/developers
```

### /etc/sudoers.d/developers

```text
# Allow the developers group to restart specific services
%developers ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart myapp, /usr/bin/systemctl status myapp

# Allow a deploy user full sudo with no password
deploy ALL=(ALL) NOPASSWD: ALL

# Allow ops team to run docker commands only
%ops ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose

# Allow a user to run commands as a specific service account
jsmith ALL=(myapp) NOPASSWD: /opt/myapp/bin/*

# Restrict to specific hosts (useful with centralized sudoers)
jsmith dbservers=(root) /usr/bin/systemctl restart postgresql

# Log all sudo commands to a dedicated file
Defaults log_output
Defaults!/usr/bin/sudoreplay !log_output
Defaults logfile="/var/log/sudo.log"

# Require password re-entry every 5 minutes (default is 15)
Defaults timestamp_timeout=5

# Require password for sudo even if user has NOPASSWD elsewhere
Defaults:jsmith !authenticate
```

```bash
# Validate sudoers syntax without applying
visudo -c

# Check what sudo permissions a user has
sudo -l -U jsmith

# Test a specific sudo command as a user
sudo -u myapp /opt/myapp/bin/healthcheck.sh
```

## File Permissions and ACLs

```bash
# Standard permissions
chmod 755 /opt/myapp           # rwxr-xr-x
chmod 640 /etc/myapp.conf      # rw-r-----
chmod u+x script.sh            # Add execute for owner
chmod g+w shared-dir/          # Add write for group
chmod o-rwx private-file       # Remove all permissions for others

# Change ownership
chown deploy:developers /opt/myapp
chown -R deploy:developers /opt/myapp/   # Recursive

# Set the SGID bit (new files inherit group ownership)
chmod g+s /opt/shared/

# Set the sticky bit (only owner can delete their files)
chmod +t /tmp/shared/

# Access Control Lists (ACLs) for fine-grained control
# Grant read-execute to a specific user on a directory
setfacl -m u:jsmith:rx /opt/myapp/logs/

# Grant read-write to a group
setfacl -m g:developers:rw /opt/shared/

# Set default ACL (applied to new files created in the directory)
setfacl -d -m g:developers:rw /opt/shared/

# View ACLs
getfacl /opt/shared/

# Remove a specific ACL entry
setfacl -x u:jsmith /opt/myapp/logs/

# Remove all ACLs
setfacl -b /opt/shared/
```

## PAM Configuration

```bash
# PAM config files are in /etc/pam.d/
# Each file controls auth for a specific service (sshd, login, sudo, etc.)

# Enforce password complexity via pam_pwquality
# /etc/pam.d/common-password (Debian) or /etc/pam.d/system-auth (RHEL)
password requisite pam_pwquality.so retry=3 minlen=12 dcredit=-1 ucredit=-1 ocredit=-1 lcredit=-1

# Configure /etc/security/pwquality.conf
minlen = 12
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
maxrepeat = 3
dictcheck = 1

# Limit concurrent logins per user
# /etc/security/limits.conf
jsmith hard maxlogins 3
@developers hard maxlogins 5

# Lock account after 5 failed login attempts
# /etc/pam.d/common-auth (Debian)
auth required pam_faillock.so preauth silent deny=5 unlock_time=900
auth required pam_faillock.so authfail deny=5 unlock_time=900

# View failed login attempts
faillock --user jsmith

# Unlock a locked account
faillock --user jsmith --reset
```

## LDAP / Active Directory Integration

```bash
# Install SSSD and realmd for AD integration (Ubuntu/Debian)
apt install -y sssd realmd adcli sssd-tools libnss-sss libpam-sss

# Install SSSD and realmd (RHEL/CentOS)
dnf install -y sssd realmd adcli sssd-tools oddjob oddjob-mkhomedir

# Discover and join an Active Directory domain
realm discover corp.example.com
realm join corp.example.com -U admin@CORP.EXAMPLE.COM

# Verify the join
realm list

# Allow specific AD groups to log in
realm permit -g "Linux Admins@corp.example.com"
realm permit -g "Developers@corp.example.com"

# Deny all except permitted groups
realm deny --all
realm permit -g "Linux Admins@corp.example.com"

# Restart SSSD after config changes
systemctl restart sssd

# Test LDAP user lookup
id jsmith
getent passwd jsmith

# Grant sudo to an AD group
echo '%linux\ admins ALL=(ALL) ALL' > /etc/sudoers.d/ad-admins
```

## Bulk User Management Scripts

### Bulk User Creation from CSV

```bash
#!/bin/bash
# bulk-create-users.sh
# CSV format: username,fullname,groups,shell
# Example: jsmith,Jane Smith,developers;docker,/bin/bash

CSV_FILE="${1:?Usage: $0 <users.csv>}"

while IFS=',' read -r username fullname groups shell; do
  # Skip header line
  [[ "$username" == "username" ]] && continue

  if id "$username" &>/dev/null; then
    echo "SKIP: User $username already exists"
    continue
  fi

  # Replace semicolons with commas for -G flag
  group_list="${groups//;/,}"

  useradd -m -s "$shell" -c "$fullname" -G "$group_list" "$username"
  # Generate a random temporary password
  temp_pass=$(openssl rand -base64 12)
  echo "$username:$temp_pass" | chpasswd
  chage -d 0 "$username"   # Force password change at first login

  echo "CREATED: $username (groups: $group_list) temp-pass: $temp_pass"
done < "$CSV_FILE"
```

### Quick Access Audit Commands

```bash
# List non-system users (UID >= 1000)
awk -F: '$3 >= 1000 && $3 < 65534 { printf "%-20s UID=%-6s Shell=%s\n", $1, $3, $7 }' /etc/passwd

# List users with sudo access
getent group sudo wheel 2>/dev/null

# Find accounts that have never logged in
lastlog | awk '$0 ~ /Never logged in/ { print $1 }'

# Find accounts with empty passwords
awk -F: '($2 == "" || $2 == "!") { print $1 }' /etc/shadow 2>/dev/null
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| User cannot log in | `passwd -S username`, `faillock --user username` | Unlock account, reset password, check shell |
| "not in sudoers" error | `sudo -l -U username` | Add user to sudo group or create sudoers.d file |
| Group membership not applied | `id username`, `groups username` | User must log out and back in for new groups |
| LDAP/AD user not found | `id aduser`, `sssctl user-show aduser` | Check SSSD status, clear cache: `sss_cache -E` |
| Permission denied on file | `ls -la file`, `getfacl file` | Fix ownership/permissions, check SELinux context |
| PAM lockout after failed attempts | `faillock --user username` | `faillock --user username --reset` |
| Home directory not created | Check `/etc/login.defs` CREATEHOME | Use `useradd -m` or enable `pam_mkhomedir` |
| Password policy not enforced | Check `/etc/pam.d/common-password` | Install and configure `pam_pwquality` |

## Related Skills

- `linux-administration` -- General Linux server management
- `ssh-configuration` -- SSH key-based authentication for managed users
- `systemd-services` -- Service accounts and systemd user instances
- `performance-tuning` -- Resource limits per user via cgroups and ulimits

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

