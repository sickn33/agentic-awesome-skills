---
name: pci-dss-compliance
description: Implement PCI DSS requirements for payment card data. Configure cardholder
  data environment and security controls. Use when processing payment cards.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# PCI DSS Compliance

Implement PCI DSS v4.0 requirements for protecting cardholder data across the Cardholder Data Environment (CDE), including network segmentation, encryption, access controls, and ongoing testing.

## When to Use

- Processing, storing, or transmitting payment card data
- Scoping the Cardholder Data Environment for PCI assessment
- Selecting the appropriate Self-Assessment Questionnaire (SAQ)
- Implementing network segmentation to reduce CDE scope
- Preparing for QSA assessment or ASV scanning

## SAQ Types and Applicability

```yaml
saq_types:
  SAQ_A:
    description: "Card-not-present merchants using fully outsourced payment"
    applies_when:
      - All payment processing fully outsourced to PCI-compliant third party
      - No electronic storage, processing, or transmission of cardholder data
      - Only payment page redirects or iframes from compliant provider
    requirements: ~22 questions

  SAQ_A_EP:
    description: "E-commerce merchants with website that affects payment security"
    applies_when:
      - E-commerce channel only
      - Website controls redirect to or loads payment page from third party
      - No direct processing but website could affect transaction security
    requirements: ~191 questions

  SAQ_B:
    description: "Merchants with only imprint machines or standalone terminals"
    applies_when:
      - Only standalone POS terminals (dial-out or IP connected)
      - No electronic cardholder data storage
      - No e-commerce channel
    requirements: ~41 questions

  SAQ_C:
    description: "Merchants with payment application systems connected to internet"
    applies_when:
      - Payment application connected to internet
      - No electronic cardholder data storage
      - No e-commerce channel
    requirements: ~160 questions

  SAQ_D:
    description: "All other merchants and all service providers"
    applies_when:
      - Stores cardholder data electronically
      - Does not fit any other SAQ type
      - Service providers eligible for SAQ D
    requirements: "Full set of PCI DSS requirements"

  scope_reduction_strategies:
    - Use tokenization to replace PAN with non-sensitive tokens
    - Use P2PE (Point-to-Point Encryption) validated solutions
    - Outsource payment processing to reduce your CDE footprint
    - Implement network segmentation to isolate CDE
```

## PCI DSS v4.0 Requirements Overview

