# Regulatory Compliance Check Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Regulatory Compliance Check

You are a compliance expert specializing in regulatory requirements for software systems including GDPR, HIPAA, SOC2, PCI-DSS, and other industry standards. Perform comprehensive compliance audits and provide implementation guidance for achieving and maintaining compliance.

## Use this skill when

- Assessing compliance readiness for GDPR, HIPAA, SOC2, or PCI-DSS
- Building control checklists and audit evidence
- Designing compliance monitoring and reporting

## Do not use this skill when

- You need legal counsel or formal certification
- You do not have scope approval or access to required evidence
- You only need a one-off security scan

## Safety

- Avoid claiming compliance without a formal audit.
- Protect sensitive data and limit access to audit artifacts.

## Context
The user needs to ensure their application meets regulatory requirements and industry standards. Focus on practical implementation of compliance controls, automated monitoring, and audit trail generation.

## Requirements
$ARGUMENTS

## Instructions

### 1. Compliance Framework Analysis

Identify applicable regulations and standards:

**Regulatory Mapping**
```python
class ComplianceAnalyzer:
    def __init__(self):
        self.regulations = {
            'GDPR': {
                'scope': 'EU data protection',
                'applies_if': [
                    'Processing EU residents data',
                    'Offering goods/services to EU',
                    'Monitoring EU residents behavior'
                ],
                'key_requirements': [
                    'Privacy by design',
                    'Data minimization',
                    'Right to erasure',
                    'Data portability',
                    'Consent management',
                    'DPO appointment',
                    'Privacy notices',
                    'Data breach notification (72hrs)'
                ]
            },
            'HIPAA': {
                'scope': 'Healthcare data protection (US)',
                'applies_if': [
                    'Healthcare providers',
                    'Health plan providers', 
                    'Healthcare clearinghouses',
                    'Business associates'
                ],
                'key_requirements': [
                    'PHI encryption',
                    'Access controls',
                    'Audit logs',
                    'Business Associate Agreements',
                    'Risk assessments',
                    'Employee training',
                    'Incident response',
                    'Physical safeguards'
                ]
            },
            'SOC2': {
                'scope': 'Service organization controls',
                'applies_if': [
                    'SaaS providers',
                    'Data processors',
                    'Cloud services'
                ],
                'trust_principles': [
                    'Security',
                    'Availability', 
                    'Processing integrity',
                    'Confidentiality',
                    'Privacy'
                ]
            },
            'PCI-DSS': {
                'scope': 'Payment card data security',
                'applies_if': [
                    'Accept credit/debit cards',
                    'Process card payments',
                    'Store card data',
                    'Transmit card data'
                ],
                'compliance_levels': {
                    'Level 1': '>6M transactions/year',
                    'Level 2': '1M-6M transactions/year',
                    'Level 3': '20K-1M transactions/year',
                    'Level 4': '<20K transactions/year'
                }
            }
        }
    
    def determine_applicable_regulations(self, business_info):
        """
        Determine which regulations apply based on business context
        """
        applicable = []
        
        # Check each regulation
        for reg_name, reg_info in self.regulations.items():
            if self._check_applicability(business_info, reg_info):
                applicable.append({
                    'regulation': reg_name,
                    'reason': self._get_applicability_reason(business_info, reg_info),
                    'priority': self._calculate_priority(business_info, reg_name)
                })
        
        return sorted(applicable, key=lambda x: x['priority'], reverse=True)
```

### 2. Data Privacy Compliance

Implement privacy controls:

**GDPR Implementation**
```python
class GDPRCompliance:
    def implement_privacy_controls(self):
        """
        Implement GDPR-required privacy controls
        """
        controls = {}
        
        # 1. Consent Management
        controls['consent_management'] = '''
class ConsentManager:
    def __init__(self):
        self.consent_types = [
            'marketing_emails',
            'analytics_tracking',
            'third_party_sharing',
            'profiling'
        ]
    
    def record_consent(self, user_id, consent_type, granted):
        """
        Record user consent with full audit trail
        """
        consent_record = {
            'user_id': user_id,
            'consent_type': consent_type,
            'granted': granted,
            'timestamp': datetime.utcnow(),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'version': self.get_current_privacy_policy_version(),
            'method': 'explicit_checkbox'  # Not pre-ticked
        }
        
        # Store in append-only audit log
        self.consent_audit_log.append(consent_record)
        
        # Update current consent status
        self.update_user_consents(user_id, consent_type, granted)
        
        return consent_record
    
    def verify_consent(self, user_id, consent_type):
        """
        Verify if user has given consent for specific processing
        """
        consent = self.get_user_consent(user_id, consent_type)
        return consent and consent['granted'] and not consent.get('withdrawn')
'''

        # 2. Right to Erasure (Right to be Forgotten)
        controls['right_to_erasure'] = '''
class DataErasureService:
    def process_erasure_request(self, user_id, verification_token):
        """
        Process GDPR Article 17 erasure request
        """
        # Verify request authenticity
        if not self.verify_erasure_token(user_id, verification_token):
            raise ValueError("Invalid erasure request")
        
        erasure_log = {
            'user_id': user_id,
            'requested_at': datetime.utcnow(),
            'data_categories': []
        }
        
        # 1. Personal data
        self.erase_user_profile(user_id)
        erasure_log['data_categories'].append('profile')
        
        # 2. User-generated content (anonymize instead of delete)
        self.anonymize_user_content(user_id)
        erasure_log['data_categories'].append('content_anonymized')
        
        # 3. Analytics data
        self.remove_from_analytics(user_id)
        erasure_log['data_categories'].append('analytics')
        
        # 4. Backup data (schedule deletion)
        self.schedule_backup_deletion(user_id)
        erasure_log['data_categories'].append('backups_scheduled')
        
        # 5. Notify third parties
        self.notify_processors_of_erasure(user_id)
        
        # Keep minimal record for legal compliance
        self.store_erasure_record(erasure_log)
        
        return {
            'status': 'completed',
            'erasure_id': erasure_log['id'],
            'categories_erased': erasure_log['data_categories']
        }
'''

        # 3. Data Portability
        controls['data_portability'] = '''
class DataPortabilityService:
    def export_user_data(self, user_id, format='json'):
        """
        GDPR Article 20 - Data portability
        """
        user_data = {
            'export_date': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'format_version': '2.0',
            'data': {}
        }
        
        # Collect all user data
        user_data['data']['profile'] = self.get_user_profile(user_id)
        user_data['data']['preferences'] = self.get_user_preferences(user_id)
        user_data['data']['content'] = self.get_user_content(user_id)
        user_data['data']['activity'] = self.get_user_activity(user_id)
        user_data['data']['consents'] = self.get_consent_history(user_id)
        
        # Format based on request
        if format == 'json':
            return json.dumps(user_data, indent=2)
        elif format == 'csv':
            return self.convert_to_csv(user_data)
        elif format == 'xml':
            return self.convert_to_xml(user_data)
'''
        
        return controls

**Privacy by Design**
```python
# Implement privacy by design principles
class PrivacyByDesign:
    def implement_data_minimization(self):
        """
        Collect only necessary data
        """
        # Before (collecting too much)
        bad_user_model = {
            'email': str,
            'password': str,
            'full_name': str,
            'date_of_birth': date,
            'ssn': str,  # Unnecessary
            'address': str,  # Unnecessary for basic service
            'phone': str,  # Unnecessary
            'gender': str,  # Unnecessary
            'income': int  # Unnecessary
        }
        
        # After (data minimization)
        good_user_model = {
            'email': str,  # Required for authentication
            'password_hash': str,  # Never store plain text
            'display_name': str,  # Optional, user-provided
            'created_at': datetime,
            'last_login': datetime
        }
        
        return good_user_model
    
    def implement_pseudonymization(self):
        """
        Replace identifying fields with pseudonyms
        """
        def pseudonymize_record(record):
            # Generate consistent pseudonym
            user_pseudonym = hashlib.sha256(
                f"{record['user_id']}{SECRET_SALT}".encode()
            ).hexdigest()[:16]
            
            return {
                'pseudonym': user_pseudonym,
                'data': {
                    # Remove direct identifiers
                    'age_group': self._get_age_group(record['age']),
                    'region': self._get_region(record['ip_address']),
                    'activity': record['activity_data']
                }
            }
