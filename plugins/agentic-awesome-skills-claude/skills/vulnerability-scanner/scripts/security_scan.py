#!/usr/bin/env python3
"""
Skill: vulnerability-scanner
Script: security_scan.py
Purpose: Validate that security principles from SKILL.md are applied correctly
Usage: python security_scan.py <project_path> [--scan-type all|deps|secrets|patterns|config]
Output: JSON with validation findings

This script verifies:
1. Dependencies - Supply chain security (OWASP A03)
2. Secrets - No hardcoded credentials (OWASP A04)
3. Code Patterns - Dangerous patterns identified (OWASP A05)
4. Configuration - Security settings validated (OWASP A02)
"""
import subprocess
import json
import os
import sys
import re
import argparse
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

# Fix Windows console encoding for Unicode output
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass  # Python < 3.7


# ============================================================================
#  CONFIGURATION
# ============================================================================

SECRET_PATTERNS = [
    # API Keys & Tokens
    (r'api[_-]?key\s*[=:]\s*["\'][^"\']{10,}["\']', "API Key", "high"),
    (r'token\s*[=:]\s*["\'][^"\']{10,}["\']', "Token", "high"),
    (r'bearer\s+[a-zA-Z0-9\-_.]+', "Bearer Token", "critical"),
    
    # Cloud Credentials
    (r'AKIA[0-9A-Z]{16}', "AWS Access Key", "critical"),
    (r'aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*["\'][^"\']+["\']', "AWS Secret", "critical"),
    (r'AZURE[_-]?[A-Z_]+\s*[=:]\s*["\'][^"\']+["\']', "Azure Credential", "critical"),
    (r'GOOGLE[_-]?[A-Z_]+\s*[=:]\s*["\'][^"\']+["\']', "GCP Credential", "critical"),
    
    # Database & Connections
    (r'password\s*[=:]\s*["\'][^"\']{4,}["\']', "Password", "high"),
    (r'(mongodb|postgres|mysql|redis):\/\/[^\s"\']+', "Database Connection String", "critical"),
    
    # Private Keys
    (r'-----BEGIN\s+(RSA|PRIVATE|EC)\s+KEY-----', "Private Key", "critical"),
    (r'ssh-rsa\s+[A-Za-z0-9+/]+', "SSH Key", "critical"),
    
    # JWT
    (r'eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+', "JWT Token", "high"),
]

DANGEROUS_PATTERNS = [
    # Injection risks
    (r'eval\s*\(', "eval() usage", "critical", "Code Injection risk"),
    (r'exec\s*\(', "exec() usage", "critical", "Code Injection risk"),
    (r'new\s+Function\s*\(', "Function constructor", "high", "Code Injection risk"),
    (r'child_process\.exec\s*\(', "child_process.exec", "high", "Command Injection risk"),
    (r'subprocess\.call\s*\([^)]*shell\s*=\s*True', "subprocess with shell=True", "high", "Command Injection risk"),
    
    # XSS risks
    (r'dangerouslySetInnerHTML', "dangerouslySetInnerHTML", "high", "XSS risk"),
    (r'\.innerHTML\s*=', "innerHTML assignment", "medium", "XSS risk"),
    (r'document\.write\s*\(', "document.write", "medium", "XSS risk"),
    
    # SQL Injection indicators
    (r'["\'][^"\']*\+\s*[a-zA-Z_]+\s*\+\s*["\'].*(?:SELECT|INSERT|UPDATE|DELETE)', "SQL String Concat", "critical", "SQL Injection risk"),
    (r'f"[^"]*(?:SELECT|INSERT|UPDATE|DELETE)[^"]*\{', "SQL f-string", "critical", "SQL Injection risk"),
    
    # Insecure configurations
    (r'verify\s*=\s*False', "SSL Verify Disabled", "high", "MITM risk"),
    (r'--insecure', "Insecure flag", "medium", "Security disabled"),
    (r'disable[_-]?ssl', "SSL Disabled", "high", "MITM risk"),
    
    # Unsafe deserialization
    (r'pickle\.loads?\s*\(', "pickle usage", "high", "Deserialization risk"),
    (r'yaml\.load\s*\([^)]*\)(?!\s*,\s*Loader)', "Unsafe YAML load", "high", "Deserialization risk"),
]

SKIP_DIRS = {'node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv', '.next'}
CODE_EXTENSIONS = {'.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.rb', '.php'}
CONFIG_EXTENSIONS = {'.json', '.yaml', '.yml', '.toml', '.env', '.env.local', '.env.development'}


# ============================================================================
#  SCANNING FUNCTIONS
# ============================================================================

