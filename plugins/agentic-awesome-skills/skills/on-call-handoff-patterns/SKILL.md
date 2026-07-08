---
name: on-call-handoff-patterns
description: "Effective patterns for on-call shift transitions, ensuring continuity, context transfer, and reliable incident response across shifts."
risk: unknown
source: community
date_added: "2026-02-27"
---

# On-Call Handoff Patterns

Effective patterns for on-call shift transitions, ensuring continuity, context transfer, and reliable incident response across shifts.

## Do not use this skill when

- The task is unrelated to on-call handoff patterns
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Transitioning on-call responsibilities
- Writing shift handoff summaries
- Documenting ongoing investigations
- Establishing on-call rotation procedures
- Improving handoff quality
- Onboarding new on-call engineers

## Core Concepts

### 1. Handoff Components

| Component | Purpose |
|-----------|---------|
| **Active Incidents** | What's currently broken |
| **Ongoing Investigations** | Issues being debugged |
| **Recent Changes** | Deployments, configs |
| **Known Issues** | Workarounds in place |
| **Upcoming Events** | Maintenance, releases |

### 2. Handoff Timing

```
Recommended: 30 min overlap between shifts

Outgoing:
├── 15 min: Write handoff document
└── 15 min: Sync call with incoming

Incoming:
├── 15 min: Review handoff document
├── 15 min: Sync call with outgoing
└── 5 min: Verify alerting setup
```

## Templates

### Template 1: Shift Handoff Document

```markdown
# On-Call Handoff: Platform Team

**Outgoing**: @alice (2024-01-15 to 2024-01-22)
**Incoming**: @bob (2024-01-22 to 2024-01-29)
**Handoff Time**: 2024-01-22 09:00 UTC

---

## 🔴 Active Incidents

### None currently active
No active incidents at handoff time.

---

## 🟡 Ongoing Investigations

### 1. Intermittent API Timeouts (ENG-1234)
**Status**: Investigating
**Started**: 2024-01-20
**Impact**: ~0.1% of requests timing out

**Context**:
- Timeouts correlate with database backup window (02:00-03:00 UTC)
- Suspect backup process causing lock contention
- Added extra logging in PR #567 (deployed 01/21)

**Next Steps**:
- [ ] Review new logs after tonight's backup
- [ ] Consider moving backup window if confirmed

**Resources**:
- Dashboard: [API Latency](https://grafana/d/api-latency)
- Thread: #platform-eng (01/20, 14:32)

---

### 2. Memory Growth in Auth Service (ENG-1235)
**Status**: Monitoring
**Started**: 2024-01-18
**Impact**: None yet (proactive)

**Context**:
- Memory usage growing ~5% per day
- No memory leak found in profiling
- Suspect connection pool not releasing properly

**Next Steps**:
- [ ] Review heap dump from 01/21
- [ ] Consider restart if usage > 80%

**Resources**:
- Dashboard: [Auth Service Memory](https://grafana/d/auth-memory)
- Analysis doc: [Memory Investigation](https://docs/eng-1235)

---

## 🟢 Resolved This Shift

### Payment Service Outage (2024-01-19)
- **Duration**: 23 minutes
- **Root Cause**: Database connection exhaustion
- **Resolution**: Rolled back v2.3.4, increased pool size
- **Postmortem**: [POSTMORTEM-89](https://docs/postmortem-89)
- **Follow-up tickets**: ENG-1230, ENG-1231

---

## 📋 Recent Changes

### Deployments
| Service | Version | Time | Notes |
|---------|---------|------|-------|
| api-gateway | v3.2.1 | 01/21 14:00 | Bug fix for header parsing |
| user-service | v2.8.0 | 01/20 10:00 | New profile features |
| auth-service | v4.1.2 | 01/19 16:00 | Security patch |

### Configuration Changes
- 01/21: Increased API rate limit from 1000 to 1500 RPS
- 01/20: Updated database connection pool max from 50 to 75

### Infrastructure
- 01/20: Added 2 nodes to Kubernetes cluster
- 01/19: Upgraded Redis from 6.2 to 7.0

---

## ⚠️ Known Issues & Workarounds

### 1. Slow Dashboard Loading
**Issue**: Grafana dashboards slow on Monday mornings
**Workaround**: Wait 5 min after 08:00 UTC for cache warm-up
**Ticket**: OPS-456 (P3)

### 2. Flaky Integration Test
**Issue**: `test_payment_flow` fails intermittently in CI
**Workaround**: Re-run failed job (usually passes on retry)
**Ticket**: ENG-1200 (P2)

---

## 📅 Upcoming Events

| Date | Event | Impact | Contact |
|------|-------|--------|---------|
| 01/23 02:00 | Database maintenance | 5 min read-only | @dba-team |
| 01/24 14:00 | Major release v5.0 | Monitor closely | @release-team |
| 01/25 | Marketing campaign | 2x traffic expected | @platform |

---

## 📞 Escalation Reminders

| Issue Type | First Escalation | Second Escalation |
|------------|------------------|-------------------|
| Payment issues | @payments-oncall | @payments-manager |
| Auth issues | @auth-oncall | @security-team |
| Database issues | @dba-team | @infra-manager |
| Unknown/severe | @engineering-manager | @vp-engineering |

---

## 🔧 Quick Reference

### Common Commands
```bash
# Check service health
kubectl get pods -A | grep -v Running

