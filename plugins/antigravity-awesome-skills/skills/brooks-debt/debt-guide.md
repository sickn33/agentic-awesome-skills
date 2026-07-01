# Tech Debt Assessment Guide — Mode 3

**Purpose:** Identify, classify, and prioritize technical debt across the entire codebase.
Every finding must follow the Iron Law: Symptom → Source → Consequence → Remedy.

---

## Evidence Gathering

If you have insufficient evidence to assess the codebase, ask the user ONE question —
choose the single question most relevant to what you already know:

1. "Which part of the codebase takes the longest to modify for a typical feature?"
2. "Which module do developers avoid touching, and why?"
3. "Which parts of the system have the fewest tests and the most bugs?"
4. "Is there a module that only one person fully understands?"

After one answer, proceed. Do not ask more than one question.
If the user declines or says they don't know, proceed with available evidence and note
which areas could not be assessed.

---

## Analysis Process

Work through these four steps in order.

### Step 1: Full Decay Risk Scan

Scan for all six decay risks across the entire codebase. List every finding before scoring
any of them. This prevents anchoring on early findings and missing systemic patterns.

For each risk, look for:

**Cognitive Overload:** Are there widespread naming problems, deeply nested logic, or
excessively long functions spread across many modules?

**Change Propagation:** Which modules cause the most ripple effects when changed?
Are there modules that everyone must modify when adding a new feature?

**Knowledge Duplication:** How many times is the same concept implemented independently?
Is the domain vocabulary consistent across the codebase?

**Accidental Complexity:** Are there architectural layers or abstractions that add no value?
Is the infrastructure overhead proportional to the problem being solved?

**Dependency Disorder:** Are there dependency cycles? Does domain logic depend on infrastructure?
Are there modules with no clear layering position?

**Domain Model Distortion:** Is business logic in the right layer?
Do code names match business names? Are domain objects anemic?

### Step 2: Score Each Finding with Pain × Spread

After listing all findings, score each one:

**Pain score (1–3):** How much does this slow down development today?
- 3: Developers actively avoid touching this area; it causes bugs on most changes
  *(e.g., "nobody wants to touch the billing module because it always breaks something")*
- 2: This area is noticeably slower to work in than the rest of the codebase
  *(e.g., "adding a field takes 2–3x longer here than elsewhere")*
- 1: This is a quality issue but not currently causing active pain
  *(e.g., "inconsistent naming, but we always know what we mean")*

**Spread score (1–3):** How many files, modules, or developers does this affect?
- 3: Affects 5+ modules or all developers on the team
  *(e.g., "every new feature touches the God class in core/")*
- 2: Affects 2–4 modules or a subset of the team
  *(e.g., "the auth and notification modules are tightly coupled")*
- 1: Isolated to one module or one developer's area
  *(e.g., "legacy parser that only one person maintains")*

**Priority = Pain × Spread** (max 9)

| Priority | Classification | Action |
|----------|---------------|--------|
| 7–9 | Critical debt | Address in next sprint |
| 4–6 | Scheduled debt | Plan within quarter |
| 1–3 | Monitored debt | Log and watch |

### Step 3: Classify Debt Intent

After scoring, classify each finding as intentional or accidental:

**Intentional debt** — a conscious shortcut taken to meet a deadline, with the expectation
of paying it back. The team knows about it. It may be legitimate (a strategic prototype,
a known temporary workaround during a migration).

**Accidental debt** — degradation that accumulated without a deliberate decision: the team
did not choose it and may not even know it exists. This is the kind Ward Cunningham's
original definition warned against — not a tactical trade-off, but structural erosion.

Mark each finding with `[intentional]` or `[accidental]` in the Debt Summary Table.
Intentional debt with no visible payback plan — no linked ticket, no code comment, no
documented decision — should be treated as accidental for prioritization purposes.
Focus remediation energy on accidental debt first; intentional debt at least has an owner.

### Step 4: Group by Decay Risk

Report findings grouped by risk type, not by file or module.
Grouping by risk reveals systemic patterns:
- "Change Propagation is systemic" → architectural intervention needed
- "Cognitive Overload is isolated" → localized refactoring sufficient

---

## Output

Use the standard Report Template from `../_shared/common.md`. Mode: Tech Debt Assessment.

After Findings, append a Debt Summary Table:

```
## Debt Summary
| Risk | Findings | Avg Priority | Classification | Intent |
|------|----------|-------------|----------------|--------|
| Cognitive Overload      | N | X.X | Monitored/Scheduled/Critical | intentional/accidental |
| Change Propagation      | N | X.X | ... | ... |
| Knowledge Duplication   | N | X.X | ... | ... |
| Accidental Complexity   | N | X.X | ... | ... |
| Dependency Disorder     | N | X.X | ... | ... |
| Domain Model Distortion | N | X.X | ... | ... |

**Recommended focus:** [risks with highest average priority]
```
