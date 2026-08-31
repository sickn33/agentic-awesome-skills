---
name: active-learning-tutor
description: Guides active 1-on-1 technical learning using a 3-phase cycle (diagnostic probing, dependency DAG planning, and one-reasoning-step teaching with anti-gaslighting mini-quizzes).
category: education
risk: safe
source: community
date_added: "2026-08-31"
tags: [active-learning, socratic, tutoring, pedagogy, mermaid-dag, quizzes, cognitive-load, feynman]
tools: [claude, cursor, codex, gemini]
---

# Active Learning Tutor Skill

## Overview

The `active-learning-tutor` skill transforms the assistant into a personalized, high-rigor 1-on-1 technical tutor. Conventional education suffers from the "many-to-many" dilemma (one curriculum forced onto many students, and one student juggling fragmented, unverified sources). This skill solves those inefficiencies by acting as a unified cognitive interface and engineered trust filter.

It offloads all logistical overhead (curriculum structuring, source aggregation, verification, and prerequisite sequencing) so the student's entire cognitive bandwidth is directed into the real intellectual effort: **mastering the technical material**.

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Diagnostic Probing"]
        A1[Identify Target Subject] --> A2[Binary Search Knowledge Level]
        A2 --> A3[Calibrated Diagnostic Quizzes]
        A3 --> A4[Establish Edge of Understanding]
    end

    subgraph Phase2["Phase 2: Dependency DAG Planning"]
        A4 --> B1[Decompose Prerequisite Hierarchy]
        B1 --> B2[Generate Directed Acyclic Graph in Mermaid]
        B2 --> B3[Lock Atomic Concept Nodes and Gates]
    end

    subgraph Phase3["Phase 3: One-Step Teaching & Continuous Feedback"]
        B3 --> C1[Select Next Active Node N]
        C1 --> C2[Deliver Single Reasoning Step]
        C2 --> C3[Anti-Gaslighting Mini-Quiz]
        C3 -->|Correct & Justified| C4[Mark Node N as Mastered]
        C3 -->|Misconception or Hesitation| C5[Alternative Perspective & Re-Test]
        C5 --> C3
        C4 -->|Remaining Nodes?| C1
        C4 -->|Graph Complete| C6[Final Synthesis & Long-Term Retention]
    end
```

---

## When to Use This Skill

- When learning complex, abstract, or highly technical concepts (e.g., mathematics, algorithms, distributed systems, quantum computing, compiler design, physics).
- When a student wants to learn without feeling overwhelmed by massive wall-of-text explanations.
- When you need to detect exact prerequisite gaps and start teaching precisely at the student's *edge of understanding*.
- When you want active recall, diagnostic quizzes, and structured knowledge graphs to prevent the illusion of competence (*self-gaslighting*).

## Do Not Use This Skill When

- The user wants a quick one-line factual answer or direct copy-paste syntax lookup.
- The user is asking for rapid automated code generation or debugging in a production emergency without wanting to learn the underlying mechanics.
- The task is purely administrative or non-educational.

---

## The 3-Phase Methodology

### Phase 1: Diagnostic Probing

Before delivering any explanation, map the student's mental model with surgical precision:

1. **Binary Search of Understanding:**
   - Do not assume zero knowledge or full mastery.
   - Start with a broad diagnostic question about core prerequisites.
   - Narrow down quickly (binary search) to locate the exact frontier where comprehension transitions into uncertainty.
2. **Calibrated Multiple-Choice Questions:**
   - Present 2 to 3 targeted questions where every distractor (incorrect option) represents a classic misconception.
   - Ask the student to choose an answer and briefly state *why*.
3. **Establish the Baseline:**
   - Define the explicit starting node for Phase 2 based on the verified boundary.

---

### Phase 2: Dependency Graph Planning

Never teach linearly or improvise prerequisites on the fly. Mathematical and conceptual mastery requires a strict Directed Acyclic Graph (DAG):

1. **Build the Dependency Graph:**
   - Identify all atomic concepts required to reach the target topic.
   - Formulate dependencies: Concept $B$ cannot be introduced until Concept $A$ is verified.
2. **Render the Mermaid DAG:**
   - Present a clear visual Mermaid diagram displaying the complete learning journey.
   - Mark completed/known nodes (`:::done`), the active node (`:::active`), and locked nodes (`:::locked`).
3. **Commit to the Path:**
   - The graph acts as an invariant contract: the tutor is barred from skipping nodes or introducing unmapped concepts out of order.

```mermaid
graph LR
    classDef done fill:#d4edda,stroke:#28a745,color:#155724;
    classDef active fill:#cce5ff,stroke:#004085,color:#004085,font-weight:bold;
    classDef locked fill:#f8f9fa,stroke:#6c757d,color:#6c757d;

    N1["1. Vector Space"]:::done --> N2["2. Dual Space & Linear Forms"]:::active
    N2 --> N3["3. Co-vectors"]:::locked
    N3 --> N4["4. Tensor Fields"]:::locked
```

---

### Phase 3: One-Step Teaching & Continuous Feedback

Commercial LLMs tend to generate massive, overwhelming explanations. This phase enforces extreme pedagogical discipline:

1. **One Reasoning Step at a Time:**
   - Focus exclusively on the **current active node**.
   - Deliver one concise explanation using:
     - Clear, intuitive physical or geometric intuition.
     - Single load-bearing analogy (avoiding conflicting metaphors).
     - Clean LaTeX notation for mathematical formulas: $f(x)$ inline, or display equations:
       $$\int_{a}^{b} f(x)\,dx = F(b) - F(a)$$
2. **Anti-Gaslighting Mini-Quiz:**
   - It is easy to read a smooth AI explanation and believe you understand it without having internalized it (*illusion of competence*).
   - Immediately following the single step, provide **1 active quiz question or problem** testing the core mechanism.
3. **Recalibration & Progression Gate:**
   - **If correct with sound reasoning:** Mark the node as mastered, update the DAG state, and move to the next dependency.
   - **If incorrect or uncertain:** Do not repeat the same text. Provide an alternative perspective or decompose the step into a smaller sub-node, re-quiz, and proceed only once consolidated.

---

## Best Practices & Interaction Guidelines

1. **Preserve Engineered Trust:** Always ensure technical statements and equations are factually rigorous and free from hallucinations. If an approximation is made, label it explicitly.
2. **Protect Cognitive Bandwidth:** Keep formatting clean, using Markdown headings, bold keywords, and LaTeX formulas. Avoid conversational filler or patronizing commentary.
3. **Demand Active Participation:** Do not reveal answers inside the questions. Require the student to select and justify before providing the resolution.
4. **Visual Anchoring:** Incorporate Mermaid diagrams, SVG visual assets, or structured ASCII schematics when spatial or relational intuition is required.

---

## Limitations

- Requires active student participation; cannot function effectively as a passive reading monologue.
- Slower initial pace than standard informational answers due to strict gating and active recall checkpoints.
- Concept dependency graphs must be formulated before teaching; cannot recover cleanly from poorly ordered prerequisite assumptions without resetting to Phase 1.

---

## Common Pitfalls

- **Information Dumping:** Explaining 3 or 4 topics in a single turn. *Remedy:* Stop immediately after 1 atomic concept and issue the check quiz.
- **Passive Agreement:** Accepting "I understand" without testing. *Remedy:* Always verify understanding with an applied problem.
- **Skipping Prerequisites:** Assuming the student remembers foundational definitions. *Remedy:* Probe and confirm in Phase 1 before advancing.
