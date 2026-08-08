# Pull Request Enhancement Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Instructions

### 1. PR Analysis

Analyze the changes and generate insights:

**Change Summary Generator**
```python
import subprocess
import re
from collections import defaultdict

class PRAnalyzer:
    def analyze_changes(self, base_branch='main'):
        """
        Analyze changes between current branch and base
        """
        analysis = {
            'files_changed': self._get_changed_files(base_branch),
            'change_statistics': self._get_change_stats(base_branch),
            'change_categories': self._categorize_changes(base_branch),
            'potential_impacts': self._assess_impacts(base_branch),
            'dependencies_affected': self._check_dependencies(base_branch)
        }
        
        return analysis
    
    def _get_changed_files(self, base_branch):
        """Get list of changed files with statistics"""
        cmd = f"git diff --name-status {base_branch}...HEAD"
        result = subprocess.run(cmd.split(), capture_output=True, text=True)
        
        files = []
        for line in result.stdout.strip().split('\n'):
            if line:
                status, filename = line.split('\t', 1)
                files.append({
                    'filename': filename,
                    'status': self._parse_status(status),
                    'category': self._categorize_file(filename)
                })
        
        return files
    
    def _get_change_stats(self, base_branch):
        """Get detailed change statistics"""
        cmd = f"git diff --shortstat {base_branch}...HEAD"
        result = subprocess.run(cmd.split(), capture_output=True, text=True)
        
        # Parse output like: "10 files changed, 450 insertions(+), 123 deletions(-)"
        stats_pattern = r'(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?'
        match = re.search(stats_pattern, result.stdout)
        
        if match:
            files, insertions, deletions = match.groups()
            return {
                'files_changed': int(files),
                'insertions': int(insertions or 0),
                'deletions': int(deletions or 0),
                'net_change': int(insertions or 0) - int(deletions or 0)
            }
        
        return {'files_changed': 0, 'insertions': 0, 'deletions': 0, 'net_change': 0}
    
    def _categorize_file(self, filename):
        """Categorize file by type"""
        categories = {
            'source': ['.js', '.ts', '.py', '.java', '.go', '.rs'],
            'test': ['test', 'spec', '.test.', '.spec.'],
            'config': ['config', '.json', '.yml', '.yaml', '.toml'],
            'docs': ['.md', 'README', 'CHANGELOG', '.rst'],
            'styles': ['.css', '.scss', '.less'],
            'build': ['Makefile', 'Dockerfile', '.gradle', 'pom.xml']
        }
        
        for category, patterns in categories.items():
            if any(pattern in filename for pattern in patterns):
                return category
        
        return 'other'
```

### 2. PR Description Generation

Create comprehensive PR descriptions:

**Description Template Generator**
```python
def generate_pr_description(analysis, commits):
    """
    Generate detailed PR description from analysis
    """
    description = f"""
## Summary

{generate_summary(analysis, commits)}

## What Changed

{generate_change_list(analysis)}

## Why These Changes

{extract_why_from_commits(commits)}

## Type of Change

{determine_change_types(analysis)}

## How Has This Been Tested?

{generate_test_section(analysis)}

## Visual Changes

{generate_visual_section(analysis)}

## Performance Impact

{analyze_performance_impact(analysis)}

## Breaking Changes

{identify_breaking_changes(analysis)}

## Dependencies

{list_dependency_changes(analysis)}

## Checklist

{generate_review_checklist(analysis)}

## Additional Notes

{generate_additional_notes(analysis)}
"""
    return description

def generate_summary(analysis, commits):
    """Generate executive summary"""
    stats = analysis['change_statistics']
    
    # Extract main purpose from commits
    main_purpose = extract_main_purpose(commits)
    
    summary = f"""
This PR {main_purpose}.

**Impact**: {stats['files_changed']} files changed ({stats['insertions']} additions, {stats['deletions']} deletions)
**Risk Level**: {calculate_risk_level(analysis)}
**Review Time**: ~{estimate_review_time(stats)} minutes
"""
    return summary

def generate_change_list(analysis):
    """Generate categorized change list"""
    changes_by_category = defaultdict(list)
    
    for file in analysis['files_changed']:
        changes_by_category[file['category']].append(file)
    
    change_list = ""
    icons = {
        'source': '🔧',
        'test': '✅',
        'docs': '📝',
        'config': '⚙️',
        'styles': '🎨',
        'build': '🏗️',
        'other': '📁'
    }
    
    for category, files in changes_by_category.items():
        change_list += f"\n### {icons.get(category, '📁')} {category.title()} Changes\n"
        for file in files[:10]:  # Limit to 10 files per category
            change_list += f"- {file['status']}: `{file['filename']}`\n"
        if len(files) > 10:
            change_list += f"- ...and {len(files) - 10} more\n"
    
    return change_list
```

