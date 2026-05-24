---
id: 'shodan-reconnaissance'
name: shodan-reconnaissance
description: "Provide systematic methodologies for leveraging Shodan as a reconnaissance tool during penetration testing engagements."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
category: security-offensive
tags:
- component
- html
- pentest
- ui
- ux
- vuln
tools:
- claude-code
---

# Shodan Reconnaissance and Pentesting

## Purpose

Provide systematic methodologies for leveraging Shodan as a reconnaissance tool during penetration testing engagements. This skill covers the Shodan web interface, command-line interface (CLI), REST API, search filters, on-demand scanning, and network monitoring capabilities for discovering exposed services, vulnerable systems, and IoT devices.

## Inputs / Prerequisites

- **Shodan Account**: Free or paid account at shodan.io
- **API Key**: Obtained from Shodan account dashboard
- **Target Information**: IP addresses, domains, or network ranges to investigate
- **Shodan CLI**: Python-based command-line tool installed
- **Authorization**: Written permission for reconnaissance on target networks

## Outputs / Deliverables

- **Asset Inventory**: List of discovered hosts, ports, and services
- **Vulnerability Report**: Identified CVEs and exposed vulnerable services
- **Banner Data**: Service banners revealing software versions
- **Network Mapping**: Geographic and organizational distribution of assets
- **Screenshot Gallery**: Visual reconnaissance of exposed interfaces
- **Exported Data**: JSON/CSV files for further analysis

## Core Workflow

### 1. Setup and Configuration

#### Install Shodan CLI
```bash
# Using pip
pip install shodan

# Or easy_install
easy_install shodan

# On BlackArch/Arch Linux
sudo pacman -S python-shodan
```

#### Initialize API Key
```bash
# Set your API key
shodan init YOUR_API_KEY

# Verify setup
shodan info
# Output: Query credits available: 100
#         Scan credits available: 100
```

#### Check Account Status
```bash
# View credits and plan info
shodan info

# Check your external IP
shodan myip

# Check CLI version
shodan version
```

### 2. Basic Host Reconnaissance

#### Query Single Host
```bash
# Get all information about an IP
shodan host 1.1.1.1

# Example output:
# 1.1.1.1
# Hostnames: one.one.one.one
# Country: Australia
# Organization: Mountain View Communications
# Number of open ports: 3
# Ports:
#   53/udp
#   80/tcp
#   443/tcp
```

#### Check if Host is Honeypot
```bash
# Get honeypot probability score
shodan honeyscore 192.168.1.100

# Output: Not a honeypot
#         Score: 0.3
```

### 3. Search Queries

#### Basic Search (Free)
```bash
# Simple keyword search (no credits consumed)
shodan search apache

# Specify output fields
shodan search --fields ip_str,port,os smb
```

#### Filtered Search (1 Credit)
```bash
# Product-specific search
shodan search product:mongodb

# Search with multiple filters
shodan search product:nginx country:US city:"New York"
```

#### Count Results
```bash
# Get result count without consuming credits
shodan count openssh
# Output: 23128

shodan count openssh 7
# Output: 219
```

#### Download Results
```bash
# Download 1000 results (default)
shodan download results.json.gz "apache country:US"

# Download specific number of results
shodan download --limit 5000 results.json.gz "nginx"

# Download all available results
shodan download --limit -1 all_results.json.gz "query"
```

#### Parse Downloaded Data
```bash
# Extract specific fields from downloaded data
shodan parse --fields ip_str,port,hostnames results.json.gz

# Filter by specific criteria
shodan parse --fields location.country_code3,ip_str -f port:22 results.json.gz

# Export to CSV format
shodan parse --fields ip_str,port,org --separator , results.json.gz > results.csv
```

### 4. Search Filters Reference

#### Network Filters
```
ip:1.2.3.4                  # Specific IP address
net:192.168.0.0/24          # Network range (CIDR)
hostname:example.com        # Hostname contains
port:22                     # Specific port
asn:AS15169                 # Autonomous System Number
```

#### Geographic Filters
```
country:US                  # Two-letter country code
country:"United States"     # Full country name
city:"San Francisco"        # City name
state:CA                    # State/region
postal:94102                # Postal/ZIP code
geo:37.7,-122.4             # Lat/long coordinates
```

#### Organization Filters
```
org:"Google"                # Organization name
isp:"Comcast"               # ISP name
```

#### Service/Product Filters
```
product:nginx               # Software product
version:1.14.0              # Software version
os:"Windows Server 2019"    # Operating system
http.title:"Dashboard"      # HTTP page title
http.html:"login"           # HTML content
http.status:200             # HTTP status code
ssl.cert.subject.cn:*.example.com  # SSL certificate
ssl:true                    # Has SSL enabled
```

