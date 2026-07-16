---
name: incident-response-incident-response
description: "Use when working with incident response incident response"
risk: unknown
source: community
date_added: "2026-02-27"
---

## Use this skill when

- Working on incident response incident response tasks or workflows
- Needing guidance, best practices, or checklists for incident response incident response

## Do not use this skill when

- The task is unrelated to incident response incident response
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

Orchestrate multi-agent incident response with modern SRE practices for rapid resolution and learning:

[Extended thinking: This workflow implements a comprehensive incident command system (ICS) following modern SRE principles. Multiple specialized agents collaborate through defined phases: detection/triage, investigation/mitigation, communication/coordination, and resolution/postmortem. The workflow emphasizes speed without sacrificing accuracy, maintains clear communication channels, and ensures every incident becomes a learning opportunity through blameless postmortems and systematic improvements.]

## Configuration

### Severity Levels
- **P0/SEV-1**: Complete outage, security breach, data loss - immediate all-hands response
- **P1/SEV-2**: Major degradation, significant user impact - rapid response required
- **P2/SEV-3**: Minor degradation, limited impact - standard response
- **P3/SEV-4**: Cosmetic issues, no user impact - scheduled resolution

### Incident Types
- Performance degradation
- Service outage
- Security incident
- Data integrity issue
- Infrastructure failure
- Third-party service disruption

## Phase 1: Detection & Triage

### 1. Incident Detection and Classification
- Use Task tool with subagent_type="incident-responder"
- Prompt: "URGENT: Detect and classify incident: $ARGUMENTS. Analyze alerts from PagerDuty/Opsgenie/monitoring. Determine: 1) Incident severity (P0-P3), 2) Affected services and dependencies, 3) User impact and business risk, 4) Initial incident command structure needed. Check error budgets and SLO violations."
- Output: Severity classification, impact assessment, incident command assignments, SLO status
- Context: Initial alerts, monitoring dashboards, recent changes

### 2. Observability Analysis
- Use Task tool with subagent_type="observability-monitoring::observability-engineer"
- Prompt: "Perform rapid observability sweep for incident: $ARGUMENTS. Query: 1) Distributed tracing (OpenTelemetry/Jaeger), 2) Metrics correlation (Prometheus/Grafana/DataDog), 3) Log aggregation (ELK/Splunk), 4) APM data, 5) Real User Monitoring. Identify anomalies, error patterns, and service degradation points."
- Output: Observability findings, anomaly detection, service health matrix, trace analysis
- Context: Severity level from step 1, affected services

### 3. Initial Mitigation
- Use Task tool with subagent_type="incident-responder"
- Prompt: "Implement immediate mitigation for P$SEVERITY incident: $ARGUMENTS. Actions: 1) Traffic throttling/rerouting if needed, 2) Feature flag disabling for affected features, 3) Circuit breaker activation, 4) Rollback assessment for recent deployments, 5) Scale resources if capacity-related. Prioritize user experience restoration."
- Output: Mitigation actions taken, temporary fixes applied, rollback decisions
- Context: Observability findings, severity classification

## Phase 2: Investigation & Root Cause Analysis

### 4. Deep System Debugging
- Use Task tool with subagent_type="error-debugging::debugger"
- Prompt: "Conduct deep debugging for incident: $ARGUMENTS using observability data. Investigate: 1) Stack traces and error logs, 2) Database query performance and locks, 3) Network latency and timeouts, 4) Memory leaks and CPU spikes, 5) Dependency failures and cascading errors. Apply Five Whys analysis."
- Output: Root cause identification, contributing factors, dependency impact map
- Context: Observability analysis, mitigation status

### 5. Security Assessment
- Use Task tool with subagent_type="security-scanning::security-auditor"
- Prompt: "Assess security implications of incident: $ARGUMENTS. Check: 1) DDoS attack indicators, 2) Authentication/authorization failures, 3) Data exposure risks, 4) Certificate issues, 5) Suspicious access patterns. Review WAF logs, security groups, and audit trails."
- Output: Security assessment, breach analysis, vulnerability identification
- Context: Root cause findings, system logs

### 6. Performance Engineering Analysis
- Use Task tool with subagent_type="application-performance::performance-engineer"
- Prompt: "Analyze performance aspects of incident: $ARGUMENTS. Examine: 1) Resource utilization patterns, 2) Query optimization opportunities, 3) Caching effectiveness, 4) Load balancer health, 5) CDN performance, 6) Autoscaling triggers. Identify bottlenecks and capacity issues."
- Output: Performance bottlenecks, resource recommendations, optimization opportunities
- Context: Debug findings, current mitigation state

## Phase 3: Resolution & Recovery

