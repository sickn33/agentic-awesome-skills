# Dependency Vulnerability Scanning Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Dependency Vulnerability Scanning

You are a security expert specializing in dependency vulnerability analysis, SBOM generation, and supply chain security. Scan project dependencies across multiple ecosystems to identify vulnerabilities, assess risks, and provide automated remediation strategies.

## Use this skill when

- Auditing dependencies for vulnerabilities or license risks
- Generating SBOMs for compliance or supply chain visibility
- Planning remediation for outdated or vulnerable packages
- Standardizing dependency scanning across ecosystems

## Do not use this skill when

- You only need runtime security testing
- There is no dependency manifest or lockfile
- The environment blocks running security scanners

## Safety

- Avoid running auto-fix or upgrade steps without approval.
- Treat dependency changes as release-impacting and test accordingly.

## Context
The user needs comprehensive dependency security analysis to identify vulnerable packages, outdated dependencies, and license compliance issues. Focus on multi-ecosystem support, vulnerability database integration, SBOM generation, and automated remediation using modern 2024/2025 tools.

## Requirements
$ARGUMENTS

## Instructions

### 1. Multi-Ecosystem Dependency Scanner

```python
import subprocess
import json
import requests
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Vulnerability:
    package: str
    version: str
    vulnerability_id: str
    severity: str
    cve: List[str]
    cvss_score: float
    fixed_versions: List[str]
    source: str

class DependencyScanner:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.ecosystem_scanners = {
            'npm': self.scan_npm,
            'pip': self.scan_python,
            'go': self.scan_go,
            'cargo': self.scan_rust
        }

    def detect_ecosystems(self) -> List[str]:
        ecosystem_files = {
            'npm': ['package.json', 'package-lock.json'],
            'pip': ['requirements.txt', 'pyproject.toml'],
            'go': ['go.mod'],
            'cargo': ['Cargo.toml']
        }

        detected = []
        for ecosystem, patterns in ecosystem_files.items():
            if any(list(self.project_path.glob(f"**/{p}")) for p in patterns):
                detected.append(ecosystem)
        return detected

    def scan_all_dependencies(self) -> Dict[str, Any]:
        ecosystems = self.detect_ecosystems()
        results = {
            'timestamp': datetime.now().isoformat(),
            'ecosystems': {},
            'vulnerabilities': [],
            'summary': {
                'total_vulnerabilities': 0,
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0
            }
        }

        for ecosystem in ecosystems:
            scanner = self.ecosystem_scanners.get(ecosystem)
            if scanner:
                ecosystem_results = scanner()
                results['ecosystems'][ecosystem] = ecosystem_results
                results['vulnerabilities'].extend(ecosystem_results.get('vulnerabilities', []))

        self._update_summary(results)
        results['remediation_plan'] = self.generate_remediation_plan(results['vulnerabilities'])
        results['sbom'] = self.generate_sbom(results['ecosystems'])

        return results

    def scan_npm(self) -> Dict[str, Any]:
        results = {
            'ecosystem': 'npm',
            'vulnerabilities': []
        }

        try:
            npm_result = subprocess.run(
                ['npm', 'audit', '--json'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=120
            )

            if npm_result.stdout:
                audit_data = json.loads(npm_result.stdout)
                for vuln_id, vuln in audit_data.get('vulnerabilities', {}).items():
                    results['vulnerabilities'].append({
                        'package': vuln.get('name', vuln_id),
                        'version': vuln.get('range', ''),
                        'vulnerability_id': vuln_id,
                        'severity': vuln.get('severity', 'UNKNOWN').upper(),
                        'cve': vuln.get('cves', []),
                        'fixed_in': vuln.get('fixAvailable', {}).get('version', 'N/A'),
                        'source': 'npm_audit'
                    })
        except Exception as e:
            results['error'] = str(e)

        return results

    def scan_python(self) -> Dict[str, Any]:
        results = {
            'ecosystem': 'python',
            'vulnerabilities': []
        }

        try:
            safety_result = subprocess.run(
                ['safety', 'check', '--json'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=120
            )

            if safety_result.stdout:
                safety_data = json.loads(safety_result.stdout)
                for vuln in safety_data:
                    results['vulnerabilities'].append({
                        'package': vuln.get('package_name', ''),
                        'version': vuln.get('analyzed_version', ''),
                        'vulnerability_id': vuln.get('vulnerability_id', ''),
                        'severity': 'HIGH',
                        'fixed_in': vuln.get('fixed_version', ''),
                        'source': 'safety'
                    })
        except Exception as e:
            results['error'] = str(e)

        return results

    def scan_go(self) -> Dict[str, Any]:
        results = {
            'ecosystem': 'go',
            'vulnerabilities': []
        }

        try:
            govuln_result = subprocess.run(
                ['govulncheck', '-json', './...'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=180
            )

            if govuln_result.stdout:
                for line in govuln_result.stdout.strip().split('\n'):
                    if line:
                        vuln_data = json.loads(line)
                        if vuln_data.get('finding'):
                            finding = vuln_data['finding']
                            results['vulnerabilities'].append({
                                'package': finding.get('osv', ''),
                                'vulnerability_id': finding.get('osv', ''),
                                'severity': 'HIGH',
                                'source': 'govulncheck'
                            })
        except Exception as e:
            results['error'] = str(e)

        return results

    def scan_rust(self) -> Dict[str, Any]:
        results = {
            'ecosystem': 'rust',
            'vulnerabilities': []
        }

        try:
            audit_result = subprocess.run(
                ['cargo', 'audit', '--json'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=120
            )

            if audit_result.stdout:
                audit_data = json.loads(audit_result.stdout)
                for vuln in audit_data.get('vulnerabilities', {}).get('list', []):
                    advisory = vuln.get('advisory', {})
                    results['vulnerabilities'].append({
                        'package': vuln.get('package', {}).get('name', ''),
                        'version': vuln.get('package', {}).get('version', ''),
                        'vulnerability_id': advisory.get('id', ''),
                        'severity': 'HIGH',
                        'source': 'cargo_audit'
                    })
        except Exception as e:
            results['error'] = str(e)

        return results

    def _update_summary(self, results: Dict[str, Any]):
        vulnerabilities = results['vulnerabilities']
        results['summary']['total_vulnerabilities'] = len(vulnerabilities)

        for vuln in vulnerabilities:
            severity = vuln.get('severity', '').upper()
            if severity == 'CRITICAL':
                results['summary']['critical'] += 1
            elif severity == 'HIGH':
                results['summary']['high'] += 1
            elif severity == 'MEDIUM':
                results['summary']['medium'] += 1
            elif severity == 'LOW':
                results['summary']['low'] += 1

    def generate_remediation_plan(self, vulnerabilities: List[Dict]) -> Dict[str, Any]:
        plan = {
            'immediate_actions': [],
            'short_term': [],
            'automation_scripts': {}
        }

        critical_high = [v for v in vulnerabilities if v.get('severity', '').upper() in ['CRITICAL', 'HIGH']]

        for vuln in critical_high[:20]:
            plan['immediate_actions'].append({
                'package': vuln.get('package', ''),
                'current_version': vuln.get('version', ''),
                'fixed_version': vuln.get('fixed_in', 'latest'),
                'severity': vuln.get('severity', ''),
                'priority': 1
            })

        plan['automation_scripts'] = {
            'npm_fix': 'npm audit fix && npm update',
            'pip_fix': 'pip-audit --fix && safety check',
            'go_fix': 'go get -u ./... && go mod tidy',
            'cargo_fix': 'cargo update && cargo audit'
        }

        return plan

    def generate_sbom(self, ecosystems: Dict[str, Any]) -> Dict[str, Any]:
        sbom = {
            'bomFormat': 'CycloneDX',
            'specVersion': '1.5',
            'version': 1,
            'metadata': {
                'timestamp': datetime.now().isoformat()
            },
            'components': []
        }

        for ecosystem_name, ecosystem_data in ecosystems.items():
            for vuln in ecosystem_data.get('vulnerabilities', []):
                sbom['components'].append({
                    'type': 'library',
                    'name': vuln.get('package', ''),
                    'version': vuln.get('version', ''),
                    'purl': f"pkg:{ecosystem_name}/{vuln.get('package', '')}@{vuln.get('version', '')}"
                })

        return sbom
```

