---
name: pm-ai-pol-probe
description: Define a Proof of Life probe to test a risky hypothesis cheaply. Use when you need harsh truth before building real product.
risk: safe
source: community
---

## Purpose

Define and document a **Proof of Life (PoL) probe**—a lightweight, disposable validation artifact designed to surface harsh truths before expensive development. Use this when you need to eliminate a specific risk or test a narrow hypothesis **without building production-quality software**. PoL probes are reconnaissance missions, not MVPs—they're meant to be deleted, not scaled.

This framework prevents prototype theater (expensive demos that impress stakeholders but teach nothing) and forces you to match validation method to actual learning goal.

## Key Concepts

### What is a PoL Probe?

A **Proof of Life (PoL) probe** is a deliberate, disposable validation experiment designed to answer one specific question as cheaply and quickly as possible. It's not a product, not an MVP, not a pilot—it's a targeted truth-seeking mission.

**Origin:** Coined by Dean Peters (Productside), building on Marty Cagan's 2014 work on prototype flavors and Jeff Patton's principle: *"The most expensive way to test your idea is to build production-quality software."*

---

### The 5 Essential Characteristics

Every PoL probe must satisfy these criteria:

| Characteristic | What It Means | Why It Matters |
|----------------|---------------|----------------|
| **Lightweight** | Minimal resource investment (hours/days, not weeks) | If it's expensive, you'll avoid killing it when the data says to |
| **Disposable** | Explicitly planned for deletion, not scaling | Prevents sunk-cost fallacy and scope creep |
| **Narrow Scope** | Tests one specific hypothesis or risk | Broad experiments yield ambiguous results |
| **Brutally Honest** | Surfaces harsh truths, not vanity metrics | Polite data is useless data |
| **Tiny & Focused** | Reconnaissance missions, never MVPs | Small surface area = faster learning cycles |

**Anti-Pattern:** If your "prototype" feels too polished to delete, it's not a PoL probe—it's prototype theater.

---

### PoL Probe vs. MVP

| Dimension | PoL Probe | MVP |
|-----------|-----------|-----|
| **Purpose** | De-risk decisions through narrow hypothesis testing | Justify ideas or defend roadmap direction |
| **Scope** | Single question, single risk | Smallest shippable product increment |
| **Lifespan** | Hours to days, then deleted | Weeks to months, then iterated |
| **Audience** | Internal team + narrow user sample | Real customers in production |
| **Fidelity** | Just enough illusion to catch signals | Production-quality (or close) |
| **Outcome** | Learn what *doesn't* work | Learn what *does* work (and ship it) |

**Key Distinction:** PoL probes are **pre-MVP reconnaissance**. You run probes to decide *if* you should build an MVP, not to launch something.

---

### The 5 Prototype Flavors

Match the probe type to your hypothesis, not your tooling comfort.

| Type | Core Question | Timeline | Tools/Methods | When to Use |
|------|---------------|----------|---------------|-------------|
| **1. Feasibility Checks** | "Can we build this?" | 1-2 days | GenAI prompt chains, API tests, data integrity sweeps, spike-and-delete code | Technical risk is unknown; third-party dependencies unclear |
| **2. Task-Focused Tests** | "Can users complete this job without friction?" | 2-5 days | Optimal Workshop, UsabilityHub, task flows | Critical moments (field labels, decision points, drop-off zones) need validation |
| **3. Narrative Prototypes** | "Does this workflow earn stakeholder buy-in?" | 1-3 days | Loom walkthroughs, Sora/Synthesia videos, slideware storyboards | You need to "tell vs. test"—share the story, measure interest |
| **4. Synthetic Data Simulations** | "Can we model this without production risk?" | 2-4 days | Synthea (user simulation), DataStax LangFlow (prompt logic testing) | Edge case exploration; unknown-unknown surfacing |
| **5. Vibe-Coded PoL Probes** | "Will this solution survive real user contact?" | 2-3 days | ChatGPT Canvas + Replit + Airtable = "Frankensoft" | You need user feedback on workflow/UX, but not production-grade code |

**Golden Rule:** *"Use the cheapest prototype that tells the harshest truth. If it doesn't sting, it's probably just theater."*

---

## When to Use a PoL Probe

✅ **Use a PoL probe when:**
- You have a specific, falsifiable hypothesis to test
- A particular risk blocks your next decision (technical feasibility, user task completion, stakeholder support)
- You need harsh truth fast (within days, not weeks)
- Building production software would be premature or wasteful
- You can articulate what "failure" looks like before you start

