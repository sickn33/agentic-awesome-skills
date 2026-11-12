# Dependency Audit and Security Analysis Implementation Playbook

These are separate architecture sketches, not a complete scanner: parsers, version comparison, provider adapters and legal review are not bundled. Record unsupported ecosystems, unresolved versions, provider failures and scan coverage explicitly. No findings cannot establish security or license compliance when inspection is incomplete. Network scans require approved destinations and must not disclose private package names without authorization.

## Instructions

### 1. Dependency Discovery

Scan and inventory all project dependencies:

**Multi-Language Detection**
```python
import os
import json
import toml
import yaml
from pathlib import Path

class DependencyDiscovery:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.dependency_files = {
            'npm': ['package.json', 'package-lock.json', 'yarn.lock'],
            'python': ['requirements.txt', 'Pipfile', 'Pipfile.lock', 'pyproject.toml', 'poetry.lock'],
            'ruby': ['Gemfile', 'Gemfile.lock'],
            'java': ['pom.xml', 'build.gradle', 'build.gradle.kts'],
            'go': ['go.mod', 'go.sum'],
            'rust': ['Cargo.toml', 'Cargo.lock'],
            'php': ['composer.json', 'composer.lock'],
            'dotnet': ['*.csproj', 'packages.config', 'project.json']
        }
        
    def discover_all_dependencies(self):
        """
        Discover all dependencies across different package managers
        """
        dependencies = {}
        
        # NPM/Yarn dependencies
        if (self.project_path / 'package.json').exists():
            dependencies['npm'] = self._parse_npm_dependencies()
            
        # Python dependencies
        if (self.project_path / 'requirements.txt').exists():
            dependencies['python'] = self._parse_requirements_txt()
        elif (self.project_path / 'Pipfile').exists():
            dependencies['python'] = self._parse_pipfile()
        elif (self.project_path / 'pyproject.toml').exists():
            dependencies['python'] = self._parse_pyproject_toml()
            
        # Go dependencies
        if (self.project_path / 'go.mod').exists():
            dependencies['go'] = self._parse_go_mod()
            
        return dependencies
    
    def _parse_npm_dependencies(self):
        """
        Parse NPM package.json and lock files
        """
        with open(self.project_path / 'package.json', 'r') as f:
            package_json = json.load(f)
            
        deps = {}
        
        # Direct dependencies
        for dep_type in ['dependencies', 'devDependencies', 'peerDependencies']:
            if dep_type in package_json:
                for name, version in package_json[dep_type].items():
                    deps[name] = {
                        'version': version,
                        'type': dep_type,
                        'direct': True
                    }
        
        # Parse lock file for exact versions
        if (self.project_path / 'package-lock.json').exists():
            with open(self.project_path / 'package-lock.json', 'r') as f:
                lock_data = json.load(f)
                self._parse_npm_lock(lock_data, deps)
                
        return deps
```

**Dependency Tree Analysis**
```python
def build_dependency_tree(dependencies):
    """
    Build complete dependency tree including transitive dependencies
    """
    tree = {
        'root': {
            'name': 'project',
            'version': '1.0.0',
            'dependencies': {}
        }
    }
    
    def add_dependencies(node, deps, visited=None):
        if visited is None:
            visited = set()
            
        for dep_name, dep_info in deps.items():
            if dep_name in visited:
                # Circular dependency detected
                node['dependencies'][dep_name] = {
                    'circular': True,
                    'version': dep_info['version']
                }
                continue
                
            branch_visited = visited | {dep_name}
            
            node['dependencies'][dep_name] = {
                'version': dep_info['version'],
                'type': dep_info.get('type', 'runtime'),
                'dependencies': {}
            }
            
            # Recursively add transitive dependencies
            if 'dependencies' in dep_info:
                add_dependencies(
                    node['dependencies'][dep_name],
                    dep_info['dependencies'],
                    branch_visited
                )
    
    add_dependencies(tree['root'], dependencies)
    return tree
```

### 2. Vulnerability Scanning

Check dependencies against vulnerability databases:

**Advisory collection**

