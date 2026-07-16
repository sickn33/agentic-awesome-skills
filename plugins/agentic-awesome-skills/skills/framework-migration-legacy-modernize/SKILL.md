---
name: framework-migration-legacy-modernize
description: "Orchestrate a comprehensive legacy system modernization using the strangler fig pattern, enabling gradual replacement of outdated components while maintaining continuous business operations through ex"
risk: unknown
source: community
date_added: "2026-02-27"
---

# Legacy Code Modernization Workflow

Orchestrate a comprehensive legacy system modernization using the strangler fig pattern, enabling gradual replacement of outdated components while maintaining continuous business operations through expert agent coordination.

[Extended thinking: The strangler fig pattern, named after the tropical fig tree that gradually envelops and replaces its host, represents the gold standard for risk-managed legacy modernization. This workflow implements a systematic approach where new functionality gradually replaces legacy components, allowing both systems to coexist during transition. By orchestrating specialized agents for assessment, testing, security, and implementation, we ensure each migration phase is validated before proceeding, minimizing disruption while maximizing modernization velocity.]

## Use this skill when

- Working on legacy code modernization workflow tasks or workflows
- Needing guidance, best practices, or checklists for legacy code modernization workflow

## Do not use this skill when

- The task is unrelated to legacy code modernization workflow
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Phase 1: Legacy Assessment and Risk Analysis

### 1. Comprehensive Legacy System Analysis
- Use Task tool with subagent_type="legacy-modernizer"
- Prompt: "Analyze the legacy codebase at $ARGUMENTS. Document technical debt inventory including: outdated dependencies, deprecated APIs, security vulnerabilities, performance bottlenecks, and architectural anti-patterns. Generate a modernization readiness report with component complexity scores (1-10), dependency mapping, and database coupling analysis. Identify quick wins vs complex refactoring targets."
- Expected output: Detailed assessment report with risk matrix and modernization priorities

### 2. Dependency and Integration Mapping
- Use Task tool with subagent_type="architect-review"
- Prompt: "Based on the legacy assessment report, create a comprehensive dependency graph showing: internal module dependencies, external service integrations, shared database schemas, and cross-system data flows. Identify integration points that will require facade patterns or adapter layers during migration. Highlight circular dependencies and tight coupling that need resolution."
- Context from previous: Legacy assessment report, component complexity scores
- Expected output: Visual dependency map and integration point catalog

### 3. Business Impact and Risk Assessment
- Use Task tool with subagent_type="business-analytics::business-analyst"
- Prompt: "Evaluate business impact of modernizing each component identified. Create risk assessment matrix considering: business criticality (revenue impact), user traffic patterns, data sensitivity, regulatory requirements, and fallback complexity. Prioritize components using a weighted scoring system: (Business Value × 0.4) + (Technical Risk × 0.3) + (Quick Win Potential × 0.3). Define rollback strategies for each component."
- Context from previous: Component inventory, dependency mapping
- Expected output: Prioritized migration roadmap with risk mitigation strategies

## Phase 2: Test Coverage Establishment

### 1. Legacy Code Test Coverage Analysis
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Analyze existing test coverage for legacy components at $ARGUMENTS. Use coverage tools to identify untested code paths, missing integration tests, and absent end-to-end scenarios. For components with <40% coverage, generate characterization tests that capture current behavior without modifying functionality. Create test harness for safe refactoring."
- Expected output: Test coverage report and characterization test suite

### 2. Contract Testing Implementation
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Implement contract tests for all integration points identified in dependency mapping. Create consumer-driven contracts for APIs, message queue interactions, and database schemas. Set up contract verification in CI/CD pipeline. Generate performance baselines for response times and throughput to validate modernized components maintain SLAs."
- Context from previous: Integration point catalog, existing test coverage
- Expected output: Contract test suite with performance baselines

### 3. Test Data Management Strategy
- Use Task tool with subagent_type="data-engineering::data-engineer"
- Prompt: "Design test data management strategy for parallel system operation. Create data generation scripts for edge cases, implement data masking for sensitive information, and establish test database refresh procedures. Set up monitoring for data consistency between legacy and modernized components during migration."
- Context from previous: Database schemas, test requirements
- Expected output: Test data pipeline and consistency monitoring

## Phase 3: Incremental Migration Implementation

