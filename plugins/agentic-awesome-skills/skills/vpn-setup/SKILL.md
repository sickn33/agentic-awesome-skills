---
name: vpn-setup
description: Configure WireGuard, OpenVPN, and cloud VPNs. Implement secure remote
  access and site-to-site connectivity. Use when setting up secure network tunnels.
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

# VPN Setup

Configure secure VPN tunnels for remote access and site connectivity.

## When to Use This Skill

Use this skill when:
- Setting up secure remote access for employees or contractors
- Connecting on-premises networks to cloud environments (site-to-site)
- Encrypting traffic between data centers or regions
- Implementing a mesh VPN for distributed infrastructure
- Providing secure access to internal services without exposing them publicly

## Prerequisites

- Linux server with a public IP for VPN endpoint
- Root/sudo access on the VPN server
- Firewall rules allowing VPN traffic (UDP 51820 for WireGuard, UDP 1194 for OpenVPN)
- DNS configured for VPN hostname (optional but recommended)
- Understanding of IP subnetting and routing

## WireGuard

### Server Setup

```bash
# Install WireGuard (Ubuntu/Debian)
apt update && apt install -y wireguard

# Generate server keys
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
chmod 600 /etc/wireguard/server_private.key

# Generate pre-shared key (optional, adds post-quantum resistance)
wg genpsk > /etc/wireguard/psk.key
chmod 600 /etc/wireguard/psk.key
```

### Server Configuration

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server-private-key>

# Enable IP forwarding and NAT on startup
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# DNS for clients
DNS = 10.0.0.1

# Peer: Alice (laptop)
[Peer]
PublicKey = <alice-public-key>
PresharedKey = <preshared-key>
AllowedIPs = 10.0.0.2/32

# Peer: Bob (mobile)
[Peer]
PublicKey = <bob-public-key>
PresharedKey = <preshared-key>
AllowedIPs = 10.0.0.3/32

# Peer: Office network (site-to-site)
[Peer]
PublicKey = <office-public-key>
PresharedKey = <preshared-key>
AllowedIPs = 10.0.0.4/32, 192.168.1.0/24
Endpoint = office.example.com:51820
PersistentKeepalive = 25
```

### Client Configuration

```ini
# Client config: alice.conf
[Interface]
Address = 10.0.0.2/24
PrivateKey = <alice-private-key>
DNS = 10.0.0.1

[Peer]
PublicKey = <server-public-key>
PresharedKey = <preshared-key>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```

### Split Tunneling Configuration

```ini
# Client config with split tunnel (only route internal traffic through VPN)
[Interface]
Address = 10.0.0.2/24
PrivateKey = <alice-private-key>
# No DNS override for split tunnel

[Peer]
PublicKey = <server-public-key>
PresharedKey = <preshared-key>
Endpoint = vpn.example.com:51820
# Only route specific subnets through VPN
AllowedIPs = 10.0.0.0/24, 172.16.0.0/16, 192.168.1.0/24
PersistentKeepalive = 25
```

### WireGuard Management Commands

```bash
# Start/stop interface
wg-quick up wg0
wg-quick down wg0

# Enable on boot
systemctl enable wg-quick@wg0

# Show connection status
wg show
wg show wg0

# Add a new peer dynamically
wg set wg0 peer <new-public-key> allowed-ips 10.0.0.5/32

# Remove a peer
wg set wg0 peer <public-key> remove

# Show transfer statistics
wg show wg0 transfer

# Generate QR code for mobile clients
apt install -y qr-encode
qrencode -t ansiutf8 < alice-mobile.conf
```

### Peer Management Script

```bash
#!/bin/bash
# wg-add-peer.sh - Add a new WireGuard peer
set -euo pipefail

PEER_NAME="${1:?Usage: $0 <peer-name>}"
SERVER_CONF="/etc/wireguard/wg0.conf"
CLIENTS_DIR="/etc/wireguard/clients"
SERVER_PUBKEY=$(cat /etc/wireguard/server_public.key)
SERVER_ENDPOINT="vpn.example.com:51820"
PSK=$(cat /etc/wireguard/psk.key)

