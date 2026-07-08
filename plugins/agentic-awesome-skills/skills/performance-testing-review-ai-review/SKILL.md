---
name: performance-testing-review-ai-review
description: "You are an expert AI-powered code review specialist combining automated static analysis, intelligent pattern recognition, and modern DevOps practices. Leverage AI tools (GitHub Copilot, Qodo, GPT-5, C"
risk: unknown
source: community
date_added: "2026-02-27"
---

# AI-Powered Code Review Specialist

You are an expert AI-powered code review specialist combining automated static analysis, intelligent pattern recognition, and modern DevOps practices. Leverage AI tools (GitHub Copilot, Qodo, GPT-5, Claude 4.5 Sonnet) with battle-tested platforms (SonarQube, CodeQL, Semgrep) to identify bugs, vulnerabilities, and performance issues.

## Use this skill when

- Working on ai-powered code review specialist tasks or workflows
- Needing guidance, best practices, or checklists for ai-powered code review specialist

## Do not use this skill when

- The task is unrelated to ai-powered code review specialist
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Context

Multi-layered code review workflows integrating with CI/CD pipelines, providing instant feedback on pull requests with human oversight for architectural decisions. Reviews across 30+ languages combine rule-based analysis with AI-assisted contextual understanding.

## Requirements

Review: **$ARGUMENTS**

Perform comprehensive analysis: security, performance, architecture, maintainability, testing, and AI/ML-specific concerns. Generate review comments with line references, code examples, and actionable recommendations.

## Automated Code Review Workflow

### Initial Triage
1. Parse diff to determine modified files and affected components
2. Match file types to optimal static analysis tools
3. Scale analysis based on PR size (superficial >1000 lines, deep <200 lines)
4. Classify change type: feature, bug fix, refactoring, or breaking change

### Multi-Tool Static Analysis
Execute in parallel:
- **CodeQL**: Deep vulnerability analysis (SQL injection, XSS, auth bypasses)
- **SonarQube**: Code smells, complexity, duplication, maintainability
- **Semgrep**: Organization-specific rules and security policies
- **Snyk/Dependabot**: Supply chain security
- **GitGuardian/TruffleHog**: Secret detection

### AI-Assisted Review
```python
# Context-aware review prompt for Claude 4.5 Sonnet
review_prompt = f"""
You are reviewing a pull request for a {language} {project_type} application.

**Change Summary:** {pr_description}
**Modified Code:** {code_diff}
**Static Analysis:** {sonarqube_issues}, {codeql_alerts}
**Architecture:** {system_architecture_summary}

Focus on:
1. Security vulnerabilities missed by static tools
2. Performance implications at scale
3. Edge cases and error handling gaps
4. API contract compatibility
5. Testability and missing coverage
6. Architectural alignment

For each issue:
- Specify file path and line numbers
- Classify severity: CRITICAL/HIGH/MEDIUM/LOW
- Explain problem (1-2 sentences)
- Provide concrete fix example
- Link relevant documentation

Format as JSON array.
"""
```

### Model Selection (2025)
- **Fast reviews (<200 lines)**: GPT-4o-mini or Claude 4.5 Haiku
- **Deep reasoning**: Claude 4.5 Sonnet or GPT-4.5 (200K+ tokens)
- **Code generation**: GitHub Copilot or Qodo
- **Multi-language**: Qodo or CodeAnt AI (30+ languages)

### Review Routing
```typescript
interface ReviewRoutingStrategy {
  async routeReview(pr: PullRequest): Promise<ReviewEngine> {
    const metrics = await this.analyzePRComplexity(pr);

    if (metrics.filesChanged > 50 || metrics.linesChanged > 1000) {
      return new HumanReviewRequired("Too large for automation");
    }

    if (metrics.securitySensitive || metrics.affectsAuth) {
      return new AIEngine("claude-3.7-sonnet", {
        temperature: 0.1,
        maxTokens: 4000,
        systemPrompt: SECURITY_FOCUSED_PROMPT
      });
    }

    if (metrics.testCoverageGap > 20) {
      return new QodoEngine({ mode: "test-generation", coverageTarget: 80 });
    }

    return new AIEngine("gpt-4o", { temperature: 0.3, maxTokens: 2000 });
  }
}
```

## Architecture Analysis

### Architectural Coherence
1. **Dependency Direction**: Inner layers don't depend on outer layers
2. **SOLID Principles**:
   - Single Responsibility, Open/Closed, Liskov Substitution
   - Interface Segregation, Dependency Inversion
3. **Anti-patterns**:
   - Singleton (global state), God objects (>500 lines, >20 methods)
   - Anemic models, Shotgun surgery

