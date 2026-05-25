---
name: pm-ai-context-engineering-advisor
description: Diagnose context stuffing vs. context engineering. Use when an AI workflow feels bloated, brittle, or hard to steer reliably.
risk: safe
source: community
---

## Purpose

Guide product managers through diagnosing whether they're doing **context stuffing** (jamming volume without intent) or **context engineering** (shaping structure for attention). Use this to identify context boundaries, fix "Context Hoarding Disorder," and implement tactical practices like bounded domains, episodic retrieval, and the Research→Plan→Reset→Implement cycle.

**Key Distinction:** Context stuffing assumes volume = quality ("paste the entire PRD"). Context engineering treats AI attention as a scarce resource and allocates it deliberately.

This is not about prompt writing—it's about **designing the information architecture** that grounds AI in reality without overwhelming it with noise.

## Key Concepts

### The Paradigm Shift: Parametric → Contextual Intelligence

**The Fundamental Problem:**
- LLMs have **parametric knowledge** (encoded during training) = static, outdated, non-attributable
- When asked about proprietary data, real-time info, or user preferences → forced to hallucinate or admit ignorance
- **Context engineering** bridges the gap between static training and dynamic reality

**PM's Role Shift:** From feature builder → **architect of informational ecosystems** that ground AI in reality

---

### Context Stuffing vs. Context Engineering

| Dimension | Context Stuffing | Context Engineering |
|-----------|------------------|---------------------|
| **Mindset** | Volume = quality | Structure = quality |
| **Approach** | "Add everything just in case" | "What decision am I making?" |
| **Persistence** | Persist all context | Retrieve with intent |
| **Agent Chains** | Share everything between agents | Bounded context per agent |
| **Failure Response** | Retry until it works | Fix the structure |
| **Economic Model** | Context as storage | Context as attention (scarce resource) |

**Critical Metaphor:** Context stuffing is like bringing your entire file cabinet to a meeting. Context engineering is bringing only the 3 documents relevant to today's decision.

---

### The Anti-Pattern: Context Stuffing

**Five Markers of Context Stuffing:**
1. **Reflexively expanding context windows** — "Just add more tokens!"
2. **Persisting everything "just in case"** — No clear retention criteria
3. **Chaining agents without boundaries** — Agent A passes everything to Agent B to Agent C
4. **Adding evaluations to mask inconsistency** — "We'll just retry until it's right"
5. **Normalized retries** — "It works if you run it 3 times" becomes acceptable

**Why It Fails:**
- **Reasoning Noise:** Thousands of irrelevant files compete for attention, degrading multi-hop logic
- **Context Rot:** Dead ends, past errors, irrelevant data accumulate → goal drift
- **Lost in the Middle:** Models prioritize beginning (primacy) and end (recency), ignore middle
- **Economic Waste:** Every query becomes expensive without accuracy gains
- **Quantitative Degradation:** Accuracy drops below 20% when context exceeds ~32k tokens

**The Hidden Costs:**
- Escalating token consumption
- Diluted attention across irrelevant material
- Reduced output confidence
- Cascading retries that waste time and money

---

### Real Context Engineering: Core Principles

**Five Foundational Principles:**
1. **Context without shape becomes noise**
2. **Structure > Volume**
3. **Retrieve with intent, not completeness**
4. **Small working contexts** (like short-term memory)
5. **Context Compaction:** Maximize density of relevant information per token

**Quantitative Framework:**
```
Efficiency = (Accuracy × Coherence) / (Tokens × Latency)
```

**Key Finding:** Using RAG with 25% of available tokens preserves 95% accuracy while significantly reducing latency and cost.

---

### The 5 Diagnostic Questions (Detect Context Hoarding Disorder)

Ask these to identify context stuffing:

1. **What specific decision does this support?** — If you can't answer, you don't need it
2. **Can retrieval replace persistence?** — Just-in-time beats always-available
3. **Who owns the context boundary?** — If no one, it'll grow forever
4. **What fails if we exclude this?** — If nothing breaks, delete it
5. **Are we fixing structure or avoiding it?** — Stuffing context often masks bad information architecture

