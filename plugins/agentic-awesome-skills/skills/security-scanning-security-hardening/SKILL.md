---
name: security-scanning-security-hardening
description: "Coordinate multi-layer security scanning and hardening across application, infrastructure, and compliance controls."
risk: unknown
source: community
date_added: "2026-02-27"
---

Implement comprehensive security hardening with defense-in-depth strategy through coordinated multi-agent orchestration:

[Extended thinking: This workflow implements a defense-in-depth security strategy across all application layers. It coordinates specialized security agents to perform comprehensive assessments, implement layered security controls, and establish continuous security monitoring. The approach follows modern DevSecOps principles with shift-left security, automated scanning, and compliance validation. Each phase builds upon previous findings to create a resilient security posture that addresses both current vulnerabilities and future threats.]

## Use this skill when

- Running a coordinated security hardening program
- Establishing defense-in-depth controls across app, infra, and CI/CD
- Prioritizing remediation from scans and threat modeling

## Do not use this skill when

- You only need a quick scan without remediation work
- You lack authorization for security testing or changes
- The environment cannot tolerate invasive security controls

## Instructions

1. Execute Phase 1 to establish a security baseline.
2. Apply Phase 2 remediations for high-risk issues.
3. Implement Phase 3 controls and validate defenses.
4. Complete Phase 4 validation and compliance checks.

## Safety

- Avoid intrusive testing in production without approval.
- Ensure rollback plans exist before hardening changes.

## Phase 1: Comprehensive Security Assessment

### 1. Initial Vulnerability Scanning
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Perform comprehensive security assessment on: $ARGUMENTS. Execute SAST analysis with Semgrep/SonarQube, DAST scanning with OWASP ZAP, dependency audit with Snyk/Trivy, secrets detection with GitLeaks/TruffleHog. Generate SBOM for supply chain analysis. Identify OWASP Top 10 vulnerabilities, CWE weaknesses, and CVE exposures."
- Output: Detailed vulnerability report with CVSS scores, exploitability analysis, attack surface mapping, secrets exposure report, SBOM inventory
- Context: Initial baseline for all remediation efforts

### 2. Threat Modeling and Risk Analysis
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Conduct threat modeling using STRIDE methodology for: $ARGUMENTS. Analyze attack vectors, create attack trees, assess business impact of identified vulnerabilities. Map threats to MITRE ATT&CK framework. Prioritize risks based on likelihood and impact."
- Output: Threat model diagrams, risk matrix with prioritized vulnerabilities, attack scenario documentation, business impact analysis
- Context: Uses vulnerability scan results to inform threat priorities

### 3. Architecture Security Review
- Use Task tool with subagent_type="backend-api-security::backend-architect"
- Prompt: "Review architecture for security weaknesses in: $ARGUMENTS. Evaluate service boundaries, data flow security, authentication/authorization architecture, encryption implementation, network segmentation. Design zero-trust architecture patterns. Reference threat model and vulnerability findings."
- Output: Security architecture assessment, zero-trust design recommendations, service mesh security requirements, data classification matrix
- Context: Incorporates threat model to address architectural vulnerabilities

## Phase 2: Vulnerability Remediation

### 4. Critical Vulnerability Fixes
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Coordinate immediate remediation of critical vulnerabilities (CVSS 7+) in: $ARGUMENTS. Fix SQL injections with parameterized queries, XSS with output encoding, authentication bypasses with secure session management, insecure deserialization with input validation. Apply security patches for CVEs."
- Output: Patched code with vulnerability fixes, security patch documentation, regression test requirements
- Context: Addresses high-priority items from vulnerability assessment

### 5. Backend Security Hardening
- Use Task tool with subagent_type="backend-api-security::backend-security-coder"
- Prompt: "Implement comprehensive backend security controls for: $ARGUMENTS. Add input validation with OWASP ESAPI, implement rate limiting and DDoS protection, secure API endpoints with OAuth2/JWT validation, add encryption for data at rest/transit using AES-256/TLS 1.3. Implement secure logging without PII exposure."
- Output: Hardened API endpoints, validation middleware, encryption implementation, secure configuration templates
- Context: Builds upon vulnerability fixes with preventive controls

### 6. Frontend Security Implementation
- Use Task tool with subagent_type="frontend-mobile-security::frontend-security-coder"
- Prompt: "Implement frontend security measures for: $ARGUMENTS. Configure CSP headers with nonce-based policies, implement XSS prevention with DOMPurify, secure authentication flows with PKCE OAuth2, add SRI for external resources, implement secure cookie handling with SameSite/HttpOnly/Secure flags."
- Output: Secure frontend components, CSP policy configuration, authentication flow implementation, security headers configuration
- Context: Complements backend security with client-side protections

