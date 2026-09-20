---
name: incident-management
description: Implement incident management processes and escalation procedures. Configure
  on-call schedules and post-incident reviews. Use when managing production incidents.
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

# Incident Management

Implement effective incident management processes including severity definitions, escalation matrices, war room procedures, and blameless post-mortem templates.

## When to Use

- Establishing incident management processes for production systems
- Defining severity levels and escalation procedures
- Running war rooms and coordinating incident response
- Conducting blameless post-incident reviews
- Building on-call schedules and notification workflows
- Meeting compliance requirements for incident response (SOC 2, HIPAA, PCI DSS)

## Severity Levels

```yaml
severity_definitions:
  SEV1_critical:
    impact: "Complete service outage or data breach affecting all/most customers"
    examples:
      - Production site completely down
      - Data breach confirmed or suspected
      - Complete loss of a critical business function
      - Security incident with active exploitation
    response_time: "Immediate (within 5 minutes)"
    update_frequency: "Every 15-30 minutes"
    who_is_paged: "On-call engineer, engineering manager, incident commander, executive on-call"
    communication: "Status page update, customer email, executive notification"
    resolution_target: "< 1 hour to mitigate"

  SEV2_major:
    impact: "Major feature broken or severe degradation affecting many customers"
    examples:
      - Key feature completely non-functional
      - Significant performance degradation (>5x latency)
      - Data processing pipeline completely stalled
      - Partial outage affecting a region or segment
    response_time: "Within 15 minutes"
    update_frequency: "Every 30-60 minutes"
    who_is_paged: "On-call engineer, engineering manager"
    communication: "Status page update if customer-facing"
    resolution_target: "< 4 hours to mitigate"

  SEV3_moderate:
    impact: "Minor feature impaired or degradation affecting some customers"
    examples:
      - Non-critical feature broken
      - Moderate performance degradation
      - Elevated error rate (below threshold for SEV2)
      - Single-customer impact on non-critical function
    response_time: "Within 1 hour during business hours"
    update_frequency: "Every 2-4 hours"
    who_is_paged: "On-call engineer"
    communication: "Internal only unless customer inquires"
    resolution_target: "< 1 business day"

  SEV4_low:
    impact: "Cosmetic issue, minor inconvenience, or non-customer-facing problem"
    examples:
      - UI cosmetic bug
      - Non-critical monitoring gap
      - Internal tool degradation
      - Documentation inaccuracy in production
    response_time: "Next business day"
    update_frequency: "As needed"
    who_is_paged: "None (ticket created)"
    communication: "None"
    resolution_target: "Within sprint planning cycle"
```

## Escalation Matrix

```yaml
escalation_matrix:
  tier_1_on_call_engineer:
    reached_via: "PagerDuty / OpsGenie alert"
    responsibilities:
      - Acknowledge alert within 5 minutes
      - Assess severity and impact
      - Begin troubleshooting
      - Escalate to Tier 2 if unable to resolve within 30 minutes (SEV1/2)
    escalation_trigger: "Cannot resolve, needs additional expertise, or severity upgrade"

  tier_2_team_lead_or_sme:
    reached_via: "PagerDuty escalation or direct page"
    responsibilities:
      - Provide subject matter expertise
      - Assist with diagnosis and resolution
      - Coordinate with other teams if cross-service issue
      - Escalate to Tier 3 if broader coordination needed
    escalation_trigger: "Multi-service issue, needs executive decision, or customer-facing SEV1"

  tier_3_engineering_management:
    reached_via: "PagerDuty escalation or direct call"
    responsibilities:
      - Assign incident commander (if not already)
      - Allocate additional resources
      - Make business decisions (feature disable, rollback, etc.)
      - Coordinate external communication
    escalation_trigger: "Business impact decision, extended outage, or PR/legal concern"

  tier_4_executive:
    reached_via: "Direct phone call"
    responsibilities:
      - Authorize extraordinary measures
      - Manage board/investor communication
      - Approve public statements
      - Engage external resources (vendors, consultants)
    escalation_trigger: "Major breach, extended SEV1, regulatory or legal implication"

  time_based_escalation:
    sev1:
      "15 min no ack": "Re-page on-call + backup on-call"
      "30 min unresolved": "Page team lead"
      "1 hour unresolved": "Page engineering manager + executive on-call"
      "2 hours unresolved": "All-hands engineering involvement"
    sev2:
      "30 min no ack": "Re-page on-call + backup on-call"
      "1 hour unresolved": "Page team lead"
      "4 hours unresolved": "Page engineering manager"
```

