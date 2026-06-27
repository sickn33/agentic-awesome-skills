---
name: ai-loop
description: Runs a bounded spec-build-review development loop with explicit scope, stop conditions, and human approval gates for risky or ambiguous work.
category: workflow
risk: safe
source: community
date_added: "2026-06-27"
tags: [agent-workflow, specification, implementation, review, verification, feedback-loop]
tools: [claude, cursor, codex, gemini]
---

# AI-Loop Skill

## Overview

The `ai-loop` skill structures a bounded development cycle for agentic workflows. By dividing the process into distinct planning (Spec), implementation (Build), and validation (Review) phases, it helps an agent build and correct scoped code changes while keeping requirements, risk gates, and stop conditions explicit.

## When to Use This Skill

- Use when you need a feature built from scratch or heavily modified, and you want the agent to handle the lifecycle (specification, implementation, and verification) inside one clearly bounded workflow.
- Use when working with isolated components, modules, or features that have well-defined scopes and constraints.
- Use when the user asks for a complete development pass but the work still has clear success criteria, a reasonable verification path, and no unresolved safety or product decisions.

## How It Works

This skill executes a controlled development loop composed of three phases: Spec, Build, and Review. When invoked, the agent moves through those phases until the scoped requirements pass verification, a stop condition is reached, or human approval is needed.

Before starting, define:

- The maximum number of build-review iterations.
- The verification commands or manual checks that count as evidence.
- The actions that require explicit approval, such as destructive commands, production changes, external service writes, or broad architectural pivots.

### Phase 1: Spec (Planning)

1. Interview the user about the feature or app they want to build. Ask one focused question at a time until you fully understand the goal, the must-have requirements, the constraints, and what "done" looks like.
2. **Do not start building yet.**
3. When you have enough information, write a clear, detailed specification and save it to `specs/<feature-name>.md`.
4. The spec must include:
   - The objective
   - The exact requirements
   - Edge cases to handle
   - A concrete definition of done that someone could check the build against
   - The iteration budget, verification commands, and approval gates.

### Phase 2: Build (Implementation)

1. Read the spec you just created in `specs/<feature-name>.md`.
2. Build exactly what it describes.
3. **Do not add features**, do not refactor unrelated code, and do not invent requirements that aren't in the spec.
4. Focus strictly on fulfilling the spec. List which spec requirements you covered so the review step can check them.

### Phase 3: Review (Verification)

1. Compare your implementation against `specs/<feature-name>.md`.
2. Go requirement by requirement and verify if it was met. List every gap, bug, or missing piece, naming the exact spec item each one fails.
3. If anything fails and the iteration budget is not exhausted, write the specific fixes needed and **loop back to Phase 2 (Build)** to address them.
4. Stop and ask for human input when the next fix would change the spec, exceed the iteration budget, require risky operations, or depend on product decisions not captured in the spec.
5. Only pass the build and conclude the skill execution when every requirement in the spec is fully met and the declared verification evidence has passed.

## Examples

### Example 1: Creating a Basic Statistics Helper

**User:**
> I want to add a utility for calculating basic statistics (mean, median, mode) of an array of numbers.

**Agent (Phase 1 - Spec):**
> I can help with that. To get started, what programming language should this statistics calculator be implemented in? Also, how should empty arrays or invalid inputs be handled?

**User:**
> JavaScript. If the array is empty, return null. If there are non-numbers, ignore them.

**Agent (Phase 1 - Spec):**
> Thank you. I have created the specification file at `specs/stats-calculator.md` with the requirements we discussed. Now, I will start implementing it.

**Agent (Phase 2 - Build):**
> *(Creates `stats_calculator.js` and implements `mean`, `median`, and `mode` matching the spec exactly)*
> I have finished implementing the calculator. I will now verify the implementation.

**Agent (Phase 3 - Review):**
> Checking implementation against `specs/stats-calculator.md`:
> - Requirement: mean calculation -> PASS
> - Requirement: median calculation -> PASS
> - Requirement: mode calculation -> PASS
> - Requirement: empty array returns null -> PASS
> - Requirement: non-numbers are ignored -> FAIL (I noticed `mode` doesn't filter out non-numbers).
>
> I will now loop back to Phase 2 to fix the `mode` function.

**Agent (Phase 2 - Build Loop-Back):**
> *(Fixes `mode` to filter out non-numbers)*
> I have updated the implementation. Let's re-verify.

**Agent (Phase 3 - Review):**
> - Requirement: mode filters non-numbers -> PASS
> 
> All requirements passed! The statistics calculator is complete and verified.

## Best Practices

- ✅ Do ask clarifying questions one at a time to avoid overwhelming the user during the planning phase.
- ✅ Do document edge cases explicitly in `specs/<feature-name>.md` before writing any code.
- ✅ Do stick strictly to the approved specification during the build phase.
- ✅ Do cap the loop with a small iteration budget and report exactly what remains if the budget is exhausted.
- ✅ Do pause for explicit approval before destructive, production, credentialed, or externally visible actions.
- ❌ Don't implement extra features or perform unrelated refactorings that aren't specified.
- ❌ Don't skip the review phase or pass it without verifying every single requirement.
- ❌ Don't keep retrying the same failing fix without new evidence or a changed approach.

## Limitations

- This skill requires sufficient context about the feature to be provided during the Spec phase.
- It is best suited for isolated features or tasks with clear boundaries, rather than open-ended architectural refactoring.
- The review phase relies on the agent's self-assessment against the generated spec; manual review is still recommended for critical systems.
- It is not a replacement for human approval on security-sensitive, destructive, production, compliance, or externally visible changes.
- It should stop rather than continue if requirements conflict, tests cannot run, or verification depends on unavailable credentials or systems.

## Security & Safety Notes

- Be cautious when running or testing code generated during the Build phase. Always run tests in a safe, sandboxed environment.
- Avoid executing arbitrary shell commands provided directly by the user without validating their safety.
- Make sure no hardcoded secrets, keys, or credentials are added to the code or specifications.
- Treat production deploys, data migrations, payment flows, credential changes, and external write actions as approval-gated work.

## Common Pitfalls

- **Problem:** The agent tries to build a huge system all at once, leading to an overcomplicated spec and incomplete implementation.
  **Solution:** Keep the scope of `ai-loop` to small, modular features. Break larger systems into multiple independent loops.
- **Problem:** The spec is vague, causing the build phase to rely on assumptions.
  **Solution:** Spend extra time in the planning phase asking targeted questions to pin down requirements.

## Related Skills

- `@plan-writing` - For writing more detailed implementation plans for larger projects.
- `@ask-questions-if-underspecified` - For standard guidelines on interviewing the user.
