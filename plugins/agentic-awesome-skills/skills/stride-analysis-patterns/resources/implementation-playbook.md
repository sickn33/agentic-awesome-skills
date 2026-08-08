# STRIDE Analysis Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# STRIDE Analysis Patterns

Systematic threat identification using the STRIDE methodology.

## When to Use This Skill

- Starting new threat modeling sessions
- Analyzing existing system architecture
- Reviewing security design decisions
- Creating threat documentation
- Training teams on threat identification
- Compliance and audit preparation

## Core Concepts

### 1. STRIDE Categories

```
S - Spoofing       → Authentication threats
T - Tampering      → Integrity threats
R - Repudiation    → Non-repudiation threats
I - Information    → Confidentiality threats
    Disclosure
D - Denial of      → Availability threats
    Service
E - Elevation of   → Authorization threats
    Privilege
```

### 2. Threat Analysis Matrix

| Category | Question | Control Family |
|----------|----------|----------------|
| **Spoofing** | Can attacker pretend to be someone else? | Authentication |
| **Tampering** | Can attacker modify data in transit/rest? | Integrity |
| **Repudiation** | Can attacker deny actions? | Logging/Audit |
| **Info Disclosure** | Can attacker access unauthorized data? | Encryption |
| **DoS** | Can attacker disrupt availability? | Rate limiting |
| **Elevation** | Can attacker gain higher privileges? | Authorization |

## Templates

### Template 1: STRIDE Threat Model Document

```markdown
# Threat Model: [System Name]

## 1. System Overview

### 1.1 Description
[Brief description of the system and its purpose]

### 1.2 Data Flow Diagram
```
[User] --> [Web App] --> [API Gateway] --> [Backend Services]
                              |
                              v
                        [Database]
```

### 1.3 Trust Boundaries
- **External Boundary**: Internet to DMZ
- **Internal Boundary**: DMZ to Internal Network
- **Data Boundary**: Application to Database

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| User Credentials | High | Authentication tokens, passwords |
| Personal Data | High | PII, financial information |
| Session Data | Medium | Active user sessions |
| Application Logs | Medium | System activity records |
| Configuration | High | System settings, secrets |

## 3. STRIDE Analysis

### 3.1 Spoofing Threats

| ID | Threat | Target | Impact | Likelihood |
|----|--------|--------|--------|------------|
| S1 | Session hijacking | User sessions | High | Medium |
| S2 | Token forgery | JWT tokens | High | Low |
| S3 | Credential stuffing | Login endpoint | High | High |

**Mitigations:**
- [ ] Implement MFA
- [ ] Use secure session management
- [ ] Implement account lockout policies

### 3.2 Tampering Threats

| ID | Threat | Target | Impact | Likelihood |
|----|--------|--------|--------|------------|
| T1 | SQL injection | Database queries | Critical | Medium |
| T2 | Parameter manipulation | API requests | High | High |
| T3 | File upload abuse | File storage | High | Medium |

**Mitigations:**
- [ ] Input validation on all endpoints
- [ ] Parameterized queries
- [ ] File type validation

### 3.3 Repudiation Threats

| ID | Threat | Target | Impact | Likelihood |
|----|--------|--------|--------|------------|
| R1 | Transaction denial | Financial ops | High | Medium |
| R2 | Access log tampering | Audit logs | Medium | Low |
| R3 | Action attribution | User actions | Medium | Medium |

**Mitigations:**
- [ ] Comprehensive audit logging
- [ ] Log integrity protection
- [ ] Digital signatures for critical actions

### 3.4 Information Disclosure Threats

| ID | Threat | Target | Impact | Likelihood |
|----|--------|--------|--------|------------|
| I1 | Data breach | User PII | Critical | Medium |
| I2 | Error message leakage | System info | Low | High |
| I3 | Insecure transmission | Network traffic | High | Medium |

**Mitigations:**
- [ ] Encryption at rest and in transit
- [ ] Sanitize error messages
- [ ] Implement TLS 1.3

### 3.5 Denial of Service Threats

| ID | Threat | Target | Impact | Likelihood |
|----|--------|--------|--------|------------|
| D1 | Resource exhaustion | API servers | High | High |
| D2 | Database overload | Database | Critical | Medium |
| D3 | Bandwidth saturation | Network | High | Medium |

**Mitigations:**
- [ ] Rate limiting
- [ ] Auto-scaling
- [ ] DDoS protection

### 3.6 Elevation of Privilege Threats

| ID | Threat | Target | Impact | Likelihood |
|----|--------|--------|--------|------------|
| E1 | IDOR vulnerabilities | User resources | High | High |
| E2 | Role manipulation | Admin access | Critical | Low |
| E3 | JWT claim tampering | Authorization | High | Medium |

**Mitigations:**
- [ ] Proper authorization checks
- [ ] Principle of least privilege
- [ ] Server-side role validation

## 4. Risk Assessment

### 4.1 Risk Matrix

```
              IMPACT
         Low  Med  High Crit
    Low   1    2    3    4