Use the ecosystem's installed, version-bound audit tool against the resolved lockfile. Record its exit status, advisory database timestamp, exact dependency versions and unresolved packages. Metadata registries such as PyPI package JSON are not universal vulnerability databases. A provider timeout, non-success response or unsupported ecosystem is `analysis_incomplete`, never an empty clean result. Verify the provider response schema before translating it into findings; set a bounded timeout and validate affected version ranges.

**Severity Analysis**
```python
def analyze_vulnerability_severity(vulnerabilities):
    """
    Analyze and prioritize vulnerabilities by severity
    """
    severity_scores = {
        'critical': 9.0,
        'high': 7.0,
        'moderate': 4.0,
        'low': 1.0
    }
    
    analysis = {
        'total': len(vulnerabilities),
        'by_severity': {
            'critical': [],
            'high': [],
            'moderate': [],
            'low': []
        },
        'risk_score': 0,
        'immediate_action_required': []
    }
    
    for vuln in vulnerabilities:
        severity = vuln['severity'].lower()
        analysis['by_severity'][severity].append(vuln)
        
        # Calculate risk score
        base_score = severity_scores.get(severity, 0)
        
        # Adjust score based on factors
        if vuln.get('exploit_available', False):
            base_score *= 1.5
        if vuln.get('publicly_disclosed', True):
            base_score *= 1.2
        if 'remote_code_execution' in vuln.get('description', '').lower():
            base_score *= 2.0
            
        vuln['risk_score'] = base_score
        analysis['risk_score'] += base_score
        
        # Flag immediate action items
        if severity in ['critical', 'high'] or base_score > 8.0:
            analysis['immediate_action_required'].append({
                'package': vuln['package'],
                'severity': severity,
                'action': f"Update to {vuln['patched_versions']}"
            })
    
    # Sort by risk score
    for severity in analysis['by_severity']:
        analysis['by_severity'][severity].sort(
            key=lambda x: x.get('risk_score', 0),
            reverse=True
        )
    
    return analysis
```

### 3. License Compliance

Analyze dependency licenses for compatibility:

**License evidence register**

For each resolved dependency, record the exact package/version, source license file or expression, copyright/notice obligations, distribution/linking/network-use context and unresolved questions. License labels alone cannot establish compatibility; there is no universal MIT/GPL/Apache matrix. Preserve `unknown` when evidence is absent and request qualified review for the actual use. Do not infer a legal PASS from an empty heuristic findings list or assert that one GPL dependency automatically requires publishing an entire application. A sample report must label hypothetical counts and conclusions as examples.

### 4. Outdated Dependencies

Identify and prioritize dependency updates:

**Version Analysis**
```python
def analyze_outdated_dependencies(dependencies):
    """
    Check for outdated dependencies
    """
    outdated = []
    
    for package_name, package_info in dependencies.items():
        current_version = package_info['version']
        latest_version = fetch_latest_version(package_name, package_info['ecosystem'])
        
        if is_outdated(current_version, latest_version):
            # Calculate how outdated
            version_diff = calculate_version_difference(current_version, latest_version)
            
            outdated.append({
                'package': package_name,
                'current': current_version,
                'latest': latest_version,
                'type': version_diff['type'],  # major, minor, patch
                'releases_behind': version_diff['count'],
                'age_days': get_version_age(package_name, current_version),
                'breaking_changes': version_diff['type'] == 'major',
                'update_effort': estimate_update_effort(version_diff),
                'changelog': fetch_changelog(package_name, current_version, latest_version)
            })
    
    return prioritize_updates(outdated)

def prioritize_updates(outdated_deps):
    """
    Prioritize updates based on multiple factors
    """
    for dep in outdated_deps:
        score = 0
        
        # Security updates get highest priority
        if dep.get('has_security_fix', False):
            score += 100
            
        # Major version updates
        if dep['type'] == 'major':
            score += 20
        elif dep['type'] == 'minor':
            score += 10
        else:
            score += 5
            
        # Age factor
        if dep['age_days'] > 365:
            score += 30
        elif dep['age_days'] > 180:
            score += 20
        elif dep['age_days'] > 90:
            score += 10
            
        # Number of releases behind
        score += min(dep['releases_behind'] * 2, 20)
        
        dep['priority_score'] = score
        dep['priority'] = 'critical' if score > 80 else 'high' if score > 50 else 'medium'
    
    return sorted(outdated_deps, key=lambda x: x['priority_score'], reverse=True)
```

