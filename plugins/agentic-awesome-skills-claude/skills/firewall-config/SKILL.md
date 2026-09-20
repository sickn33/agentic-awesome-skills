---
name: firewall-config
description: Configure iptables, nftables, and cloud firewalls. Implement network
  segmentation and traffic filtering. Use when securing network perimeters or implementing
  security zones.
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

# Firewall Configuration

Configure host-based and cloud firewalls for network security.

## When to Use This Skill

Use this skill when:
- Setting up a new server and need to restrict network access
- Implementing network segmentation between application tiers
- Configuring cloud security groups for AWS, GCP, or Azure resources
- Migrating from iptables to nftables
- Auditing existing firewall rules for compliance
- Responding to a security incident requiring emergency network blocks

## Prerequisites

- Root or sudo access on Linux hosts
- AWS CLI configured for cloud security groups
- Understanding of TCP/IP, ports, and protocols
- Network diagram showing required traffic flows

## iptables

### Basic Setup with Default Deny

```bash
# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t mangle -F

# Default policies - deny all inbound, allow outbound
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Drop invalid packets
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Allow SSH (restrict to management subnet)
iptables -A INPUT -p tcp --dport 22 -s 10.0.100.0/24 -j ACCEPT

# Allow HTTP/HTTPS from anywhere
iptables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT

# Allow ICMP (ping) with rate limiting
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 4 -j ACCEPT

# Log dropped packets (rate limited to avoid log flooding)
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "IPTABLES-DROP: " --log-level 4

# Save rules (Debian/Ubuntu)
iptables-save > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6
```

### Anti-DDoS Rules

```bash
# SYN flood protection
iptables -A INPUT -p tcp --syn -m limit --limit 25/s --limit-burst 50 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# Limit new connections per source IP
iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 50 -j REJECT

# Block port scanning (detect TCP flags abuse)
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL FIN,URG,PSH -j DROP
iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP
```

### Application-Specific Rules

```bash
# Web server with database backend
# Allow app servers to reach database (port 5432)
iptables -A INPUT -p tcp --dport 5432 -s 10.0.1.0/24 -j ACCEPT

# Allow monitoring (Prometheus node exporter)
iptables -A INPUT -p tcp --dport 9100 -s 10.0.200.0/24 -j ACCEPT

# DNS resolution
iptables -A INPUT -p udp --sport 53 -j ACCEPT
iptables -A INPUT -p tcp --sport 53 -j ACCEPT

# NTP
iptables -A INPUT -p udp --sport 123 -j ACCEPT

# Block specific IP (incident response)
iptables -I INPUT 1 -s 203.0.113.50 -j DROP
```

## UFW (Uncomplicated Firewall)

```bash
# Enable UFW with default deny
ufw default deny incoming
ufw default allow outgoing
ufw enable

# Allow SSH from management network
ufw allow from 10.0.100.0/24 to any port 22 proto tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow specific application profile
ufw allow 'Nginx Full'

# Rate limit SSH (max 6 connections in 30 seconds)
ufw limit ssh

# Allow port range
ufw allow 8000:8080/tcp

# Deny specific IP
ufw deny from 203.0.113.50

# Check status
ufw status verbose
ufw status numbered

# Delete a rule by number
ufw delete 3

# Application profiles
ufw app list
ufw app info 'Nginx Full'
```

## nftables

### Complete Server Configuration

```bash
#!/usr/sbin/nft -f
flush ruleset

# Define variables
define LAN = 10.0.0.0/16
define MGMT = 10.0.100.0/24
define MONITOR = 10.0.200.0/24

table inet filter {
  # Rate limiting set
  set rate_limit {
    type ipv4_addr
    flags dynamic,timeout
    timeout 1m
  }

  chain input {
    type filter hook input priority 0; policy drop;

    # Connection tracking
    ct state established,related accept
    ct state invalid drop

    # Loopback
    iif "lo" accept

    # ICMP and ICMPv6
    ip protocol icmp icmp type { echo-request, destination-unreachable, time-exceeded } limit rate 10/second accept
    ip6 nexthdr icmpv6 icmpv6 type { echo-request, nd-neighbor-solicit, nd-router-advert } accept

    # SSH from management only
    tcp dport 22 ip saddr $MGMT accept

    # HTTP/HTTPS from anywhere
    tcp dport { 80, 443 } accept

    # Prometheus metrics from monitoring subnet
    tcp dport 9100 ip saddr $MONITOR accept

    # Rate limit new connections
    tcp flags syn limit rate over 25/second burst 50 packets drop

    # Log dropped traffic
    log prefix "nft-drop: " level warn limit rate 5/minute
  }

  chain forward {
    type filter hook forward priority 0; policy drop;
  }

  chain output {
    type filter hook output priority 0; policy accept;

    # Optional: restrict outbound to known destinations
    # tcp dport { 80, 443, 53 } accept
    # udp dport { 53, 123 } accept
    # ct state established,related accept
    # drop
  }
}

# NAT table for port forwarding
table ip nat {
  chain prerouting {
    type nat hook prerouting priority -100;
    # Forward port 8080 to internal app server
    tcp dport 8080 dnat to 10.0.1.10:8080
  }

  chain postrouting {
    type nat hook postrouting priority 100;
    oifname "eth0" masquerade
  }
}
```