### 7. Mobile Security Hardening
- Use Task tool with subagent_type="frontend-mobile-security::mobile-security-coder"
- Prompt: "Implement mobile app security for: $ARGUMENTS. Add certificate pinning, implement biometric authentication, secure local storage with encryption, obfuscate code with ProGuard/R8, implement anti-tampering and root/jailbreak detection, secure IPC communications."
- Output: Hardened mobile application, security configuration files, obfuscation rules, certificate pinning implementation
- Context: Extends security to mobile platforms if applicable

## Phase 3: Security Controls Implementation

### 8. Authentication and Authorization Enhancement
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Implement modern authentication system for: $ARGUMENTS. Deploy OAuth2/OIDC with PKCE, implement MFA with TOTP/WebAuthn/FIDO2, add risk-based authentication, implement RBAC/ABAC with principle of least privilege, add session management with secure token rotation."
- Output: Authentication service configuration, MFA implementation, authorization policies, session management system
- Context: Strengthens access controls based on architecture review

### 9. Infrastructure Security Controls
- Use Task tool with subagent_type="deployment-strategies::deployment-engineer"
- Prompt: "Deploy infrastructure security controls for: $ARGUMENTS. Configure WAF rules for OWASP protection, implement network segmentation with micro-segmentation, deploy IDS/IPS systems, configure cloud security groups and NACLs, implement DDoS protection with rate limiting and geo-blocking."
- Output: WAF configuration, network security policies, IDS/IPS rules, cloud security configurations
- Context: Implements network-level defenses

### 10. Secrets Management Implementation
- Use Task tool with subagent_type="deployment-strategies::deployment-engineer"
- Prompt: "Implement enterprise secrets management for: $ARGUMENTS. Deploy HashiCorp Vault or AWS Secrets Manager, implement secret rotation policies, remove hardcoded secrets, configure least-privilege IAM roles, implement encryption key management with HSM support."
- Output: Secrets management configuration, rotation policies, IAM role definitions, key management procedures
- Context: Eliminates secrets exposure vulnerabilities

## Phase 4: Validation and Compliance

### 11. Penetration Testing and Validation
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Execute comprehensive penetration testing for: $ARGUMENTS. Perform authenticated and unauthenticated testing, API security testing, business logic testing, privilege escalation attempts. Use Burp Suite, Metasploit, and custom exploits. Validate all security controls effectiveness."
- Output: Penetration test report, proof-of-concept exploits, remediation validation, security control effectiveness metrics
- Context: Validates all implemented security measures

### 12. Compliance and Standards Verification
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Verify compliance with security frameworks for: $ARGUMENTS. Validate against OWASP ASVS Level 2, CIS Benchmarks, SOC2 Type II requirements, GDPR/CCPA privacy controls, HIPAA/PCI-DSS if applicable. Generate compliance attestation reports."
- Output: Compliance assessment report, gap analysis, remediation requirements, audit evidence collection
- Context: Ensures regulatory and industry standard compliance

### 13. Security Monitoring and SIEM Integration
- Use Task tool with subagent_type="incident-response::devops-troubleshooter"
- Prompt: "Implement security monitoring and SIEM for: $ARGUMENTS. Deploy Splunk/ELK/Sentinel integration, configure security event correlation, implement behavioral analytics for anomaly detection, set up automated incident response playbooks, create security dashboards and alerting."
- Output: SIEM configuration, correlation rules, incident response playbooks, security dashboards, alert definitions
- Context: Establishes continuous security monitoring

## Configuration Options
- scanning_depth: "quick" | "standard" | "comprehensive" (default: comprehensive)
- compliance_frameworks: ["OWASP", "CIS", "SOC2", "GDPR", "HIPAA", "PCI-DSS"]
- remediation_priority: "cvss_score" | "exploitability" | "business_impact"
- monitoring_integration: "splunk" | "elastic" | "sentinel" | "custom"
- authentication_methods: ["oauth2", "saml", "mfa", "biometric", "passwordless"]

## Success Criteria
- All critical vulnerabilities (CVSS 7+) remediated
- OWASP Top 10 vulnerabilities addressed
- Zero high-risk findings in penetration testing
- Compliance frameworks validation passed
- Security monitoring detecting and alerting on threats
- Incident response time < 15 minutes for critical alerts
- SBOM generated and vulnerabilities tracked
- All secrets managed through secure vault
- Authentication implements MFA and secure session management
- Security tests integrated into CI/CD pipeline

## Coordination Notes
- Each phase provides detailed findings that inform subsequent phases
- Security-auditor agent coordinates with domain-specific agents for fixes
- All code changes undergo security review before implementation
- Continuous feedback loop between assessment and remediation
- Security findings tracked in centralized vulnerability management system
- Regular security reviews scheduled post-implementation

Security hardening target: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
