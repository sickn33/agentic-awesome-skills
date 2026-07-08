---
name: context-driven-development
description: "Guide for implementing and maintaining context as a managed artifact alongside code, enabling consistent AI interactions and team alignment through structured project documentation."
risk: unknown
source: community
date_added: '2026-02-27'
---

# Context-Driven Development

Guide for implementing and maintaining context as a managed artifact alongside code, enabling consistent AI interactions and team alignment through structured project documentation.

## Do not use this skill when

- The task is unrelated to context-driven development
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Setting up new projects with Conductor
- Understanding the relationship between context artifacts
- Maintaining consistency across AI-assisted development sessions
- Onboarding team members to an existing Conductor project
- Deciding when to update context documents
- Managing greenfield vs brownfield project contexts

## Core Philosophy

Context-Driven Development treats project context as a first-class artifact managed alongside code. Instead of relying on ad-hoc prompts or scattered documentation, establish a persistent, structured foundation that informs all AI interactions.

Key principles:

1. **Context precedes code**: Define what you're building and how before implementation
2. **Living documentation**: Context artifacts evolve with the project
3. **Single source of truth**: One canonical location for each type of information
4. **AI alignment**: Consistent context produces consistent AI behavior

## The Workflow

Follow the **Context → Spec & Plan → Implement** workflow:

1. **Context Phase**: Establish or verify project context artifacts exist and are current
2. **Specification Phase**: Define requirements and acceptance criteria for work units
3. **Planning Phase**: Break specifications into phased, actionable tasks
4. **Implementation Phase**: Execute tasks following established workflow patterns

## Artifact Relationships

### product.md - Defines WHAT and WHY

Purpose: Captures product vision, goals, target users, and business context.

Contents:

- Product name and one-line description
- Problem statement and solution approach
- Target user personas
- Core features and capabilities
- Success metrics and KPIs
- Product roadmap (high-level)

Update when:

- Product vision or goals change
- New major features are planned
- Target audience shifts
- Business priorities evolve

### product-guidelines.md - Defines HOW to Communicate

Purpose: Establishes brand voice, messaging standards, and communication patterns.

Contents:

- Brand voice and tone guidelines
- Terminology and glossary
- Error message conventions
- User-facing copy standards
- Documentation style

Update when:

- Brand guidelines change
- New terminology is introduced
- Communication patterns need refinement

### tech-stack.md - Defines WITH WHAT

Purpose: Documents technology choices, dependencies, and architectural decisions.

Contents:

- Primary languages and frameworks
- Key dependencies with versions
- Infrastructure and deployment targets
- Development tools and environment
- Testing frameworks
- Code quality tools

Update when:

- Adding new dependencies
- Upgrading major versions
- Changing infrastructure
- Adopting new tools or patterns

### workflow.md - Defines HOW to Work

Purpose: Establishes development practices, quality gates, and team workflows.

Contents:

- Development methodology (TDD, etc.)
- Git workflow and commit conventions
- Code review requirements
- Testing requirements and coverage targets
- Quality assurance gates
- Deployment procedures

Update when:

- Team practices evolve
- Quality standards change
- New workflow patterns are adopted

### tracks.md - Tracks WHAT'S HAPPENING

Purpose: Registry of all work units with status and metadata.

Contents:

- Active tracks with current status
- Completed tracks with completion dates
- Track metadata (type, priority, assignee)
- Links to individual track directories

Update when:

- New tracks are created
- Track status changes
- Tracks are completed or archived

## Context Maintenance Principles

### Keep Artifacts Synchronized

Ensure changes in one artifact reflect in related documents:

- New feature in product.md → Update tech-stack.md if new dependencies needed
- Completed track → Update product.md to reflect new capabilities
- Workflow change → Update all affected track plans

### Update tech-stack.md When Adding Dependencies

Before adding any new dependency:

1. Check if existing dependencies solve the need
2. Document the rationale for new dependencies
3. Add version constraints
4. Note any configuration requirements

### Update product.md When Features Complete

After completing a feature track:

1. Move feature from "planned" to "implemented" in product.md
2. Update any affected success metrics
3. Document any scope changes from original plan

### Verify Context Before Implementation

Before starting any track:

1. Read all context artifacts
2. Flag any outdated information
3. Propose updates before proceeding
4. Confirm context accuracy with stakeholders

## Greenfield vs Brownfield Handling

### Greenfield Projects (New)

For new projects:

1. Run `/conductor:setup` to create all artifacts interactively
2. Answer questions about product vision, tech preferences, and workflow
3. Generate initial style guides for chosen languages
4. Create empty tracks registry

Characteristics:

- Full control over context structure
- Define standards before code exists
- Establish patterns early

### Brownfield Projects (Existing)

For existing codebases:

1. Run `/conductor:setup` with existing codebase detection
2. System analyzes existing code, configs, and documentation
3. Pre-populate artifacts based on discovered patterns
4. Review and refine generated context