```

### 3. Security Compliance

Implement security controls for various standards:

**SOC2 Security Controls**
```python
class SOC2SecurityControls:
    def implement_access_controls(self):
        """
        SOC2 CC6.1 - Logical and physical access controls
        """
        controls = {
            'authentication': '''
# Multi-factor authentication
class MFAEnforcement:
    def enforce_mfa(self, user, resource_sensitivity):
        if resource_sensitivity == 'high':
            return self.require_mfa(user)
        elif resource_sensitivity == 'medium' and user.is_admin:
            return self.require_mfa(user)
        return self.standard_auth(user)
    
    def require_mfa(self, user):
        factors = []
        
        # Factor 1: Password (something you know)
        factors.append(self.verify_password(user))
        
        # Factor 2: TOTP/SMS (something you have)
        if user.mfa_method == 'totp':
            factors.append(self.verify_totp(user))
        elif user.mfa_method == 'sms':
            factors.append(self.verify_sms_code(user))
            
        # Factor 3: Biometric (something you are) - optional
        if user.biometric_enabled:
            factors.append(self.verify_biometric(user))
            
        return all(factors)
''',
            'authorization': '''
# Role-based access control
class RBACAuthorization:
    def __init__(self):
        self.roles = {
            'admin': ['read', 'write', 'delete', 'admin'],
            'user': ['read', 'write:own'],
            'viewer': ['read']
        }
        
    def check_permission(self, user, resource, action):
        user_permissions = self.get_user_permissions(user)
        
        # Check explicit permissions
        if action in user_permissions:
            return True
            
        # Check ownership-based permissions
        if f"{action}:own" in user_permissions:
            return self.user_owns_resource(user, resource)
            
        # Log denied access attempt
        self.log_access_denied(user, resource, action)
        return False
''',
            'encryption': '''
# Encryption at rest and in transit
class EncryptionControls:
    def __init__(self):
        self.kms = KeyManagementService()
        
    def encrypt_at_rest(self, data, classification):
        if classification == 'sensitive':
            # Use envelope encryption
            dek = self.kms.generate_data_encryption_key()
            encrypted_data = self.encrypt_with_key(data, dek)
            encrypted_dek = self.kms.encrypt_key(dek)
            
            return {
                'data': encrypted_data,
                'encrypted_key': encrypted_dek,
                'algorithm': 'AES-256-GCM',
                'key_id': self.kms.get_current_key_id()
            }
    
    def configure_tls(self):
        return {
            'min_version': 'TLS1.2',
            'ciphers': [
                'ECDHE-RSA-AES256-GCM-SHA384',
                'ECDHE-RSA-AES128-GCM-SHA256'
            ],
            'hsts': 'max-age=31536000; includeSubDomains',
            'certificate_pinning': True
        }
'''
        }
        
        return controls
```

### 4. Audit Logging and Monitoring

Implement comprehensive audit trails:

**Audit Log System**
```python
class ComplianceAuditLogger:
    def __init__(self):
        self.required_events = {
            'authentication': [
                'login_success',
                'login_failure',
                'logout',
                'password_change',
                'mfa_enabled',
                'mfa_disabled'
            ],
            'authorization': [
                'access_granted',
                'access_denied',
                'permission_changed',
                'role_assigned',
                'role_revoked'
            ],
            'data_access': [
                'data_viewed',
                'data_exported',
                'data_modified',
                'data_deleted',
                'bulk_operation'
            ],
            'compliance': [
                'consent_given',
                'consent_withdrawn',
                'data_request',
                'data_erasure',
                'privacy_settings_changed'
            ]
        }
    
    def log_event(self, event_type, details):
        """
        Create tamper-proof audit log entry
        """
        log_entry = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': details.get('user_id'),
            'ip_address': self._get_ip_address(),
            'user_agent': request.headers.get('User-Agent'),
            'session_id': session.get('id'),
            'details': details,
            'compliance_flags': self._get_compliance_flags(event_type)
        }
        
        # Add integrity check
        log_entry['checksum'] = self._calculate_checksum(log_entry)
        
        # Store in immutable log
        self._store_audit_log(log_entry)
        
        # Real-time alerting for critical events
        if self._is_critical_event(event_type):
            self._send_security_alert(log_entry)
        
        return log_entry
    
    def _calculate_checksum(self, entry):
        """
        Create tamper-evident checksum
        """
        # Include previous entry hash for blockchain-like integrity
        previous_hash = self._get_previous_entry_hash()
        
        content = json.dumps(entry, sort_keys=True)
        return hashlib.sha256(
            f"{previous_hash}{content}{SECRET_KEY}".encode()
        ).hexdigest()
