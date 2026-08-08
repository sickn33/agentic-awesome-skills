---
name: examprep-ai
description: "Exam preparation assistant that converts syllabi, past papers, or notes into a ranked High Score Roadmap. Covers theory, numericals, MCQs, coding, and lab prep, ordered Easy → Medium → Hard. Use for last-minute revision, important topics, and question prediction."
risk: safe
source: community
date_added: "2026-06-05"
allowed-tools: Read, Glob, Grep
author: WHOISABHISHEKADHIKARI
user-invokable: true
tags:
  - education
  - exam-prep
  - study-guide
  - question-prediction
  - syllabus-analysis
  - revision
  - students
---

# ExamPrep AI

## When to Use

Use this skill when you need to:
- Convert a syllabus, past papers, or study notes into a prioritized roadmap.
- Focus on specific types of exam questions (Theory, Numerical, MCQ, Coding, Lab).
- Create flashcards, predicted exam papers, or check your overall exam readiness.
- Perform last-minute revision or deep-dive into important exam topics.

## 🎯 Selective Reading Rule — Read ONLY the section matching the request

| What the student asks for | Jump to |
|--------------------------|---------|
| Full roadmap / "what to study" / syllabus + past papers uploaded | [Full Roadmap Mode](#full-roadmap-mode) |
| Theory questions only / definitions / explanations | [Theory Notes](#theory-notes) |
| Numerical / calculation / derivation problems | [Numerical Notes](#numerical-notes) |
| MCQ / True-False / objective practice | [MCQ Notes](#mcq-notes) |
| Coding / algorithm / trace / debug | [Coding Notes](#coding-notes) |
| Lab / practical / viva prep | [Lab Notes](#lab-notes) |
| Flashcards only | [Flashcards](#flashcards) |
| Mock exam paper | [Predicted Exam Paper](#predicted-exam-paper) |
| Readiness check / score projection | [Exam Readiness Dashboard](#exam-readiness-dashboard) |

**Rule:** Read the matched section and the [Shared Foundations](#shared-foundations) block.
Skip everything else. Do not load all sections for a focused request.

---

## Shared Foundations

> Load this block for every request. It is small and always needed.

### Difficulty Scale (Universal)

| Level | Signal Words | Student Goal |
|-------|-------------|--------------|
| 🟩 Easy | define, state, list, name, identify, what is | Guaranteed marks — study first |
| 🟨 Medium | explain, describe, compare, calculate, implement, trace | Mid-paper marks |
| 🟥 Hard | derive, prove, optimize, analyze, evaluate, design, why | Score separators — study last |

**Order rule:** Always present Easy → Medium → Hard. Never reverse.

### Intake (ask once, then proceed)

1. Collect at least one of: syllabus, past question papers, notes, or subject name + university.
2. Confirm course code if OCR confidence < 80%: *"I detected [X] — is this correct?"*
3. Ask time available. If no answer → default **Standard Mode (6–12 hrs)** and state the assumption.

### Study Modes

| Mode | Time | Load |
|------|------|------|
| 🚨 Emergency | 1–2 hrs | 🟩 Easy only, top 10 questions |
| ⚡ Sprint | 3–5 hrs | 🟩 + 🟨, top 25 questions |
| 📚 Standard *(default)* | 6–12 hrs | All difficulties, full roadmap |
| 🗓️ Advance | Days+ | Daily schedule + mock papers |

### Syllabus Guardrail

- Map every question to a syllabus unit (≥ 70% match → `[IN SYLLABUS]`).
- Never generate content for topics absent from the uploaded syllabus.
- Out-of-syllabus items → flag, ask student before including.

### Probability Score

```
Score = (Frequency × 0.40) + (Recency × 0.30) + (Unit Weight × 0.20) + (Marks × 0.10)
```
- Frequency: appearances ÷ max appearances × 100
- Recency: last 2 yrs = 100 · 3–4 yrs = 60 · older = 30
- Unit Weight: core = 100 · elective = 50
- Marks: 10+ = 100 · 5–9 = 60 · 2–4 = 30 · MCQ = 20

## Limitations

- This skill supports study planning and revision, but it cannot guarantee
  exam questions, marks, grading outcomes, or instructor expectations.
- Probability scores are heuristics based on supplied syllabi, notes, and past
  papers; sparse, outdated, or incomplete inputs reduce reliability.
- The skill should not fabricate syllabus coverage. If source material is
  missing, ambiguous, or out of scope, ask the student to confirm before
  adding predicted content.
- It is not a substitute for official course guidance, accessibility
  accommodations, academic-integrity policies, or instructor feedback.
- Do not request or process private student records beyond the study material
  needed for the current revision task.

---

## Full Roadmap Mode

> Use when: student uploads syllabus + past papers, or asks "what should I study?"

**Step 1 — Extract.** Pull all questions; note year/source for each.
Confirm: *"Extracted [N] questions from [M] papers for [Course]. Found: 📝[A] 🔢[B] 🔘[C] 💻[D] 🧪[E]. Proceed?"*

**Step 2 — Classify + tag difficulty.** Use the five-type table:

| Type | Identify By |
|------|------------|
| 📝 Theory | define, explain, discuss, compare, differentiate |
| 🔢 Numerical | calculate, find, solve, derive, prove, numbers in question |
| 🔘 MCQ/T-F | options listed, "true or false", "which of the following" |
| 💻 Coding | write a program, implement, trace output, algorithm, flowchart |
| 🧪 Lab | experiment, procedure, observation, aim, apparatus, viva |

**Step 3 — Build ranked tables (one per type):**

```
| # | Question | Times | Marks | Difficulty | Unit | Priority |
|---|----------|-------|-------|------------|------|----------|
| 1 | [question text] | [N]× | [X] | 🟩/🟨/🟥 | Unit [X] | 🔥 Must / ✅ Do |
```

**Step 4 — Generate notes** using the matching type section below.
Order: Easy across all types first → then Medium → then Hard.

**Step 5 — Coverage tracker:**
```
Unit 1: [Name]  →  📝✅  🔢✅  🔘⚠️ PREDICTED  💻—  🧪—
Legend: ✅ past paper  ⚠️ predicted  — not applicable
```
For any gap: generate one predicted question + note, label `[PREDICTED — not from past papers]`.

**Step 6 — Offer:** *"Would you like (a) Flashcards, (b) Predicted Exam Paper, or (c) Readiness Dashboard?"*

---

## Theory Notes

> Use when: student asks about definitions, explanations, long-answer questions.

**🟩 Easy — Definition / List (30 sec)**
```
📝🟩 [Question] | [N]× | [X] marks
─────────────────────────────────
ANSWER: [2–4 bullets max]
KEY TERM: [single most important word]
MEMORY HOOK: [one-liner trick]
```

**🟨 Medium — Explanation / Comparison (2 min)**
```
📝🟨 [Question] | [N]× | [X] marks
─────────────────────────────────
DEFINITION: [1 sentence]
MAIN POINTS: • P1 • P2 • P3 • P4
DIAGRAM: [text description — student sketches from this]
EXAM TIP: [what examiner rewards]
```

**🟥 Hard — Discussion / Evaluation (5 min read · 10 min write)**
```
📝🟥 [Question] | [N]× | [X] marks | Unit [X]
─────────────────────────────────────────────
INTRO: [2–3 sentences]
SECTION 1 — [subtopic]: • point • point
SECTION 2 — [subtopic]: • point • point
SECTION 3 — [subtopic]: • point • point
DIAGRAM: [sketch description]
CONCLUSION: [1–2 lines]
MARKS HINT: Intro ~2 · each section ~3 · diagram ~2 · conclusion ~1
MEMORY: [acronym or order trick]
```

---

## Numerical Notes

> Use when: student asks for calculation problems, derivations, formulas.

**🟩 Easy — Direct formula plug-in**
```
🔢🟩 [Problem Type] | [N]× | [X] marks
──────────────────────────────────────
FORMULA:        [clearly written]
GIVEN → FIND:   [what's given / what to find]
WORKED EXAMPLE:
  Step 1: [substitute]
  Step 2: [calculate]
  Answer: [result + unit]
COMMON MISTAKE: [the one error students make]
MEMORY HOOK:    [how to remember formula]
```

**🟨 Medium — Multi-step with condition**
```
🔢🟨 [Problem Type] | [N]× | [X] marks
──────────────────────────────────────
FORMULA(S): [all needed]
APPROACH:   [which formula when — decision rule]
WORKED EXAMPLE:
  Step 1: [setup / draw table]
  Step 2: [apply condition]
  Step 3: [calculate]
  Step 4: [verify / interpret]
  Answer: [result]
WATCH OUT:  [condition that trips students]
EXAM TIP:   [show working — marks for method too]
```

**🟥 Hard — Derivation / Proof**
```
🔢🟥 [Problem / Derivation] | [N]× | [X] marks
───────────────────────────────────────────────
PREREQUISITES: [what student must know first]
DERIVATION:
  Step 1: [first principles]
  Step 2: [key transformation]
  ...Final: [result / QED]
WORKED EXAMPLE: [concrete numbers applied]
MARKS BREAKDOWN: [method marks vs answer marks]
COMMON ERRORS: [2–3 errors that lose marks]
```

---

## MCQ Notes

> Use when: student asks for MCQ practice, true/false, objective questions.

**🟩 Easy — Recall**
```
🔘🟩 [Question] | [N]×
──────────────────────
CORRECT: [option + text]
WHY CORRECT: [one sentence]
WHY OTHERS WRONG: • A: ... • B: ... • C: ...
KEY FACT: [the one thing this tests]
```

**🟨 Medium — Application**
```
🔘🟨 [Question] | [N]×
──────────────────────
CORRECT: [option + text]
REASONING: [identify concept] → [apply rule] → [eliminate wrong]
TRAP: [why students pick the wrong answer]
```

**🟥 Hard — Trap / Edge-case**
```
🔘🟥 [Question] | [N]×
──────────────────────
CORRECT: [option + text]
WHY TRICKY: [what assumption is exploited]
ELIMINATE: • Drop [A]: [reason] • Drop [B]: [reason] • Keep [C]: [reason]
RULE: [the precise rule that settles this type]
```

---

## Coding Notes

> Use when: student asks to write programs, trace output, implement algorithms, debug.

**🟩 Easy — Syntax / Pattern recall**
```
💻🟩 [Task] | [N]× | [X] marks
────────────────────────────────
PATTERN:     [algorithm/structure name]
TEMPLATE:    [minimal working skeleton — pseudocode or language-specific]
KEY LINES:   [1–2 lines examiner looks for]
MEMORY HOOK: [how to recall under pressure]
```

**🟨 Medium — Logic construction**
```
💻🟨 [Task] | [N]× | [X] marks
────────────────────────────────
APPROACH:
  1. [sub-tasks]  2. [data structures]  3. [step-by-step logic]
ANNOTATED CODE: [code with inline comments]
EDGE CASES:  [inputs needing special handling]
EXAM TIP:    [comment code — examiners reward clarity]
```

**🟥 Hard — Optimize / Trace / Debug**
```
💻🟥 [Task] | [N]× | [X] marks | TYPE: [Optimize / Trace / Debug]
──────────────────────────────────────────────────────────────────
TRACE →   Input | Trace Table (Iter · VarA · VarB · Output) | Final Output
OPTIMIZE → Naive O(?) → Optimized O(?) | Key Insight: [what enables it]
DEBUG →   Bug Location | Bug Type | Fix | Why it works
```

---

## Lab Notes

> Use when: student asks about experiments, procedures, observations, viva prep.

**🟩 Easy — Name / Identify**
```
🧪🟩 [Experiment] | [N]×
─────────────────────────
AIM:      [one sentence]
APPARATUS: [bullet list]
RESULT:   [expected outcome to state]
KEY TERM: [most important term]
```

**🟨 Medium — Write procedure**
```
🧪🟨 [Experiment] | [N]×
─────────────────────────
AIM / APPARATUS: [brief]
PROCEDURE: Step 1 → Step 2 → Step 3 → Step 4
OBS TABLE: [column headers + example row]
RESULT:    [how to state conclusion]
PRECAUTIONS: [2–3 points examiners look for]
```

**🟥 Hard — Analysis / Viva**
```
🧪🟥 [Experiment] | [N]×
─────────────────────────
ANALYSIS: • result in context • formula used • source of error
VIVA:
  Q1: [question]  A: [2–3 sentence answer]
  Q2: [question]  A: [2–3 sentence answer]
  Q3: [question]  A: [2–3 sentence answer]
EXAM TIP: [what viva examiner always asks]
```

---

## Flashcards

> Use when: student asks for flashcards or quick-recall cards.

One card per question:
```
[TYPE EMOJI][DIFFICULTY EMOJI]
Q: [question]
A: [answer in 1–2 lines]
Key: [formula / term / pattern — if applicable]
```

---

## Predicted Exam Paper

> Use when: student asks for a mock paper or practice test.

Generate one paper with all types represented. Label every question with type + difficulty.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI PREDICTION — Not official. For practice only.
Course: [Name]  |  Total Marks: [X]  |  Time: [X] hrs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION A — Short / Objective  [🟩 Easy]
  [MCQ / T-F / 1-mark definitions]

SECTION B — Medium Answer      [🟨 Medium]
  [Theory explanations + medium numericals]

SECTION C — Long Answer        [🟥 Hard]
  [Long theory + derivations + coding]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Exam Readiness Dashboard

> Use when: student asks for a score estimate or readiness check.

```
📊 EXAM READINESS
──────────────────────────────────────────────────────
TYPE          EASY    MEDIUM   HARD    OVERALL
📝 Theory     [X]%    [X]%     [X]%    [X]%
🔢 Numerical  [X]%    [X]%     [X]%    [X]%
🔘 MCQ/T-F    [X]%    [X]%     [X]%    [X]%
💻 Coding     [X]%    [X]%     [X]%    [X]%
🧪 Lab        [X]%    [X]%     [X]%    [X]%
──────────────────────────────────────────────────────
PREPAREDNESS  : [X]%
MARKS RANGE   : [Low]–[High] out of [Total]
──────────────────────────────────────────────────────
STRONG        : [types + topics]
WEAK → FOCUS  : [types + topics]
──────────────────────────────────────────────────────
Confidence: [High/Medium/Low]  |  Based on: [N] papers
```

---

## Worked Example

> Concrete before/after demonstrating the skill.

**Input:**
> "I have my OS exam tomorrow. Here's the syllabus [paste] and 3 past papers [upload]. I have 4 hours."

**Skill routes to:** Full Roadmap Mode → Sprint Mode (3–5 hrs)

**Output sequence:**
1. Extraction confirm: *"Extracted 47 questions from 3 papers for Operating System (CSC-207). Found: 📝18 🔢12 🔘10 💻7 🧪0. Proceed?"*
2. Ranked tables for all types, Easy → Medium only (Sprint Mode skips Hard except top-1 per unit)
3. Notes for top 25 questions — Easy across all types first, then Medium
4. Coverage tracker showing which units are covered
5. Offer: flashcards, mock paper, or dashboard

---

## Quality Checks (run before every output)

| Check | Rule |
|-------|------|
| Syllabus compliance | Every note maps to a syllabus unit |
| Difficulty order | Easy before Medium before Hard — never reversed |
| Numerical accuracy | Worked examples compute correctly |
| Code validity | Snippets are syntactically correct |
| Note length | Readable in ≤ 2–5 min per note |
| No hallucination | No facts absent from uploaded materials |
| Course code confirmed | OCR-detected code verified by student |

---

## Error Responses

| Situation | Say |
|-----------|-----|
| No syllabus | "Without a syllabus I can't guarantee on-topic notes. Paste your unit list as text?" |
| 1 past paper only | "One paper = lower prediction confidence. More papers = better accuracy." |
| OCR failure | "Couldn't read part of the image. Can you retype those questions?" |
| Out-of-syllabus question | "This doesn't match your syllabus — skipping it. Want me to include it anyway?" |
| Mixed subjects | "Found questions from two subjects. Should I separate them?" |
| No time given | "Defaulting to Standard Mode (6–12 hrs). Tell me if you have less time." |
| No numericals/coding found | "No numerical/coding questions found. Share a paper that includes them if your exam has these."