# Recent deployments
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Clear cache (emergency only)
redis-cli FLUSHDB
```

### Important Links
- [Runbooks](https://wiki/runbooks)
- [Service Catalog](https://wiki/services)
- [Incident Slack](https://slack.com/incidents)
- [PagerDuty](https://pagerduty.com/schedules)

---

## Handoff Checklist

### Outgoing Engineer
- [x] Document active incidents
- [x] Document ongoing investigations
- [x] List recent changes
- [x] Note known issues
- [x] Add upcoming events
- [x] Sync with incoming engineer

### Incoming Engineer
- [ ] Read this document
- [ ] Join sync call
- [ ] Verify PagerDuty is routing to you
- [ ] Verify Slack notifications working
- [ ] Check VPN/access working
- [ ] Review critical dashboards
```

### Template 2: Quick Handoff (Async)

```markdown
# Quick Handoff: @alice → @bob

## TL;DR
- No active incidents
- 1 investigation ongoing (API timeouts, see ENG-1234)
- Major release tomorrow (01/24) - be ready for issues

## Watch List
1. API latency around 02:00-03:00 UTC (backup window)
2. Auth service memory (restart if > 80%)

## Recent
- Deployed api-gateway v3.2.1 yesterday (stable)
- Increased rate limits to 1500 RPS

## Coming Up
- 01/23 02:00 - DB maintenance (5 min read-only)
- 01/24 14:00 - v5.0 release

## Questions?
I'll be available on Slack until 17:00 today.
```

### Template 3: Incident Handoff (Mid-Incident)

```markdown
# INCIDENT HANDOFF: Payment Service Degradation

**Incident Start**: 2024-01-22 08:15 UTC
**Current Status**: Mitigating
**Severity**: SEV2

---

## Current State
- Error rate: 15% (down from 40%)
- Mitigation in progress: scaling up pods
- ETA to resolution: ~30 min

## What We Know
1. Root cause: Memory pressure on payment-service pods
2. Triggered by: Unusual traffic spike (3x normal)
3. Contributing: Inefficient query in checkout flow

## What We've Done
- Scaled payment-service from 5 → 15 pods
- Enabled rate limiting on checkout endpoint
- Disabled non-critical features

## What Needs to Happen
1. Monitor error rate - should reach <1% in ~15 min
2. If not improving, escalate to @payments-manager
3. Once stable, begin root cause investigation

## Key People
- Incident Commander: @alice (handing off)
- Comms Lead: @charlie
- Technical Lead: @bob (incoming)

## Communication
- Status page: Updated at 08:45
- Customer support: Notified
- Exec team: Aware

## Resources
- Incident channel: #inc-20240122-payment
- Dashboard: [Payment Service](https://grafana/d/payments)
- Runbook: [Payment Degradation](https://wiki/runbooks/payments)

---

**Incoming on-call (@bob) - Please confirm you have:**
- [ ] Joined #inc-20240122-payment
- [ ] Access to dashboards
- [ ] Understand current state
- [ ] Know escalation path
```