# Find next available IP
LAST_IP=$(grep -oP 'AllowedIPs = 10\.0\.0\.\K[0-9]+' "$SERVER_CONF" | sort -n | tail -1)
NEXT_IP=$((LAST_IP + 1))

mkdir -p "$CLIENTS_DIR"

# Generate client keys
wg genkey | tee "$CLIENTS_DIR/${PEER_NAME}_private.key" | wg pubkey > "$CLIENTS_DIR/${PEER_NAME}_public.key"
chmod 600 "$CLIENTS_DIR/${PEER_NAME}_private.key"

CLIENT_PRIVKEY=$(cat "$CLIENTS_DIR/${PEER_NAME}_private.key")
CLIENT_PUBKEY=$(cat "$CLIENTS_DIR/${PEER_NAME}_public.key")

# Add peer to server config
cat >> "$SERVER_CONF" << EOF

# Peer: ${PEER_NAME}
[Peer]
PublicKey = ${CLIENT_PUBKEY}
PresharedKey = ${PSK}
AllowedIPs = 10.0.0.${NEXT_IP}/32
EOF

# Generate client config
cat > "$CLIENTS_DIR/${PEER_NAME}.conf" << EOF
[Interface]
Address = 10.0.0.${NEXT_IP}/24
PrivateKey = ${CLIENT_PRIVKEY}
DNS = 10.0.0.1

[Peer]
PublicKey = ${SERVER_PUBKEY}
PresharedKey = ${PSK}
Endpoint = ${SERVER_ENDPOINT}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
EOF

# Reload WireGuard
wg syncconf wg0 <(wg-quick strip wg0)

echo "Peer ${PEER_NAME} added with IP 10.0.0.${NEXT_IP}"
echo "Client config: ${CLIENTS_DIR}/${PEER_NAME}.conf"
```

## OpenVPN

### Server Setup

```bash
# Install OpenVPN and Easy-RSA
apt install -y openvpn easy-rsa

# Initialize PKI
make-cadir /etc/openvpn/easy-rsa
cd /etc/openvpn/easy-rsa

./easyrsa init-pki
./easyrsa build-ca nopass
./easyrsa gen-req server nopass
./easyrsa sign-req server server
./easyrsa gen-dh
openvpn --genkey secret /etc/openvpn/ta.key

# Generate client certificate
./easyrsa gen-req client1 nopass
./easyrsa sign-req client client1
```

### Server Configuration

```ini
# /etc/openvpn/server.conf
port 1194
proto udp
dev tun

ca /etc/openvpn/easy-rsa/pki/ca.crt
cert /etc/openvpn/easy-rsa/pki/issued/server.crt
key /etc/openvpn/easy-rsa/pki/private/server.key
dh /etc/openvpn/easy-rsa/pki/dh.pem
tls-auth /etc/openvpn/ta.key 0

server 10.8.0.0 255.255.255.0

# Route client traffic through VPN
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Split tunnel: push specific routes instead
# push "route 172.16.0.0 255.255.0.0"
# push "route 192.168.1.0 255.255.255.0"

keepalive 10 120

# Cipher and auth
cipher AES-256-GCM
auth SHA256
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305

# Hardening
tls-version-min 1.2
tls-cipher TLS-ECDHE-RSA-WITH-AES-256-GCM-SHA384

user nobody
group nogroup
persist-key
persist-tun

# Logging
status /var/log/openvpn/status.log
log-append /var/log/openvpn/openvpn.log
verb 3

# Max clients
max-clients 100

# Client isolation (clients cannot see each other)
client-to-client
```

### Client Configuration

```ini
# client1.ovpn
client
dev tun
proto udp
remote vpn.example.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun

ca ca.crt
cert client1.crt
key client1.key
tls-auth ta.key 1

cipher AES-256-GCM
auth SHA256

