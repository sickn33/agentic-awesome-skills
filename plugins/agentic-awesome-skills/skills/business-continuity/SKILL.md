---
name: business-continuity
description: Develop business continuity plans and impact analysis. Implement BCP
  testing and communication procedures. Use when building organizational resilience.
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

# Business Continuity Planning

Develop and maintain business continuity capabilities including Business Impact Analysis, communication plans, recovery procedures, and testing schedules for organizational resilience.

## When to Use

- Developing a formal Business Continuity Plan (BCP) for the organization
- Conducting a Business Impact Analysis (BIA) to prioritize recovery efforts
- Establishing communication plans for crisis scenarios
- Defining recovery procedures for critical business processes
- Scheduling and conducting BCP exercises and tests
- Meeting compliance requirements for continuity planning (SOC 2, ISO 27001, HIPAA, FedRAMP)

## BCP Framework

```yaml
bcp_phases:
  1_governance:
    actions:
      - Obtain executive sponsorship and funding
      - Assign BCP coordinator and team
      - Define BCP scope and policy
      - Establish BCP committee with cross-functional representation
    deliverables:
      - BCP policy statement
      - BCP team charter and roster
      - Scope document

  2_analysis:
    actions:
      - Conduct Business Impact Analysis (BIA)
      - Perform risk assessment for continuity threats
      - Identify critical business processes and dependencies
      - Determine recovery priorities and resource requirements
    deliverables:
      - BIA report
      - Risk assessment report
      - Critical process inventory

  3_strategy:
    actions:
      - Select recovery strategies for each critical process
      - Identify alternate work arrangements (remote, alternate site)
      - Define technology recovery strategies (DR plan)
      - Establish vendor and supply chain contingencies
    deliverables:
      - Recovery strategy document
      - Technology recovery plan
      - Alternate site arrangements

  4_plan_development:
    actions:
      - Write detailed recovery procedures
      - Develop communication plans (internal and external)
      - Create emergency response procedures
      - Document roles, responsibilities, and contact information
    deliverables:
      - Business Continuity Plan document
      - Communication plan
      - Emergency response procedures
      - Contact lists and call trees

  5_testing:
    actions:
      - Develop test plan and schedule
      - Conduct exercises (tabletop, functional, full-scale)
      - Evaluate results and identify gaps
      - Update plans based on lessons learned
    deliverables:
      - Test plan
      - Exercise reports
      - Updated BCP based on findings

  6_maintenance:
    actions:
      - Review and update BCP annually (minimum)
      - Update after significant organizational changes
      - Refresh BIA when business processes change
      - Maintain training and awareness program
    deliverables:
      - Annual BCP review record
      - Updated BIA (if changes occurred)
      - Training completion records
```

## Business Impact Analysis Template

```yaml
bia_template:
  process_assessment:
    process_name: ""
    process_owner: ""
    department: ""
    description: ""

    criticality_classification:
      mission_critical:
        max_tolerable_downtime: "0-4 hours"
        description: "Failure causes immediate, severe impact to customers or revenue"
        examples:
          - Payment processing
          - Authentication and authorization
          - Core API serving customer requests
          - Order fulfillment

      essential:
        max_tolerable_downtime: "4-24 hours"
        description: "Failure causes significant degradation but not complete loss"
        examples:
          - Customer support systems
          - Reporting and dashboards
          - Email and notifications
          - Billing and invoicing

      important:
        max_tolerable_downtime: "1-3 days"
        description: "Failure causes inconvenience and workarounds are available"
        examples:
          - Internal collaboration tools
          - Analytics and BI platforms
          - HR self-service systems
          - Knowledge base

      non_essential:
        max_tolerable_downtime: "3-7 days"
        description: "Failure has minimal operational impact"
        examples:
          - Development and test environments
          - Training platforms
          - Archive systems

    impact_categories:
      financial:
        revenue_loss_per_hour: ""
        penalty_or_fine_risk: ""
        recovery_cost_estimate: ""

      operational:
        affected_employees: ""
        affected_customers: ""
        workaround_available: "yes/no"
        workaround_description: ""

      reputational:
        customer_visibility: "high/medium/low"
        media_attention_risk: "high/medium/low"
        regulatory_reporting_required: "yes/no"

      legal_regulatory:
        compliance_impact: ""
        contractual_sla_breach: "yes/no"
        sla_penalty_details: ""

    dependencies:
      technology:
        - system: ""
          rto: ""
          rpo: ""
          dr_strategy: ""
      people:
        - role: ""
          minimum_staff: ""
          remote_capable: "yes/no"
      vendors:
        - vendor: ""
          service: ""
          sla: ""
          alternative: ""
      facilities:
        - location: ""
          alternative: ""

    recovery_requirements:
      rto: ""
      rpo: ""
      minimum_recovery_level: "Description of minimum acceptable service"
      full_recovery_target: "Time to full normal operations"
```

