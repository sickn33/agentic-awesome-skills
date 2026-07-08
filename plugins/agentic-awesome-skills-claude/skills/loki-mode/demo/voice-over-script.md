# Loki Mode Voice-Over Script

Complete narration for Loki Mode demo video.

---

## Introduction (0:00 - 0:30)

> Welcome to Loki Mode - a multi-agent autonomous startup system for Claude Code.
>
> Loki Mode takes your product requirements document and transforms it into a fully functioning application - with zero human intervention.
>
> Today I'll show you how it works by building a complete todo application from scratch.

---

## Setup (0:30 - 1:00)

> First, we launch Claude Code with the dangerously-skip-permissions flag. This allows Loki Mode to run autonomously without asking for confirmation at every step.
>
> [Show terminal: `claude --dangerously-skip-permissions`]
>
> Now we invoke Loki Mode with our PRD.

---

## Invocation (1:00 - 1:30)

> [Type: "Loki Mode with PRD at examples/simple-todo-app.md"]
>
> Loki Mode immediately begins the RARV cycle - Reason, Act, Reflect, Verify.
>
> It first reads the PRD to understand what we're building.

---

## Bootstrap Phase (1:30 - 2:30)

> Notice Loki Mode is now in the Bootstrap phase. It's setting up the project structure.
>
> [Show: .loki directory being created]
>
> The .loki directory contains:
> - CONTINUITY.md - the working memory that persists across context resets
> - Queue files for task management
> - State tracking for the orchestrator
>
> This is how Loki Mode maintains context even during long-running operations.

---

## Discovery Phase (2:30 - 3:30)

> Now we're in Discovery. Loki Mode is analyzing our PRD and extracting requirements.
>
> [Show: Tasks being generated]
>
> See how it breaks down the todo app into specific tasks:
> - Set up backend with Express
> - Create SQLite database schema
> - Implement API endpoints
> - Build React frontend
>
> Each task gets added to the pending queue.

---

## Architecture Phase (3:30 - 4:30)

> The Architecture phase is where Loki Mode designs the system.
>
> [Show: OpenAPI spec being created]
>
> Notice it's following spec-first development - the OpenAPI specification is created BEFORE any code is written.
>
> This ensures the frontend and backend will work together seamlessly.

---

## Kanban Visualization (4:30 - 5:30)

> Let me show you the Vibe Kanban integration.
>
> [Show: Kanban board with tasks]
>
> Each task appears on our kanban board. As agents claim tasks, they move from "To Do" to "In Progress" to "Done".
>
> This gives you real-time visibility into what Loki Mode is doing.

---

## Agent Spawning (5:30 - 7:00)

> Now watch the magic happen.
>
> [Show: Multiple agents being spawned]
>
> Loki Mode spawns specialized agents:
> - A backend agent implementing the Express server
> - A frontend agent building the React UI
> - A database agent setting up SQLite
>
> These agents work in parallel - but notice they're not stepping on each other's toes. The task queue system prevents conflicts.

---

## Model Selection (7:00 - 7:30)

> Pay attention to the model selection.
>
> Simple tasks like running tests use Haiku - fast and cost-effective.
> Standard implementation uses Sonnet - the default workhorse.
> Complex decisions like architecture use Opus - for deep analysis.
>
> This intelligent routing optimizes both speed and quality.

---

## Code Review (7:30 - 9:00)

> Here's my favorite part - the code review system.
>
> [Show: Three reviewers being dispatched]
>
> Loki Mode dispatches THREE reviewers in parallel:
> 1. Code quality reviewer - checks patterns and best practices
> 2. Business logic reviewer - verifies requirements are met
> 3. Security reviewer - scans for vulnerabilities
>
> They review independently - blind to each other's findings. This prevents groupthink.
>
> [Show: Review results]
>
> If all three approve, a Devil's Advocate reviewer is triggered. This fourth reviewer specifically looks for issues the others might have missed.
>
> This anti-sycophancy protocol catches 30% more issues than traditional reviews.

---

## Quality Gates (9:00 - 10:00)

> Severity-based blocking ensures nothing ships broken.
>
> [Show: Quality gate output]
>
> Critical, High, and Medium issues BLOCK the pipeline.
> Low and Cosmetic issues get TODO comments but don't block.
>
> Tests must pass. Coverage must exceed 80%. No exceptions.

---

## CONTINUITY.md (10:00 - 11:00)

> Let's peek at the working memory.
>
> [Show: CONTINUITY.md contents]
>
> This file tracks:
> - Current task and progress
> - Decisions made and why
> - Mistakes and learnings
>
> If Loki Mode runs out of context or needs to restart, it reads this file first. This is how it maintains coherence across long sessions.

---

## Memory System (11:00 - 12:00)

> Loki Mode has a three-layer memory system.
>
> Episodic memory records what happened - specific actions and their outcomes.
>
> Semantic memory generalizes patterns - "TypeScript strict mode requires explicit return types."
>
> Procedural memory stores learned skills - how to implement an API endpoint successfully.
>
> This isn't just context - it's genuine learning that improves future runs.

---

## Completion (12:00 - 13:00)

> [Show: Application running]
>
> And here's our finished todo app!
>
> - Full CRUD operations working
> - React frontend with TypeScript
> - Express backend with SQLite
> - All tests passing
> - Code reviewed and approved
>
> From PRD to working application - completely autonomous.

---

## Recap (13:00 - 14:00)

> Let's recap what Loki Mode did:
>
> 1. Read and analyzed the PRD
> 2. Designed the architecture with OpenAPI specs
> 3. Spawned specialized agents for parallel development
> 4. Ran comprehensive code reviews with anti-sycophancy checks
> 5. Enforced quality gates and test coverage
> 6. Maintained context through the memory system
>
> All without a single human intervention.

---

## Call to Action (14:00 - 14:30)

> Loki Mode is available now on GitHub.
>
> Install it as a Claude Code skill and start building.
>
> Remember to use the dangerously-skip-permissions flag for full autonomy.
>
> Thanks for watching!

---

## Timing Summary

| Section | Start | Duration |
|---------|-------|----------|
| Introduction | 0:00 | 30s |
| Setup | 0:30 | 30s |
| Invocation | 1:00 | 30s |
| Bootstrap | 1:30 | 60s |
| Discovery | 2:30 | 60s |
| Architecture | 3:30 | 60s |
| Kanban | 4:30 | 60s |
| Agents | 5:30 | 90s |
| Model Selection | 7:00 | 30s |
| Code Review | 7:30 | 90s |
| Quality Gates | 9:00 | 60s |
| CONTINUITY | 10:00 | 60s |
| Memory | 11:00 | 60s |
| Completion | 12:00 | 60s |
| Recap | 13:00 | 60s |
| CTA | 14:00 | 30s |

**Total: ~14.5 minutes**
