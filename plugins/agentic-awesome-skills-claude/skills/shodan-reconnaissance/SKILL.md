---
name: shodan-reconnaissance
description: "Provide systematic methodologies for leveraging Shodan as a reconnaissance tool during penetration testing engagements."
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# Shodan Reconnaissance and Pentesting

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

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
import os

API_KEY = os.environ["SHODAN_API_KEY"]
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

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
