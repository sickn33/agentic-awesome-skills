---
name: pm-ai-ai-shaped-readiness-advisor
description: Assess whether your product work is AI-first or AI-shaped. Use when evaluating AI maturity and choosing the next team capability to build.
risk: safe
source: community
---

## Purpose

Assess whether your product work is **"AI-first"** (using AI to automate existing tasks faster) or **"AI-shaped"** (fundamentally redesigning how product teams operate around AI capabilities). Use this to evaluate your readiness across **5 essential PM competencies for 2026**, identify gaps, and get concrete recommendations on which capability to build first.

**Key Distinction:** AI-first is cute (using Copilot to write PRDs faster). AI-shaped is survival (building a durable "reality layer" that both humans and AI trust, orchestrating AI workflows, compressing learning cycles).

This is not about AI tools—it's about **organizational redesign around AI as co-intelligence**. The interactive skill guides you through a maturity assessment, then recommends your next move.

## Key Concepts

### AI-First vs. AI-Shaped

| Dimension | AI-First (Cute) | AI-Shaped (Survival) |
|-----------|-----------------|----------------------|
| **Mindset** | Automate existing tasks | Redesign how work gets done |
| **Goal** | Speed up artifact creation | Compress learning cycles |
| **AI Role** | Task assistant | Strategic co-intelligence |
| **Advantage** | Temporary efficiency gains | Defensible competitive moat |
| **Example** | "Copilot writes PRDs 2x faster" | "AI agent validates hypotheses in 48 hours instead of 3 weeks" |

**Critical Insight:** If a competitor can replicate your AI usage by throwing bodies at it, it's not differentiation—it's just efficiency (which becomes table stakes within months).

---

### The 5 Essential PM Competencies (2026)

These competencies define AI-shaped product work. You'll assess your maturity on each.

#### 1. **Context Design**
Building a durable **"reality layer"** that both humans and AI can trust—treating AI attention as a scarce resource and allocating it deliberately.

**What it includes:**
- Documenting what's true vs. assumed
- Immutable constraints (technical, regulatory, strategic)
- Operational glossary (shared definitions)
- Evidence standards (what counts as validation)
- **Context boundaries** (what to persist vs. retrieve)
- **Memory architecture** (short-term conversational + long-term persistent)
- **Retrieval strategies** (semantic search, contextual retrieval)

**Key Principle:** *"If you can't point to evidence, constraints, and definitions, you don't have context. You have vibes."*

**Critical Distinction: Context Stuffing vs. Context Engineering**
- **Context Stuffing (AI-first):** Jamming volume without intent ("paste entire PRD")
- **Context Engineering (AI-shaped):** Shaping structure for attention (bounded domains, retrieve with intent)

**The 5 Diagnostic Questions:**
1. What specific decision does this support?
2. Can retrieval replace persistence?
3. Who owns the context boundary?
4. What fails if we exclude this?
5. Are we fixing structure or avoiding it?

**AI-first version:** Pasting PRDs into ChatGPT; no context boundaries; "more is better" mentality
**AI-shaped version:** CLAUDE.md files, evidence databases, constraint registries AI agents reference; two-layer memory architecture; Research→Plan→Reset→Implement cycle to prevent context rot

**Deep Dive:** See [`context-engineering-advisor`](../context-engineering-advisor/SKILL.md) for detailed guidance on diagnosing context stuffing and implementing memory architecture.

---

#### 2. **Agent Orchestration**
Creating repeatable, traceable AI workflows (not one-off prompts).

**What it includes:**
- Defined workflow loops: research → synthesis → critique → decision → log rationale
- Each step shows its work (traceable reasoning)
- Workflows run consistently (same inputs = predictable process)
- Version-controlled prompts and agents

**Key Principle:** One-off prompts are tactical. Orchestrated workflows are strategic.

**AI-first version:** "Ask ChatGPT to analyze this user feedback"
**AI-shaped version:** Automated workflow that ingests feedback, tags themes, generates hypotheses, flags contradictions, logs decisions

---

#### 3. **Outcome Acceleration**
Using AI to compress **learning cycles** (not just speed up tasks).

**What it includes:**
- Eliminate validation lag (PoL probes run in days, not weeks)
- Remove approval delays (AI pre-validates against constraints)
- Cut meeting overhead (async AI synthesis replaces status meetings)

**Key Principle:** Do less, purposefully. AI removes bottlenecks, not generates more work.

**AI-first version:** "AI writes user stories faster"
**AI-shaped version:** "AI runs feasibility checks overnight, eliminating 2 weeks of technical discovery"

---

#### 4. **Team-AI Facilitation**
Redesigning team systems so AI operates as **co-intelligence**, not an accountability shield.

**What it includes:**
- Review norms (who checks AI outputs, when, how)
- Evidence standards (AI must cite sources, not hallucinate)
- Decision authority (AI recommends, humans decide—clear boundaries)
- Psychological safety (team can challenge AI without feeling "dumb")

**Key Principle:** AI amplifies judgment, doesn't replace accountability.