---

### Memory Architecture: Two-Layer System

**Short-Term (Conversational) Memory:**
- Immediate interaction history for follow-up questions
- Challenge: Space management → older parts summarized or truncated
- Lifespan: Single session

**Long-Term (Persistent) Memory:**
- User preferences, key facts across sessions → deep personalization
- Implemented via vector database (semantic retrieval)
- Two types:
  - **Declarative Memory:** Facts ("I'm vegan")
  - **Procedural Memory:** Behavioral patterns ("I debug by checking logs first")
- Lifespan: Persistent across sessions

**LLM-Powered ETL:** Models generate their own memories by identifying signals, consolidating with existing data, updating database automatically.

---

### The Research → Plan → Reset → Implement Cycle

**The Context Rot Solution:**

1. **Research:** Agent gathers data → large, chaotic context window (noise + dead ends)
2. **Plan:** Agent synthesizes into high-density SPEC.md or PLAN.md (Source of Truth)
3. **Reset:** **Clear entire context window** (prevents context rot)
4. **Implement:** Fresh session using **only** the high-density plan as context

**Why This Works:** Context rot is eliminated; agent starts clean with compressed, high-signal context.

---

### Anti-Patterns (What This Is NOT)

- **Not about choosing AI tools** — Claude vs. ChatGPT doesn't matter; architecture matters
- **Not about writing better prompts** — This is systems design, not copywriting
- **Not about adding more tokens** — "Infinite context" narratives are marketing, not engineering reality
- **Not about replacing human judgment** — Context engineering amplifies judgment, doesn't eliminate it

---

## When to Use Skill

✅ **Use this when:**
- You're pasting entire PRDs/codebases into AI and getting vague responses
- AI outputs are inconsistent ("works sometimes, not others")
- You're burning tokens without seeing accuracy improvements
- You suspect you're "context stuffing" but don't know how to fix it
- You need to design context architecture for an AI product feature

❌ **Don't use this when:**
- You're just getting started with AI (start with basic prompts first)
- You're looking for tool recommendations (this is about architecture, not tooling)
- Your AI usage is working well (if it ain't broke, don't fix it)

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

This interactive skill uses **adaptive questioning** to diagnose context stuffing, identify boundaries, and provide tactical implementation guidance.

---

### Step 0: Gather Context

**Agent asks:**

Before we diagnose your context practices, let's gather information:

**Current AI Usage:**
- What AI tools/systems do you use? (ChatGPT, Claude, custom agents, etc.)
- What PM tasks do you use AI for? (PRD writing, user research synthesis, discovery, etc.)
- How do you provide context? (paste docs, reference files, use projects/memory)

**Symptoms:**
- Are AI outputs inconsistent? (works sometimes, not others)
- Are you retrying prompts multiple times to get good results?
- Are responses vague or hedged despite providing "all the context"?
- Are token costs escalating without accuracy improvements?

**System Architecture (if applicable):**
- Do you have custom AI agents or workflows?
- How is context shared between agents?
- Do you use RAG, vector databases, or memory systems?

**You can describe briefly or paste examples.**

---

### Step 1: Diagnose Context Stuffing Symptoms

**Agent asks:**

Let's assess whether you're experiencing **context stuffing**. Which of these symptoms do you recognize?

**Select all that apply:**

1. **"I paste entire documents into AI"** — Full PRDs, complete user interview transcripts, entire codebases
2. **"AI gives vague, hedged responses despite having 'all the context'"** — Responses like "it depends," "consider these options," non-committal
3. **"I have to retry prompts 3+ times to get usable output"** — Inconsistency is normalized
4. **"Token costs are escalating but accuracy isn't improving"** — Spending more, getting same or worse results
5. **"I keep adding more context hoping it'll help"** — Reflexive expansion without strategy
6. **"My agents pass everything to each other"** — Agent A → Agent B → Agent C with full context chain
7. **"I don't have clear criteria for what to include/exclude"** — No context boundary definitions
8. **"None of these—my AI usage is working well"** — Skip to advanced optimization

**User response:** [Select symptoms]

**Agent analyzes:**