L   Med   2    4    6    8
I   High  3    6    9    12
K   Crit  4    8   12    16
```

### 4.2 Prioritized Risks

| Rank | Threat | Risk Score | Priority |
|------|--------|------------|----------|
| 1 | SQL Injection (T1) | 12 | Critical |
| 2 | IDOR (E1) | 9 | High |
| 3 | Credential Stuffing (S3) | 9 | High |
| 4 | Data Breach (I1) | 8 | High |

## 5. Recommendations

### Immediate Actions
1. Implement input validation framework
2. Add rate limiting to authentication endpoints
3. Enable comprehensive audit logging

### Short-term (30 days)
1. Deploy WAF with OWASP ruleset
2. Implement MFA for sensitive operations
3. Encrypt all PII at rest

### Long-term (90 days)
1. Security awareness training
2. Penetration testing
3. Bug bounty program
```

### Template 2: STRIDE Analysis Code

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional
import json

class StrideCategory(Enum):
    SPOOFING = "S"
    TAMPERING = "T"
    REPUDIATION = "R"
    INFORMATION_DISCLOSURE = "I"
    DENIAL_OF_SERVICE = "D"
    ELEVATION_OF_PRIVILEGE = "E"


class Impact(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class Likelihood(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class Threat:
    id: str
    category: StrideCategory
    title: str
    description: str
    target: str
    impact: Impact
    likelihood: Likelihood
    mitigations: List[str] = field(default_factory=list)
    status: str = "open"

    @property
    def risk_score(self) -> int:
        return self.impact.value * self.likelihood.value

    @property
    def risk_level(self) -> str:
        score = self.risk_score
        if score >= 12:
            return "Critical"
        elif score >= 6:
            return "High"
        elif score >= 3:
            return "Medium"
        return "Low"


@dataclass
class Asset:
    name: str
    sensitivity: str
    description: str
    data_classification: str


@dataclass
class TrustBoundary:
    name: str
    description: str
    from_zone: str
    to_zone: str


@dataclass
class ThreatModel:
    name: str
    version: str
    description: str
    assets: List[Asset] = field(default_factory=list)
    boundaries: List[TrustBoundary] = field(default_factory=list)
    threats: List[Threat] = field(default_factory=list)

    def add_threat(self, threat: Threat) -> None:
        self.threats.append(threat)

    def get_threats_by_category(self, category: StrideCategory) -> List[Threat]:
        return [t for t in self.threats if t.category == category]

    def get_critical_threats(self) -> List[Threat]:
        return [t for t in self.threats if t.risk_level in ("Critical", "High")]

    def generate_report(self) -> Dict:
        """Generate threat model report."""
        return {
            "summary": {
                "name": self.name,
                "version": self.version,
                "total_threats": len(self.threats),
                "critical_threats": len([t for t in self.threats if t.risk_level == "Critical"]),
                "high_threats": len([t for t in self.threats if t.risk_level == "High"]),
            },
            "by_category": {
                cat.name: len(self.get_threats_by_category(cat))
                for cat in StrideCategory
            },
            "top_risks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "risk_score": t.risk_score,
                    "risk_level": t.risk_level
                }
                for t in sorted(self.threats, key=lambda x: x.risk_score, reverse=True)[:10]
            ]
        }


