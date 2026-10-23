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
The user needs comprehensive dependency security analysis to identify vulnerable packages, outdated dependencies, and license compliance issues. Focus on multi-ecosystem support, vulnerability database integration, SBOM generation, and automated remediation using version-pinned tools and dated advisory data.

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

        results['coverage'] = {
            'status': 'unverified',
            'reason': 'Adapters require pinned schema/exit-code validation; empty lists do not prove a clean scan'
        }
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
                        'affected_range': vuln.get('range', ''),
                        'version': None,  # Resolve installed nodes from the lockfile, not the advisory range.
                        'vulnerability_id': vuln_id,
                        'severity': vuln.get('severity', 'UNKNOWN').upper(),
                        'cve': vuln.get('cves', []),
                        'fixed_in': (vuln['fixAvailable'].get('version')
                                     if isinstance(vuln.get('fixAvailable'), dict) else None),
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
                        'severity': 'UNKNOWN',
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
                decoder = json.JSONDecoder()
                remaining = govuln_result.stdout.lstrip()
                messages = []
                while remaining:
                    value, end = decoder.raw_decode(remaining)
                    messages.append(value)
                    remaining = remaining[end:].lstrip()
                for vuln_data in messages:
                    if isinstance(vuln_data, dict):
                        if vuln_data.get('finding'):
                            finding = vuln_data['finding']
                            results['vulnerabilities'].append({
                                'package': (finding.get('trace') or [{}])[0].get('module', 'UNKNOWN'),
                                'vulnerability_id': finding.get('osv', ''),
                                'severity': 'UNKNOWN',
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
                        'severity': 'UNKNOWN',
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
                'fixed_version': vuln.get('fixed_in'),
                'severity': vuln.get('severity', ''),
                'priority': 1
            })

        plan['automation_scripts'] = {}  # Propose reviewed targeted changes; never bulk-update implicitly.

        return plan

    def generate_sbom(self, ecosystems: Dict[str, Any]) -> Dict[str, Any]:
        # Advisory findings are not a complete inventory/SBOM. No fabricated purls.
        return {"status": "not_generated", "reason": "Use a reviewed full lockfile/artifact SBOM generator"}

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

The previous workflow swallowed scanner errors and grepped a case-sensitive JSON
substring, which could pass empty/malformed reports and ignored Python/Go findings.
Implement one version-pinned adapter per actual workspace, with these gates:

1. Enumerate manifests/lockfiles excluding vendored/generated/install trees and
   run in each matching project directory; recursive detection plus root-only scan
   is incomplete. Missing/unsupported lockfile is an explicit coverage gap.
2. Keep install lifecycle/build scripts disabled unless reviewed execution is
   authorized. Scanners may resolve/build/import packages and send names/versions
   to third-party services; choose an approved isolated environment and data flow.
3. Capture exit code/stdout/stderr separately with time/size limits; classify valid
   findings exit codes separately from missing tools, auth/network/schema errors.
4. Parse the tool's exact schema structurally. Unknown severity is unknown, not
   invented HIGH or zero. govulncheck emits a stream of JSON values, not guaranteed
   one-object-per-line NDJSON; Safety schemas vary by release.
5. Fail the required gate on incomplete coverage/errors or policy-threshold findings;
   do not use `|| true` or grep as a final decision. Upload only restricted,
   redacted result files, not every project JSON manifest/credential file.

### 4. Targeted Updates

`npm update` is not patch-only, `go get -u ./...` updates unrelated dependencies,
and a `latest` fallback invents a fix version. Select the advisory-supported fixed
release compatible with the project, review manifest/lock diff, verify provenance,
then run relevant behavior tests and a fresh scan. Test failures, unresolved
advisories or unsupported versions are reported, not auto-suppressed. A package
advisory match does not establish application reachability or license permission.

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
3. **Staged Updates**: Review compatible targeted fixes; patch labels do not guarantee behavior or license compatibility
4. **Test Coverage**: Always run full test suite after updates
5. **SBOM Generation**: Maintain up-to-date Software Bill of Materials
6. **License Compliance**: Check for restrictive licenses
7. **Rollback Strategy**: Create backup branches before major updates

## Tool and CLI availability

The classes above are illustrative adapters; no `dependency_scanner.py` or
`automated-dependency-update.sh` CLI is bundled. Do not claim the usage commands
ran. Provision only reviewed fixed-version scanner tools through the project's
approved dependency process, without global/latest installs or auto-fix by default.
Generate a real CycloneDX/SPDX SBOM from ALL installed/locked components and their
relationships using a reviewed tool, validate its schema, and distinguish it from
a list of vulnerable components. The SARIF builder is a minimal result sketch,
not a schema-validated or uploaded security scan.

Focus on automated vulnerability detection, risk assessment, and remediation across all major package ecosystems.