Characteristics:

- Extract implicit context from existing code
- Reconcile existing patterns with desired patterns
- Document technical debt and modernization plans
- Preserve working patterns while establishing standards

## Benefits

### Team Alignment

- New team members onboard faster with explicit context
- Consistent terminology and conventions across the team
- Shared understanding of product goals and technical decisions

### AI Consistency

- AI assistants produce aligned outputs across sessions
- Reduced need to re-explain context in each interaction
- Predictable behavior based on documented standards

### Institutional Memory

- Decisions and rationale are preserved
- Context survives team changes
- Historical context informs future decisions

### Quality Assurance

- Standards are explicit and verifiable
- Deviations from context are detectable
- Quality gates are documented and enforceable

## Directory Structure

```
conductor/
├── index.md              # Navigation hub linking all artifacts
├── product.md            # Product vision and goals
├── product-guidelines.md # Communication standards
├── tech-stack.md         # Technology preferences
├── workflow.md           # Development practices
├── tracks.md             # Work unit registry
├── setup_state.json      # Resumable setup state
├── code_styleguides/     # Language-specific conventions
│   ├── python.md
│   ├── typescript.md
│   └── ...
└── tracks/
    └── <track-id>/
        ├── spec.md
        ├── plan.md
        ├── metadata.json
        └── index.md
```

## Context Lifecycle

1. **Creation**: Initial setup via `/conductor:setup`
2. **Validation**: Verify before each track
3. **Evolution**: Update as project grows
4. **Synchronization**: Keep artifacts aligned
5. **Archival**: Document historical decisions

## Context Validation Checklist

Before starting implementation on any track, validate context:

### Product Context

- [ ] product.md reflects current product vision
- [ ] Target users are accurately described
- [ ] Feature list is up to date
- [ ] Success metrics are defined

### Technical Context

- [ ] tech-stack.md lists all current dependencies
- [ ] Version numbers are accurate
- [ ] Infrastructure targets are correct
- [ ] Development tools are documented

### Workflow Context

- [ ] workflow.md describes current practices
- [ ] Quality gates are defined
- [ ] Coverage targets are specified
- [ ] Commit conventions are documented

### Track Context

- [ ] tracks.md shows all active work
- [ ] No stale or abandoned tracks
- [ ] Dependencies between tracks are noted

## Common Anti-Patterns

Avoid these context management mistakes:

### Stale Context

Problem: Context documents become outdated and misleading.
Solution: Update context as part of each track's completion process.

### Context Sprawl

Problem: Information scattered across multiple locations.
Solution: Use the defined artifact structure; resist creating new document types.

### Implicit Context

Problem: Relying on knowledge not captured in artifacts.
Solution: If you reference something repeatedly, add it to the appropriate artifact.

### Context Hoarding

Problem: One person maintains context without team input.
Solution: Review context artifacts in pull requests; make updates collaborative.

### Over-Specification

Problem: Context becomes so detailed it's impossible to maintain.
Solution: Keep artifacts focused on decisions that affect AI behavior and team alignment.

## Integration with Development Tools

### IDE Integration

Configure your IDE to display context files prominently:

- Pin conductor/product.md for quick reference
- Add tech-stack.md to project notes
- Create snippets for common patterns from style guides

### Git Hooks

Consider pre-commit hooks that:

- Warn when dependencies change without tech-stack.md update
- Remind to update product.md when feature branches merge
- Validate context artifact syntax

### CI/CD Integration

Include context validation in pipelines:

- Check tech-stack.md matches actual dependencies
- Verify links in context documents resolve
- Ensure tracks.md status matches git branch state

## Session Continuity

Conductor supports multi-session development through context persistence:

### Starting a New Session

1. Read index.md to orient yourself
2. Check tracks.md for active work
3. Review relevant track's plan.md for current task
4. Verify context artifacts are current

### Ending a Session

1. Update plan.md with current progress
2. Note any blockers or decisions made
3. Commit in-progress work with clear status
4. Update tracks.md if status changed

### Handling Interruptions

If interrupted mid-task:

1. Mark task as `[~]` with note about stopping point
2. Commit work-in-progress to feature branch
3. Document any uncommitted decisions in plan.md

## Best Practices

1. **Read context first**: Always read relevant artifacts before starting work
2. **Small updates**: Make incremental context changes, not massive rewrites
3. **Link decisions**: Reference context when making implementation choices
4. **Version context**: Commit context changes alongside code changes
5. **Review context**: Include context artifact reviews in code reviews
6. **Validate regularly**: Run context validation checklist before major work
7. **Communicate changes**: Notify team when context artifacts change significantly
8. **Preserve history**: Use git to track context evolution over time
9. **Question staleness**: If context feels wrong, investigate and update
10. **Keep it actionable**: Every context item should inform a decision or behavior

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
