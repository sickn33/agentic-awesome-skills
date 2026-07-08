---
name: development
description: "Comprehensive web, mobile, and backend development workflow bundling frontend, backend, full-stack, and mobile development skills for end-to-end application delivery."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Development Workflow Bundle

## Overview

Consolidated workflow for end-to-end software development covering web, mobile, and backend development. This bundle orchestrates skills for building production-ready applications from scaffolding to deployment.

## When to Use This Workflow

Use this workflow when:
- Building new web or mobile applications
- Adding features to existing applications
- Refactoring or modernizing legacy code
- Setting up new projects with best practices
- Full-stack feature development
- Cross-platform application development

## Workflow Phases

### Phase 1: Project Setup and Scaffolding

#### Skills to Invoke
- `app-builder` - Main application building orchestrator
- `senior-fullstack` - Full-stack development guidance
- `environment-setup-guide` - Development environment setup
- `concise-planning` - Task planning and breakdown

#### Actions
1. Determine project type (web, mobile, full-stack)
2. Select technology stack
3. Scaffold project structure
4. Configure development environment
5. Set up version control and CI/CD

#### Copy-Paste Prompts
```
Use @app-builder to scaffold a new React + Node.js full-stack application
```

```
Use @senior-fullstack to set up a Next.js 14 project with App Router
```

```
Use @environment-setup-guide to configure my development environment
```

### Phase 2: Frontend Development

#### Skills to Invoke
- `frontend-developer` - React/Next.js component development
- `frontend-design` - UI/UX design implementation
- `react-patterns` - Modern React patterns
- `typescript-pro` - TypeScript best practices
- `tailwind-patterns` - Tailwind CSS styling
- `nextjs-app-router-patterns` - Next.js 14+ patterns

#### Actions
1. Design component architecture
2. Implement UI components
3. Set up state management
4. Configure routing
5. Apply styling and theming
6. Implement responsive design

#### Copy-Paste Prompts
```
Use @frontend-developer to create a dashboard component with React and TypeScript
```

```
Use @react-patterns to implement proper state management with Zustand
```

```
Use @tailwind-patterns to style components with a consistent design system
```

### Phase 3: Backend Development

#### Skills to Invoke
- `backend-architect` - Backend architecture design
- `backend-dev-guidelines` - Backend development standards
- `nodejs-backend-patterns` - Node.js/Express patterns
- `fastapi-pro` - FastAPI development
- `api-design-principles` - REST/GraphQL API design
- `auth-implementation-patterns` - Authentication implementation

#### Actions
1. Design API architecture
2. Implement REST/GraphQL endpoints
3. Set up database connections
4. Implement authentication/authorization
5. Configure middleware
6. Set up error handling

#### Copy-Paste Prompts
```
Use @backend-architect to design a microservices architecture for my application
```

```
Use @nodejs-backend-patterns to create Express.js API endpoints
```

```
Use @auth-implementation-patterns to implement JWT authentication
```

### Phase 4: Database Development

#### Skills to Invoke
- `database-architect` - Database design
- `database-design` - Schema design principles
- `prisma-expert` - Prisma ORM
- `postgresql` - PostgreSQL optimization
- `neon-postgres` - Serverless Postgres

#### Actions
1. Design database schema
2. Create migrations
3. Set up ORM
4. Optimize queries
5. Configure connection pooling

#### Copy-Paste Prompts
```
Use @database-architect to design a normalized schema for an e-commerce platform
```

```
Use @prisma-expert to set up Prisma ORM with TypeScript
```

### Phase 5: Testing

#### Skills to Invoke
- `test-driven-development` - TDD workflow
- `javascript-testing-patterns` - Jest/Vitest testing
- `python-testing-patterns` - pytest testing
- `e2e-testing-patterns` - Playwright/Cypress E2E
- `playwright-skill` - Browser automation testing

#### Actions
1. Write unit tests
2. Create integration tests
3. Set up E2E tests
4. Configure CI test runners
5. Achieve coverage targets

#### Copy-Paste Prompts
```
Use @test-driven-development to implement features with TDD
```

```
Use @playwright-skill to create E2E tests for critical user flows
```

### Phase 6: Code Quality and Review

#### Skills to Invoke
- `code-reviewer` - AI-powered code review
- `clean-code` - Clean code principles
- `lint-and-validate` - Linting and validation
- `security-scanning-security-sast` - Static security analysis

#### Actions
1. Run linters and formatters
2. Perform code review
3. Fix code quality issues
4. Run security scans
5. Address vulnerabilities

#### Copy-Paste Prompts
```
Use @code-reviewer to review my pull request
```

```
Use @lint-and-validate to check code quality
```

### Phase 7: Build and Deployment

#### Skills to Invoke
- `deployment-engineer` - Deployment orchestration
- `docker-expert` - Containerization
- `vercel-deployment` - Vercel deployment
- `github-actions-templates` - CI/CD workflows
- `cicd-automation-workflow-automate` - CI/CD automation

#### Actions
1. Create Dockerfiles
2. Configure build pipelines
3. Set up deployment workflows
4. Configure environment variables
5. Deploy to production

#### Copy-Paste Prompts
```
Use @docker-expert to containerize my application
```

```
Use @vercel-deployment to deploy my Next.js app to production
```

```
Use @github-actions-templates to set up CI/CD pipeline
```

## Technology-Specific Workflows

### React/Next.js Development
```
Skills: frontend-developer, react-patterns, nextjs-app-router-patterns, typescript-pro, tailwind-patterns
```

### Python/FastAPI Development
```
Skills: fastapi-pro, python-pro, python-patterns, pydantic-models-py
```

### Node.js/Express Development
```
Skills: nodejs-backend-patterns, javascript-pro, typescript-pro, express (via nodejs-backend-patterns)
```

### Full-Stack Development
```
Skills: senior-fullstack, app-builder, frontend-developer, backend-architect, database-architect
```

### Mobile Development
```
Skills: mobile-developer, react-native-architecture, flutter-expert, ios-developer
```

## Quality Gates

Before moving to next phase, verify:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Linting/formatting clean
- [ ] Documentation updated

## Related Workflow Bundles

- `wordpress` - WordPress-specific development
- `security-audit` - Security testing workflow
- `testing-qa` - Comprehensive testing workflow
- `documentation` - Documentation generation workflow

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