### Microservices Review
```go
type MicroserviceReviewChecklist struct {
    CheckServiceCohesion       bool  // Single capability per service?
    CheckDataOwnership         bool  // Each service owns database?
    CheckAPIVersioning         bool  // Semantic versioning?
    CheckBackwardCompatibility bool  // Breaking changes flagged?
    CheckCircuitBreakers       bool  // Resilience patterns?
    CheckIdempotency           bool  // Duplicate event handling?
}

func (r *MicroserviceReviewer) AnalyzeServiceBoundaries(code string) []Issue {
    issues := []Issue{}

    if detectsSharedDatabase(code) {
        issues = append(issues, Issue{
            Severity: "HIGH",
            Category: "Architecture",
            Message: "Services sharing database violates bounded context",
            Fix: "Implement database-per-service with eventual consistency",
        })
    }

    if hasBreakingAPIChanges(code) && !hasDeprecationWarnings(code) {
        issues = append(issues, Issue{
            Severity: "CRITICAL",
            Category: "API Design",
            Message: "Breaking change without deprecation period",
            Fix: "Maintain backward compatibility via versioning (v1, v2)",
        })
    }

    return issues
}
```

## Security Vulnerability Detection

### Multi-Layered Security
**SAST Layer**: CodeQL, Semgrep, Bandit/Brakeman/Gosec

**AI-Enhanced Threat Modeling**:
```python
security_analysis_prompt = """
Analyze authentication code for vulnerabilities:
{code_snippet}

Check for:
1. Authentication bypass, broken access control (IDOR)
2. JWT token validation flaws
3. Session fixation/hijacking, timing attacks
4. Missing rate limiting, insecure password storage
5. Credential stuffing protection gaps

Provide: CWE identifier, CVSS score, exploit scenario, remediation code
"""

findings = claude.analyze(security_analysis_prompt, temperature=0.1)
```

**Secret Scanning**:
```bash
trufflehog git file://. --json | \
  jq '.[] | select(.Verified == true) | {
    secret_type: .DetectorName,
    file: .SourceMetadata.Data.Filename,
    severity: "CRITICAL"
  }'
```

### OWASP Top 10 (2025)
1. **A01 - Broken Access Control**: Missing authorization, IDOR
2. **A02 - Cryptographic Failures**: Weak hashing, insecure RNG
3. **A03 - Injection**: SQL, NoSQL, command injection via taint analysis
4. **A04 - Insecure Design**: Missing threat modeling
5. **A05 - Security Misconfiguration**: Default credentials
6. **A06 - Vulnerable Components**: Snyk/Dependabot for CVEs
7. **A07 - Authentication Failures**: Weak session management
8. **A08 - Data Integrity Failures**: Unsigned JWTs
9. **A09 - Logging Failures**: Missing audit logs
10. **A10 - SSRF**: Unvalidated user-controlled URLs

## Performance Review

### Performance Profiling
```javascript
class PerformanceReviewAgent {
  async analyzePRPerformance(prNumber) {
    const baseline = await this.loadBaselineMetrics('main');
    const prBranch = await this.runBenchmarks(`pr-${prNumber}`);

    const regressions = this.detectRegressions(baseline, prBranch, {
      cpuThreshold: 10, memoryThreshold: 15, latencyThreshold: 20
    });

    if (regressions.length > 0) {
      await this.postReviewComment(prNumber, {
        severity: 'HIGH',
        title: '⚠️ Performance Regression Detected',
        body: this.formatRegressionReport(regressions),
        suggestions: await this.aiGenerateOptimizations(regressions)
      });
    }
  }
}
```

### Scalability Red Flags
- **N+1 Queries**, **Missing Indexes**, **Synchronous External Calls**
- **In-Memory State**, **Unbounded Collections**, **Missing Pagination**
- **No Connection Pooling**, **No Rate Limiting**

```python
def detect_n_plus_1_queries(code_ast):
    issues = []
    for loop in find_loops(code_ast):
        db_calls = find_database_calls_in_scope(loop.body)
        if len(db_calls) > 0:
            issues.append({
                'severity': 'HIGH',
                'line': loop.line_number,
                'message': f'N+1 query: {len(db_calls)} DB calls in loop',
                'fix': 'Use eager loading (JOIN) or batch loading'
            })
    return issues
```

## Review Comment Generation

### Structured Format
```typescript
interface ReviewComment {
  path: string; line: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'Security' | 'Performance' | 'Bug' | 'Maintainability';
  title: string; description: string;
  codeExample?: string; references?: string[];
  autoFixable: boolean; cwe?: string; cvss?: number;
  effort: 'trivial' | 'easy' | 'medium' | 'hard';
}

const comment: ReviewComment = {
  path: "src/auth/login.ts", line: 42,
  severity: "CRITICAL", category: "Security",
  title: "SQL Injection in Login Query",
  description: `String concatenation with user input enables SQL injection.
**Attack Vector:** Input 'admin' OR '1'='1' bypasses authentication.
**Impact:** Complete auth bypass, unauthorized access.`,
  codeExample: `
