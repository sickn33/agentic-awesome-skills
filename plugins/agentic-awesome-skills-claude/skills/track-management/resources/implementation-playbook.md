# Track Management Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Track Management

Guide for creating, managing, and completing Conductor tracks - the logical work units that organize features, bugs, and refactors through specification, planning, and implementation phases.

## When to Use This Skill

- Creating new feature, bug, or refactor tracks
- Writing or reviewing spec.md files
- Creating or updating plan.md files
- Managing track lifecycle from creation to completion
- Understanding track status markers and conventions
- Working with the tracks.md registry
- Interpreting or updating track metadata

## Track Concept

A track is a logical work unit that encapsulates a complete piece of work. Each track has:

- A unique identifier
- A specification defining requirements
- A phased plan breaking work into tasks
- Metadata tracking status and progress

Tracks provide semantic organization for work, enabling:

- Clear scope boundaries
- Progress tracking
- Git-aware operations (revert by track)
- Team coordination

## Track Types

### feature

New functionality or capabilities. Use for:

- New user-facing features
- New API endpoints
- New integrations
- Significant enhancements

### bug

Defect fixes. Use for:

- Incorrect behavior
- Error conditions
- Performance regressions
- Security vulnerabilities

### chore

Maintenance and housekeeping. Use for:

- Dependency updates
- Configuration changes
- Documentation updates
- Cleanup tasks

### refactor

Code improvement without behavior change. Use for:

- Code restructuring
- Pattern adoption
- Technical debt reduction
- Performance optimization (same behavior, better performance)

## Track ID Format

Track IDs follow the pattern: `{shortname}_{YYYYMMDD}`

- **shortname**: 2-4 word kebab-case description (e.g., `user-auth`, `api-rate-limit`)
- **YYYYMMDD**: Creation date in ISO format

Examples:

- `user-auth_20250115`
- `fix-login-error_20250115`
- `upgrade-deps_20250115`
- `refactor-api-client_20250115`

## Track Lifecycle

### 1. Creation (newTrack)

**Define Requirements**

1. Gather requirements through interactive Q&A
2. Identify acceptance criteria
3. Determine scope boundaries
4. Identify dependencies

**Generate Specification**

1. Create `spec.md` with structured requirements
2. Document functional and non-functional requirements
3. Define acceptance criteria
4. List dependencies and constraints

**Generate Plan**

1. Create `plan.md` with phased task breakdown
2. Organize tasks into logical phases
3. Add verification tasks after phases
4. Estimate effort and complexity

**Register Track**

1. Add entry to `tracks.md` registry
2. Create track directory structure
3. Generate `metadata.json`
4. Create track `index.md`

### 2. Implementation

**Execute Tasks**

1. Select next pending task from plan
2. Mark task as in-progress
3. Implement following workflow (TDD)
4. Mark task complete with commit SHA

**Update Status**

1. Update task markers in plan.md
2. Record commit SHAs for traceability
3. Update phase progress
4. Update track status in tracks.md

**Verify Progress**

1. Complete verification tasks
2. Wait for checkpoint approval
3. Record checkpoint commits

### 3. Completion

**Sync Documentation**

1. Update product.md if features added
2. Update tech-stack.md if dependencies changed
3. Verify all acceptance criteria met

**Archive or Delete**

1. Mark track as completed in tracks.md
2. Record completion date
3. Archive or retain track directory

## Specification (spec.md) Structure

```markdown
# {Track Title}

## Overview

Brief description of what this track accomplishes and why.

## Functional Requirements

### FR-1: {Requirement Name}

Description of the functional requirement.

- Acceptance: How to verify this requirement is met

### FR-2: {Requirement Name}

...

## Non-Functional Requirements

### NFR-1: {Requirement Name}

Description of the non-functional requirement (performance, security, etc.)

- Target: Specific measurable target
- Verification: How to test

## Acceptance Criteria

- [ ] Criterion 1: Specific, testable condition
- [ ] Criterion 2: Specific, testable condition
- [ ] Criterion 3: Specific, testable condition

## Scope

### In Scope

- Explicitly included items
- Features to implement
- Components to modify

### Out of Scope

- Explicitly excluded items
- Future considerations
- Related but separate work

## Dependencies

### Internal

- Other tracks or components this depends on
- Required context artifacts

### External

- Third-party services or APIs
- External dependencies

## Risks and Mitigations

| Risk             | Impact          | Mitigation          |
| ---------------- | --------------- | ------------------- |
| Risk description | High/Medium/Low | Mitigation strategy |

## Open Questions

- [ ] Question that needs resolution
- [x] Resolved question - Answer
```

