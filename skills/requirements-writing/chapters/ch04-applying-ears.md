# Chapter 4: Applying EARS

## Core Idea
Adopting EARS in practice is two moves: pick the right pattern from the trigger, then rewrite the requirement so the named system, the condition, and a single response are all explicit. Most legacy requirements convert in one pass and get shorter, not longer.

## Frameworks Introduced
- **The pattern-selection question**: "What causes this behaviour — nothing (always), an event, a state, a feature, or an unwanted condition?" The answer names the pattern.
  - When to use: as the first step for every new or rewritten behavioural requirement.
- **The convert-in-place method**: take an existing vague requirement, identify the implicit trigger and response, name the system, and re-cast it into the matching template.
  - When to use: migrating a legacy specification or cleaning up review findings.

## Key Concepts
- **Implicit trigger**: free-form requirements often *imply* a condition ("on failure…", "during startup…") without making it a clause — surface it.
- **Named responsible system**: replace "it shall be possible to…" and passive voice with "the `<system>` shall…".
- **Single response**: if the rewrite still contains "and", split into two requirements before finalising.

## Mental Models
- **Rewrite shrinks scope creep.** Forcing one trigger and one response usually exposes that the original sentence was two or three requirements wearing a trench coat.
- **If no pattern fits cleanly, the requirement is probably not behavioural** (it may be a constraint, an interface definition, or a design note) — handle it as that, not by bending EARS.

## Worked Example
Before/after conversions (original):
- *Before:* "The system should quickly recover and notify the user if something goes wrong."
  *After (Unwanted-behaviour, requirement 1):* "If a processing error occurs, then the gateway shall restart the affected service within 5 seconds."
  *After (Unwanted-behaviour, requirement 2):* "If a processing error occurs, then the gateway shall post a fault notification to the operator console."
- *Before:* "Reports can be exported when needed."
  *After (Event-driven):* "When the user selects Export, the reporting module shall produce a PDF of the current view within 2 seconds."
- *Before:* "The interface must be available."
  *After (Ubiquitous):* "The web interface shall be available 99.5% of each calendar month."

## Anti-patterns
- **Mechanically prefixing "When" to everything**: misclassifies always-on (Ubiquitous) and state-based (While) requirements; choose the trigger honestly.
- **Keeping the vague verb after restructuring**: "shall support", "shall handle", "shall process" — pair the pattern with a measurable response.

## Key Takeaways
1. Two moves: select the pattern from the trigger, then make system + condition + single response explicit.
2. Conversion usually reveals hidden compound requirements — split them as you go.
3. If nothing fits, the statement may not be a behavioural requirement; reclassify rather than force it.
4. Pair EARS structure with measurable response verbs, or you have removed ambiguity of *form* but not of *content*.

## Connects To
- **The EARS patterns (Ch 3)**: the templates you are selecting from.
- **Defects & anti-patterns (Ch 5)**: the content-level problems EARS structure alone does not fix.
- **Quality characteristics (Ch 1)**: conversion should be checked against necessary/verifiable, not just shape.