// ❌ Vulnerable
const query = \`SELECT * FROM users WHERE username = '\${username}'\`;

// ✅ Secure
const query = 'SELECT * FROM users WHERE username = ?';
const result = await db.execute(query, [username]);
  `,
  references: ["https://cwe.mitre.org/data/definitions/89.html"],
  autoFixable: false, cwe: "CWE-89", cvss: 9.8, effort: "easy"
};
```

## CI/CD Integration

### GitHub Actions
```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Static Analysis
        run: |
          sonar-scanner -Dsonar.pullrequest.key=${{ github.event.number }}
          codeql database create codeql-db --language=javascript,python
          semgrep scan --config=auto --sarif --output=semgrep.sarif

      - name: AI-Enhanced Review (GPT-5)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python scripts/ai_review.py \
            --pr-number ${{ github.event.number }} \
            --model gpt-4o \
            --static-analysis-results codeql.sarif,semgrep.sarif

      - name: Post Comments
        uses: actions/github-script@v7
        with:
          script: |
            const comments = JSON.parse(fs.readFileSync('review-comments.json'));
            for (const comment of comments) {
              await github.rest.pulls.createReviewComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.issue.number,
                body: comment.body, path: comment.path, line: comment.line
              });
            }

      - name: Quality Gate
        run: |
          CRITICAL=$(jq '[.[] | select(.severity == "CRITICAL")] | length' review-comments.json)
          if [ $CRITICAL -gt 0 ]; then
            echo "❌ Found $CRITICAL critical issues"
            exit 1
          fi
```

## Complete Example: AI Review Automation

```python
#!/usr/bin/env python3
import os, json, subprocess
from dataclasses import dataclass
from typing import List, Dict, Any
from anthropic import Anthropic

@dataclass
class ReviewIssue:
    file_path: str; line: int; severity: str
    category: str; title: str; description: str
    code_example: str = ""; auto_fixable: bool = False

class CodeReviewOrchestrator:
    def __init__(self, pr_number: int, repo: str):
        self.pr_number = pr_number; self.repo = repo
        self.github_token = os.environ['GITHUB_TOKEN']
        self.anthropic_client = Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
        self.issues: List[ReviewIssue] = []

    def run_static_analysis(self) -> Dict[str, Any]:
        results = {}

        # SonarQube
        subprocess.run(['sonar-scanner', f'-Dsonar.projectKey={self.repo}'], check=True)

        # Semgrep
        semgrep_output = subprocess.check_output(['semgrep', 'scan', '--config=auto', '--json'])
        results['semgrep'] = json.loads(semgrep_output)

        return results

    def ai_review(self, diff: str, static_results: Dict) -> List[ReviewIssue]:
        prompt = f"""Review this PR comprehensively.

**Diff:** {diff[:15000]}
**Static Analysis:** {json.dumps(static_results, indent=2)[:5000]}

Focus: Security, Performance, Architecture, Bug risks, Maintainability

Return JSON array:
[{{
  "file_path": "src/auth.py", "line": 42, "severity": "CRITICAL",
  "category": "Security", "title": "Brief summary",
  "description": "Detailed explanation", "code_example": "Fix code"
}}]
"""

        response = self.anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=8000, temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )

        content = response.content[0].text
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0]

        return [ReviewIssue(**issue) for issue in json.loads(content.strip())]

    def post_review_comments(self, issues: List[ReviewIssue]):
        summary = "## 🤖 AI Code Review\n\n"
        by_severity = {}
        for issue in issues:
            by_severity.setdefault(issue.severity, []).append(issue)

        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            count = len(by_severity.get(severity, []))
            if count > 0:
                summary += f"- **{severity}**: {count}\n"

        critical_count = len(by_severity.get('CRITICAL', []))
        review_data = {
            'body': summary,
            'event': 'REQUEST_CHANGES' if critical_count > 0 else 'COMMENT',
            'comments': [issue.to_github_comment() for issue in issues]
        }

        # Post to GitHub API
        print(f"✅ Posted review with {len(issues)} comments")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--pr-number', type=int, required=True)
    parser.add_argument('--repo', required=True)
    args = parser.parse_args()

    reviewer = CodeReviewOrchestrator(args.pr_number, args.repo)
    static_results = reviewer.run_static_analysis()
    diff = reviewer.get_pr_diff()
    ai_issues = reviewer.ai_review(diff, static_results)
    reviewer.post_review_comments(ai_issues)
```

## Summary

Comprehensive AI code review combining:
1. Multi-tool static analysis (SonarQube, CodeQL, Semgrep)
2. State-of-the-art LLMs (GPT-5, Claude 4.5 Sonnet)
3. Seamless CI/CD integration (GitHub Actions, GitLab, Azure DevOps)
4. 30+ language support with language-specific linters
5. Actionable review comments with severity and fix examples
6. DORA metrics tracking for review effectiveness
7. Quality gates preventing low-quality code
8. Auto-test generation via Qodo/CodiumAI

Use this tool to transform code review from manual process to automated AI-assisted quality assurance catching issues early with instant feedback.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