### 5. Dependency Size Analysis

Analyze bundle size impact:

**Bundle Size Impact**
```javascript
// Analyze NPM package sizes
const analyzeBundleSize = async (dependencies) => {
    const sizeAnalysis = {
        totalSize: 0,
        totalGzipped: 0,
        packages: [],
        recommendations: [],
        unresolved: []
    };
    
    for (const [packageName, info] of Object.entries(dependencies)) {
        try {
            // Fetch package stats
            const response = await fetch(
                `https://bundlephobia.com/api/size?package=${encodeURIComponent(`${packageName}@${info.version}`)}`
            );
            if (!response.ok) throw new Error("Size provider failed");
            const data = await response.json();
            if (!Number.isFinite(data.size) || !Number.isFinite(data.gzip)) throw new Error("Incomplete size response");
            
            const packageSize = {
                name: packageName,
                version: info.version,
                size: data.size,
                gzip: data.gzip,
                dependencyCount: data.dependencyCount,
                hasJSNext: data.hasJSNext,
                hasSideEffects: data.hasSideEffects
            };
            
            sizeAnalysis.packages.push(packageSize);
            sizeAnalysis.totalSize += data.size;
            sizeAnalysis.totalGzipped += data.gzip;
            
            // Size recommendations
            if (data.size > 1000000) { // 1MB
                sizeAnalysis.recommendations.push({
                    package: packageName,
                    issue: 'Large bundle size',
                    size: `${(data.size / 1024 / 1024).toFixed(2)} MB`,
                    suggestion: 'Consider lighter alternatives or lazy loading'
                });
            }
        } catch (error) {
            sizeAnalysis.unresolved.push(packageName);
        }
    }
    
    // Sort by size
    sizeAnalysis.packages.sort((a, b) => b.size - a.size);
    
    // Add top offenders
    sizeAnalysis.topOffenders = sizeAnalysis.packages.slice(0, 10);
    
    sizeAnalysis.analysisComplete = sizeAnalysis.unresolved.length === 0;
    // Summed package sizes are not the application bundle size (shared deps/tree shaking).
    return sizeAnalysis;
};
```

### 6. Supply Chain Security

Check for dependency hijacking and typosquatting:

**Supply Chain Checks**
```python
def check_supply_chain_security(dependencies):
    """
    Perform supply chain security checks
    """
    security_issues = []
    
    for package_name, package_info in dependencies.items():
        # Check for typosquatting
        typo_check = check_typosquatting(package_name)
        if typo_check['suspicious']:
            security_issues.append({
                'type': 'typosquatting',
                'package': package_name,
                'severity': 'high',
                'similar_to': typo_check['similar_packages'],
                'recommendation': 'Verify package name spelling'
            })
        
        # Check maintainer changes
        maintainer_check = check_maintainer_changes(package_name)
        if maintainer_check['recent_changes']:
            security_issues.append({
                'type': 'maintainer_change',
                'package': package_name,
                'severity': 'medium',
                'details': maintainer_check['changes'],
                'recommendation': 'Review recent package changes'
            })
        
        # Check for suspicious patterns
        if contains_suspicious_patterns(package_info):
            security_issues.append({
                'type': 'suspicious_behavior',
                'package': package_name,
                'severity': 'high',
                'patterns': package_info['suspicious_patterns'],
                'recommendation': 'Audit package source code'
            })
    
    return security_issues

def check_typosquatting(package_name):
    """
    Check if package name might be typosquatting
    """
    common_packages = [
        'react', 'express', 'lodash', 'axios', 'webpack',
        'babel', 'jest', 'typescript', 'eslint', 'prettier'
    ]
    
    for legit_package in common_packages:
        distance = levenshtein_distance(package_name.lower(), legit_package)
        if 0 < distance <= 2:  # Close but not exact match
            return {
                'suspicious': True,
                'similar_packages': [legit_package],
                'distance': distance
            }
    
    return {'suspicious': False}
