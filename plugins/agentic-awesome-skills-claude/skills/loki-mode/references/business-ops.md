# Business Operations Reference

Workflows and procedures for business swarm agents.

## Marketing Operations

### Landing Page Checklist
```
[ ] Hero section with clear value proposition
[ ] Problem/solution narrative
[ ] Feature highlights (3-5 key features)
[ ] Social proof (testimonials, logos, stats)
[ ] Pricing section (if applicable)
[ ] FAQ section
[ ] Call-to-action (primary and secondary)
[ ] Footer with legal links
```

### SEO Optimization
```yaml
Technical SEO:
  - meta title: 50-60 characters, include primary keyword
  - meta description: 150-160 characters, compelling
  - canonical URL set
  - robots.txt configured
  - sitemap.xml generated
  - structured data (JSON-LD)
  - Open Graph tags
  - Twitter Card tags

Performance:
  - Largest Contentful Paint < 2.5s
  - First Input Delay < 100ms
  - Cumulative Layout Shift < 0.1
  - Images optimized (WebP, lazy loading)

Content:
  - H1 contains primary keyword
  - H2-H6 hierarchy logical
  - Internal linking strategy
  - Alt text on all images
  - Content length appropriate for intent
```

### Content Calendar Template
```markdown
# Week of [DATE]

## Monday
- [ ] Blog post: [TITLE]
- [ ] Social: LinkedIn announcement

## Wednesday  
- [ ] Email newsletter
- [ ] Social: Twitter thread

## Friday
- [ ] Case study update
- [ ] Social: Feature highlight
```

### Email Sequences

**Onboarding Sequence:**
```
Day 0: Welcome email (immediate)
  - Thank you for signing up
  - Quick start guide link
  - Support contact

Day 1: Getting started
  - First feature tutorial
  - Video walkthrough

Day 3: Value demonstration
  - Success metrics
  - Customer story

Day 7: Check-in
  - How's it going?
  - Feature discovery

Day 14: Advanced features
  - Power user tips
  - Integration options
```

**Abandoned Cart/Trial:**
```
Hour 1: Reminder
Day 1: Benefits recap
Day 3: Testimonial + urgency
Day 7: Final offer
```

---

## Sales Operations

### CRM Pipeline Stages
```
1. Lead (new contact)
2. Qualified (fits ICP, has need)
3. Meeting Scheduled
4. Demo Completed
5. Proposal Sent
6. Negotiation
7. Closed Won / Closed Lost
```

### Qualification Framework (BANT)
```yaml
Budget:
  - What's the allocated budget?
  - Who controls the budget?
  
Authority:
  - Who makes the final decision?
  - Who else is involved?
  
Need:
  - What problem are you solving?
  - What's the impact of not solving it?
  
Timeline:
  - When do you need a solution?
  - What's driving that timeline?
```

### Outreach Template
```markdown
Subject: [Specific pain point] at [Company]

Hi [Name],

I noticed [Company] is [specific observation about their business].

Many [similar role/company type] struggle with [problem], which leads to [negative outcome].

[Product] helps by [specific solution], resulting in [specific benefit with metric].

Would you be open to a 15-minute call to see if this could help [Company]?

Best,
[Name]
```

### Demo Script Structure
```
1. Rapport (2 min)
   - Confirm attendees and roles
   - Agenda overview

2. Discovery (5 min)
   - Confirm pain points
   - Understand current process
   - Success metrics

3. Solution (15 min)
   - Map features to their needs
   - Show don't tell
   - Address specific use cases

4. Social Proof (3 min)
   - Relevant customer stories
   - Metrics and outcomes

5. Pricing/Next Steps (5 min)
   - Present options
   - Answer objections
   - Define next steps
```

---

## Finance Operations

### Billing Setup Checklist (Stripe)
```bash
# Initialize Stripe
npm install stripe

# Required configurations:
- [ ] Products and prices created
- [ ] Customer portal enabled
- [ ] Webhook endpoints configured
- [ ] Tax settings (Stripe Tax or manual)
- [ ] Invoice settings customized
- [ ] Payment methods enabled
- [ ] Fraud protection rules
```