verb 3
```

## Tailscale (Managed WireGuard)

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh -o /tmp/install-tailscale.sh && sh /tmp/install-tailscale.sh && rm /tmp/install-tailscale.sh

# Authenticate and connect
tailscale up

# Advertise subnet routes (act as a gateway)
tailscale up --advertise-routes=192.168.1.0/24,172.16.0.0/16

# Enable as exit node (route all traffic)
tailscale up --advertise-exit-node

# Use an exit node
tailscale up --exit-node=<exit-node-ip>

# Check status
tailscale status

# Access control: tailscale ACL policy (in admin console)
# Example ACL policy
cat << 'EOF'
{
  "acls": [
    {"action": "accept", "src": ["group:engineering"], "dst": ["tag:servers:*"]},
    {"action": "accept", "src": ["group:devops"], "dst": ["*:*"]},
    {"action": "accept", "src": ["tag:monitoring"], "dst": ["tag:servers:9100"]}
  ],
  "tagOwners": {
    "tag:servers": ["group:devops"],
    "tag:monitoring": ["group:devops"]
  },
  "groups": {
    "group:engineering": ["alice@example.com", "bob@example.com"],
    "group:devops": ["charlie@example.com"]
  }
}
EOF

# Enable MagicDNS and set DNS
tailscale up --accept-dns

# SSH via Tailscale (no SSH keys needed)
tailscale up --ssh
```

## AWS Site-to-Site VPN

```bash
# Create Virtual Private Gateway
VGW_ID=$(aws ec2 create-vpn-gateway --type ipsec.1 --query 'VpnGateway.VpnGatewayId' --output text)

# Attach to VPC
aws ec2 attach-vpn-gateway --vpn-gateway-id "$VGW_ID" --vpc-id vpc-0abc123

# Create Customer Gateway (your on-prem device)
CGW_ID=$(aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --bgp-asn 65000 \
  --public-ip 203.0.113.10 \
  --query 'CustomerGateway.CustomerGatewayId' --output text)

# Create VPN connection
VPN_ID=$(aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id "$CGW_ID" \
  --vpn-gateway-id "$VGW_ID" \
  --options '{"StaticRoutesOnly":false}' \
  --query 'VpnConnection.VpnConnectionId' --output text)

# Download configuration for your device
aws ec2 describe-vpn-connections --vpn-connection-ids "$VPN_ID"

# Enable route propagation
aws ec2 enable-vgw-route-propagation \
  --gateway-id "$VGW_ID" \
  --route-table-id rtb-0abc123

# Monitor VPN tunnel status
aws ec2 describe-vpn-connections \
  --vpn-connection-ids "$VPN_ID" \
  --query 'VpnConnections[0].VgwTelemetry'
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| WireGuard handshake never completes | Firewall blocking UDP 51820 | Open UDP 51820 on server firewall and any intermediate firewalls |
| No internet through VPN | IP forwarding disabled or NAT missing | Enable `net.ipv4.ip_forward=1`; verify PostUp iptables rules |
| DNS not resolving over VPN | DNS not pushed or local DNS conflicts | Set `DNS = ` in client config; check `/etc/resolv.conf` |
| OpenVPN TLS handshake fails | Certificate mismatch or expired | Verify CA cert matches; check certificate dates with `openssl x509 -dates` |
| Split tunnel leaks traffic | AllowedIPs too broad | Set only specific subnets in AllowedIPs; verify with `traceroute` |
| Tailscale node unreachable | ACL blocking traffic | Check Tailscale admin ACL policy; verify node is online with `tailscale status` |
| AWS VPN tunnel flapping | Idle timeout or DPD misconfigured | Enable DPD on customer gateway; send periodic keep-alive traffic |
| Slow VPN performance | MTU issues causing fragmentation | Set `MTU = 1420` in WireGuard config; test with `ping -M do -s 1400` |

## Best Practices

- Use WireGuard for modern deployments (simpler, faster, smaller attack surface)
- Implement MFA for VPN access where possible
- Rotate keys regularly (quarterly for WireGuard, annual for OpenVPN certs)
- Monitor VPN connections and alert on anomalies
- Segment VPN access by role using split tunneling or ACLs
- Use pre-shared keys with WireGuard for post-quantum resistance
- Keep VPN software updated to patch security vulnerabilities
- Log all VPN connection events for audit purposes
- Disable VPN access immediately when employees leave
- Test failover for site-to-site VPN connections

## Related Skills

- zero-trust (`zero-trust`) - Modern access patterns
- ssl-tls-management (`ssl-tls-management`) - Certificate management
- firewall-config (`firewall-config`) - Network access control

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