### nftables Management Commands

```bash
# Load configuration
nft -f /etc/nftables.conf

# List all rules
nft list ruleset

# List specific table
nft list table inet filter

# Add a rule dynamically
nft add rule inet filter input tcp dport 8443 accept

# Insert rule at position
nft insert rule inet filter input position 5 ip saddr 10.0.50.0/24 tcp dport 3306 accept

# Delete a rule by handle
nft -a list chain inet filter input  # show handles
nft delete rule inet filter input handle 15

# Monitor in real time
nft monitor
```

## AWS Security Groups

### Terraform Configuration

```hcl
# Web tier security group
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for web servers"

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "web-sg"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# App tier - only accepts traffic from web tier
resource "aws_security_group" "app" {
  name_prefix = "app-sg-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for application servers"

  ingress {
    description     = "HTTP from web tier"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Database tier - only accepts from app tier
resource "aws_security_group" "db" {
  name_prefix = "db-sg-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for database servers"

  ingress {
    description     = "PostgreSQL from app tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### AWS CLI Commands

```bash
# Create security group
aws ec2 create-security-group \
  --group-name web-sg \
  --description "Web server SG" \
  --vpc-id vpc-0abc123

# Add inbound rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 443 \
  --cidr 0.0.0.0/0

# Add rule referencing another security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0db456 \
  --protocol tcp --port 5432 \
  --source-group sg-0app789

# Remove a rule
aws ec2 revoke-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 22 \
  --cidr 0.0.0.0/0

# Describe rules
aws ec2 describe-security-group-rules \
  --filters Name=group-id,Values=sg-0abc123
```

## Firewall Rule Audit Script

```bash
#!/bin/bash
# firewall-audit.sh - Audit current firewall rules for common issues

echo "=== Firewall Audit Report ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Host: $(hostname)"
echo ""

# Check if firewall is active
if command -v nft &>/dev/null; then
    echo "--- nftables rules ---"
    nft list ruleset
elif command -v iptables &>/dev/null; then
    echo "--- iptables rules ---"
    iptables -L -n -v --line-numbers
fi

echo ""
echo "--- Open ports ---"
ss -tlnp

echo ""
echo "--- Potential issues ---"

# Check for overly permissive rules
if iptables -L INPUT -n 2>/dev/null | grep -q "0.0.0.0/0.*dpt:22"; then
    echo "WARNING: SSH (port 22) open to 0.0.0.0/0 - restrict to management subnet"
fi

if iptables -L INPUT -n 2>/dev/null | grep -q "0.0.0.0/0.*dpt:3306"; then
    echo "CRITICAL: MySQL (port 3306) open to 0.0.0.0/0"
fi

if iptables -L INPUT -n 2>/dev/null | grep -q "0.0.0.0/0.*dpt:5432"; then
    echo "CRITICAL: PostgreSQL (port 5432) open to 0.0.0.0/0"
fi

# Check default policies
DEFAULT_INPUT=$(iptables -L INPUT 2>/dev/null | head -1 | grep -oP 'policy \K\w+')
if [ "$DEFAULT_INPUT" = "ACCEPT" ]; then
    echo "CRITICAL: Default INPUT policy is ACCEPT - should be DROP"
fi
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Locked out of SSH | Rule order or default deny applied before allow | Use out-of-band console access; add SSH allow rule first |
| Rules lost after reboot | Rules not persisted | Install `iptables-persistent` or save to `/etc/nftables.conf` |
| Docker bypasses iptables | Docker modifies iptables FORWARD chain | Use `DOCKER-USER` chain for custom rules; set `"iptables": false` in daemon.json |
| nftables and iptables conflict | Both running simultaneously | Migrate fully to nftables; remove iptables packages |
| AWS SG rule limit reached | Max 60 inbound rules per SG | Use prefix lists or consolidate CIDR ranges |
| Legitimate traffic blocked | Rule ordering issue | Place more specific allow rules before general deny rules |

## Best Practices

- Default deny policy on all chains
- Minimal rule sets - only open what is required
- Regular rule audits (monthly minimum)
- Log denied traffic for security monitoring
- Document all rules with descriptions and ticket references
- Use connection tracking for stateful inspection
- Rate limit inbound connections to prevent DDoS
- Separate management traffic from application traffic
- Test rule changes in staging before production
- Keep persistent backups of working rule sets

## Related Skills

- linux-hardening (`linux-hardening`) - System security
- aws-vpc (`aws-vpc`) - AWS networking
- zero-trust (`zero-trust`) - Identity-based access patterns
- vpn-setup (`vpn-setup`) - Secure tunnel configuration

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