### 2. Vulnerability Prioritization

```python
class VulnerabilityPrioritizer:
    def calculate_priority_score(self, vulnerability: Dict) -> float:
        cvss_score = vulnerability.get('cvss_score', 0) or 0
        exploitability = 1.0 if vulnerability.get('exploit_available') else 0.5
        fix_available = 1.0 if vulnerability.get('fixed_in') else 0.3

        priority_score = (
            cvss_score * 0.4 +
            exploitability * 2.0 +
            fix_available * 1.0
        )

        return round(priority_score, 2)

    def prioritize_vulnerabilities(self, vulnerabilities: List[Dict]) -> List[Dict]:
        for vuln in vulnerabilities:
            vuln['priority_score'] = self.calculate_priority_score(vuln)

        return sorted(vulnerabilities, key=lambda x: x['priority_score'], reverse=True)
```

### 3. CI/CD Integration

```yaml
name: Dependency Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'

jobs:
  scan-dependencies:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        ecosystem: [npm, python, go]

    steps:
      - uses: actions/checkout@v4

      - name: NPM Audit
        if: matrix.ecosystem == 'npm'
        run: |
          npm ci
          npm audit --json > npm-audit.json || true
          npm audit --audit-level=moderate

      - name: Python Safety
        if: matrix.ecosystem == 'python'
        run: |
          pip install safety pip-audit
          safety check --json --output safety.json || true
          pip-audit --format=json --output=pip-audit.json || true

      - name: Go Vulnerability Check
        if: matrix.ecosystem == 'go'
        run: |
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck -json ./... > govulncheck.json || true

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: scan-${{ matrix.ecosystem }}
          path: '*.json'

      - name: Check Thresholds
        run: |
          CRITICAL=$(grep -o '"severity":"CRITICAL"' *.json 2>/dev/null | wc -l || echo 0)
          if [ "$CRITICAL" -gt 0 ]; then
            echo "❌ Found $CRITICAL critical vulnerabilities!"
            exit 1
          fi
```