## Plan (plan.md) Structure

```markdown
# Implementation Plan: {Track Title}

Track ID: `{track-id}`
Created: YYYY-MM-DD
Status: pending | in-progress | completed

## Overview

Brief description of implementation approach.

## Phase 1: {Phase Name}

### Tasks

- [ ] **Task 1.1**: Task description
  - Sub-task or detail
  - Sub-task or detail
- [ ] **Task 1.2**: Task description
- [ ] **Task 1.3**: Task description

### Verification

- [ ] **Verify 1.1**: Verification step for phase

## Phase 2: {Phase Name}

### Tasks

- [ ] **Task 2.1**: Task description
- [ ] **Task 2.2**: Task description

### Verification

- [ ] **Verify 2.1**: Verification step for phase

## Phase 3: Finalization

### Tasks

- [ ] **Task 3.1**: Update documentation
- [ ] **Task 3.2**: Final integration test

### Verification

- [ ] **Verify 3.1**: All acceptance criteria met

## Checkpoints

| Phase   | Checkpoint SHA | Date | Status  |
| ------- | -------------- | ---- | ------- |
| Phase 1 |                |      | pending |
| Phase 2 |                |      | pending |
| Phase 3 |                |      | pending |
```

## Status Marker Conventions

Use consistent markers in plan.md:

| Marker | Meaning     | Usage                       |
| ------ | ----------- | --------------------------- |
| `[ ]`  | Pending     | Task not started            |
| `[~]`  | In Progress | Currently being worked      |
| `[x]`  | Complete    | Task finished (include SHA) |
| `[-]`  | Skipped     | Intentionally not done      |
| `[!]`  | Blocked     | Waiting on dependency       |

Example:

```markdown
- [x] **Task 1.1**: Set up database schema `abc1234`
- [~] **Task 1.2**: Implement user model
- [ ] **Task 1.3**: Add validation logic
- [!] **Task 1.4**: Integrate auth service (blocked: waiting for API key)
- [-] **Task 1.5**: Legacy migration (skipped: not needed)
```

## Track Registry (tracks.md) Format

```markdown
# Track Registry

## Active Tracks

| Track ID                                         | Type    | Status      | Phase | Started    | Assignee   |
| ------------------------------------------------ | ------- | ----------- | ----- | ---------- | ---------- |
| user-auth_20250115 | feature | in-progress | 2/3   | 2025-01-15 | @developer |
| fix-login_20250114 | bug     | pending     | 0/2   | 2025-01-14 | -          |

## Completed Tracks

| Track ID                                       | Type  | Completed  | Duration |
| ---------------------------------------------- | ----- | ---------- | -------- |
| setup-ci_20250110 | chore | 2025-01-12 | 2 days   |

## Archived Tracks

| Track ID                                             | Reason     | Archived   |
| ---------------------------------------------------- | ---------- | ---------- |
| old-feature_20241201 | Superseded | 2025-01-05 |
```

## Metadata (metadata.json) Fields

```json
{
  "id": "user-auth_20250115",
  "title": "User Authentication System",
  "type": "feature",
  "status": "in-progress",
  "priority": "high",
  "created": "2025-01-15T10:30:00Z",
  "updated": "2025-01-15T14:45:00Z",
  "started": "2025-01-15T11:00:00Z",
  "completed": null,
  "assignee": "@developer",
  "phases": {
    "total": 3,
    "current": 2,
    "completed": 1
  },
  "tasks": {
    "total": 12,
    "completed": 5,
    "in_progress": 1,
    "pending": 6
  },
  "checkpoints": [
    {
      "phase": 1,
      "sha": "abc1234",
      "date": "2025-01-15T13:00:00Z"
    }
  ],
  "dependencies": [],
  "tags": ["auth", "security"]
}
```

## Track Operations

### Creating a Track

1. Run `/conductor:new-track`
2. Answer interactive questions
3. Review generated spec.md
4. Review generated plan.md
5. Confirm track creation

### Starting Implementation

1. Read spec.md and plan.md
2. Verify context artifacts are current
3. Mark first task as `[~]`
4. Begin TDD workflow

### Completing a Phase

1. Ensure all phase tasks are `[x]`
2. Complete verification tasks
3. Wait for checkpoint approval
4. Record checkpoint SHA
5. Proceed to next phase

### Completing a Track