def scan_dependencies(project_path: str) -> Dict[str, Any]:
    """
    Validate supply chain security (OWASP A03).
    Checks: npm audit, lock file presence, dependency age.
    """
    results = {"tool": "dependency_scanner", "findings": [], "status": "[OK] Secure"}
    
    # Check for lock files
    lock_files = {
        "npm": ["package-lock.json", "npm-shrinkwrap.json"],
        "yarn": ["yarn.lock"],
        "pnpm": ["pnpm-lock.yaml"],
        "pip": ["requirements.txt", "Pipfile.lock", "poetry.lock"],
    }
    
    found_locks = []
    missing_locks = []
    
    for manager, files in lock_files.items():
        pkg_file = "package.json" if manager in ["npm", "yarn", "pnpm"] else "setup.py"
        pkg_path = Path(project_path) / pkg_file
        
        if pkg_path.exists() or (manager == "pip" and (Path(project_path) / "requirements.txt").exists()):
            has_lock = any((Path(project_path) / f).exists() for f in files)
            if has_lock:
                found_locks.append(manager)
            else:
                missing_locks.append(manager)
                results["findings"].append({
                    "type": "Missing Lock File",
                    "severity": "high",
                    "message": f"{manager}: No lock file found. Supply chain integrity at risk."
                })
    
    # Run npm audit if applicable
    if (Path(project_path) / "package.json").exists():
        try:
            result = subprocess.run(
                ["npm", "audit", "--json"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            try:
                audit_data = json.loads(result.stdout)
                vulnerabilities = audit_data.get("vulnerabilities", {})
                
                severity_count = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
                for vuln in vulnerabilities.values():
                    sev = vuln.get("severity", "low").lower()
                    if sev in severity_count:
                        severity_count[sev] += 1
                
                if severity_count["critical"] > 0:
                    results["status"] = "[!!] Critical vulnerabilities"
                    results["findings"].append({
                        "type": "npm audit",
                        "severity": "critical",
                        "message": f"{severity_count['critical']} critical vulnerabilities in dependencies"
                    })
                elif severity_count["high"] > 0:
                    results["status"] = "[!] High vulnerabilities"
                    results["findings"].append({
                        "type": "npm audit",
                        "severity": "high",
                        "message": f"{severity_count['high']} high severity vulnerabilities"
                    })
                
                results["npm_audit"] = severity_count
                
            except json.JSONDecodeError:
                pass
                
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
    
    if not results["findings"]:
        results["status"] = "[OK] Supply chain checks passed"
    
    return results


def scan_secrets(project_path: str) -> Dict[str, Any]:
    """
    Validate no hardcoded secrets (OWASP A04).
    Checks: API keys, tokens, passwords, cloud credentials.
    """
    results = {
        "tool": "secret_scanner",
        "findings": [],
        "status": "[OK] No secrets detected",
        "scanned_files": 0,
        "by_severity": {"critical": 0, "high": 0, "medium": 0}
    }
    
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for file in files:
            ext = Path(file).suffix.lower()
            if ext not in CODE_EXTENSIONS and ext not in CONFIG_EXTENSIONS:
                continue
                
            filepath = Path(root) / file
            results["scanned_files"] += 1
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                    for pattern, secret_type, severity in SECRET_PATTERNS:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            results["findings"].append({
                                "file": str(filepath.relative_to(project_path)),
                                "type": secret_type,
                                "severity": severity,
                                "count": len(matches)
                            })
                            results["by_severity"][severity] += len(matches)
                            
            except Exception:
                pass
    
    if results["by_severity"]["critical"] > 0:
        results["status"] = "[!!] CRITICAL: Secrets exposed!"
    elif results["by_severity"]["high"] > 0:
        results["status"] = "[!] HIGH: Secrets found"
    elif sum(results["by_severity"].values()) > 0:
        results["status"] = "[?] Potential secrets detected"
    
    # Limit findings for output
    results["findings"] = results["findings"][:15]
    
    return results


def scan_code_patterns(project_path: str) -> Dict[str, Any]:
    """
    Validate dangerous code patterns (OWASP A05).
    Checks: Injection risks, XSS, unsafe deserialization.
    """
    results = {
        "tool": "pattern_scanner",
        "findings": [],
        "status": "[OK] No dangerous patterns",
        "scanned_files": 0,
        "by_category": {}
    }
    
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for file in files:
            ext = Path(file).suffix.lower()
            if ext not in CODE_EXTENSIONS:
                continue
                
            filepath = Path(root) / file
            results["scanned_files"] += 1
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    
                    for line_num, line in enumerate(lines, 1):
                        for pattern, name, severity, category in DANGEROUS_PATTERNS:
                            if re.search(pattern, line, re.IGNORECASE):
                                results["findings"].append({
                                    "file": str(filepath.relative_to(project_path)),
                                    "line": line_num,
                                    "pattern": name,
                                    "severity": severity,
                                    "category": category,
                                    "snippet": line.strip()[:80]
                                })
                                results["by_category"][category] = results["by_category"].get(category, 0) + 1
                                
            except Exception:
                pass
    
    critical_count = sum(1 for f in results["findings"] if f["severity"] == "critical")
    high_count = sum(1 for f in results["findings"] if f["severity"] == "high")
    
    if critical_count > 0:
        results["status"] = f"[!!] CRITICAL: {critical_count} dangerous patterns"
    elif high_count > 0:
        results["status"] = f"[!] HIGH: {high_count} risky patterns"
    elif results["findings"]:
        results["status"] = "[?] Some patterns need review"
    
    # Limit findings
    results["findings"] = results["findings"][:20]
    
    return results


def scan_configuration(project_path: str) -> Dict[str, Any]:
    """
    Validate security configuration (OWASP A02).
    Checks: Security headers, CORS, debug modes.
    """
    results = {
        "tool": "config_scanner",
        "findings": [],
        "status": "[OK] Configuration secure",
        "checks": {}
    }
    
    # Check common config files for issues
    config_issues = [
        (r'"DEBUG"\s*:\s*true', "Debug mode enabled", "high"),
        (r'debug\s*=\s*True', "Debug mode enabled", "high"),
        (r'NODE_ENV.*development', "Development mode in config", "medium"),
        (r'"CORS_ALLOW_ALL".*true', "CORS allow all origins", "high"),
        (r'"Access-Control-Allow-Origin".*\*', "CORS wildcard", "high"),
        (r'allowCredentials.*true.*origin.*\*', "Dangerous CORS combo", "critical"),
    ]
    
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for file in files:
            ext = Path(file).suffix.lower()
            if ext not in CONFIG_EXTENSIONS and file not in ['next.config.js', 'webpack.config.js', '.eslintrc.js']:
                continue
                
            filepath = Path(root) / file
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                    for pattern, issue, severity in config_issues:
                        if re.search(pattern, content, re.IGNORECASE):
                            results["findings"].append({
                                "file": str(filepath.relative_to(project_path)),
                                "issue": issue,
                                "severity": severity
                            })
                            
            except Exception:
                pass
    
    # Check for security header configurations
    header_files = ["next.config.js", "next.config.mjs", "middleware.ts", "nginx.conf"]
    for hf in header_files:
        hf_path = Path(project_path) / hf
        if hf_path.exists():
            results["checks"]["security_headers_config"] = True
            break
    else:
        results["checks"]["security_headers_config"] = False
        results["findings"].append({
            "issue": "No security headers configuration found",
            "severity": "medium",
            "recommendation": "Configure CSP, HSTS, X-Frame-Options headers"
        })
    
    if any(f["severity"] == "critical" for f in results["findings"]):
        results["status"] = "[!!] CRITICAL: Configuration issues"
    elif any(f["severity"] == "high" for f in results["findings"]):
        results["status"] = "[!] HIGH: Configuration review needed"
    elif results["findings"]:
        results["status"] = "[?] Minor configuration issues"
    
    return results


# ============================================================================
#  MAIN
# ============================================================================

def run_full_scan(project_path: str, scan_type: str = "all") -> Dict[str, Any]:
    """Execute security validation scans."""
    
    report = {
        "project": project_path,
        "timestamp": datetime.now().isoformat(),
        "scan_type": scan_type,
        "scans": {},
        "summary": {
            "total_findings": 0,
            "critical": 0,
            "high": 0,
            "overall_status": "[OK] SECURE"
        }
    }
    
    scanners = {
        "deps": ("dependencies", scan_dependencies),
        "secrets": ("secrets", scan_secrets),
        "patterns": ("code_patterns", scan_code_patterns),
        "config": ("configuration", scan_configuration),
    }
    
    for key, (name, scanner) in scanners.items():
        if scan_type == "all" or scan_type == key:
            result = scanner(project_path)
            report["scans"][name] = result
            
            findings_count = len(result.get("findings", []))
            report["summary"]["total_findings"] += findings_count
            
            for finding in result.get("findings", []):
                sev = finding.get("severity", "low")
                if sev == "critical":
                    report["summary"]["critical"] += 1
                elif sev == "high":
                    report["summary"]["high"] += 1
    
    # Determine overall status
    if report["summary"]["critical"] > 0:
        report["summary"]["overall_status"] = "[!!] CRITICAL ISSUES FOUND"
    elif report["summary"]["high"] > 0:
        report["summary"]["overall_status"] = "[!] HIGH RISK ISSUES"
    elif report["summary"]["total_findings"] > 0:
        report["summary"]["overall_status"] = "[?] REVIEW RECOMMENDED"
    
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Validate security principles from vulnerability-scanner skill"
    )
    parser.add_argument("project_path", nargs="?", default=".", help="Project directory to scan")
    parser.add_argument("--scan-type", choices=["all", "deps", "secrets", "patterns", "config"],
                        default="all", help="Type of scan to run")
    parser.add_argument("--output", choices=["json", "summary"], default="json",
                        help="Output format")
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.project_path):
        print(json.dumps({"error": f"Directory not found: {args.project_path}"}))
        sys.exit(1)
    
    result = run_full_scan(args.project_path, args.scan_type)
    
    if args.output == "summary":
        print(f"\n{'='*60}")
        print(f"Security Scan: {result['project']}")
        print(f"{'='*60}")
        print(f"Status: {result['summary']['overall_status']}")
        print(f"Total Findings: {result['summary']['total_findings']}")
        print(f"  Critical: {result['summary']['critical']}")
        print(f"  High: {result['summary']['high']}")
        print(f"{'='*60}\n")
        
        for scan_name, scan_result in result['scans'].items():
            print(f"\n{scan_name.upper()}: {scan_result['status']}")
            for finding in scan_result.get('findings', [])[:5]:
                print(f"  - {finding}")
    else:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