```

**Compliance Reporting**
```python
def generate_compliance_report(self, regulation, period):
    """
    Generate compliance report for auditors
    """
    report = {
        'regulation': regulation,
        'period': period,
        'generated_at': datetime.utcnow(),
        'sections': {}
    }
    
    if regulation == 'GDPR':
        report['sections'] = {
            'data_processing_activities': self._get_processing_activities(period),
            'consent_metrics': self._get_consent_metrics(period),
            'data_requests': {
                'access_requests': self._count_access_requests(period),
                'erasure_requests': self._count_erasure_requests(period),
                'portability_requests': self._count_portability_requests(period),
                'response_times': self._calculate_response_times(period)
            },
            'data_breaches': self._get_breach_reports(period),
            'third_party_processors': self._list_processors(),
            'privacy_impact_assessments': self._get_dpias(period)
        }
    
    elif regulation == 'HIPAA':
        report['sections'] = {
            'access_controls': self._audit_access_controls(period),
            'phi_access_log': self._get_phi_access_log(period),
            'risk_assessments': self._get_risk_assessments(period),
            'training_records': self._get_training_compliance(period),
            'business_associates': self._list_bas_with_agreements(),
            'incident_response': self._get_incident_reports(period)
        }
    
    return report
```

### 5. Healthcare Compliance (HIPAA)

Implement HIPAA-specific controls:

**PHI Protection**
```python
class HIPAACompliance:
    def protect_phi(self):
        """
        Implement HIPAA safeguards for Protected Health Information
        """
        # Technical Safeguards
        technical_controls = {
            'access_control': '''
class PHIAccessControl:
    def __init__(self):
        self.minimum_necessary_rule = True
        
    def grant_phi_access(self, user, patient_id, purpose):
        """
        Implement minimum necessary standard
        """
        # Verify legitimate purpose
        if not self._verify_treatment_relationship(user, patient_id, purpose):
            self._log_denied_access(user, patient_id, purpose)
            raise PermissionError("No treatment relationship")
        
        # Grant limited access based on role and purpose
        access_scope = self._determine_access_scope(user.role, purpose)
        
        # Time-limited access
        access_token = {
            'user_id': user.id,
            'patient_id': patient_id,
            'scope': access_scope,
            'purpose': purpose,
            'expires_at': datetime.utcnow() + timedelta(hours=24),
            'audit_id': str(uuid.uuid4())
        }
        
        # Log all access
        self._log_phi_access(access_token)
        
        return access_token
''',
            'encryption': '''
class PHIEncryption:
    def encrypt_phi_at_rest(self, phi_data):
        """
        HIPAA-compliant encryption for PHI
        """
        # Use FIPS 140-2 validated encryption
        encryption_config = {
            'algorithm': 'AES-256-CBC',
            'key_derivation': 'PBKDF2',
            'iterations': 100000,
            'validation': 'FIPS-140-2-Level-2'
        }
        
        # Encrypt PHI fields
        encrypted_phi = {}
        for field, value in phi_data.items():
            if self._is_phi_field(field):
                encrypted_phi[field] = self._encrypt_field(value, encryption_config)
            else:
                encrypted_phi[field] = value
        
        return encrypted_phi
    
    def secure_phi_transmission(self):
        """
        Secure PHI during transmission
        """
        return {
            'protocols': ['TLS 1.2+'],
            'vpn_required': True,
            'email_encryption': 'S/MIME or PGP required',
            'fax_alternative': 'Secure messaging portal'
        }
'''
        }
        
        # Administrative Safeguards
        admin_controls = {
            'workforce_training': '''
class HIPAATraining:
    def track_training_compliance(self, employee):
        """
        Ensure workforce HIPAA training compliance
        """
        required_modules = [
            'HIPAA Privacy Rule',
            'HIPAA Security Rule', 
            'PHI Handling Procedures',
            'Breach Notification',
            'Patient Rights',
            'Minimum Necessary Standard'
        ]
        
        training_status = {
            'employee_id': employee.id,
            'completed_modules': [],
            'pending_modules': [],
            'last_training_date': None,
            'next_due_date': None
        }
        
        for module in required_modules:
            completion = self._check_module_completion(employee.id, module)
            if completion and completion['date'] > datetime.now() - timedelta(days=365):
                training_status['completed_modules'].append(module)
            else:
                training_status['pending_modules'].append(module)
        
        return training_status
'''
        }
        
        return {
            'technical': technical_controls,
            'administrative': admin_controls
        }