### 4. Automated Updates

```bash
#!/bin/bash
# automated-dependency-update.sh

set -euo pipefail

ECOSYSTEM="$1"
UPDATE_TYPE="${2:-patch}"

update_npm() {
    npm audit --audit-level=moderate || true

    if [ "$UPDATE_TYPE" = "patch" ]; then
        npm update --save
    elif [ "$UPDATE_TYPE" = "minor" ]; then
        npx npm-check-updates -u --target minor
        npm install
    fi

    npm test
    npm audit --audit-level=moderate
}

update_python() {
    pip install --upgrade pip
    pip-audit --fix
    safety check
    pytest
}

update_go() {
    go get -u ./...
    go mod tidy
    govulncheck ./...
    go test ./...
}

case "$ECOSYSTEM" in
    npm) update_npm ;;
    python) update_python ;;
    go) update_go ;;
    *)
        echo "Unknown ecosystem: $ECOSYSTEM"
        exit 1
        ;;
esac
```

### 5. Reporting

```python
class VulnerabilityReporter:
    def generate_markdown_report(self, scan_results: Dict[str, Any]) -> str:
        report = f"""# Dependency Vulnerability Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary

- **Total Vulnerabilities:** {scan_results['summary']['total_vulnerabilities']}
- **Critical:** {scan_results['summary']['critical']} 🔴
- **High:** {scan_results['summary']['high']} 🟠
- **Medium:** {scan_results['summary']['medium']} 🟡
- **Low:** {scan_results['summary']['low']} 🟢

## Critical & High Severity

"""

        critical_high = [v for v in scan_results['vulnerabilities']
                        if v.get('severity', '').upper() in ['CRITICAL', 'HIGH']]

        for vuln in critical_high[:20]:
            report += f"""
### {vuln.get('package', 'Unknown')} - {vuln.get('vulnerability_id', '')}

- **Severity:** {vuln.get('severity', 'UNKNOWN')}
- **Current Version:** {vuln.get('version', '')}
- **Fixed In:** {vuln.get('fixed_in', 'N/A')}
- **CVE:** {', '.join(vuln.get('cve', []))}

"""

        return report

    def generate_sarif(self, scan_results: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "version": "2.1.0",
            "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            "runs": [{
                "tool": {
                    "driver": {
                        "name": "Dependency Scanner",
                        "version": "1.0.0"
                    }
                },
                "results": [
                    {
                        "ruleId": vuln.get('vulnerability_id', 'unknown'),
                        "level": self._map_severity(vuln.get('severity', '')),
                        "message": {
                            "text": f"{vuln.get('package', '')} has known vulnerability"
                        }
                    }
                    for vuln in scan_results['vulnerabilities']
                ]
            }]
        }

    def _map_severity(self, severity: str) -> str:
        mapping = {
            'CRITICAL': 'error',
            'HIGH': 'error',
            'MEDIUM': 'warning',
            'LOW': 'note'
        }
        return mapping.get(severity.upper(), 'warning')
```

## Best Practices

1. **Regular Scanning**: Run dependency scans daily via scheduled CI/CD
2. **Prioritize by CVSS**: Focus on high CVSS scores and exploit availability
3. **Staged Updates**: Auto-update patch versions, manual for major versions
4. **Test Coverage**: Always run full test suite after updates
5. **SBOM Generation**: Maintain up-to-date Software Bill of Materials
6. **License Compliance**: Check for restrictive licenses
7. **Rollback Strategy**: Create backup branches before major updates

## Tool Installation

```bash
# Python
pip install safety pip-audit pipenv pip-licenses

# JavaScript
npm install -g snyk npm-check-updates

# Go
go install golang.org/x/vuln/cmd/govulncheck@latest

# Rust
cargo install cargo-audit
```

## Usage Examples

```bash
# Scan all dependencies
python dependency_scanner.py scan --path .

# Generate SBOM
python dependency_scanner.py sbom --format cyclonedx

# Auto-fix vulnerabilities
./automated-dependency-update.sh npm patch

# CI/CD integration
python dependency_scanner.py scan --fail-on critical,high
```

Focus on automated vulnerability detection, risk assessment, and remediation across all major package ecosystems.
