---
name: wireshark-analysis
description: "Execute comprehensive network traffic analysis using Wireshark to capture, filter, and examine network packets for security investigations, performance optimization, and troubleshooting."
risk: critical
source: community
author: zebbern
date_added: "2026-02-27"
---

# Wireshark Network Traffic Analysis

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Constraints and Guardrails

### Operational Boundaries
- Capture only authorized network traffic
- Handle captured data according to privacy policies
- Avoid capturing sensitive credentials unnecessarily
- Properly secure PCAP files containing sensitive data

### Technical Limitations
- Large captures consume significant memory
- Encrypted traffic content not visible without keys
- High-speed networks may drop packets
- Some protocols require plugins for full decoding

### Best Practices
- Use capture filters to limit data collection
- Save captures regularly during long sessions
- Use display filters rather than deleting packets
- Document analysis findings and methodology

## Examples

### Example 1: HTTP Credential Analysis

**Scenario**: Investigate potential plaintext credential transmission

```
1. Filter: http.request.method == "POST"
2. Look for login forms
3. Follow HTTP Stream
4. Search for username/password parameters
```

**Finding**: Credentials transmitted in cleartext form data.

### Example 2: Malware C2 Detection

**Scenario**: Identify command and control traffic

```
1. Filter: dns
2. Look for unusual query patterns
3. Check for high-frequency beaconing
4. Identify domains with random-looking names
5. Filter: ip.dst == SUSPICIOUS_IP
6. Analyze traffic patterns
```

**Indicators**:
- Regular timing intervals
- Encoded/encrypted payloads
- Unusual ports or protocols

### Example 3: Network Troubleshooting

**Scenario**: Diagnose slow web application

```
1. Filter: ip.addr == WEB_SERVER
2. Check Statistics > Service Response Time
3. Filter: tcp.analysis.retransmission
4. Review I/O Graph for patterns
5. Check for high latency or packet loss
```

**Finding**: TCP retransmissions indicating network congestion.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