```

### 6. Payment Card Compliance (PCI-DSS)

Implement PCI-DSS requirements:

**PCI-DSS Controls**
```python
class PCIDSSCompliance:
    def implement_pci_controls(self):
        """
        Implement PCI-DSS v4.0 requirements
        """
        controls = {
            'cardholder_data_protection': '''
class CardDataProtection:
    def __init__(self):
        # Never store these
        self.prohibited_data = ['cvv', 'cvv2', 'cvc2', 'cid', 'pin', 'pin_block']
        
    def handle_card_data(self, card_info):
        """
        PCI-DSS compliant card data handling
        """
        # Immediately tokenize
        token = self.tokenize_card(card_info)
        
        # If must store, only store allowed fields
        stored_data = {
            'token': token,
            'last_four': card_info['number'][-4:],
            'exp_month': card_info['exp_month'],
            'exp_year': card_info['exp_year'],
            'cardholder_name': self._encrypt(card_info['name'])
        }
        
        # Never log full card number
        self._log_transaction(token, 'XXXX-XXXX-XXXX-' + stored_data['last_four'])
        
        return stored_data
    
    def tokenize_card(self, card_info):
        """
        Replace PAN with token
        """
        # Use payment processor tokenization
        response = payment_processor.tokenize({
            'number': card_info['number'],
            'exp_month': card_info['exp_month'],
            'exp_year': card_info['exp_year']
        })
        
        return response['token']
''',
            'network_segmentation': '''
# Network segmentation for PCI compliance
class PCINetworkSegmentation:
    def configure_network_zones(self):
        """
        Implement network segmentation
        """
        zones = {
            'cde': {  # Cardholder Data Environment
                'description': 'Systems that process, store, or transmit CHD',
                'controls': [
                    'Firewall required',
                    'IDS/IPS monitoring',
                    'No direct internet access',
                    'Quarterly vulnerability scans',
                    'Annual penetration testing'
                ]
            },
            'dmz': {
                'description': 'Public-facing systems',
                'controls': [
                    'Web application firewall',
                    'No CHD storage allowed',
                    'Regular security scanning'
                ]
            },
            'internal': {
                'description': 'Internal corporate network',
                'controls': [
                    'Segmented from CDE',
                    'Limited CDE access',
                    'Standard security controls'
                ]
            }
        }
        
        return zones
''',
            'vulnerability_management': '''
class PCIVulnerabilityManagement:
    def quarterly_scan_requirements(self):
        """
        PCI-DSS quarterly scan requirements
        """
        scan_config = {
            'internal_scans': {
                'frequency': 'quarterly',
                'scope': 'all CDE systems',
                'tool': 'PCI-approved scanning vendor',
                'passing_criteria': 'No high-risk vulnerabilities'
            },
            'external_scans': {
                'frequency': 'quarterly', 
                'performed_by': 'ASV (Approved Scanning Vendor)',
                'scope': 'All external-facing IP addresses',
                'passing_criteria': 'Clean scan with no failures'
            },
            'remediation_timeline': {
                'critical': '24 hours',
                'high': '7 days',
                'medium': '30 days',
                'low': '90 days'
            }
        }
        
        return scan_config
'''
        }
        
        return controls