Based on your selections:
- **0-1 symptoms:** Healthy context practices; proceed to optimization
- **2-3 symptoms:** Early context stuffing; address before it scales
- **4+ symptoms:** Active Context Hoarding Disorder; immediate intervention needed

**Agent proceeds to diagnostic questions.**

---

### Step 2: Diagnostic Question 1 — What Specific Decision Does This Support?

**Agent asks:**

Let's start with the most critical question: **For each piece of context you're including, what specific decision does it support?**

**Example Context Analysis:**

Imagine you're asking AI to "help with discovery planning." You're providing:
- Entire PRD (20 pages)
- 50 user interview transcripts (full)
- Competitive analysis doc (15 pages)
- Team meeting notes from last 3 months

**Question:** What decision are you making right now?

**Offer 3 scenarios:**

1. **"I'm deciding which user segment to interview first"**
   - **Context needed:** User segments from PRD (2 paragraphs), prior interview themes (1 page synthesis), not full transcripts
   - **Context NOT needed:** Meeting notes, full competitive analysis, full PRD

2. **"I'm deciding which discovery questions to ask in interviews"**
   - **Context needed:** Research objectives (from PRD), past interview insights (synthesis), Jobs-to-be-Done framework
   - **Context NOT needed:** Full competitive analysis, full meeting notes

3. **"I'm not sure what decision I'm making—I just want AI to 'understand my product'"**
   - **Problem:** No specific decision = context stuffing trap
   - **Fix:** Define the decision first, then select context

**Agent recommends:**

**Best Practice:** Before adding context, complete this sentence:
> "I need this context because I'm deciding [specific decision], and without [specific information], I can't make that decision."

If you can't complete that sentence, you don't need the context.

**User response:** [Describe their decision + context]

**Agent validates:** Does the context directly support the stated decision? If not, recommend trimming.

---

### Step 3: Diagnostic Question 2 — Can Retrieval Replace Persistence?

**Agent asks:**

**Second question: Is this information you always need, or something you can retrieve just-in-time?**

**The Distinction:**

**Always-Needed (Persist):**
- Core product constraints (technical, regulatory, strategic)
- User preferences that apply to every interaction
- Critical definitions (operational glossary)
- Non-negotiable rules

**Episodic (Retrieve on-demand):**
- Project-specific details (this epic, this sprint)
- Historical data (past PRDs, old interview transcripts)
- Contextual facts (competitive analysis, market research)
- Temporary decisions

**Key Insight:** Just-in-time retrieval beats always-available. Don't persist what you can retrieve.

**Offer 3 options:**

1. **"Most of my context is always-needed (core constraints, user prefs)"**
   - **Assessment:** Good instinct; verify with Question 4 (what fails if excluded?)
   - **Recommendation:** Build constraints registry and operational glossary (persist these)

2. **"Most of my context is episodic (project details, historical data)"**
   - **Assessment:** Perfect candidate for RAG or retrieval
   - **Recommendation:** Implement semantic search; retrieve only relevant chunks for each query

3. **"I'm not sure which is which—I persist everything to be safe"**
   - **Assessment:** Classic Context Hoarding Disorder symptom
   - **Fix:** Apply Question 4 test to each piece of context

**Agent recommends:**

**Rule of Thumb:**
- **Persist:** Information referenced in 80%+ of interactions
- **Retrieve:** Information referenced in <20% of interactions
- **Gray zone (20-80%):** Depends on retrieval latency vs. context window cost

**User response:** [Categorize their context]

**Agent provides:** Specific recommendations on what to persist vs. retrieve.

---

### Step 4: Diagnostic Question 3 — Who Owns the Context Boundary?

**Agent asks:**

**Third question: Who is responsible for defining what belongs in vs. out of your AI's context?**

**The Ownership Problem:**

If **no one** owns the context boundary, it will grow indefinitely. Every PM will add "just one more thing," and six months later, you're stuffing 100k tokens per query.

**Offer 3 options:**

1. **"I own the boundary (solo PM or small team)"**
   - **Assessment:** Good—you can make fast decisions
   - **Recommendation:** Document your boundary criteria (use Questions 1-5 as framework)

