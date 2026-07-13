# Validation and Reporting

## Finding Validation

### Deduplication
- Group findings by (file, line, attack_class)
- Merge similar findings with different evidence
- Remove exact duplicates

### False Positive Removal
- Verify code context around each finding
- Check if security controls mitigate the issue
- Validate with tests or PoCs where possible
- Remove findings that cannot be triggered

### Severity Normalization
- Apply consistent severity criteria across all findings
- Upgrade severity if multiple weaknesses combine
- Downgrade if mitigating factors exist

## Report Generation

### SECURITY_AUDIT.json Structure

```json
{
  "metadata": {
    "timestamp": "ISO-8601",
    "target": "repository path",
    "auditor": "skill version",
    "duration_seconds": 0,
    "phases_completed": []
  },
  "summary": {
    "total_findings": 0,
    "by_severity": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0,
      "info": 0
    },
    "risk_score": 0
  },
  "findings": [
    {
      "id": "FINDING-001",
      "attack_class": "A1",
      "title": "Finding title",
      "severity": "critical|high|medium|low|info",
      "file": "path/to/file",
      "line": 0,
      "code_snippet": "relevant code",
      "description": "detailed description",
      "evidence": {
        "type": "code|config|dependency",
        "details": "evidence details"
      },
      "owasp_top_10": ["A03:2021-Injection"],
      "cwe": ["CWE-89"],
      "remediation": "fix recommendation",
      "references": ["https://..."]
    }
  ],
  "metadata_json_schema": "report-schema.json"
}
```

### Risk Score Calculation

- Critical: 10 points each
- High: 7 points each
- Medium: 4 points each
- Low: 1 point each
- Info: 0 points
- Normalize to 0-100 scale

### Markdown Summary

Include:
- Executive summary (2-3 sentences)
- Risk score and breakdown
- Top 5 critical findings with remediation
- Recommendations by priority