```yaml
requirements:
  req_1_network_security:
    "1.1": "Network security controls defined and maintained"
    "1.2": "Network security controls configured and maintained"
    "1.3": "Network access to and from CDE is restricted"
    "1.4": "Network connections between trusted and untrusted networks controlled"
    "1.5": "Risks to CDE from devices connecting to untrusted networks mitigated"

  req_2_secure_configuration:
    "2.1": "Secure configuration standards defined and applied"
    "2.2": "System components configured and managed securely"

  req_3_protect_stored_data:
    "3.1": "Processes for protecting stored account data defined"
    "3.2": "Storage of account data is minimized"
    "3.3": "Sensitive authentication data not stored after authorization"
    "3.4": "PAN masked when displayed (first 6, last 4 maximum)"
    "3.5": "PAN secured wherever stored"
    "3.6": "Cryptographic keys managed securely"
    "3.7": "Key management procedures documented"

  req_4_transmission_encryption:
    "4.1": "Strong cryptography protects cardholder data during transmission"
    "4.2": "PAN protected when sent via end-user messaging"

  req_5_malware_protection:
    "5.1": "Processes to protect against malware defined"
    "5.2": "Malware prevented or detected and addressed"
    "5.3": "Anti-malware mechanisms active and maintained"
    "5.4": "Anti-phishing mechanisms protect against phishing"

  req_6_secure_development:
    "6.1": "Secure development processes defined"
    "6.2": "Bespoke and custom software developed securely"
    "6.3": "Security vulnerabilities identified and addressed"
    "6.4": "Public-facing web applications protected against attacks"
    "6.5": "Changes to all system components managed securely"

  req_7_access_restriction:
    "7.1": "Access to system components and data restricted by business need"
    "7.2": "Access appropriately defined and assigned"
    "7.3": "Access to system components and data managed via access control"

  req_8_user_identification:
    "8.1": "Processes for user identification defined"
    "8.2": "User identification and accounts managed"
    "8.3": "Strong authentication established"
    "8.4": "MFA implemented for all access into CDE"
    "8.5": "MFA systems configured to prevent misuse"
    "8.6": "System and application accounts managed"

  req_9_physical_access:
    "9.1": "Physical access controls defined"
    "9.2": "Physical access to CDE managed"
    "9.3": "Physical access for personnel and visitors authorized"
    "9.4": "Media with cardholder data managed securely"
    "9.5": "POI devices protected from tampering"

  req_10_logging:
    "10.1": "Audit logging processes defined"
    "10.2": "Audit logs record required events"
    "10.3": "Audit logs protected from destruction and modification"
    "10.4": "Audit logs reviewed for anomalies"
    "10.5": "Audit log history retained"
    "10.6": "Time synchronization mechanisms configured"
    "10.7": "Audit logs retained for at least 12 months (3 months immediately available)"

  req_11_testing:
    "11.1": "Security testing processes defined"
    "11.2": "Wireless access points managed"
    "11.3": "Vulnerabilities identified and addressed"
    "11.4": "External and internal penetration testing performed"
    "11.5": "Network intrusions and changes detected and responded to"
    "11.6": "Unauthorized changes to payment pages detected"

  req_12_policies:
    "12.1": "Information security policy established"
    "12.2": "Acceptable use policies defined"
    "12.3": "Risks to CDE formally identified and managed"
    "12.4": "PCI DSS compliance managed"
    "12.5": "PCI DSS scope documented and validated"
    "12.6": "Security awareness program"
    "12.8": "Third-party service providers managed"
    "12.9": "TPSPs acknowledge responsibility for cardholder data"
    "12.10": "Security incidents responded to immediately"
```

## Network Segmentation Architecture

```
                    ┌──────────────────────────────────────┐
                    │            INTERNET                    │
                    └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────┐
                    │       DMZ (Public Subnet)              │
                    │  WAF → Load Balancer → Web Servers     │
                    └──────────────┬───────────────────────┘
                                   │ Firewall (Req 1.3)
                    ┌──────────────▼───────────────────────┐
                    │    CDE (Cardholder Data Environment)   │
                    │  ┌─────────┐  ┌──────────┐            │
                    │  │ Payment │  │ Card DB  │            │
                    │  │ App     │  │(encrypted)│            │
                    │  └─────────┘  └──────────┘            │
                    │  ┌─────────┐  ┌──────────┐            │
                    │  │Token Svc│  │ HSM/KMS  │            │
                    │  └─────────┘  └──────────┘            │
                    └──────────────┬───────────────────────┘
                                   │ Firewall (Req 1.3)
                    ┌──────────────▼───────────────────────┐
                    │     Non-CDE (Corporate Network)        │
                    │  App servers, internal tools            │
                    │  (no cardholder data)                   │
                    └──────────────────────────────────────┘
```

```bash
# AWS Security Group for CDE isolation
aws ec2 create-security-group \
  --group-name cde-app-sg \
  --description "CDE Application Security Group" \
  --vpc-id vpc-CDE

# Allow only HTTPS from WAF/ALB
aws ec2 authorize-security-group-ingress \
  --group-id sg-CDE-APP \
  --protocol tcp --port 443 \
  --source-group sg-ALB

# CDE database - only accessible from CDE app servers
aws ec2 create-security-group \
  --group-name cde-db-sg \
  --description "CDE Database Security Group" \
  --vpc-id vpc-CDE

aws ec2 authorize-security-group-ingress \
  --group-id sg-CDE-DB \
  --protocol tcp --port 5432 \
  --source-group sg-CDE-APP

# Deny all other inbound by default (security groups are deny-all by default in AWS)
# Document all rules for Req 1.2 - firewall/security group documentation
```