class StrideAnalyzer:
    """Automated STRIDE analysis helper."""

    STRIDE_QUESTIONS = {
        StrideCategory.SPOOFING: [
            "Can an attacker impersonate a legitimate user?",
            "Are authentication tokens properly validated?",
            "Can session identifiers be predicted or stolen?",
            "Is multi-factor authentication available?",
        ],
        StrideCategory.TAMPERING: [
            "Can data be modified in transit?",
            "Can data be modified at rest?",
            "Are input validation controls sufficient?",
            "Can an attacker manipulate application logic?",
        ],
        StrideCategory.REPUDIATION: [
            "Are all security-relevant actions logged?",
            "Can logs be tampered with?",
            "Is there sufficient attribution for actions?",
            "Are timestamps reliable and synchronized?",
        ],
        StrideCategory.INFORMATION_DISCLOSURE: [
            "Is sensitive data encrypted at rest?",
            "Is sensitive data encrypted in transit?",
            "Can error messages reveal sensitive information?",
            "Are access controls properly enforced?",
        ],
        StrideCategory.DENIAL_OF_SERVICE: [
            "Are rate limits implemented?",
            "Can resources be exhausted by malicious input?",
            "Is there protection against amplification attacks?",
            "Are there single points of failure?",
        ],
        StrideCategory.ELEVATION_OF_PRIVILEGE: [
            "Are authorization checks performed consistently?",
            "Can users access other users' resources?",
            "Can privilege escalation occur through parameter manipulation?",
            "Is the principle of least privilege followed?",
        ],
    }

    def generate_questionnaire(self, component: str) -> List[Dict]:
        """Generate STRIDE questionnaire for a component."""
        questionnaire = []
        for category, questions in self.STRIDE_QUESTIONS.items():
            for q in questions:
                questionnaire.append({
                    "component": component,
                    "category": category.name,
                    "question": q,
                    "answer": None,
                    "notes": ""
                })
        return questionnaire

    def suggest_mitigations(self, category: StrideCategory) -> List[str]:
        """Suggest common mitigations for a STRIDE category."""
        mitigations = {
            StrideCategory.SPOOFING: [
                "Implement multi-factor authentication",
                "Use secure session management",
                "Implement account lockout policies",
                "Use cryptographically secure tokens",
                "Validate authentication at every request",
            ],
            StrideCategory.TAMPERING: [
                "Implement input validation",
                "Use parameterized queries",
                "Apply integrity checks (HMAC, signatures)",
                "Implement Content Security Policy",
                "Use immutable infrastructure",
            ],
            StrideCategory.REPUDIATION: [
                "Enable comprehensive audit logging",
                "Protect log integrity",
                "Implement digital signatures",
                "Use centralized, tamper-evident logging",
                "Maintain accurate timestamps",
            ],
            StrideCategory.INFORMATION_DISCLOSURE: [
                "Encrypt data at rest and in transit",
                "Implement proper access controls",
                "Sanitize error messages",
                "Use secure defaults",
                "Implement data classification",
            ],
            StrideCategory.DENIAL_OF_SERVICE: [
                "Implement rate limiting",
                "Use auto-scaling",
                "Deploy DDoS protection",
                "Implement circuit breakers",
                "Set resource quotas",
            ],
            StrideCategory.ELEVATION_OF_PRIVILEGE: [
                "Implement proper authorization",
                "Follow principle of least privilege",
                "Validate permissions server-side",
                "Use role-based access control",
                "Implement security boundaries",
            ],
        }
        return mitigations.get(category, [])
```

### Template 3: Data Flow Diagram Analysis

```python
from dataclasses import dataclass
from typing import List, Set, Tuple
from enum import Enum

class ElementType(Enum):
    EXTERNAL_ENTITY = "external"
    PROCESS = "process"
    DATA_STORE = "datastore"
    DATA_FLOW = "dataflow"


@dataclass
class DFDElement:
    id: str
    name: str
    type: ElementType
    trust_level: int  # 0 = untrusted, higher = more trusted
    description: str = ""


@dataclass
class DataFlow:
    id: str
    name: str
    source: str
    destination: str
    data_type: str
    protocol: str
    encrypted: bool = False