#### Vulnerability Filters
```
vuln:CVE-2019-0708          # Specific CVE
has_vuln:true               # Has any vulnerability
```

#### Screenshot Filters
```
has_screenshot:true         # Has screenshot available
screenshot.label:webcam     # Screenshot type
```

### 5. On-Demand Scanning

#### Submit Scan
```bash
# Scan single IP (1 credit per IP)
shodan scan submit 192.168.1.100

# Scan with verbose output (shows scan ID)
shodan scan submit --verbose 192.168.1.100

# Scan and save results
shodan scan submit --filename scan_results.json.gz 192.168.1.100
```

#### Monitor Scan Status
```bash
# List recent scans
shodan scan list

# Check specific scan status
shodan scan status SCAN_ID

# Download scan results later
shodan download --limit -1 results.json.gz scan:SCAN_ID
```

#### Available Scan Protocols
```bash
# List available protocols/modules
shodan scan protocols
```

### 6. Statistics and Analysis

#### Get Search Statistics
```bash
# Default statistics (top 10 countries, orgs)
shodan stats nginx

# Custom facets
shodan stats --facets domain,port,asn --limit 5 nginx

# Save to CSV
shodan stats --facets country,org -O stats.csv apache
```

### 7. Network Monitoring

#### Setup Alerts (Web Interface)
```
1. Navigate to Monitor Dashboard
2. Add IP, range, or domain to monitor
3. Configure notification service (email, Slack, webhook)
4. Select trigger events (new service, vulnerability, etc.)
5. View dashboard for exposed services
```

### 8. REST API Usage

#### Direct API Calls
```bash
# Get API info
curl -s "https://api.shodan.io/api-info?key=YOUR_KEY" | jq

# Host lookup
curl -s "https://api.shodan.io/shodan/host/1.1.1.1?key=YOUR_KEY" | jq

# Search query
curl -s "https://api.shodan.io/shodan/host/search?key=YOUR_KEY&query=apache" | jq
```

#### Python Library
```python
import shodan

api = shodan.Shodan('YOUR_API_KEY')

# Search
results = api.search('apache')
print(f'Results found: {results["total"]}')
for result in results['matches']:
    print(f'IP: {result["ip_str"]}')

# Host lookup
host = api.host('1.1.1.1')
print(f'IP: {host["ip_str"]}')
print(f'Organization: {host.get("org", "n/a")}')
for item in host['data']:
    print(f'Port: {item["port"]}')
```

## Quick Reference

### Essential CLI Commands

| Command | Description | Credits |
|---------|-------------|---------|
| `shodan init KEY` | Initialize API key | 0 |
| `shodan info` | Show account info | 0 |
| `shodan myip` | Show your IP | 0 |
| `shodan host IP` | Host details | 0 |
| `shodan count QUERY` | Result count | 0 |
| `shodan search QUERY` | Basic search | 0* |
| `shodan download FILE QUERY` | Save results | 1/100 results |
| `shodan parse FILE` | Extract data | 0 |
| `shodan stats QUERY` | Statistics | 1 |
| `shodan scan submit IP` | On-demand scan | 1/IP |
| `shodan honeyscore IP` | Honeypot check | 0 |

*Filters consume 1 credit per query

### Common Search Queries

| Purpose | Query |
|---------|-------|
| Find webcams | `webcam has_screenshot:true` |
| MongoDB databases | `product:mongodb` |
| Redis servers | `product:redis` |
| Elasticsearch | `product:elastic port:9200` |
| Default passwords | `"default password"` |
| Vulnerable RDP | `port:3389 vuln:CVE-2019-0708` |
| Industrial systems | `port:502 modbus` |
| Cisco devices | `product:cisco` |
| Open VNC | `port:5900 authentication disabled` |
| Exposed FTP | `port:21 anonymous` |
| WordPress sites | `http.component:wordpress` |
| Printers | `"HP-ChaiSOE" port:80` |
| Cameras (RTSP) | `port:554 has_screenshot:true` |
| Jenkins servers | `X-Jenkins port:8080` |
| Docker APIs | `port:2375 product:docker` |

### Useful Filter Combinations

| Scenario | Query |
|---------|-------|
| Target org recon | `org:"Company Name"` |
| Domain enumeration | `hostname:example.com` |
| Network range scan | `net:192.168.0.0/24` |
| SSL cert search | `ssl.cert.subject.cn:*.target.com` |
| Vulnerable servers | `vuln:CVE-2021-44228 country:US` |
| Exposed admin panels | `http.title:"admin" port:443` |
| Database exposure | `port:3306,5432,27017,6379` |

### Credit System

