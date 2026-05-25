# Epic Hypothesis Examples

## Example 1: Good Epic Hypothesis

```markdown
### Epic Hypothesis: Google Calendar Integration for Trial Users

#### If/Then Hypothesis

**If we** provide one-click Google Calendar integration during onboarding
**for** trial users who manage multiple meetings and tasks daily
**Then we will** increase activation rate (defined as completing setup + creating first task) from 40% to 50%

#### Tiny Acts of Discovery Experiments

**We will test our assumption by:**
1. Creating a clickable Figma prototype of the integration flow and testing with 10 trial users
2. Adding a "Connect Google Calendar" CTA to the onboarding flow (but it's non-functional) and measuring click-through rate
3. Manually syncing Google Calendar for 5 trial users and surveying them after 1 week on perceived value

#### Validation Measures

**We know our hypothesis is valid if within 4 weeks we observe:**
- Click-through rate on the CTA is > 60% (quantitative)
- 8 out of 10 prototype testers say they'd use this feature regularly (qualitative)
- Manually synced users report saving 10+ minutes per day on task entry (qualitative)
```

---

## Example 2: Bad Epic Hypothesis (Vague)

```markdown
### Epic Hypothesis: Improve Dashboard

#### If/Then Hypothesis

**If we** improve the dashboard
**for** users
**Then we will** make the product better

#### Tiny Acts of Discovery Experiments

**We will test our assumption by:**
1. Building the dashboard

#### Validation Measures

**We know our hypothesis is valid if we observe:**
- Users like it
```

**Why this fails:**
- "Improve the dashboard" is not specific (improve how?)
- "Users" is not a persona (which users? all users?)
- "Make the product better" is not measurable
- Experiment is "build it" (not a lightweight test)
- Validation is subjective ("users like it" = not falsifiable)

**How to fix it:**
- Specify the hypothesis: "If we add real-time task status updates to the dashboard for project managers, then we will reduce time spent checking task progress from 20 min/day to 5 min/day"
- Define persona: "for project managers managing 10+ team members"
- Design experiments: "Prototype the dashboard, test with 5 PMs, measure time savings"
- Specify validation: "8 out of 10 PMs report saving 10+ min/day"

---

## Example 3: Invalidated Hypothesis (Good Process)

```markdown
### Epic Hypothesis: Slack Integration for Notifications

#### If/Then Hypothesis

**If we** send Slack notifications when tasks are assigned
**for** remote project managers
**Then we will** reduce task response time from 4 hours to 1 hour

#### Tiny Acts of Discovery Experiments

**We will test our assumption by:**
1. Manually send Slack notifications to 10 project managers for 2 weeks
2. Measure response time before/after
3. Survey users on perceived value

#### Validation Measures

**We know our hypothesis is valid if within 2 weeks we observe:**
- Average response time drops from 4 hours to 1 hour (quantitative)
- 8 out of 10 users say Slack notifications helped them respond faster (qualitative)

---

**Results after 2 weeks:**
- Average response time: 3.5 hours (minimal improvement)
- User feedback: "I already get too many Slack notifications. I ignore most of them."
- **Decision: Hypothesis INVALIDATED. Users don't want more Slack noise. Pivot to in-app notifications or email digests.**
```

**Why this is good:**
- Hypothesis was tested (not just built)
- Experiments were lightweight (manual Slack messages, not full integration)
- Results showed the hypothesis was wrong
- Team killed the epic before wasting engineering time
