---
name: ai-loop
description: Executes a complete, autonomous development loop composed of three phases (Spec, Build, Review) without manual intervention.
risk: safe
source: community
---

# AI-Loop Skill

This skill executes a complete, autonomous development loop composed of three phases: Spec, Build, and Review. When invoked, act as an autonomous agent that transitions through these phases seamlessly to deliver a fully verified feature.

## Phase 1: Spec (Planning)
1. Interview the user about the feature or app they want to build. Ask one focused question at a time until you fully understand the goal, the must-have requirements, the constraints, and what "done" looks like.
2. **Do not start building yet.**
3. When you have enough information, write a clear, detailed specification and save it to `specs/<feature-name>.md`.
4. The spec must include: 
   - The objective
   - The exact requirements
   - Edge cases to handle
   - A concrete definition of done that someone could check the build against.

## Phase 2: Build (Implementation)
1. Read the spec you just created in `specs/<feature-name>.md`.
2. Build exactly what it describes. 
3. **Do not add features**, do not refactor unrelated code, and do not invent requirements that aren't in the spec.
4. Focus strictly on fulfilling the spec. List which spec requirements you covered so the review step can check them.

## Phase 3: Review (Verification)
1. Compare your implementation against `specs/<feature-name>.md`.
2. Go requirement by requirement and verify if it was met. List every gap, bug, or missing piece, naming the exact spec item each one fails.
3. If anything fails, write the specific fixes needed and **loop back to Phase 2 (Build)** to address them.
4. Only pass the build and conclude the skill execution when every requirement in the spec is fully met.