2. **"My team shares ownership (collaborative boundary definition)"**
   - **Assessment:** Can work if formalized
   - **Recommendation:** Create a "Context Manifest" doc: what's always included, what's retrieved, what's excluded (and why)

3. **"No one owns it—it's ad-hoc / implicit"**
   - **Assessment:** Critical risk; boundary will expand uncontrollably
   - **Fix:** Assign explicit ownership; schedule quarterly context audits

**Agent recommends:**

**Best Practice: Create a Context Manifest**

```markdown
# Context Manifest: [Product/Feature Name]

## Always Persisted (Core Context)
- Product constraints (technical, regulatory)
- User preferences (role, permissions, preferences)
- Operational glossary (20 key terms)

## Retrieved On-Demand (Episodic Context)
- Historical PRDs (retrieve via semantic search)
- User interview transcripts (retrieve relevant quotes)
- Competitive analysis (retrieve when explicitly needed)

## Excluded (Out of Scope)
- Meeting notes older than 30 days (no longer relevant)
- Full codebase (use code search instead)
- Marketing materials (not decision-relevant)

## Boundary Owner: [Name]
## Last Reviewed: [Date]
## Next Review: [Date + 90 days]
```

**User response:** [Describe current ownership model]

**Agent provides:** Recommendation on formalizing ownership + template for Context Manifest.

---

### Step 5: Diagnostic Question 4 — What Fails if We Exclude This?

**Agent asks:**

**Fourth question: For each piece of context, what specific failure mode occurs if you exclude it?**

This is the **falsification test**. If you can't identify a concrete failure, you don't need the context.

**Offer 3 scenarios:**

1. **"If I exclude product constraints, AI will recommend infeasible solutions"**
   - **Failure Mode:** Clear and concrete
   - **Assessment:** Valid reason to persist constraints

2. **"If I exclude historical PRDs, AI won't understand our product evolution"**
   - **Failure Mode:** Vague and hypothetical
   - **Assessment:** Historical context rarely needed for current decisions
   - **Fix:** Retrieve PRDs only when explicitly referencing past decisions

3. **"If I exclude this, I'm not sure anything would break—I just include it to be thorough"**
   - **Failure Mode:** None identified
   - **Assessment:** Context stuffing; delete immediately

**Agent recommends:**

**The Falsification Protocol:**

For each context element, complete this statement:
> "If I exclude [context element], then [specific failure] will occur in [specific scenario]."

**Examples:**
- ✅ Good: "If I exclude GDPR constraints, AI will recommend features that violate EU privacy law."
- ❌ Bad: "If I exclude this PRD, AI might not fully understand the product." (Vague)

**User response:** [Apply falsification test to their context]

**Agent provides:** List of context elements to delete (no concrete failure identified).

---

### Step 6: Diagnostic Question 5 — Are We Fixing Structure or Avoiding It?

**Agent asks:**

**Fifth question: Is adding more context solving a problem, or masking a deeper structural issue?**

**The Root Cause Question:**

Context stuffing often hides bad information architecture. Instead of fixing messy, ambiguous documents, teams add more documents hoping AI will "figure it out."

**Offer 3 options:**

1. **"I'm adding context because our docs are poorly structured/ambiguous"**
   - **Assessment:** You're masking a structural problem
   - **Fix:** Clean up the docs first (remove ambiguity, add constraints, define terms)
   - **Example:** Instead of pasting 5 conflicting PRDs, reconcile them into 1 Source of Truth

2. **"I'm adding context because we don't have a shared operational glossary"**
   - **Assessment:** You're compensating for missing foundations
   - **Fix:** Build the glossary (20-30 key terms); AI can reference it reliably
   - **Example:** Define "active user," "churn," "engagement" unambiguously

3. **"I'm adding context because our constraints aren't documented"**
   - **Assessment:** You're avoiding constraint engineering
   - **Fix:** Create constraints registry (technical, regulatory, strategic)
   - **Example:** Document "We won't build mobile apps" vs. explaining it in every prompt

**Agent recommends:**

**The Structural Health Test:**

