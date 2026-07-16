---
name: design-orchestration
description: Orchestrates design workflows by routing work through brainstorming, multi-agent review, and execution readiness in the correct order.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Design Orchestration (Meta-Skill)

## Purpose

Ensure that **ideas become designs**, **designs are reviewed**, and
**only validated designs reach implementation**.

This skill does not generate designs.
It **controls the flow between other skills**.

---

## Operating Model

This is a **routing and enforcement skill**, not a creative one.

It decides:
- which skill must run next
- whether escalation is required
- whether execution is permitted

---

## Controlled Skills

This meta-skill coordinates the following:

- `brainstorming` — design generation
- `multi-agent-brainstorming` — design validation
- downstream implementation or planning skills

---

## Entry Conditions

Invoke this skill when:
- a user proposes a new feature, system, or change
- a design decision carries meaningful risk
- correctness matters more than speed

---

## Routing Logic

### Step 1 — Brainstorming (Mandatory)

If no validated design exists:

- Invoke `brainstorming`
- Require:
  - Understanding Lock
  - Initial Design
  - Decision Log started

You may NOT proceed without these artifacts.

---

### Step 2 — Risk Assessment

After brainstorming completes, classify the design as:

- **Low risk**
- **Moderate risk**
- **High risk**

Use factors such as:
- user impact
- irreversibility
- operational cost
- complexity
- uncertainty
- novelty

---

### Step 3 — Conditional Escalation

- **Low risk**  
  → Proceed to implementation planning

- **Moderate risk**  
  → Recommend `multi-agent-brainstorming`

- **High risk**  
  → REQUIRE `multi-agent-brainstorming`

Skipping escalation when required is prohibited.

---

### Step 4 — Multi-Agent Review (If Invoked)

If `multi-agent-brainstorming` is run:

Require:
- completed Understanding Lock
- current Design
- Decision Log

Do NOT allow:
- new ideation
- scope expansion
- reopening problem definition

Only critique, revision, and decision resolution are allowed.

---

### Step 5 — Execution Readiness Check

Before allowing implementation:

Confirm:
- design is approved (single-agent or multi-agent)
- Decision Log is complete
- major assumptions are documented
- known risks are acknowledged

If any condition fails:
- block execution
- return to the appropriate skill

---

## Enforcement Rules

- Do NOT allow implementation without a validated design
- Do NOT allow skipping required review
- Do NOT allow silent escalation or de-escalation
- Do NOT merge design and implementation phases

---

## Exit Conditions

This meta-skill exits ONLY when:
- the next step is explicitly identified, AND
- all required prior steps are complete

Possible exits:
- “Proceed to implementation planning”
- “Run multi-agent-brainstorming”
- “Return to brainstorming for clarification”
- "If a reviewed design reports a final disposition of APPROVED, REVISE, or REJECT, you MUST route the workflow accordingly and state the chosen next step explicitly."
---

## Design Philosophy

This skill exists to:
- slow down the right decisions
- speed up the right execution
- prevent costly mistakes

Good systems fail early.
Bad systems fail in production.

This meta-skill exists to enforce the former.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
