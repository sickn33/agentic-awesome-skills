---
name: change-management
description: Implement change management processes. Configure CAB reviews, change
  windows, and rollback procedures. Use when managing production changes.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# Change Management

Implement structured change management processes covering change classification, CAB workflows, emergency change procedures, and automation for compliance with SOC 2, ITIL, and regulatory frameworks.

## Change Classification

```yaml
change_types:
  standard:
    risk: Low
    approval: Pre-approved (no per-change approval needed)
    lead_time: None (within maintenance window)
    examples:
      - Routine patching within tested patch sets
      - Certificate rotation with established procedure
      - Scaling operations (adding/removing instances within limits)
      - Pre-approved configuration changes
      - Log rotation and archival
    requirements:
      - Change must match an approved Standard Change template
      - Automated testing must pass
      - Documented rollback procedure exists
      - Within defined maintenance window

  normal_low:
    risk: Low
    approval: Peer review (1 approver)
    lead_time: 2 business days
    examples:
      - Non-critical configuration changes
      - Feature flag toggles
      - Documentation updates to production systems
      - Adding monitoring dashboards or alerts

  normal_medium:
    risk: Medium
    approval: Team lead + peer review (2 approvers)
    lead_time: 5 business days
    examples:
      - Application deployments with new features
      - Database schema changes (non-breaking)
      - Network rule modifications
      - Integration endpoint changes
      - Dependency version upgrades

  normal_high:
    risk: High
    approval: CAB review required
    lead_time: 10 business days
    examples:
      - Infrastructure migrations
      - Breaking database schema changes
      - Major version upgrades (OS, runtime, database engine)
      - Changes to authentication or authorization systems
      - Multi-service coordinated deployments
      - Changes affecting data processing or compliance controls

  emergency:
    risk: Variable
    approval: Emergency CAB (minimum 2 approvers from on-call)
    lead_time: None (immediate implementation)
    examples:
      - Security vulnerability remediation (active exploitation)
      - Production outage resolution
      - Data integrity emergency fixes
      - Regulatory compliance deadline fixes
    requirements:
      - Retroactive full documentation within 48 hours
      - Post-implementation review required
      - CAB retroactive review at next meeting
```

## Change Request Template

```yaml
change_request:
  metadata:
    id: "CR-YYYY-NNNN"
    title: ""
    requestor: ""
    date_submitted: ""
    target_date: ""
    change_type: ""  # standard | normal_low | normal_medium | normal_high | emergency

  description:
    summary: "Brief description of the change"
    detailed_description: "Full technical details of what will change"
    business_justification: "Why this change is needed"
    affected_systems: []
    affected_services: []
    affected_users: "Description of user impact"

  risk_assessment:
    risk_level: ""  # low | medium | high
    impact_if_failed: "What happens if the change fails"
    likelihood_of_failure: ""  # low | medium | high
    risk_mitigation: "Steps to reduce risk"
    dependencies: "Other systems or changes this depends on"

  implementation:
    change_window:
      start: ""
      end: ""
      maintenance_window: true
    implementation_steps:
      - step: "Step 1 description"
        responsible: "Person/team"
        estimated_duration: "X minutes"
      - step: "Step 2 description"
        responsible: "Person/team"
        estimated_duration: "X minutes"

  testing:
    pre_change_testing:
      - "Unit tests pass"
      - "Integration tests pass"
      - "Staging deployment verified"
    post_change_verification:
      - "Health check endpoints responding"
      - "Key transactions processing successfully"
      - "No error rate increase in monitoring"
      - "Performance metrics within baseline"

  rollback:
    rollback_plan: "Detailed steps to revert the change"
    rollback_trigger: "Conditions that trigger rollback"
    rollback_estimated_time: "X minutes"
    rollback_steps:
      - "Step 1: Revert deployment to previous version"
      - "Step 2: Verify rollback successful"
      - "Step 3: Notify stakeholders"
    data_rollback: "Describe any data migration rollback needed"

  communication:
    stakeholders_notified: []
    notification_sent_date: ""
    status_page_update: true
    customer_notification_required: false

  approvals:
    technical_reviewer: ""
    technical_approval_date: ""
    security_reviewer: ""
    security_approval_date: ""
    cab_approval_date: ""
    cab_notes: ""

  closure:
    implementation_date: ""
    implementation_result: ""  # success | partial | failed | rolled_back
    post_implementation_review: ""
    lessons_learned: ""
    follow_up_actions: []
```

## CAB Workflow

```yaml
cab_workflow:
  meeting_schedule:
    regular_cab: "Weekly, Thursday 2:00 PM"
    emergency_cab: "On-demand, minimum 2 members required"

  cab_members:
    permanent:
      - Engineering Manager (Chair)
      - Security Team Representative
      - Infrastructure/SRE Lead
      - Release Manager
    advisory:
      - Business stakeholder (invited per change)
      - Database administrator (for DB changes)
      - Network engineer (for network changes)

  agenda:
    1: "Review emergency changes from prior week"
    2: "Review high-risk change requests for upcoming window"
    3: "Review failed changes and lessons learned"
    4: "Discuss upcoming change freeze periods"
    5: "Review change metrics and trends"

  decision_criteria:
    approve_when:
      - Risk assessment is complete and accurate
      - Testing evidence is provided
      - Rollback plan is documented and feasible
      - Change window is appropriate
      - Required approvals obtained
      - No conflicts with other scheduled changes
    request_changes_when:
      - Rollback plan is missing or incomplete
      - Testing is insufficient for the risk level
      - Impact assessment needs clarification
      - Change conflicts with another scheduled change
    deny_when:
      - Risk is unacceptable without mitigation
      - Change window conflicts with freeze period
      - Dependencies are not resolved
      - Compliance concerns are unaddressed
```