| Action | Credit Type | Cost |
|--------|-------------|------|
| Basic search | Query | 0 (no filters) |
| Filtered search | Query | 1 |
| Download 100 results | Query | 1 |
| Generate report | Query | 1 |
| Scan 1 IP | Scan | 1 |
| Network monitoring | Monitored IPs | Depends on plan |

## Constraints and Limitations

### Operational Boundaries
- Rate limited to 1 request per second
- Scan results not immediate (asynchronous)
- Cannot re-scan same IP within 24 hours (non-Enterprise)
- Free accounts have limited credits
- Some data requires paid subscription

### Data Freshness
- Shodan crawls continuously but data may be days/weeks old
- On-demand scans provide current data but cost credits
- Historical data available with paid plans

### Legal Requirements
- Only perform reconnaissance on authorized targets
- Passive reconnaissance generally legal but verify jurisdiction
- Active scanning (scan submit) requires authorization
- Document all reconnaissance activities

## Examples

### Example 1: Organization Reconnaissance
```bash
# Find all hosts belonging to target organization
shodan search 'org:"Target Company"'

# Get statistics on their infrastructure
shodan stats --facets port,product,country 'org:"Target Company"'

# Download detailed data
shodan download target_data.json.gz 'org:"Target Company"'

# Parse for specific info
shodan parse --fields ip_str,port,product target_data.json.gz
```

### Example 2: Vulnerable Service Discovery
```bash
# Find hosts vulnerable to BlueKeep (RDP CVE)
shodan search 'vuln:CVE-2019-0708 country:US'

# Find exposed Elasticsearch with no auth
shodan search 'product:elastic port:9200 -authentication'

# Find Log4j vulnerable systems
shodan search 'vuln:CVE-2021-44228'
```

### Example 3: IoT Device Discovery
```bash
# Find exposed webcams
shodan search 'webcam has_screenshot:true country:US'

# Find industrial control systems
shodan search 'port:502 product:modbus'

# Find exposed printers
shodan search '"HP-ChaiSOE" port:80'

# Find smart home devices
shodan search 'product:nest'
```

### Example 4: SSL/TLS Certificate Analysis
```bash
# Find hosts with specific SSL cert
shodan search 'ssl.cert.subject.cn:*.example.com'

# Find expired certificates
shodan search 'ssl.cert.expired:true org:"Company"'

# Find self-signed certificates
shodan search 'ssl.cert.issuer.cn:self-signed'
```

### Example 5: Python Automation Script
```python
#!/usr/bin/env python3
import shodan
import json

API_KEY = 'YOUR_API_KEY'
api = shodan.Shodan(API_KEY)

def recon_organization(org_name):
    """Perform reconnaissance on an organization"""
    try:
        # Search for organization
        query = f'org:"{org_name}"'
        results = api.search(query)
        
        print(f"[*] Found {results['total']} hosts for {org_name}")
        
        # Collect unique IPs and ports
        hosts = {}
        for result in results['matches']:
            ip = result['ip_str']
            port = result['port']
            product = result.get('product', 'unknown')
            
            if ip not in hosts:
                hosts[ip] = []
            hosts[ip].append({'port': port, 'product': product})
        
        # Output findings
        for ip, services in hosts.items():
            print(f"\n[+] {ip}")
            for svc in services:
                print(f"    - {svc['port']}/tcp ({svc['product']})")
        
        return hosts
        
    except shodan.APIError as e:
        print(f"Error: {e}")
        return None

if __name__ == '__main__':
    recon_organization("Target Company")
```

### Example 6: Network Range Assessment
```bash
# Scan a /24 network range
shodan search 'net:192.168.1.0/24'

# Get port distribution
shodan stats --facets port 'net:192.168.1.0/24'

# Find specific vulnerabilities in range
shodan search 'net:192.168.1.0/24 vuln:CVE-2021-44228'

# Export all data for range
shodan download network_scan.json.gz 'net:192.168.1.0/24'
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No API Key Configured | Key not initialized | Run `shodan init YOUR_API_KEY` then verify with `shodan info` |
| Query Credits Exhausted | Monthly credits consumed | Use credit-free queries (no filters), wait for reset, or upgrade |
| Host Recently Crawled | Cannot re-scan IP within 24h | Use `shodan host IP` for existing data, or wait 24 hours |
| Rate Limit Exceeded | >1 request/second | Add `time.sleep(1)` between API requests |
| Empty Search Results | Too specific or syntax error | Use quotes for phrases: `'org:"Company Name"'`; broaden criteria |
| Downloaded File Won't Parse | Corrupted or wrong format | Verify with `gunzip -t file.gz`, re-download with `--limit` |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

> ⚠️ **AUTHORIZED USE ONLY** — This skill is intended for authorized security testing, research, and educational purposes only. Misuse may violate laws and regulations.