**AI-first version:** "I used AI" as excuse for bad outputs
**AI-shaped version:** Clear review protocols; AI outputs treated as drafts requiring human validation

---

#### 5. **Strategic Differentiation**
Moving beyond efficiency to create **defensible competitive advantages**.

**What it includes:**
- New customer capabilities (what can users do now that they couldn't before?)
- Workflow rewiring (processes competitors can't replicate without full redesign)
- Economics competitors can't match (10x cost advantage through AI)

**Key Principle:** *"If a competitor can copy it by throwing bodies at it, it's not differentiation."*

**AI-first version:** "We use AI to write better docs"
**AI-shaped version:** "We validate product hypotheses in 2 days vs. industry standard 3 weeks—ship 6x more validated features per quarter"

---

### Anti-Patterns (What This Is NOT)

- **Not about AI tools:** Using Claude vs. ChatGPT doesn't matter. Redesigning workflows matters.
- **Not about speed:** Writing PRDs 2x faster isn't strategic if PRDs weren't the bottleneck.
- **Not about automation:** Automating bad processes just scales the bad.
- **Not about replacing humans:** AI-shaped orgs augment judgment, not eliminate it.

---

## When to Use Skill

✅ **Use this when:**
- You're using AI tools but not seeing strategic advantage
- You suspect you're "AI-first" (efficiency) but want to be "AI-shaped" (transformation)
- You need to prioritize which AI capability to build next
- Leadership asks "How are we using AI?" and you're not sure how to answer strategically
- You want to assess team readiness for AI-powered product work

❌ **Don't use this when:**
- You haven't started using AI at all (start with basic tools first)
- You're looking for tool recommendations (this is about organizational design, not tooling)
- You need tactical "how to write a prompt" guidance (use skills for that)

---

### Facilitation Source of Truth

Use [`workshop-facilitation`](../workshop-facilitation/SKILL.md) as the default interaction protocol for this skill.

It defines:
- session heads-up + entry mode (Guided, Context dump, Best guess)
- one-question turns with plain-language prompts
- progress labels (for example, Context Qx/8 and Scoring Qx/5)
- interruption handling and pause/resume behavior
- numbered recommendations at decision points
- quick-select numbered response options for regular questions (include `Other (specify)` when useful)

This file defines the domain-specific assessment content. If there is a conflict, follow this file's domain logic.

## Application

This interactive skill uses **adaptive questioning** to assess your maturity across 5 competencies, then recommends which to prioritize.

### Facilitation Protocol (Mandatory)

1. Ask exactly **one question per turn**.
2. Wait for the user's answer before asking the next question.
3. Use plain-language questions (no shorthand labels as the primary question). If needed, include an example response format.
4. Show progress on every turn using user-facing labels:
   - `Context Qx/8` during context gathering
   - `Scoring Qx/5` during maturity scoring
   - Include "questions remaining" when practical.
5. Do not use internal phase labels (like "Step 0") in user-facing prompts unless the user asks for internal structure details.
6. For maturity scoring questions, present concise 1-4 choices first; share full rubric details only if requested.
7. For context questions, offer concise numbered quick-select options when practical, plus `Other (specify)` for open-ended answers. Accept multi-select replies like `1,3` or `1 and 3`.
8. Give numbered recommendations **only at decision points**, not after every answer.
9. Decision points include:
   - After the full context summary
   - After the 5-dimension maturity profile
   - During priority selection and action-plan path selection
10. When recommendations are shown, enumerate clearly (`1.`, `2.`, `3.`) and accept selections like `#1`, `1`, `1 and 3`, `1,3`, or custom text.
11. If multiple options are selected, synthesize a combined path and continue.
12. If custom text is provided, map it to the closest valid path and continue without forcing re-entry.
13. Interruption handling is mandatory: if the user asks a meta question ("how many left?", "why this label?", "pause"), answer directly first, then restate current progress and resume with the pending question.
14. If the user says to stop or pause, halt the assessment immediately and wait for explicit resume.
15. If the user asks for "one question at a time," keep that mode for the rest of the session unless they explicitly opt out.
16. Before any assessment question, give a short heads-up on time/length and let the user choose an entry mode.

---

### Session Start: Heads-Up + Entry Mode (Mandatory)

**Agent opening prompt (use this first):**

"Quick heads-up before we start: this usually takes about 7-10 minutes and up to 13 questions total (8 context + 5 scoring).

How do you want to do this?
1. Guided mode: I’ll ask one question at a time.
2. Context dump: you paste what you already know, and I’ll skip anything redundant.
3. Best guess mode: I’ll make reasonable assumptions where details are missing, label them, and keep moving."

Accept selections as `#1`, `1`, `1 and 3`, `1,3`, or custom text.

**Mode behavior:**

- **If Guided mode:** Run Step 0 as written, then scoring.
- **If Context dump:** Ask for pasted context once, summarize it, identify gaps, and:
  - Skip any context questions already answered.
  - Ask only the minimum missing context needed (0-2 clarifying questions).
  - Move to scoring as soon as context is sufficient.
- **If Best guess mode:** Ask for the smallest viable starting input (role/team + primary goal), then:
  - Infer missing details using reasonable defaults.
  - Label each inferred item as `Assumption`.
  - Include confidence tags (`High`, `Medium`, `Low`) for each assumption.
  - Continue without blocking on unknowns.

At the final summary, include an **Assumptions to Validate** section when context dump or best guess mode was used.

---

### Step 0: Gather Context

**Agent asks:**

Collect context using this exact sequence, one question at a time:

1. "Which AI tools are you using today?"
2. "How does your team usually use AI today: one-off prompts, reusable templates, or multi-step workflows?"
3. "Who uses AI consistently today: just you, PMs, or cross-functional teams?"
4. "About how many PMs, engineers, and designers are on your team?"
5. "What stage are you in: startup, growth, or enterprise?"
6. "How are decisions made: centralized, distributed, or consensus-driven?"
7. "What competitive advantage are you trying to build with AI?"
8. "What's the biggest bottleneck slowing learning and iteration today?"

After question 8, summarize back in 4 lines:
- Current AI usage pattern
- Team context
- Strategic intent
- Primary bottleneck

---

### Step 1: Context Design Maturity

**Agent asks:**

Let's assess your **Context Design** capability—how well you've built a "reality layer" that both humans and AI can trust, and whether you're doing **context stuffing** (volume without intent) or **context engineering** (structure for attention).

**Which statement best describes your current state?**

1. **Level 1 (AI-First / Context Stuffing):** "I paste entire documents into ChatGPT every time I need something. No shared knowledge base. No context boundaries."
   - Reality: One-off prompting with no durability; "more is better" mentality
   - Problem: AI has no memory; you repeat yourself constantly; context stuffing degrades attention
   - **Context Engineering Gap:** No answers to the 5 diagnostic questions; persisting everything "just in case"

2. **Level 2 (Emerging / Early Structure):** "We have some docs (PRDs, strategy memos), but they're scattered. No consistent format. Starting to notice context stuffing issues (vague responses, normalized retries)."
   - Reality: Context exists but isn't structured for AI consumption; no retrieval strategy
   - Problem: AI can't reliably find or trust information; mixing always-needed with episodic context
   - **Context Engineering Gap:** No context boundary owner; no distinction between persist vs. retrieve

3. **Level 3 (Transitioning / Context Engineering Emerging):** "We've started using CLAUDE.md files and project instructions. Constraints registry exists. We're identifying what to persist vs. retrieve. Experimenting with Research→Plan→Reset→Implement cycle."
   - Reality: Structured context emerging, but not comprehensive; context boundaries defined but not fully enforced
   - Problem: Coverage is patchy; some areas well-documented, others vibe-driven; inconsistent retrieval practices
   - **Context Engineering Progress:** Can answer 3-4 of the 5 diagnostic questions; context boundary owner assigned; starting to use two-layer memory

4. **Level 4 (AI-Shaped / Context Engineering Mastery):** "We maintain a durable reality layer: constraints registry (20+ entries), evidence database, operational glossary (30+ terms). Two-layer memory architecture (short-term conversational + long-term persistent via vector DB). Context boundaries defined and owned. AI agents reference these automatically. We use Research→Plan→Reset→Implement to prevent context rot."
   - Reality: Comprehensive, version-controlled context both humans and AI trust; retrieval with intent (not completeness)
   - Outcome: AI operates with high confidence; reduces hallucination and rework; token usage optimized; no context stuffing
   - **Context Engineering Mastery:** Can answer all 5 diagnostic questions; context boundary audited quarterly; quantitative efficiency tracking: (Accuracy × Coherence) / (Tokens × Latency)

**Select your level:** [1, 2, 3, or 4]

**Note:** If you selected Level 1-2 and struggle with context stuffing, consider using [`context-engineering-advisor`](../context-engineering-advisor/SKILL.md) to diagnose and fix Context Hoarding Disorder before proceeding.

**User response:** [Selection]

**Agent records:** Context Design maturity = [Level X]

---

### Step 2: Agent Orchestration Maturity

**Agent asks:**

Now let's assess **Agent Orchestration**—whether you have repeatable AI workflows or just one-off prompts.

**Which statement best describes your current state?**

1. **Level 1 (AI-First):** "I type prompts into ChatGPT as needed. No saved workflows or templates."
   - Reality: Tactical, ad-hoc usage
   - Problem: Inconsistent results; can't scale or audit

2. **Level 2 (Emerging):** "I have a few saved prompts I reuse. Maybe some custom GPTs or Claude Projects."
   - Reality: Repeatable prompts, but not full workflows
   - Problem: Each step is manual; no orchestration

3. **Level 3 (Transitioning):** "We've built some multi-step workflows (research → synthesis → critique). Tracked in tools like Notion or Linear."
   - Reality: Workflows exist but require manual handoffs
   - Problem: Still human-in-the-loop for every step; not fully automated

4. **Level 4 (AI-Shaped):** "We have orchestrated AI workflows that run autonomously: research → synthesis → critique → decision → log rationale. Each step is traceable and version-controlled."
   - Reality: Workflows run consistently; show their work at each step
   - Outcome: Reliable, auditable, scalable AI processes

**Select your level:** [1, 2, 3, or 4]

**User response:** [Selection]

**Agent records:** Agent Orchestration maturity = [Level X]

---

### Step 3: Outcome Acceleration Maturity

**Agent asks:**

Next, **Outcome Acceleration**—are you using AI to compress learning cycles, or just speed up tasks?

**Which statement best describes your current state?**

1. **Level 1 (AI-First):** "AI helps me write docs faster (PRDs, user stories). Saves me a few hours per week."
   - Reality: Efficiency gains on artifact creation
   - Problem: Docs weren't the bottleneck; learning cycles unchanged

2. **Level 2 (Emerging):** "AI helps with research and synthesis (summarize user feedback, analyze competitors). Saves research time."
   - Reality: Modest learning acceleration
   - Problem: Still sequential; AI doesn't eliminate validation lag

3. **Level 3 (Transitioning):** "We use AI to run experiments faster (PoL probes, feasibility checks). Cut validation time from weeks to days."
   - Reality: Learning cycles compressing
   - Problem: Not yet systematic; only applied to some experiments

4. **Level 4 (AI-Shaped):** "AI systematically removes bottlenecks: overnight feasibility checks, async synthesis replaces meetings, automated validation against constraints. Learning cycles 5-10x faster."
   - Reality: Fundamental redesign of how learning happens
   - Outcome: Ship validated features 6x faster than competitors

**Select your level:** [1, 2, 3, or 4]

**User response:** [Selection]

**Agent records:** Outcome Acceleration maturity = [Level X]

---

### Step 4: Team-AI Facilitation Maturity

**Agent asks:**

Now assess **Team-AI Facilitation**—how well you've redesigned team systems for AI as co-intelligence.

**Which statement best describes your current state?**

1. **Level 1 (AI-First):** "I use AI privately. Team doesn't know or doesn't use it. No shared norms."
   - Reality: Individual tool usage, no team integration
   - Problem: Inconsistent quality; no accountability for AI outputs

2. **Level 2 (Emerging):** "Team uses AI, but no formal review process. 'I used AI' mentioned casually."
   - Reality: Awareness but no structure
   - Problem: AI outputs treated as final; errors slip through

3. **Level 3 (Transitioning):** "We have review norms emerging (AI outputs are drafts, not finals). Evidence standards discussed but not codified."
   - Reality: Cultural shift underway
   - Problem: Norms are informal; not everyone follows them

4. **Level 4 (AI-Shaped):** "Clear protocols: AI outputs require human validation, evidence standards codified, decision authority explicit (AI recommends, humans decide). Team treats AI as co-intelligence."
   - Reality: AI integrated into team operating system
   - Outcome: High-quality outputs; psychological safety maintained

**Select your level:** [1, 2, 3, or 4]

**User response:** [Selection]

**Agent records:** Team-AI Facilitation maturity = [Level X]

---

### Step 5: Strategic Differentiation Maturity

**Agent asks:**

Finally, **Strategic Differentiation**—are you creating defensible competitive advantages, or just efficiency gains?

**Which statement best describes your current state?**

1. **Level 1 (AI-First):** "We use AI to work faster (write better docs, respond to customers quicker). Efficiency gains only."
   - Reality: Table-stakes improvements
   - Problem: Competitors can copy this within months

2. **Level 2 (Emerging):** "AI enables us to do things we couldn't before (analyze 10x more data, test more hypotheses). New capabilities, but competitors could replicate."
   - Reality: Capability expansion, but not defensible
   - Problem: No moat; competitors hire more people to match

3. **Level 3 (Transitioning):** "We've redesigned some workflows around AI (e.g., validate hypotheses in 2 days vs. 3 weeks). Starting to create separation."
   - Reality: Workflow advantages emerging
   - Problem: Not yet systematic; only applied in pockets

4. **Level 4 (AI-Shaped):** "We've fundamentally rewired how we operate: customers get capabilities they can't get elsewhere, our learning cycles are 10x faster than industry standard, our economics are 5x better. Competitors can't replicate without full org redesign."
   - Reality: Defensible competitive moat
   - Outcome: Strategic advantage that compounds over time

**Select your level:** [1, 2, 3, or 4]

**User response:** [Selection]

**Agent records:** Strategic Differentiation maturity = [Level X]

---

### Step 6: Assess Maturity Profile

**Agent synthesizes:**

Here's your AI-Shaped Readiness Profile:

```
┌─────────────────────────────┬───────┬──────────┐
│ Competency                  │ Level │ Maturity │
├─────────────────────────────┼───────┼──────────┤
│ 1. Context Design           │   X   │ [Label]  │
│ 2. Agent Orchestration      │   X   │ [Label]  │
│ 3. Outcome Acceleration     │   X   │ [Label]  │
│ 4. Team-AI Facilitation     │   X   │ [Label]  │
│ 5. Strategic Differentiation│   X   │ [Label]  │
└─────────────────────────────┴───────┴──────────┘

Overall Assessment: [AI-First / Emerging / Transitioning / AI-Shaped]
```

**Maturity Labels:**
- **Level 1:** AI-First (efficiency only)
- **Level 2:** Emerging (early capabilities)
- **Level 3:** Transitioning (redesign underway)
- **Level 4:** AI-Shaped (strategic transformation)

**Overall Assessment Logic:**
- **AI-First:** Average level 1-1.5 (mostly Level 1s)
- **Emerging:** Average level 2-2.5 (mostly Level 2s)
- **Transitioning:** Average level 3-3.5 (mostly Level 3s)
- **AI-Shaped:** Average level 3.5-4 (mostly Level 4s)

---

### Step 7: Identify Priority Gap

**Agent asks:**

Based on your maturity profile, which competency should you prioritize first?

**Agent analyzes dependencies:**

**Dependency Logic:**
1. **Context Design is foundational** — If Level 1-2, this must be priority #1 (Agent Orchestration and Outcome Acceleration depend on it)
2. **Agent Orchestration enables Outcome Acceleration** — If Context Design is Level 3+, but Agent Orchestration is Level 1-2, prioritize orchestration
3. **Team-AI Facilitation is parallel** — Can be developed alongside others, but required for scale
4. **Strategic Differentiation requires Levels 3+ on others** — Don't focus here until foundational competencies are built

**Agent recommends:**

Based on your profile, I recommend focusing on **[Competency Name]** first because:

**Option 1: Context Design (if Level 1-2)**
- **Why:** Without durable context, AI operates on vibes. Every workflow will be fragile.
- **Impact:** Unlocks Agent Orchestration and Outcome Acceleration
- **Next Steps:** Build CLAUDE.md files, start constraints registry, create operational glossary

**Option 2: Agent Orchestration (if Context is 3+, but Orchestration is 1-2)**
- **Why:** You have context, but no repeatable workflows. Scaling requires orchestration.
- **Impact:** Turn one-off prompts into reliable, traceable workflows
- **Next Steps:** Document your most frequent AI workflow, version-control prompts, add traceability

**Option 3: Outcome Acceleration (if Context + Orchestration are 3+)**
- **Why:** You have infrastructure; now compress learning cycles
- **Impact:** Strategic advantage emerges from speed-to-learning
- **Next Steps:** Identify biggest bottleneck in learning cycle, design AI workflow to eliminate it

**Option 4: Team-AI Facilitation (if usage is individual, not team-wide)**
- **Why:** Can't scale if only you're AI-shaped; team must adopt
- **Impact:** Organizational transformation, not just individual productivity
- **Next Steps:** Establish review norms, codify evidence standards, create decision authority framework

**Option 5: Strategic Differentiation (if all others are 3+)**
- **Why:** You have the foundation; now build the moat
- **Impact:** Create defensible competitive advantage
- **Next Steps:** Identify workflow competitors can't replicate, design AI-enabled customer capabilities

**Which would you like to focus on?**

**Options:**
1. **Accept recommendation** — [Agent provides detailed action plan]
2. **Choose different priority** — [Agent warns about dependencies but allows override]
3. **Focus on multiple simultaneously** — [Agent suggests parallel tracks if feasible]

**User response:** [Selection]

---

### Step 8: Generate Action Plan

**Agent provides tailored action plan based on selected priority:**

---

#### If Priority = Context Design

**Goal:** Build a durable "reality layer" that both humans and AI trust—move from context stuffing to context engineering.

**Pre-Phase: Diagnose Context Stuffing (If Needed)**
If you're at Level 1-2, first diagnose context stuffing symptoms:
1. Run through the 5 diagnostic questions (see [`context-engineering-advisor`](../context-engineering-advisor/SKILL.md))
2. Identify what you're persisting that should be retrieved
3. Assign context boundary owner
4. Create Context Manifest (what's always-needed vs. episodic)

**Phase 1: Document Constraints (Week 1)**
1. Create a constraints registry:
   - Technical constraints (APIs, data models, performance limits)
   - Regulatory constraints (GDPR, HIPAA, etc.)
   - Strategic constraints (we will/won't build X)
2. Apply diagnostic question #4 to each constraint: "What fails if we exclude this?"
3. Format: Structured file AI agents can parse (YAML, JSON, or Markdown with frontmatter)
4. Version control in Git

**Phase 2: Build Operational Glossary (Week 2)**
1. List top 20-30 terms your team uses (e.g., "user," "customer," "activation," "churn")
2. Define each unambiguously (avoid "it depends")
3. Include edge cases and exceptions
4. Add to CLAUDE.md or project instructions
5. This becomes your **long-term persistent memory** (Declarative Memory)

**Phase 3: Establish Evidence Standards + Context Boundaries (Week 3)**
1. Define what counts as validation:
   - User feedback: "X users said Y" (with quotes)
   - Analytics: "Metric Z changed by N%" (with dashboard link)
   - Competitive intel: "Competitor A launched B" (with source)
2. Reject: "I think," "We feel," "It seems like"
3. Define context boundaries using the 5 diagnostic questions:
   - What specific decision does each piece of context support?
   - Can retrieval replace persistence?
   - Who owns the context boundary?
4. Create Context Manifest document
5. Codify in team docs

**Phase 4: Implement Memory Architecture + Workflows (Week 4)**
1. **Set up two-layer memory:**
   - **Short-term (conversational):** Summarize/truncate older parts of conversation
   - **Long-term (persistent):** Constraints registry + operational glossary (consider vector database for retrieval)
2. **Implement Research→Plan→Reset→Implement cycle:**
   - Research: Allow chaotic context gathering
   - Plan: Synthesize into high-density SPEC.md or PLAN.md
   - Reset: Clear context window
   - Implement: Use only the plan as context
3. Update AI prompts to reference constraints registry and glossary
4. Test: Ask AI to cite constraints when making recommendations
5. Measure: % of AI outputs that cite evidence vs. hallucinate; token usage efficiency

**Success Criteria:**
- ✅ Constraints registry has 20+ entries
- ✅ Operational glossary has 20-30 terms
- ✅ Evidence standards documented and shared
- ✅ Context Manifest created (always-needed vs. episodic)
- ✅ Context boundary owner assigned
- ✅ Two-layer memory architecture implemented
- ✅ Research→Plan→Reset→Implement cycle tested on 1 workflow
- ✅ AI agents reference these automatically
- ✅ Token usage down 30%+ (less context stuffing)
- ✅ Output consistency up (fewer retries)

**Related Skills:**
- **[`context-engineering-advisor`](../context-engineering-advisor/SKILL.md)** (Interactive) — Deep dive on diagnosing context stuffing and implementing memory architecture
- `problem-statement.md` — Define constraints before framing problems
- `epic-hypothesis.md` — Evidence-based hypothesis writing

---

#### If Priority = Agent Orchestration

**Goal:** Turn one-off prompts into repeatable, traceable AI workflows.

**Phase 1: Map Current Workflows (Week 1)**
1. Pick your most frequent AI use case (e.g., "analyze user feedback")
2. Document every step you currently take:
   - Copy/paste feedback into ChatGPT
   - Ask for themes
   - Manually categorize
   - Write summary
3. Identify pain points (manual handoffs, inconsistent results)

**Phase 2: Design Orchestrated Workflow (Week 2)**
1. Define workflow loop:
   - **Research:** AI reads all feedback (structured input)
   - **Synthesis:** AI identifies themes (with evidence)
   - **Critique:** AI flags contradictions or weak signals
   - **Decision:** Human reviews and decides next steps
   - **Log:** AI records rationale and sources
2. Each step must be traceable (show sources, reasoning)

**Phase 3: Build and Test (Week 3)**
1. Implement workflow using:
   - Claude Projects (if simple)
   - Custom GPTs (if moderate)
   - API orchestration (if complex)
2. Run on 3 past examples; compare to manual process
3. Measure: Time saved, consistency improved, traceability added

**Phase 4: Document and Scale (Week 4)**
1. Version-control prompts (Git)
2. Document workflow steps for team
3. Train 2 teammates; observe results
4. Iterate based on feedback

**Success Criteria:**
- ✅ At least 1 workflow runs consistently (same inputs → predictable process)
- ✅ Each step is traceable (AI cites sources)
- ✅ Team can replicate workflow without your involvement

**Related Skills:**
- `pol-probe-advisor.md` — Use orchestrated workflows for validation experiments

---

#### If Priority = Outcome Acceleration

**Goal:** Use AI to compress learning cycles, not just speed up tasks.

**Phase 1: Identify Bottleneck (Week 1)**
1. Map your current learning cycle (e.g., hypothesis → experiment → analysis → decision)
2. Time each step
3. Identify slowest step (usually: validation lag, approval delays, or meeting overhead)

**Phase 2: Design AI Intervention (Week 2)**
1. Ask: "What if this step happened overnight?"
   - Feasibility checks: AI spike in 2 hours vs. 2 days
   - User research synthesis: AI analysis in 1 hour vs. 1 week
   - Approval pre-checks: AI validates against constraints before meeting
2. Design minimal AI workflow to eliminate bottleneck

**Phase 3: Run Pilot (Week 3)**
1. Test AI intervention on 1 real initiative
2. Measure cycle time: before vs. after
3. Validate quality: Did AI maintain rigor, or cut corners?

**Phase 4: Scale (Week 4)**
1. If successful (cycle time down 50%+, quality maintained), apply to 3 more initiatives
2. Document workflow
3. Train team

**Success Criteria:**
- ✅ Learning cycle compressed by 50%+ on at least 1 initiative
- ✅ Quality maintained (no shortcuts that compromise rigor)
- ✅ Team adopts the accelerated workflow

**Related Skills:**
- `pol-probe.md` — Use AI to run PoL probes faster
- `discovery-process.md` — Compress discovery cycles with AI

---

#### If Priority = Team-AI Facilitation

**Goal:** Redesign team systems so AI operates as co-intelligence, not accountability shield.

**Phase 1: Establish Review Norms (Week 1)**
1. Codify rule: "AI outputs are drafts, not finals"
2. Define review protocol:
   - Who reviews AI outputs? (peer, lead PM, cross-functional partner)
   - When? (before sharing externally, before decisions)
   - What to check? (accuracy, completeness, evidence citation)
3. Share with team, get buy-in

**Phase 2: Set Evidence Standards (Week 2)**
1. AI must cite sources (no hallucinations)
2. Reject outputs that say "I think" or "it seems"
3. Require: "According to [source], [fact]"
4. Add to team operating docs

**Phase 3: Define Decision Authority (Week 3)**
1. Clarify: AI recommends, humans decide
2. Document who has authority to override AI recommendations (PM, team lead, cross-functional consensus)
3. Create escalation path (what if AI and human disagree?)

**Phase 4: Build Psychological Safety (Week 4)**
1. Team exercise: Share an AI mistake you caught (normalize catching errors)
2. Reward critical thinking ("Good catch on that AI hallucination!")
3. Avoid: "Why didn't you just use AI?" (shaming)

**Success Criteria:**
- ✅ Review norms documented and followed by team
- ✅ Evidence standards codified
- ✅ Decision authority clear
- ✅ Team comfortable challenging AI outputs

**Related Skills:**
- `problem-statement.md` — Evidence-based problem framing
- `epic-hypothesis.md` — Testable, evidence-backed hypotheses

---

#### If Priority = Strategic Differentiation

**Goal:** Create defensible competitive advantages, not just efficiency gains.

**Phase 1: Identify Moat Opportunities (Week 1)**
1. Ask: "What could we do with AI that competitors can't replicate by adding headcount?"
   - New customer capabilities (e.g., "AI advisor suggests personalized roadmap")
   - Workflow rewiring (e.g., "Validate product ideas in 2 days vs. 3 weeks")
   - Economics shift (e.g., "Deliver enterprise features at SMB prices via AI automation")
2. List 5 candidates
3. Prioritize by defensibility (how hard to copy?)

**Phase 2: Design AI-Enabled Capability (Week 2)**
1. Pick top candidate
2. Design end-to-end workflow:
   - What does customer experience?
   - What does AI do behind the scenes?
   - What human judgment is required?
3. Sketch MVP (minimum viable moat)

**Phase 3: Build and Test (Weeks 3-4)**
1. Build prototype (can be PoL probe, not production)
2. Test with 5 customers
3. Measure: Does this create value competitors can't match?

**Phase 4: Validate Moat (Week 5)**
1. Ask: "How would a competitor replicate this?"
   - If answer is "hire more people," it's not a moat
   - If answer is "redesign their entire org," you have a moat
2. Document competitive analysis
3. Decide: Build full version, pivot, or kill

**Success Criteria:**
- ✅ Identified at least 1 AI-enabled capability competitors can't easily copy
- ✅ Validated with customers (they see the value)
- ✅ Confirmed defensibility (competitor analysis)

**Related Skills:**
- `positioning-statement.md` — Articulate your AI-driven differentiation
- `jobs-to-be-done.md` — Understand what customers hire your AI capabilities to do

---

### Step 9: Track Progress (Optional)

**Agent offers:**

Would you like me to create a progress tracker for your AI-shaped transformation?

**Tracker includes:**
- Current maturity levels (baseline)
- Target maturity levels (goal state)
- Action plan milestones (from Step 8)
- Review cadence (weekly, monthly)

**Options:**
1. **Yes, create tracker** — [Agent generates Markdown checklist]
2. **No, I'll track separately** — [Agent provides summary]

---

## Examples

### Example 1: Early-Stage Startup (AI-First → Emerging)

**Context:**
- Team: 2 PMs, 5 engineers
- AI Usage: ChatGPT for writing PRDs, occasional Copilot usage
- Goal: Move faster than larger competitors

**Assessment Results:**
- Context Design: Level 1 (no structured context)
- Agent Orchestration: Level 1 (one-off prompts)
- Outcome Acceleration: Level 1 (docs faster, but learning cycles unchanged)
- Team-AI Facilitation: Level 2 (team uses AI, but no norms)
- Strategic Differentiation: Level 1 (efficiency only)

**Recommendation:** Focus on **Context Design** first.

**Action Plan (Week 1-4):**
- Week 1: Create constraints registry (10 technical constraints)
- Week 2: Build operational glossary (15 terms)
- Week 3: Establish evidence standards
- Week 4: Add context to CLAUDE.md files

**Outcome:** After 4 weeks, Context Design → Level 3. Unlocks Agent Orchestration next quarter.

---

### Example 2: Growth-Stage Company (Transitioning → AI-Shaped)

**Context:**
- Team: 10 PMs, 50 engineers, 5 designers
- AI Usage: Claude Projects for research, custom workflows emerging
- Goal: Build defensible AI advantage before IPO

**Assessment Results:**
- Context Design: Level 3 (structured context, not comprehensive)
- Agent Orchestration: Level 3 (some workflows, manual handoffs)
- Outcome Acceleration: Level 2 (modest gains, not systematic)
- Team-AI Facilitation: Level 3 (norms emerging, not codified)
- Strategic Differentiation: Level 2 (new capabilities, but copyable)

**Recommendation:** Focus on **Outcome Acceleration** (foundation is solid; now compress learning cycles).

**Action Plan (Week 1-4):**
- Week 1: Identify bottleneck (discovery cycles take 3 weeks)
- Week 2: Design AI workflow to run overnight feasibility checks
- Week 3: Pilot on 1 initiative (cut cycle to 5 days)
- Week 4: Scale to 3 initiatives

**Outcome:** Learning cycles 5x faster → strategic separation from competitors → Level 4 Outcome Acceleration + Level 3 Strategic Differentiation.

---

### Example 3: Enterprise Company (AI-First, Scattered Usage)

**Context:**
- Team: 50 PMs, 300 engineers
- AI Usage: Individual PMs use various tools, no consistency
- Goal: Standardize AI usage, create cross-functional workflows

**Assessment Results:**
- Context Design: Level 2 (docs exist, not structured for AI)
- Agent Orchestration: Level 1 (no shared workflows)
- Outcome Acceleration: Level 1 (efficiency only)
- Team-AI Facilitation: Level 1 (private usage, no norms)
- Strategic Differentiation: Level 1 (no advantage)

**Recommendation:** Focus on **Team-AI Facilitation** first (distributed team needs shared norms before building infrastructure).

**Action Plan (Week 1-4):**
- Week 1: Establish review norms (AI outputs are drafts)
- Week 2: Set evidence standards (AI must cite sources)
- Week 3: Define decision authority (AI recommends, leads decide)
- Week 4: Pilot with 3 teams, gather feedback

**Outcome:** Team-AI Facilitation → Level 3. Creates foundation for Context Design and Agent Orchestration next.

---

## Common Pitfalls

### 1. **Mistaking Efficiency for Differentiation**
**Failure Mode:** "We use AI to write PRDs 2x faster—we're AI-shaped!"

**Consequence:** Competitors copy within 3 months; no lasting advantage.

**Fix:** Ask: "If a competitor threw 2x more people at this, could they match us?" If yes, it's efficiency (table stakes), not differentiation.

---

### 2. **Skipping Context Design**
**Failure Mode:** Building Agent Orchestration workflows without durable context.

**Consequence:** AI workflows are fragile (context changes break everything).

**Fix:** Context Design is foundational. Don't skip it. Build constraints registry, glossary, evidence standards first.

---

### 3. **Individual Usage, Not Team Transformation**
**Failure Mode:** "I'm AI-shaped, but my team isn't."

**Consequence:** Can't scale; workflows die when you're on vacation.

**Fix:** Prioritize Team-AI Facilitation. Shared norms > individual productivity.

---

### 4. **Focusing on Tools, Not Workflows**
**Failure Mode:** "Should we use Claude or ChatGPT?"

**Consequence:** Tool debates distract from organizational redesign.

**Fix:** Tools don't matter. Workflows matter. Focus on redesigning how work gets done, not which AI you use.

---

### 5. **Speed Over Learning**
**Failure Mode:** "AI helps us ship faster!"

**Consequence:** Ship the wrong thing faster (if you're not compressing learning cycles).

**Fix:** Outcome Acceleration is about learning faster, not building faster. Validate hypotheses in days, not weeks.

---

## References

### Related Skills
- **[context-engineering-advisor](../context-engineering-advisor/SKILL.md)** (Interactive) — **Deep dive on Context Design competency:** Diagnose context stuffing, implement memory architecture, use Research→Plan→Reset→Implement cycle
- **[problem-statement](../problem-statement/SKILL.md)** (Component) — Evidence-based problem framing (Context Design)
- **[epic-hypothesis](../epic-hypothesis/SKILL.md)** (Component) — Testable hypotheses with evidence standards
- **[pol-probe-advisor](../pol-probe-advisor/SKILL.md)** (Interactive) — Use AI to compress validation cycles (Outcome Acceleration)
- **[discovery-process](../discovery-process/SKILL.md)** (Workflow) — Apply AI-shaped principles to discovery
- **[positioning-statement](../positioning-statement/SKILL.md)** (Component) — Articulate your AI-driven differentiation (Strategic Differentiation)

### External Frameworks
- **Dean Peters** — [*AI-First Is Cute. AI-Shaped Is Survival.*](https://deanpeters.substack.com/p/ai-first-is-cute-ai-shaped-is-survival) (Dean Peters' Substack, 2026)
- **Dean Peters** — [*Context Stuffing Is Not Context Engineering*](https://deanpeters.substack.com/p/context-stuffing-is-not-context-engineering) (Dean Peters' Substack, 2026) — Deep dive on Competency #1 (Context Design)

### Further Reading
- **Ethan Mollick** — *Co-Intelligence* (on AI as co-intelligence, not replacement)
- **Shreyas Doshi** — Twitter threads on PM judgment augmentation with AI
- **Lenny Rachitsky** — Newsletter interviews with AI-forward PMs