## Handoff Sync Meeting

### Agenda (15 minutes)

```markdown
## Handoff Sync: @alice → @bob

1. **Active Issues** (5 min)
   - Walk through any ongoing incidents
   - Discuss investigation status
   - Transfer context and theories

2. **Recent Changes** (3 min)
   - Deployments to watch
   - Config changes
   - Known regressions

3. **Upcoming Events** (3 min)
   - Maintenance windows
   - Expected traffic changes
   - Releases planned

4. **Questions** (4 min)
   - Clarify anything unclear
   - Confirm access and alerting
   - Exchange contact info
```

## On-Call Best Practices

### Before Your Shift

```markdown
## Pre-Shift Checklist

### Access Verification
- [ ] VPN working
- [ ] kubectl access to all clusters
- [ ] Database read access
- [ ] Log aggregator access (Splunk/Datadog)
- [ ] PagerDuty app installed and logged in

### Alerting Setup
- [ ] PagerDuty schedule shows you as primary
- [ ] Phone notifications enabled
- [ ] Slack notifications for incident channels
- [ ] Test alert received and acknowledged

### Knowledge Refresh
- [ ] Review recent incidents (past 2 weeks)
- [ ] Check service changelog
- [ ] Skim critical runbooks
- [ ] Know escalation contacts

### Environment Ready
- [ ] Laptop charged and accessible
- [ ] Phone charged
- [ ] Quiet space available for calls
- [ ] Secondary contact identified (if traveling)
```

### During Your Shift

```markdown
## Daily On-Call Routine

### Morning (start of day)
- [ ] Check overnight alerts
- [ ] Review dashboards for anomalies
- [ ] Check for any P0/P1 tickets created
- [ ] Skim incident channels for context

### Throughout Day
- [ ] Respond to alerts within SLA
- [ ] Document investigation progress
- [ ] Update team on significant issues
- [ ] Triage incoming pages

### End of Day
- [ ] Hand off any active issues
- [ ] Update investigation docs
- [ ] Note anything for next shift
```

### After Your Shift

```markdown
## Post-Shift Checklist

- [ ] Complete handoff document
- [ ] Sync with incoming on-call
- [ ] Verify PagerDuty routing changed
- [ ] Close/update investigation tickets
- [ ] File postmortems for any incidents
- [ ] Take time off if shift was stressful
```

## Escalation Guidelines

### When to Escalate

```markdown
## Escalation Triggers

### Immediate Escalation
- SEV1 incident declared
- Data breach suspected
- Unable to diagnose within 30 min
- Customer or legal escalation received

### Consider Escalation
- Issue spans multiple teams
- Requires expertise you don't have
- Business impact exceeds threshold
- You're uncertain about next steps

### How to Escalate
1. Page the appropriate escalation path
2. Provide brief context in Slack
3. Stay engaged until escalation acknowledges
4. Hand off cleanly, don't just disappear
```

## Best Practices

### Do's
- **Document everything** - Future you will thank you
- **Escalate early** - Better safe than sorry
- **Take breaks** - Alert fatigue is real
- **Keep handoffs synchronous** - Async loses context
- **Test your setup** - Before incidents, not during

### Don'ts
- **Don't skip handoffs** - Context loss causes incidents
- **Don't hero** - Escalate when needed
- **Don't ignore alerts** - Even if they seem minor
- **Don't work sick** - Swap shifts instead
- **Don't disappear** - Stay reachable during shift

## Resources

- [Google SRE - Being On-Call](https://sre.google/sre-book/being-on-call/)
- [PagerDuty On-Call Guide](https://www.pagerduty.com/resources/learn/on-call-management/)
- [Increment On-Call Issue](https://increment.com/on-call/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