### 1. Strangler Fig Infrastructure Setup
- Use Task tool with subagent_type="backend-development::backend-architect"
- Prompt: "Implement strangler fig infrastructure with API gateway for traffic routing. Configure feature flags for gradual rollout using environment variables or feature management service. Set up proxy layer with request routing rules based on: URL patterns, headers, or user segments. Implement circuit breakers and fallback mechanisms for resilience. Create observability dashboard for dual-system monitoring."
- Expected output: API gateway configuration, feature flag system, monitoring dashboard

### 2. Component Modernization - First Wave
- Use Task tool with subagent_type="python-development::python-pro" or "golang-pro" (based on target stack)
- Prompt: "Modernize first-wave components (quick wins identified in assessment). For each component: extract business logic from legacy code, implement using modern patterns (dependency injection, SOLID principles), ensure backward compatibility through adapter patterns, maintain data consistency with event sourcing or dual writes. Follow 12-factor app principles. Components to modernize: [list from prioritized roadmap]"
- Context from previous: Characterization tests, contract tests, infrastructure setup
- Expected output: Modernized components with adapters

### 3. Security Hardening
- Use Task tool with subagent_type="security-scanning::security-auditor"
- Prompt: "Audit modernized components for security vulnerabilities. Implement security improvements including: OAuth 2.0/JWT authentication, role-based access control, input validation and sanitization, SQL injection prevention, XSS protection, and secrets management. Verify OWASP top 10 compliance. Configure security headers and implement rate limiting."
- Context from previous: Modernized component code
- Expected output: Security audit report and hardened components

## Phase 4: Performance Validation and Optimization

### 1. Performance Testing and Optimization
- Use Task tool with subagent_type="application-performance::performance-engineer"
- Prompt: "Conduct performance testing comparing legacy vs modernized components. Run load tests simulating production traffic patterns, measure response times, throughput, and resource utilization. Identify performance regressions and optimize: database queries with indexing, caching strategies (Redis/Memcached), connection pooling, and async processing where applicable. Validate against SLA requirements."
- Context from previous: Performance baselines, modernized components
- Expected output: Performance test results and optimization recommendations

### 2. Progressive Rollout and Monitoring
- Use Task tool with subagent_type="deployment-strategies::deployment-engineer"
- Prompt: "Implement progressive rollout strategy using feature flags. Start with 5% traffic to modernized components, monitor error rates, latency, and business metrics. Define automatic rollback triggers: error rate >1%, latency >2x baseline, or business metric degradation. Create runbook for traffic shifting: 5% → 25% → 50% → 100% with 24-hour observation periods."
- Context from previous: Feature flag configuration, monitoring dashboard
- Expected output: Rollout plan with automated safeguards

## Phase 5: Migration Completion and Documentation

### 1. Legacy Component Decommissioning
- Use Task tool with subagent_type="legacy-modernizer"
- Prompt: "Plan safe decommissioning of replaced legacy components. Verify no remaining dependencies through traffic analysis (minimum 30 days at 0% traffic). Archive legacy code with documentation of original functionality. Update CI/CD pipelines to remove legacy builds. Clean up unused database tables and remove deprecated API endpoints. Document any retained legacy components with sunset timeline."
- Context from previous: Traffic routing data, modernization status
- Expected output: Decommissioning checklist and timeline

### 2. Documentation and Knowledge Transfer
- Use Task tool with subagent_type="documentation-generation::docs-architect"
- Prompt: "Create comprehensive modernization documentation including: architectural diagrams (before/after), API documentation with migration guides, runbooks for dual-system operation, troubleshooting guides for common issues, and lessons learned report. Generate developer onboarding guide for modernized system. Document technical decisions and trade-offs made during migration."
- Context from previous: All migration artifacts and decisions
- Expected output: Complete modernization documentation package

## Configuration Options

- **--parallel-systems**: Keep both systems running indefinitely (for gradual migration)
- **--big-bang**: Full cutover after validation (higher risk, faster completion)
- **--by-feature**: Migrate complete features rather than technical components
- **--database-first**: Prioritize database modernization before application layer
- **--api-first**: Modernize API layer while maintaining legacy backend

## Success Criteria

- All high-priority components modernized with >80% test coverage
- Zero unplanned downtime during migration
- Performance metrics maintained or improved (P95 latency within 110% of baseline)
- Security vulnerabilities reduced by >90%
- Technical debt score improved by >60%
- Successful operation for 30 days post-migration without rollbacks
- Complete documentation enabling new developer onboarding in <1 week

Target: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