class DFDAnalyzer:
    """Analyze Data Flow Diagrams for STRIDE threats."""

    def __init__(self):
        self.elements: Dict[str, DFDElement] = {}
        self.flows: List[DataFlow] = []

    def add_element(self, element: DFDElement) -> None:
        self.elements[element.id] = element

    def add_flow(self, flow: DataFlow) -> None:
        self.flows.append(flow)

    def find_trust_boundary_crossings(self) -> List[Tuple[DataFlow, int]]:
        """Find data flows that cross trust boundaries."""
        crossings = []
        for flow in self.flows:
            source = self.elements.get(flow.source)
            dest = self.elements.get(flow.destination)
            if source and dest and source.trust_level != dest.trust_level:
                trust_diff = abs(source.trust_level - dest.trust_level)
                crossings.append((flow, trust_diff))
        return sorted(crossings, key=lambda x: x[1], reverse=True)

    def identify_threats_per_element(self) -> Dict[str, List[StrideCategory]]:
        """Map applicable STRIDE categories to element types."""
        threat_mapping = {
            ElementType.EXTERNAL_ENTITY: [
                StrideCategory.SPOOFING,
                StrideCategory.REPUDIATION,
            ],
            ElementType.PROCESS: [
                StrideCategory.SPOOFING,
                StrideCategory.TAMPERING,
                StrideCategory.REPUDIATION,
                StrideCategory.INFORMATION_DISCLOSURE,
                StrideCategory.DENIAL_OF_SERVICE,
                StrideCategory.ELEVATION_OF_PRIVILEGE,
            ],
            ElementType.DATA_STORE: [
                StrideCategory.TAMPERING,
                StrideCategory.REPUDIATION,
                StrideCategory.INFORMATION_DISCLOSURE,
                StrideCategory.DENIAL_OF_SERVICE,
            ],
            ElementType.DATA_FLOW: [
                StrideCategory.TAMPERING,
                StrideCategory.INFORMATION_DISCLOSURE,
                StrideCategory.DENIAL_OF_SERVICE,
            ],
        }

        result = {}
        for elem_id, elem in self.elements.items():
            result[elem_id] = threat_mapping.get(elem.type, [])
        return result

    def analyze_unencrypted_flows(self) -> List[DataFlow]:
        """Find unencrypted data flows crossing trust boundaries."""
        risky_flows = []
        for flow in self.flows:
            if not flow.encrypted:
                source = self.elements.get(flow.source)
                dest = self.elements.get(flow.destination)
                if source and dest and source.trust_level != dest.trust_level:
                    risky_flows.append(flow)
        return risky_flows

    def generate_threat_enumeration(self) -> List[Dict]:
        """Generate comprehensive threat enumeration."""
        threats = []
        element_threats = self.identify_threats_per_element()

        for elem_id, categories in element_threats.items():
            elem = self.elements[elem_id]
            for category in categories:
                threats.append({
                    "element_id": elem_id,
                    "element_name": elem.name,
                    "element_type": elem.type.value,
                    "stride_category": category.name,
                    "description": f"{category.name} threat against {elem.name}",
                    "trust_level": elem.trust_level
                })

        return threats
```

### Template 4: STRIDE per Interaction

```python
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class Interaction:
    """Represents an interaction between two components."""
    id: str
    source: str
    target: str
    action: str
    data: str
    protocol: str


class StridePerInteraction:
    """Apply STRIDE to each interaction in the system."""

    INTERACTION_THREATS = {
        # Source type -> Target type -> Applicable threats
        ("external", "process"): {
            "S": "External entity spoofing identity to process",
            "T": "Tampering with data sent to process",
            "R": "External entity denying sending data",
            "I": "Data exposure during transmission",
            "D": "Flooding process with requests",
            "E": "Exploiting process to gain privileges",
        },
        ("process", "datastore"): {
            "T": "Process tampering with stored data",
            "R": "Process denying data modifications",
            "I": "Unauthorized data access by process",
            "D": "Process exhausting storage resources",
        },
        ("process", "process"): {
            "S": "Process spoofing another process",
            "T": "Tampering with inter-process data",
            "I": "Data leakage between processes",
            "D": "One process overwhelming another",
            "E": "Process gaining elevated access",
        },
    }

    def analyze_interaction(
        self,
        interaction: Interaction,
        source_type: str,
        target_type: str
    ) -> List[Dict]:
        """Analyze a single interaction for STRIDE threats."""
        threats = []
        key = (source_type, target_type)

        applicable_threats = self.INTERACTION_THREATS.get(key, {})

        for stride_code, description in applicable_threats.items():
            threats.append({
                "interaction_id": interaction.id,
                "source": interaction.source,
                "target": interaction.target,
                "stride_category": stride_code,
                "threat_description": description,
                "context": f"{interaction.action} - {interaction.data}",
            })

        return threats

    def generate_threat_matrix(
        self,
        interactions: List[Interaction],
        element_types: Dict[str, str]
    ) -> List[Dict]:
        """Generate complete threat matrix for all interactions."""
        all_threats = []

        for interaction in interactions:
            source_type = element_types.get(interaction.source, "unknown")
            target_type = element_types.get(interaction.target, "unknown")

            threats = self.analyze_interaction(
                interaction, source_type, target_type
            )
            all_threats.extend(threats)

        return all_threats
```

## Best Practices

### Do's
- **Involve stakeholders** - Security, dev, and ops perspectives
- **Be systematic** - Cover all STRIDE categories
- **Prioritize realistically** - Focus on high-impact threats
- **Update regularly** - Threat models are living documents
- **Use visual aids** - DFDs help communication

### Don'ts
- **Don't skip categories** - Each reveals different threats
- **Don't assume security** - Question every component
- **Don't work in isolation** - Collaborative modeling is better
- **Don't ignore low-probability** - High-impact threats matter
- **Don't stop at identification** - Follow through with mitigations

## Resources

- [Microsoft STRIDE Documentation](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [Threat Modeling: Designing for Security](https://www.wiley.com/en-us/Threat+Modeling%3A+Designing+for+Security-p-9781118809990)