### 7. Fix Implementation
- Use Task tool with subagent_type="backend-development::backend-architect"
- Prompt: "Design and implement production fix for incident: $ARGUMENTS based on root cause. Requirements: 1) Minimal viable fix for rapid deployment, 2) Risk assessment and rollback capability, 3) Staged rollout plan with monitoring, 4) Validation criteria and health checks. Consider both immediate fix and long-term solution."
- Output: Fix implementation, deployment strategy, validation plan, rollback procedures
- Context: Root cause analysis, performance findings, security assessment

### 8. Deployment and Validation
- Use Task tool with subagent_type="deployment-strategies::deployment-engineer"
- Prompt: "Execute emergency deployment for incident fix: $ARGUMENTS. Process: 1) Blue-green or canary deployment, 2) Progressive rollout with monitoring, 3) Health check validation at each stage, 4) Rollback triggers configured, 5) Real-time monitoring during deployment. Coordinate with incident command."
- Output: Deployment status, validation results, monitoring dashboard, rollback readiness
- Context: Fix implementation, current system state

## Phase 4: Communication & Coordination

### 9. Stakeholder Communication
- Use Task tool with subagent_type="content-marketing::content-marketer"
- Prompt: "Manage incident communication for: $ARGUMENTS. Create: 1) Status page updates (public-facing), 2) Internal engineering updates (technical details), 3) Executive summary (business impact/ETA), 4) Customer support briefing (talking points), 5) Timeline documentation with key decisions. Update every 15-30 minutes based on severity."
- Output: Communication artifacts, status updates, stakeholder briefings, timeline log
- Context: All previous phases, current resolution status

### 10. Customer Impact Assessment
- Use Task tool with subagent_type="incident-responder"
- Prompt: "Assess and document customer impact for incident: $ARGUMENTS. Analyze: 1) Affected user segments and geography, 2) Failed transactions or data loss, 3) SLA violations and contractual implications, 4) Customer support ticket volume, 5) Revenue impact estimation. Prepare proactive customer outreach list."
- Output: Customer impact report, SLA analysis, outreach recommendations
- Context: Resolution progress, communication status

## Phase 5: Postmortem & Prevention

### 11. Blameless Postmortem
- Use Task tool with subagent_type="documentation-generation::docs-architect"
- Prompt: "Conduct blameless postmortem for incident: $ARGUMENTS. Document: 1) Complete incident timeline with decisions, 2) Root cause and contributing factors (systems focus), 3) What went well in response, 4) What could improve, 5) Action items with owners and deadlines, 6) Lessons learned for team education. Follow SRE postmortem best practices."
- Output: Postmortem document, action items list, process improvements, training needs
- Context: Complete incident history, all agent outputs

### 12. Monitoring and Alert Enhancement
- Use Task tool with subagent_type="observability-monitoring::observability-engineer"
- Prompt: "Enhance monitoring to prevent recurrence of: $ARGUMENTS. Implement: 1) New alerts for early detection, 2) SLI/SLO adjustments if needed, 3) Dashboard improvements for visibility, 4) Runbook automation opportunities, 5) Chaos engineering scenarios for testing. Ensure alerts are actionable and reduce noise."
- Output: New monitoring configuration, alert rules, dashboard updates, runbook automation
- Context: Postmortem findings, root cause analysis

### 13. System Hardening
- Use Task tool with subagent_type="backend-development::backend-architect"
- Prompt: "Design system improvements to prevent incident: $ARGUMENTS. Propose: 1) Architecture changes for resilience (circuit breakers, bulkheads), 2) Graceful degradation strategies, 3) Capacity planning adjustments, 4) Technical debt prioritization, 5) Dependency reduction opportunities. Create implementation roadmap."
- Output: Architecture improvements, resilience patterns, technical debt items, roadmap
- Context: Postmortem action items, performance analysis

## Success Criteria

### Immediate Success (During Incident)
- Service restoration within SLA targets
- Accurate severity classification within 5 minutes
- Stakeholder communication every 15-30 minutes
- No cascading failures or incident escalation
- Clear incident command structure maintained

### Long-term Success (Post-Incident)
- Comprehensive postmortem within 48 hours
- All action items assigned with deadlines
- Monitoring improvements deployed within 1 week
- Runbook updates completed
- Team training conducted on lessons learned
- Error budget impact assessed and communicated

## Coordination Protocols

### Incident Command Structure
- **Incident Commander**: Decision authority, coordination
- **Technical Lead**: Technical investigation and resolution
- **Communications Lead**: Stakeholder updates
- **Subject Matter Experts**: Specific system expertise

### Communication Channels
- War room (Slack/Teams channel or Zoom)
- Status page updates (StatusPage, Statusly)
- PagerDuty/Opsgenie for alerting
- Confluence/Notion for documentation

### Handoff Requirements
- Each phase provides clear context to the next
- All findings documented in shared incident doc
- Decision rationale recorded for postmortem
- Timestamp all significant events

Production incident requiring immediate response: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
