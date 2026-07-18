---
name: build
description: build
risk: unknown
source: community
---

---
name: build
description: Feature development pipeline - research, plan, track, and implement major features.
argument-hint: [subcommand] [name]
metadata:
  author: Shpigford
  version: "1.0"
---

Feature development pipeline - research, plan, track, and implement major features.

## When to Use
- You need a structured workflow for building a major feature across research, planning, implementation, and tracking.
- The task involves moving a feature through named phases such as `research`, `implementation`, `progress`, or `phase`.
- You want one command to coordinate status, next steps, and phased delivery for a feature effort.

## Instructions

This command manages a 4-phase feature development workflow for building major features. Parse `$ARGUMENTS` to determine which subcommand to run.

**Arguments provided:** $ARGUMENTS

### Argument Parsing

Parse the first word of $ARGUMENTS to determine the subcommand:

- `research [name]` → Run the Research phase
- `implementation [name]` → Run the Implementation phase
- `progress [name]` → Run the Progress phase
- `phase [n] [name]` → Run Phase n of the implementation
- `status [name]` → Show current status and suggest next step
- (empty or unrecognized) → Show usage help

If the feature name is not provided in arguments, you MUST use AskUserQuestion to prompt for it.

---

## Subcommand: Help (empty args)

If no arguments provided, display this help:

```
/build - Feature Development Pipeline

Subcommands:
  /build research [name]        Deep research on a feature idea
  /build implementation [name]  Create phased implementation plan
  /build progress [name]        Set up progress tracking
  /build phase [n] [name]       Execute implementation phase n
  /build status [name]          Show status and next steps

Example workflow:
  /build research chat-interface
  /build implementation chat-interface
  /build progress chat-interface
  /build phase 1 chat-interface
```

Then use AskUserQuestion to ask what they'd like to do:

- question: "What would you like to do?"
- header: "Action"
- multiSelect: false
- options:
  - label: "Start new feature research"
    description: "Begin deep research on a new feature idea"
  - label: "Continue existing feature"
    description: "Work on a feature already in progress"
  - label: "Check status"
    description: "See what step to do next for a feature"

---

## Subcommand: research

### Step 1: Get Feature Name

If feature name not in arguments, use AskUserQuestion:

- question: "What's a short identifier for this feature? (lowercase, hyphens ok - e.g., 'chat-interface', 'user-auth', 'data-export'). Use 'Other' to type it."
- header: "Feature name"
- multiSelect: false
- options:
  - label: "I'll type the name"
    description: "Enter a short, kebab-case identifier for the feature"

### Step 2: Check for Existing Research

Check if `docs/{name}/RESEARCH.md` already exists.

If it exists, use AskUserQuestion:

- question: "A RESEARCH.md already exists for this feature. What would you like to do?"
- header: "Existing doc"
- multiSelect: false
- options:
  - label: "Overwrite"
    description: "Replace existing research with fresh exploration"
  - label: "Append"
    description: "Add new research below existing content"
  - label: "Skip"
    description: "Keep existing research, suggest next step"

If "Skip" selected, suggest running `/build implementation {name}` and exit.

### Step 3: Gather Feature Context

Use AskUserQuestion to understand the feature:

- question: "Describe the feature you want to build. What problem does it solve? What should it do? (Use 'Other' to describe)"
- header: "Description"
- multiSelect: false
- options:
  - label: "I'll describe it"
    description: "Provide a detailed description of the feature"

### Step 4: Research Scope

Use AskUserQuestion:

- question: "What aspects should the research focus on?"
- header: "Focus areas"
- multiSelect: true
- options:
  - label: "Technical implementation"
    description: "APIs, libraries, architecture patterns"
  - label: "UI/UX design"
    description: "Interface design, user flows, interactions"
  - label: "Data requirements"
    description: "What data to store, schemas, privacy"
  - label: "Platform capabilities"
    description: "OS APIs, system integrations, permissions"

### Step 5: Conduct Deep Research

Now conduct DEEP research on the feature:

1. **Codebase exploration**: Understand existing patterns, similar features, relevant code
2. **Web search**: Research best practices, similar implementations, relevant APIs
3. **Technical deep-dive**: Explore specific technologies, libraries, frameworks
4. **Use AskUserQuestion FREQUENTLY**: Validate assumptions, clarify requirements, get input on decisions

Research should cover:
- Problem definition and user needs
- Technical approaches and trade-offs
- Required data models and storage
- UI/UX considerations
- Integration points with existing code
- Potential challenges and risks
- Recommended approach with rationale

### Step 6: Write Research Document

Create the directory if needed: `docs/{name}/`

Write findings to `docs/{name}/RESEARCH.md` with this structure:

```markdown
# {Feature Name} Research

## Overview
[Brief description of the feature and its purpose]

## Problem Statement
[What problem this solves, why it matters]

## User Stories / Use Cases
[Concrete examples of how users will use this]

## Technical Research

### Approach Options
[Different ways to implement this, with pros/cons]

### Recommended Approach
[The approach you recommend and why]

### Required Technologies
[APIs, libraries, frameworks needed]

### Data Requirements
[What data needs to be stored/tracked]

## UI/UX Considerations
[Interface design thoughts, user flows]

## Integration Points
[How this connects to existing code/features]

## Risks and Challenges
[Potential issues and mitigation strategies]

## Open Questions
[Things that still need to be decided]

## References
[Links to relevant documentation, examples, articles]
```

### Step 7: Next Step

After writing the research doc, inform the user:

"Research complete! Document saved to `docs/{name}/RESEARCH.md`

**Next step:** Run `/build implementation {name}` to create a phased implementation plan."

---

## Subcommand: implementation

### Step 1: Get Feature Name

If feature name not in arguments, use AskUserQuestion to prompt for it (same as research phase).

### Step 2: Verify Research Exists

Check if `docs/{name}/RESEARCH.md` exists.

If it does NOT exist:
- Inform user: "No research document found at `docs/{name}/RESEARCH.md`"
- Suggest: "Run `/build research {name}` first to create the research document."
- Exit

### Step 3: Check for Existing Implementation Doc

Check if `docs/{name}/IMPLEMENTATION.md` already exists.

If it exists, use AskUserQuestion:

- question: "An IMPLEMENTATION.md already exists. What would you like to do?"
- header: "Existing doc"
- multiSelect: false
- options:
  - label: "Overwrite"
    description: "Create a fresh implementation plan"
  - label: "Append"
    description: "Add new phases below existing content"
  - label: "Skip"
    description: "Keep existing plan, suggest next step"

If "Skip" selected, suggest running `/build progress {name}` and exit.

### Step 4: Read Research Document

Read `docs/{name}/RESEARCH.md` to understand:
- The recommended approach
- Technical requirements
- Data models needed
- UI/UX design
- Integration points

### Step 5: Design Implementation Phases

Break the research into practical implementation phases. Each phase should:
- Be independently valuable (deliver something usable)
- Be small enough to complete in a focused session
- Build on previous phases
- Have clear success criteria

Use AskUserQuestion to validate phase breakdown:

- question: "How granular should the implementation phases be?"
- header: "Phase size"
- multiSelect: false
- options:
  - label: "Small phases (1-2 hours)"
    description: "Many focused phases, easier to track progress"
  - label: "Medium phases (half day)"
    description: "Balanced approach, moderate number of phases"
  - label: "Large phases (full day)"
    description: "Fewer phases, each delivering significant functionality"

### Step 6: Conduct Phase Research

For each phase you're planning, do targeted research:
- Web search for implementation specifics
- Review relevant code in the codebase
- Identify dependencies between phases

Use AskUserQuestion for any uncertainties about phase ordering or scope.

### Step 7: Write Implementation Document

Write to `docs/{name}/IMPLEMENTATION.md` with this structure:

```markdown
# {Feature Name} Implementation Plan

## Overview
[Brief recap of what we're building and the approach from research]

## Prerequisites
[What needs to be in place before starting]

## Phase Summary
[Quick overview of all phases]

---

## Phase 1: [Phase Title]

### Objective
[What this phase accomplishes]

### Rationale
[Why this phase comes first, what it enables]

### Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Success Criteria
[How to verify this phase is complete]

### Files Likely Affected
[List of files that will probably need changes]

---

## Phase 2: [Phase Title]

[Same structure as Phase 1]

---

[Continue for all phases]

---

## Post-Implementation
- [ ] Documentation updates
- [ ] Testing strategy
- [ ] Performance validation

## Notes
[Any additional context or decisions made during planning]
```

### Step 8: Next Step

After writing the implementation doc, inform the user:

"Implementation plan complete! Document saved to `docs/{name}/IMPLEMENTATION.md`

**Next step:** Run `/build progress {name}` to set up progress tracking."

---

## Subcommand: progress

### Step 1: Get Feature Name

If feature name not in arguments, use AskUserQuestion to prompt for it.

### Step 2: Verify Implementation Doc Exists

Check if `docs/{name}/IMPLEMENTATION.md` exists.

If it does NOT exist:
- Inform user: "No implementation document found at `docs/{name}/IMPLEMENTATION.md`"
- Suggest: "Run `/build implementation {name}` first."
- Exit

### Step 3: Check for Existing Progress Doc

Check if `docs/{name}/PROGRESS.md` already exists.

If it exists, use AskUserQuestion:

- question: "A PROGRESS.md already exists. What would you like to do?"
- header: "Existing doc"
- multiSelect: false
- options:
  - label: "Overwrite"
    description: "Start fresh progress tracking"
  - label: "Keep existing"
    description: "Keep current progress, suggest next step"

If "Keep existing" selected, read the progress doc and suggest the next incomplete phase.

### Step 4: Read Implementation Document

Read `docs/{name}/IMPLEMENTATION.md` to extract:
- All phase titles
- Tasks within each phase
- Success criteria

### Step 5: Create Progress Document

Write to `docs/{name}/PROGRESS.md` with this structure:

```markdown
# {Feature Name} Progress

## Status: Phase 1 - Not Started

## Quick Reference
- Research: `docs/{name}/RESEARCH.md`
- Implementation: `docs/{name}/IMPLEMENTATION.md`

---

## Phase Progress

### Phase 1: [Title from Implementation]
**Status:** Not Started

#### Tasks Completed
- (none yet)

#### Decisions Made
- (none yet)

#### Blockers
- (none)

---

### Phase 2: [Title]
**Status:** Not Started

[Same structure]

---

[Continue for all phases]

---

## Session Log

### [Date will be added as work happens]
- Work completed
- Decisions made
- Notes for next session

---

## Files Changed
(Will be updated as implementation progresses)

## Architectural Decisions
(Major technical decisions and rationale)

## Lessons Learned
(What worked, what didn't, what to do differently)
```

### Step 6: Next Step

After creating progress doc:

"Progress tracking set up! Document saved to `docs/{name}/PROGRESS.md`

**Next step:** Run `/build phase 1 {name}` to begin implementation."

---

## Subcommand: phase

### Step 1: Parse Arguments

Parse arguments to extract:
- Phase number (if provided)
- Feature name (if provided)

If neither provided, prompt for both using AskUserQuestion.

### Step 2: Get Feature Name

If feature name not determined, use AskUserQuestion to prompt for it.

### Step 3: Verify All Docs Exist

Check that all three docs exist:
- `docs/{name}/RESEARCH.md`
- `docs/{name}/IMPLEMENTATION.md`
- `docs/{name}/PROGRESS.md`

If any missing, inform user which doc is missing and suggest the appropriate `/build` command to create it.

### Step 4: Get Phase Number

If phase number not in arguments:

Read `docs/{name}/IMPLEMENTATION.md` to extract available phases.

Use AskUserQuestion to let user select:

- question: "Which phase would you like to work on?"
- header: "Phase"
- multiSelect: false
- options: [dynamically generated from phases found in IMPLEMENTATION.md, marking completed ones]

### Step 5: Read All Context

Read all three documents to fully understand:
- The research and rationale (RESEARCH.md)
- The specific phase tasks and success criteria (IMPLEMENTATION.md)
- Current progress and decisions made (PROGRESS.md)

### Step 6: Deep Research on Phase

Before starting implementation:

1. **Web search** for specific implementation details relevant to this phase
2. **Codebase exploration** for relevant existing code
3. **Use AskUserQuestion** to clarify any ambiguities about the phase requirements

### Step 7: Execute Phase Work

Begin implementing the phase:

1. Work through each task in the phase
2. Use AskUserQuestion frequently for implementation decisions
3. Follow the "Always Works" philosophy - test as you go
4. Document decisions in PROGRESS.md as you make them

### Step 8: Update Progress Document

As you work, update `docs/{name}/PROGRESS.md`:

- Mark tasks as completed
- Record decisions made and why
- Note any blockers encountered
- List files changed
- Add architectural decisions
- Update the session log with today's work

Update the phase status:
- "In Progress" when starting
- "Completed" when all tasks done and success criteria met

### Step 9: Next Step

After completing the phase:

1. Read PROGRESS.md to determine next incomplete phase
2. Inform user of completion and suggest next action:

"Phase {n} complete! Progress updated in `docs/{name}/PROGRESS.md`

**Next step:** Run `/build phase {n+1} {name}` to continue with [next phase title]."

Or if all phases complete:

"All phases complete! The {feature name} feature implementation is done.

Consider:
- Running tests to verify everything works
- Updating documentation
- Creating a PR for review"

---

## Subcommand: status

### Step 1: Get Feature Name

If feature name not in arguments, use AskUserQuestion to prompt for it.

### Step 2: Check Which Docs Exist

Check for existence of:
- `docs/{name}/RESEARCH.md`
- `docs/{name}/IMPLEMENTATION.md`
- `docs/{name}/PROGRESS.md`

### Step 3: Determine Status and Next Step

Based on which docs exist:

**No docs exist:**
"No documents found for feature '{name}'.
**Next step:** Run `/build research {name}` to start."

**Only RESEARCH.md exists:**
"Research complete for '{name}'.
**Next step:** Run `/build implementation {name}` to create implementation plan."

**RESEARCH.md and IMPLEMENTATION.md exist:**
"Research and implementation plan complete for '{name}'.
**Next step:** Run `/build progress {name}` to set up progress tracking."

**All three exist:**
Read PROGRESS.md to find current phase status.
"Feature '{name}' is in progress.
**Current status:** [Phase X - status]
**Next step:** Run `/build phase {next incomplete phase} {name}` to continue."

If all phases complete:
"Feature '{name}' implementation is complete!"

---

## Important Guidelines

### Use AskUserQuestion Liberally

Throughout all phases, use AskUserQuestion whenever:
- There's ambiguity in requirements
- Multiple approaches are possible
- You need to validate an assumption
- A decision will significantly impact the implementation
- You're unsure about scope or priority

### Deep Research Expectations

"Deep research" means:
- Multiple web searches on different aspects
- Thorough codebase exploration
- Reading relevant documentation
- Considering multiple approaches
- Understanding trade-offs

Don't rush through research - it's the foundation for good implementation.

### Progress Tracking

Keep PROGRESS.md updated in real-time during phase work:
- Don't wait until the end to update
- Record decisions as they're made
- Note blockers immediately
- This creates valuable context for future sessions

### Scope Management

A key purpose of this workflow is preventing scope creep:
- Each phase should have clear boundaries
- If new requirements emerge, note them for future phases
- Don't expand the current phase's scope mid-implementation
- Use AskUserQuestion to validate if something is in/out of scope

### Always Works Philosophy

When implementing phases:
- Test changes as you make them
- Don't assume code works - verify it
- If something doesn't work, fix it before moving on
- The goal is working software, not just written code

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