## War Room Procedures

```yaml
war_room:
  activation: "Automatically for SEV1, on-demand for SEV2"

  setup:
    communication_channel:
      primary: "Dedicated Slack channel (#incident-YYYY-MM-DD-brief-name)"
      voice: "Zoom/Google Meet bridge (persistent link)"
      backup: "Phone conference bridge"
    channel_rules:
      - "Only incident-related communication in the channel"
      - "Use threads for side discussions"
      - "Prefix messages with role (IC:, COMMS:, ENG:)"

  roles:
    incident_commander:
      responsibilities:
        - Own the incident from declaration to resolution
        - Coordinate all response activities
        - Make decisions on response actions
        - Assign tasks to responders
        - Determine when incident is resolved
        - Schedule post-mortem
      selection: "On-call IC roster, or senior engineer who declares the incident"

    communications_lead:
      responsibilities:
        - Draft and publish status page updates
        - Coordinate customer notifications
        - Handle internal stakeholder updates
        - Manage executive communication
        - Document timeline in real-time
      selection: "Designated from on-call comms roster or engineering manager"

    technical_lead:
      responsibilities:
        - Lead technical diagnosis and troubleshooting
        - Coordinate technical responders
        - Recommend mitigation and resolution actions
        - Verify fix effectiveness
      selection: "Senior engineer with relevant system expertise"

    scribe:
      responsibilities:
        - Document all actions, decisions, and findings
        - Maintain real-time timeline
        - Record who did what and when
        - Capture screenshots and log excerpts
      selection: "Any available team member (can be rotated)"

  workflow:
    1_declare:
      - "IC declares incident with severity level"
      - "War room channel and bridge created"
      - "Roles assigned"
      - "First status update posted"

    2_assess:
      - "Determine scope and customer impact"
      - "Identify affected systems and services"
      - "Establish working hypothesis"

    3_mitigate:
      - "Focus on restoring service first, root cause second"
      - "IC approves all changes to production"
      - "Changes documented in real-time"
      - "Rollback if mitigation makes things worse"

    4_resolve:
      - "Confirm service restored to normal"
      - "Verify monitoring shows healthy metrics"
      - "IC declares incident resolved"
      - "Final status page update"

    5_follow_up:
      - "Schedule post-mortem within 48 hours"
      - "Assign action items from immediate findings"
      - "Send internal summary"
```

## On-Call Configuration

```yaml
on_call_schedule:
  rotation_structure:
    primary:
      rotation: "Weekly"
      handoff: "Monday 10:00 AM local time"
      team_size: "Minimum 5 engineers in rotation"
    secondary:
      rotation: "Weekly (offset from primary)"
      activation: "If primary does not acknowledge within 10 minutes"

  expectations:
    response_time: "Acknowledge alert within 5 minutes"
    availability: "Reachable by phone and laptop within 15 minutes"
    handoff: "Document any ongoing issues during handoff"
    compensation: "Per company on-call compensation policy"

  health:
    max_consecutive_weeks: 2
    minimum_gap_between_rotations: "2 weeks"
    post_incident_rest: "If engaged for 4+ hours overnight, late start next day"
    burnout_monitoring: "Track pages per person per week, rebalance if needed"

  pagerduty_configuration:
    escalation_policy:
      - level_1:
          target: "Primary on-call"
          timeout: "5 minutes"
      - level_2:
          target: "Secondary on-call"
          timeout: "10 minutes"
      - level_3:
          target: "Engineering manager"
          timeout: "15 minutes"

    notification_rules:
      high_urgency:
        - "Push notification immediately"
        - "Phone call after 1 minute"
        - "SMS after 2 minutes"
      low_urgency:
        - "Push notification"
        - "Email after 5 minutes"
```