### Webhook Events to Handle
```javascript
const relevantEvents = [
  'customer.subscription.created',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'customer.updated',
  'charge.refunded'
];
```

### Key Metrics Dashboard
```yaml
Revenue Metrics:
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Net Revenue Retention
  - Expansion Revenue
  - Churn Rate

Customer Metrics:
  - CAC (Customer Acquisition Cost)
  - LTV (Lifetime Value)
  - LTV:CAC Ratio (target: 3:1)
  - Payback Period

Product Metrics:
  - Trial to Paid Conversion
  - Activation Rate
  - Feature Adoption
  - NPS Score
```

### Runway Calculation
```
Monthly Burn = Total Monthly Expenses - Monthly Revenue
Runway (months) = Cash Balance / Monthly Burn

Healthy: > 18 months
Warning: 6-12 months
Critical: < 6 months
```

---

## Legal Operations

### Terms of Service Template Sections
```
1. Acceptance of Terms
2. Description of Service
3. User Accounts and Registration
4. User Conduct and Content
5. Intellectual Property Rights
6. Payment Terms (if applicable)
7. Termination
8. Disclaimers and Limitations
9. Indemnification
10. Dispute Resolution
11. Changes to Terms
12. Contact Information
```

### Privacy Policy Requirements (GDPR)
```
Required Disclosures:
- [ ] Data controller identity
- [ ] Types of data collected
- [ ] Purpose of processing
- [ ] Legal basis for processing
- [ ] Data retention periods
- [ ] Third-party sharing
- [ ] User rights (access, rectification, deletion)
- [ ] Cookie usage
- [ ] International transfers
- [ ] Contact information
- [ ] DPO contact (if applicable)
```

### GDPR Compliance Checklist
```
Data Collection:
- [ ] Consent mechanism implemented
- [ ] Purpose limitation documented
- [ ] Data minimization practiced

User Rights:
- [ ] Right to access (data export)
- [ ] Right to rectification (edit profile)
- [ ] Right to erasure (delete account)
- [ ] Right to portability (download data)
- [ ] Right to object (marketing opt-out)

Technical:
- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] Access logging
- [ ] Breach notification process
```

### Cookie Consent Implementation
```javascript
// Cookie categories
const cookieCategories = {
  necessary: true,      // Always enabled
  functional: false,    // User preference
  analytics: false,     // Tracking/analytics
  marketing: false      // Advertising
};

// Required: Show banner before non-necessary cookies
// Required: Allow granular control
// Required: Easy withdrawal of consent
// Required: Record consent timestamp
```

---

## Customer Support Operations

### Ticket Priority Matrix
| Priority | Description | Response SLA | Resolution SLA |
|----------|-------------|--------------|----------------|
| P1 - Critical | Service down, data loss | 15 min | 4 hours |
| P2 - High | Major feature broken | 1 hour | 8 hours |
| P3 - Medium | Feature impaired | 4 hours | 24 hours |
| P4 - Low | General questions | 24 hours | 72 hours |

### Response Templates

**Acknowledgment:**
```
Hi [Name],

Thanks for reaching out! I've received your message about [issue summary].

I'm looking into this now and will get back to you within [SLA time].

In the meantime, [helpful resource or workaround if applicable].

Best,
[Agent Name]
```

**Resolution:**
```
Hi [Name],

Great news - I've resolved the issue with [specific problem].

Here's what was happening: [brief explanation]

Here's what I did to fix it: [solution summary]

To prevent this in the future: [if applicable]

Please let me know if you have any questions!

Best,
[Agent Name]
```

### Knowledge Base Structure
```
/help
├── /getting-started
│   ├── quick-start-guide
│   ├── account-setup
│   └── first-steps
├── /features
│   ├── feature-a
│   ├── feature-b
│   └── feature-c
├── /billing
│   ├── plans-and-pricing
│   ├── payment-methods
│   └── invoices
├── /integrations
│   ├── integration-a
│   └── integration-b
├── /troubleshooting
│   ├── common-issues
│   └── error-messages
└── /api
    ├── authentication
    ├── endpoints
    └── examples
```