❌ **Don't use a PoL probe when:**
- You're trying to impress executives (that's prototype theater)
- You already know the answer and just want validation (that's confirmation bias)
- You can't articulate a clear hypothesis or disposal plan
- The learning goal is too broad ("Will customers like this?")
- You're using it to avoid making a hard decision

---

## Application

Use `template.md` for the full fill-in structure.

### PoL Probe Template

Use this structure to document your probe:

```markdown
# PoL Probe: [Descriptive Name]

## Hypothesis
[One-sentence statement of what you believe to be true]
Example: "If we reduce the onboarding form to 3 fields, completion rate will exceed 80%."

## Risk Being Eliminated
[What specific risk or unknown are you addressing?]
Example: "We don't know if users will abandon signup due to form length."

## Prototype Type
[Select one of the 5 flavors]
- [ ] Feasibility Check
- [ ] Task-Focused Test
- [ ] Narrative Prototype
- [ ] Synthetic Data Simulation
- [x] Vibe-Coded PoL Probe

## Target Users / Audience
[Who will interact with this probe?]
Example: "10 users from our early access waitlist, non-technical SMB owners."

## Success Criteria (Harsh Truth)
[What truth are you seeking? What would prove you wrong?]
- **Pass:** 8+ users complete signup in under 2 minutes
- **Fail:** <6 users complete, or average time exceeds 5 minutes
- **Learn:** Identify specific drop-off fields

## Tools / Stack
[What will you use to build this?]
Example: "ChatGPT Canvas for form UI, Airtable for data capture, Loom for post-session interviews."

## Timeline
- **Build:** 2 days
- **Test:** 1 day (10 user sessions)
- **Analyze:** 1 day
- **Disposal:** Day 5 (delete all code, keep learnings doc)

## Disposal Plan
[When and how will you delete this?]
Example: "After user sessions complete, archive recordings, delete Frankensoft code, document learnings in Notion."

## Owner
[Who is accountable for running and disposing of this probe?]

## Status
- [ ] Hypothesis defined
- [ ] Probe built
- [ ] Users recruited
- [ ] Testing complete
- [ ] Learnings documented
- [ ] Probe disposed
```

---

### Quality Checklist

Before launching your PoL probe, verify:

- [ ] **Lightweight:** Can you build this in 1-3 days?
- [ ] **Disposable:** Have you committed to a disposal date?
- [ ] **Narrow Scope:** Does it test ONE hypothesis?
- [ ] **Brutally Honest:** Will the data hurt if you're wrong?
- [ ] **Tiny & Focused:** Is this smaller than an MVP?
- [ ] **Falsifiable:** Can you describe what "failure" looks like?
- [ ] **Clear Owner:** Is one person accountable for executing and disposing of this?

If any answer is "no," revise your probe or reconsider whether you need one.

---

## Examples

See `examples/sample.md` for full PoL probe examples.

Mini example excerpt:

```markdown
**Hypothesis:** Users can distinguish "archive" vs "delete"
**Probe Type:** Task-Focused Test
**Pass:** 80%+ correct interpretation
```

## Common Pitfalls

- Running a broad "will users like this?" experiment instead of testing one falsifiable hypothesis
- Treating a PoL probe as a proto-MVP and refusing to dispose of it
- Using vanity metrics that avoid uncomfortable truth
- Skipping a pre-defined failure threshold before testing begins
- Choosing tools first and hypothesis second

## References

### Related Skills
- **[pol-probe-advisor](skills/pol-probe-advisor/SKILL.md)** (Interactive) — Decision framework for choosing which prototype type to use
- **[discovery-process](skills/discovery-process/SKILL.md)** (Workflow) — Use PoL probes in validation phase
- **[problem-statement](skills/problem-statement/SKILL.md)** (Component) — Define problem before creating PoL probe
- **[epic-hypothesis](skills/epic-hypothesis/SKILL.md)** (Component) — Frame hypothesis before testing with PoL probe

### External Frameworks
- **Jeff Patton** — *User Story Mapping* (lean validation principles)
- **Marty Cagan** — *Inspired* (2014 prototype flavors framework)
- **Dean Peters** — [*Vibe First, Validate Fast, Verify Fit*](https://deanpeters.substack.com/p/vibe-first-validate-fast-verify-fit) (Dean Peters' Substack, 2025)

### Tools Mentioned
- **Feasibility:** GenAI (ChatGPT, Claude), API testing tools
- **Task-Focused:** Optimal Workshop, UsabilityHub
- **Narrative:** Loom, Sora, Synthesia, Veo3 (text-to-video)
- **Synthetic Data:** Synthea (patient simulation), DataStax LangFlow
- **Vibe-Coded:** ChatGPT Canvas, Replit, Airtable, Carrd
