---
name: react-nextjs-development
description: "React and Next.js 14+ application development with App Router, Server Components, TypeScript, Tailwind CSS, and modern frontend patterns."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# React/Next.js Development Workflow

## Overview

Specialized workflow for building React and Next.js 14+ applications with modern patterns including App Router, Server Components, TypeScript, and Tailwind CSS.

## When to Use This Workflow

Use this workflow when:
- Building new React applications
- Creating Next.js 14+ projects with App Router
- Implementing Server Components
- Setting up TypeScript with React
- Styling with Tailwind CSS
- Building full-stack Next.js applications

## Workflow Phases

### Phase 1: Project Setup

#### Skills to Invoke
- `app-builder` - Application scaffolding
- `senior-fullstack` - Full-stack guidance
- `nextjs-app-router-patterns` - Next.js 14+ patterns
- `typescript-pro` - TypeScript setup

#### Actions
1. Choose project type (React SPA, Next.js app)
2. Select build tool (Vite, Next.js, Create React App)
3. Scaffold project structure
4. Configure TypeScript
5. Set up ESLint and Prettier

#### Copy-Paste Prompts
```
Use @app-builder to scaffold a new Next.js 14 project with App Router
```

```
Use @nextjs-app-router-patterns to set up Server Components
```

### Phase 2: Component Architecture

#### Skills to Invoke
- `frontend-developer` - Component development
- `react-patterns` - React patterns
- `react-state-management` - State management
- `react-ui-patterns` - UI patterns

#### Actions
1. Design component hierarchy
2. Create base components
3. Implement layout components
4. Set up state management
5. Create custom hooks

#### Copy-Paste Prompts
```
Use @frontend-developer to create reusable React components
```

```
Use @react-patterns to implement proper component composition
```

```
Use @react-state-management to set up Zustand store
```

### Phase 3: Styling and Design

#### Skills to Invoke
- `frontend-design` - UI design
- `tailwind-patterns` - Tailwind CSS
- `tailwind-design-system` - Design system
- `core-components` - Component library

#### Actions
1. Set up Tailwind CSS
2. Configure design tokens
3. Create utility classes
4. Build component styles
5. Implement responsive design

#### Copy-Paste Prompts
```
Use @tailwind-patterns to style components with Tailwind CSS v4
```

```
Use @frontend-design to create a modern dashboard UI
```

### Phase 4: Data Fetching

#### Skills to Invoke
- `nextjs-app-router-patterns` - Server Components
- `react-state-management` - React Query
- `api-patterns` - API integration

#### Actions
1. Implement Server Components
2. Set up React Query/SWR
3. Create API client
4. Handle loading states
5. Implement error boundaries

#### Copy-Paste Prompts
```
Use @nextjs-app-router-patterns to implement Server Components data fetching
```

### Phase 5: Routing and Navigation

#### Skills to Invoke
- `nextjs-app-router-patterns` - App Router
- `nextjs-best-practices` - Next.js patterns

#### Actions
1. Set up file-based routing
2. Create dynamic routes
3. Implement nested routes
4. Add route guards
5. Configure redirects

#### Copy-Paste Prompts
```
Use @nextjs-app-router-patterns to set up parallel routes and intercepting routes
```

### Phase 6: Forms and Validation

#### Skills to Invoke
- `frontend-developer` - Form development
- `typescript-advanced-types` - Type validation
- `react-ui-patterns` - Form patterns

#### Actions
1. Choose form library (React Hook Form, Formik)
2. Set up validation (Zod, Yup)
3. Create form components
4. Handle submissions
5. Implement error handling

#### Copy-Paste Prompts
```
Use @frontend-developer to create forms with React Hook Form and Zod
```

### Phase 7: Testing

#### Skills to Invoke
- `javascript-testing-patterns` - Jest/Vitest
- `playwright-skill` - E2E testing
- `e2e-testing-patterns` - E2E patterns

#### Actions
1. Set up testing framework
2. Write unit tests
3. Create component tests
4. Implement E2E tests
5. Configure CI integration

#### Copy-Paste Prompts
```
Use @javascript-testing-patterns to write Vitest tests
```

```
Use @playwright-skill to create E2E tests for critical flows
```

### Phase 8: Build and Deployment

#### Skills to Invoke
- `vercel-deployment` - Vercel deployment
- `vercel-deploy-claimable` - Vercel deployment
- `web-performance-optimization` - Performance

#### Actions
1. Configure build settings
2. Optimize bundle size
3. Set up environment variables
4. Deploy to Vercel
5. Configure preview deployments

#### Copy-Paste Prompts
```
Use @vercel-deployment to deploy Next.js app to production
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14+, React 18+ |
| Language | TypeScript 5+ |
| Styling | Tailwind CSS v4 |
| State | Zustand, React Query |
| Forms | React Hook Form, Zod |
| Testing | Vitest, Playwright |
| Deployment | Vercel |

## Quality Gates

- [ ] TypeScript compiles without errors
- [ ] All tests passing
- [ ] Linting clean
- [ ] Performance metrics met (LCP, CLS, FID)
- [ ] Accessibility checked (WCAG 2.1)
- [ ] Responsive design verified

## Related Workflow Bundles

- `development` - General development
- `testing-qa` - Testing workflow
- `documentation` - Documentation
- `typescript-development` - TypeScript patterns

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