If you're adding context to compensate for:
- **Ambiguous documentation** → Fix the docs, don't add more
- **Undefined terms** → Build operational glossary
- **Undocumented constraints** → Create constraints registry
- **Conflicting information** → Reconcile into Source of Truth

**User response:** [Identify structural issues]

**Agent provides:** Prioritized list of structural fixes before adding more context.

---

### Step 7: Define Memory Architecture

**Agent asks:**

Based on your context needs, let's design a **two-layer memory architecture**.

**Your Context Profile (from previous steps):**
- Always-needed context: [Summary from Q2]
- Episodic context: [Summary from Q2]
- Boundary owner: [From Q3]
- Validated essentials: [From Q4]
- Structural fixes needed: [From Q5]

**Recommended Architecture:**

**Short-Term (Conversational) Memory:**
- **What it stores:** Immediate interaction history for follow-up questions
- **Lifespan:** Single session
- **Management:** Summarize or truncate older parts to avoid crowding
- **Your specific needs:** [Agent customizes based on user's workflow]

**Long-Term (Persistent) Memory:**
- **What it stores:** User preferences, core constraints, operational glossary
- **Lifespan:** Persistent across sessions
- **Implementation:** Vector database (semantic retrieval)
- **Two types:**
  - **Declarative Memory:** Facts (e.g., "We follow HIPAA regulations")
  - **Procedural Memory:** Behavioral patterns (e.g., "Always validate feasibility before usability")
- **Your specific needs:** [Agent customizes]

**Retrieval Strategy (Episodic Context):**
- **What it retrieves:** Historical PRDs, user interviews, competitive analysis
- **Method:** Semantic search triggered by query intent
- **Optimization:** Contextual Retrieval (Anthropic) — prepend explanatory context to each chunk before embedding
- **Your specific needs:** [Agent customizes]

**Agent offers:**

Would you like me to:
1. **Generate a Context Architecture Blueprint** for your specific use case?
2. **Provide implementation guidance** (tools, techniques, best practices)?
3. **Design a retrieval strategy** for your episodic context?

**User response:** [Selection]

---

### Step 8: Implement Research → Plan → Reset → Implement Cycle

**Agent asks:**

Now let's implement the **Research → Plan → Reset → Implement** cycle to prevent context rot.

**The Problem:** As agents research, context windows grow chaotic—filled with dead ends, errors, and noise. This dilutes attention and causes goal drift.

**The Solution:** Compress research into a high-density plan, then **clear the context window** before implementing.

**The Four-Phase Cycle:**

**Phase 1: Research (Chaotic Context Allowed)**
- Agent gathers data from multiple sources
- Context window grows large and messy (this is expected)
- Dead ends, failed hypotheses, and noise accumulate
- **Goal:** Comprehensive information gathering

**Phase 2: Plan (Synthesis)**
- Agent synthesizes research into a high-density SPEC.md or PLAN.md
- This becomes the **Source of Truth** for implementation
- **Key elements:**
  - Decision made
  - Evidence supporting decision
  - Constraints applied
  - Next steps (sequenced)
- **Format:** Structured, concise, unambiguous

**Phase 3: Reset (Clear Context Window)**
- **Critical step:** Clear the entire context window
- Delete all research artifacts, dead ends, errors
- This prevents context rot from poisoning implementation

**Phase 4: Implement (Fresh Session with Plan Only)**
- Start a new session with **only the high-density plan** as context
- Agent has clean, focused attention on execution
- No noise from research phase

**Agent offers 3 options:**

1. **"I want a template for the PLAN.md format"**
   - Agent provides structured template for high-density plans

2. **"I want to see an example of this cycle in action"**
   - Agent walks through concrete PM use case (e.g., discovery planning)

3. **"I'm ready to implement this in my workflow"**
   - Agent provides step-by-step implementation guide

**User response:** [Selection]

**Agent provides:** Tailored guidance based on selection.

---

### Step 9: Action Plan & Next Steps

**Agent synthesizes:**

Based on your context engineering assessment, here's your action plan:

**Immediate Fixes (This Week):**
1. [Delete context with no falsifiable failure mode from Q4]
2. [Apply Research→Plan→Reset→Implement to your next AI task]
3. [Document context boundary in Context Manifest]

**Foundation Building (Next 2 Weeks):**
1. [Build constraints registry with 20+ entries]
2. [Create operational glossary with 20-30 key terms]
3. [Implement two-layer memory architecture]

**Long-Term Optimization (Next Month):**
1. [Set up semantic retrieval for episodic context]
2. [Assign context boundary owner + quarterly audit schedule]
3. [Implement Contextual Retrieval (Anthropic) for RAG]

**Success Metrics:**
- Token usage down 50%+ (less context stuffing)
- Output consistency up (less retry/regeneration)
- Response quality up (sharper, less hedged answers)
- Context window stable (no unbounded growth)

**Agent offers:**

Would you like me to:
1. **Generate specific implementation docs** (Context Manifest, PLAN.md template, etc.)?
2. **Provide advanced techniques** (Contextual Retrieval, LLM-powered ETL)?
3. **Review your current context setup** (provide feedback on specific prompts/workflows)?

---

## Examples

### Example 1: Solo PM Context Stuffing → Engineering

**Context:**
- Solo PM at early-stage startup
- Using Claude Projects for PRD writing
- Pasting entire PRDs (20 pages) + all user interviews (50 transcripts) every time
- Getting vague, inconsistent responses

**Assessment:**
- Symptoms: Hedged responses, normalized retries (4+ symptoms)
- Q1 (Decision): "I just want AI to understand my product" (no specific decision)
- Q2 (Persist/Retrieve): Persisting everything (no retrieval strategy)
- Q3 (Ownership): No formal owner (solo PM, ad-hoc)
- Q4 (Failure): Can't identify concrete failures for most context
- Q5 (Structure): Avoiding constraint documentation

**Diagnosis:** Active Context Hoarding Disorder

**Intervention:**
1. **Immediate:** Delete all context that fails Q4 test → keeps 20% of original
2. **Week 1:** Build constraints registry (10 technical constraints, 5 strategic)
3. **Week 2:** Create operational glossary (25 terms)
4. **Week 3:** Implement Research→Plan→Reset→Implement for next PRD

**Outcome:** Token usage down 70%, output quality up significantly, responses crisp and actionable.

---

### Example 2: Growth-Stage Team with Agent Chains

**Context:**
- Product team with 5 PMs
- Custom AI agents for discovery synthesis
- Agent A (research) → Agent B (synthesis) → Agent C (recommendations)
- Each agent passes full context to next → context window explodes to 100k+ tokens

**Assessment:**
- Symptoms: Escalating token costs, inconsistent outputs (3 symptoms)
- Q1 (Decision): Each agent has clear decision, but passes unnecessary context
- Q2 (Persist/Retrieve): Mixing persistent and episodic without strategy
- Q3 (Ownership): No explicit owner; each PM adds context
- Q4 (Failure): Agents pass "just in case" context with no falsifiable failure
- Q5 (Structure): Missing Context Manifest

**Diagnosis:** Agent orchestration without boundaries

**Intervention:**
1. **Immediate:** Define bounded context per agent (Agent A outputs only 2-page synthesis to Agent B, not full research)
2. **Week 1:** Assign context boundary owner (Lead PM)
3. **Week 2:** Create Context Manifest (what persists, what's retrieved, what's excluded)
4. **Week 3:** Implement Research→Plan→Reset→Implement between Agent B and Agent C

**Outcome:** Token usage down 60%, agent chain reliability up, costs reduced by 50%.

---

### Example 3: Enterprise with RAG but No Context Engineering

**Context:**
- Large enterprise with vector database RAG system
- "Stuff the whole knowledge base" approach (10,000+ documents)
- Retrieval returns 50+ chunks per query → floods context window
- Accuracy declining as knowledge base grows

**Assessment:**
- Symptoms: Vague responses despite "complete knowledge," normalized retries (2 symptoms)
- Q1 (Decision): Decisions clear, but retrieval has no intent (returns everything)
- Q2 (Persist/Retrieve): Good instinct to retrieve, but no filtering
- Q3 (Ownership): Engineering owns RAG, Product doesn't own context boundaries
- Q4 (Failure): Can't identify why 50 chunks needed vs. 5
- Q5 (Structure): Knowledge base has no structure (flat documents, no metadata)

**Diagnosis:** Retrieval without intent (RAG as context stuffing)

**Intervention:**
1. **Immediate:** Limit retrieval to top 5 chunks per query (down from 50)
2. **Week 1:** Implement Contextual Retrieval (Anthropic) — prepend explanatory context to each chunk during indexing
3. **Week 2:** Add metadata to documents (category, recency, authority)
4. **Week 3:** Product team defines retrieval intent per query type (discovery = customer insights, feasibility = technical constraints)

**Outcome:** Accuracy up 35% (from Anthropic benchmark), latency down 60%, token usage down 80%.

---

## Common Pitfalls

### 1. **"Infinite Context" Marketing vs. Engineering Reality**
**Failure Mode:** Believing "1 million token context windows" means you should use all of them.

**Consequence:** Reasoning Noise degrades performance; accuracy drops below 20% past ~32k tokens.

**Fix:** Context windows are not free. Treat tokens as scarce; optimize for density, not volume.

---

### 2. **Retrying Instead of Restructuring**
**Failure Mode:** "It works if I run it 3 times" → normalizing retries instead of fixing structure.

**Consequence:** Wastes time and money; masks deeper context rot issues.

**Fix:** If retries are common, your context structure is broken. Apply Q5 (fix structure, don't add volume).

---

### 3. **No Context Boundary Owner**
**Failure Mode:** Ad-hoc, implicit context decisions → unbounded growth.

**Consequence:** Six months later, every query stuffs 100k tokens per interaction.

**Fix:** Assign explicit ownership; create Context Manifest; schedule quarterly audits.

---

### 4. **Mixing Always-Needed with Episodic**
**Failure Mode:** Persisting historical data that should be retrieved on-demand.

**Consequence:** Context window crowded with irrelevant information; attention diluted.

**Fix:** Apply Q2 test: persist only what's needed in 80%+ of interactions; retrieve the rest.

---

### 5. **Skipping the Reset Phase**
**Failure Mode:** Never clearing context window during Research→Plan→Implement cycle.

**Consequence:** Context rot accumulates; goal drift; dead ends poison implementation.

**Fix:** Mandatory Reset phase after Plan; start implementation with only high-density plan as context.

---

## References

### Related Skills
- **[ai-shaped-readiness-advisor](../ai-shaped-readiness-advisor/SKILL.md)** (Interactive) — Context Design is Competency #1 of AI-shaped work
- **[problem-statement](../problem-statement/SKILL.md)** (Component) — Evidence-based framing requires context engineering
- **[epic-hypothesis](../epic-hypothesis/SKILL.md)** (Component) — Testable hypotheses depend on clear constraints (part of context)
- **[pol-probe-advisor](../pol-probe-advisor/SKILL.md)** (Interactive) — Validation experiments benefit from context engineering (define what AI needs to know)

### External Frameworks
- **Dean Peters** — [*Context Stuffing Is Not Context Engineering*](https://deanpeters.substack.com/p/context-stuffing-is-not-context-engineering) (Dean Peters' Substack, 2026)
- **Teresa Torres** — *Continuous Discovery Habits* (Context Engineering as one of 5 new AI PM disciplines)
- **Marty Cagan** — *Empowered* (Feasibility risk in AI era includes understanding "physics of AI")
- **Anthropic** — [Contextual Retrieval whitepaper](https://www.anthropic.com/news/contextual-retrieval) (35% failure rate reduction)
- **Google** — Context engineering whitepaper on LLM-powered memory systems

### Technical References
- **RAG (Retrieval-Augmented Generation)** — Standard technique for episodic context retrieval
- **Vector Databases** — Semantic search for long-term memory (Pinecone, Weaviate, Chroma)
- **Contextual Retrieval (Anthropic)** — Prepend explanatory context to chunks before embedding
- **LLM-as-Judge** — Automated evaluation of context quality