## Communication Plan

```yaml
communication_plan:
  activation_criteria:
    - Event affecting multiple critical systems
    - Physical facility unavailable
    - Pandemic or workforce availability crisis
    - Major vendor/partner outage
    - Cybersecurity incident with operational impact

  internal_communication:
    executive_notification:
      who: "CEO, CTO, CFO, VP Engineering, VP Operations"
      when: "Within 15 minutes of BCP activation"
      method: "Phone call (primary), SMS (secondary)"
      message_template: |
        BUSINESS CONTINUITY EVENT ACTIVATED
        Incident: [Brief description]
        Impact: [Systems/processes affected]
        Status: [Current state]
        Next update: [Time]
        Bridge call: [Number/link]

    team_notification:
      who: "All affected department leads and their teams"
      when: "Within 30 minutes of BCP activation"
      method: "Slack/Teams (primary), Email (secondary), SMS (tertiary)"
      message_template: |
        BCP ACTIVATED - [Event Type]
        What happened: [Description]
        What is affected: [Systems/services]
        What to do: [Immediate actions for your team]
        Status updates: [Channel/frequency]
        Questions: Contact [BCP coordinator]

    all_staff_notification:
      who: "All employees"
      when: "Within 1 hour of BCP activation"
      method: "Email, Slack/Teams announcement, intranet"
      content: "Situation summary, impact on work, expectations"

    status_updates:
      frequency: "Every 2 hours during active event, daily after stabilization"
      channel: "Dedicated Slack channel, email distribution list"
      content: "Current status, actions taken, next steps, timeline"

  external_communication:
    customers:
      who: "Affected customers"
      when: "Within 2 hours of BCP activation (if customer-facing impact)"
      method: "Status page update, email, in-app notification"
      message_template: |
        We are currently experiencing [issue description].
        Impact: [What customers may notice]
        Status: We are actively working to resolve this.
        Updates: Follow our status page at status.example.com
        ETA: [Estimated resolution time or "investigating"]

    regulatory:
      who: "Applicable regulatory bodies"
      when: "Per regulatory requirements (e.g., 72 hours for GDPR breach)"
      method: "Formal notification per regulatory procedure"

    media:
      who: "Press inquiries"
      when: "Only if media attention occurs"
      method: "Prepared statement through communications team"
      rule: "All media inquiries routed to designated spokesperson"

    vendors_partners:
      who: "Critical vendors and business partners"
      when: "Within 4 hours if partner services affected"
      method: "Direct contact via relationship manager"

  contact_lists:
    maintenance: "Updated quarterly"
    storage: "Accessible offline (printed, mobile app, cloud-independent)"
    includes:
      - BCP team members (name, role, phone, email, alternate phone)
      - Executive team
      - Department leads
      - Key vendor contacts
      - Regulatory contacts
      - Legal counsel
      - Insurance broker
      - PR/communications firm
```

## Recovery Procedures

```yaml
recovery_procedures:
  immediate_response:
    step_1: "Incident commander assesses situation and declares BCP activation"
    step_2: "Notify BCP team and establish command structure"
    step_3: "Activate communication plan"
    step_4: "Assess damage and determine scope of disruption"
    step_5: "Initiate appropriate recovery procedures based on scenario"

  scenario_specific:
    data_center_or_region_outage:
      - Activate DR failover procedures
      - Redirect traffic to DR region
      - Verify service restoration
      - Communicate status to stakeholders
      - Plan return to primary when available

    cybersecurity_incident:
      - Engage incident response team
      - Contain the threat (isolate affected systems)
      - Assess data impact and potential breach
      - Activate forensic investigation
      - Restore from known-good backups if needed
      - Notify legal and regulatory as required

    pandemic_workforce_disruption:
      - Activate remote work procedures
      - Verify VPN and remote access capacity
      - Redistribute critical functions if staff unavailable
      - Implement shift rotations to maintain coverage
      - Assess vendor ability to maintain service levels

    key_vendor_failure:
      - Assess impact on dependent business processes
      - Activate vendor contingency plan
      - Engage alternate vendor if available
      - Implement manual workarounds as needed
      - Communicate impact to affected stakeholders

    facility_unavailable:
      - Account for all personnel safety
      - Activate alternate work site arrangements
      - Redirect mail and deliveries
      - Set up temporary communication channels
      - Assess timeline for facility restoration

  stabilization:
    - Monitor recovered services continuously
    - Address any residual issues
    - Begin planning return to normal operations
    - Continue stakeholder communication
    - Document all actions and decisions

  return_to_normal:
    - Develop return-to-normal plan
    - Execute failback procedures (if DR was activated)
    - Verify data consistency and integrity
    - Restore standard operating procedures
    - Conduct post-event review
    - Update BCP based on lessons learned
```