## Post-Mortem Template

```markdown
# Post-Incident Review: [Incident Title]

**Date:** YYYY-MM-DD
**Severity:** SEV[1-4]
**Duration:** [Start time] to [End time] ([X hours Y minutes])
**Incident Commander:** [Name]
**Author:** [Name]
**Status:** Draft / In Review / Final

## Executive Summary
[2-3 sentence summary of what happened, the impact, and the resolution]

## Impact
- **Customer impact:** [Number/percentage of customers affected, what they experienced]
- **Duration of impact:** [How long customers were affected]
- **Revenue impact:** [Estimated financial impact, if applicable]
- **Data impact:** [Any data loss or corruption]
- **SLA impact:** [Any SLA breaches]

## Timeline (all times UTC)
| Time | Event |
|------|-------|
| HH:MM | [First anomaly detected by monitoring] |
| HH:MM | [Alert fired / customer report received] |
| HH:MM | [On-call engineer acknowledged] |
| HH:MM | [Incident declared at SEV level] |
| HH:MM | [War room established] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied] |
| HH:MM | [Service restored] |
| HH:MM | [Incident resolved] |

## Root Cause
[Detailed technical explanation of what caused the incident]

## Detection
- **How was the incident detected?** [Monitoring alert / customer report / manual observation]
- **Time to detect:** [Time from first anomaly to detection]
- **Could we have detected sooner?** [Yes/No, with explanation]

## Response
- **What went well:**
  - [List things that worked effectively during response]
  - [E.g., "Runbook for database failover was accurate and followed successfully"]
  - [E.g., "Communication to customers was timely and clear"]

- **What could be improved:**
  - [List things that slowed or hindered response]
  - [E.g., "Took 20 minutes to identify the correct service owner"]
  - [E.g., "Monitoring did not alert on the specific failure mode"]

## Contributing Factors
[List all factors that contributed to the incident occurring or being worse than it could have been. This is not about blame - it is about understanding the system.]

1. [Factor 1: e.g., "Configuration change was not tested in staging"]
2. [Factor 2: e.g., "Alert threshold was too high to catch gradual degradation"]
3. [Factor 3: e.g., "No circuit breaker between Service A and Service B"]

## Action Items
| ID | Action | Owner | Priority | Due Date | Status |
|----|--------|-------|----------|----------|--------|
| 1 | [Preventive action] | [Name] | P1 | YYYY-MM-DD | Open |
| 2 | [Detection improvement] | [Name] | P2 | YYYY-MM-DD | Open |
| 3 | [Process improvement] | [Name] | P2 | YYYY-MM-DD | Open |
| 4 | [Runbook update] | [Name] | P3 | YYYY-MM-DD | Open |

## Lessons Learned
[Key takeaways that should be shared broadly]

## Appendix
- [Link to monitoring dashboards during incident]
- [Link to relevant log queries]
- [Link to war room channel archive]
```

## Post-Mortem Process

