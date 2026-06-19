---
name: new-rails-project
argument-hint: [project name]
description: Create a new Rails project
allowed-tools: Bash(rails *), Bash(bundle *), Bash(bin/*), Bash(npm *), Bash(yarn *)
context: fork
risk: unknown
source: community
metadata:
  author: Shpigford
  version: "1.0"
---

Generate a new Rails project named $1 in the current directory. You may reference @CLAUDE.md for general guidance, though the guidance here takes precedence.

## When to Use
- You need to bootstrap a new Rails project with the opinionated stack defined in this skill.
- The project should start with Rails, PostgreSQL, Inertia.js, React, Vite, Tailwind, Sidekiq, and Redis already planned together.
- You want setup guidance that covers project creation, conventions, testing, and verification for a fresh Rails app.

# Tech Stack
Set up the following tech stack:
- **Rails ~8** with PostgreSQL - Server-side framework and database
- **Inertia.js ~2.3** - Bridges Rails and React for SPA-like experience without API
- **React ~19.2** - Frontend UI framework
- **Vite ~5** - JavaScript bundler with HMR
- **Tailwind CSS ~4** - Utility-first CSS framework
- **Sidekiq 8** - Background job processing with scheduled jobs via sidekiq-scheduler
- **Redis** - Sessions, caching, and job queue

# Rails guidance
- Do not use Kamal or Docker
- Do not use Rails "solid_*" components/systems
- Development should generally match production settings where possible
- Use Redis for caching

# Database
- All tables use UUID primary keys (pgcrypto extension)
- Timestamps use `timestamptz` for timezone awareness
- JSONB columns for flexible metadata storage
- Comprehensive indexing strategy for performance
- Encrypted fields for sensitive data (OAuth tokens, API keys)

# Background jobs
- Use Sidekiq 8 with Redis

# Testing
- Always use minitest
- Use `mocha` gem and VCR for external services (only in the providers layer)
- Prefer `OpenStruct` for mock instances
- Only mock what's necessary

# Code maintenace
- Run `bundle exec rubocop -a` after significant code changes
- Use `.rubocop.yml` for style configuration
- Security scanning with `bundle exec brakeman`

# Frontend
- All React components and views should be TSX

# General guidance
- Ask lots of clarifying questions when planning. The more the better. Make extensive use of AskUserQuestionTool to gather requirements and specifications. You can't ask too many questions.

# Verify
Verify the boilerplate is working by running `bin/rails server` and accessing the application at `http://localhost:3000` via playwright MCP.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