## Testing Schedule and Types

```yaml
testing_schedule:
  tabletop_exercise:
    frequency: "Quarterly"
    duration: "2-3 hours"
    participants: "BCP team, department leads, executive sponsor"
    format: "Facilitated discussion of a scenario"
    scenarios_to_rotate:
      - Major cloud provider region outage
      - Ransomware attack on production systems
      - Key employee unavailability (bus factor scenario)
      - Critical vendor goes out of business
      - Office building inaccessible
    output: "Exercise report with findings and action items"

  functional_exercise:
    frequency: "Semi-annually"
    duration: "4-8 hours"
    participants: "BCP team, IT operations, affected departments"
    format: "Execute specific recovery procedures without full disruption"
    examples:
      - "Activate remote work for one department for a day"
      - "Failover a non-production database and verify application connectivity"
      - "Execute communication plan and verify contact list accuracy"
      - "Restore a critical system from backup in an isolated environment"
    output: "Functional test report with measured recovery times"

  full_scale_exercise:
    frequency: "Annually"
    duration: "1-2 days"
    participants: "All BCP team members, IT, communications, management"
    format: "Simulate a major disruption and execute full recovery"
    includes:
      - "Activate BCP command structure"
      - "Execute DR failover for production systems"
      - "Activate communication plan"
      - "Operate from alternate arrangements for set period"
      - "Execute failback and return to normal"
    output: "Full exercise report with comprehensive metrics and lessons learned"

  testing_metrics:
    - "Time to activate BCP command structure"
    - "Time to complete communication notifications"
    - "Contact list accuracy (% reachable)"
    - "Actual RTO vs. target RTO per system"
    - "Actual RPO vs. target RPO per system"
    - "Number of issues identified"
    - "Number of runbook corrections needed"
```

## BCP Maintenance Checklist

```yaml
bcp_maintenance_checklist:
  quarterly:
    - [ ] Contact lists verified and updated
    - [ ] Tabletop exercise conducted
    - [ ] BCP team roster reviewed
    - [ ] Vendor contact information verified
    - [ ] Communication channels tested

  semi_annually:
    - [ ] Functional exercise conducted
    - [ ] Recovery procedures reviewed for accuracy
    - [ ] Technology dependencies verified
    - [ ] Vendor continuity capabilities confirmed

  annually:
    - [ ] Full-scale exercise conducted
    - [ ] Business Impact Analysis refreshed
    - [ ] Risk assessment updated
    - [ ] BCP document fully reviewed and updated
    - [ ] Executive review and sign-off obtained
    - [ ] Training completed for all BCP team members
    - [ ] Lessons learned from all exercises incorporated

  triggered_by_change:
    - [ ] New critical business process added
    - [ ] Major organizational restructuring
    - [ ] Technology platform migration
    - [ ] New regulatory requirement
    - [ ] Significant vendor change
    - [ ] Actual disruption event (post-event update)
```

## Best Practices

- Secure executive sponsorship: BCP without leadership commitment will not be taken seriously
- Base recovery priorities on Business Impact Analysis, not assumptions or technical preferences
- Test the communication plan independently: it fails more often than the technology recovery
- Maintain contact lists as if your primary systems are unavailable (offline copies, mobile access)
- Conduct tabletop exercises quarterly at minimum: they are low-cost and high-value for identifying gaps
- Include non-IT scenarios in planning (pandemic, facility loss, key personnel unavailability)
- Define clear activation criteria so there is no ambiguity about when to invoke the BCP
- Keep the BCP document practical and actionable, not a shelf document written for auditors
- Update the BCP after every significant organizational or technology change
- Review and incorporate lessons from every exercise and every real event into the plan

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
