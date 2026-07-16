---
name: full-stack-orchestration-full-stack-feature
description: "Use when working with full stack orchestration full stack feature"
risk: unknown
source: community
date_added: "2026-02-27"
---

## Use this skill when

- Working on full stack orchestration full stack feature tasks or workflows
- Needing guidance, best practices, or checklists for full stack orchestration full stack feature

## Do not use this skill when

- The task is unrelated to full stack orchestration full stack feature
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

Orchestrate full-stack feature development across backend, frontend, and infrastructure layers with modern API-first approach:

[Extended thinking: This workflow coordinates multiple specialized agents to deliver a complete full-stack feature from architecture through deployment. It follows API-first development principles, ensuring contract-driven development where the API specification drives both backend implementation and frontend consumption. Each phase builds upon previous outputs, creating a cohesive system with proper separation of concerns, comprehensive testing, and production-ready deployment. The workflow emphasizes modern practices like component-driven UI development, feature flags, observability, and progressive rollout strategies.]

## Phase 1: Architecture & Design Foundation

### 1. Database Architecture Design
- Use Task tool with subagent_type="database-design::database-architect"
- Prompt: "Design database schema and data models for: $ARGUMENTS. Consider scalability, query patterns, indexing strategy, and data consistency requirements. Include migration strategy if modifying existing schema. Provide both logical and physical data models."
- Expected output: Entity relationship diagrams, table schemas, indexing strategy, migration scripts, data access patterns
- Context: Initial requirements and business domain model

### 2. Backend Service Architecture
- Use Task tool with subagent_type="backend-development::backend-architect"
- Prompt: "Design backend service architecture for: $ARGUMENTS. Using the database design from previous step, create service boundaries, define API contracts (OpenAPI/GraphQL), design authentication/authorization strategy, and specify inter-service communication patterns. Include resilience patterns (circuit breakers, retries) and caching strategy."
- Expected output: Service architecture diagram, OpenAPI specifications, authentication flows, caching architecture, message queue design (if applicable)
- Context: Database schema from step 1, non-functional requirements

### 3. Frontend Component Architecture
- Use Task tool with subagent_type="frontend-mobile-development::frontend-developer"
- Prompt: "Design frontend architecture and component structure for: $ARGUMENTS. Based on the API contracts from previous step, design component hierarchy, state management approach (Redux/Zustand/Context), routing structure, and data fetching patterns. Include accessibility requirements and responsive design strategy. Plan for Storybook component documentation."
- Expected output: Component tree diagram, state management design, routing configuration, design system integration plan, accessibility checklist
- Context: API specifications from step 2, UI/UX requirements

## Phase 2: Parallel Implementation

### 4. Backend Service Implementation
- Use Task tool with subagent_type="python-development::python-pro" (or "golang-pro"/"nodejs-expert" based on stack)
- Prompt: "Implement backend services for: $ARGUMENTS. Using the architecture and API specs from Phase 1, build RESTful/GraphQL endpoints with proper validation, error handling, and logging. Implement business logic, data access layer, authentication middleware, and integration with external services. Include observability (structured logging, metrics, tracing)."
- Expected output: Backend service code, API endpoints, middleware, background jobs, unit tests, integration tests
- Context: Architecture designs from Phase 1, database schema

### 5. Frontend Implementation
- Use Task tool with subagent_type="frontend-mobile-development::frontend-developer"
- Prompt: "Implement frontend application for: $ARGUMENTS. Build React/Next.js components using the component architecture from Phase 1. Implement state management, API integration with proper error handling and loading states, form validation, and responsive layouts. Create Storybook stories for components. Ensure accessibility (WCAG 2.1 AA compliance)."
- Expected output: React components, state management implementation, API client code, Storybook stories, responsive styles, accessibility implementations
- Context: Component architecture from step 3, API contracts

### 6. Database Implementation & Optimization
- Use Task tool with subagent_type="database-design::sql-pro"
- Prompt: "Implement and optimize database layer for: $ARGUMENTS. Create migration scripts, stored procedures (if needed), optimize queries identified by backend implementation, set up proper indexes, and implement data validation constraints. Include database-level security measures and backup strategies."
- Expected output: Migration scripts, optimized queries, stored procedures, index definitions, database security configuration
- Context: Database design from step 1, query patterns from backend implementation

## Phase 3: Integration & Testing