```

### 7. Automated Remediation

Generate automated fixes:

**Reviewable remediation**

1. Record the manifest, lockfile, current branch and dirty state. Preserve user changes; use an isolated topic checkout for edits.
2. Run the ecosystem's audit with approved network access. Reports can reveal private package names; keep them local unless upload is authorized.
3. Select exact affected dependencies and reviewed target versions. Do not force major upgrades or automatically rewrite unrelated dependencies.
4. Apply the scoped update using the project's lockfile/toolchain, inspect the complete diff, then run compatibility, build and regression tests.
5. A failed test means the repair is incomplete. Keep the diff for review; do not restore a user's lockfile or overwrite requirements automatically.
6. Re-audit the resulting lockfile and report residual findings. Publication/deployment remains a separate authorized operation.

```bash
# Read-only report; run within the authorized project scope.
npm audit --json > dependency-audit.json
# An audit may return nonzero because findings exist. Inspect that status/report;
# do not interpret it as permission to perform an automatic forced update.
```

**Pull Request Generation**
```python
def generate_dependency_update_pr(updates):
    """
    Generate PR with dependency updates
    """
    pr_body = f"""
## 🔒 Dependency Security Update

This PR updates {len(updates)} dependencies to address security vulnerabilities and outdated packages.

### Security Fixes ({sum(1 for u in updates if u['has_security'])})

| Package | Current | Updated | Severity | CVE |
|---------|---------|---------|----------|-----|
"""
    
    for update in updates:
        if update['has_security']:
            pr_body += f"| {update['package']} | {update['current']} | {update['target']} | {update['severity']} | {', '.join(update['cves'])} |\n"
    
    pr_body += """

### Other Updates

| Package | Current | Updated | Type | Age |
|---------|---------|---------|------|-----|
"""
    
    for update in updates:
        if not update['has_security']:
            pr_body += f"| {update['package']} | {update['current']} | {update['target']} | {update['type']} | {update['age_days']} days |\n"
    
    pr_body += """

### Testing
- [ ] All tests pass
- [ ] No breaking changes identified
- [ ] Bundle size impact reviewed

### Review Checklist
- [ ] Security vulnerabilities addressed
- [ ] License compliance maintained
- [ ] No unexpected dependencies added
- [ ] Performance impact assessed

Reviewers: select the actual authorized project reviewers.
"""
    
    return {
        'title': f'chore(deps): Security update for {len(updates)} dependencies',
        'body': pr_body,
        'branch': f'deps/security-update-{datetime.now().strftime("%Y%m%d")}',
        'labels': ['dependencies', 'security']
    }
```

### 8. Monitoring and Alerts

Set up continuous dependency monitoring:

**CI design checklist**

Use read-only job permissions, reviewed immutable action revisions and the project's locked scanner dependencies. Initialize each job's checkout/toolchain explicitly. Run each selected scanner without suppressing its exit status; validate report structure and distinguish findings from execution failures. Do not download moving tools during a security check or claim an unbundled compliance script exists. Store reports only in authorized destinations with appropriate retention; issue creation, notifications and scheduled monitoring are separate opt-in actions. Never create duplicate issues merely because a scanner command failed.

## Output Format

1. **Executive Summary**: High-level risk assessment and action items
2. **Vulnerability Report**: Detailed CVE analysis with severity ratings
3. **License Compliance**: Compatibility matrix and legal risks
4. **Update Recommendations**: Prioritized list with effort estimates
5. **Supply Chain Analysis**: Typosquatting and hijacking risks
6. **Remediation Scripts**: Automated update commands and PR generation
7. **Size Impact Report**: Bundle size analysis and optimization tips
8. **Monitoring Setup**: CI/CD integration for continuous scanning

Focus on actionable insights that help maintain secure, compliant, and efficient dependency management.