```

### 7. Continuous Compliance Monitoring

Set up automated compliance monitoring:

**Compliance Dashboard**
```python
class ComplianceDashboard:
    def generate_realtime_dashboard(self):
        """
        Real-time compliance status dashboard
        """
        dashboard = {
            'timestamp': datetime.utcnow(),
            'overall_compliance_score': 0,
            'regulations': {}
        }
        
        # GDPR Compliance Metrics
        dashboard['regulations']['GDPR'] = {
            'score': self.calculate_gdpr_score(),
            'status': 'COMPLIANT',
            'metrics': {
                'consent_rate': '87%',
                'data_requests_sla': '98% within 30 days',
                'privacy_policy_version': '2.1',
                'last_dpia': '2025-06-15',
                'encryption_coverage': '100%',
                'third_party_agreements': '12/12 signed'
            },
            'issues': [
                {
                    'severity': 'medium',
                    'issue': 'Cookie consent banner update needed',
                    'due_date': '2025-08-01'
                }
            ]
        }
        
        # HIPAA Compliance Metrics
        dashboard['regulations']['HIPAA'] = {
            'score': self.calculate_hipaa_score(),
            'status': 'NEEDS_ATTENTION',
            'metrics': {
                'risk_assessment_current': True,
                'workforce_training_compliance': '94%',
                'baa_agreements': '8/8 current',
                'encryption_status': 'All PHI encrypted',
                'access_reviews': 'Completed 2025-06-30',
                'incident_response_tested': '2025-05-15'
            },
            'issues': [
                {
                    'severity': 'high',
                    'issue': '3 employees overdue for training',
                    'due_date': '2025-07-25'
                }
            ]
        }
        
        return dashboard
```

**Automated Compliance Checks**
```yaml
# .github/workflows/compliance-check.yml
name: Compliance Checks

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily compliance check

jobs:
  compliance-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: GDPR Compliance Check
      run: |
        python scripts/compliance/gdpr_checker.py
        
    - name: Security Headers Check
      run: |
        python scripts/compliance/security_headers.py
        
    - name: Dependency License Check
      run: |
        license-checker --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause;ISC'
        
    - name: PII Detection Scan
      run: |
        # Scan for hardcoded PII
        python scripts/compliance/pii_scanner.py
        
    - name: Encryption Verification
      run: |
        # Verify all sensitive data is encrypted
        python scripts/compliance/encryption_checker.py
        
    - name: Generate Compliance Report
      if: always()
      run: |
        python scripts/compliance/generate_report.py > compliance-report.json
        
    - name: Upload Compliance Report
      uses: actions/upload-artifact@v3
      with:
        name: compliance-report
        path: compliance-report.json
```

### 8. Compliance Documentation

Generate required documentation:

**Privacy Policy Generator**
```python
def generate_privacy_policy(company_info, data_practices):
    """
    Generate GDPR-compliant privacy policy
    """
    policy = f"""
# Privacy Policy

**Last Updated**: {datetime.now().strftime('%B %d, %Y')}

## 1. Data Controller
{company_info['name']}
{company_info['address']}
Email: {company_info['privacy_email']}
DPO: {company_info.get('dpo_contact', 'privacy@company.com')}

## 2. Data We Collect
{generate_data_collection_section(data_practices['data_types'])}

## 3. Legal Basis for Processing
{generate_legal_basis_section(data_practices['purposes'])}

## 4. Your Rights
Under GDPR, you have the following rights:
- Right to access your personal data
- Right to rectification 
- Right to erasure ('right to be forgotten')
- Right to restrict processing
- Right to data portability
- Right to object
- Rights related to automated decision making

## 5. Data Retention
{generate_retention_policy(data_practices['retention_periods'])}

## 6. International Transfers
{generate_transfer_section(data_practices['international_transfers'])}

## 7. Contact Us
To exercise your rights, contact: {company_info['privacy_email']}
"""
    
    return policy
```

## Output Format

1. **Compliance Assessment**: Current compliance status across all applicable regulations
2. **Gap Analysis**: Specific areas needing attention with severity ratings
3. **Implementation Plan**: Prioritized roadmap for achieving compliance
4. **Technical Controls**: Code implementations for required controls
5. **Policy Templates**: Privacy policies, consent forms, and notices
6. **Audit Procedures**: Scripts for continuous compliance monitoring
7. **Documentation**: Required records and evidence for auditors
8. **Training Materials**: Workforce compliance training resources

Focus on practical implementation that balances compliance requirements with business operations and user experience.