### 7. API Contract Testing
- Use Task tool with subagent_type="test-automator"
- Prompt: "Create contract tests for: $ARGUMENTS. Implement Pact/Dredd tests to validate API contracts between backend and frontend. Create integration tests for all API endpoints, test authentication flows, validate error responses, and ensure proper CORS configuration. Include load testing scenarios."
- Expected output: Contract test suites, integration tests, load test scenarios, API documentation validation
- Context: API implementations from Phase 2

### 8. End-to-End Testing
- Use Task tool with subagent_type="test-automator"
- Prompt: "Implement E2E tests for: $ARGUMENTS. Create Playwright/Cypress tests covering critical user journeys, cross-browser compatibility, mobile responsiveness, and error scenarios. Test feature flags integration, analytics tracking, and performance metrics. Include visual regression tests."
- Expected output: E2E test suites, visual regression baselines, performance benchmarks, test reports
- Context: Frontend and backend implementations from Phase 2

### 9. Security Audit & Hardening
- Use Task tool with subagent_type="security-auditor"
- Prompt: "Perform security audit for: $ARGUMENTS. Review API security (authentication, authorization, rate limiting), check for OWASP Top 10 vulnerabilities, audit frontend for XSS/CSRF risks, validate input sanitization, and review secrets management. Provide penetration testing results and remediation steps."
- Expected output: Security audit report, vulnerability assessment, remediation recommendations, security headers configuration
- Context: All implementations from Phase 2

## Phase 4: Deployment & Operations

### 10. Infrastructure & CI/CD Setup
- Use Task tool with subagent_type="deployment-engineer"
- Prompt: "Setup deployment infrastructure for: $ARGUMENTS. Create Docker containers, Kubernetes manifests (or cloud-specific configs), implement CI/CD pipelines with automated testing gates, setup feature flags (LaunchDarkly/Unleash), and configure monitoring/alerting. Include blue-green deployment strategy and rollback procedures."
- Expected output: Dockerfiles, K8s manifests, CI/CD pipeline configs, feature flag setup, IaC templates (Terraform/CloudFormation)
- Context: All implementations and tests from previous phases

### 11. Observability & Monitoring
- Use Task tool with subagent_type="deployment-engineer"
- Prompt: "Implement observability stack for: $ARGUMENTS. Setup distributed tracing (OpenTelemetry), configure application metrics (Prometheus/DataDog), implement centralized logging (ELK/Splunk), create dashboards for key metrics, and define SLIs/SLOs. Include alerting rules and on-call procedures."
- Expected output: Observability configuration, dashboard definitions, alert rules, runbooks, SLI/SLO definitions
- Context: Infrastructure setup from step 10

### 12. Performance Optimization
- Use Task tool with subagent_type="performance-engineer"
- Prompt: "Optimize performance across stack for: $ARGUMENTS. Analyze and optimize database queries, implement caching strategies (Redis/CDN), optimize frontend bundle size and loading performance, setup lazy loading and code splitting, and tune backend service performance. Include before/after metrics."
- Expected output: Performance improvements, caching configuration, CDN setup, optimized bundles, performance metrics report
- Context: Monitoring data from step 11, load test results

## Configuration Options
- `stack`: Specify technology stack (e.g., "React/FastAPI/PostgreSQL", "Next.js/Django/MongoDB")
- `deployment_target`: Cloud platform (AWS/GCP/Azure) or on-premises
- `feature_flags`: Enable/disable feature flag integration
- `api_style`: REST or GraphQL
- `testing_depth`: Comprehensive or essential
- `compliance`: Specific compliance requirements (GDPR, HIPAA, SOC2)

## Success Criteria
- All API contracts validated through contract tests
- Frontend and backend integration tests passing
- E2E tests covering critical user journeys
- Security audit passed with no critical vulnerabilities
- Performance metrics meeting defined SLOs
- Observability stack capturing all key metrics
- Feature flags configured for progressive rollout
- Documentation complete for all components
- CI/CD pipeline with automated quality gates
- Zero-downtime deployment capability verified

## Coordination Notes
- Each phase builds upon outputs from previous phases
- Parallel tasks in Phase 2 can run simultaneously but must converge for Phase 3
- Maintain traceability between requirements and implementations
- Use correlation IDs across all services for distributed tracing
- Document all architectural decisions in ADRs
- Ensure consistent error handling and API responses across services

Feature to implement: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