### 3. Review Checklist Generation

Create automated review checklists:

**Smart Checklist Generator**
```python
def generate_review_checklist(analysis):
    """
    Generate context-aware review checklist
    """
    checklist = ["## Review Checklist\n"]
    
    # General items
    general_items = [
        "Code follows project style guidelines",
        "Self-review completed",
        "Comments added for complex logic",
        "No debugging code left",
        "No sensitive data exposed"
    ]
    
    # Add general items
    checklist.append("### General")
    for item in general_items:
        checklist.append(f"- [ ] {item}")
    
    # File-specific checks
    file_types = {file['category'] for file in analysis['files_changed']}
    
    if 'source' in file_types:
        checklist.append("\n### Code Quality")
        checklist.extend([
            "- [ ] No code duplication",
            "- [ ] Functions are focused and small",
            "- [ ] Variable names are descriptive",
            "- [ ] Error handling is comprehensive",
            "- [ ] No performance bottlenecks introduced"
        ])
    
    if 'test' in file_types:
        checklist.append("\n### Testing")
        checklist.extend([
            "- [ ] All new code is covered by tests",
            "- [ ] Tests are meaningful and not just for coverage",
            "- [ ] Edge cases are tested",
            "- [ ] Tests follow AAA pattern (Arrange, Act, Assert)",
            "- [ ] No flaky tests introduced"
        ])
    
    if 'config' in file_types:
        checklist.append("\n### Configuration")
        checklist.extend([
            "- [ ] No hardcoded values",
            "- [ ] Environment variables documented",
            "- [ ] Backwards compatibility maintained",
            "- [ ] Security implications reviewed",
            "- [ ] Default values are sensible"
        ])
    
    if 'docs' in file_types:
        checklist.append("\n### Documentation")
        checklist.extend([
            "- [ ] Documentation is clear and accurate",
            "- [ ] Examples are provided where helpful",
            "- [ ] API changes are documented",
            "- [ ] README updated if necessary",
            "- [ ] Changelog updated"
        ])
    
    # Security checks
    if has_security_implications(analysis):
        checklist.append("\n### Security")
        checklist.extend([
            "- [ ] No SQL injection vulnerabilities",
            "- [ ] Input validation implemented",
            "- [ ] Authentication/authorization correct",
            "- [ ] No sensitive data in logs",
            "- [ ] Dependencies are secure"
        ])
    
    return '\n'.join(checklist)
```

### 4. Code Review Automation

Automate common review tasks:

**Automated Review Bot**
```python
class ReviewBot:
    def perform_automated_checks(self, pr_diff):
        """
        Perform automated code review checks
        """
        findings = []
        
        # Check for common issues
        checks = [
            self._check_console_logs,
            self._check_commented_code,
            self._check_large_functions,
            self._check_todo_comments,
            self._check_hardcoded_values,
            self._check_missing_error_handling,
            self._check_security_issues
        ]
        
        for check in checks:
            findings.extend(check(pr_diff))
        
        return findings
    
    def _check_console_logs(self, diff):
        """Check for console.log statements"""
        findings = []
        pattern = r'\+.*console\.(log|debug|info|warn|error)'
        
        for file, content in diff.items():
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                findings.append({
                    'type': 'warning',
                    'file': file,
                    'line': self._get_line_number(match, content),
                    'message': 'Console statement found - remove before merging',
                    'suggestion': 'Use proper logging framework instead'
                })
        
        return findings
    
    def _check_large_functions(self, diff):
        """Check for functions that are too large"""
        findings = []
        
        # Simple heuristic: count lines between function start and end
        for file, content in diff.items():
            if file.endswith(('.js', '.ts', '.py')):
                functions = self._extract_functions(content)
                for func in functions:
                    if func['lines'] > 50:
                        findings.append({
                            'type': 'suggestion',
                            'file': file,
                            'line': func['start_line'],
                            'message': f"Function '{func['name']}' is {func['lines']} lines long",
                            'suggestion': 'Consider breaking into smaller functions'
                        })
        
        return findings
```

### 5. PR Size Optimization

Help split large PRs:

**PR Splitter Suggestions**
```python
def suggest_pr_splits(analysis):
    """
    Suggest how to split large PRs
    """
    stats = analysis['change_statistics']
    
    # Check if PR is too large
    if stats['files_changed'] > 20 or stats['insertions'] + stats['deletions'] > 1000:
        suggestions = analyze_split_opportunities(analysis)
        
        return f"""
## ⚠️ Large PR Detected

This PR changes {stats['files_changed']} files with {stats['insertions'] + stats['deletions']} total changes.
Large PRs are harder to review and more likely to introduce bugs.

### Suggested Splits:

{format_split_suggestions(suggestions)}

### How to Split:

1. Create feature branch from current branch
2. Cherry-pick commits for first logical unit
3. Create PR for first unit
4. Repeat for remaining units

```bash
# Example split workflow
git checkout -b feature/part-1
git cherry-pick <commit-hashes-for-part-1>
git push origin feature/part-1
# Create PR for part 1

git checkout -b feature/part-2
git cherry-pick <commit-hashes-for-part-2>
git push origin feature/part-2
# Create PR for part 2
```
"""
    
    return ""

def analyze_split_opportunities(analysis):
    """Find logical units for splitting"""
    suggestions = []
    
    # Group by feature areas
    feature_groups = defaultdict(list)
    for file in analysis['files_changed']:
        feature = extract_feature_area(file['filename'])
        feature_groups[feature].append(file)
    
    # Suggest splits
    for feature, files in feature_groups.items():
        if len(files) >= 5:
            suggestions.append({
                'name': f"{feature} changes",
                'files': files,
                'reason': f"Isolated changes to {feature} feature"
            })
    
    return suggestions
```

### 6. Visual Diff Enhancement

Generate visual representations:

**Mermaid Diagram Generator**
```python
def generate_architecture_diff(analysis):
    """
    Generate diagram showing architectural changes
    """
    if has_architectural_changes(analysis):
        return f"""
## Architecture Changes

```mermaid
graph LR
    subgraph "Before"
        A1[Component A] --> B1[Component B]
        B1 --> C1[Database]
    end
    
    subgraph "After"
        A2[Component A] --> B2[Component B]
        B2 --> C2[Database]
        B2 --> D2[New Cache Layer]
        A2 --> E2[New API Gateway]
    end
    
    style D2 fill:#90EE90
    style E2 fill:#90EE90
```

### Key Changes:
1. Added caching layer for performance
2. Introduced API gateway for better routing
3. Refactored component communication
"""
    return ""
```

### 7. Test Coverage Report

Include test coverage analysis:

**Coverage Report Generator**
```python
def generate_coverage_report(base_branch='main'):
    """
    Generate test coverage comparison
    """
    # Get coverage before and after
    before_coverage = get_coverage_for_branch(base_branch)
    after_coverage = get_coverage_for_branch('HEAD')
    
    coverage_diff = after_coverage - before_coverage
    
    report = f"""
## Test Coverage

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines | {before_coverage['lines']:.1f}% | {after_coverage['lines']:.1f}% | {format_diff(coverage_diff['lines'])} |
| Functions | {before_coverage['functions']:.1f}% | {after_coverage['functions']:.1f}% | {format_diff(coverage_diff['functions'])} |
| Branches | {before_coverage['branches']:.1f}% | {after_coverage['branches']:.1f}% | {format_diff(coverage_diff['branches'])} |

### Uncovered Files
"""
    
    # List files with low coverage
    for file in get_low_coverage_files():
        report += f"- `{file['name']}`: {file['coverage']:.1f}% coverage\n"
    
    return report

def format_diff(value):
    """Format coverage difference"""
    if value > 0:
        return f"<span style='color: green'>+{value:.1f}%</span> ✅"
    elif value < 0:
        return f"<span style='color: red'>{value:.1f}%</span> ⚠️"
    else:
        return "No change"
```

### 8. Risk Assessment

Evaluate PR risk:

**Risk Calculator**
```python
def calculate_pr_risk(analysis):
    """
    Calculate risk score for PR
    """
    risk_factors = {
        'size': calculate_size_risk(analysis),
        'complexity': calculate_complexity_risk(analysis),
        'test_coverage': calculate_test_risk(analysis),
        'dependencies': calculate_dependency_risk(analysis),
        'security': calculate_security_risk(analysis)
    }
    
    overall_risk = sum(risk_factors.values()) / len(risk_factors)
    
    risk_report = f"""
## Risk Assessment

**Overall Risk Level**: {get_risk_level(overall_risk)} ({overall_risk:.1f}/10)

### Risk Factors

| Factor | Score | Details |
|--------|-------|---------|
| Size | {risk_factors['size']:.1f}/10 | {get_size_details(analysis)} |
| Complexity | {risk_factors['complexity']:.1f}/10 | {get_complexity_details(analysis)} |
| Test Coverage | {risk_factors['test_coverage']:.1f}/10 | {get_test_details(analysis)} |
| Dependencies | {risk_factors['dependencies']:.1f}/10 | {get_dependency_details(analysis)} |
| Security | {risk_factors['security']:.1f}/10 | {get_security_details(analysis)} |

### Mitigation Strategies

{generate_mitigation_strategies(risk_factors)}
"""
    
    return risk_report

def get_risk_level(score):
    """Convert score to risk level"""
    if score < 3:
        return "🟢 Low"
    elif score < 6:
        return "🟡 Medium"
    elif score < 8:
        return "🟠 High"
    else:
        return "🔴 Critical"
```

### 9. PR Templates

Generate context-specific templates:

```python
def generate_pr_template(pr_type, analysis):
    """
    Generate PR template based on type
    """
    templates = {
        'feature': f"""
## Feature: {extract_feature_name(analysis)}

### Description
{generate_feature_description(analysis)}

### User Story
As a [user type]
I want [feature]
So that [benefit]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Demo
[Link to demo or screenshots]

### Technical Implementation
{generate_technical_summary(analysis)}

### Testing Strategy
{generate_test_strategy(analysis)}
""",
        'bugfix': f"""
## Bug Fix: {extract_bug_description(analysis)}

### Issue
- **Reported in**: #[issue-number]
- **Severity**: {determine_severity(analysis)}
- **Affected versions**: {get_affected_versions(analysis)}

### Root Cause
{analyze_root_cause(analysis)}

### Solution
{describe_solution(analysis)}

### Testing
- [ ] Bug is reproducible before fix
- [ ] Bug is resolved after fix
- [ ] No regressions introduced
- [ ] Edge cases tested

### Verification Steps
1. Step to reproduce original issue
2. Apply this fix
3. Verify issue is resolved
""",
        'refactor': f"""
## Refactoring: {extract_refactor_scope(analysis)}

### Motivation
{describe_refactor_motivation(analysis)}

### Changes Made
{list_refactor_changes(analysis)}

### Benefits
- Improved {list_improvements(analysis)}
- Reduced {list_reductions(analysis)}

### Compatibility
- [ ] No breaking changes
- [ ] API remains unchanged
- [ ] Performance maintained or improved

### Metrics
| Metric | Before | After |
|--------|--------|-------|
| Complexity | X | Y |
| Test Coverage | X% | Y% |
| Performance | Xms | Yms |
"""
    }
    
    return templates.get(pr_type, templates['feature'])
```

### 10. Review Response Templates

Help with review responses:

```python
review_response_templates = {
    'acknowledge_feedback': """
Thank you for the thorough review! I'll address these points.
""",
    
    'explain_decision': """
Great question! I chose this approach because:
1. [Reason 1]
2. [Reason 2]

Alternative approaches considered:
- [Alternative 1]: [Why not chosen]
- [Alternative 2]: [Why not chosen]

Happy to discuss further if you have concerns.
""",
    
    'request_clarification': """
Thanks for the feedback. Could you clarify what you mean by [specific point]?
I want to make sure I understand your concern correctly before making changes.
""",
    
    'disagree_respectfully': """
I appreciate your perspective on this. I have a slightly different view:

[Your reasoning]

However, I'm open to discussing this further. What do you think about [compromise/middle ground]?
""",
    
    'commit_to_change': """
Good catch! I'll update this to [specific change].
This should address [concern] while maintaining [other requirement].
"""
}
```

## Output Format

1. **PR Summary**: Executive summary with key metrics
2. **Detailed Description**: Comprehensive PR description
3. **Review Checklist**: Context-aware review items  
4. **Risk Assessment**: Risk analysis with mitigation strategies
5. **Test Coverage**: Before/after coverage comparison
6. **Visual Aids**: Diagrams and visual diffs where applicable
7. **Size Recommendations**: Suggestions for splitting large PRs
8. **Review Automation**: Automated checks and findings

Focus on creating PRs that are a pleasure to review, with all necessary context and documentation for efficient code review process.