## Emergency Change Procedure

```yaml
emergency_change_process:
  definition: "A change required to restore service or prevent imminent security compromise"

  step_1_declare:
    actions:
      - On-call engineer identifies need for emergency change
      - Incident commander approves emergency classification
      - Minimum 2 approvers from emergency CAB roster contacted
      - Document initial justification in incident channel

  step_2_approve:
    approval_method:
      - Slack/Teams approval with screenshots preserved
      - Verbal approval over bridge call (documented in notes)
      - Emergency approvers can be any 2 of the following roles:
        - Engineering Manager
        - SRE/Infrastructure Lead
        - Security Team Lead
        - VP of Engineering
    timeout: "If no response in 15 minutes, escalate to next tier"

  step_3_implement:
    actions:
      - Implement the minimum change needed to resolve the issue
      - Record all actions taken with timestamps
      - Monitor for successful resolution
      - Document any deviations from planned change

  step_4_verify:
    actions:
      - Confirm service restoration
      - Verify no unintended side effects
      - Run post-change verification checks
      - Update status page and stakeholders

  step_5_document:
    deadline: "Within 48 hours of implementation"
    required_documentation:
      - Complete change request form (retroactive)
      - Timeline of events and actions
      - Justification for emergency classification
      - Approval records (messages, emails)
      - Post-implementation verification results
      - Root cause analysis (what made it an emergency)
      - Preventive actions to avoid future emergency

  step_6_review:
    actions:
      - CAB review at next regular meeting
      - Assess if emergency classification was appropriate
      - Identify process improvements
      - Track emergency change trends
```

## Pull Request Template for Changes

```markdown
## Change Request

### Type
- [ ] Standard (pre-approved, low risk)
- [ ] Normal - Low Risk
- [ ] Normal - Medium Risk
- [ ] Normal - High Risk (CAB required)
- [ ] Emergency (retroactive documentation required)

### Description
<!-- What is being changed and why? -->

### Risk Assessment
**Impact if failed:** <!-- What breaks? -->
**Likelihood of failure:** Low / Medium / High
**Affected services:** <!-- List services -->
**User impact:** <!-- Will users notice? -->

### Testing Evidence
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Staging deployment verified
- [ ] Performance test completed (if applicable)
- [ ] Security scan clean (if applicable)

### Rollback Plan
<!-- How to revert if something goes wrong -->
**Estimated rollback time:** <!-- X minutes -->
**Data rollback needed:** Yes / No

### Deployment Plan
**Target window:** <!-- Date and time -->
**Estimated duration:** <!-- X minutes -->

### Post-Deployment Verification
- [ ] Health checks passing
- [ ] Error rates within baseline
- [ ] Key transactions working
- [ ] Monitoring dashboards reviewed

### Communication
- [ ] Team notified
- [ ] Stakeholders notified (if user-facing)
- [ ] Status page updated (if applicable)

### Approvals Required
- [ ] Peer review
- [ ] Team lead (medium+ risk)
- [ ] Security review (security-impacting changes)
- [ ] CAB approval (high risk)
```

## CI/CD Change Tracking Automation

```yaml
# GitHub Actions - Automated change tracking
name: Change Management
on:
  pull_request:
    types: [opened, synchronize, labeled]
  push:
    branches: [main]

jobs:
  classify-change:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Classify change risk
        id: classify
        run: |
          FILES_CHANGED=$(gh pr diff ${{ github.event.pull_request.number }} --name-only)

          # High risk indicators
          if echo "$FILES_CHANGED" | grep -qE 'terraform/|infrastructure/|migrations/|auth/|security/'; then
            echo "risk=high" >> $GITHUB_OUTPUT
            echo "::warning::High-risk change detected - CAB review may be required"
          elif echo "$FILES_CHANGED" | grep -qE 'config/|database/|api/'; then
            echo "risk=medium" >> $GITHUB_OUTPUT
          else
            echo "risk=low" >> $GITHUB_OUTPUT
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Add risk label
        run: |
          gh pr edit ${{ github.event.pull_request.number }} \
            --add-label "risk:${{ steps.classify.outputs.risk }}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Enforce approvals by risk
        if: steps.classify.outputs.risk == 'high'
        run: |
          APPROVALS=$(gh pr view ${{ github.event.pull_request.number }} \
            --json reviews --jq '[.reviews[] | select(.state=="APPROVED")] | length')
          if [ "$APPROVALS" -lt 2 ]; then
            echo "::error::High-risk changes require at least 2 approvals"
            exit 1
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  record-deployment:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Record deployment
        run: |
          CHANGE_ID="CR-$(date +%Y)-$(printf '%04d' ${{ github.run_number }})"
          echo "Change ID: $CHANGE_ID"
          echo "Deployed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          echo "Commit: ${{ github.sha }}"
          echo "Author: ${{ github.actor }}"

          cat > /tmp/deployment-record.json <<EOF
          {
            "change_id": "$CHANGE_ID",
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "commit": "${{ github.sha }}",
            "author": "${{ github.actor }}",
            "environment": "production",
            "status": "deployed"
          }
          EOF
```


## Contents

- [Change Freeze Policy](references/details.md)
- [Change Management Metrics](references/details.md)
- [Change Management Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Establishing change management processes for production environments
- Implementing change advisory board (CAB) workflows
- Defining change classification and approval requirements
- Configuring automated change tracking in CI/CD pipelines
- Handling emergency changes with proper controls and documentation

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