## Encryption and Tokenization

```yaml
encryption_requirements:
  stored_data_req_3:
    pan_encryption:
      algorithm: AES-256
      mode: GCM (preferred) or CBC with HMAC
      key_storage: HSM or dedicated key management service
      never_store:
        - Full track data (magnetic stripe)
        - CVV/CVC/CAV2
        - PIN / PIN block

    pan_display_masking:
      rule: "Show maximum first 6 and last 4 digits"
      examples:
        masked: "4111 11** **** 1111"
        acceptable_for_business: "First 6 and last 4"
      implementation: "Apply masking at application layer before rendering"

    key_management_req_3_6:
      - Generate keys using approved random number generator
      - Protect keys with key-encrypting keys (KEKs)
      - Store key components separately (split knowledge, dual control)
      - Rotate keys at least annually (or per crypto period)
      - Retire and replace keys when compromised
      - Document key custodian responsibilities

  transmission_req_4:
    protocols:
      required: "TLS 1.2 or higher"
      prohibited: "SSL, TLS 1.0, TLS 1.1"
    cipher_suites:
      preferred:
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
      minimum: "128-bit key strength"
    certificate_management:
      - Use certificates from trusted CAs
      - Verify hostname and certificate validity
      - Monitor certificate expiration

  tokenization_strategy:
    description: "Replace PAN with non-reversible token to reduce CDE scope"
    implementation:
      - Use format-preserving tokens (same length/format as PAN)
      - Token vault in isolated CDE segment
      - Token-to-PAN mapping encrypted and access-controlled
      - De-tokenization requires authenticated API call
      - Log all de-tokenization requests
    scope_benefit: "Systems using only tokens are out of PCI scope"
```

## Vulnerability Management and Testing

```bash
# Req 11.3 - Internal vulnerability scanning (quarterly minimum)
# Using OpenVAS or Nessus
openvas-cli --scan-target 10.10.0.0/24 --scan-name "CDE-Quarterly-Scan" \
  --profile "PCI DSS" --output pci-scan-$(date +%Y%m%d).xml

# Req 11.3 - External ASV scanning (quarterly, must pass)
# Schedule with Approved Scanning Vendor (Qualys, Tenable, etc.)
# ASV scan must show no vulnerabilities with CVSS >= 4.0

# Req 6.3 - Patch management
# Check for critical patches on CDE systems
yum check-update --security  # RHEL/CentOS
apt list --upgradable 2>/dev/null | grep -i security  # Debian/Ubuntu

# Req 11.4 - Penetration testing (annual for external, internal, and segmentation)
# Must be performed by qualified internal resource or third party
# Test both network layer and application layer
# Segmentation testing: verify CDE is isolated from non-CDE networks

# Req 11.5 - File integrity monitoring
# Using AIDE (Advanced Intrusion Detection Environment)
aide --init  # Initialize baseline
aide --check  # Compare against baseline

# OSSEC FIM configuration for CDE systems
# /var/ossec/etc/ossec.conf
# <syscheck>
#   <frequency>3600</frequency>
#   <directories check_all="yes">/etc,/usr/bin,/usr/sbin</directories>
#   <directories check_all="yes">/opt/payment-app</directories>
# </syscheck>
```

## Logging and Monitoring (Req 10)