1. Verify all phases complete
2. Verify all acceptance criteria met
3. Update product.md if needed
4. Mark track completed in tracks.md
5. Update metadata.json

### Reverting a Track

1. Run `/conductor:revert`
2. Select track to revert
3. Choose granularity (track/phase/task)
4. Confirm revert operation
5. Update status markers

## Handling Track Dependencies

### Identifying Dependencies

During track creation, identify:

- **Hard dependencies**: Must complete before this track can start
- **Soft dependencies**: Can proceed in parallel but may affect integration
- **External dependencies**: Third-party services, APIs, or team decisions

### Documenting Dependencies

In spec.md, list dependencies with:

- Dependency type (hard/soft/external)
- Current status (available/pending/blocked)
- Resolution path (what needs to happen)

### Managing Blocked Tracks

When a track is blocked:

1. Mark blocked tasks with `[!]` and reason
2. Update tracks.md status
3. Document blocker in metadata.json
4. Consider creating dependency track if needed

## Track Sizing Guidelines

### Right-Sized Tracks

Aim for tracks that:

- Complete in 1-5 days of work
- Have 2-4 phases
- Contain 8-20 tasks total
- Deliver a coherent, testable unit

### Too Large

Signs a track is too large:

- More than 5 phases
- More than 25 tasks
- Multiple unrelated features
- Estimated duration > 1 week

Solution: Split into multiple tracks with clear boundaries.

### Too Small

Signs a track is too small:

- Single phase with 1-2 tasks
- No meaningful verification needed
- Could be a sub-task of another track
- Less than a few hours of work

Solution: Combine with related work or handle as part of existing track.

## Specification Quality Checklist

Before finalizing spec.md, verify:

### Requirements Quality

- [ ] Each requirement has clear acceptance criteria
- [ ] Requirements are testable
- [ ] Requirements are independent (can verify separately)
- [ ] No ambiguous language ("should be fast" → "response < 200ms")

### Scope Clarity

- [ ] In-scope items are specific
- [ ] Out-of-scope items prevent scope creep
- [ ] Boundaries are clear to implementer

### Dependencies Identified

- [ ] All internal dependencies listed
- [ ] External dependencies have owners/contacts
- [ ] Dependency status is current

### Risks Addressed

- [ ] Major risks identified
- [ ] Impact assessment realistic
- [ ] Mitigations are actionable

## Plan Quality Checklist

Before starting implementation, verify plan.md:

### Task Quality

- [ ] Tasks are atomic (one logical action)
- [ ] Tasks are independently verifiable
- [ ] Task descriptions are clear
- [ ] Sub-tasks provide helpful detail

### Phase Organization

- [ ] Phases group related tasks
- [ ] Each phase delivers something testable
- [ ] Verification tasks after each phase
- [ ] Phases build on each other logically

### Completeness

- [ ] All spec requirements have corresponding tasks
- [ ] Documentation tasks included
- [ ] Testing tasks included
- [ ] Integration tasks included

## Common Track Patterns

### Feature Track Pattern

```
Phase 1: Foundation
- Data models
- Database migrations
- Basic API structure

Phase 2: Core Logic
- Business logic implementation
- Input validation
- Error handling

Phase 3: Integration
- UI integration
- API documentation
- End-to-end tests
```

### Bug Fix Track Pattern

```
Phase 1: Reproduction
- Write failing test capturing bug
- Document reproduction steps

Phase 2: Fix
- Implement fix
- Verify test passes
- Check for regressions

Phase 3: Verification
- Manual verification
- Update documentation if needed
```

### Refactor Track Pattern

```
Phase 1: Preparation
- Add characterization tests
- Document current behavior

Phase 2: Refactoring
- Apply changes incrementally
- Maintain green tests throughout

Phase 3: Cleanup
- Remove dead code
- Update documentation
```

## Best Practices

1. **One track, one concern**: Keep tracks focused on a single logical change
2. **Small phases**: Break work into phases of 3-5 tasks maximum
3. **Verification after phases**: Always include verification tasks
4. **Update markers immediately**: Mark task status as you work
5. **Record SHAs**: Always note commit SHAs for completed tasks
6. **Review specs before planning**: Ensure spec is complete before creating plan
7. **Link dependencies**: Explicitly note track dependencies
8. **Archive, don't delete**: Preserve completed tracks for reference
9. **Size appropriately**: Keep tracks between 1-5 days of work
10. **Clear acceptance criteria**: Every requirement must be testable