```yaml
post_mortem_process:
  scheduling:
    sev1: "Within 48 hours of resolution"
    sev2: "Within 1 week of resolution"
    sev3: "Within 2 weeks (optional, based on learning potential)"
    sev4: "Not required"

  meeting_format:
    duration: "60-90 minutes"
    attendees:
      required: "IC, technical lead, scribe, involved engineers"
      optional: "Engineering manager, product manager, affected team leads"
    agenda:
      - "5 min: Review timeline and facts"
      - "15 min: Walk through root cause and contributing factors"
      - "15 min: Discuss what went well"
      - "15 min: Discuss what could be improved"
      - "15 min: Define and assign action items"
      - "5 min: Identify lessons learned and sharing plan"

  principles:
    - "Blameless: Focus on systems and processes, not individuals"
    - "Factual: Base discussion on data, logs, and observations"
    - "Forward-looking: Prioritize preventive actions over assigning fault"
    - "Complete: Address detection, response, and prevention"
    - "Actionable: Every finding should produce a tracked action item"

  action_item_tracking:
    - "All action items entered into issue tracker (Jira, GitHub Issues)"
    - "Priority assigned based on risk reduction potential"
    - "Owner assigned with due date"
    - "Reviewed in team standups and sprint planning"
    - "Tracked to completion"
    - "Monthly review of open post-mortem action items"
```

## Incident Metrics

```yaml
incident_metrics:
  mttr:
    name: "Mean Time to Resolve"
    definition: "Average time from incident detection to resolution"
    target: "SEV1: <1h, SEV2: <4h"
    trending: "Track monthly, aim for improvement"

  mttd:
    name: "Mean Time to Detect"
    definition: "Average time from incident start to detection"
    target: "< 5 minutes for SEV1/2"
    trending: "Monitors effectiveness of alerting"

  mtta:
    name: "Mean Time to Acknowledge"
    definition: "Average time from alert to engineer acknowledgment"
    target: "< 5 minutes"
    trending: "Monitors on-call responsiveness"

  incident_frequency:
    name: "Incidents per week/month by severity"
    target: "Trending downward"
    trending: "Monitors system reliability improvement"

  action_item_completion:
    name: "Post-mortem action item completion rate"
    target: "> 90% completed on time"
    trending: "Monitors follow-through on improvements"

  recurring_incidents:
    name: "Percentage of incidents with same root cause as previous incident"
    target: "< 10%"
    trending: "Monitors effectiveness of preventive actions"
```

## Incident Management Checklist

```yaml
incident_management_checklist:
  process_setup:
    - [ ] Severity levels defined with clear criteria
    - [ ] Escalation matrix documented
    - [ ] On-call schedule established and staffed
    - [ ] War room procedures documented
    - [ ] Post-mortem template created
    - [ ] Communication templates prepared (status page, email)
    - [ ] Incident management tool configured (PagerDuty, OpsGenie)

  per_incident:
    - [ ] Incident declared with severity level
    - [ ] War room established (SEV1/2)
    - [ ] Roles assigned (IC, comms, technical lead, scribe)
    - [ ] Timeline maintained in real-time
    - [ ] Status page updated (customer-facing impact)
    - [ ] Stakeholders notified per communication plan
    - [ ] Resolution verified with monitoring
    - [ ] Post-mortem scheduled
    - [ ] Post-mortem conducted and published
    - [ ] Action items tracked to completion

  compliance:
    - [ ] All SEV1/2 incidents have post-mortems
    - [ ] Incident log maintained for audit evidence
    - [ ] Metrics reported monthly
    - [ ] On-call health monitored (pages per person)
    - [ ] Annual incident response training conducted
    - [ ] Annual incident response plan test completed
```

## Best Practices

- Define severity levels with concrete examples so there is no ambiguity during an active incident
- Implement time-based escalation: if the on-call does not acknowledge, automatically escalate
- Focus on mitigation first, root cause second: restore service before investigating why it failed
- Run blameless post-mortems: the goal is to improve systems, not to assign fault to individuals
- Track post-mortem action items to completion: an unfinished action item means the same incident can recur
- Monitor incident metrics (MTTR, MTTD, frequency) as leading indicators of system reliability
- Protect on-call health: track page volume per person and redistribute if someone is overburdened
- Separate the incident commander role from the technical lead role in SEV1/2 incidents
- Practice incident response regularly with game days or chaos engineering exercises
- Archive incident records and post-mortems for compliance evidence and organizational learning

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