```yaml
required_audit_events:
  "10.2.1": "All individual user accesses to cardholder data"
  "10.2.2": "All actions taken by any individual with root or admin privileges"
  "10.2.3": "Access to all audit trails"
  "10.2.4": "Invalid logical access attempts"
  "10.2.5": "Changes to identification and authentication credentials"
  "10.2.6": "Initialization, stopping, or pausing of audit logs"
  "10.2.7": "Creation and deletion of system-level objects"

log_entry_requirements:
  "10.3.1": "User identification"
  "10.3.2": "Type of event"
  "10.3.3": "Date and time"
  "10.3.4": "Success or failure indication"
  "10.3.5": "Origination of event"
  "10.3.6": "Identity or name of affected data/resource"

retention:
  minimum: "12 months total"
  immediately_available: "At least 3 months"
  archive: "Remaining months can be in archive storage"

time_synchronization:
  "10.6.1": "Synchronize clocks using NTP"
  "10.6.2": "Time data protected from unauthorized access"
  "10.6.3": "Time settings received from industry-accepted sources"
  ntp_config: |
    # /etc/ntp.conf or chrony.conf for CDE systems
    server 0.pool.ntp.org iburst
    server 1.pool.ntp.org iburst
    driftfile /var/lib/ntp/drift
    restrict default nomodify notrap nopeer noquery
    restrict 127.0.0.1
```

## PCI DSS Compliance Checklist

```yaml
pci_dss_checklist:
  scoping:
    - [ ] CDE boundaries identified and documented
    - [ ] All in-scope systems inventoried
    - [ ] Network segmentation validated
    - [ ] Data flow diagrams current and accurate
    - [ ] SAQ type determined (if applicable)
    - [ ] Third-party service providers identified

  network_security:
    - [ ] Firewalls/security groups restrict CDE access
    - [ ] Default deny rules on all CDE boundaries
    - [ ] Wireless networks segmented from CDE
    - [ ] Remote access uses MFA
    - [ ] All firewall rules documented with business justification
    - [ ] Rules reviewed semi-annually

  data_protection:
    - [ ] PAN masked when displayed (first 6, last 4 max)
    - [ ] Stored PAN encrypted with AES-256 or equivalent
    - [ ] Sensitive auth data not stored after authorization
    - [ ] Encryption keys managed per Req 3.6/3.7
    - [ ] TLS 1.2+ for all cardholder data transmission
    - [ ] Tokenization implemented where feasible

  access_control:
    - [ ] Access restricted on need-to-know basis
    - [ ] Unique IDs for all users
    - [ ] MFA for all access into CDE
    - [ ] MFA for all remote/non-console admin access
    - [ ] Default/vendor passwords changed
    - [ ] Shared/group accounts not used (or tightly controlled)
    - [ ] Access reviewed at least every 6 months

  monitoring:
    - [ ] Audit logs capture all required events (Req 10.2)
    - [ ] Log entries include all required fields (Req 10.3)
    - [ ] Logs protected from modification
    - [ ] Logs retained 12 months (3 months immediately available)
    - [ ] Time synchronization configured (NTP)
    - [ ] Daily log review process or automated alerting
    - [ ] File integrity monitoring on critical files

  testing:
    - [ ] Internal vulnerability scans quarterly
    - [ ] External ASV scans quarterly (passing)
    - [ ] Internal penetration test annually
    - [ ] External penetration test annually
    - [ ] Segmentation test annually (or after changes)
    - [ ] Web application assessment annually (or WAF deployed)
    - [ ] IDS/IPS monitoring all CDE network traffic

  policies:
    - [ ] Information security policy reviewed annually
    - [ ] Security awareness training for all personnel
    - [ ] Incident response plan documented and tested
    - [ ] Third-party service provider compliance confirmed
    - [ ] Risk assessment performed annually
```

## Best Practices

- Minimize CDE scope aggressively using tokenization, P2PE, and outsourced payment processing
- Use network segmentation to isolate the CDE and reduce the number of in-scope systems
- Never store sensitive authentication data (CVV, track data, PIN) after authorization
- Implement MFA for all access into the CDE, not just remote access (v4.0 requirement)
- Automate vulnerability scanning and patch management to maintain continuous compliance
- Deploy file integrity monitoring on all CDE systems to detect unauthorized changes
- Synchronize clocks across all CDE systems using NTP for accurate log correlation
- Conduct internal and external penetration tests annually and after significant changes
- Review all firewall and security group rules semi-annually with documented business justification
- Maintain a current data flow diagram showing all cardholder data transmission and storage points

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