---

## Analytics Operations

### Event Tracking Plan
```yaml
User Lifecycle:
  - user_signed_up:
      properties: [source, referrer, plan]
  - user_activated:
      properties: [activation_method, time_to_activate]
  - user_converted:
      properties: [plan, trial_length, conversion_path]
  - user_churned:
      properties: [reason, lifetime_value, last_active]

Core Actions:
  - feature_used:
      properties: [feature_name, context]
  - action_completed:
      properties: [action_type, duration, success]
  - error_encountered:
      properties: [error_type, page, context]

Engagement:
  - page_viewed:
      properties: [page_name, referrer, duration]
  - button_clicked:
      properties: [button_name, page, context]
  - search_performed:
      properties: [query, results_count]
```

### A/B Testing Framework
```yaml
Test Structure:
  name: "Homepage CTA Test"
  hypothesis: "Changing CTA from 'Sign Up' to 'Start Free' will increase conversions"
  primary_metric: signup_rate
  secondary_metrics: [time_on_page, bounce_rate]
  
  variants:
    control:
      description: "Original 'Sign Up' button"
      allocation: 50%
    variant_a:
      description: "'Start Free' button"
      allocation: 50%
  
  sample_size: 1000_per_variant
  duration: 14_days
  significance_level: 0.95

Analysis:
  - Calculate conversion rate per variant
  - Run chi-squared test for significance
  - Check for novelty effects
  - Segment by user type if needed
  - Document learnings
```

### Funnel Analysis
```
Signup Funnel:
  1. Landing Page Visit    → 100% (baseline)
  2. Signup Page View      → 40% (60% drop-off)
  3. Form Submitted        → 25% (15% drop-off)
  4. Email Verified        → 20% (5% drop-off)
  5. Onboarding Complete   → 12% (8% drop-off)
  6. First Value Action    → 8% (4% drop-off)

Optimization Targets:
  - Biggest drop: Landing → Signup (improve CTA, value prop)
  - Second biggest: Signup → Submit (simplify form)
```

### Weekly Metrics Report Template
```markdown
# Weekly Metrics Report: [Date Range]

## Key Metrics Summary
| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| New Users | X | Y | +Z% |
| Activated Users | X | Y | +Z% |
| Revenue | $X | $Y | +Z% |
| Churn | X% | Y% | -Z% |

## Highlights
- [Positive trend 1]
- [Positive trend 2]

## Concerns
- [Issue 1 and action plan]
- [Issue 2 and action plan]

## Experiments Running
- [Test name]: [current results]

## Next Week Focus
- [Priority 1]
- [Priority 2]
```

---

## Cross-Functional Workflows

### Feature Launch Checklist
```
Pre-Launch:
[ ] Feature complete and tested
[ ] Documentation updated
[ ] Help articles written
[ ] Email announcement drafted
[ ] Social content prepared
[ ] Sales team briefed
[ ] Support team trained
[ ] Analytics events added
[ ] Feature flag ready

Launch:
[ ] Deploy to production
[ ] Enable feature flag (% rollout)
[ ] Send email announcement
[ ] Publish blog post
[ ] Post on social media
[ ] Update changelog

Post-Launch:
[ ] Monitor error rates
[ ] Track feature adoption
[ ] Collect user feedback
[ ] Iterate based on data
```

### Incident Communication Template
```markdown
# [Incident Type] - [Brief Description]

## Status: [Investigating | Identified | Monitoring | Resolved]

## Timeline
- [HH:MM] Issue reported
- [HH:MM] Team engaged
- [HH:MM] Root cause identified
- [HH:MM] Fix deployed
- [HH:MM] Monitoring

## Impact
- Affected: [% of users, specific features]
- Duration: [X hours/minutes]

## Root Cause
[Brief explanation]

## Resolution
[What was done to fix]

## Prevention
[What changes will prevent recurrence]

## Next Update
[Time of next update or "Resolved"]
```
